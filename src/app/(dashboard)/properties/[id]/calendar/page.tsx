import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AvailabilityCalendar } from "@/components/features/calendar/AvailabilityCalendar";
import { AvailabilitySettings } from "@/components/features/calendar/AvailabilitySettings";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      blockedDates: {
        where: { endDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
      },
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "PENDING"] },
          checkOut: { gte: new Date() },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
          source: true,
        },
      },
    },
  });

  if (!property) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/properties" className="hover:text-gray-700">Biens</Link>
        <span>/</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-700 truncate max-w-[160px]">
          {property.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Calendrier</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Disponibilités</h1>
        <Link href={`/properties/${id}/pricing`} className="text-sm text-blue-600 hover:underline">
          Gérer les tarifs →
        </Link>
      </div>

      <div className="mb-6">
        <AvailabilitySettings
          propertyId={id}
          minNights={property.minNights}
          maxNights={property.maxNights}
          gapDays={property.gapDays}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <AvailabilityCalendar
          propertyId={id}
          blocks={property.blockedDates.map(b => ({
            id: b.id,
            propertyId: b.propertyId,
            startDate: b.startDate.toISOString(),
            endDate: b.endDate.toISOString(),
            reason: b.reason,
            isManual: b.isManual,
            createdAt: b.createdAt.toISOString(),
          }))}
          bookings={property.bookings.map(b => ({
            id: b.id,
            checkIn: b.checkIn.toISOString(),
            checkOut: b.checkOut.toISOString(),
            status: b.status,
            source: b.source,
          }))}
        />
      </div>
    </div>
  );
}
