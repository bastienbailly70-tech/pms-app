import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewBookingForm } from "@/components/features/bookings/NewBookingForm";

export default async function NewBookingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id, status: "ACTIVE" },
    select: { id: true, name: true, maxGuests: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/bookings" className="hover:text-gray-700">Réservations</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Nouvelle réservation</span>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Réservation manuelle</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewBookingForm properties={properties} />
      </div>
    </div>
  );
}
