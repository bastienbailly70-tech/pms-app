import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookingTimeline } from "@/components/features/bookings/BookingTimeline";
import { BookingPaymentPanel } from "@/components/features/bookings/BookingPaymentPanel";
import { BookingGuestPanel } from "@/components/features/bookings/BookingGuestPanel";
import { BookingActions } from "@/components/features/bookings/BookingActions";
import {
  IconChevronRight, IconAlertTriangle, IconCalendar,
  IconUsers, IconMapPin, IconCalendarCheck,
} from "@/components/ui/icons";
import type {
  BookingModel, BookingConflictModel, GuestModel,
} from "@/generated/prisma/models";

const STATUS_CONFIG = {
  CONFIRMED: { label: "Confirmée", pill: "pill-green"  },
  PENDING:   { label: "En attente", pill: "pill-yellow" },
  CANCELLED: { label: "Annulée",   pill: "pill-gray"   },
  COMPLETED: { label: "Terminée",  pill: "pill-blue"   },
  CONFLICT:  { label: "Conflit",   pill: "pill-red"    },
};

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", AGODA: "Agoda",
  VRBO: "Vrbo", EXPEDIA: "Expedia", GOOGLE_VR: "Google VR",
  MANUAL: "Manuel", OTHER: "Autre",
};
const SOURCE_COLORS: Record<string, string> = {
  AIRBNB: "#FF385C", BOOKING_COM: "#003580", AGODA: "#E31837",
  VRBO: "#3D67FF", EXPEDIA: "#FFC72C", MANUAL: "#6366f1", OTHER: "#94a3b8",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id, property: { ownerId: session.user.id } },
    include: {
      property: { select: { id: true, name: true, city: true } },
      guest: true,
      ratePlan: { select: { name: true } },
      conflicts: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!booking) notFound();

  const status = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  );
  const total = booking.totalAmount ? Number(booking.totalAmount) : null;
  const currency = booking.currency ?? "EUR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const sourceColor = SOURCE_COLORS[booking.source] ?? "#94a3b8";

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6">
        <Link
          href="/bookings"
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          Réservations
        </Link>
        <IconChevronRight size={13} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {booking.guest?.name ?? booking.property.name}
        </span>
      </div>

      {/* Header card */}
      <div
        className="card p-6 mb-6"
        style={{ background: "linear-gradient(135deg, #fafafa 0%, #f5f5f7 100%)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Source indicator */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ background: sourceColor }}
            >
              {(SOURCE_LABELS[booking.source] ?? booking.source).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {booking.guest?.name ?? "Sans nom"}
                </h1>
                <span className={`pill ${status.pill}`}>{status.label}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm" style={{ color: "var(--text-secondary)" }}>
                <Link
                  href={`/properties/${booking.property.id}`}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                >
                  <IconMapPin size={12} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
                  {booking.property.name}
                  {booking.property.city && ` · ${booking.property.city}`}
                </Link>
                <span style={{ color: "var(--border)" }}>·</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: sourceColor }}
                  />
                  {SOURCE_LABELS[booking.source] ?? booking.source}
                </div>
                {total && (
                  <>
                    <span style={{ color: "var(--border)" }}>·</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {fmt(total)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <BookingActions bookingId={booking.id} status={booking.status} />
        </div>
      </div>

      {/* Conflict alert */}
      {booking.status === "CONFLICT" && (
        <Link
          href="/bookings/conflicts"
          className="flex items-center gap-3 px-5 py-4 mb-6 rounded-2xl border transition-all hover:opacity-90 animate-fade-in"
          style={{ background: "#fff7f7", borderColor: "#fecaca" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#fee2e2", color: "#dc2626" }}
          >
            <IconAlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
              Cette réservation est en conflit
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>
              Des dates se chevauchent. Cliquez pour résoudre.
            </p>
          </div>
          <IconChevronRight size={16} style={{ color: "#dc2626" } as React.CSSProperties} />
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Dates */}
          <div className="card p-5">
            <p className="section-title mb-4">Séjour</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div
                className="flex flex-col gap-1 p-3 rounded-xl"
                style={{ background: "var(--bg)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Arrivée</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {new Date(booking.checkIn).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
              <div
                className="flex flex-col gap-1 p-3 rounded-xl"
                style={{ background: "var(--bg)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Départ</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {new Date(booking.checkOut).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
              <div
                className="flex flex-col gap-1 p-3 rounded-xl"
                style={{ background: "var(--bg)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Durée</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {nights} nuit{nights > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-4 pt-3"
              style={{ borderTop: "1px solid var(--border-light)" }}
            >
              <div className="flex items-center gap-1.5">
                <IconUsers size={13} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {booking.guests} voyageur{booking.guests > 1 ? "s" : ""}
                </span>
              </div>
              {booking.ratePlan && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                    {booking.ratePlan.name}
                  </span>
                </div>
              )}
              {total && (
                <div className="ml-auto">
                  <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {fmt(total)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Guest */}
          <div className="card p-5">
            <p className="section-title mb-4">Voyageur</p>
            <BookingGuestPanel
              bookingId={booking.id}
              guest={booking.guest as GuestModel | null}
            />
          </div>

          {/* Payment */}
          <div className="card p-5">
            <p className="section-title mb-4">Paiement</p>
            <BookingPaymentPanel booking={booking as BookingModel} />
          </div>
        </div>

        {/* Right — sidebar */}
        <div className="space-y-5">

          {/* Timeline */}
          <div className="card p-5">
            <p className="section-title mb-4">Historique</p>
            <BookingTimeline
              booking={booking as BookingModel}
              conflicts={booking.conflicts as BookingConflictModel[]}
            />
          </div>

          {/* Quick links */}
          <div className="card p-5">
            <p className="section-title mb-3">Accès rapide</p>
            <div className="space-y-1">
              {[
                { href: `/properties/${booking.property.id}/calendar`, icon: <IconCalendarCheck size={14} />, label: "Calendrier du bien" },
                { href: `/properties/${booking.property.id}/platforms`, icon: <IconCalendar size={14} />, label: "Plateformes" },
                ...(booking.status === "CONFLICT"
                  ? [{ href: "/bookings/conflicts", icon: <IconAlertTriangle size={14} />, label: "Résoudre le conflit", danger: true }]
                  : []),
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--bg)]"
                  style={{ color: (link as { danger?: boolean }).danger ? "var(--danger)" : "var(--text-secondary)" }}
                >
                  <span className="flex items-center gap-2">
                    {link.icon}
                    {link.label}
                  </span>
                  <IconChevronRight size={13} style={{ opacity: 0.4 } as React.CSSProperties} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
