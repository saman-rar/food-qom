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
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatRial } from "@/lib/currency"
import { format } from "date-fns"
import { Plus, Search, Edit, Trash2, Utensils, Image, Loader2, Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createFoodSchema, updateFoodSchema, type CreateFoodInput, type UpdateFoodInput } from "@/lib/validations"

interface Food {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  price: number
  category: string | null
  isActive: boolean
  createdAt: string
  _count: { menuItems: number }
}

interface FoodsResponse {
  foods: Food[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function AdminFoodsContent() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { data, isLoading } = useQuery<FoodsResponse>({
    queryKey: ["admin-foods", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (search) params.append("search", search)
      if (statusFilter) params.append("isActive", statusFilter)
      const res = await fetch(`/api/admin/foods?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const createFoodForm = useForm<CreateFoodInput>({
    resolver: zodResolver(createFoodSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const updateFoodForm = useForm<UpdateFoodInput>({
    resolver: zodResolver(updateFoodSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateFoodInput) => {
      const res = await fetch("/api/admin/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در ایجاد غذا")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-foods"] })
      toast.success("غذا با موفقیت ایجاد شد")
      createFoodForm.reset()
      setShowCreateDialog(false)
      setPreviewImage(null)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در ایجاد غذا"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFoodInput }) => {
      const res = await fetch(`/api/admin/foods/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["admin-foods"] })
      toast.success("غذا به‌روزرسانی شد")
      setEditingFood(null)
      setPreviewImage(null)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در به‌روزرسانی"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/foods/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("خطا در حذف")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-foods"] })
      toast.success("غذا حذف/غیرفعال شد")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در حذف"),
  })

  const handleCreate = (data: CreateFoodInput) => createMutation.mutate(data)
  const handleUpdate = (data: UpdateFoodInput) => updateMutation.mutate({ id: editingFood!.id, data })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPreviewImage(result)
        if (editingFood) {
          updateFoodForm.setValue("imageUrl", result)
        } else {
          createFoodForm.setValue("imageUrl", result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">مدیریت غذاها</h1>
            <p className="text-muted-foreground">افزودن، ویرایش و مدیریت موارد منو</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                غذا جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>افزودن غذا جدید</DialogTitle>
                <DialogDescription>اطلاعات غذا را وارد کنید</DialogDescription>
              </DialogHeader>
              <form onSubmit={createFoodForm.handleSubmit(handleCreate)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">نام غذا *</Label>
                  <Input id="name" placeholder="مثال: قرمه‌سبزی با برنج" {...createFoodForm.register("name")} />
                  {createFoodForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{createFoodForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">توضیحات</Label>
                  <Input id="description" placeholder="توضیحات غذا (اختیاری)" {...createFoodForm.register("description")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">قیمت (ریال) *</Label>
                  <Input id="price" type="number" placeholder="مثال: 50000" {...createFoodForm.register("price", { valueAsNumber: true })} min="0" />
                  {createFoodForm.formState.errors.price && (
                    <p className="text-sm text-destructive">{createFoodForm.formState.errors.price.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">دسته‌بندی</Label>
                  <Input id="category" placeholder="مثال: غذاهای سنتی" {...createFoodForm.register("category")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">تصویر</Label>
                  <div className="flex gap-2">
                    <Input
                      id="imageUrl"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                    {previewImage && (
                      <button
                        type="button"
                        onClick={() => { setPreviewImage(null); createFoodForm.setValue("imageUrl", ""); }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                  {previewImage && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" {...createFoodForm.register("isActive")} className="rounded border-input" />
                  <Label htmlFor="isActive" className="mb-0">فعال و قابل نمایش</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        در حال ایجاد...
                      </>
                    ) : (
                      "ایجاد غذا"
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
                  placeholder="جستجو در نام، دسته‌بندی..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="max-w-md"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="همه وضعیت‌ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Foods Table */}
        <Card>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : data?.foods.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-lg mb-1">غذایی یافت نشد</h3>
                <p className="text-muted-foreground mb-4">هنوز غذایی اضافه نشده است</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  اولین غذا را اضافه کنید
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تصویر</TableHead>
                        <TableHead>نام غذا</TableHead>
                        <TableHead>دسته‌بندی</TableHead>
                        <TableHead>قیمت</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>استفاده در منو</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead className="text-center">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.foods.map((food) => (
                        <TableRow key={food.id}>
                          <TableCell>
                            {food.imageUrl ? (
                              <img src={food.imageUrl} alt={food.name} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <Utensils className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{food.name}</p>
                            {food.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">{food.description}</p>
                            )}
                          </TableCell>
                          <TableCell>{food.category || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="font-medium">{formatRial(food.price)}</TableCell>
                          <TableCell>
                            <Badge variant={food.isActive ? "default" : "secondary"}>
                              {food.isActive ? "فعال" : "غیرفعال"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{food._count.menuItems} آیتم منو</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{format(new Date(food.createdAt), "yyyy/MM/dd")}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                updateFoodForm.reset({
                                  name: food.name,
                                  description: food.description || "",
                                  price: food.price,
                                  category: food.category || "",
                                  imageUrl: food.imageUrl || "",
                                  isActive: food.isActive,
                                })
                                setPreviewImage(food.imageUrl || null)
                                setEditingFood(food)
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف غذا</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {food._count.menuItems > 0 
                                        ? `این غذا در ${food._count.menuItems} آیتم منو استفاده شده است. در صورت حذف، غیرفعال خواهد شد.` 
                                        : "آیا از حذف این غذا اطمینان دارید؟"}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteMutation.mutate(food.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      بله، حذف/غیرفعال شود
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
                      صفحه {data.page} از {data.totalPages} — کل {data.total} غذا
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

        {/* Edit Food Dialog */}
        <Dialog open={!!editingFood} onOpenChange={(open) => { if (!open) { setEditingFood(null); setPreviewImage(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ویرایش غذا</DialogTitle>
            </DialogHeader>
            <form onSubmit={updateFoodForm.handleSubmit(handleUpdate)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام غذا *</Label>
                <Input id="name" {...updateFoodForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">توضیحات</Label>
                <Input id="description" {...updateFoodForm.register("description")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">قیمت (ریال) *</Label>
                <Input id="price" type="number" {...updateFoodForm.register("price", { valueAsNumber: true })} min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">دسته‌بندی</Label>
                <Input id="category" {...updateFoodForm.register("category")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">تصویر</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="flex-1"
                  />
                  {previewImage && (
                    <button
                      type="button"
                      onClick={() => { setPreviewImage(null); updateFoodForm.setValue("imageUrl", ""); }}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                    >
                      حذف
                    </button>
                  )}
                </div>
                {previewImage && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...updateFoodForm.register("isActive")} className="rounded border-input" />
                <Label htmlFor="isActive" className="mb-0">فعال و قابل نمایش</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}