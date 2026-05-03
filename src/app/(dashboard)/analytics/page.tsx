import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getFinancialDashboard,
  getMonthlyByProperty,
  getFutureRevenue,
  getOccupancyData,
} from "@/lib/analytics";
import { IconSettings } from "@/components/ui/icons";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;
  const now = new Date();

  const [financial, monthly, future, occupancy] = await Promise.all([
    getFinancialDashboard(userId),
    getMonthlyByProperty(userId),
    getFutureRevenue(userId),
    getOccupancyData(userId, 1),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const currentMonthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const globalOccupancy = (() => {
    const month = occupancy.data[0];
    if (!month || occupancy.properties.length === 0) return null;
    const vals = occupancy.properties.map(p => month.values[p.id] ?? 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  })();

  const monthlyTotals = monthly.reduce(
    (acc, r) => ({ gross: acc.gross + r.gross, commission: acc.commission + r.commission, ownerPayout: acc.ownerPayout + r.ownerPayout }),
    { gross: 0, commission: 0, ownerPayout: 0 }
  );

  return (
    <div className="px-8 py-7 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Analytics
        </h1>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <IconSettings size={13} />
          Taux {Math.round(financial.commissionRate * 100)}%
        </Link>
      </div>

      {/* ── 4 KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <div className="card p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            Notre CA — {now.toLocaleDateString("fr-FR", { month: "long" })}
          </p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: "#d97706" }}>
            {fmt(financial.commissionThisMonth)}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
            sur {fmt(financial.collectedThisMonth)} brut
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>CA total (commissions)</p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: "#d97706" }}>
            {fmt(financial.totalCommissionAllTime)}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>depuis le début</p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
            À reverser — {now.toLocaleDateString("fr-FR", { month: "long" })}
          </p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {fmt(financial.netThisMonth)}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>aux propriétaires</p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Taux d'occupation</p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>
            {globalOccupancy != null ? `${globalOccupancy}%` : "—"}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
            {now.toLocaleDateString("fr-FR", { month: "long" })} · {occupancy.properties.length} bien{occupancy.properties.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Ce mois ── */}
      <div className="card mb-6">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-sm capitalize" style={{ color: "var(--text-primary)" }}>
            Ce mois · {currentMonthLabel}
          </h2>
        </div>

        {monthly.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
            Aucune réservation confirmée ce mois.
          </p>
        ) : (
          <>
            {/* Table header */}
            <div
              className="grid px-6 py-2.5 text-xs font-semibold"
              style={{
                gridTemplateColumns: "1fr 80px 110px 110px 110px",
                color: "var(--text-tertiary)",
                background: "var(--bg)",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span>Bien</span>
              <span className="text-right">Rés.</span>
              <span className="text-right">Brut</span>
              <span className="text-right">Notre comm.</span>
              <span className="text-right">Reversement</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {monthly.map(row => (
                <div
                  key={row.propertyId}
                  className="grid items-center px-6 py-3.5 text-sm"
                  style={{ gridTemplateColumns: "1fr 80px 110px 110px 110px" }}
                >
                  <span className="font-medium truncate pr-4" style={{ color: "var(--text-primary)" }}>
                    {row.name}
                  </span>
                  <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                    {row.bookings}
                  </span>
                  <span className="text-right font-medium" style={{ color: "var(--text-secondary)" }}>
                    {fmt(row.gross)}
                  </span>
                  <span className="text-right font-bold" style={{ color: "#d97706" }}>
                    {fmt(row.commission)}
                  </span>
                  <span className="text-right font-medium" style={{ color: "var(--text-primary)" }}>
                    {fmt(row.ownerPayout)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div
              className="grid items-center px-6 py-3.5 text-sm font-bold border-t"
              style={{
                gridTemplateColumns: "1fr 80px 110px 110px 110px",
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>Total</span>
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                {monthly.reduce((s, r) => s + r.bookings, 0)}
              </span>
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                {fmt(monthlyTotals.gross)}
              </span>
              <span className="text-right" style={{ color: "#d97706" }}>
                {fmt(monthlyTotals.commission)}
              </span>
              <span className="text-right" style={{ color: "var(--text-primary)" }}>
                {fmt(monthlyTotals.ownerPayout)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Revenus à venir ── */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Revenus à venir</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Réservations confirmées · check-in futur
            </p>
          </div>
          {future.byMonth.length > 0 && (
            <div className="flex items-center gap-5 text-sm shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Brut</p>
                <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>{fmt(future.totalGross)}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Notre CA</p>
                <p className="font-bold" style={{ color: "#d97706" }}>{fmt(future.totalCommission)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>À reverser</p>
                <p className="font-bold" style={{ color: "var(--brand)" }}>{fmt(future.totalNet)}</p>
              </div>
            </div>
          )}
        </div>

        {future.byMonth.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
            Aucune réservation confirmée à venir.
          </p>
        ) : (
          <div>
            {/* Table header */}
            <div
              className="grid px-6 py-2.5 text-xs font-semibold"
              style={{
                gridTemplateColumns: "140px 1fr 80px 80px 100px 100px 100px",
                color: "var(--text-tertiary)",
                background: "var(--bg)",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span>Mois</span>
              <span>Voyageur · Bien</span>
              <span className="text-right">Dates</span>
              <span className="text-right">Nuits</span>
              <span className="text-right">Brut</span>
              <span className="text-right">Notre CA</span>
              <span className="text-right">Reversement</span>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {future.byMonth.map(month =>
                month.items.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/bookings/${item.id}`}
                    className="grid items-center px-6 py-3 text-sm hover:bg-[var(--bg)] transition-colors"
                    style={{ gridTemplateColumns: "140px 1fr 80px 80px 100px 100px 100px" }}
                  >
                    {i === 0 ? (
                      <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-secondary)" }}>
                        {month.label}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0 pr-4">
                      <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.guestName ?? <span style={{ color: "var(--text-tertiary)" }}>Sans nom</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{item.propertyName}</p>
                    </div>
                    <span className="text-right text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(item.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.nights}n
                    </span>
                    <span className="text-right font-medium" style={{ color: "var(--text-secondary)" }}>
                      {item.gross > 0 ? fmt(item.gross) : "—"}
                    </span>
                    <span className="text-right font-bold" style={{ color: "#d97706" }}>
                      {item.commission > 0 ? fmt(item.commission) : "—"}
                    </span>
                    <span className="text-right font-medium" style={{ color: "var(--brand)" }}>
                      {item.net > 0 ? fmt(item.net) : "—"}
                    </span>
                  </Link>
                ))
              )}
            </div>

            {/* Total */}
            <div
              className="grid items-center px-6 py-3.5 text-sm font-bold border-t"
              style={{
                gridTemplateColumns: "140px 1fr 80px 80px 100px 100px 100px",
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>Total</span>
              <span />
              <span />
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                {future.byMonth.reduce((s, m) => s + m.bookings, 0)} rés.
              </span>
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>{fmt(future.totalGross)}</span>
              <span className="text-right" style={{ color: "#d97706" }}>{fmt(future.totalCommission)}</span>
              <span className="text-right" style={{ color: "var(--brand)" }}>{fmt(future.totalNet)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
