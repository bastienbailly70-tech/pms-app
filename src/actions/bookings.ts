"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/enums";
import { requirePropertyAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

type ActionResult = { error: string } | { success: true };

// ─── Conflict resolution ─────────────────────────────────────────────────────

export type ConflictResolution = "keep_existing" | "keep_new" | "cancel_both";

export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const conflict = await prisma.bookingConflict.findFirst({
    where: { id: conflictId, resolvedAt: null },
    include: {
      booking: {
        include: { property: { select: { id: true } } },
      },
    },
  });

  if (!conflict) return { error: "Conflit introuvable." };

  // Verify the current user has at least MANAGER access to the property
  const userId = session.user.id!;
  const conflictRole = await requirePropertyAccess(userId, conflict.booking.property.id, "MANAGER")
    .catch(() => null);
  if (!conflictRole) return { error: "Accès refusé." };

  const conflictBooking = conflict.booking; // status=CONFLICT
  const propertyId = conflictBooking.property.id;

  // Find the overlapping confirmed/pending booking
  const overlapping = await prisma.booking.findFirst({
    where: {
      propertyId,
      id: { not: conflictBooking.id },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      AND: [
        { checkIn: { lt: conflictBooking.checkOut } },
        { checkOut: { gt: conflictBooking.checkIn } },
      ],
    },
  });

  await prisma.$transaction(async (tx) => {
    // Apply resolution
    if (resolution === "keep_existing") {
      // Cancel the new (CONFLICT) booking
      await tx.booking.update({
        where: { id: conflictBooking.id },
        data: { status: BookingStatus.CANCELLED },
      });
    } else if (resolution === "keep_new") {
      // Confirm the new booking, cancel the existing one
      await tx.booking.update({
        where: { id: conflictBooking.id },
        data: { status: BookingStatus.CONFIRMED },
      });
      if (overlapping) {
        await tx.booking.update({
          where: { id: overlapping.id },
          data: { status: BookingStatus.CANCELLED },
        });
      }
    } else {
      // cancel_both
      await tx.booking.update({
        where: { id: conflictBooking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      if (overlapping) {
        await tx.booking.update({
          where: { id: overlapping.id },
          data: { status: BookingStatus.CANCELLED },
        });
      }
    }

    // Mark conflict resolved
    await tx.bookingConflict.update({
      where: { id: conflictId },
      data: { resolvedAt: new Date() },
    });
  });

  revalidatePath("/bookings/conflicts");
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Manual booking CRUD ─────────────────────────────────────────────────────

const bookingSchema = z.object({
  propertyId: z.string().cuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guests: z.coerce.number().int().min(1).max(50),
  guestName: z.string().min(1).max(100),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().max(30).optional(),
  totalAmount: z.coerce.number().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createManualBooking(data: unknown): Promise<ActionResult & { bookingId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { propertyId, checkIn, checkOut, guests, guestName, guestEmail, guestPhone, totalAmount, notes } = parsed.data;

  if (checkOut <= checkIn) return { error: "La date de départ doit être après la date d'arrivée." };

  try {
    await requirePropertyAccess(session.user.id, propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé à ce bien." };
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId },
  });
  if (!property) return { error: "Bien introuvable." };

  // Check overlap
  const overlap = await prisma.booking.findFirst({
    where: {
      propertyId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      AND: [{ checkIn: { lt: new Date(checkOut) } }, { checkOut: { gt: new Date(checkIn) } }],
    },
  });
  if (overlap) return { error: `Ces dates sont déjà réservées (du ${fmt(overlap.checkIn)} au ${fmt(overlap.checkOut)}).` };

  const guest = await prisma.guest.create({
    data: { name: guestName, email: guestEmail || null, phone: guestPhone || null },
  });

  const booking = await prisma.booking.create({
    data: {
      propertyId,
      guestId: guest.id,
      source: "MANUAL",
      status: BookingStatus.CONFIRMED,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      totalAmount: totalAmount ?? null,
      notes: notes || null,
    },
  });

  await logAudit(session.user.id, "create", "Booking", booking.id, {
    propertyId,
    checkIn,
    checkOut,
  });

  revalidatePath("/bookings");
  revalidatePath(`/properties/${propertyId}/calendar`);
  return { success: true, bookingId: booking.id };
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Réservation introuvable." };

  try {
    await requirePropertyAccess(session.user.id, booking.propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED },
  });

  await logAudit(session.user.id, "cancel", "Booking", bookingId);

  revalidatePath("/bookings");
  revalidatePath("/bookings/conflicts");
  revalidatePath(`/properties/${booking.propertyId}/calendar`);
  return { success: true };
}

export async function markBookingCompleted(bookingId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Réservation introuvable." };
  if (booking.status === BookingStatus.CANCELLED) return { error: "Impossible de terminer une réservation annulée." };

  try {
    await requirePropertyAccess(session.user.id, booking.propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.COMPLETED },
  });

  await logAudit(session.user.id, "complete", "Booking", bookingId);

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  return { success: true };
}

const updatePaymentSchema = z.object({
  totalAmount: z.coerce.number().positive().optional().nullable(),
  deposit: z.coerce.number().min(0).optional().nullable(),
  isPaid: z.coerce.boolean(),
  internalNotes: z.string().max(2000).optional(),
});

export async function updateBookingPayment(
  bookingId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Réservation introuvable." };

  try {
    await requirePropertyAccess(session.user.id, booking.propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé." };
  }

  const parsed = updatePaymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      totalAmount: parsed.data.totalAmount ?? null,
      deposit: parsed.data.deposit ?? null,
      isPaid: parsed.data.isPaid,
      internalNotes: parsed.data.internalNotes || null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  return { success: true };
}

export async function updateBookingGuest(
  bookingId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true },
  });
  if (!booking) return { error: "Réservation introuvable." };

  try {
    await requirePropertyAccess(session.user.id, booking.propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé." };
  }

  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(30).optional(),
  });
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  if (booking.guestId) {
    await prisma.guest.update({
      where: { id: booking.guestId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      },
    });
  } else {
    const guest = await prisma.guest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      },
    });
    await prisma.booking.update({ where: { id: bookingId }, data: { guestId: guest.id } });
  }

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

