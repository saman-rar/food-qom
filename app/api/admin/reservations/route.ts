/**
 * Admin Reservations API
 * GET: List all reservations with filters
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { reservationFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = reservationFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, status, mealPeriod, dateFrom, dateTo, userId } = validated.data;

    const where: any = {};
    if (status) where.status = status;
    if (mealPeriod) where.menuItem = { ...where.menuItem, mealPeriod };
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.menuItem = {
        ...where.menuItem,
        date: {},
      };
      if (dateFrom) where.menuItem.date.gte = new Date(dateFrom);
      if (dateTo) where.menuItem.date.lte = new Date(dateTo);
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          menuItem: { 
            include: { food: { select: { id: true, name: true, price: true } } } 
          },
          originalUser: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      reservations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get admin reservations error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت رزروها" },
      { status: 500 }
    );
  }
}