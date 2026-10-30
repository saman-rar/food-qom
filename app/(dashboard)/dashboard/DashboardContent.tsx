"use client"

import { useQuery } from "@tanstack/react-query"
import { formatRial } from "@/lib/currency"
import { formatJalaliWithDay } from "@/lib/date-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  CreditCard,
  Wallet,
  History,
  Users,
  Plus,
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface UpcomingReservation {
  id: string
  menuItem: {
    date: string
    mealPeriod: string
    food: {
      name: string
      price: number
    }
  }
  status: string
}

interface WalletSummary {
  balance: number
  formattedBalance: string
  totalDeposits: number
  totalSpent: number
  recentTransactions: any[]
}

export function DashboardContent() {
  const { data: reservations, isLoading: reservationsLoading } = useQuery<UpcomingReservation[]>({
    queryKey: ["upcoming-reservations"],
    queryFn: async () => {
      const res = await fetch("/api/user/reservations?limit=5")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      return data.reservations
    },
  })

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletSummary>({
    queryKey: ["wallet-summary"],
    queryFn: async () => {
      const res = await fetch("/api/user/wallet?action=summary")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const { data: transferQuota } = useQuery({
    queryKey: ["transfer-quota"],
    queryFn: async () => {
      const res = await fetch("/api/user/transfers?action=quota")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      TRANSFERRED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    }
    const labels: Record<string, string> = {
      CONFIRMED: "تایید شده",
      TRANSFERRED: "انتقال یافته",
      CANCELLED: "لغو شده",
      COMPLETED: "انجام شده",
      EXPIRED: "منقضی شده",
    }
    return (
      <Badge variant="secondary" className={styles[status] || "bg-gray-100 text-gray-800"}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getMealPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      BREAKFAST: "صبحانه",
      LUNCH: "ناهار",
      DINNER: "شام",
    }
    return labels[period] || period
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">داشبورد</h1>
          <p className="text-muted-foreground">نمای کلی از فعالیت‌های کافه‌رزرو</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/reservations">
              <Plus className="w-4 h-4 ml-2" />
              رزرو غذا
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/wallet">
              <Plus className="w-4 h-4 ml-2" />
              شارژ کیف پول
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">موجودی کیف پول</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">{wallet?.formattedBalance || "۰ ریال"}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              کل واریز: {wallet ? formatRial(wallet.totalDeposits) : "..."} | 
              کل هزینه: {wallet ? formatRial(wallet.totalSpent) : "..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">رزروهای آتی</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">{reservations?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">رزروهای فعال در هفته جاری</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">سهمیه انتقال ماهانه</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {transferQuota ? (
              <>
                <div className="text-2xl font-bold">
                  {transferQuota.remaining} / {transferQuota.limit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transferQuota.used} انتقال استفاده شده در ماه {transferQuota.month}
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-1/4" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">موعدهای نزدیک</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">۳</div>
            <p className="text-xs text-muted-foreground mt-1">رزروهای با مهلت نزدیک</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">رزرو غذا</h3>
                <p className="text-sm text-muted-foreground">مشاهده منو و رزرو وعده‌های غذایی</p>
              </div>
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href="/dashboard/reservations">برو به رزرو <ArrowLeft className="w-4 h-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">کیف پول</h3>
                <p className="text-sm text-muted-foreground">مشاهده موجودی و تراکنش‌ها</p>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/dashboard/wallet">مشاهده کیف پول</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">انتقال رزرو</h3>
                <p className="text-sm text-muted-foreground">انتقال وعده رزرو شده به دیگران</p>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/dashboard/transfers">مدیریت انتقال‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reservations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>رزروهای پیش‌رو</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/my-reservations">مشاهده همه</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reservations && reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    reservation.status === "TRANSFERRED" && "border-blue-200 bg-blue-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{reservation.menuItem.food.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatJalaliWithDay(new Date(reservation.menuItem.date))} •
                        {getMealPeriodLabel(reservation.menuItem.mealPeriod)} •
                        {formatRial(reservation.menuItem.food.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(reservation.status)}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/my-reservations/${reservation.id}`}>
                        جزئیات
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-lg mb-1">رزروی وجود ندارد</h3>
              <p className="text-muted-foreground mb-4">هنوز هیچ رزروی برای هفته جاری ندارید</p>
              <Button asChild>
                <Link href="/dashboard/reservations">رزرو غذا</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}