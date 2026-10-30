/**
 * Admin Foods API
 * GET: List foods
 * POST: Create a new food
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { createFoodSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== null) where.isActive = isActive === "true";

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        include: {
          _count: { select: { menuItems: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.food.count({ where }),
    ]);

    return NextResponse.json({
      foods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get foods error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت غذاها" },
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
    const validated = createFoodSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const food = await prisma.food.create({
      data: validated.data,
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("Create food error:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد غذا" },
      { status: 500 }
    );
  }
}