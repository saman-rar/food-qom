"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatRial } from "@/lib/currency"
import { formatJalaliWithDay } from "@/lib/date-utils"
import { format } from "date-fns"
import { Users, SwapHorizontal, Plus, X, CheckCircle, AlertCircle, ArrowRight, Search, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { MAX_TRANSFERS_PER_MONTH } from "@/lib/constants"

interface TransferableReservation {
  id: string
  menuItem: {
    date: string
    mealPeriod: string
    food: {
      name: string
      price: number
    }
  }
  canTransfer: boolean
  deadline: string
}

interface Transfer {
  id: string
  createdAt: string
  sender?: { id: string; username: string; fullName: string }
  recipient?: { id: string; username: string; fullName: string }
  reservation: {
    menuItem: {
      date: string
      mealPeriod: string
      food: { name: string }
    }
  }
}

interface TransfersResponse {
  transfers: Transfer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface Quota {
  used: number
  limit: number
  remaining: number
  month: string
}

export function TransfersContent() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("available")
  const [page, setPage] = useState(1)
  const [recipientUsername, setRecipientUsername] = useState("")
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)

  const { data: availableReservations, isLoading: availableLoading } = useQuery<TransferableReservation[]>({
    queryKey: ["transferable-reservations"],
    queryFn: async () => {
      const res = await fetch("/api/user/transfers?action=available")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      return data.reservations
    },
    enabled: activeTab === "available",
  })

  const { data: quota } = useQuery<Quota>({
    queryKey: ["transfer-quota"],
    queryFn: async () => {
      const res = await fetch("/api/user/transfers?action=quota")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const { data: sentTransfers, isLoading: sentLoading } = useQuery<TransfersResponse>({
    queryKey: ["sent-transfers", page],
    queryFn: async () => {
      const res = await fetch(`/api/user/transfers?action=sent&page=${page}&limit=10`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    enabled: activeTab === "sent",
  })

  const { data: receivedTransfers, isLoading: receivedLoading } = useQuery<TransfersResponse>({
    queryKey: ["received-transfers", page],
    queryFn: async () => {
      const res = await fetch(`/api/user/transfers?action=received&page=${page}&limit=10`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    enabled: activeTab === "received",
  })

  const transferMutation = useMutation({
    mutationFn: async ({ reservationId, recipientUsername }: { reservationId: string; recipientUsername: string }) => {
      const res = await fetch("/api/user/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, recipientUsername }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "خطا در انتقال")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferable-reservations"] })
      queryClient.invalidateQueries({ queryKey: ["sent-transfers"] })
      queryClient.invalidateQueries({ queryKey: ["received-transfers"] })
      queryClient.invalidateQueries({ queryKey: ["transfer-quota"] })
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] })
      queryClient.invalidateQueries({ queryKey: ["upcoming-reservations"] })
      toast.success("رزرو با موفقیت انتقال یافت")
      setShowTransferDialog(false)
      setRecipientUsername("")
      setSelectedReservationId(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "خطا در انتقال")
    },
  })

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientUsername.trim()) {
      toast.error("نام کاربری گیرنده را وارد کنید")
      return
    }
    if (!selectedReservationId) return
    transferMutation.mutate({ reservationId: selectedReservationId, recipientUsername: recipientUsername.trim() })
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">انتقال رزرو</h1>
            <p className="text-muted-foreground">انتقال وعده‌های غذایی رزرو شده به کاربران دیگر</p>
          </div>
        </div>

        {/* Quota Card */}
        <Card className="border-blue-200 dark:border-blue-900/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">سهمیه انتقال ماهانه</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-blue-600">
                      {quota?.remaining || 0} / {quota?.limit || MAX_TRANSFERS_PER_MONTH}
                    </span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      ماه {quota?.month || "—"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {quota?.used || 0} انتقال انجام شده در این ماه
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">قابل انتقال</TabsTrigger>
            <TabsTrigger value="sent">ارسال شده</TabsTrigger>
            <TabsTrigger value="received">دریافتی</TabsTrigger>
          </TabsList>

          {/* Available Reservations */}
          <TabsContent value="available" className="space-y-4">
            {quota && quota.remaining === 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled>
                    <AlertCircle className="w-4 h-4 ml-2 text-orange-500" />
                    سهمیه انتقال ماهانه تمام شده است
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>سهمیه تمام شده</AlertDialogTitle>
                    <AlertDialogDescription>
                      شما در این ماه ({quota.month}) حداکثر {MAX_TRANSFERS_PER_MONTH} انتقال انجام داده‌اید. 
                      سهمیه در اول ماه بعد بازنشانی می‌شود.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setActiveTab("sent")}>مشاهده انتقال‌ها</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {availableLoading ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </CardContent>
              </Card>
            ) : availableReservations?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <SwapHorizontal className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-medium text-lg mb-1">رزرو قابل انتقالی وجود ندارد</h3>
                  <p className="text-muted-foreground mb-4">
                    برای انتقال رزرو، ابتدا باید غذا رزرو کنید و مهلت انتقال آن تمام نشده باشد.
                  </p>
                  <Button asChild>
                    <a href="/dashboard/reservations">برو به رزرو غذا</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableReservations?.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <SwapHorizontal className="w-5 h-5 text-muted-foreground" />
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
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReservationId(reservation.id)
                            setShowTransferDialog(true)
                          }}
                          disabled={!reservation.canTransfer || transferMutation.isPending}
                        >
                          <ArrowRight className="w-3 h-3 ml-1" />
                          انتقال
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Transfer Dialog */}
            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>انتقال رزرو</DialogTitle>
                  <DialogDescription>
                    نام کاربری گیرنده را وارد کنید. رزرو از حساب شما کسر و به حساب گیرنده اضافه می‌شود.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTransfer}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient">نام کاربری گیرنده</Label>
                      <Input
                        id="recipient"
                        placeholder="مثال: student123"
                        value={recipientUsername}
                        onChange={(e) => setRecipientUsername(e.target.value)}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        گیرنده باید حساب کاربری فعال داشته باشد.
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium">قوانین انتقال:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1 text-muted-foreground">
                        <li>حداکثر {MAX_TRANSFERS_PER_MONTH} انتقال در ماه</li>
                        <li>امکان انتقال تا قبل از مهلت رزرو (۲ روز قبل از ۱۲:۰۰)</li>
                        <li>مبلغ رزرو برای گیرنده رایگان است</li>
                        <li>شما دیگر مالک رزرو نخواهید بود</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={transferMutation.isPending}>
                      {transferMutation.isPending ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          در حال انتقال...
                        </>
                      ) : (
                        "تایید انتقال"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Sent Transfers */}
          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>انتقال‌های ارسال شده</CardTitle>
              </CardHeader>
              <CardContent>
                {sentLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : sentTransfers?.transfers.length === 0 ? (
                  <div className="text-center py-8">
                    <SwapHorizontal className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">هیچ انتقال ارسالی وجود ندارد</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>گیرنده</TableHead>
                            <TableHead>غذا</TableHead>
                            <TableHead>تاریخ و وعده</TableHead>
                            <TableHead>تاریخ انتقال</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sentTransfers?.transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{transfer.recipient?.fullName || "—"}</p>
                                  <p className="text-sm text-muted-foreground">@{transfer.recipient?.username || "—"}</p>
                                </div>
                              </TableCell>
                              <TableCell>{transfer.reservation.menuItem.food.name}</TableCell>
                              <TableCell>
                                <div>
                                  <p>{formatJalaliWithDay(new Date(transfer.reservation.menuItem.date))}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {getMealPeriodLabel(transfer.reservation.menuItem.mealPeriod)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{format(new Date(transfer.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {sentTransfers && sentTransfers.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          صفحه {sentTransfers.page} از {sentTransfers.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>قبلی</Button>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(sentTransfers.totalPages, p + 1))} disabled={page === sentTransfers.totalPages}>بعدی</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Transfers */}
          <TabsContent value="received" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>انتقال‌های دریافتی</CardTitle>
              </CardHeader>
              <CardContent>
                {receivedLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : receivedTransfers?.transfers.length === 0 ? (
                  <div className="text-center py-8">
                    <SwapHorizontal className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">هیچ انتقال دریافتی وجود ندارد</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>فرستنده</TableHead>
                            <TableHead>غذا</TableHead>
                            <TableHead>تاریخ و وعده</TableHead>
                            <TableHead>تاریخ انتقال</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receivedTransfers?.transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{transfer.sender?.fullName || "—"}</p>
                                  <p className="text-sm text-muted-foreground">@{transfer.sender?.username || "—"}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  {transfer.reservation.menuItem.food.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p>{formatJalaliWithDay(new Date(transfer.reservation.menuItem.date))}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {getMealPeriodLabel(transfer.reservation.menuItem.mealPeriod)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{format(new Date(transfer.createdAt), "yyyy/MM/dd HH:mm")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {receivedTransfers && receivedTransfers.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          صفحه {receivedTransfers.page} از {receivedTransfers.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>قبلی</Button>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(receivedTransfers.totalPages, p + 1))} disabled={page === receivedTransfers.totalPages}>بعدی</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}