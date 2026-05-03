import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

import Link from "next/link";
import { BookingEditForm } from "@/components/features/bookings/BookingEditForm";
import {
  IconChevronRight, IconAlertTriangle, IconCalendarCheck, IconCalendar,
} from "@/components/ui/icons";

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", AGODA: "Agoda",
  VRBO: "Vrbo", EXPEDIA: "Expedia", GOOGLE_VR: "Google VR",
  MANUAL: "Direct", OTHER: "Autre",
};
const SOURCE_COLORS: Record<string, string> = {
  AIRBNB: "#FF385C", BOOKING_COM: "#003580", AGODA: "#E31837",
  VRBO: "#3D67FF", EXPEDIA: "#FFC72C", MANUAL: "#6366f1", OTHER: "#94a3b8",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const [booking, dbUser] = await Promise.all([
    prisma.booking.findFirst({
      where: { id, property: { ownerId: session.user.id } },
      include: {
        property: { select: { id: true, name: true, city: true } },
        guest: true,
        conflicts: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { commissionRate: true },
    }),
  ]);

  if (!booking) notFound();

  const commissionRate = dbUser?.commissionRate ? Number(dbUser.commissionRate) : 0.15;

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  );
  const total  = booking.totalAmount ? Number(booking.totalAmount) : null;
  const sourceColor = SOURCE_COLORS[booking.source] ?? "#94a3b8";
  const currency = booking.currency ?? "EUR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // Serialize Prisma Date fields to ISO strings for the client form
  const initial = {
    guestName:     booking.guest?.name ?? "",
    guestEmail:    booking.guest?.email ?? "",
    guestPhone:    booking.guest?.phone ?? "",
    guests:        booking.guests,
    status:        booking.status,
    source:        booking.source,
    checkIn:       new Date(booking.checkIn).toISOString().slice(0, 10),
    checkOut:      new Date(booking.checkOut).toISOString().slice(0, 10),
    totalAmount:   booking.totalAmount ? String(Number(booking.totalAmount)) : "",
    deposit:       booking.deposit ? String(Number(booking.deposit)) : "",
    isPaid:        booking.isPaid,
    paymentMethod: booking.paymentMethod ?? "",
    internalNotes: booking.internalNotes ?? "",
  };

  return (
    <div className="px-8 py-7 max-w-4xl mx-auto animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6">
        <Link href="/bookings" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--text-tertiary)" }}>
          Réservations
        </Link>
        <IconChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {booking.guest?.name ?? booking.property.name}
        </span>
      </div>

      {/* Header */}
      <div className="card p-5 mb-6" style={{ background: "linear-gradient(135deg, #fafafa 0%, #f5f5f7 100%)" }}>
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
            style={{ background: sourceColor }}
          >
            {(SOURCE_LABELS[booking.source] ?? booking.source).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: "var(--text-tertiary)" }}>
              {SOURCE_LABELS[booking.source] ?? booking.source} · {booking.property.name}{booking.property.city ? ` · ${booking.property.city}` : ""}
            </p>
            <h1 className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {booking.guest?.name ?? "Sans nom"} · {nights} nuit{nights > 1 ? "s" : ""}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {new Date(booking.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              {" → "}
              {new Date(booking.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              {total ? ` · ${fmt(total)}` : ""}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/properties/${booking.property.id}/calendar`}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <IconCalendarCheck size={13} />
              Calendrier
            </Link>
            <Link
              href={`/properties/${booking.property.id}/platforms`}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <IconCalendar size={13} />
              Plateformes
            </Link>
          </div>
        </div>
      </div>

      {/* Conflict alert */}
      {booking.status === "CONFLICT" && (
        <Link
          href="/bookings/conflicts"
          className="flex items-center gap-3 px-5 py-4 mb-6 rounded-2xl border transition-all hover:opacity-90"
          style={{ background: "#fff7f7", borderColor: "#fecaca" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fee2e2", color: "#dc2626" }}>
            <IconAlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>Cette réservation est en conflit</p>
            <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>Des dates se chevauchent. Cliquez pour résoudre.</p>
          </div>
          <IconChevronRight size={16} style={{ color: "#dc2626" }} />
        </Link>
      )}

      {/* Edit form — everything in one place */}
      <BookingEditForm bookingId={booking.id} commissionRate={commissionRate} initial={initial} />

    </div>
  );
}
