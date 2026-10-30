/**
 * Admin Transfers API
 * GET: List all transfers with filters
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { transferFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = transferFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, senderId, recipientId, month } = validated.data;

    const where: any = {};
    if (senderId) where.senderId = senderId;
    if (recipientId) where.recipientId = recipientId;
    if (month) where.month = month;

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          sender: { select: { id: true, username: true, fullName: true } },
          recipient: { select: { id: true, username: true, fullName: true } },
          reservation: {
            include: { 
              menuItem: { include: { food: { select: { id: true, name: true } } } } 
            },
          },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transfer.count({ where }),
    ]);

    return NextResponse.json({
      transfers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get admin transfers error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت انتقال‌ها" },
      { status: 500 }
    );
  }
}