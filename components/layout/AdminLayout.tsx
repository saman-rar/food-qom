"use client"

import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { ReactNode } from "react"

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="rtl:ml-64 pt-16 min-h-screen">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}