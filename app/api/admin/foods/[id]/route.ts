/**
 * Admin Food Detail API
 * GET: Get food details
 * PATCH: Update food
 * DELETE: Delete food (soft delete)
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { updateFoodSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;

    const food = await prisma.food.findUnique({
      where: { id },
      include: {
        menuItems: {
          include: { _count: { select: { reservations: true } } },
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!food) {
      return NextResponse.json({ error: "غذا یافت نشد" }, { status: 404 });
    }

    return NextResponse.json(food);
  } catch (error) {
    console.error("Get food error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات غذا" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateFoodSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const food = await prisma.food.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json(food);
  } catch (error) {
    console.error("Update food error:", error);
    return NextResponse.json(
      { error: "خطا در به‌روزرسانی غذا" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;

    // Check if food has historical reservations
    const reservationCount = await prisma.reservation.count({
      where: { menuItem: { foodId: id } },
    });

    if (reservationCount > 0) {
      // Soft delete - deactivate instead
      await prisma.food.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, deactivated: true });
    }

    // Hard delete if no reservations
    await prisma.food.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete food error:", error);
    return NextResponse.json(
      { error: "خطا در حذف غذا" },
      { status: 500 }
    );
  }
}