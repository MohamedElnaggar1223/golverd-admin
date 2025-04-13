import { type ClassValue, clsx } from "clsx"
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
  currency: string = 'EGP'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Function to calculate percentage change
export function calculatePercentageChange(previous: number | null | undefined, current: number | null | undefined): number | null {
  const prev = previous ?? 0;
  const curr = current ?? 0;

  if (prev === 0) {
    // If previous value is 0:
    // - If current is also 0, change is 0%
    // - If current is positive, change is technically infinite, return null or a large number/indicator
    // - Let's return null to indicate it's not a meaningful percentage
    return curr === 0 ? 0 : null;
  }

  const change = ((curr - prev) / Math.abs(prev)) * 100;
  return change;
}
