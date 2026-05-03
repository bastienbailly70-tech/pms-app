/**
 * Booking.com Connectivity API adapter (Phase 2)
 *
 * Requires a Booking.com Connectivity Partner account:
 * https://join.booking.com/connectivity-partner-program
 *
 * Authentication: HTTP Basic Auth (username = hotel ID, password = API key)
 * Base URL: https://supply-xml.booking.com/hotels/ota/
 *
 * OTA_HotelAvailGetRS and OTA_HotelResNotifRQ for reservations
 * OTA_HotelRatePlanNotifRQ for pricing
 *
 * When `credentials.apiKey` is present, uses direct API.
 * Falls back to iCal if not configured.
 */

import type { ChannelAdapter, ExternalBooking, DateRange, RatePlan } from "./adapter";
import type { PlatformConnectionModel } from "@/generated/prisma/models";
import { ICalAdapter } from "./ical-adapter";

type BookingComCredentials = {
  hotelId: string;
  apiKey: string;
};

const API_BASE = "https://supply-xml.booking.com/hotels/ota";

export class BookingComAdapter implements ChannelAdapter {
  readonly platformKey = "BOOKING_COM";

  private readonly icalFallback = new ICalAdapter("BOOKING_COM");

  async pullReservations(connection: PlatformConnectionModel): Promise<ExternalBooking[]> {
    const creds = connection.credentials as BookingComCredentials | null;

    if (!creds?.apiKey || !creds?.hotelId) {
      return this.icalFallback.pullReservations(connection);
    }

    const now = new Date();
    const from = now.toISOString().split("T")[0];
    const to = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().split("T")[0];

    const res = await fetch(
      `${API_BASE}/OTA_HotelResNotifRQ?hotel_id=${creds.hotelId}&date_from=${from}&date_to=${to}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.hotelId}:${creds.apiKey}`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Booking.com API ${res.status}: ${await res.text()}`);

    const data = await res.json() as { reservations?: BookingComReservation[] };

    return (data.reservations ?? [])
      .filter(r => r.status !== "cancelled")
      .map(r => ({
        externalId: String(r.id),
        checkIn: new Date(r.checkin),
        checkOut: new Date(r.checkout),
        guestName: [r.guest?.first_name, r.guest?.last_name].filter(Boolean).join(" ") || undefined,
        guestEmail: r.guest?.email,
        status: r.status === "ok" ? "confirmed" : "tentative",
        source: this.platformKey,
      }));
  }

  async pushAvailability(
    connection: PlatformConnectionModel,
    blocks: DateRange[]
  ): Promise<void> {
    const creds = connection.credentials as BookingComCredentials | null;
    if (!creds?.apiKey) throw new Error("Booking.com API credentials required.");
    void blocks;
    // OTA_HotelAvailNotifRQ — close out blocked dates
    throw new Error("Booking.com availability push: not yet implemented.");
  }

  async pushPricing(
    connection: PlatformConnectionModel,
    rates: RatePlan[]
  ): Promise<void> {
    const creds = connection.credentials as BookingComCredentials | null;
    if (!creds?.apiKey) throw new Error("Booking.com API credentials required.");
    void rates;
    // OTA_HotelRatePlanNotifRQ
    throw new Error("Booking.com pricing push: not yet implemented.");
  }
}

type BookingComReservation = {
  id: number;
  checkin: string;
  checkout: string;
  status: string;
  guest?: { first_name?: string; last_name?: string; email?: string };
};
