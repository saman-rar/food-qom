/**
 * User Payments API
 * GET: List payments
 * POST: Initiate a new payment
 */

import { auth } from "@/lib/auth/config";
import { createPayment, getUserPayments, getPaymentByReference } from "@/lib/services/wallet-service";
import { initiatePaymentSchema, paymentFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "crypto";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const reference = searchParams.get("reference");

    if (action === "verify" && reference) {
      const payment = await getPaymentByReference(reference);
      if (!payment || payment.userId !== session.user.id) {
        return NextResponse.json({ error: "پرداخت یافت نشد" }, { status: 404 });
      }
      return NextResponse.json(payment);
    }

    const params = Object.fromEntries(searchParams.entries());
    const validated = paymentFilterSchema.safeParse(params);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "پارامترهای جستجو معتبر نیستند" },
        { status: 400 }
      );
    }

    const result = await getUserPayments(session.user.id, {
      page: validated.data.page,
      limit: validated.data.limit,
      status: validated.data.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت پرداخت‌ها" },
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
    const validated = initiatePaymentSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const reference = `PAY-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    const payment = await createPayment(
      session.user.id,
      validated.data.amount,
      reference
    );

    // Return payment with mock gateway URL
    const gatewayUrl = `/payment/gateway?reference=${reference}`;
    
    return NextResponse.json({
      ...payment,
      gatewayUrl,
    }, { status: 201 });
  } catch (error) {
    console.error("Initiate payment error:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد پرداخت" },
      { status: 500 }
    );
  }
}