import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTodayActivity,
  getFinancialDashboard,
  get30DayForecast,
  getOccupancyData,
  getFutureRevenue,
} from "@/lib/analytics";
import { getAlertCounts } from "@/lib/alerts";
import { WeeklyForecastChart } from "@/components/features/analytics/WeeklyForecastChart";
import {
  IconAlertTriangle, IconSync, IconPlus, IconChevronRight,
} from "@/components/ui/icons";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;
  const now = new Date();

  const [alerts, today, financial, forecast, occupancy, future] = await Promise.all([
    getAlertCounts(userId),
    getTodayActivity(userId),
    getFinancialDashboard(userId),
    get30DayForecast(userId),
    getOccupancyData(userId, 1),
    getFutureRevenue(userId),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = session.user.name?.split(" ")[0] ?? "vous";

  const globalOccupancy = (() => {
    const month = occupancy.data[0];
    if (!month || occupancy.properties.length === 0) return null;
    const vals = occupancy.properties.map(p => month.values[p.id] ?? 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  })();

  const occupancyColor = (pct: number) =>
    pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="px-6 py-7 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm capitalize" style={{ color: "var(--text-tertiary)" }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analytics" className="btn btn-secondary btn-sm hidden sm:flex">
            Analytics
          </Link>
          <Link
            href="/bookings/new"
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--brand)", boxShadow: "0 4px 14px rgb(99 102 241 / 0.3)" }}
          >
            <IconPlus size={15} />
            Nouvelle réservation
          </Link>
        </div>
      </div>

      {/* ── Alertes ── */}
      {(alerts.conflicts > 0 || alerts.syncErrors > 0) && (
        <div className="space-y-2">
          {alerts.conflicts > 0 && (
            <Link
              href="/bookings/conflicts"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:opacity-90"
              style={{ background: "#fff7f7", borderColor: "#fecaca" }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fee2e2", color: "#dc2626" }}>
                <IconAlertTriangle size={14} />
              </span>
              <p className="text-sm font-semibold flex-1" style={{ color: "#991b1b" }}>
                {alerts.conflicts} conflit{alerts.conflicts > 1 ? "s" : ""} de réservation à résoudre
              </p>
              <IconChevronRight size={14} style={{ color: "#dc2626" } as React.CSSProperties} />
            </Link>
          )}
          {alerts.syncErrors > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef3c7", color: "#d97706" }}>
                <IconSync size={14} />
              </span>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                {alerts.syncErrors} erreur{alerts.syncErrors > 1 ? "s" : ""} de synchronisation
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BLOC 1 — AUJOURD'HUI                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Section
        label="AUJOURD'HUI"
        badge={today.arrivals.length + today.departures.length > 0
          ? `${today.arrivals.length + today.departures.length} événement${today.arrivals.length + today.departures.length > 1 ? "s" : ""}`
          : undefined}
        badgeColor={today.arrivals.length + today.departures.length > 0 ? "#2563eb" : undefined}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Arrivées */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#2563eb", color: "#fff" }}>
                {today.arrivals.length}
              </span>
              <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>Arrivées</span>
            </div>
            {today.arrivals.length === 0 ? (
              <p className="px-4 py-5 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>Aucune arrivée aujourd'hui</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {today.arrivals.map(a => (
                  <Link key={a.id} href={`/bookings/${a.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {a.guestName ?? <span style={{ color: "var(--text-tertiary)" }}>Voyageur inconnu</span>}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{a.propertyName}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-3" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                      {a.nights} nuit{a.nights > 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Départs + ménages */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
            >
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#059669", color: "#fff" }}>
                {today.departures.length}
              </span>
              <span className="text-sm font-semibold" style={{ color: "#065f46" }}>Départs · Ménages</span>
            </div>
            {today.departures.length === 0 ? (
              <p className="px-4 py-5 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>Aucun départ aujourd'hui</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {today.departures.map(d => (
                  <Link key={d.id} href={`/bookings/${d.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {d.guestName ?? <span style={{ color: "var(--text-tertiary)" }}>Voyageur inconnu</span>}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{d.propertyName}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-3" style={{ background: "#d1fae5", color: "#065f46" }}>
                      🧹 Ménage
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BLOC 2 — ARGENT                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Section label="ARGENT" sub={now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MoneyCard
            label="Revenus bruts ce mois"
            value={fmt(financial.collectedThisMonth)}
            sub={`${financial.pendingCount} en attente`}
            accent="#2563eb"
            bg="#eff6ff"
          />
          <MoneyCard
            label="Notre CA ce mois"
            value={fmt(financial.commissionThisMonth)}
            sub={`${Math.round(financial.commissionRate * 100)}% de commission`}
            accent="#059669"
            bg="#f0fdf4"
            highlight
          />
          <MoneyCard
            label="À reverser ce mois"
            value={fmt(financial.netThisMonth)}
            sub="aux propriétaires"
            accent="#d97706"
            bg="#fffbeb"
          />
          <MoneyCard
            label="CA total cumulé"
            value={fmt(financial.totalCommissionAllTime)}
            sub="depuis le début"
            accent="#6366f1"
            bg="#eef2ff"
          />
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BLOC 3 — PRÉVISIONNEL 30 JOURS                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Section label="PRÉVISIONNEL" sub="30 prochains jours — réservations confirmées">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Chiffres */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Revenus bruts</p>
              <p className="text-3xl font-bold tracking-tight" style={{ color: "#2563eb" }}>
                {fmt(forecast.gross)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                {forecast.bookings} rés. à venir
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Notre CA</p>
              <p className="text-3xl font-bold tracking-tight" style={{ color: "#059669" }}>
                {fmt(forecast.commission)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                commissions attendues
              </p>
            </div>
            <div className="card p-4 col-span-2">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>À reverser aux propriétaires</p>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "#d97706" }}>
                {fmt(forecast.net)}
              </p>
            </div>
          </div>

          {/* Graphique semaines */}
          <div className="card p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-tertiary)" }}>
              Répartition par semaine
              <span className="ml-2 font-normal">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" />brut
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-2 mr-1" />CA
              </span>
            </p>
            <WeeklyForecastChart data={forecast.byWeek} />
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BLOC 4 — TAUX D'OCCUPATION                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Section
        label="TAUX D'OCCUPATION"
        sub={`${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · ${occupancy.properties.length} bien${occupancy.properties.length > 1 ? "s" : ""}`}
      >
        <div className="card p-5">
          {occupancy.properties.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-tertiary)" }}>
              Aucun bien actif
            </p>
          ) : (
            <>
              {/* Global */}
              {globalOccupancy != null && (
                <div className="flex items-center gap-5 mb-5 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Taux global</p>
                    <p className="text-5xl font-bold tracking-tight" style={{ color: occupancyColor(globalOccupancy) }}>
                      {globalOccupancy}%
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${globalOccupancy}%`, background: occupancyColor(globalOccupancy) }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <span style={{ color: "#dc2626" }}>0%</span>
                      <span style={{ color: "#d97706" }}>40%</span>
                      <span style={{ color: "#059669" }}>70%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Par bien */}
              <div className="space-y-3">
                {occupancy.properties.map(prop => {
                  const pct = occupancy.data[0]?.values[prop.id] ?? 0;
                  const color = occupancyColor(pct);
                  return (
                    <div key={prop.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate max-w-[60%]" style={{ color: "var(--text-primary)" }}>
                          {prop.name}
                        </span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color + "cc" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Légende couleurs */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs" style={{ borderColor: "var(--border-light)", color: "var(--text-tertiary)" }}>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />&lt; 40%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />40–70%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />&gt; 70%</span>
              </div>
            </>
          )}
        </div>
      </Section>

    </div>
  );
}

/* ── Primitives ──────────────────────────────────────────────────────────────── */

function Section({
  label, sub, badge, badgeColor, children,
}: {
  label: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-bold tracking-widest" style={{ color: "var(--text-tertiary)" }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>· {sub}</p>}
        {badge && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full ml-auto"
            style={{ background: (badgeColor ?? "#6366f1") + "18", color: badgeColor ?? "#6366f1" }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MoneyCard({
  label, value, sub, accent, bg, highlight,
}: {
  label: string; value: string; sub: string;
  accent: string; bg: string; highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: highlight ? bg : "var(--surface)",
        border: `1px solid ${highlight ? accent + "33" : "var(--border)"}`,
        boxShadow: highlight ? `0 4px 20px ${accent}18` : undefined,
      }}
    >
      <p className="text-xs font-medium mb-3" style={{ color: highlight ? accent : "var(--text-tertiary)" }}>
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-bold tracking-tight leading-none"
        style={{ color: highlight ? accent : "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-2" style={{ color: highlight ? accent + "aa" : "var(--text-tertiary)" }}>
        {sub}
      </p>
    </div>
  );
}
