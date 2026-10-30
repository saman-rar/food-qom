/**
 * User Wallet API
 * GET: Get wallet balance and transactions
 */

import { auth } from "@/lib/auth/config";
import { getWalletWithTransactions, getWalletSummary } from "@/lib/services/wallet-service";
import { transactionFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "summary") {
      const summary = await getWalletSummary(session.user.id);
      return NextResponse.json(summary);
    }

    const params = Object.fromEntries(searchParams.entries());
    const validated = transactionFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const filters = validated.data;
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

    const result = await getWalletWithTransactions(session.user.id, {
      page: filters.page,
      limit: filters.limit,
      type: filters.type,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get wallet error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات کیف پول" },
      { status: 500 }
    );
  }
}