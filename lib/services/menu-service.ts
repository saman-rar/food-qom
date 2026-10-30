/**
 * Menu Service
 * Core business logic for weekly menu management
 */

import { prisma } from "@/lib/prisma";
import { 
  getWeekStart, 
  getWeekEnd, 
  getServiceDaysForWeek,
  getTehranNow,
  addDays,
  startOfDay,
  endOfDay
} from "@/lib/date-utils";
import { MEAL_PERIODS, MEAL_PERIOD_ORDER } from "@/lib/constants";

/**
 * Get weekly menu for a given week start date
 */
export async function getWeeklyMenu(weekStart: Date) {
  const weekEnd = getWeekEnd(weekStart);
  const serviceDays = getServiceDaysForWeek(weekStart);

  const menuItems = await prisma.menuItem.findMany({
    where: {
      date: {
        gte: startOfDay(weekStart),
        lte: endOfDay(weekEnd),
      },
    },
    include: {
      food: true,
      _count: {
        select: { reservations: true },
      },
    },
    orderBy: [
      { date: "asc" },
      { mealPeriod: "asc" },
    ],
  });

  // Group by date and meal period
  const menuByDay: Record<string, Record<string, any[]>> = {};
  
  serviceDays.forEach((day) => {
    const dateKey = day.toISOString().split("T")[0];
    menuByDay[dateKey] = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
    };
  });

  menuItems.forEach((item) => {
    const dateKey = item.date.toISOString().split("T")[0];
    if (menuByDay[dateKey] && menuByDay[dateKey][item.mealPeriod]) {
      menuByDay[dateKey][item.mealPeriod].push({
        ...item,
        reservationCount: item._count.reservations,
      });
    }
  });

  return {
    weekStart,
    weekEnd,
    serviceDays,
    menuByDay,
  };
}

/**
 * Get current and next week menus
 */
export async function getCurrentAndNextWeekMenus() {
  const { current, next } = await import("@/lib/date-utils").then(m => m.getCurrentAndNextWeek());
  
  const [currentWeek, nextWeek] = await Promise.all([
    getWeeklyMenu(current),
    getWeeklyMenu(next),
  ]);

  return { currentWeek, nextWeek };
}

/**
 * Get menu for a specific date
 */
export async function getMenuForDate(date: Date) {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
    include: {
      food: true,
      _count: {
        select: { reservations: true },
      },
    },
    orderBy: { mealPeriod: "asc" },
  });

  return MEAL_PERIOD_ORDER.map((period) => ({
    mealPeriod: period,
    mealPeriodLabel: period === "BREAKFAST" ? "صبحانه" : period === "LUNCH" ? "ناهار" : "شام",
    items: menuItems
      .filter((item) => item.mealPeriod === period)
      .map((item) => ({
        ...item,
        reservationCount: item._count.reservations,
      })),
  }));
}

/**
 * Create or update menu item
 */
export async function upsertMenuItem(data: {
  foodId: string;
  date: Date;
  mealPeriod: string;
  isAvailable?: boolean;
}) {
  const existing = await prisma.menuItem.findUnique({
    where: {
      foodId_date_mealPeriod: {
        foodId: data.foodId,
        date: data.date,
        mealPeriod: data.mealPeriod,
      },
    },
  });

  if (existing) {
    return prisma.menuItem.update({
      where: { id: existing.id },
      data: { isAvailable: data.isAvailable ?? true },
      include: { food: true },
    });
  }

  return prisma.menuItem.create({
    data: {
      foodId: data.foodId,
      date: data.date,
      mealPeriod: data.mealPeriod,
      isAvailable: data.isAvailable ?? true,
    },
    include: { food: true },
  });
}

/**
 * Delete menu item
 */
export async function deleteMenuItem(foodId: string, date: Date, mealPeriod: string) {
  // Check if there are any reservations
  const reservationCount = await prisma.reservation.count({
    where: {
      menuItem: {
        foodId,
        date,
        mealPeriod,
      },
    },
  });

  if (reservationCount > 0) {
    throw new Error("نمی‌توان آیتم منو را حذف کرد زیرا رزروی برای آن وجود دارد");
  }

  return prisma.menuItem.delete({
    where: {
      foodId_date_mealPeriod: {
        foodId,
        date,
        mealPeriod,
      },
    },
  });
}

/**
 * Bulk create menu for a week
 */
export async function createWeeklyMenu(
  weekStart: Date,
  items: Array<{
    foodId: string;
    dayOffset: number; // 0 = Saturday, 1 = Sunday, etc.
    mealPeriod: string;
    isAvailable?: boolean;
  }>
) {
  const serviceDays = getServiceDaysForWeek(weekStart);
  
  return await prisma.$transaction(async (tx) => {
    const results = [];
    
    for (const item of items) {
      if (item.dayOffset < 0 || item.dayOffset >= serviceDays.length) {
        continue; // Skip invalid days
      }
      
      const date = serviceDays[item.dayOffset];
      
      const result = await tx.menuItem.upsert({
        where: {
          foodId_date_mealPeriod: {
            foodId: item.foodId,
            date,
            mealPeriod: item.mealPeriod,
          },
        },
        update: { isAvailable: item.isAvailable ?? true },
        create: {
          foodId: item.foodId,
          date,
          mealPeriod: item.mealPeriod,
          isAvailable: item.isAvailable ?? true,
        },
        include: { food: true },
      });
      
      results.push(result);
    }
    
    return results;
  });
}

/**
 * Get available foods for menu management
 */
export async function getAvailableFoods() {
  return prisma.food.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get menu statistics for a week
 */
export async function getWeeklyMenuStats(weekStart: Date) {
  const weekEnd = getWeekEnd(weekStart);
  
  const stats = await prisma.menuItem.groupBy({
    by: ["mealPeriod"],
    where: {
      date: {
        gte: startOfDay(weekStart),
        lte: endOfDay(weekEnd),
      },
    },
    _count: { id: true },
  });

  const totalReservations = await prisma.reservation.count({
    where: {
      menuItem: {
        date: {
          gte: startOfDay(weekStart),
          lte: endOfDay(weekEnd),
        },
      },
      status: { in: ["CONFIRMED", "TRANSFERRED"] },
    },
  });

  return {
    mealPeriodStats: stats.map((s) => ({
      mealPeriod: s.mealPeriod,
      count: s._count.id,
    })),
    totalReservations,
  };
}