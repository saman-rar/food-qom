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
import { formatJalaliWithDay, getWeekStart, getWeekEnd, getServiceDaysForWeek, addDays } from "@/lib/date-utils"
import { format } from "date-fns"
import { Plus, Search, Edit, Trash2, Utensils, Calendar, ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createMenuItemSchema, type CreateMenuItemInput } from "@/lib/validations"
import { MEAL_PERIODS, MEAL_PERIOD_ORDER, MEAL_PERIOD_LABELS, WEEK_DAYS_PERSIAN } from "@/lib/constants"

interface Food {
  id: string
  name: string
  price: number
}

interface MenuItem {
  id: string
  date: string
  mealPeriod: string
  isAvailable: boolean
  food: Food
  _count: { reservations: number }
}

interface MenuData {
  weekStart: string
  weekEnd: string
  serviceDays: string[]
  menuByDay: Record<string, Record<string, MenuItem[]>>
}

interface MenuItemWithFood extends MenuItem {
  food: Food
}

export function AdminMenuContent() {
  const queryClient = useQueryClient()
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const now = new Date()
    const weekStart = getWeekStart(now)
    return weekStart.toISOString().split("T")[0]
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>("")
  const [availableFoods, setAvailableFoods] = useState<Food[]>([])

  const { data: menuData, isLoading: menuLoading } = useQuery<MenuData>({
    queryKey: ["admin-menu", currentWeekStart],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu?week=${currentWeekStart}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const { data: foodsData } = useQuery<{ foods: Food[] }>({
    queryKey: ["admin-foods-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/menu?action=foods")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    onSuccess: (data) => setAvailableFoods(data.foods),
  })

  const { data: stats } = useQuery({
    queryKey: ["admin-menu-stats", currentWeekStart],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu?action=stats&week=${currentWeekStart}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const createMenuItemForm = useForm<CreateMenuItemInput>({
    resolver: zodResolver(createMenuItemSchema),
    defaultValues: {
      isAvailable: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateMenuItemInput) => {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در افزودن آیتم منو")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] })
      queryClient.invalidateQueries({ queryKey: ["admin-menu-stats"] })
      toast.success("آیتم منو با موفقیت افزوده شد")
      createMenuItemForm.reset()
      setShowCreateDialog(false)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در افزودن"),
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ foodId, date, mealPeriod }: { foodId: string; date: string; mealPeriod: string }) => {
      const res = await fetch(`/api/admin/menu?foodId=${foodId}&date=${date}&mealPeriod=${mealPeriod}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در حذف")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] })
      queryClient.invalidateQueries({ queryKey: ["admin-menu-stats"] })
      toast.success("آیتم منو حذف شد")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در حذف"),
  })

  const bulkCreateMutation = useMutation({
    mutationFn: async (data: { weekStart: string; items: CreateMenuItemInput[] }) => {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", ...data }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "خطا در ایجاد منوی هفتگی")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] })
      queryClient.invalidateQueries({ queryKey: ["admin-menu-stats"] })
      toast.success("منوی هفتگی با موفقیت ایجاد شد")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "خطا در ایجاد منوی هفتگی"),
  })

  const weekStartDate = new Date(currentWeekStart)
  const weekEndDate = getWeekEnd(weekStartDate)
  const serviceDays = getServiceDaysForWeek(weekStartDate)
  const menuByDay = menuData?.menuByDay || {}

  const goToPrevWeek = () => {
    const prevWeek = addDays(weekStartDate, -7)
    setCurrentWeekStart(prevWeek.toISOString().split("T")[0])
  }

  const goToNextWeek = () => {
    const nextWeek = addDays(weekStartDate, 7)
    setCurrentWeekStart(nextWeek.toISOString().split("T")[0])
  }

  const openCreateDialog = (date: string, mealPeriod: string) => {
    setSelectedDate(date)
    setSelectedMealPeriod(mealPeriod)
    createMenuItemForm.reset({
      foodId: "",
      date,
      mealPeriod,
      isAvailable: true,
    })
    setShowCreateDialog(true)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Week Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">مدیریت منوی هفتگی</h1>
            <p className="text-muted-foreground">
              هفته از {formatJalaliWithDay(weekStartDate)} تا {formatJalaliWithDay(weekEndDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToNextWeek}>
              هفته بعد <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">صبحانه</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.mealPeriodStats?.find((s: any) => s.mealPeriod === "BREAKFAST")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">گزینه موجود</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ناهار</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.mealPeriodStats?.find((s: any) => s.mealPeriod === "LUNCH")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">گزینه موجود</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">شام</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.mealPeriodStats?.find((s: any) => s.mealPeriod === "DINNER")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">گزینه موجود</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">کل رزروها</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReservations || 0}</div>
              <p className="text-xs text-muted-foreground">این هفته</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                افزودن آیتم منو
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>افزودن آیتم به منو</DialogTitle>
                <DialogDescription>
                  {selectedDate && selectedMealPeriod && (
                    <>
                      {formatJalaliWithDay(new Date(selectedDate))} - {MEAL_PERIOD_LABELS[selectedMealPeriod as keyof typeof MEAL_PERIOD_LABELS]}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createMenuItemForm.handleSubmit(createMutation.mutate)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="foodId">انتخاب غذا *</Label>
                  <Select {...createMenuItemForm.register("foodId")}>
                    <SelectTrigger>
                      <SelectValue placeholder="یک غذا انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFoods.map((food) => (
                        <SelectItem key={food.id} value={food.id}>
                          {food.name} - {formatRial(food.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createMenuItemForm.formState.errors.foodId && (
                    <p className="text-sm text-destructive">{createMenuItemForm.formState.errors.foodId.message}</p>
                  )}
                </div>
                <input type="hidden" {...createMenuItemForm.register("date")} />
                <input type="hidden" {...createMenuItemForm.register("mealPeriod")} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isAvailable" {...createMenuItemForm.register("isAvailable")} className="rounded border-input" />
                  <Label htmlFor="isAvailable" className="mb-0">موجود و قابل رزرو</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || !availableFoods.length}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        در حال افزودن...
                      </>
                    ) : (
                      "افزودن به منو"
                    )}
                  </Button>
                </DialogFooter              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => {
            // Bulk create dialog would go here
            toast.info("قابلیت ایجاد دسته‌ای در نسخه آینده")
          }}>
            <Save className="w-4 h-4 ml-2" />
            ایجاد منوی هفته (دسته‌ای)
          </Button>
        </div>

        {/* Weekly Menu Table */}
        <Card>
          <CardHeader>
            <CardTitle>برنامه غذایی هفته</CardTitle>
          </CardHeader>
          <CardContent>
            {menuLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-center">
                      <TableHead className="w-32">وعده / روز</TableHead>
                      {serviceDays.map((day, index) => (
                        <TableHead key={day} className="min-w-[150px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-medium">{WEEK_DAYS_PERSIAN[index]}</span>
                            <span className="text-sm text-muted-foreground">{formatJalali(new Date(day))}</span>
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

                          if (items.length === 0) {
                            return (
                              <TableCell key={day} className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-full text-muted-foreground/50 hover:text-primary hover:bg-primary/5"
                                  onClick={() => openCreateDialog(dateKey, mealPeriod)}
                                >
                                  <Plus className="w-4 h-4 mx-auto" />
                                </Button>
                              </TableCell>
                            )
                          }

                          return (
                            <TableCell key={day} className="p-1">
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {items.map((item) => (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      "p-2 rounded border text-xs transition-all",
                                      item.isAvailable ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium truncate">{item.food.name}</span>
                                      <Badge variant={item.isAvailable ? "default" : "secondary"} className="text-xs">
                                        {item.isAvailable ? "موجود" : "ناموجود"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{formatRial(item.food.price)}</span>
                                      <span>{item._count.reservations} رزرو</span>
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => openCreateDialog(dateKey, mealPeriod)}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>حذف آیتم منو</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              آیا از حذف این آیتم اطمینان دارید؟ اگر رزروی وجود داشته باشد، قابل حذف نیست.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteMutation.mutate({
                                                foodId: item.food.id,
                                                date: dateKey,
                                                mealPeriod: item.mealPeriod,
                                              })}
                                              className="bg-destructive text-destructive-foreground"
                                            >
                                              بله، حذف شود
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}