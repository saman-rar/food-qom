/**
 * Admin Users API
 * GET: List users with filters
 * POST: Create a new user
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/config";
import { createUserSchema, userFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = userFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, role, isActive, search } = validated.data;

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          wallet: { select: { balance: true } },
          _count: { select: { reservations: true, transactions: true, sentTransfers: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت کاربران" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createUserSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { password, ...userData } = validated.data;
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create wallet for new user
    await prisma.wallet.create({
      data: { userId: user.id, balance: 0 },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "نام کاربری یا ایمیل قبلاً ثبت شده است" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطا در ایجاد کاربر" },
      { status: 500 }
    );
  }
}