import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Period } from './period-utils'
import type { PendingBill } from '../hooks/computeForecast'

export interface ForecastOverlayPoint {
  /** Matches ChartDataPoint.period (the label string). */
  periodLabel: string
  /** Forecast amount for this period. 0 means no overlay for this period. */
  value: number
}

/**
 * Computes the forecast value for each chart period.
 *
 * - Past periods (period.end < today): value = 0 (overlay hidden)
 * - Current/future periods: value = weightedAvgDaily × daysInPeriod + billsInPeriod
 *   The current period shows the FULL expected amount (budget for the period),
 *   not just the remaining days — the actual bar shows progress against it.
 *
 * @param periods - from useDashboardData().periods
 * @param weightedAvgDaily - from forecast.breakdown.weightedAvgDaily (null → all zeros)
 * @param pendingBills - from forecast.breakdown.pendingBills
 * @param today - ISO date string 'YYYY-MM-DD'
 */
export function computeForecastOverlay(
  periods: Period[],
  weightedAvgDaily: number | null,
  pendingBills: PendingBill[],
  today: string
): ForecastOverlayPoint[] {
  if (weightedAvgDaily === null) {
    return periods.map((p) => ({ periodLabel: p.label, value: 0 }))
  }

  return periods.map((p) => {
    // Past period: no overlay
    if (p.end < today) {
      return { periodLabel: p.label, value: 0 }
    }

    // Current or future: show full forecast for the period
    const daysInPeriod =
      differenceInCalendarDays(parseISO(p.end), parseISO(p.start)) + 1

    const billsInPeriod = pendingBills
      .filter((b) => b.date >= p.start && b.date <= p.end)
      .reduce((sum, b) => sum + b.amount, 0)

    return {
      periodLabel: p.label,
      value: weightedAvgDaily * daysInPeriod + billsInPeriod,
    }
  })
}
