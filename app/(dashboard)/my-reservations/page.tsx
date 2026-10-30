"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { MyReservationsContent } from "./MyReservationsContent"

export default function MyReservationsPage() {
  return (
    <DashboardLayout>
      <MyReservationsContent />
    </DashboardLayout>
  )
}