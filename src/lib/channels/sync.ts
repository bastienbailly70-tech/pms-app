import { prisma } from "@/lib/prisma";
import { getAdapter } from "./ical-adapter";
import type { ExternalBooking } from "./adapter";
import type { PlatformConnectionModel } from "@/generated/prisma/models";
import { BookingSource } from "@/generated/prisma/enums";

export type SyncResult = {
  connectionId: string;
  created: number;
  skipped: number;
  conflicts: number;
  durationMs: number;
  error?: string;
};

/**
 * Pull reservations for one platform connection, upsert bookings, detect conflicts.
 * Uses pg_advisory_xact_lock to prevent concurrent inserts on the same property.
 */
export async function syncConnection(
  connection: PlatformConnectionModel & { platform: { key: string } }
): Promise<SyncResult> {
  const startedAt = Date.now();
  let created = 0, skipped = 0, conflicts = 0;

  try {
    const adapter = getAdapter(connection.platform.key);
    const bookings = await adapter.pullReservations(connection);

    for (const booking of bookings) {
      const result = await upsertBooking(connection.propertyId, connection.id, booking);
      if (result === "created") created++;
      else if (result === "conflict") conflicts++;
      else skipped++;
    }

    const durationMs = Date.now() - startedAt;

    await prisma.$transaction([
      prisma.platformConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: conflicts > 0 ? "conflict" : "ok",
        },
      }),
      prisma.syncLog.create({
        data: {
          connectionId: connection.id,
          level: conflicts > 0 ? "warn" : "info",
          message: `Sync OK — ${created} created, ${skipped} skipped, ${conflicts} conflicts`,
          durationMs,
        },
      }),
    ]);

    return { connectionId: connection.id, created, skipped, conflicts, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);

    await prisma.$transaction([
      prisma.platformConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), lastSyncStatus: "error" },
      }),
      prisma.syncLog.create({
        data: { connectionId: connection.id, level: "error", message, durationMs },
      }),
    ]);

    return { connectionId: connection.id, created, skipped, conflicts, durationMs, error: message };
  }
}

type UpsertResult = "created" | "skipped" | "conflict";

async function upsertBooking(
  propertyId: string,
  connectionId: string,
  ext: ExternalBooking
): Promise<UpsertResult> {
  // Already imported?
  const existing = await prisma.booking.findFirst({
    where: { propertyId, externalId: ext.externalId },
  });
  if (existing) return "skipped";

  // Acquire advisory lock keyed on propertyId to serialise concurrent imports
  const lockKey = hashPropertyId(propertyId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      // Check for overlap with confirmed/pending bookings
      const overlap = await tx.booking.findFirst({
        where: {
          propertyId,
          status: { in: ["CONFIRMED", "PENDING"] },
          AND: [
            { checkIn: { lt: ext.checkOut } },
            { checkOut: { gt: ext.checkIn } },
          ],
        },
      });

      if (overlap) {
        // Create booking as CONFLICT and flag it
        const booking = await tx.booking.create({
          data: {
            propertyId,
            externalId: ext.externalId,
            source: mapSource(ext.source),
            status: "CONFLICT",
            checkIn: ext.checkIn,
            checkOut: ext.checkOut,
            guests: 1,
          },
        });
        await tx.bookingConflict.create({
          data: {
            bookingId: booking.id,
            description: `Conflit avec réservation existante (${overlap.id}) importée depuis ${ext.source}`,
          },
        });
        return;
      }

      // Find or create guest
      let guestId: string | undefined;
      if (ext.guestName) {
        const guest = await tx.guest.create({
          data: { name: ext.guestName, email: ext.guestEmail },
        });
        guestId = guest.id;
      }

      await tx.booking.create({
        data: {
          propertyId,
          externalId: ext.externalId,
          source: mapSource(ext.source),
          status: ext.status === "tentative" ? "PENDING" : "CONFIRMED",
          checkIn: ext.checkIn,
          checkOut: ext.checkOut,
          guests: 1,
          guestId: guestId ?? null,
        },
      });
    });

    return "created";
  } catch (err) {
    // PostgreSQL EXCLUDE constraint violation (code 23P01) = double booking
    if ((err as { code?: string }).code === "23P01") {
      return "conflict";
    }
    throw err;
  }
}

function mapSource(key: string): BookingSource {
  const MAP: Record<string, BookingSource> = {
    airbnb: BookingSource.AIRBNB,
    booking_com: BookingSource.BOOKING_COM,
    agoda: BookingSource.AGODA,
    vrbo: BookingSource.VRBO,
    expedia: BookingSource.EXPEDIA,
    google_vr: BookingSource.GOOGLE_VR,
  };
  return MAP[key] ?? BookingSource.OTHER;
}

// Stable numeric hash of a CUID for pg_advisory_lock (needs bigint)
function hashPropertyId(id: string): bigint {
  let h = 0n;
  for (let i = 0; i < Math.min(id.length, 16); i++) {
    h = (h * 31n + BigInt(id.charCodeAt(i))) & 0x7fffffffffffffffn;
  }
  return h;
}
