/**
 * Admin Wallet Adjust API
 * POST: Adjust user wallet balance
 */

import { auth } from "@/lib/auth/config";
import { adminAdjustWallet } from "@/lib/services/wallet-service";
import { adminAdjustWalletSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function POST(
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
    const validated = adminAdjustWalletSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const wallet = await adminAdjustWallet(
      session.user.id,
      id,
      validated.data.amount,
      validated.data.reason
    );

    return NextResponse.json({
      wallet,
      formattedBalance: wallet.balance.toLocaleString("fa-IR") + " ریال",
    });
  } catch (error) {
    console.error("Admin wallet adjust error:", error);
    const message = error instanceof Error ? error.message : "خطا در تنظیم موجودی";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}