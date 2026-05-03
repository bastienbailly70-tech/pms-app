import { prisma } from "@/lib/prisma";

export type AlertCounts = {
  conflicts: number;
  syncErrors: number;
  checkInsToday: number;
  checkOutsToday: number;
};

export async function getAlertCounts(userId: string): Promise<AlertCounts> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [conflicts, syncErrors, checkInsToday, checkOutsToday] = await Promise.all([
    prisma.bookingConflict.count({
      where: {
        resolvedAt: null,
        booking: { property: { ownerId: userId } },
      },
    }),
    prisma.syncLog.count({
      where: {
        level: "error",
        createdAt: { gte: new Date(Date.now() - 3600_000) }, // last 1h
        connection: { property: { ownerId: userId } },
      },
    }),
    prisma.booking.count({
      where: {
        property: { ownerId: userId },
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.booking.count({
      where: {
        property: { ownerId: userId },
        status: { in: ["CONFIRMED", "PENDING"] },
        checkOut: { gte: todayStart, lt: todayEnd },
      },
    }),
  ]);

  return { conflicts, syncErrors, checkInsToday, checkOutsToday };
}
