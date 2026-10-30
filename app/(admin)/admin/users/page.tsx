"use client"

import { AdminLayout } from "@/components/layout/AdminLayout"
import { AdminUsersContent } from "./AdminUsersContent"

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <AdminUsersContent />
    </AdminLayout>
  )
}