import type { ChannelAdapter, ExternalBooking } from "./adapter";
import { parseICalFeed } from "./ical-parser";
import type { PlatformConnectionModel } from "@/generated/prisma/models";
import { AirbnbAdapter } from "./airbnb-adapter";
import { BookingComAdapter } from "./bookingcom-adapter";

const FETCH_TIMEOUT_MS = 15_000;

export class ICalAdapter implements ChannelAdapter {
  readonly platformKey: string;

  constructor(platformKey: string) {
    this.platformKey = platformKey;
  }

  async pullReservations(connection: PlatformConnectionModel): Promise<ExternalBooking[]> {
    if (!connection.icalImportUrl) {
      throw new Error(`No iCal import URL configured for connection ${connection.id}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let raw: string;
    try {
      const res = await fetch(connection.icalImportUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "PMS-Sync/1.0" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching iCal from ${connection.icalImportUrl}`);
      }
      raw = await res.text();
    } finally {
      clearTimeout(timeout);
    }

    const events = parseICalFeed(raw);

    return events
      .filter(e => e.status !== "cancelled")
      .map(e => ({
        externalId: e.uid,
        checkIn: e.dtstart,
        checkOut: e.dtend,
        guestName: extractGuestName(e.summary),
        summary: e.summary,
        status: e.status === "tentative" ? "tentative" : "confirmed",
        source: this.platformKey,
      }));
  }
}

// Airbnb uses "Reserved" or "CLOSED", Booking uses guest names, etc.
// Normalise to a display name.
function extractGuestName(summary: string): string | undefined {
  const lower = summary.toLowerCase();
  if (lower === "reserved" || lower === "closed" || lower === "blocked" || lower === "not available") {
    return undefined;
  }
  return summary || undefined;
}

// One adapter instance per platform — stateless, safe to share
export const ICAL_ADAPTERS: Record<string, ICalAdapter> = {
  airbnb: new ICalAdapter("airbnb"),
  booking_com: new ICalAdapter("booking_com"),
  agoda: new ICalAdapter("agoda"),
  vrbo: new ICalAdapter("vrbo"),
  expedia: new ICalAdapter("expedia"),
  google_vr: new ICalAdapter("google_vr"),
};

// Direct API adapters — used when credentials are configured on a connection
const API_ADAPTERS: Record<string, ChannelAdapter> = {
  AIRBNB: new AirbnbAdapter(),
  BOOKING_COM: new BookingComAdapter(),
};

export function getAdapter(
  platformKey: string,
  connection?: PlatformConnectionModel
): ChannelAdapter {
  // Prefer direct API adapter when credentials are present
  const upperKey = platformKey.toUpperCase();
  const apiAdapter = API_ADAPTERS[upperKey];
  if (apiAdapter && connection?.credentials) {
    return apiAdapter;
  }

  const icalAdapter = ICAL_ADAPTERS[platformKey.toLowerCase()] ?? ICAL_ADAPTERS[upperKey.toLowerCase()];
  if (icalAdapter) return icalAdapter;

  throw new Error(`No adapter registered for platform: ${platformKey}`);
}
