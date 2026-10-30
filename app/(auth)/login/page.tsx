"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        rememberMe: data.rememberMe,
        redirect: false,
      })

      if (result?.error) {
        toast.error("نام کاربری یا رمز عبور اشتباه است")
              console.log("خطا در ورود به sadasdsad")

      } else {
              console.log("خطا در ورود به سیستم")

        toast.success("ورود موفقیت‌آمیز بود")
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.log("خطا در ورود به سیستم")
      toast.error("خطا در ورود به سیستم")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Calendar className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">رزرو</CardTitle>
          <CardDescription>
            سامانه رزرو غذا دانشگاه
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                placeholder="نام کاربری دانشگاهی"
                autoComplete="username"
                {...register("username")}
                disabled={isLoading}
                aria-invalid={!!errors.username}
              />
              {errors.username && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="رمز عبور"
                  autoComplete="current-password"
                  {...register("password")}
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={true}
                  onChange={(e) => {}}
                />
                <span className="text-sm">مرا به یاد بسپار</span>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                "ورود به سیستم"
              )}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="text-center text-sm text-muted-foreground">
            <p>حساب کاربری ندارید؟</p>
            <p>لطفاً با مدیریت دانشگاه تماس بگیرید.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-center text-muted-foreground">
            <strong>حساب‌های تستی:</strong>
            <br />
            student1 / 123456 (دانشجو)
            <br />
            admin1 / 123456 (ادمین)
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}