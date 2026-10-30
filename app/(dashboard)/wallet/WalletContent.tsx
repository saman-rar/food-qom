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
import { format } from "date-fns"
import { CreditCard, Plus, Download, Filter, ArrowUp, ArrowDown, Wallet as WalletIcon, History, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/constants"
import Link from "next/link"

interface WalletSummary {
  balance: number
  formattedBalance: string
  totalDeposits: number
  totalSpent: number
  recentTransactions: any[]
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  createdAt: string
  formattedAmount: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function WalletContent() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")
  const [page, setPage] = useState(1)
  const [rechargeAmount, setRechargeAmount] = useState("")
  const [showRechargeDialog, setShowRechargeDialog] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useQuery<WalletSummary>({
    queryKey: ["wallet-summary"],
    queryFn: async () => {
      const res = await fetch("/api/user/wallet?action=summary")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<TransactionsResponse>({
    queryKey: ["wallet-transactions", page],
    queryFn: async () => {
      const res = await fetch(`/api/user/wallet?page=${page}&limit=20`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const rechargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/user/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "خطا در ایجاد پرداخت")
      }
      return res.json()
    },
    onSuccess: (data) => {
      setShowRechargeDialog(false)
      setRechargeAmount("")
      window.location.href = data.gatewayUrl
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "خطا در ایجاد پرداخت")
    },
  })

  const getTransactionConfig = (type: string) => {
    const labels: Record<string, string> = {
      CREDIT_DEPOSIT: "شارژ کیف پول",
      MEAL_RESERVATION: "رزرو غذا",
      RESERVATION_REFUND: "استرداد رزرو",
      ADMIN_ADJUSTMENT: "تنظیم ادمین",
      TRANSFER_INCOMING: "دریافت انتقال",
      TRANSFER_OUTGOING: "ارسال انتقال",
    }
    const icons: Record<string, React.ReactNode> = {
      CREDIT_DEPOSIT: <ArrowUp className="w-4 h-4 text-green-600" />,
      MEAL_RESERVATION: <ArrowDown className="w-4 h-4 text-red-600" />,
      RESERVATION_REFUND: <ArrowUp className="w-4 h-4 text-green-600" />,
      ADMIN_ADJUSTMENT: <WalletIcon className="w-4 h-4 text-blue-600" />,
      TRANSFER_INCOMING: <ArrowUp className="w-4 h-4 text-blue-600" />,
      TRANSFER_OUTGOING: <ArrowDown className="w-4 h-4 text-orange-600" />,
    }
    const isPositive = ["CREDIT_DEPOSIT", "RESERVATION_REFUND", "ADMIN_ADJUSTMENT", "TRANSFER_INCOMING"].includes(type)
    
    return {
      label: labels[type] || type,
      icon: icons[type] || <WalletIcon className="w-4 h-4" />,
      isPositive,
    }
  }

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(rechargeAmount.replace(/,/g, ""))
    if (isNaN(amount) || amount < 10000) {
      toast.error("مبلغ باید حداقل ۱۰,۰۰۰ ریال باشد")
      return
    }
    rechargeMutation.mutate(amount)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">کیف پول</h1>
            <p className="text-muted-foreground">مدیریت موجودی و تراکنش‌ها</p>
          </div>
          <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                شارژ کیف پول
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>شارژ کیف پول</DialogTitle>
                <DialogDescription>
                  مبلغ مورد نظر را وارد کنید. حداقل مبلغ شارژ ۱۰,۰۰۰ ریال است.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRecharge}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">مبلغ (ریال)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="مبلغ را وارد کنید"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      min={10000}
                      max={10000000}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[10000, 50000, 100000, 200000, 500000, 1000000].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() => setRechargeAmount(amt.toString())}
                      >
                        {formatRial(amt)}
                      </Button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={rechargeMutation.isPending}>
                    {rechargeMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                        در حال پردازش...
                      </>
                    ) : (
                      "پرداخت"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">موجودی فعلی</p>
                  {summaryLoading ? (
                    <Skeleton className="h-10 w-48 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{summary?.formattedBalance || "۰ ریال"}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">کل واریزها</p>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-green-600 mt-1">+{formatRial(summary?.totalDeposits || 0)}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <ArrowUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">کل هزینه‌ها</p>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-red-600 mt-1">{formatRial(summary?.totalSpent || 0)}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <ArrowDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">نمای کلی</TabsTrigger>
            <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>تراکنش‌های اخیر</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : summary?.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">هنوز تراکنشی ثبت نشده است</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary?.recentTransactions.map((tx: any) => {
                      const config = getTransactionConfig(tx.type)
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              {config.icon}
                            </div>
                            <div>
                              <p className="font-medium">{config.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(tx.createdAt), "yyyy/MM/dd HH:mm")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-bold", config.isPositive ? "text-green-600" : "text-red-600")}>
                              {config.isPositive ? "+" : ""}{formatRial(tx.amount)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 ml-2" />
                      خروجی اکسل
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : transactionsData?.transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">هیچ تراکنشی یافت نشد</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>تاریخ</TableHead>
                            <TableHead>نوع تراکنش</TableHead>
                            <TableHead>توضیحات</TableHead>
                            <TableHead className="text-right">مبلغ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionsData?.transactions.map((tx) => {
                            const config = getTransactionConfig(tx.type)
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="whitespace-nowrap">
                                  {format(new Date(tx.createdAt), "yyyy/MM/dd HH:mm")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className={cn(
                                    config.isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  )}>
                                    {config.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell className="text-right font-bold" style={{ color: config.isPositive ? "var(--color-green-600)" : "var(--color-red-600)" }}>
                                  {config.isPositive ? "+" : ""}{tx.formattedAmount}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {transactionsData && transactionsData.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          صفحه {transactionsData.page} از {transactionsData.totalPages} — کل {transactionsData.total} تراکنش
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
                            onClick={() => setPage(p => Math.min(transactionsData.totalPages, p + 1))}
                            disabled={page === transactionsData.totalPages}
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}