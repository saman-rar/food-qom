"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Utensils,
  Calendar,
  ShoppingCart,
  CreditCard,
  Receipt,
  SwapHorizontal,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { signOut } from "next-auth/react"

const adminNavigation = [
  { name: "نمای کلی", href: "/admin", icon: LayoutDashboard },
  { name: "مدیریت کاربران", href: "/admin/users", icon: Users },
  { name: "مدیریت غذاها", href: "/admin/foods", icon: Utensils },
  { name: "منو هفتگی", href: "/admin/menu", icon: Calendar },
  { name: "رزروها", href: "/admin/reservations", icon: ShoppingCart },
  { name: "تراکنش‌ها", href: "/admin/transactions", icon: CreditCard },
  { name: "پرداخت‌ها", href: "/admin/payments", icon: Receipt },
  { name: "انتقالات", href: "/admin/transfers", icon: SwapHorizontal },
  { name: "تنظیمات", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-64 bg-card border-l border-border transition-all duration-300 flex flex-col">
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">پنل ادمین</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {adminNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.image || ""} alt={user?.fullName || ""} />
            <AvatarFallback>{user?.fullName?.[0] || "ا"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">مدیر سیستم</p>
          </div>
        </div>
        <Separator className="my-3" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-5 h-5" />
          خروج
        </Button>
      </div>
    </aside>
  )
}