/**
 * Application Constants
 * Centralized constants for the cafeteria reservation platform
 */

export const MEAL_PERIODS = {
  BREAKFAST: "BREAKFAST",
  LUNCH: "LUNCH",
  DINNER: "DINNER",
} as const;

export type MealPeriod = (typeof MEAL_PERIODS)[keyof typeof MEAL_PERIODS];

export const MEAL_PERIOD_LABELS: Record<MealPeriod, string> = {
  BREAKFAST: "صبحانه",
  LUNCH: "ناهار",
  DINNER: "شام",
};

export const MEAL_PERIOD_ORDER: MealPeriod[] = [
  MEAL_PERIODS.BREAKFAST,
  MEAL_PERIODS.LUNCH,
  MEAL_PERIODS.DINNER,
];

export const SERVICE_DAYS = [6, 0, 1, 2, 3] as const; // Saturday=6, Sunday=0, Monday=1, Tuesday=2, Wednesday=3

export const RESERVATION_STATUS = {
  CONFIRMED: "CONFIRMED",
  TRANSFERRED: "TRANSFERRED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "تایید شده",
  TRANSFERRED: "انتقال یافته",
  CANCELLED: "لغو شده",
  COMPLETED: "انجام شده",
  EXPIRED: "منقضی شده",
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  TRANSFERRED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export const TRANSACTION_TYPES = {
  CREDIT_DEPOSIT: "CREDIT_DEPOSIT",
  MEAL_RESERVATION: "MEAL_RESERVATION",
  RESERVATION_REFUND: "RESERVATION_REFUND",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
  TRANSFER_INCOMING: "TRANSFER_INCOMING",
  TRANSFER_OUTGOING: "TRANSFER_OUTGOING",
} as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  CREDIT_DEPOSIT: "شارژ کیف پول",
  MEAL_RESERVATION: "رزرو غذا",
  RESERVATION_REFUND: "استرداد رزرو",
  ADMIN_ADJUSTMENT: "تنظیم ادمین",
  TRANSFER_INCOMING: "دریافت انتقال",
  TRANSFER_OUTGOING: "ارسال انتقال",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "در انتظار پرداخت",
  SUCCESS: "موفق",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
};

export const USER_ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: "کاربر",
  ADMIN: "مدیر",
};

export const MAX_TRANSFERS_PER_MONTH = 2;

export const RESERVATION_DEADLINE_HOURS = 48; // 2 days before
export const RESERVATION_DEADLINE_TIME = "12:00"; // 12:00 PM

export const TIMEZONE = "Asia/Tehran";

export const CURRENCY = {
  CODE: "IRR",
  SYMBOL: "ریال",
  LOCALE: "fa-IR",
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};

export const WEEK_DAYS_PERSIAN = [
  "شنبه",
  "یک‌شنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
];

export const WEEK_DAYS_PERSIAN_SHORT = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
];