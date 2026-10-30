"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations"
import { formatJalaliWithDay } from "@/lib/date-utils"
import { User, Lock, Bell, Palette, Moon, Sun, Save, Loader2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth, useUser } from "@/hooks/use-auth"
import { signOut } from "next-auth/react"

export function SettingsContent() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      const res = await fetch("/api/user/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در تغییر رمز عبور")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("رمز عبور با موفقیت تغییر یافت")
      passwordForm.reset()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "خطا در تغییر رمز عبور")
    },
  })

  const handleChangePassword = (data: ChangePasswordInput) => {
    changePasswordMutation.mutate(data)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">تنظیمات</h1>
          <p className="text-muted-foreground">مدیریت حساب کاربری و تنظیمات شخصی</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">پروفایل</TabsTrigger>
            <TabsTrigger value="security">امنیت</TabsTrigger>
            <TabsTrigger value="preferences">ترجیحات</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>مشخصات کاربری</CardTitle>
                <CardDescription>اطلاعات حساب کاربری شما</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user?.image || ""} alt={user?.fullName || ""} />
                    <AvatarFallback className="text-2xl">{user?.fullName?.[0] || "ک"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{user?.fullName}</h3>
                    <p className="text-muted-foreground">@{user?.username}</p>
                    <Badge variant="secondary" className="mt-2">
                      {user?.role === "ADMIN" ? "مدیر سیستم" : "دانشجو"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>نام کامل</Label>
                    <Input value={user?.fullName || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>نام کاربری</Label>
                    <Input value={user?.username || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>ایمیل</Label>
                    <Input value={user?.email || "تنظیم نشده"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ عضویت</Label>
                    <Input value={user?.createdAt ? formatJalaliWithDay(new Date(user.createdAt)) : "—"} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <User className="w-5 h-5" />
                  خروج از حساب کاربری
                </CardTitle>
                <CardDescription>از تمام دستگاه‌ها خارج شوید</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
                  خروج از سیستم
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تغییر رمز عبور</CardTitle>
                <CardDescription>رمز عبور خود را به‌روزرسانی کنید</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="رمز عبور فعلی"
                        {...passwordForm.register("currentPassword")}
                        disabled={changePasswordMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive" role="alert">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">رمز عبور جدید</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
                        {...passwordForm.register("newPassword")}
                        disabled={changePasswordMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive" role="alert">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="تکرار رمز عبور جدید"
                        {...passwordForm.register("confirmPassword")}
                        disabled={changePasswordMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive" role="alert">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        در حال تغییر...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        ذخیره تغییرات
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>جلسات فعال</CardTitle>
                <CardDescription>مدیریت دستگاه‌های وارد شده</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-medium text-lg mb-1">مدیریت جلسات</h3>
                  <p className="text-muted-foreground mb-4">
                    این قابلیت در نسخه آینده اضافه خواهد شد.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>نمایش</CardTitle>
                <CardDescription>تنظیمات ظاهری برنامه</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">حالت ظاهری</p>
                      <p className="text-sm text-muted-foreground">انتخاب تم روشن یا تیره</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Sun className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Moon className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Palette className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">اعلان‌ها</p>
                      <p className="text-sm text-muted-foreground">دریافت یادآوری‌های رزرو و موعدها</p>
                    </div>
                  </div>
                  <Button variant="outline">مدیریت</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>زبان و منطقه</CardTitle>
                <CardDescription>تنظیمات زبان و تقویم</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <span className="text-xl">🇮🇷</span>
                    </div>
                    <div>
                      <p className="font-medium">فارسی (ایران)</p>
                      <p className="text-sm text-muted-foreground">زبان پیش‌فرض و تقویم جلالی</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}