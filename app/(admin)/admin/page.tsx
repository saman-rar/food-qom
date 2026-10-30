"use client"

import { AdminLayout } from "@/components/layout/AdminLayout"
import { AdminDashboardContent } from "./AdminDashboardContent"

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <AdminDashboardContent />
    </AdminLayout>
  )
}