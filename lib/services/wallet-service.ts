/**
 * Wallet Service
 * Core business logic for wallet and transactions
 */

import { prisma } from "@/lib/prisma";
import { 
  TRANSACTION_TYPES, 
  PAYMENT_STATUS 
} from "@/lib/constants";
import { formatRial } from "@/lib/currency";

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(userId: string) {
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, balance: 0 },
    });
  }
  
  return wallet;
}

/**
 * Get wallet with transaction history
 */
export async function getWalletWithTransactions(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const { page = 1, limit = 20, type, dateFrom, dateTo } = options || {};
  
  const wallet = await getOrCreateWallet(userId);
  
  const where: any = { walletId: wallet.id };
  
  if (type) where.type = type;
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    wallet: {
      ...wallet,
      formattedBalance: formatRial(wallet.balance),
    },
    transactions: transactions.map((t) => ({
      ...t,
      formattedAmount: formatRial(t.amount),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Add credit to wallet (admin adjustment or deposit)
 */
export async function addCredit(
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string,
  referenceType?: string
) {
  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount,
        type: type as any,
        description,
        referenceId,
        referenceType,
      },
    });

    return wallet;
  });
}

/**
 * Deduct credit from wallet
 */
export async function deductCredit(
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string,
  referenceType?: string
) {
  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    
    if (!wallet || wallet.balance < amount) {
      throw new Error("موجودی کیف پول کافی نیست");
    }

    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: -amount,
        type: type as any,
        description,
        referenceId,
        referenceType,
      },
    });

    return updatedWallet;
  });
}

/**
 * Process successful payment
 */
export async function processSuccessfulPayment(
  paymentId: string,
  gatewayResponse?: any
) {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new Error("پرداخت یافت نشد");
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      throw new Error("این پرداخت قبلاً پردازش شده است");
    }

    // Update payment status
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.SUCCESS,
        gatewayResponse,
        completedAt: new Date(),
      },
    });

    // Add credit to wallet
    const wallet = await tx.wallet.update({
      where: { userId: payment.userId },
      data: { balance: { increment: payment.amount } },
    });

    // Create wallet transaction
    await tx.walletTransaction.create({
      data: {
        userId: payment.userId,
        walletId: wallet.id,
        amount: payment.amount,
        type: TRANSACTION_TYPES.CREDIT_DEPOSIT,
        description: `شارژ کیف پول از طریق درگاه پرداخت`,
        referenceId: payment.id,
        referenceType: "PAYMENT",
      },
    });

    return { wallet, payment };
  });
}

/**
 * Create a new payment record
 */
export async function createPayment(
  userId: string,
  amount: number,
  reference: string
) {
  return prisma.payment.create({
    data: {
      userId,
      amount,
      reference,
      status: PAYMENT_STATUS.PENDING,
    },
  });
}

/**
 * Get payment by reference
 */
export async function getPaymentByReference(reference: string) {
  return prisma.payment.findUnique({
    where: { reference },
    include: { user: true },
  });
}

/**
 * Get user payments
 */
export async function getUserPayments(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    status?: string;
  }
) {
  const { page = 1, limit = 20, status } = options || {};
  
  const where: any = { userId };
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get wallet summary for dashboard
 */
export async function getWalletSummary(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  
  const [totalDeposits, totalSpent, recentTransactions] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { 
        userId, 
        amount: { gt: 0 },
        type: { in: [TRANSACTION_TYPES.CREDIT_DEPOSIT, TRANSACTION_TYPES.ADMIN_ADJUSTMENT, TRANSACTION_TYPES.TRANSFER_INCOMING] },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { 
        userId, 
        amount: { lt: 0 },
        type: { in: [TRANSACTION_TYPES.MEAL_RESERVATION, TRANSACTION_TYPES.TRANSFER_OUTGOING] },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    balance: wallet.balance,
    formattedBalance: formatRial(wallet.balance),
    totalDeposits: totalDeposits._sum.amount || 0,
    totalSpent: Math.abs(totalSpent._sum.amount || 0),
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      formattedAmount: formatRial(t.amount),
    })),
  };
}

/**
 * Admin wallet adjustment
 */
export async function adminAdjustWallet(
  adminId: string,
  userId: string,
  amount: number,
  reason: string
) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  
  if (!wallet) {
    throw new Error("کیف پول کاربر یافت نشد");
  }

  const newBalance = wallet.balance + amount;
  
  if (newBalance < 0) {
    throw new Error("موجودی کیف پول نمی‌تواند منفی شود");
  }

  return await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: updatedWallet.id,
        amount,
        type: TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
        description: reason,
        referenceId: adminId,
        referenceType: "ADMIN",
      },
    });

    // Create audit log
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: "WALLET_ADJUSTMENT",
        entityType: "WALLET",
        entityId: userId,
        reason,
        metadata: { amount, newBalance: updatedWallet.balance },
      },
    });

    return updatedWallet;
  });
}