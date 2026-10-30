/**
 * Currency Formatting Utilities
 * Centralized formatting for Iranian Rial
 */

import { CURRENCY } from "./constants";

/**
 * Format amount in Rial with Persian digits
 */
export function formatRial(amount: number | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  
  // Format with thousand separators
  const formatted = new Intl.NumberFormat(CURRENCY.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  
  return `${formatted} ${CURRENCY.SYMBOL}`;
}

/**
 * Format amount in Rial without currency symbol
 */
export function formatRialNumber(amount: number | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  
  return new Intl.NumberFormat(CURRENCY.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format amount in Tomans (Rial / 10)
 */
export function formatToman(amount: number | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  const toman = Math.round(num / 10);
  
  const formatted = new Intl.NumberFormat(CURRENCY.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toman);
  
  return `${formatted} تومان`;
}

/**
 * Parse Persian/Arabic digits to English digits
 */
export function parsePersianNumber(str: string): number {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  
  let result = str;
  persianDigits.forEach((digit, index) => {
    result = result.replace(new RegExp(digit, "g"), String(index));
  });
  arabicDigits.forEach((digit, index) => {
    result = result.replace(new RegExp(digit, "g"), String(index));
  });
  
  // Remove non-digit characters except decimal point
  result = result.replace(/[^\d.]/g, "");
  
  return parseFloat(result) || 0;
}

/**
 * Convert Rial to Toman
 */
export function rialToToman(rial: number | bigint): number {
  const num = typeof rial === "bigint" ? Number(rial) : rial;
  return Math.round(num / 10);
}

/**
 * Convert Toman to Rial
 */
export function tomanToRial(toman: number): number {
  return toman * 10;
}

/**
 * Format price for display (with comma separators)
 */
export function formatPrice(price: number): string {
  return formatRial(price);
}

/**
 * Format wallet balance
 */
export function formatBalance(balance: number): string {
  const sign = balance >= 0 ? "" : "-";
  const absBalance = Math.abs(balance);
  return `${sign}${formatRial(absBalance)}`;
}