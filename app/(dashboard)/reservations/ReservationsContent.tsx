"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRial } from "@/lib/currency"
import { formatJalaliWithDay, getWeekStart, getTehranNow, addDays, startOfDay, format } from "@/lib/date-utils"
import { format } from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, Plus, X, CheckCircle, AlertCircle, Clock, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WEEK_DAYS_PERSIAN, WEEK_DAYS_PERSIAN_SHORT, MEAL_PERIODS, MEAL_PERIOD_ORDER, MEAL_PERIOD_LABELS } from "@/lib/constants"

interface MenuItem {
  id: string
  date: string
  mealPeriod: string
  isAvailable: boolean
  food: {
    id: string
    name: string
    description: string | null
    price: number
    imageUrl: string | null
  }
  status: string
  canReserve: boolean
  cannotReserveReason: string | null
  deadline: string
  deadlineStatus: string
  userReservation?: {
    id: string
    status: string
  } | null
}

interface MenuData {
  currentWeek: {
    weekStart: string
    weekEnd: string
    serviceDays: string[]
    menuByDay: Record<string, Record<string, MenuItem[]>>
  }
  nextWeek: {
    weekStart: string
    weekEnd: string
    serviceDays: string[]
    menuByDay: Record<string, Record<string, MenuItem[]>>
  }
}

export function ReservationsContent() {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0) // 0 = current, 1 = next

  const { data: menuData, isLoading } = useQuery<MenuData>({
    queryKey: ["weekly-menu"],
    queryFn: async () => {
      const res = await fetch("/api/menu")
      if (!res.ok) throw new Error("Failed to fetch menu")
      return res.json()
    },
  })

  const createReservation = async (menuItemId: string) => {
    try {
      const res = await fetch("/api/user/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در رزرو")
      toast.success("رزرو با موفقیت انجام شد")
      return data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در رزرو")
      throw error
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      AVAILABLE: { label: "قابل رزرو", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle className="w-3 h-3" /> },
      RESERVED: { label: "رزرو شده", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle className="w-3 h-3" /> },
      CLOSED: { label: "بسته", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: <X className="w-3 h-3" /> },
      PAST: { label: "گذشته", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: <Clock className="w-3 h-3" /> },
    }
    return configs[status] || { label: status, className: "bg-gray-100 text-gray-800", icon: <Clock className="w-3 h-3" /> }
  }

  const weekData = currentWeekIndex === 0 ? menuData?.currentWeek : menuData?.nextWeek

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>منو هفتگی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!weekData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-lg mb-1">منو موجود نیست</h3>
            <p className="text-muted-foreground">منو برای این هفته منتشر نشده است</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const serviceDays = weekData.serviceDays
  const menuByDay = weekData.menuByDay

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Week Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">رزرو غذا</h1>
            <p className="text-muted-foreground">
              هفته از {formatJalaliWithDay(new Date(serviceDays[0]))} تا {formatJalaliWithDay(new Date(serviceDays[4]))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekIndex(0)}
              className={currentWeekIndex === 0 ? "bg-primary text-primary-foreground" : ""}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">این هفته</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekIndex(1)}
              className={currentWeekIndex === 1 ? "bg-primary text-primary-foreground" : ""}
            >
              <span className="hidden sm:inline">هفته بعد</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekly Calendar */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>برنامه غذایی هفته</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                  <span>قابل رزرو</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" />
                  <span>رزرو شده</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                  <span>بسته/گذشته</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-center">
                    <TableHead className="w-32">وعده / روز</TableHead>
                    {serviceDays.map((day, index) => (
                      <TableHead key={day} className="min-w-[150px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{WEEK_DAYS_PERSIAN[index]}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatJalali(new Date(day))}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MEAL_PERIOD_ORDER.map((mealPeriod) => (
                    <TableRow key={mealPeriod} className="text-center">
                      <TableCell className="font-medium text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {MEAL_PERIOD_LABELS[mealPeriod]}
                        </div>
                      </TableCell>
                      {serviceDays.map((day) => {
                        const dateKey = new Date(day).toISOString().split("T")[0]
                        const items = menuByDay[dateKey]?.[mealPeriod] || []
                        const item = items[0] // Take first item for display

                        if (!item || items.length === 0) {
                          return (
                            <TableCell key={day} className="p-2">
                              <div className="text-muted-foreground/50 text-sm">منو منتشر نشده</div>
                            </TableCell>
                          )
                        }

                        const config = getStatusConfig(item.status)
                        const isReservedByUser = item.userReservation?.status === "CONFIRMED" || item.userReservation?.status === "TRANSFERRED"

                        return (
                          <TableCell key={day} className="p-2">
                            <div className="space-y-1">
                              <div className={cn(
                                "p-3 rounded-lg border transition-all cursor-pointer",
                                item.status === "AVAILABLE" && "border-green-200 bg-green-50 hover:bg-green-100 dark:hover:bg-green-900/20",
                                item.status === "RESERVED" && "border-blue-200 bg-blue-50",
                                (item.status === "CLOSED" || item.status === "PAST") && "border-gray-200 bg-gray-50",
                                isReservedByUser && "ring-2 ring-blue-500"
                              )}>
                                <p className="font-medium text-sm truncate">{item.food.name}</p>
                                <p className="text-xs text-muted-foreground">{formatRial(item.food.price)}</p>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {config.icon}
                                  <Badge variant="secondary" className={cn("text-xs", config.className)}>
                                    {config.label}
                                  </Badge>
                                </div>
                              </div>

                              {item.status === "AVAILABLE" && item.canReserve && (
                                <Button
                                  size="sm"
                                  className="w-full mt-1"
                                  onClick={() => createReservation(item.id)}
                                >
                                  <Plus className="w-3 h-3 ml-1" />
                                  رزرو
                                </Button>
                              )}

                              {item.status === "RESERVED" && item.userReservation && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-1"
                                  disabled
                                >
                                  رزرو شده
                                </Button>
                              )}

                              {(item.status === "CLOSED" || item.status === "PAST") && (
                                <div className="text-xs text-muted-foreground text-center py-1">
                                  {item.cannotReserveReason || "غیرقابل رزرو"}
                                </div>
                              )}
                            </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
            <span>قابل رزرو</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" />
            <span>رزرو شده شما</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-900/30" />
            <span>رزرو شده دیگران</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span>مهلت تمام/گذشته</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}