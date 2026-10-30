/**
 * Reservation Service
 * Core business logic for meal reservations
 */

import { prisma } from "@/lib/prisma";
import { 
  getReservationDeadline, 
  isReservationOpen, 
  getReservationStatus,
  getTehranNow,
  getWeekStart,
  getServiceDaysForWeek,
  addDays,
  startOfDay,
  endOfDay
} from "@/lib/date-utils";
import { 
  MEAL_PERIODS, 
  RESERVATION_STATUS, 
  TRANSACTION_TYPES,
  MAX_TRANSFERS_PER_MONTH
} from "@/lib/constants";
import { formatRial } from "@/lib/currency";

/**
 * Get available meals for a date range
 */
export async function getAvailableMeals(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      date: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      isAvailable: true,
      food: {
        isActive: true,
      },
    },
    include: {
      food: true,
      reservations: {
        where: { userId },
        select: { id: true, status: true },
      },
    },
    orderBy: [
      { date: "asc" },
      { mealPeriod: "asc" },
    ],
  });

  const now = getTehranNow();
  const userReservations = await prisma.reservation.findMany({
    where: {
      userId,
      status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.TRANSFERRED] },
      menuItem: {
        date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
    },
    include: { menuItem: true },
  });

  const userReservationMap = new Map(
    userReservations.map((r) => [`${r.menuItemId}`, r])
  );

  return menuItems.map((item) => {
    const userReservation = userReservationMap.get(item.id);
    const deadline = getReservationDeadline(item.date);
    const status = getReservationStatus(item.date);
    const isOpen = isReservationOpen(item.date);
    const isPast = isBefore(item.date, startOfDay(now));
    
    let reservationStatus = "AVAILABLE";
    let canReserve = false;
    let cannotReserveReason = null;

    if (userReservation) {
      reservationStatus = "RESERVED";
    } else if (isPast) {
      reservationStatus = "PAST";
      cannotReserveReason = "تاریخ گذشته";
    } else if (!isOpen) {
      reservationStatus = "CLOSED";
      cannotReserveReason = "مهلت رزرو به پایان رسیده";
    } else if (status === "closed") {
      reservationStatus = "CLOSED";
      cannotReserveReason = "مهلت رزرو به پایان رسیده";
    } else {
      reservationStatus = "AVAILABLE";
      canReserve = true;
    }

    return {
      id: item.id,
      date: item.date,
      mealPeriod: item.mealPeriod,
      mealPeriodLabel: MEAL_PERIOD_LABELS[item.mealPeriod as keyof typeof MEAL_PERIOD_LABELS],
      food: item.food,
      price: item.food.price,
      formattedPrice: formatRial(item.food.price),
      status: reservationStatus,
      canReserve,
      cannotReserveReason,
      deadline: deadline.toISOString(),
      deadlineStatus: status,
      userReservation: userReservation ? {
        id: userReservation.id,
        status: userReservation.status,
      } : null,
    };
  });
}

import { MEAL_PERIOD_LABELS } from "@/lib/constants";
import { isBefore } from "date-fns";

/**
 * Check if user can reserve a meal (entitlement check)
 */
export async function canUserReserve(
  userId: string,
  menuItemId: string
): Promise<{ canReserve: boolean; reason?: string }> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: { food: true },
  });

  if (!menuItem) {
    return { canReserve: false, reason: "غذا یافت نشد" };
  }

  if (!menuItem.isAvailable || !menuItem.food.isActive) {
    return { canReserve: false, reason: "غذا در دسترس نیست" };
  }

  // Check deadline
  if (!isReservationOpen(menuItem.date)) {
    return { canReserve: false, reason: "مهلت رزرو به پایان رسیده" };
  }

  // Check if already reserved by this user (normal reservation)
  const existingReservation = await prisma.reservation.findFirst({
    where: {
      userId,
      menuItemId,
      status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.TRANSFERRED] },
    },
  });

  if (existingReservation) {
    return { canReserve: false, reason: "شما قبلاً این غذا را رزرو کرده‌اید" };
  }

  // Check wallet balance
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || wallet.balance < menuItem.food.price) {
    return { canReserve: false, reason: "موجودی کیف پول کافی نیست" };
  }

  // Check entitlement: user can have only 1 reservation per meal period per day
  // unless they have received transfers
  const dateStart = startOfDay(menuItem.date);
  const dateEnd = endOfDay(menuItem.date);
  
  const userReservationsForPeriod = await prisma.reservation.count({
    where: {
      userId,
      status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.TRANSFERRED] },
      menuItem: {
        date: { gte: dateStart, lte: dateEnd },
        mealPeriod: menuItem.mealPeriod,
      },
    },
  });

  // Count transferred IN reservations for this period
  const transferredInCount = await prisma.reservation.count({
    where: {
      userId,
      status: RESERVATION_STATUS.TRANSFERRED,
      menuItem: {
        date: { gte: dateStart, lte: dateEnd },
        mealPeriod: menuItem.mealPeriod,
      },
    },
  });

  // Normal entitlement is 1, plus any transferred meals
  const maxAllowed = 1 + transferredInCount;
  
  if (userReservationsForPeriod >= maxAllowed) {
    return { 
      canReserve: false, 
      reason: `شما نمی‌توانید بیش از ${maxAllowed} غذا برای این وعده رزرو کنید` 
    };
  }

  return { canReserve: true };
}

