import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getMonthComparison,
  getPropertyPerformanceTable,
  getSourceDistribution,
  getMonthlyRevenueBars,
  getFutureRevenue,
} from "@/lib/analytics";
import { MonthlyStackedChart } from "@/components/features/analytics/MonthlyStackedChart";
import { PlatformDonutChart } from "@/components/features/analytics/PlatformDonutChart";
import { IconSettings, IconArrowUpRight, IconTrendingDown } from "@/components/ui/icons";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;
  const now = new Date();

  const [comparison, properties, sources, monthlyBars, future] = await Promise.all([
    getMonthComparison(userId),
    getPropertyPerformanceTable(userId),
    getSourceDistribution(userId, 12),
    getMonthlyRevenueBars(userId, 12),
    getFutureRevenue(userId),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const fmtSmall = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

  const currentMonthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const prevMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long" });

  const occupancyColor = (pct: number) =>
    pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";

  const PLATFORM_COLORS: Record<string, string> = {
    AIRBNB: "#FF385C", BOOKING_COM: "#003580", AGODA: "#E31837",
    VRBO: "#3D67FF", EXPEDIA: "#FFC72C", MANUAL: "#6366f1", OTHER: "#94a3b8",
  };

  return (
    <div className="px-6 py-7 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Analytics
          </h1>
          <p className="mt-0.5 text-sm capitalize" style={{ color: "var(--text-tertiary)" }}>
            {currentMonthLabel} · {comparison.bookingsCount} réservation{comparison.bookingsCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <IconSettings size={13} />
          Commission {Math.round(future.commissionRate * 100)}%
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1 — KPIs avec comparaison                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnalyticsSection label="KPIs FINANCIERS" sub={`comparé à ${prevMonthLabel}`}>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <KpiCompareCard
            label="Revenus bruts"
            current={fmt(comparison.currentGross)}
            previous={fmt(comparison.previousGross)}
            growth={comparison.grossGrowth}
            accent="#2563eb"
            bg="#eff6ff"
          />
          <KpiCompareCard
            label="Notre CA (commissions)"
            current={fmt(comparison.currentCommission)}
            previous={fmt(comparison.previousCommission)}
            growth={comparison.commissionGrowth}
            accent="#059669"
            bg="#f0fdf4"
            highlight
          />
          <KpiCompareCard
            label="Reversement propriétaires"
            current={fmt(comparison.currentNet)}
            previous={fmt(comparison.previousNet)}
            growth={comparison.netGrowth}
            accent="#d97706"
            bg="#fffbeb"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: "#eef2ff", color: "#6366f1" }}
            >
              RevPAR
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>RevPAR ce mois</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {fmtSmall(comparison.revpar)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>revenu / nuit disponible</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: "#fdf4ff", color: "#9333ea" }}
            >
              ADR
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Ticket moyen</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {comparison.ticketMoyen > 0 ? fmt(comparison.ticketMoyen) : "—"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>par réservation ce mois</p>
            </div>
          </div>
        </div>
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Performance par bien                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnalyticsSection label="PERFORMANCE PAR BIEN" sub={`ce mois · ${currentMonthLabel}`}>
        <div className="card overflow-hidden">
          {properties.length === 0 ? (
            <p className="px-6 py-10 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
              Aucun bien enregistré
            </p>
          ) : (
            <>
              {/* Header */}
              <div
                className="grid px-5 py-3 text-xs font-semibold"
                style={{
                  gridTemplateColumns: "1fr 90px 100px 110px 110px 80px 60px",
                  color: "var(--text-tertiary)",
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                <span>Bien</span>
                <span className="text-center">Occupation</span>
                <span className="text-right">Brut</span>
                <span className="text-right">Notre CA</span>
                <span className="text-right">Reversement</span>
                <span className="text-right">RevPAR</span>
                <span className="text-right">Rés.</span>
              </div>

              <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {properties.map(p => {
                  const occColor = occupancyColor(p.occupancyPct);
                  return (
                    <Link
                      key={p.propertyId}
                      href={`/properties/${p.propertyId}`}
                      className="grid items-center px-5 py-4 hover:bg-[var(--bg)] transition-colors"
                      style={{ gridTemplateColumns: "1fr 90px 100px 110px 110px 80px 60px" }}
                    >
                      <span className="font-semibold truncate pr-4" style={{ color: "var(--text-primary)" }}>
                        {p.name}
                      </span>

                      {/* Occupation avec barre */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: occColor }}>
                          {p.occupancyPct}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.occupancyPct}%`, background: occColor }}
                          />
                        </div>
                      </div>

                      <span className="text-right text-sm font-medium" style={{ color: "#2563eb" }}>
                        {p.gross > 0 ? fmt(p.gross) : "—"}
                      </span>
                      <span className="text-right text-sm font-bold" style={{ color: "#059669" }}>
                        {p.commission > 0 ? fmt(p.commission) : "—"}
                      </span>
                      <span className="text-right text-sm font-medium" style={{ color: "#d97706" }}>
                        {p.ownerPayout > 0 ? fmt(p.ownerPayout) : "—"}
                      </span>
                      <span className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {p.revpar > 0 ? fmtSmall(p.revpar) : "—"}
                      </span>
                      <span className="text-right text-sm" style={{ color: "var(--text-tertiary)" }}>
                        {p.bookings}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Total row */}
              {properties.length > 1 && (() => {
                const t = properties.reduce((acc, p) => ({
                  gross: acc.gross + p.gross,
                  commission: acc.commission + p.commission,
                  ownerPayout: acc.ownerPayout + p.ownerPayout,
                  bookings: acc.bookings + p.bookings,
                }), { gross: 0, commission: 0, ownerPayout: 0, bookings: 0 });
                return (
                  <div
                    className="grid items-center px-5 py-3.5 text-sm font-bold border-t"
                    style={{
                      gridTemplateColumns: "1fr 90px 100px 110px 110px 80px 60px",
                      borderColor: "var(--border)",
                      background: "var(--bg)",
                    }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>Total</span>
                    <span />
                    <span className="text-right" style={{ color: "#2563eb" }}>{fmt(t.gross)}</span>
                    <span className="text-right" style={{ color: "#059669" }}>{fmt(t.commission)}</span>
                    <span className="text-right" style={{ color: "#d97706" }}>{fmt(t.ownerPayout)}</span>
                    <span />
                    <span className="text-right" style={{ color: "var(--text-secondary)" }}>{t.bookings}</span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 3 — Réservations par plateforme               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnalyticsSection label="PAR PLATEFORME" sub="12 derniers mois">
        {sources.length === 0 ? (
          <div className="card px-6 py-10 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
            Aucune réservation
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Donut chart */}
            <div className="card p-5">
              <PlatformDonutChart data={sources} />
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div
                className="grid px-4 py-2.5 text-xs font-semibold"
                style={{
                  gridTemplateColumns: "1fr 50px 60px 110px",
                  color: "var(--text-tertiary)",
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                <span>Plateforme</span>
                <span className="text-right">Rés.</span>
                <span className="text-right">%</span>
                <span className="text-right">Revenus</span>
              </div>
              {(() => {
                const total = sources.reduce((s, d) => s + d.count, 0);
                return (
                  <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                    {sources.map(s => {
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                      return (
                        <div
                          key={s.source}
                          className="grid items-center px-4 py-3 text-sm"
                          style={{ gridTemplateColumns: "1fr 50px 60px 110px" }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: PLATFORM_COLORS[s.source] ?? "#94a3b8" }}
                            />
                            <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                              {s.label}
                            </span>
                          </div>
                          <span className="text-right" style={{ color: "var(--text-secondary)" }}>{s.count}</span>
                          <span className="text-right font-semibold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
                          <span className="text-right font-semibold" style={{ color: "#2563eb" }}>
                            {s.revenue > 0 ? fmt(s.revenue) : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4 — Revenus mensuels 12 mois                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnalyticsSection label="REVENUS MENSUELS" sub="12 derniers mois · empilé commission + reversement">
        <div className="card p-5">
          <div className="flex items-center gap-5 mb-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span style={{ color: "var(--text-secondary)" }}>Notre CA</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-600" />
              <span style={{ color: "var(--text-secondary)" }}>Reversement propriétaires</span>
            </span>
            {(() => {
              const totalGross = monthlyBars.reduce((s, m) => s + m.gross, 0);
              const totalComm = monthlyBars.reduce((s, m) => s + m.commission, 0);
              return totalGross > 0 ? (
                <span className="ml-auto font-semibold" style={{ color: "var(--text-primary)" }}>
                  Brut total : {fmt(totalGross)}
                  <span className="ml-3 font-normal" style={{ color: "#059669" }}>
                    dont CA : {fmt(totalComm)}
                  </span>
                </span>
              ) : null;
            })()}
          </div>
          <MonthlyStackedChart data={monthlyBars} />
        </div>
      </AnalyticsSection>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 5 — Revenus à venir                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnalyticsSection label="REVENUS À VENIR" sub="réservations confirmées · check-in futur">
        <div className="card overflow-hidden">
          {future.byMonth.length === 0 ? (
            <p className="px-6 py-10 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
              Aucune réservation confirmée à venir
            </p>
          ) : (
            <>
              {/* Summary strip */}
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {future.byMonth.reduce((s, m) => s + m.bookings, 0)} réservations sur {future.byMonth.length} mois
                </p>
                <div className="flex items-center gap-5 text-sm">
                  <div className="text-right">
                    <span className="text-xs block" style={{ color: "var(--text-tertiary)" }}>Brut</span>
                    <span className="font-bold" style={{ color: "#2563eb" }}>{fmt(future.totalGross)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs block" style={{ color: "var(--text-tertiary)" }}>Notre CA</span>
                    <span className="font-bold" style={{ color: "#059669" }}>{fmt(future.totalCommission)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs block" style={{ color: "var(--text-tertiary)" }}>Reversement</span>
                    <span className="font-bold" style={{ color: "#d97706" }}>{fmt(future.totalNet)}</span>
                  </div>
                </div>
              </div>

              {/* Month groups */}
              {future.byMonth.map(month => (
                <div key={month.month} className="border-b last:border-b-0" style={{ borderColor: "var(--border-light)" }}>
                  {/* Month header */}
                  <div
                    className="flex items-center justify-between px-5 py-2.5"
                    style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}
                  >
                    <span className="text-xs font-bold capitalize" style={{ color: "var(--text-secondary)" }}>
                      {month.label}
                      <span className="font-normal ml-1.5" style={{ color: "var(--text-tertiary)" }}>
                        · {month.bookings} rés.
                      </span>
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: "#2563eb" }}>{fmt(month.gross)}</span>
                      <span className="font-bold" style={{ color: "#059669" }}>{fmt(month.commission)}</span>
                      <span style={{ color: "#d97706" }}>{fmt(month.net)}</span>
                    </div>
                  </div>

                  {/* Booking rows */}
                  <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                    {month.items.map(item => (
                      <Link
                        key={item.id}
                        href={`/bookings/${item.id}`}
                        className="grid items-center px-5 py-3 text-sm hover:bg-[var(--bg)] transition-colors"
                        style={{ gridTemplateColumns: "1fr 130px 50px 90px 100px 100px" }}
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {item.guestName ?? <span style={{ color: "var(--text-tertiary)" }}>Sans nom</span>}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                            {item.propertyName}
                          </p>
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {new Date(item.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          {" → "}
                          {new Date(item.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-xs text-right" style={{ color: "var(--text-tertiary)" }}>
                          {item.nights}n
                        </span>
                        <span className="text-right font-medium" style={{ color: "#2563eb" }}>
                          {item.gross > 0 ? fmt(item.gross) : "—"}
                        </span>
                        <span className="text-right font-bold" style={{ color: "#059669" }}>
                          {item.commission > 0 ? fmt(item.commission) : "—"}
                        </span>
                        <span className="text-right font-medium" style={{ color: "#d97706" }}>
                          {item.net > 0 ? fmt(item.net) : "—"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </AnalyticsSection>

    </div>
  );
}

/* ── Primitives ──────────────────────────────────────────────────────────────── */

function AnalyticsSection({ label, sub, children }: {
  label: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-bold tracking-widest" style={{ color: "var(--text-tertiary)" }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>· {sub}</p>}
      </div>
      {children}
    </div>
  );
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth == null) return null;
  const up = growth >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
      style={up
        ? { background: "#dcfce7", color: "#15803d" }
        : { background: "#fee2e2", color: "#b91c1c" }
      }
    >
      {up ? <IconArrowUpRight size={11} /> : <IconTrendingDown size={11} />}
      {up ? "+" : ""}{growth}%
    </span>
  );
}

function KpiCompareCard({
  label, current, previous, growth, accent, bg, highlight,
}: {
  label: string; current: string; previous: string; growth: number | null;
  accent: string; bg: string; highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: highlight ? bg : "var(--surface)",
        border: `1px solid ${highlight ? accent + "40" : "var(--border)"}`,
        boxShadow: highlight ? `0 4px 24px ${accent}15` : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: highlight ? accent : "var(--text-tertiary)" }}>
          {label}
        </p>
        <GrowthBadge growth={growth} />
      </div>
      <p className="text-3xl font-bold tracking-tight leading-none mb-2" style={{ color: highlight ? accent : "var(--text-primary)" }}>
        {current}
      </p>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {previous} le mois dernier
      </p>
    </div>
  );
}
