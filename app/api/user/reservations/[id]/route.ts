/**
 * Cancel Reservation API
 * DELETE: Cancel a user's reservation
 */

import { auth } from "@/lib/auth/config";
import { cancelReservation } from "@/lib/services/reservation-service";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "احراز هویت مورد نیاز است" }, { status: 401 });
    }

    const { id } = await params;

    await cancelReservation(session.user.id, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    const message = error instanceof Error ? error.message : "خطا در لغو رزرو";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}