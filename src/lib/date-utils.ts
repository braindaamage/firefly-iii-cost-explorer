import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import type { DateRange, FilterState, TimeRangePreset } from '../types/filters'

function fmt(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getDateRangeFromPreset(preset: TimeRangePreset): DateRange | null {
  if (preset === 'custom') return null

  const today = new Date()

  switch (preset) {
    case 'last_7_days':
      return { start: fmt(subDays(today, 6)), end: fmt(today) }

    case 'last_30_days':
      return { start: fmt(subDays(today, 29)), end: fmt(today) }

    case 'this_month':
      return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) }

    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      return { start: fmt(startOfMonth(lastMonth)), end: fmt(endOfMonth(lastMonth)) }
    }

    case 'last_3_months':
      return { start: fmt(subMonths(today, 3)), end: fmt(today) }

    case 'last_6_months':
      return { start: fmt(subMonths(today, 6)), end: fmt(today) }

    case 'this_year':
      return { start: fmt(startOfYear(today)), end: fmt(endOfYear(today)) }
  }
}

export function getPresetLabel(preset: TimeRangePreset): string {
  const labels: Record<TimeRangePreset, string> = {
    last_7_days: 'Last 7 days',
    last_30_days: 'Last 30 days',
    this_month: 'This month',
    last_month: 'Last month',
    last_3_months: 'Last 3 months',
    last_6_months: 'Last 6 months',
    this_year: 'This year',
    custom: 'Custom range',
  }
  return labels[preset]
}

export function getEffectiveDateRange(filters: FilterState): DateRange {
  if (filters.timeRange === 'custom' && filters.customDateRange) {
    return filters.customDateRange
  }
  const range = getDateRangeFromPreset(filters.timeRange)
  // Fallback to last 30 days if somehow null
  if (!range) {
    const today = new Date()
    return { start: fmt(subDays(today, 29)), end: fmt(today) }
  }
  return range
}
