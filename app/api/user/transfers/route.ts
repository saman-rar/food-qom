/**
 * User Transfers API
 * GET: List transfers (sent and received)
 * POST: Create a new transfer
 */

import { auth } from "@/lib/auth/config";
import { 
  getTransferableReservations,
  executeTransfer,
  getSentTransfers,
  getReceivedTransfers,
  getTransferQuota
} from "@/lib/services/transfer-service";
import { createTransferSchema, transferFilterSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "available") {
      const reservations = await getTransferableReservations(session.user.id);
      return NextResponse.json({ reservations });
    }

    if (action === "quota") {
      const quota = await getTransferQuota(session.user.id);
      return NextResponse.json(quota);
    }

    if (action === "sent") {
      const params = Object.fromEntries(searchParams.entries());
      const validated = transferFilterSchema.safeParse(params);
      
      if (!validated.success) {
        return NextResponse.json(
          { error: "پارامترهای جستجو معتبر نیستند" },
          { status: 400 }
        );
      }

      const result = await getSentTransfers(session.user.id, {
        page: validated.data.page,
        limit: validated.data.limit,
        month: validated.data.month,
      });
      
      return NextResponse.json(result);
    }

    if (action === "received") {
      const params = Object.fromEntries(searchParams.entries());
      const validated = transferFilterSchema.safeParse(params);
      
      if (!validated.success) {
        return NextResponse.json(
          { error: "پارامترهای جستجو معتبر نیستند" },
          { status: 400 }
        );
      }

      const result = await getReceivedTransfers(session.user.id, {
        page: validated.data.page,
        limit: validated.data.limit,
        month: validated.data.month,
      });
      
      return NextResponse.json(result);
    }

    // Default: return both sent and received
    const [sent, received, quota] = await Promise.all([
      getSentTransfers(session.user.id, { limit: 10 }),
      getReceivedTransfers(session.user.id, { limit: 10 }),
      getTransferQuota(session.user.id),
    ]);

    return NextResponse.json({
      sent: sent.transfers,
      received: received.transfers,
      quota,
    });
  } catch (error) {
    console.error("Get transfers error:", error);
    return NextResponse.json(
      { error: "خطا در دریافت انتقال‌ها" },
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
    const validated = createTransferSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: "داده‌های ورودی معتبر نیستند", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const result = await executeTransfer(
      session.user.id,
      validated.data.reservationId,
      validated.data.recipientUsername
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create transfer error:", error);
    const message = error instanceof Error ? error.message : "خطا در انتقال رزرو";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}