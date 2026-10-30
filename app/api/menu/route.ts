/**
 * Menu API
 * GET: Get weekly menu for current and next week
 */

import { auth } from "@/lib/auth/config";
import { getCurrentAndNextWeekMenus, getMenuForDate } from "@/lib/services/menu-service";
import { getCurrentAndNextWeek } from "@/lib/date-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (dateParam) {
      const date = new Date(dateParam);
      const menu = await getMenuForDate(date);
      return NextResponse.json({ date: dateParam, menu });
    }

    const { current, next } = getCurrentAndNextWeek();
    const { currentWeek, nextWeek } = await getCurrentAndNextWeekMenus();

    return NextResponse.json({
      currentWeek: {
        ...currentWeek,
        weekLabel: currentWeek.weekStart.toISOString().split("T")[0],
      },
      nextWeek: {
        ...nextWeek,
        weekLabel: nextWeek.weekStart.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Get menu error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت منو" },
      { status: 500 }
    );
  }
}