"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatRial } from "@/lib/currency"
import { CreditCard, Loader2, CheckCircle, XCircle, AlertCircle, Shield, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface PaymentData {
  payment: {
    id: string
    reference: string
    amount: number
    status: string
  }
  user: {
    id: string
    fullName: string
  }
}

export default function PaymentGatewayPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reference = searchParams.get("reference")
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardHolder, setCardHolder] = useState("")

  useEffect(() => {
    if (!reference) {
      toast.error("مرجع پرداخت یافت نشد")
      router.push("/dashboard/wallet")
      return
    }

    fetch(`/api/payment/gateway?reference=${reference}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error)
          router.push("/dashboard/wallet")
        } else {
          setPaymentData(data)
        }
      })
      .catch(() => {
        toast.error("خطا در دریافت اطلاعات پرداخت")
        router.push("/dashboard/wallet")
      })
      .finally(() => setIsLoading(false))
  }, [reference, router])

  const handlePayment = async (action: "success" | "fail" | "cancel") => {
    if (!reference) return
    setProcessing(true)

    try {
      const res = await fetch("/api/payment/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, action }),
      })
      const data = await res.json()

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (error) {
      toast.error("خطا در پردازش پرداخت")
    } finally {
      setProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "")
    const groups = digits.match(/.{1,4}/g) || []
    return groups.join(" ")
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length >= 2) {
      return digits.slice(0, 2) + "/" + digits.slice(2, 4)
    }
    return digits
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">در حال بارگذاری درگاه پرداخت...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (!paymentData) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">اطلاعات پرداخت یافت نشد</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/wallet">بازگشت به کیف پول</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const { payment, user } = paymentData

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">درگاه پرداخت</h1>
            <p className="text-muted-foreground">شارژ کیف پول - مرجع: {payment.reference}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>محیط امن و شبیه‌سازی شده</span>
          </div>
        </div>

        {/* Warning Banner */}
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong>توجه:</strong> این یک درگاه پرداخت <strong>شبیه‌سازی شده (Mock)</strong> است. 
            هیچ اطلاعات بانکی واقعی درخواست نمی‌شود. برای تست، می‌توانید هر اطلاعات کارت معتبری وارد کنید.
          </AlertDescription>
        </Alert>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>خلاصه پرداخت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">مبلغ قابل پرداخت</p>
                  <p className="text-sm text-muted-foreground">شارژ کیف پول</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-primary">{formatRial(payment.amount)}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">نام صاحب کارت</p>
                <p className="font-medium">{user.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">مرجع پرداخت</p>
                <p className="font-medium font-mono text-xs">{payment.reference}</p>
              </div>
              <div>
                <p className="text-muted-foreground">وضعیت</p>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  در انتظار پرداخت
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">مهلت پرداخت</p>
                <p className="font-medium text-orange-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ۱۰ دقیقه
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Form */}
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات کارت</CardTitle>
            <CardDescription>اطلاعات کارت خود را وارد کنید (شبیه‌سازی)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">شماره کارت</Label>
              <Input
                id="cardNumber"
                placeholder="۶۰۳۷ ۹۹۷۷ ۸۸۵۵ ۴۴۳۳"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                inputMode="numeric"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">تاریخ انقضا</Label>
                <Input
                  id="expiryDate"
                  placeholder="۱۲/۲۵"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV2</Label>
                <Input
                  id="cvv"
                  placeholder="۱۲۳"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  inputMode="numeric"
                  type="password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardHolder">نام صاحب کارت</Label>
              <Input
                id="cardHolder"
                placeholder="نام و نام خانوادگی انگلیسی"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.toUpperCase())}
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handlePayment("success")}
                disabled={processing || !cardNumber || !expiryDate || !cvv}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    پرداخت موفق
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handlePayment("fail")}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 ml-2" />
                پرداخت ناموفق
              </Button>

              <Button
                variant="ghost"
                className="text-orange-600 hover:bg-orange-50"
                onClick={() => handlePayment("cancel")}
                disabled={processing}
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Cards */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              کارت‌های تستی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 bg-muted/50 rounded font-mono">
                ۶۰۳۷ ۹۹۷۷ ۸۸۵۵ ۴۴۳۳ (موفق)
              </div>
              <div className="p-3 bg-muted/50 rounded font-mono">
                ۶۰۳۷ ۹۹۷۷ ۸۸۵۵ ۴۴۴۴ (ناموفق)
              </div>
              <div className="p-3 bg-muted/50 rounded font-mono">
                هر کارت ۱۶ رقمی (موفق)
              </div>
              <div className="p-3 bg-muted/50 rounded font-mono">
                CVV: هر ۳ رقم / تاریخ: آینده
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}