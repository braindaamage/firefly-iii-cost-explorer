import {
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  endOfMonth,
  format,
  max,
  min,
  parseISO,
} from 'date-fns'
import type { DateRange } from '../types/filters'

export interface Period {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  label: string
}

export type PeriodGranularity = 'day' | 'week' | 'month'

function fmt(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getGranularity(range: DateRange): PeriodGranularity {
  const days = differenceInDays(parseISO(range.end), parseISO(range.start))
  if (days <= 14) return 'day'
  if (days <= 90) return 'week'
  return 'month'
}

export function splitIntoPeriods(
  range: DateRange,
  granularity: PeriodGranularity
): Period[] {
  const rangeStart = parseISO(range.start)
  const rangeEnd = parseISO(range.end)

  if (granularity === 'day') {
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((day) => ({
      start: fmt(day),
      end: fmt(day),
      label: format(day, 'MMM d'),
    }))
  }

  if (granularity === 'week') {
    const weekStarts = eachWeekOfInterval(
      { start: rangeStart, end: rangeEnd },
      { weekStartsOn: 1 }
    )
    return weekStarts.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const clampedStart = max([weekStart, rangeStart])
      const clampedEnd = min([weekEnd, rangeEnd])
      return {
        start: fmt(clampedStart),
        end: fmt(clampedEnd),
        label: `${format(clampedStart, 'MMM d')}-${format(clampedEnd, 'd')}`,
      }
    })
  }

  // month
  const monthStarts = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
  return monthStarts.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart)
    const clampedStart = max([monthStart, rangeStart])
    const clampedEnd = min([monthEnd, rangeEnd])
    return {
      start: fmt(clampedStart),
      end: fmt(clampedEnd),
      label: format(monthStart, 'MMM yyyy'),
    }
  })
}
