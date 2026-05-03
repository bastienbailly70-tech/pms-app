import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAlertCounts } from "@/lib/alerts";
import { getFutureRevenue } from "@/lib/analytics";
import {
  IconBuilding, IconCalendar, IconCalendarCheck, IconUsers,
  IconAlertTriangle, IconSync, IconArrowUpRight, IconPlus, IconChevronRight,
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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [propertyCount, alerts, recentBookings, monthRevenue, lastMonthRevenue, future] = await Promise.all([
    prisma.property.count({ where: { ownerId: session.user.id } }),
    getAlertCounts(session.user.id),
    prisma.booking.findMany({
      where: { property: { ownerId: session.user.id } },
      include: {
        property: { select: { name: true } },
        guest: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: session.user.id },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkIn: { gte: startOfMonth },
        totalAmount: { not: null },
      },
      select: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: session.user.id },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkIn: { gte: startOfLastMonth, lte: endOfLastMonth },
        totalAmount: { not: null },
      },
      select: { totalAmount: true },
    }),
    getFutureRevenue(session.user.id),
  ]);

  const currentMonthRevenue = monthRevenue.reduce((s, b) => s + Number(b.totalAmount), 0);
  const previousMonthRevenue = lastMonthRevenue.reduce((s, b) => s + Number(b.totalAmount), 0);
  const revenueGrowth = previousMonthRevenue > 0
    ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
    : null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const todayLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const STATUS_PILL: Record<string, string> = {
    CONFIRMED: "pill-green", PENDING: "pill-yellow",
    CANCELLED: "pill-gray", COMPLETED: "pill-blue", CONFLICT: "pill-red",
  };
  const STATUS_LABEL: Record<string, string> = {
    CONFIRMED: "Confirmée", PENDING: "En attente",
    CANCELLED: "Annulée", COMPLETED: "Terminée", CONFLICT: "Conflit",
  };

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {greeting}, {session.user.name?.split(" ")[0] ?? "vous"} 👋
          </h1>
          <p className="mt-1 capitalize" style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {todayLabel}
          </p>
        </div>
        <Link
          href="/bookings/new"
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--brand)",
            boxShadow: "0 4px 12px rgb(99 102 241 / 0.25)",
          }}
        >
          <IconPlus size={15} />
          Nouvelle réservation
        </Link>
      </div>

      {/* ── Alert banners ─────────────────────────────────────────────── */}
      {alerts.conflicts > 0 && (
        <Link
          href="/bookings/conflicts"
          className="flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl border transition-all hover:opacity-90 animate-fade-in"
          style={{
            background: "#fff7f7",
            borderColor: "#fecaca",
          }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#fee2e2", color: "#dc2626" }}
          >
            <IconAlertTriangle size={18} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
              {alerts.conflicts} conflit{alerts.conflicts > 1 ? "s" : ""} de réservation à résoudre
            </p>
            <p className="text-xs" style={{ color: "#b91c1c" }}>
              Des dates se chevauchent sur un ou plusieurs de vos biens.
            </p>
          </div>
          <span style={{ color: "#dc2626" }}><IconChevronRight size={16} /></span>
        </Link>
      )}
      {alerts.syncErrors > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl border animate-fade-in"
          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#fef3c7", color: "#d97706" }}
          >
            <IconSync size={18} />
          </span>
          <p className="text-sm" style={{ color: "#92400e" }}>
            <span className="font-semibold">{alerts.syncErrors} erreur{alerts.syncErrors > 1 ? "s" : ""} de synchronisation</span>
            {" "}dans la dernière heure.
          </p>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Biens actifs"
          value={String(propertyCount)}
          icon={<IconBuilding size={20} />}
          iconBg="#eef2ff" iconColor="#6366f1"
          href="/properties"
          delay="stagger-1"
        />
        <KpiCard
          label="Revenus ce mois"
          value={fmt(currentMonthRevenue)}
          icon={<IconArrowUpRight size={20} />}
          iconBg="#f0fdf4" iconColor="#059669"
          trend={revenueGrowth}
          delay="stagger-2"
        />
        <KpiCard
          label="Check-ins aujourd'hui"
          value={String(alerts.checkInsToday)}
          icon={<IconCalendarCheck size={20} />}
          iconBg="#eff6ff" iconColor="#2563eb"
          highlight={alerts.checkInsToday > 0}
          href="/bookings"
          delay="stagger-3"
        />
        <KpiCard
          label="Check-outs aujourd'hui"
          value={String(alerts.checkOutsToday)}
          icon={<IconUsers size={20} />}
          iconBg="#fdf4ff" iconColor="#9333ea"
          highlight={alerts.checkOutsToday > 0}
          href="/bookings"
          delay="stagger-4"
        />
      </div>

      {/* ── Revenus à venir ───────────────────────────────────────────── */}
      {future.byMonth.length > 0 && (
        <div
          className="card mb-6 animate-fade-in"
          style={{ animationDelay: "0.08s" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "#eef2ff", color: "#6366f1" }}
              >
                <IconArrowUpRight size={16} />
              </span>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Revenus à venir
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {future.byMonth.reduce((s, m) => s + m.bookings, 0)} réservations confirmées futures
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex items-center gap-5 text-sm">
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Brut</p>
                  <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>{fmt(future.totalGross)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Commission</p>
                  <p className="font-semibold" style={{ color: "#d97706" }}>−{fmt(future.totalCommission)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Net attendu</p>
                  <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>{fmt(future.totalNet)}</p>
                </div>
              </div>
              {/* Mobile: just net */}
              <div className="sm:hidden text-right">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Net attendu</p>
                <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>{fmt(future.totalNet)}</p>
              </div>
              <Link
                href="/analytics"
                className="btn btn-secondary btn-sm"
                style={{ whiteSpace: "nowrap" }}
              >
                Voir détail
              </Link>
            </div>
          </div>

          {/* Month summary rows */}
          <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
            {future.byMonth.map(month => (
              <div
                key={month.month}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
                  >
                    {month.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {month.bookings} rés.
                  </span>
                </div>
                <div className="flex items-center gap-5 text-xs">
                  <span className="hidden sm:block" style={{ color: "var(--text-secondary)" }}>
                    brut <span className="font-medium">{fmt(month.gross)}</span>
                  </span>
                  <span style={{ color: "#d97706" }}>
                    comm. <span className="font-medium">−{fmt(month.commission)}</span>
                  </span>
                  <span className="font-bold" style={{ color: "#059669" }}>
                    {fmt(month.net)} net
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent bookings */}
        <div className="lg:col-span-2 card animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Réservations récentes</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>5 dernières entrées</p>
            </div>
            <Link
              href="/bookings"
              className="text-xs font-medium flex items-center gap-1 transition-colors hover:opacity-70"
              style={{ color: "var(--brand)" }}
            >
              Voir tout <IconChevronRight size={13} />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "var(--bg)" }}
              >
                <IconCalendar size={24} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucune réservation</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Connectez vos plateformes OTA pour démarrer.
              </p>
              <Link
                href="/properties"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ background: "var(--brand-light)", color: "var(--brand)" }}
              >
                <IconBuilding size={13} /> Gérer les biens
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {recentBookings.map((b, i) => (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center gap-4 px-6 py-4 table-row group"
                  style={{ animationDelay: `${0.12 + i * 0.04}s` }}
                >
                  {/* Source dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: SOURCE_COLORS[b.source] ?? "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {b.guest?.name ?? "Voyageur inconnu"}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {b.property.name} · {SOURCE_LABELS[b.source] ?? b.source}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {new Date(b.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(b.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                    <span className={`pill mt-1 ${STATUS_PILL[b.status] ?? "pill-gray"}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="card animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="px-5 pt-5 pb-3">
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Actions rapides</h2>
            </div>
            <div className="px-3 pb-4 space-y-1">
              {[
                { href: "/bookings/new", icon: <IconPlus size={15} />, label: "Nouvelle réservation", color: "#6366f1" },
                { href: "/properties/new", icon: <IconBuilding size={15} />, label: "Ajouter un bien", color: "#0284c7" },
                { href: "/analytics", icon: <IconArrowUpRight size={15} />, label: "Voir les analytics", color: "#059669" },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:translate-x-0.5 hover:bg-[var(--bg)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: a.color + "18", color: a.color }}
                  >
                    {a.icon}
                  </span>
                  {a.label}
                  <IconChevronRight size={13} className="ml-auto opacity-40" />
                </Link>
              ))}
            </div>
          </div>

          {/* Today overview */}
          <div className="card animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="px-5 pt-5 pb-2">
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Aujourd'hui</h2>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <TodayStat
                label="Check-ins"
                value={alerts.checkInsToday}
                color="#2563eb"
                bg="#eff6ff"
              />
              <TodayStat
                label="Check-outs"
                value={alerts.checkOutsToday}
                color="#9333ea"
                bg="#fdf4ff"
              />
              {alerts.conflicts > 0 && (
                <Link href="/bookings/conflicts">
                  <TodayStat
                    label="Conflits à résoudre"
                    value={alerts.conflicts}
                    color="#dc2626"
                    bg="#fef2f2"
                    link
                  />
                </Link>
              )}
            </div>
          </div>

          {/* Quick start — only if no properties */}
          {propertyCount === 0 && (
            <div
              className="card animate-fade-in p-5"
              style={{
                animationDelay: "0.25s",
                background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
                borderColor: "#c7d2fe",
              }}
            >
              <p className="font-semibold text-sm mb-3" style={{ color: "#4338ca" }}>
                Démarrage rapide
              </p>
              <ol className="space-y-2 text-xs" style={{ color: "#4338ca" }}>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white font-bold flex items-center justify-center shrink-0 text-indigo-600 text-xs">1</span>
                  <Link href="/properties/new" className="hover:underline font-medium">Créez votre premier bien</Link>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white font-bold flex items-center justify-center shrink-0 text-indigo-600 text-xs">2</span>
                  <span>Configurez vos disponibilités et tarifs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white font-bold flex items-center justify-center shrink-0 text-indigo-600 text-xs">3</span>
                  <span>Connectez vos plateformes OTA</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon, iconBg, iconColor, trend, highlight, href, delay,
}: {
  label: string; value: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  trend?: number | null; highlight?: boolean; href?: string; delay?: string;
}) {
  const content = (
    <div
      className={`card card-hover p-5 animate-slide-up${delay ? " " + delay : ""}`}
      style={highlight ? { borderColor: "#c7d2fe" } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        {trend != null && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={trend >= 0
              ? { background: "#dcfce7", color: "#15803d" }
              : { background: "#fee2e2", color: "#b91c1c" }
            }
          >
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function TodayStat({
  label, value, color, bg, link,
}: {
  label: string; value: number; color: string; bg: string; link?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: value > 0 ? bg : "var(--bg)" }}
    >
      <span className="text-sm" style={{ color: value > 0 ? color : "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="font-bold text-sm" style={{ color: value > 0 ? color : "var(--text-tertiary)" }}>
          {value}
        </span>
        {link && value > 0 && <IconChevronRight size={13} style={{ color } as React.CSSProperties} />}
      </div>
    </div>
  );
}
