"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ReservationsContent } from "./ReservationsContent"

export default function ReservationsPage() {
  return (
    <DashboardLayout>
      <ReservationsContent />
    </DashboardLayout>
  )
}