import { prisma } from "@/lib/prisma";
import { BookingStatus, PropertyStatus } from "@/generated/prisma/enums";

const ACTIVE_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

export type MonthlyRevenuePoint = {
  month: string;
  label: string;
  current: number;
  previous: number;
};

export type OccupancyRow = {
  label: string;
  values: Record<string, number>;
};

export type OccupancyData = {
  data: OccupancyRow[];
  properties: Array<{ id: string; name: string }>;
};

export type SourcePoint = {
  source: string;
  label: string;
  count: number;
  revenue: number;
};

export type AnalyticsSummary = {
  revenueThisYear: number;
  revenueLastYear: number;
  revenueGrowth: number | null;
  bookingsThisYear: number;
  bookingsLastYear: number;
  bookingsGrowth: number | null;
};

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  VRBO: "Vrbo",
  EXPEDIA: "Expedia",
  GOOGLE_VR: "Google VR",
  MANUAL: "Manuel",
  OTHER: "Autre",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export async function getMonthlyRevenue(userId: string, months = 12): Promise<MonthlyRevenuePoint[]> {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const previousStart = new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), 1);

  const bookings = await prisma.booking.findMany({
    where: {
      property: { ownerId: userId },
      status: { in: ACTIVE_STATUSES },
      checkIn: { gte: previousStart },
      totalAmount: { not: null },
    },
    select: { checkIn: true, totalAmount: true },
  });

  const slots = new Map<string, MonthlyRevenuePoint>();
  for (let i = 0; i < months; i++) {
    const d = new Date(currentStart.getFullYear(), currentStart.getMonth() + i, 1);
    const key = monthKey(d);
    slots.set(key, { month: key, label: monthLabel(d), current: 0, previous: 0 });
  }

  for (const b of bookings) {
    const d = new Date(b.checkIn);
    const amount = Number(b.totalAmount);

    const curKey = monthKey(d);
    if (slots.has(curKey)) {
      slots.get(curKey)!.current += amount;
      continue;
    }
    // Map previous year booking to its N+1 comparison slot
    const nextYearKey = `${d.getFullYear() + 1}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (slots.has(nextYearKey)) {
      slots.get(nextYearKey)!.previous += amount;
    }
  }

  return Array.from(slots.values()).map(s => ({
    ...s,
    current: Math.round(s.current),
    previous: Math.round(s.previous),
  }));
}

export async function getOccupancyData(userId: string, months = 12): Promise<OccupancyData> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const [properties, bookings] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: userId, status: PropertyStatus.ACTIVE },
      select: { id: true, name: true },
      take: 6,
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: { in: ACTIVE_STATUSES },
        checkOut: { gte: start },
      },
      select: { propertyId: true, checkIn: true, checkOut: true },
    }),
  ]);

  const data: OccupancyRow[] = [];

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const values: Record<string, number> = {};

    for (const prop of properties) {
      const propBookings = bookings.filter(b => b.propertyId === prop.id);
      let occupied = 0;

      for (let day = 0; day < daysInMonth; day++) {
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day + 1);
        const isOccupied = propBookings.some(b => {
          const ci = new Date(b.checkIn);
          const co = new Date(b.checkOut);
          return ci <= date && date < co;
        });
        if (isOccupied) occupied++;
      }

      values[prop.id] = Math.round((occupied / daysInMonth) * 100);
    }

    data.push({ label: monthLabel(monthStart), values });
  }

  return { data, properties };
}

export async function getSourceDistribution(userId: string, months = 12): Promise<SourcePoint[]> {
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  const bookings = await prisma.booking.findMany({
    where: {
      property: { ownerId: userId },
      status: { in: ACTIVE_STATUSES },
      checkIn: { gte: start },
    },
    select: { source: true, totalAmount: true },
  });

  const map = new Map<string, { count: number; revenue: number }>();
  for (const b of bookings) {
    const entry = map.get(b.source) ?? { count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += b.totalAmount ? Number(b.totalAmount) : 0;
    map.set(b.source, entry);
  }

  return Array.from(map.entries())
    .map(([source, v]) => ({
      source,
      label: SOURCE_LABELS[source] ?? source,
      count: v.count,
      revenue: Math.round(v.revenue),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);

  const [thisYear, lastYear] = await Promise.all([
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: { in: ACTIVE_STATUSES },
        checkIn: { gte: startOfYear },
      },
      select: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: { in: ACTIVE_STATUSES },
        checkIn: { gte: startOfLastYear, lt: startOfYear },
      },
      select: { totalAmount: true },
    }),
  ]);

  const revenueThisYear = Math.round(
    thisYear.reduce((s, b) => s + (b.totalAmount ? Number(b.totalAmount) : 0), 0)
  );
  const revenueLastYear = Math.round(
    lastYear.reduce((s, b) => s + (b.totalAmount ? Number(b.totalAmount) : 0), 0)
  );

  return {
    revenueThisYear,
    revenueLastYear,
    revenueGrowth: revenueLastYear > 0
      ? Math.round(((revenueThisYear - revenueLastYear) / revenueLastYear) * 100)
      : null,
    bookingsThisYear: thisYear.length,
    bookingsLastYear: lastYear.length,
    bookingsGrowth: lastYear.length > 0
      ? Math.round(((thisYear.length - lastYear.length) / lastYear.length) * 100)
      : null,
  };
}

// ─── Future revenue ───────────────────────────────────────────────────────────

export type FutureBookingItem = {
  id: string;
  propertyName: string;
  guestName: string | null;
  checkIn: string;   // ISO date string
  checkOut: string;
  nights: number;
  gross: number;
  commission: number;
  net: number;
};

export type FutureRevenueMonth = {
  month: string;   // "2026-05"
  label: string;   // "Mai 2026"
  bookings: number;
  gross: number;
  commission: number;
  net: number;
  items: FutureBookingItem[];
};

export type FutureRevenue = {
  commissionRate: number;
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  byMonth: FutureRevenueMonth[];
};

export async function getFutureRevenue(userId: string): Promise<FutureRevenue> {
  const [dbUser, bookings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { commissionRate: true } }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: "CONFIRMED",
        checkIn: { gte: new Date() },
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
        property: { select: { name: true } },
        guest: { select: { name: true } },
      },
      orderBy: { checkIn: "asc" },
    }),
  ]);

  const rate = dbUser?.commissionRate ? Number(dbUser.commissionRate) : 0.15;

  const monthMap = new Map<string, FutureRevenueMonth>();

  for (const b of bookings) {
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    const key   = `${ci.getFullYear()}-${String(ci.getMonth() + 1).padStart(2, "0")}`;
    const label = ci.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const nights = Math.round((co.getTime() - ci.getTime()) / 86400000);
    const gross  = b.totalAmount ? Number(b.totalAmount) : 0;
    const comm   = Math.round(gross * rate * 100) / 100;
    const net    = Math.round((gross - comm) * 100) / 100;

    const slot = monthMap.get(key) ?? { month: key, label, bookings: 0, gross: 0, commission: 0, net: 0, items: [] };
    slot.bookings++;
    slot.gross      += gross;
    slot.commission += comm;
    slot.net        += net;
    slot.items.push({
      id: b.id,
      propertyName: b.property.name,
      guestName: b.guest?.name ?? null,
      checkIn:  ci.toISOString().slice(0, 10),
      checkOut: co.toISOString().slice(0, 10),
      nights,
      gross,
      commission: comm,
      net,
    });
    monthMap.set(key, slot);
  }

  const byMonth = Array.from(monthMap.values()).map(m => ({
    ...m,
    gross:      Math.round(m.gross),
    commission: Math.round(m.commission),
    net:        Math.round(m.net),
  }));

  return {
    commissionRate: rate,
    totalGross:      Math.round(byMonth.reduce((s, m) => s + m.gross, 0)),
    totalCommission: Math.round(byMonth.reduce((s, m) => s + m.commission, 0)),
    totalNet:        Math.round(byMonth.reduce((s, m) => s + m.net, 0)),
    byMonth,
  };
}

// ─── Financial dashboard ──────────────────────────────────────────────────────

export type FinancialDashboard = {
  commissionRate: number;
  collectedThisMonth: number;
  commissionThisMonth: number;
  netThisMonth: number;
  totalCommissionAllTime: number;
  totalNetAllTime: number;
  pendingPayment: number;
  pendingCount: number;
  revenueByProperty: Array<{ propertyId: string; name: string; revenue: number; net: number; bookings: number }>;
  revenueBySource: Array<{ source: string; label: string; revenue: number; net: number; bookings: number }>;
};

export async function getFinancialDashboard(userId: string): Promise<FinancialDashboard> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [dbUser, paid, unpaid, all] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { commissionRate: true } }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: { in: ACTIVE_STATUSES },
        isPaid: true,
        checkIn: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: "CONFIRMED",
        isPaid: false,
        totalAmount: { not: null },
      },
      select: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        property: { ownerId: userId },
        status: { in: ACTIVE_STATUSES },
        totalAmount: { not: null },
      },
      select: {
        totalAmount: true,
        source: true,
        propertyId: true,
        property: { select: { name: true } },
      },
    }),
  ]);

  const rate = dbUser?.commissionRate ? Number(dbUser.commissionRate) : 0.15;

  const calcNet = (gross: number) => Math.round((gross * (1 - rate)) * 100) / 100;

  const collectedThisMonth = Math.round(paid.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0));
  const commissionThisMonth = Math.round(collectedThisMonth * rate);
  const netThisMonth = collectedThisMonth - commissionThisMonth;

  const totalGrossAllTime = Math.round(all.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0));
  const totalCommissionAllTime = Math.round(totalGrossAllTime * rate);
  const totalNetAllTime = totalGrossAllTime - totalCommissionAllTime;

  const pendingPayment = Math.round(unpaid.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0));

  // By property
  const propMap = new Map<string, { name: string; revenue: number; bookings: number }>();
  for (const b of all) {
    const prev = propMap.get(b.propertyId) ?? { name: b.property.name, revenue: 0, bookings: 0 };
    prev.revenue += Number(b.totalAmount ?? 0);
    prev.bookings++;
    propMap.set(b.propertyId, prev);
  }
  const revenueByProperty = Array.from(propMap.entries())
    .map(([propertyId, v]) => ({
      propertyId, name: v.name, bookings: v.bookings,
      revenue: Math.round(v.revenue),
      net: calcNet(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // By source
  const srcMap = new Map<string, { revenue: number; bookings: number }>();
  for (const b of all) {
    const prev = srcMap.get(b.source) ?? { revenue: 0, bookings: 0 };
    prev.revenue += Number(b.totalAmount ?? 0);
    prev.bookings++;
    srcMap.set(b.source, prev);
  }
  const revenueBySource = Array.from(srcMap.entries())
    .map(([source, v]) => ({
      source, label: SOURCE_LABELS[source] ?? source, bookings: v.bookings,
      revenue: Math.round(v.revenue),
      net: calcNet(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    commissionRate: rate,
    collectedThisMonth,
    commissionThisMonth,
    netThisMonth,
    totalCommissionAllTime,
    totalNetAllTime,
    pendingPayment,
    pendingCount: unpaid.length,
    revenueByProperty,
    revenueBySource,
  };
}
