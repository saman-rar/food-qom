/**
 * Admin Transactions API
 * GET: List all wallet transactions with filters
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { transactionFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = transactionFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, type, dateFrom, dateTo, userId } = validated.data;

    const where: any = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          wallet: { select: { balance: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get admin transactions error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت تراکنش‌ها" },
      { status: 500 }
    );
  }
}