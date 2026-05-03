import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAlertCounts } from "@/lib/alerts";
import { getFinancialDashboard, getFutureRevenue, getOccupancyData } from "@/lib/analytics";
import {
  IconBuilding, IconCalendar, IconAlertTriangle, IconSync,
  IconChevronRight, IconPlus,
} from "@/components/ui/icons";

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", AGODA: "Agoda",
  VRBO: "Vrbo", EXPEDIA: "Expedia", MANUAL: "Manuel", OTHER: "Autre",
};
const SOURCE_COLORS: Record<string, string> = {
  AIRBNB: "#FF385C", BOOKING_COM: "#003580", AGODA: "#E31837",
  VRBO: "#3D67FF", EXPEDIA: "#FFC72C", MANUAL: "#6366f1", OTHER: "#94a3b8",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const now = new Date();

  const [alerts, recentBookings, financial, future, occupancy] = await Promise.all([
    getAlertCounts(session.user.id),
    prisma.booking.findMany({
      where: { property: { ownerId: session.user.id } },
      include: {
        property: { select: { name: true } },
        guest: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getFinancialDashboard(session.user.id),
    getFutureRevenue(session.user.id),
    getOccupancyData(session.user.id, 1),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const upcomingCount = future.byMonth.reduce((s, m) => s + m.bookings, 0);
  const nextItem = future.byMonth[0]?.items[0];

  const currentMonthOccupancy = (() => {
    const month = occupancy.data[0];
    if (!month || occupancy.properties.length === 0) return null;
    const vals = occupancy.properties.map(p => month.values[p.id] ?? 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  })();

  const STATUS_PILL: Record<string, string> = {
    CONFIRMED: "pill-green", PENDING: "pill-yellow",
    CANCELLED: "pill-gray", COMPLETED: "pill-blue", CONFLICT: "pill-red",
  };
  const STATUS_LABEL: Record<string, string> = {
    CONFIRMED: "Confirmée", PENDING: "En attente",
    CANCELLED: "Annulée", COMPLETED: "Terminée", CONFLICT: "Conflit",
  };

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {greeting}, {session.user.name?.split(" ")[0] ?? "vous"}
          </h1>
          <p className="mt-0.5 text-sm capitalize" style={{ color: "var(--text-secondary)" }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link
          href="/bookings/new"
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: "var(--brand)", boxShadow: "0 4px 12px rgb(99 102 241 / 0.25)" }}
        >
          <IconPlus size={15} />
          Nouvelle réservation
        </Link>
      </div>

      {/* Alertes */}
      {alerts.conflicts > 0 && (
        <Link
          href="/bookings/conflicts"
          className="flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl border transition-all hover:opacity-90"
          style={{ background: "#fff7f7", borderColor: "#fecaca" }}
        >
          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fee2e2", color: "#dc2626" }}>
            <IconAlertTriangle size={16} />
          </span>
          <p className="text-sm font-semibold flex-1" style={{ color: "#991b1b" }}>
            {alerts.conflicts} conflit{alerts.conflicts > 1 ? "s" : ""} à résoudre
          </p>
          <IconChevronRight size={15} style={{ color: "#dc2626" } as React.CSSProperties} />
        </Link>
      )}
      {alerts.syncErrors > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl border"
          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
        >
          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef3c7", color: "#d97706" }}>
            <IconSync size={16} />
          </span>
          <p className="text-sm" style={{ color: "#92400e" }}>
            <span className="font-semibold">{alerts.syncErrors} erreur{alerts.syncErrors > 1 ? "s" : ""} de sync</span>
          </p>
        </div>
      )}

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">

        {/* Réservations à venir */}
        <Link href="/bookings" className="card card-hover p-5 animate-slide-up stagger-1 block">
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Réservations à venir</p>
          <p className="text-4xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
            {upcomingCount}
          </p>
          {nextItem ? (
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              Prochaine : {new Date(nextItem.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              {nextItem.guestName ? ` · ${nextItem.guestName}` : ""}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Aucune à venir</p>
          )}
        </Link>

        {/* Notre CA ce mois */}
        <div className="card p-5 animate-slide-up stagger-2">
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Notre CA ce mois</p>
          <p className="text-4xl font-bold tracking-tight mb-1" style={{ color: "#d97706" }}>
            {fmt(financial.commissionThisMonth)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            sur {fmt(financial.collectedThisMonth)} brut encaissé
          </p>
        </div>

        {/* CA à venir */}
        <Link href="/analytics" className="card card-hover p-5 animate-slide-up stagger-3 block">
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>CA à venir</p>
          <p className="text-4xl font-bold tracking-tight mb-1" style={{ color: "var(--brand)" }}>
            {fmt(future.totalCommission)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {upcomingCount} rés. confirmées futures
          </p>
        </Link>

        {/* Taux d'occupation */}
        <div className="card p-5 animate-slide-up stagger-4">
          <p className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Taux d'occupation</p>
          <p className="text-4xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
            {currentMonthOccupancy != null ? `${currentMonthOccupancy}%` : "—"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {now.toLocaleDateString("fr-FR", { month: "long" })} · {occupancy.properties.length} bien{occupancy.properties.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Check-ins / check-outs aujourd'hui */}
      {(alerts.checkInsToday > 0 || alerts.checkOutsToday > 0) && (
        <div className="flex gap-3 mb-6">
          {alerts.checkInsToday > 0 && (
            <Link
              href="/bookings"
              className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border transition-all hover:opacity-90"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <span className="text-sm font-medium" style={{ color: "#1d4ed8" }}>Check-ins aujourd'hui</span>
              <span className="text-2xl font-bold" style={{ color: "#1d4ed8" }}>{alerts.checkInsToday}</span>
            </Link>
          )}
          {alerts.checkOutsToday > 0 && (
            <Link
              href="/bookings"
              className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border transition-all hover:opacity-90"
              style={{ background: "#fdf4ff", borderColor: "#e9d5ff" }}
            >
              <span className="text-sm font-medium" style={{ color: "#7e22ce" }}>Check-outs aujourd'hui</span>
              <span className="text-2xl font-bold" style={{ color: "#7e22ce" }}>{alerts.checkOutsToday}</span>
            </Link>
          )}
        </div>
      )}

      {/* Réservations récentes */}
      <div className="card animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Réservations récentes</h2>
          <Link href="/bookings" className="text-xs font-medium flex items-center gap-1 hover:opacity-70" style={{ color: "var(--brand)" }}>
            Voir tout <IconChevronRight size={13} />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--bg)" }}>
              <IconCalendar size={22} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucune réservation</p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "var(--brand-light)", color: "var(--brand)" }}
            >
              <IconBuilding size={12} /> Gérer les biens
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
            {recentBookings.map(b => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--bg)] transition-colors"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SOURCE_COLORS[b.source] ?? "#94a3b8" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {b.guest?.name ?? "Voyageur inconnu"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                    {b.property.name} · {SOURCE_LABELS[b.source] ?? b.source}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(b.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" → "}
                    {new Date(b.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                  <span className={`pill mt-0.5 ${STATUS_PILL[b.status] ?? "pill-gray"}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
