/**
 * Admin User Detail API
 * GET: Get user details
 * PATCH: Update user
 * DELETE: Delete user (soft delete)
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/config";
import { updateUserSchema, adminAdjustWalletSchema } from "@/lib/validations";
import { adminAdjustWallet } from "@/lib/services/wallet-service";
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        wallet: true,
        _count: {
          select: { 
            reservations: true, 
            transactions: true, 
            sentTransfers: true,
            receivedTransfers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات کاربر" },
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
    const validated = updateUserSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { password, ...updateData } = validated.data;
    
    const data: any = { ...updateData };
    if (password) {
      data.passwordHash = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "خطا در به‌روزرسانی کاربر" },
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

    // Prevent deleting self
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "نمی‌توانید حساب کاربری خود را حذف کنید" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "خطا در حذف کاربر" },
      { status: 500 }
    );
  }
}