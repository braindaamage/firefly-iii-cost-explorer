// All date computations in this module operate in the user's local timezone,
// matching Firefly III's convention of storing dates relative to the user's
// locale. Month boundaries (start/end/tomorrow) are computed against the local
// clock, which is correct for a single-user SPA. Edge cases near midnight UTC
// are acceptable — they resolve on the next render.
import { format, startOfMonth, endOfMonth, getDaysInMonth, subMonths, addDays } from 'date-fns'

export interface MonthRange {
  start: string    // YYYY-MM-DD, first day of month
  end: string      // YYYY-MM-DD, last day of month
  daysInMonth: number
  label: string    // "YYYY-MM" for display/debug
}

/**
 * Returns date ranges for the `n` calendar months strictly before `today`'s month,
 * ordered most-recent-first (index 0 = last month, index n-1 = oldest month).
 *
 * Example: today = 2026-04-15, n = 3
 *   → [ March 2026, February 2026, January 2026 ]
 */
export function getMonthRanges(today: Date, n: number): MonthRange[] {
  const ranges: MonthRange[] = []
  for (let i = 1; i <= n; i++) {
    const monthDate = subMonths(today, i)
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    ranges.push({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      daysInMonth: getDaysInMonth(monthDate),
      label: format(start, 'yyyy-MM'),
    })
  }
  return ranges
}

/**
 * Returns YYYY-MM-DD for the first day of today's month.
 */
export function getMonthStart(today: Date): string {
  return format(startOfMonth(today), 'yyyy-MM-dd')
}

/**
 * Returns YYYY-MM-DD for the last day of today's month.
 */
export function getMonthEnd(today: Date): string {
  return format(endOfMonth(today), 'yyyy-MM-dd')
}

/**
 * Returns YYYY-MM-DD for the day after today.
 */
export function getTomorrow(today: Date): string {
  return format(addDays(today, 1), 'yyyy-MM-dd')
}

/**
 * Returns YYYY-MM-DD for today.
 */
export function formatDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}
