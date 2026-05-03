import type { PlatformConnectionModel } from "@/generated/prisma/models";

export type ExternalBooking = {
  externalId: string;
  checkIn: Date;
  checkOut: Date;
  guestName?: string;
  guestEmail?: string;
  summary?: string;
  status: "confirmed" | "cancelled" | "tentative";
  source: string;
};

export type DateRange = { start: Date; end: Date };

export type RatePlan = {
  id: string;
  name: string;
  amount: number;
  currency: string;
};

export interface ChannelAdapter {
  readonly platformKey: string;

  pullReservations(connection: PlatformConnectionModel): Promise<ExternalBooking[]>;
  pushAvailability?(connection: PlatformConnectionModel, blocks: DateRange[]): Promise<void>;
  pushPricing?(connection: PlatformConnectionModel, rates: RatePlan[]): Promise<void>;
}
