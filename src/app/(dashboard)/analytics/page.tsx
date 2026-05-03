import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getMonthlyRevenue,
  getOccupancyData,
  getSourceDistribution,
  getAnalyticsSummary,
  getFinancialDashboard,
} from "@/lib/analytics";
import { RevenueChart } from "@/components/features/analytics/RevenueChart";
import { OccupancyChart } from "@/components/features/analytics/OccupancyChart";
import { SourceChart } from "@/components/features/analytics/SourceChart";
import { IconTrendingUp, IconTrendingDown, IconBarChart, IconBuilding, IconCalendar, IconStar, IconAlertTriangle } from "@/components/ui/icons";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;
  const currentYear = new Date().getFullYear();

  const [revenue, occupancy, sources, summary, financial] = await Promise.all([
    getMonthlyRevenue(userId, 12),
    getOccupancyData(userId, 12),
    getSourceDistribution(userId, 12),
    getAnalyticsSummary(userId),
    getFinancialDashboard(userId),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const totalBookings12m = sources.reduce((s, d) => s + d.count, 0);

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Analytics
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Performance {currentYear - 1} → {currentYear} · {totalBookings12m} réservation{totalBookings12m !== 1 ? "s" : ""} sur 12 mois
          </p>
        </div>
      </div>

      {/* ── Dashboard financier ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">

        {/* Encaissé ce mois */}
        <div className="card p-5 animate-slide-up stagger-1">
          <div className="flex items-center justify-between mb-3">
            <div className="kpi-icon" style={{ background: "#f0fdf4", color: "#059669" }}>
              <IconTrendingUp size={18} />
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#dcfce7", color: "#15803d" }}>
              {new Date().toLocaleDateString("fr-FR", { month: "long" })}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {fmt(financial.collectedThisMonth)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Encaissé ce mois</p>
        </div>

        {/* En attente de paiement */}
        <div className="card p-5 animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-3">
            <div className="kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
              <IconAlertTriangle size={18} />
            </div>
            {financial.pendingCount > 0 && (
              <Link
                href="/bookings"
                className="text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70"
                style={{ background: "#fef3c7", color: "#92400e" }}
              >
                {financial.pendingCount} rés.
              </Link>
            )}
          </div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: financial.pendingPayment > 0 ? "#d97706" : "var(--text-primary)" }}>
            {fmt(financial.pendingPayment)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>En attente de paiement</p>
        </div>

        {/* Revenus par bien */}
        <div className="card p-5 animate-slide-up stagger-3">
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-tertiary)" }}>Revenus par bien</p>
          {financial.revenueByProperty.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Aucune donnée</p>
          ) : (
            <div className="space-y-2">
              {financial.revenueByProperty.slice(0, 4).map(p => {
                const maxRev = financial.revenueByProperty[0]!.revenue;
                const pct = maxRev > 0 ? Math.round((p.revenue / maxRev) * 100) : 0;
                return (
                  <div key={p.propertyId}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>{p.name}</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(p.revenue)}</span>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: "var(--brand)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Revenus par plateforme ── */}
      {financial.revenueBySource.length > 0 && (
        <div className="card p-5 mb-7 animate-fade-in">
          <p className="text-xs font-semibold mb-4" style={{ color: "var(--text-tertiary)" }}>Revenus par plateforme</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {financial.revenueBySource.map(s => (
              <div
                key={s.source}
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: sourceColor(s.source) }} />
                  <span className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                </div>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{fmt(s.revenue)}</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.bookings} rés.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <KpiCard
          label={`Revenus ${currentYear}`}
          value={fmt(summary.revenueThisYear)}
          growth={summary.revenueGrowth}
          sub={`${fmt(summary.revenueLastYear)} en ${currentYear - 1}`}
          icon={<IconTrendingUp size={20} />}
          iconBg="#f0fdf4" iconColor="#059669"
          delay="stagger-1"
        />
        <KpiCard
          label={`Réservations ${currentYear}`}
          value={String(summary.bookingsThisYear)}
          growth={summary.bookingsGrowth}
          sub={`${summary.bookingsLastYear} en ${currentYear - 1}`}
          icon={<IconCalendar size={20} />}
          iconBg="#eff6ff" iconColor="#2563eb"
          delay="stagger-2"
        />
        <KpiCard
          label="Biens actifs"
          value={String(occupancy.properties.length)}
          sub="connectés au PMS"
          icon={<IconBuilding size={20} />}
          iconBg="#eef2ff" iconColor="#6366f1"
          delay="stagger-3"
        />
        <KpiCard
          label="Top source"
          value={sources[0]?.label ?? "—"}
          sub={sources[0] ? `${sources[0].count} rés.` : "Aucune données"}
          icon={<IconStar size={20} />}
          iconBg="#fdf4ff" iconColor="#9333ea"
          delay="stagger-4"
        />
      </div>

      {/* Revenue chart */}
      <div className="card mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Revenus mensuels</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {currentYear - 1} (gris) vs {currentYear} (indigo)
            </p>
          </div>
          {summary.revenueGrowth != null && (
            <div
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl"
              style={summary.revenueGrowth >= 0
                ? { background: "#dcfce7", color: "#15803d" }
                : { background: "#fee2e2", color: "#b91c1c" }
              }
            >
              {summary.revenueGrowth >= 0
                ? <IconTrendingUp size={14} />
                : <IconTrendingDown size={14} />
              }
              {summary.revenueGrowth >= 0 ? "+" : ""}{summary.revenueGrowth}% vs {currentYear - 1}
            </div>
          )}
        </div>
        <div className="p-6">
          <RevenueChart data={revenue} />
        </div>
      </div>

      {/* Occupancy + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Occupancy */}
        <div className="card animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Taux d&apos;occupation</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              % de nuits occupées par bien
            </p>
          </div>
          <div className="p-6">
            <OccupancyChart data={occupancy.data} properties={occupancy.properties} />
          </div>
        </div>

        {/* Sources */}
        <div className="card animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Répartition par source</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {totalBookings12m} réservations · 12 derniers mois
            </p>
          </div>
          <div className="p-6">
            <SourceChart data={sources} />

            {sources.length > 0 && (
              <div className="mt-5 space-y-2.5">
                {sources.map(s => {
                  const pct = totalBookings12m > 0 ? Math.round((s.count / totalBookings12m) * 100) : 0;
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: sourceColor(s.source) }}
                          />
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {s.count} rés.
                          </span>
                          {s.revenue > 0 && (
                            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                              {fmt(s.revenue)}
                            </span>
                          )}
                          <span className="text-xs font-bold w-8 text-right" style={{ color: "var(--text-primary)" }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="stat-bar">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${pct}%`, background: sourceColor(s.source) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function sourceColor(source: string) {
  const map: Record<string, string> = {
    AIRBNB: "#FF385C", BOOKING_COM: "#003580", AGODA: "#E31837",
    VRBO: "#3D67FF", EXPEDIA: "#FFC72C", MANUAL: "#6366f1", OTHER: "#94a3b8",
  };
  return map[source] ?? "#94a3b8";
}

function KpiCard({
  label, value, growth, sub, icon, iconBg, iconColor, delay,
}: {
  label: string; value: string;
  growth?: number | null; sub?: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  delay?: string;
}) {
  return (
    <div className={`card card-hover p-5 animate-slide-up${delay ? " " + delay : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        {growth != null && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={growth >= 0
              ? { background: "#dcfce7", color: "#15803d" }
              : { background: "#fee2e2", color: "#b91c1c" }
            }
          >
            {growth >= 0 ? "+" : ""}{growth}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      {sub && <p className="text-xs mt-1 truncate" style={{ color: "var(--text-tertiary)" }}>{sub}</p>}
    </div>
  );
}
