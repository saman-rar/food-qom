/**
 * User Reservations API
 * GET: List user reservations
 * POST: Create a new reservation
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { getUserReservations, createReservation } from "@/lib/services/reservation-service";
import { createReservationSchema, reservationFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = reservationFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const filters = validated.data;
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    const result = await getUserReservations(session.user.id, {
      status: filters.status ? [filters.status] : undefined,
      dateFrom,
      dateTo,
      mealPeriod: filters.mealPeriod,
      page: filters.page,
      limit: filters.limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت رزروها" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createReservationSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const reservation = await createReservation(session.user.id, validated.data.menuItemId);

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Create reservation error:", error);
    const message = error instanceof Error ? error.message : "خطا در ایجاد رزرو";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}