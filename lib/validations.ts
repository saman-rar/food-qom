/**
 * Validation Schemas
 * Zod schemas for all user inputs
 */

import { z } from "zod";
import { 
  MEAL_PERIODS, 
  RESERVATION_STATUS, 
  TRANSACTION_TYPES, 
  PAYMENT_STATUS,
  USER_ROLES,
  MAX_TRANSFERS_PER_MONTH,
  CURRENCY
} from "./constants";

/**
 * Auth schemas
 */
export const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است"),
  newPassword: z.string().min(6, "رمز عبور جدید باید حداقل ۶ کاراکتر باشد"),
  confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "رمز عبورها یکسان نیستند",
  path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * User schemas
 */
export const createUserSchema = z.object({
  username: z.string().min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد").max(50),
  email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal("")),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
  fullName: z.string().min(2, "نام کامل الزامی است").max(100),
  role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN]).default(USER_ROLES.USER),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد").optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Food schemas
 */
export const createFoodSchema = z.object({
  name: z.string().min(2, "نام غذا الزامی است").max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().positive("قیمت باید عدد مثبتی باشد"),
  category: z.string().max(50).optional(),
  imageUrl: z.string().url("آدرس تصویر معتبر نیست").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const updateFoodSchema = createFoodSchema.partial();

export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;

/**
 * Menu item schemas
 */
export const createMenuItemSchema = z.object({
  foodId: z.string().cuid("آی‌دی غذا معتبر نیست"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "تاریخ معتبر نیست"),
  mealPeriod: z.enum([MEAL_PERIODS.BREAKFAST, MEAL_PERIODS.LUNCH, MEAL_PERIODS.DINNER]),
  isAvailable: z.boolean().default(true),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

/**
 * Reservation schemas
 */
export const createReservationSchema = z.object({
  menuItemId: z.string().cuid("آی‌دی منو معتبر نیست"),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const cancelReservationSchema = z.object({
  reservationId: z.string().cuid("آی‌دی رزرو معتبر نیست"),
});

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;

/**
 * Wallet schemas
 */
export const rechargeSchema = z.object({
  amount: z.number().int().min(10000, "حداقل مبلغ شارژ ۱۰,۰۰۰ ریال است").max(10000000, "حداکثر مبلغ شارژ ۱۰,۰۰۰,۰۰۰ ریال است"),
});

export type RechargeInput = z.infer<typeof rechargeSchema>;

export const adminAdjustWalletSchema = z.object({
  userId: z.string().cuid("آی‌دی کاربر معتبر نیست"),
  amount: z.number().int("مبلغ باید عدد صحیح باشد"),
  reason: z.string().min(5, "دلیل باید حداقل ۵ کاراکتر باشد").max(500),
});

export type AdminAdjustWalletInput = z.infer<typeof adminAdjustWalletSchema>;

/**
 * Transfer schemas
 */
export const createTransferSchema = z.object({
  reservationId: z.string().cuid("آی‌دی رزرو معتبر نیست"),
  recipientUsername: z.string().min(3, "نام کاربری گیرنده الزامی است").max(50),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

/**
 * Payment schemas
 */
export const initiatePaymentSchema = z.object({
  amount: z.number().int().min(10000, "حداقل مبلغ ۱۰,۰۰۰ ریال است"),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

/**
 * Query/filter schemas
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const reservationFilterSchema = paginationSchema.extend({
  status: z.enum([
    RESERVATION_STATUS.CONFIRMED,
    RESERVATION_STATUS.TRANSFERRED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.EXPIRED,
  ]).optional(),
  mealPeriod: z.enum([MEAL_PERIODS.BREAKFAST, MEAL_PERIODS.LUNCH, MEAL_PERIODS.DINNER]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  userId: z.string().cuid().optional(),
});

export type ReservationFilterInput = z.infer<typeof reservationFilterSchema>;

export const transactionFilterSchema = paginationSchema.extend({
  type: z.enum([
    TRANSACTION_TYPES.CREDIT_DEPOSIT,
    TRANSACTION_TYPES.MEAL_RESERVATION,
    TRANSACTION_TYPES.RESERVATION_REFUND,
    TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
    TRANSACTION_TYPES.TRANSFER_INCOMING,
    TRANSACTION_TYPES.TRANSFER_OUTGOING,
  ]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  userId: z.string().cuid().optional(),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

export const transferFilterSchema = paginationSchema.extend({
  senderId: z.string().cuid().optional(),
  recipientId: z.string().cuid().optional(),
  month: z.string().optional(),
});

export type TransferFilterInput = z.infer<typeof transferFilterSchema>;

export const paymentFilterSchema = paginationSchema.extend({
  status: z.enum([PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  userId: z.string().cuid().optional(),
});

export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;

export const userFilterSchema = paginationSchema.extend({
  role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN]).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

export type UserFilterInput = z.infer<typeof userFilterSchema>;