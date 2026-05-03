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
