/**
 * Transfer Service
 * Core business logic for meal transfers between users
 */

import { prisma } from "@/lib/prisma";
import { 
  getTehranNow, 
  formatJalali,
  getJalaliMonth 
} from "@/lib/date-utils";
import { 
  RESERVATION_STATUS, 
  TRANSACTION_TYPES,
  MAX_TRANSFERS_PER_MONTH 
} from "@/lib/constants";

/**
 * Get current Jalali month string (e.g., "1403/07")
 */
function getJalaliMonth(date: Date): string {
  const { jy, jm } = toJalaali(date);
  return `${jy}/${String(jm).padStart(2, "0")}`;
}

import { toJalaali } from "date-fns-jalali";

/**
 * Check if user can transfer a reservation
 */
export async function canTransferReservation(
  senderId: string,
  reservationId: string
): Promise<{ canTransfer: boolean; reason?: string }> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { 
      menuItem: { include: { food: true } },
      transfer: true,
    },
  });

  if (!reservation) {
    return { canTransfer: false, reason: "رزرو یافت نشد" };
  }

  if (reservation.userId !== senderId) {
    return { canTransfer: false, reason: "شما مالک این رزرو نیستید" };
  }

  if (reservation.status !== RESERVATION_STATUS.CONFIRMED) {
    return { canTransfer: false, reason: "فقط رزروهای تایید شده قابل انتقال هستند" };
  }

  if (reservation.transfer) {
    return { canTransfer: false, reason: "این رزرو قبلاً انتقال داده شده است" };
  }

  // Check deadline - cannot transfer after booking deadline
  const { isReservationOpen } = await import("@/lib/date-utils");
  if (!isReservationOpen(reservation.menuItem.date)) {
    return { canTransfer: false, reason: "مهلت انتقال رزرو به پایان رسیده" };
  }

  // Check monthly transfer quota
  const currentMonth = getJalaliMonth(getTehranNow());
  const transferCount = await prisma.transfer.count({
    where: {
      senderId,
      month: currentMonth,
    },
  });

  if (transferCount >= MAX_TRANSFERS_PER_MONTH) {
    return { 
      canTransfer: false, 
      reason: `شما در این ماه (${currentMonth}) حداکثر ${MAX_TRANSFERS_PER_MONTH} انتقال انجام داده‌اید` 
    };
  }

  return { canTransfer: true };
}

/**
 * Find recipient by username
 */
export async function findRecipientByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, fullName: true, isActive: true },
  });

  if (!user) {
    return { found: false, reason: "کاربر یافت نشد" };
  }

  if (!user.isActive) {
    return { found: false, reason: "حساب کاربری غیرفعال است" };
  }

  return { found: true, user };
}

/**
 * Execute a meal transfer
 */
export async function executeTransfer(
  senderId: string,
  reservationId: string,
  recipientUsername: string
) {
  // Validate sender can transfer
  const canTransfer = await canTransferReservation(senderId, reservationId);
  if (!canTransfer.canTransfer) {
    throw new Error(canTransfer.reason);
  }

  // Find recipient
  const recipientResult = await findRecipientByUsername(recipientUsername);
  if (!recipientResult.found) {
    throw new Error(recipientResult.reason);
  }

  const recipient = recipientResult.user!;

  if (recipient.id === senderId) {
    throw new Error("نمی‌توانید رزرو را به خودتان انتقال دهید");
  }

  const currentMonth = getJalaliMonth(getTehranNow());

  return await prisma.$transaction(async (tx) => {
    // Get reservation with menu item
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { menuItem: { include: { food: true } } },
    });

    if (!reservation) {
      throw new Error("رزرو یافت نشد");
    }

    // Update reservation: change owner and status
    const updatedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        userId: recipient.id,
        status: RESERVATION_STATUS.TRANSFERRED,
        isTransferred: true,
        originalUserId: senderId,
        transferredAt: new Date(),
      },
    });

    // Create transfer record
    const transfer = await tx.transfer.create({
      data: {
        senderId,
        recipientId: recipient.id,
        reservationId,
        month: currentMonth,
      },
    });

    // Create wallet transaction for sender (transfer outgoing)
    const senderWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
    if (senderWallet) {
      await tx.walletTransaction.create({
        data: {
          userId: senderId,
          walletId: senderWallet.id,
          amount: 0,
          type: TRANSACTION_TYPES.TRANSFER_OUTGOING,
          description: `انتقال ${reservation.menuItem.food.name} به ${recipient.fullName}`,
          referenceId: transfer.id,
          referenceType: "TRANSFER",
        },
      });
    }

    // Create wallet transaction for recipient (transfer incoming)
    const recipientWallet = await tx.wallet.findUnique({ where: { userId: recipient.id } });
    if (recipientWallet) {
      await tx.walletTransaction.create({
        data: {
          userId: recipient.id,
          walletId: recipientWallet.id,
          amount: 0,
          type: TRANSACTION_TYPES.TRANSFER_INCOMING,
          description: `دریافت ${reservation.menuItem.food.name} از ${(await tx.user.findUnique({ where: { id: senderId } }))?.fullName}`,
          referenceId: transfer.id,
          referenceType: "TRANSFER",
        },
      });
    }

    return { transfer, reservation: updatedReservation };
  });
}

