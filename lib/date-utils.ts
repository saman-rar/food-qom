/**
 * Date Utilities for Jalali Calendar
 * Handles all date operations with Asia/Tehran timezone
 */

import { format, parse, startOfDay, endOfDay, addDays, subDays, isBefore, isAfter, isEqual, getDay, setHours, setMinutes, setSeconds } from "date-fns";
import { toJalaali, toGregorian, isValidJalaaliDate, jalaaliMonthLength } from "date-fns-jalali";
import { utcToZonedTime, zonedTimeToUtc, format as formatTz } from "date-fns-tz";

const TIMEZONE = "Asia/Tehran";

/**
 * Get current date in Tehran timezone
 */
export function getTehranNow(): Date {
  return utcToZonedTime(new Date(), TIMEZONE);
}

/**
 * Convert UTC date to Tehran timezone
 */
export function toTehranTime(date: Date): Date {
  return utcToZonedTime(date, TIMEZONE);
}

/**
 * Convert Tehran time to UTC
 */
export function toUtcTime(date: Date): Date {
  return zonedTimeToUtc(date, TIMEZONE);
}

/**
 * Format date in Persian/Jalali
 */
export function formatJalali(date: Date, pattern: string = "yyyy/MM/dd"): string {
  const tehranDate = toTehranTime(date);
  const { jy, jm, jd } = toJalaali(tehranDate);
  
  return pattern
    .replace("yyyy", String(jy))
    .replace("yy", String(jy).slice(-2))
    .replace("MM", String(jm).padStart(2, "0"))
    .replace("M", String(jm))
    .replace("dd", String(jd).padStart(2, "0"))
    .replace("d", String(jd));
}

/**
 * Format date with day name in Persian
 */
export function formatJalaliWithDay(date: Date): string {
  const tehranDate = toTehranTime(date);
  const dayIndex = tehranDate.getDay(); // 0 = Sunday, 6 = Saturday
  const persianDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Adjust for Saturday start
  const dayName = WEEK_DAYS_PERSIAN[persianDayIndex];
  const dateStr = formatJalali(tehranDate);
  return `${dayName}، ${dateStr}`;
}

import { WEEK_DAYS_PERSIAN } from "./constants";

/**
 * Parse Jalali date string to Date object
 */
export function parseJalali(dateStr: string): Date | null {
  try {
    const parts = dateStr.split("/").map(Number);
    if (parts.length !== 3) return null;
    
    const [jy, jm, jd] = parts;
    if (!isValidJalaaliDate(jy, jm, jd)) return null;
    
    const { gy, gm, gd } = toGregorian(jy, jm, jd);
    return new Date(gy, gm - 1, gd);
  } catch {
    return null;
  }
}

/**
 * Get start of week (Saturday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const tehranDate = toTehranTime(date);
  const day = tehranDate.getDay(); // 0 = Sunday
  const daysToSubtract = day === 0 ? 1 : day; // Saturday = 6, so if Sunday (0), subtract 1
  return startOfDay(subDays(tehranDate, daysToSubtract));
}

/**
 * Get end of week (Wednesday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  return endOfDay(addDays(weekStart, 4)); // Saturday + 4 = Wednesday
}

/**
 * Get all service days for a week (Saturday to Wednesday)
 */
export function getServiceDaysForWeek(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

/**
 * Check if a date is a service day (Saturday to Wednesday)
 */
export function isServiceDay(date: Date): boolean {
  const tehranDate = toTehranTime(date);
  const day = tehranDate.getDay();
  return day !== 5 && day !== 6; // Not Friday (5) or Saturday (6) - wait, in JS 0=Sunday, 6=Saturday
  // Actually: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Service days: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3)
  // So: day === 6 || day === 0 || day === 1 || day === 2 || day === 3
}

/**
 * Check if a date is in the past (before today in Tehran timezone)
 */
export function isPastDate(date: Date): boolean {
  const now = getTehranNow();
  const today = startOfDay(now);
  const checkDate = startOfDay(toTehranTime(date));
  return isBefore(checkDate, today);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const now = getTehranNow();
  return isEqual(startOfDay(toTehranTime(date)), startOfDay(now));
}

/**
 * Calculate reservation deadline for a meal date
 * Deadline is 2 days before at 12:00 PM Tehran time
 */
export function getReservationDeadline(mealDate: Date): Date {
  const deadline = subDays(mealDate, 2);
  const tehranDeadline = toTehranTime(deadline);
  return setSeconds(setMinutes(setHours(tehranDeadline, 12), 0), 0);
}

/**
 * Check if reservation is still open for a meal date
 */
export function isReservationOpen(mealDate: Date): boolean {
  const now = getTehranNow();
  const deadline = getReservationDeadline(mealDate);
  return isAfter(now, deadline) === false; // open if now <= deadline
}

/**
 * Get reservation status for a meal date
 */
export function getReservationStatus(mealDate: Date): "open" | "closing_soon" | "closed" {
  const now = getTehranNow();
  const deadline = getReservationDeadline(mealDate);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDeadline <= 0) return "closed";
  if (hoursUntilDeadline <= 24) return "closing_soon";
  return "open";
}

/**
 * Get week label in Persian (e.g., "هفته ۱۴۰۳/۰۷")
 */
export function getWeekLabel(weekStart: Date): string {
  const tehranDate = toTehranTime(weekStart);
  const { jy, jm } = toJalaali(tehranDate);
  return `هفته ${jy}/${String(jm).padStart(2, "0")}`;
}

/**
 * Get current and next week start dates
 */
export function getCurrentAndNextWeek(): { current: Date; next: Date } {
  const now = getTehranNow();
  const current = getWeekStart(now);
  const next = addDays(current, 7);
  return { current, next };
}

/**
 * Format time in Persian (HH:mm)
 */
export function formatTime(date: Date): string {
  const tehranDate = toTehranTime(date);
  return format(tehranDate, "HH:mm");
}

/**
 * Get meal period from time
 */
export function getMealPeriodFromTime(time: string): "BREAKFAST" | "LUNCH" | "DINNER" | null {
  const [hours] = time.split(":").map(Number);
  if (hours >= 6 && hours < 10) return "BREAKFAST";
  if (hours >= 11 && hours < 15) return "LUNCH";
  if (hours >= 18 && hours < 22) return "DINNER";
  return null;
}

/**
 * Get default meal times
 */
export const MEAL_TIMES = {
  BREAKFAST: "07:30",
  LUNCH: "12:30",
  DINNER: "19:00",
} as const;