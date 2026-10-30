"use client"

import { AdminLayout } from "@/components/layout/AdminLayout"
import { AdminFoodsContent } from "./AdminFoodsContent"

export default function AdminFoodsPage() {
  return (
    <AdminLayout>
      <AdminFoodsContent />
    </AdminLayout>
  )
}