// ─── Unified booking update ───────────────────────────────────────────────────

const updateBookingSchema = z.object({
  // Guest
  guestName:     z.string().min(1).max(100),
  guestEmail:    z.string().email().optional().or(z.literal("")),
  guestPhone:    z.string().max(30).optional().or(z.literal("")),
  // Booking
  guests:        z.coerce.number().int().min(1).max(50),
  status:        z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "CONFLICT"]),
  source:        z.enum(["MANUAL", "AIRBNB", "BOOKING_COM", "AGODA", "VRBO", "EXPEDIA", "GOOGLE_VR", "OTHER"]),
  checkIn:       z.string().date(),
  checkOut:      z.string().date(),
  // Financial
  totalAmount:   z.coerce.number().min(0).optional().nullable(),
  deposit:       z.coerce.number().min(0).optional().nullable(),
  isPaid:        z.coerce.boolean(),
  paymentMethod: z.string().max(30).optional().or(z.literal("")),
  // Notes
  internalNotes: z.string().max(2000).optional().or(z.literal("")),
});

export async function updateBooking(bookingId: string, data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Réservation introuvable." };

  try {
    await requirePropertyAccess(session.user.id, booking.propertyId, "MANAGER");
  } catch {
    return { error: "Accès refusé." };
  }

  const parsed = updateBookingSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const d = parsed.data;

  if (d.checkOut <= d.checkIn) return { error: "Le départ doit être après l'arrivée." };

  await prisma.$transaction(async (tx) => {
    // Upsert guest
    if (booking.guestId) {
      await tx.guest.update({
        where: { id: booking.guestId },
        data: { name: d.guestName, email: d.guestEmail || null, phone: d.guestPhone || null },
      });
    } else {
      const guest = await tx.guest.create({
        data: { name: d.guestName, email: d.guestEmail || null, phone: d.guestPhone || null },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { guestId: guest.id } });
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        guests:        d.guests,
        status:        d.status as BookingStatus,
        source:        d.source as import("@/generated/prisma/enums").BookingSource,
        checkIn:       new Date(d.checkIn),
        checkOut:      new Date(d.checkOut),
        totalAmount:   d.totalAmount ?? null,
        deposit:       d.deposit ?? null,
        isPaid:        d.isPaid,
        paymentMethod: d.paymentMethod || null,
        internalNotes: d.internalNotes || null,
      },
    });
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath(`/properties/${booking.propertyId}/calendar`);
  return { success: true };
}

function fmt(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
