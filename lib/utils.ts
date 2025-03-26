import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string or Date object according to the specified format
 */
export function formatDate(date: string | Date | undefined, formatStr: string = 'PPP'): string {
  if (!date) return 'N/A';

  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    return String(date);
  }
}

/**
 * Format a number as currency with specified locale and currency code
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-US',
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
