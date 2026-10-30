/**
 * Mock Payment Gateway API
 * GET: Show payment page
 * POST: Process payment (simulate)
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { processSuccessfulPayment } from "@/lib/services/wallet-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "مرجع پرداخت یافت نشد" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { user: true },
    });

    if (!payment || payment.userId !== session.user.id) {
      return NextResponse.json({ error: "پرداخت یافت نشد" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "این پرداخت قبلاً پردازش شده است", status: payment.status },
        { status: 400 }
      );
    }

    // Return payment details for the gateway page
    return NextResponse.json({
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        status: payment.status,
      },
      user: {
        id: payment.user.id,
        fullName: payment.user.fullName,
      },
    });
  } catch (error) {
    console.error("Payment gateway error:", error);
    return NextResponse.json(
      { error: "خطا در درگاه پرداخت" },
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
    const { reference, action } = body; // action: "success" | "fail" | "cancel"

    if (!reference || !action) {
      return NextResponse.json(
        { error: "پارامترهای الزامی: reference, action" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { user: true },
    });

    if (!payment || payment.userId !== session.user.id) {
      return NextResponse.json({ error: "پرداخت یافت نشد" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "این پرداخت قبلاً پردازش شده است" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "success":
        result = await processSuccessfulPayment(payment.id, { 
          mock: true, 
          timestamp: new Date().toISOString() 
        });
        return NextResponse.json({
          success: true,
          payment: result.payment,
          wallet: result.wallet,
          redirectUrl: `/payment/result?reference=${reference}&status=success`,
        });

      case "fail":
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: "FAILED",
            gatewayResponse: { mock: true, reason: "User cancelled or failed" },
          },
        });
        return NextResponse.json({
          success: false,
          redirectUrl: `/payment/result?reference=${reference}&status=failed`,
        });

      case "cancel":
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: "CANCELLED",
            gatewayResponse: { mock: true, reason: "User cancelled" },
          },
        });
        return NextResponse.json({
          success: false,
          redirectUrl: `/payment/result?reference=${reference}&status=cancelled`,
        });

      default:
        return NextResponse.json(
          { error: "عملیات نامعتبر" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Process payment error:", error);
    return NextResponse.json(
      { error: "خطا در پردازش پرداخت" },
      { status: 500 }
    );
  }
}