/**
 * Create a reservation
 */
export async function createReservation(userId: string, menuItemId: string) {
  const canReserveCheck = await canUserReserve(userId, menuItemId);
  if (!canReserveCheck.canReserve) {
    throw new Error(canReserveCheck.reason);
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: { food: true },
  });

  if (!menuItem) {
    throw new Error("غذا یافت نشد");
  }

  return await prisma.$transaction(async (tx) => {
    // Create reservation
    const reservation = await tx.reservation.create({
      data: {
        userId,
        menuItemId,
        status: RESERVATION_STATUS.CONFIRMED,
      },
      include: {
        menuItem: { include: { food: true } },
        user: true,
      },
    });

    // Deduct from wallet
    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: menuItem.food.price } },
    });

    // Create wallet transaction
    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: (await tx.wallet.findUnique({ where: { userId } }))!.id,
        amount: -menuItem.food.price,
        type: TRANSACTION_TYPES.MEAL_RESERVATION,
        description: `رزرو ${MEAL_PERIOD_LABELS[menuItem.mealPeriod as keyof typeof MEAL_PERIOD_LABELS]} - ${menuItem.food.name}`,
        referenceId: reservation.id,
        referenceType: "RESERVATION",
      },
    });

    return reservation;
  });
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(userId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { menuItem: { include: { food: true } } },
  });

  if (!reservation) {
    throw new Error("رزرو یافت نشد");
  }

  if (reservation.userId !== userId) {
    throw new Error("شما مجاز به لغو این رزرو نیستید");
  }

  if (reservation.status !== RESERVATION_STATUS.CONFIRMED) {
    throw new Error("فقط رزروهای تایید شده قابل لغو هستند");
  }

  // Check deadline
  if (!isReservationOpen(reservation.menuItem.date)) {
    throw new Error("مهلت لغو رزرو به پایان رسیده");
  }

  return await prisma.$transaction(async (tx) => {
    // Update reservation status
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: RESERVATION_STATUS.CANCELLED },
    });

    // Refund to wallet
    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: reservation.menuItem.food.price } },
    });

    // Create refund transaction
    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: (await tx.wallet.findUnique({ where: { userId } }))!.id,
        amount: reservation.menuItem.food.price,
        type: TRANSACTION_TYPES.RESERVATION_REFUND,
        description: `استرداد ${MEAL_PERIOD_LABELS[reservation.menuItem.mealPeriod as keyof typeof MEAL_PERIOD_LABELS]} - ${reservation.menuItem.food.name}`,
        referenceId: reservationId,
        referenceType: "RESERVATION",
      },
    });

    return { success: true };
  });
}

/**
 * Get user reservations
 */
export async function getUserReservations(
  userId: string,
  options?: {
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    mealPeriod?: string;
    page?: number;
    limit?: number;
  }
) {
  const { status, dateFrom, dateTo, mealPeriod, page = 1, limit = 10 } = options || {};
  
  const where: any = { userId };
  
  if (status && status.length > 0) {
    where.status = { in: status };
  }
  
  if (dateFrom || dateTo) {
    where.menuItem = {
      date: {},
    };
    if (dateFrom) where.menuItem.date.gte = startOfDay(dateFrom);
    if (dateTo) where.menuItem.date.lte = endOfDay(dateTo);
  }
  
  if (mealPeriod) {
    where.menuItem = { ...where.menuItem, mealPeriod };
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        menuItem: { include: { food: true } },
      },
      orderBy: { menuItem: { date: "asc" } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return {
    reservations: reservations.map((r) => ({
      ...r,
      formattedPrice: formatRial(r.menuItem.food.price),
      deadline: getReservationDeadline(r.menuItem.date).toISOString(),
      deadlineStatus: getReservationStatus(r.menuItem.date),
      canCancel: r.status === RESERVATION_STATUS.CONFIRMED && isReservationOpen(r.menuItem.date),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get upcoming reservations for dashboard
 */
export async function getUpcomingReservations(userId: string, limit = 5) {
  const now = getTehranNow();
  const today = startOfDay(now);
  
  return prisma.reservation.findMany({
    where: {
      userId,
      status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.TRANSFERRED] },
      menuItem: { date: { gte: today } },
    },
    include: {
      menuItem: { include: { food: true } },
    },
    orderBy: { menuItem: { date: "asc" } },
    take: limit,
  });
}

/**
 * Get reservation statistics
 */
export async function getReservationStats(userId?: string) {
  const where = userId ? { userId } : {};
  
  const [total, confirmed, cancelled, completed, transferred] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.count({ where: { ...where, status: RESERVATION_STATUS.CONFIRMED } }),
    prisma.reservation.count({ where: { ...where, status: RESERVATION_STATUS.CANCELLED } }),
    prisma.reservation.count({ where: { ...where, status: RESERVATION_STATUS.COMPLETED } }),
    prisma.reservation.count({ where: { ...where, status: RESERVATION_STATUS.TRANSFERRED } }),
  ]);

  return { total, confirmed, cancelled, completed, transferred };
}