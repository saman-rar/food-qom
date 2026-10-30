"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRial } from "@/lib/currency"
import { formatJalaliWithDay } from "@/lib/date-utils"
import { format } from "date-fns"
import { Calendar, Clock, X, CheckCircle, AlertCircle, Download, Filter, MoreHorizontal, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { RESERVATION_STATUS, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS, MEAL_PERIOD_LABELS } from "@/lib/constants"

interface Reservation {
  id: string
  status: string
  isTransferred: boolean
  createdAt: string
  menuItem: {
    date: string
    mealPeriod: string
    food: {
      name: string
      price: number
    }
  }
}

interface ReservationsResponse {
  reservations: Array<Reservation & { formattedPrice: string; deadline: string; deadlineStatus: string; canCancel: boolean }>
  total: number
  page: number
  limit: number
  totalPages: number
}

export function MyReservationsContent() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("upcoming")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const statusFilter = activeTab === "upcoming" 
    ? ["CONFIRMED", "TRANSFERRED"] 
    : activeTab === "past" 
      ? ["COMPLETED", "EXPIRED"] 
      : ["CANCELLED"]

  const { data, isLoading } = useQuery<ReservationsResponse>({
    queryKey: ["my-reservations", activeTab, page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter.join(","),
      })
      if (search) params.append("search", search)
      const res = await fetch(`/api/user/reservations?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/user/reservations/${reservationId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "خطا در لغو رزرو")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] })
      queryClient.invalidateQueries({ queryKey: ["upcoming-reservations"] })
      queryClient.invalidateQueries({ queryKey: ["wallet-summary"] })
      toast.success("رزرو با موفقیت لغو شد")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "خطا در لغو رزرو")
    },
  })

  const getStatusConfig = (status: string) => {
    return {
      label: RESERVATION_STATUS_LABELS[status as keyof typeof RESERVATION_STATUS_LABELS] || status,
      className: RESERVATION_STATUS_COLORS[status as keyof typeof RESERVATION_STATUS_COLORS] || "bg-gray-100 text-gray-800",
    }
  }

  const getMealPeriodLabel = (period: string) => MEAL_PERIOD_LABELS[period as keyof typeof MEAL_PERIOD_LABELS] || period

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">رزروهای من</h1>
            <p className="text-muted-foreground">مشاهده و مدیریت تاریخچه رزروها</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">آتی</TabsTrigger>
            <TabsTrigger value="past">گذشته</TabsTrigger>
            <TabsTrigger value="cancelled">لغو شده</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Label htmlFor="search" className="sr-only">جستجو</Label>
          <Input
            id="search"
            placeholder="جستجو در رزروها..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            <Filter className="w-4 h-4 ml-2" />
            جستجو
          </Button>
        </form>

        {/* Reservations Table */}
        <Card>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data?.reservations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-lg mb-1">رزروی یافت نشد</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === "upcoming" ? "هیچ رزرو فعالی ندارید" : 
                   activeTab === "past" ? "تاریخچه رزرو خالی است" : "رزرو لغو شده‌ای وجود ندارد"}
                </p>
                {activeTab === "upcoming" && (
                  <Button asChild>
                    <a href="/dashboard/reservations">رزرو غذا</a>
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>غذا</TableHead>
                        <TableHead>تاریخ و وعده</TableHead>
                        <TableHead>قیمت</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead className="text-center">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.reservations.map((reservation) => {
                        const config = getStatusConfig(reservation.status)
                        const isUpcoming = activeTab === "upcoming"
                        const canCancel = isUpcoming && reservation.canCancel && reservation.status === "CONFIRMED"

                        return (
                          <TableRow key={reservation.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{reservation.menuItem.food.name}</p>
                                {reservation.isTransferred && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mt-1">
                                    انتقال یافته
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {formatJalaliWithDay(new Date(reservation.menuItem.date))}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getMealPeriodLabel(reservation.menuItem.mealPeriod)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{reservation.formattedPrice}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={config.className}>
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[180px]">
                                  <DropdownMenuItem>
                                    <Calendar className="w-4 h-4 ml-2" />
                                    جزئیات رزرو
                                  </DropdownMenuItem>
                                  {canCancel && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                                            <Trash2 className="w-4 h-4 ml-2" />
                                            لغو رزرو
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>لغو رزرو</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              آیا از لغو این رزرو اطمینان دارید؟ مبلغ رزرو به کیف پول شما بازگردانده می‌شود.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => cancelMutation.mutate(reservation.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              بله، لغو شود
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      صفحه {data.page} از {data.totalPages} — کل {data.total} رزرو
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        قبلی
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                        disabled={page === data.totalPages}
                      >
                        بعدی
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}