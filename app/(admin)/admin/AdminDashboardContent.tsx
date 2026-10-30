"use client"

import { useQuery } from "@tanstack/react-query"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatRial } from "@/lib/currency"
import { format } from "date-fns"
import { 
  Users, Utensils, Calendar, ShoppingCart, CreditCard, Receipt, 
  SwapHorizontal, TrendingUp, Wallet, ArrowUpRight, Clock 
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalReservations: number
  todayReservations: number
  totalWalletBalance: number
  pendingPayments: number
  recentTransactions: any[]
  recentTransfers: any[]
  mealBreakdown: Record<string, { available: number; reserved: number }>
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
  user: { username: string; fullName: string }
}

interface Transfer {
  id: string
  createdAt: string
  sender: { username: string; fullName: string }
  recipient: { username: string; fullName: string }
  reservation: { menuItem: { food: { name: string } } }
}

export function AdminDashboardContent() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const statCards = [
    { label: "کل کاربران", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100", href: "/admin/users" },
    { label: "کاربران فعال", value: stats?.activeUsers || 0, icon: Users, color: "text-green-600", bg: "bg-green-100", href: "/admin/users" },
    { label: "کل رزروها", value: stats?.totalReservations || 0, icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-100", href: "/admin/reservations" },
    { label: "رزروهای امروز", value: stats?.todayReservations || 0, icon: Calendar, color: "text-orange-600", bg: "bg-orange-100", href: "/admin/reservations" },
    { label: "مجموع موجودی", value: formatRial(stats?.totalWalletBalance || 0), icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-100", href: "/admin/transactions" },
    { label: "پرداخت‌های معلق", value: stats?.pendingPayments || 0, icon: CreditCard, color: "text-red-600", bg: "bg-red-100", href: "/admin/payments" },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">پنل مدیریت</h1>
            <p className="text-muted-foreground">نمای کلی آمار و وضعیت سیستم</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Link href={stat.href}>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts/Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Meal Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                وعده‌های امروز
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stats?.mealBreakdown ? (
                <div className="space-y-3">
                  {Object.entries(stats.mealBreakdown).map(([period, data]) => (
                    <div key={period} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {period === "BREAKFAST" && <span className="text-xl">🌅</span>}
                          {period === "LUNCH" && <span className="text-xl">🍽️</span>}
                          {period === "DINNER" && <span className="text-xl">🌙</span>}
                        </div>
                        <div>
                          <p className="font-medium">
                            {period === "BREAKFAST" && "صبحانه"}
                            {period === "LUNCH" && "ناهار"}
                            {period === "DINNER" && "شام"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{data.reserved} رزرو</p>
                        <p className="text-sm text-muted-foreground">{data.available} گزینه موجود</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">داده‌ای برای امروز وجود ندارد</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                عملیات سریع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/users">
                    <Users className="w-8 h-8" />
                    مدیریت کاربران
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/foods">
                    <Utensils className="w-8 h-8" />
                    مدیریت غذاها
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/menu">
                    <Calendar className="w-8 h-8" />
                    منو هفتگی
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/reservations">
                    <ShoppingCart className="w-8 h-8" />
                    رزروها
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/transactions">
                    <CreditCard className="w-8 h-8" />
                    تراکنش‌ها
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link href="/admin/transfers">
                    <SwapHorizontal className="w-8 h-8" />
                    انتقال‌ها
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">تراکنش‌های اخیر</TabsTrigger>
            <TabsTrigger value="transfers">انتقال‌های اخیر</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>آخرین تراکنش‌ها</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/transactions">مشاهده همه</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : stats?.recentTransactions?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">هیچ تراکنشی یافت نشد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>کاربر</TableHead>
                          <TableHead>نوع</TableHead>
                          <TableHead>مبلغ</TableHead>
                          <TableHead>توضیحات</TableHead>
                          <TableHead>تاریخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats?.recentTransactions?.slice(0, 10).map((tx: Transaction) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{tx.user.fullName}</p>
                                <p className="text-sm text-muted-foreground">@{tx.user.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn(
                                tx.amount > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              )}>
                                {tx.amount > 0 ? "واریز" : "برداشت"}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("font-bold", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                              {tx.amount > 0 ? "+" : ""}{formatRial(Math.abs(tx.amount))}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                            <TableCell className="whitespace-nowrap">{format(new Date(tx.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>آخرین انتقال‌ها</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/transfers">مشاهده همه</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : stats?.recentTransfers?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">هیچ انتقالی یافت نشد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>فرستنده</TableHead>
                          <TableHead>گیرنده</TableHead>
                          <TableHead>غذا</TableHead>
                          <TableHead>تاریخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats?.recentTransfers?.slice(0, 10).map((t: Transfer) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <p className="font-medium">{t.sender.fullName}</p>
                              <p className="text-sm text-muted-foreground">@{t.sender.username}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{t.recipient.fullName}</p>
                              <p className="text-sm text-muted-foreground">@{t.recipient.username}</p>
                            </TableCell>
                            <TableCell>{t.reservation.menuItem.food.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{format(new Date(t.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}