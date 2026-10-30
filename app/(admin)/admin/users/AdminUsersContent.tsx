"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatRial } from "@/lib/currency"
import { format } from "date-fns"
import { Plus, Search, Edit, Trash2, User, Wallet, MoreHorizontal, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, updateUserSchema, adminAdjustWalletSchema, type CreateUserInput, type UpdateUserInput, type AdminAdjustWalletInput } from "@/lib/validations"
import { USER_ROLES } from "@/lib/constants"

interface User {
  id: string
  username: string
  email: string | null
  fullName: string
  role: string
  isActive: boolean
  createdAt: string
  wallet: { balance: number } | null
  _count: { reservations: number; transactions: number; sentTransfers: number }
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function AdminUsersContent() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null)

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-users", page, search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (search) params.append("search", search)
      if (roleFilter) params.append("role", roleFilter)
      if (statusFilter) params.append("isActive", statusFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const createUserForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: USER_ROLES.USER,
      isActive: true,
    },
  })

  const updateUserForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  })

  const adjustWalletForm = useForm<AdminAdjustWalletInput>({
    resolver: zodResolver(adminAdjustWalletSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در ایجاد کاربر")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("کاربر با موفقیت ایجاد شد")
      createUserForm.reset()
      setShowCreateDialog(false)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در ایجاد کاربر"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserInput }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در به‌روزرسانی")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("کاربر به‌روزرسانی شد")
      setEditingUser(null)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در به‌روزرسانی"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("خطا در غیرفعال کردن")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("کاربر غیرفعال شد")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در غیرفعال کردن"),
  })

  const adjustWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminAdjustWalletInput }) => {
      const res = await fetch(`/api/admin/users/${id}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در تنظیم موجودی")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("موجودی به‌روزرسانی شد")
      setAdjustingUser(null)
      adjustWalletForm.reset()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در تنظیم موجودی"),
  })

  const handleCreate = (data: CreateUserInput) => createMutation.mutate(data)
  const handleUpdate = (data: UpdateUserInput) => updateMutation.mutate({ id: editingUser!.id, data })
  const handleAdjustWallet = (data: AdminAdjustWalletInput) => adjustWalletMutation.mutate({ id: adjustingUser!.id, data })

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">مدیریت کاربران</h1>
            <p className="text-muted-foreground">مشاهده، ویرایش و مدیریت حساب‌های کاربری</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                کاربر جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ایجاد کاربر جدید</DialogTitle>
                <DialogDescription>اطلاعات کاربر را وارد کنید</DialogDescription>
              </DialogHeader>
              <form onSubmit={createUserForm.handleSubmit(handleCreate)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">نام کاربری *</Label>
                  <Input id="username" placeholder="نام کاربری دانشگاهی" {...createUserForm.register("username")} />
                  {createUserForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{createUserForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل</Label>
                  <Input id="email" type="email" placeholder="email@university.ac.ir" {...createUserForm.register("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور *</Label>
                  <Input id="password" type="password" placeholder="حداقل ۶ کاراکتر" {...createUserForm.register("password")} />
                  {createUserForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{createUserForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">نام کامل *</Label>
                  <Input id="fullName" placeholder="نام و نام خانوادگی" {...createUserForm.register("fullName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">نقش</Label>
                  <Select {...createUserForm.register("role")}>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب نقش" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USER_ROLES.USER}>دانشجو</SelectItem>
                      <SelectItem value={USER_ROLES.ADMIN}>مدیر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" {...createUserForm.register("isActive")} className="rounded border-input" />
                  <Label htmlFor="isActive" className="mb-0">فعال</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        در حال ایجاد...
                      </>
                    ) : (
                      "ایجاد کاربر"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">جستجو</Label>
                <Input
                  id="search"
                  placeholder="جستجو در نام کاربری، نام، ایمیل..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="max-w-md"
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="همه نقش‌ها" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">همه نقش‌ها</SelectItem>
                    <SelectItem value={USER_ROLES.USER}>دانشجو</SelectItem>
                    <SelectItem value={USER_ROLES.ADMIN}>مدیر</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="همه وضعیت‌ها" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="true">فعال</SelectItem>
                    <SelectItem value="false">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.users.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-lg mb-1">کاربری یافت نشد</h3>
                <p className="text-muted-foreground">با فیلترهای فعلی کاربری وجود ندارد</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>کاربر</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>موجودی</TableHead>
                        <TableHead>فعالیت</TableHead>
                        <TableHead>تاریخ عضویت</TableHead>
                        <TableHead className="text-center">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                              {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === USER_ROLES.ADMIN ? "default" : "secondary"}>
                              {user.role === USER_ROLES.ADMIN ? "مدیر" : "دانشجو"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "فعال" : "غیرفعال"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.wallet ? (
                              <span className={cn("font-medium", user.wallet.balance < 0 ? "text-red-600" : "text-green-600")}>
                                {formatRial(user.wallet.balance)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              <span>{user._count.reservations} رزرو</span>
                              <span>{user._count.transactions} تراکنش</span>
                              <span>{user._count.sentTransfers} انتقال</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(user.createdAt), "yyyy/MM/dd")}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                updateUserForm.reset({
                                  username: user.username,
                                  email: user.email || "",
                                  fullName: user.fullName,
                                  role: user.role,
                                  isActive: user.isActive,
                                })
                                setEditingUser(user)
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => {
                                setAdjustingUser(user)
                                adjustWalletForm.reset({ userId: user.id, amount: 0, reason: "" })
                              }}>
                                <Wallet className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>غیرفعال کردن کاربر</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      آیا مطمئن هستید؟ کاربر نمی‌تواند وارد شود اما داده‌ها حفظ می‌شوند.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteMutation.mutate(user.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      بله، غیرفعال شود
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      صفحه {data.page} از {data.totalPages} — کل {data.total} کاربر
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>قبلی</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>بعدی</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ویرایش کاربر</DialogTitle>
            </DialogHeader>
            <form onSubmit={updateUserForm.handleSubmit(handleUpdate)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input id="username" {...updateUserForm.register("username")} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input id="email" type="email" {...updateUserForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">نام کامل</Label>
                <Input id="fullName" {...updateUserForm.register("fullName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">نقش</Label>
                <Select {...updateUserForm.register("role")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={USER_ROLES.USER}>دانشجو</SelectItem>
                    <SelectItem value={USER_ROLES.ADMIN}>مدیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...updateUserForm.register("isActive")} className="rounded border-input" />
                <Label htmlFor="isActive" className="mb-0">فعال</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Adjust Wallet Dialog */}
        <Dialog open={!!adjustingUser} onOpenChange={(open) => !open && setAdjustingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تنظیم موجودی کیف پول</DialogTitle>
              <DialogDescription>
                کاربر: {adjustingUser?.fullName} (@{adjustingUser?.username})
                <br />
                موجودی فعلی: {adjustingUser?.wallet ? formatRial(adjustingUser.wallet.balance) : "۰ ریال"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={adjustWalletForm.handleSubmit(handleAdjustWallet)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">مبلغ (ریال)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="مبلغ مثبت برای افزایش، منفی برای کاهش"
                  {...adjustWalletForm.register("amount", { valueAsNumber: true })}
                />
                {adjustWalletForm.formState.errors.amount && (
                  <p className="text-sm text-destructive">{adjustWalletForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">دلیل *</Label>
                <Input
                  id="reason"
                  placeholder="توضیح دلیل تنظیم موجودی"
                  {...adjustWalletForm.register("reason")}
                />
                {adjustWalletForm.formState.errors.reason && (
                  <p className="text-sm text-destructive">{adjustWalletForm.formState.errors.reason.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={adjustWalletMutation.isPending}>
                  {adjustWalletMutation.isPending ? "در حال اعمال..." : "اعمال تغییرات"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}