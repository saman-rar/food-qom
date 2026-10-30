/**
 * Admin Payments API
 * GET: List all payments with filters
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { paymentFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = paymentFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, status, dateFrom, dateTo, userId } = validated.data;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get admin payments error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت پرداخت‌ها" },
      { status: 500 }
    );
  }
}