import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ConflictCard } from "@/components/features/bookings/ConflictCard";
import { BookingStatus } from "@/generated/prisma/enums";
import type {
  BookingConflictModel,
  BookingModel,
  PropertyModel,
  GuestModel,
} from "@/generated/prisma/models";

type ConflictWithRelations = BookingConflictModel & {
  booking: BookingModel & {
    property: Pick<PropertyModel, "id" | "name">;
    guest: GuestModel | null;
  };
};

export default async function ConflictsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const conflicts = await prisma.bookingConflict.findMany({
    where: {
      resolvedAt: null,
      booking: { property: { ownerId: session.user.id } },
    },
    include: {
      booking: {
        include: {
          property: { select: { id: true, name: true } },
          guest: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as ConflictWithRelations[];

  // For each conflict, find the overlapping existing booking
  const conflictsWithOverlap = await Promise.all(
    conflicts.map(async (conflict) => {
      const nb = conflict.booking;
      const overlapping = await prisma.booking.findFirst({
        where: {
          propertyId: nb.propertyId,
          id: { not: nb.id },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
          AND: [
            { checkIn: { lt: nb.checkOut } },
            { checkOut: { gt: nb.checkIn } },
          ],
        },
        include: { guest: true },
      }) as (BookingModel & { guest: GuestModel | null }) | null;

      return { conflict, overlapping };
    })
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/bookings" className="hover:text-gray-700">Réservations</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Conflits</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Conflits de dates</h1>
          {conflicts.length > 0 && (
            <p className="text-sm text-red-600 mt-0.5">
              {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""} à résoudre
            </p>
          )}
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Aucun conflit</h2>
          <p className="text-sm text-gray-500">Tous vos calendriers sont synchronisés correctement.</p>
          <Link href="/bookings" className="mt-4 text-sm text-blue-600 hover:underline">
            Voir les réservations →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conflictsWithOverlap.map(({ conflict, overlapping }) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              overlapping={overlapping}
            />
          ))}
        </div>
      )}
    </div>
  );
}
