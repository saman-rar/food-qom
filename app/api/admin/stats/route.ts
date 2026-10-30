/**
 * Admin Stats API
 * GET: Get dashboard statistics
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { getTehranNow, startOfDay, endOfDay, subDays } from "@/lib/date-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const now = getTehranNow();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));

    const [
      totalUsers,
      activeUsers,
      totalReservations,
      todayReservations,
      totalWalletBalance,
      recentTransactions,
      recentTransfers,
      pendingPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.reservation.count(),
      prisma.reservation.count({
        where: {
          menuItem: { date: { gte: today, lte: endOfDay(now) } },
          status: { in: ["CONFIRMED", "TRANSFERRED"] },
        },
      }),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.walletTransaction.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, fullName: true } } },
      }),
      prisma.transfer.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, username: true, fullName: true } },
          recipient: { select: { id: true, username: true, fullName: true } },
          reservation: { include: { menuItem: { include: { food: true } } } },
        },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

    // Today's meal statistics
    const todayMealStats = await prisma.reservation.groupBy({
      by: ["menuItemId"],
      where: {
        menuItem: { date: { gte: today, lte: endOfDay(now) } },
        status: { in: ["CONFIRMED", "TRANSFERRED"] },
      },
      _count: { id: true },
    });

    // Get meal period breakdown
    const mealPeriodStats = await prisma.menuItem.findMany({
      where: { date: { gte: today, lte: endOfDay(now) } },
      include: {
        _count: { select: { reservations: true } },
      },
    });

    const mealBreakdown = mealPeriodStats.reduce((acc, item) => {
      const period = item.mealPeriod;
      if (!acc[period]) {
        acc[period] = { available: 0, reserved: 0 };
      }
      acc[period].available += 1;
      acc[period].reserved += item._count.reservations;
      return acc;
    }, {} as Record<string, { available: number; reserved: number }>);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalReservations,
      todayReservations,
      totalWalletBalance: totalWalletBalance._sum.balance || 0,
      pendingPayments,
      recentTransactions,
      recentTransfers,
      mealBreakdown,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت آمار" },
      { status: 500 }
    );
  }
}