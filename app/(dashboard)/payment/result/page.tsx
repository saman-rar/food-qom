"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatRial } from "@/lib/currency"
import { CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Wallet, Home } from "lucide-react"
import Link from "next/link"

interface PaymentResult {
  status: "success" | "failed" | "cancelled"
  reference: string
  amount: number
}

export default function PaymentResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const status = searchParams.get("status") as "success" | "failed" | "cancelled"
    const reference = searchParams.get("reference")
    const amount = searchParams.get("amount")

    if (!status || !reference) {
      router.push("/dashboard/wallet")
      return
    }

    setResult({
      status,
      reference,
      amount: parseInt(amount || "0"),
    })
    setIsLoading(false)
  }, [searchParams, router])

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      title: string; 
      description: string; 
      icon: React.ReactNode; 
      color: string;
      bgColor: string;
    }> = {
      success: {
        title: "پرداخت با موفقیت انجام شد",
        description: "مبلغ به کیف پول شما واریز گردید",
        icon: <CheckCircle className="w-12 h-12 text-green-600" />,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-900/20",
      },
      failed: {
        title: "پرداخت ناموفق بود",
        description: "تراکنش با خطا مواجه شد، مبلغی کسر نشده است",
        icon: <XCircle className="w-12 h-12 text-red-600" />,
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-900/20",
      },
      cancelled: {
        title: "پرداخت لغو شد",
        description: "شما از انجام پرداخت انصراف دادید",
        icon: <Clock className="w-12 h-12 text-orange-600" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
      },
    }
    return configs[status] || configs.cancelled
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">در حال بررسی وضعیت پرداخت...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (!result) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <XCircle className="w-8 h-8 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">اطلاعات پرداخت یافت نشد</h2>
            <p className="text-muted-foreground mb-6">لطفاً از کیف پول تلاش کنید</p>
            <Button asChild>
              <Link href="/dashboard/wallet">بازگشت به کیف پول</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const config = getStatusConfig(result.status)

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6">
        {/* Status Card */}
        <Card className={config.bgColor}>
          <CardContent className="py-12 text-center">
            <div className="mb-4">{config.icon}</div>
            <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
            <p className="text-muted-foreground mb-6">{config.description}</p>
            
            <div className="space-y-3 p-4 bg-background rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">مبلغ</span>
                <span className="font-bold">{formatRial(result.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">مرجع تراکنش</span>
                <span className="font-mono text-xs">{result.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">تاریخ</span>
                <span className="font-medium">{new Date().toLocaleDateString("fa-IR")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link href="/dashboard/wallet">
              <Wallet className="w-4 h-4 ml-2" />
              مشاهده کیف پول
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">
              <Home className="w-4 h-4 ml-2" />
              داشبورد
            </Link>
          </Button>
        </div>

        {/* Info */}
        <Card>
          <CardContent className="pt-6">
            <Separator className="mb-4" />
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>این تراکنش در تاریخچه کیف پول شما ثبت شده است</p>
              <p>در صورت بروز هرگونه مشکل با پشتیبانی تماس بگیرید</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}