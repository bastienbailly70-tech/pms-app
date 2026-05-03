import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconCalendar, IconAlertTriangle, IconPlus, IconChevronRight, IconFilter,
} from "@/components/ui/icons";

const STATUS_CONFIG = {
  CONFIRMED: { label: "Confirmée", pill: "pill-green" },
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
  VRBO: "#3D67FF", EXPEDIA: "#F59E0B", MANUAL: "#6366f1", OTHER: "#94a3b8",
};

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [bookings, conflictCount] = await Promise.all([
    prisma.booking.findMany({
      where: { property: { ownerId: session.user.id } },
      include: {
        property: { select: { name: true, city: true } },
        guest: { select: { name: true } },
      },
      orderBy: { checkIn: "desc" },
      take: 50,
    }),
    prisma.bookingConflict.count({
      where: { resolvedAt: null, booking: { property: { ownerId: session.user.id } } },
    }),
  ]);

  const confirmedCount = bookings.filter(b => b.status === "CONFIRMED").length;
  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Réservations
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {bookings.length} réservation{bookings.length !== 1 ? "s" : ""}
            {confirmedCount > 0 && ` · ${confirmedCount} confirmée${confirmedCount > 1 ? "s" : ""}`}
            {pendingCount > 0 && ` · ${pendingCount} en attente`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conflictCount > 0 && (
            <Link
              href="/bookings/conflicts"
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-all hover:opacity-80"
              style={{
                background: "#fff7f7", borderColor: "#fecaca", color: "#dc2626",
              }}
            >
              <IconAlertTriangle size={15} />
              {conflictCount} conflit{conflictCount > 1 ? "s" : ""}
            </Link>
          )}
          <Link
            href="/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--brand)",
              boxShadow: "0 4px 12px rgb(99 102 241 / 0.25)",
            }}
          >
            <IconPlus size={15} />
            Réservation manuelle
          </Link>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card animate-fade-in overflow-hidden">
          {/* Table header */}
          <div
            className="grid px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b"
            style={{
              color: "var(--text-tertiary)",
              borderColor: "var(--border)",
              background: "#fafafa",
              gridTemplateColumns: "2fr 1.5fr 1fr 1fr 100px 110px",
            }}
          >
            <span>Bien / Voyageur</span>
            <span className="hidden sm:block">Dates</span>
            <span className="hidden md:block">Nuits</span>
            <span className="hidden md:block">Source</span>
            <span className="hidden sm:block">Montant</span>
            <span>Statut</span>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
            {bookings.map(b => {
              const status = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
              const nights = Math.round(
                (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
              );
              return (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="table-row grid items-center px-6 py-4"
                  style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 100px 110px" }}
                >
                  {/* Property + guest */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: SOURCE_COLORS[b.source] ?? "#94a3b8" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {b.guest?.name ?? <span style={{ color: "var(--text-tertiary)" }}>Voyageur inconnu</span>}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {b.property.name}{b.property.city ? ` · ${b.property.city}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="hidden sm:block">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {new Date(b.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      → {new Date(b.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>

                  {/* Nights */}
                  <div className="hidden md:block">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {nights}n
                    </span>
                  </div>

                  {/* Source */}
                  <div className="hidden md:flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: SOURCE_COLORS[b.source] ?? "#94a3b8" }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {SOURCE_LABELS[b.source] ?? b.source}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="hidden sm:block">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {b.totalAmount
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: b.currency ?? "EUR", maximumFractionDigits: 0 }).format(Number(b.totalAmount))
                        : <span style={{ color: "var(--text-tertiary)" }}>—</span>
                      }
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-end gap-2">
                    <span className={`pill ${status.pill}`}>{status.label}</span>
                    {b.status === "CONFLICT" && (
                      <IconAlertTriangle size={13} style={{ color: "#dc2626" } as React.CSSProperties} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card animate-fade-in py-20 flex flex-col items-center justify-center text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--brand-light)" }}
      >
        <IconCalendar size={28} style={{ color: "var(--brand)" } as React.CSSProperties} />
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Aucune réservation
      </h2>
      <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: "var(--text-secondary)" }}>
        Connectez vos plateformes OTA pour importer vos réservations automatiquement.
      </p>
      <div className="flex gap-3">
        <Link
          href="/bookings/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl"
          style={{ background: "var(--brand)" }}
        >
          <IconPlus size={14} /> Réservation manuelle
        </Link>
        <Link
          href="/properties"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <IconFilter size={14} /> Connecter une plateforme
        </Link>
      </div>
    </div>
  );
}
