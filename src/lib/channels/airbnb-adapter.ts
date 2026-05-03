/**
 * Airbnb Partner API v3 adapter (Phase 2)
 *
 * Requires approval as an Airbnb Software Integrator:
 * https://www.airbnb.com/partners
 *
 * When `credentials.accessToken` is present in the PlatformConnection, this
 * adapter uses the Partner API. Otherwise it falls back to the iCal adapter.
 *
 * OAuth flow:
 *   1. Redirect user to https://www.airbnb.com/oauth2/auth?client_id=...
 *   2. Receive callback at /api/auth/airbnb/callback with `code`
 *   3. Exchange for access_token + refresh_token at https://api.airbnb.com/v3/access_tokens
 *   4. Store tokens in PlatformConnection.credentials
 *   5. Refresh every 30 days via refresh_token
 */

import type { ChannelAdapter, ExternalBooking, DateRange, RatePlan } from "./adapter";
import type { PlatformConnectionModel } from "@/generated/prisma/models";
import { ICalAdapter } from "./ical-adapter";

type AirbnbCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const AIRBNB_API_BASE = "https://api.airbnb.com/v3";

export class AirbnbAdapter implements ChannelAdapter {
  readonly platformKey = "AIRBNB";

  private readonly icalFallback = new ICalAdapter("AIRBNB");

  async pullReservations(connection: PlatformConnectionModel): Promise<ExternalBooking[]> {
    const creds = connection.credentials as AirbnbCredentials | null;

    if (!creds?.accessToken) {
      // Graceful fallback to iCal when API not configured
      return this.icalFallback.pullReservations(connection);
    }

    const token = await this.ensureFreshToken(creds, connection);

    // GET /v3/reservations — paginated
    const res = await fetch(`${AIRBNB_API_BASE}/reservations?_limit=100&_offset=0`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Airbnb-API-Key": process.env.AIRBNB_CLIENT_ID ?? "",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Airbnb API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as { reservations: AirbnbReservation[] };

    return data.reservations
      .filter(r => r.status !== "cancelled")
      .map(r => ({
        externalId: String(r.confirmation_code),
        checkIn: new Date(r.start_date),
        checkOut: new Date(r.end_date),
        guestName: r.guest?.full_name,
        guestEmail: r.guest?.email,
        status: r.status === "accepted" ? "confirmed" : "tentative",
        source: this.platformKey,
      }));
  }

  async pushAvailability(
    connection: PlatformConnectionModel,
    blocks: DateRange[]
  ): Promise<void> {
    const creds = connection.credentials as AirbnbCredentials | null;
    if (!creds?.accessToken) throw new Error("Airbnb API credentials required to push availability.");

    const token = await this.ensureFreshToken(creds, connection);

    // PUT /v3/listings/:id/availability_rules
    const listingId = (connection.credentials as Record<string, string>)?.listingId;
    if (!listingId) throw new Error("Airbnb listing ID not configured.");

    await fetch(`${AIRBNB_API_BASE}/listings/${listingId}/availability_rules`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Airbnb-API-Key": process.env.AIRBNB_CLIENT_ID ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocked_dates: blocks.map(b => ({
          date: b.start.toISOString().split("T")[0],
          available: false,
        })),
      }),
    });
  }

  async pushPricing(
    connection: PlatformConnectionModel,
    rates: RatePlan[]
  ): Promise<void> {
    const creds = connection.credentials as AirbnbCredentials | null;
    if (!creds?.accessToken) throw new Error("Airbnb API credentials required to push pricing.");
    void connection; void rates;
    // PUT /v3/listings/:id/pricing_settings — implement when needed
    throw new Error("Airbnb pricing push: not yet implemented.");
  }

  private async ensureFreshToken(
    creds: AirbnbCredentials,
    _connection: PlatformConnectionModel
  ): Promise<string> {
    if (creds.expiresAt > Date.now() + 60_000) return creds.accessToken;

    // Refresh the token
    const res = await fetch(`${AIRBNB_API_BASE}/access_tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: process.env.AIRBNB_CLIENT_ID,
        client_secret: process.env.AIRBNB_CLIENT_SECRET,
        refresh_token: creds.refreshToken,
      }),
    });
    if (!res.ok) throw new Error("Failed to refresh Airbnb access token.");
    const data = await res.json() as { access_token: string; expires_in: number };
    // Caller should persist the new token — simplified here for readability
    return data.access_token;
  }
}

// Airbnb API response shape (subset)
type AirbnbReservation = {
  confirmation_code: string;
  start_date: string;
  end_date: string;
  status: string;
  guest?: { full_name?: string; email?: string };
};
