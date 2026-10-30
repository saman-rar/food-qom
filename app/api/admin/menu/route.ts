/**
 * Admin Menu API
 * GET: Get weekly menu with management options
 * POST: Create/update menu items
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { 
  getWeeklyMenu, 
  getAvailableFoods, 
  upsertMenuItem, 
  deleteMenuItem,
  createWeeklyMenu,
  getWeeklyMenuStats
} from "@/lib/services/menu-service";
import { getWeekStart, getWeekEnd, addDays } from "@/lib/date-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");
    const action = searchParams.get("action");

    if (action === "foods") {
      const foods = await getAvailableFoods();
      return NextResponse.json({ foods });
    }

    if (action === "stats") {
      const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date());
      const stats = await getWeeklyMenuStats(weekStart);
      return NextResponse.json(stats);
    }

    const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date());
    const menu = await getWeeklyMenu(weekStart);

    return NextResponse.json(menu);
  } catch (error) {
    console.error("Get admin menu error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت منو" },
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
    const { action, ...data } = body;

    if (action === "bulk") {
      // Bulk create menu for a week
      const { weekStart, items } = data;
      const results = await createWeeklyMenu(new Date(weekStart), items);
      return NextResponse.json({ results }, { status: 201 });
    }

    // Single menu item upsert
    const { foodId, date, mealPeriod, isAvailable } = data;
    
    if (!foodId || !date || !mealPeriod) {
      return NextResponse.json(
        { error: "پارامترهای الزامی: foodId, date, mealPeriod" },
        { status: 400 }
      );
    }

    const menuItem = await upsertMenuItem({
      foodId,
      date: new Date(date),
      mealPeriod,
      isAvailable,
    });

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد آیتم منو" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const foodId = searchParams.get("foodId");
    const date = searchParams.get("date");
    const mealPeriod = searchParams.get("mealPeriod");

    if (!foodId || !date || !mealPeriod) {
      return NextResponse.json(
        { error: "پارامترهای الزامی: foodId, date, mealPeriod" },
        { status: 400 }
      );
    }

    await deleteMenuItem(foodId, new Date(date), mealPeriod);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete menu item error:", error);
    const message = error instanceof Error ? error.message : "خطا در حذف آیتم منو";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}