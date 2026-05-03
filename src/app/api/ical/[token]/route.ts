import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateICalFeed } from "@/lib/channels/ical-generator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 20) {
    return new NextResponse("Not found", { status: 404 });
  }

  const connection = await prisma.platformConnection.findUnique({
    where: { icalExportToken: token },
    include: {
      property: { select: { name: true } },
    },
  });

  if (!connection) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: connection.propertyId,
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: { guest: { select: { name: true } } },
    orderBy: { checkIn: "asc" },
  });

  const blockedDates = await prisma.blockedDate.findMany({
    where: { propertyId: connection.propertyId },
    orderBy: { startDate: "asc" },
  });

  const events = [
    ...bookings.map(b => ({
      uid: b.externalId ?? `booking-${b.id}@pms`,
      summary: b.guest?.name ? `Réservé — ${b.guest.name}` : "Réservé",
      dtstart: new Date(b.checkIn),
      dtend: new Date(b.checkOut),
    })),
    ...blockedDates.map(d => ({
      uid: `block-${d.id}@pms`,
      summary: d.reason ? `Bloqué — ${d.reason}` : "Bloqué",
      dtstart: new Date(d.startDate),
      dtend: new Date(d.endDate),
    })),
  ];

  const ical = generateICalFeed(connection.property.name, events);

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="property-${connection.propertyId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