/**
 * Get user's transferable reservations
 */
export async function getTransferableReservations(userId: string) {
  const now = getTehranNow();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const reservations = await prisma.reservation.findMany({
    where: {
      userId,
      status: RESERVATION_STATUS.CONFIRMED,
      isTransferred: false,
      transfer: null,
      menuItem: {
        date: { gte: today },
        isAvailable: true,
        food: { isActive: true },
      },
    },
    include: {
      menuItem: { include: { food: true } },
    },
    orderBy: { menuItem: { date: "asc" } },
  });

  return reservations.map((r) => ({
    ...r,
    canTransfer: true,
    deadline: new Date(r.menuItem.date).toISOString(),
    formattedPrice: "۰ ریال", // Transferred meals don't have price
  }));
}

/**
 * Get user's transfer history (sent)
 */
export async function getSentTransfers(
  userId: string,
  options?: { page?: number; limit?: number; month?: string }
) {
  const { page = 1, limit = 20, month } = options || {};
  
  const where: any = { senderId: userId };
  if (month) where.month = month;

  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        recipient: { select: { id: true, username: true, fullName: true } },
        reservation: {
          include: { menuItem: { include: { food: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transfer.count({ where }),
  ]);

  return {
    transfers: transfers.map((t) => ({
      ...t,
      reservation: t.reservation ? {
        ...t.reservation,
        formattedDate: formatJalali(t.reservation.menuItem.date),
        mealPeriodLabel: t.reservation.menuItem.mealPeriod,
      } : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get user's received transfers
 */
export async function getReceivedTransfers(
  userId: string,
  options?: { page?: number; limit?: number; month?: string }
) {
  const { page = 1, limit = 20, month } = options || {};
  
  const where: any = { recipientId: userId };
  if (month) where.month = month;

  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, fullName: true } },
        reservation: {
          include: { menuItem: { include: { food: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transfer.count({ where }),
  ]);

  return {
    transfers: transfers.map((t) => ({
      ...t,
      reservation: t.reservation ? {
        ...t.reservation,
        formattedDate: formatJalali(t.reservation.menuItem.date),
        mealPeriodLabel: t.reservation.menuItem.mealPeriod,
      } : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get user's transfer quota
 */
export async function getTransferQuota(userId: string) {
  const currentMonth = getJalaliMonth(getTehranNow());
  const used = await prisma.transfer.count({
    where: { senderId: userId, month: currentMonth },
  });

  return {
    used,
    limit: MAX_TRANSFERS_PER_MONTH,
    remaining: Math.max(0, MAX_TRANSFERS_PER_MONTH - used),
    month: currentMonth,
  };
}

/**
 * Get all transfers (admin)
 */
export async function getAllTransfers(
  options?: { page?: number; limit?: number; month?: string }
) {
  const { page = 1, limit = 50, month } = options || {};
  
  const where: any = {};
  if (month) where.month = month;

  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, fullName: true } },
        recipient: { select: { id: true, username: true, fullName: true } },
        reservation: {
          include: { menuItem: { include: { food: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transfer.count({ where }),
  ]);

  return {
    transfers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}