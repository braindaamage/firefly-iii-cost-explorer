/**
 * computeForecast — pure function (no React, no side-effects).
 *
 * Status precedence (highest to lowest):
 *   loading > error > partialNoHistory > partialNoBills > ok > unavailable
 *
 * Status definitions:
 *   loading         — any query still pending
 *   error           — mtdQuery failed (MTD is indispensable for the total)
 *   partialNoHistory — historyMonthsUsed < config.historyMonths
 *                      (includes the case of 0 months when bills are available)
 *   partialNoBills  — history complete but billsQuery failed
 *   ok              — all data available, historyMonthsUsed === config.historyMonths
 *   unavailable     — historyMonthsUsed === 0 AND billsQuery failed
 *                     (nothing useful to show beyond a raw MTD number)
 */

import { computeWeights, type ForecastModel } from '../lib/forecast-weights'
import type { InsightEntry } from '../api/types'
import type { Bill } from '../api/bills'

/** Re-exported so callers can reference the same type without touching api/types. */
export type ExpenseNoBillEntry = InsightEntry

export type ForecastStatus =
  | 'loading'
  | 'error'
  | 'ok'
  | 'partialNoBills'
  | 'partialNoHistory'
  | 'unavailable'

export interface ForecastQueryState<T> {
  status: 'pending' | 'success' | 'error'
  data: T | null
}

export interface PendingBill {
  id: string
  name: string
  /** Amount in primary currency (pcAmountAvg when available, else amountAvg). */
  amount: number
  /** ISO date string of the upcoming payment. */
  date: string
}

export interface ComputeForecastInputs {
  /** Injected for testability — use `new Date()` in production. */
  today: Date
  config: { historyMonths: number; model: ForecastModel }
  primaryCurrency: { code: string; symbol: string; decimalPlaces: number } | null

  /**
   * One entry per historical month, ordered most-recent-first (index 0 = last month).
   * Length must equal config.historyMonths.
   * `data.entries` are raw InsightEntry items from /insight/expense/no-bill.
   * `data.daysInMonth` is the total calendar days of that historical month.
   */
  historicalQueries: ForecastQueryState<{ entries: ExpenseNoBillEntry[]; daysInMonth: number }>[]

  /** MTD spend from /summary/basic for the current month. */
  mtdQuery: ForecastQueryState<{ amount: number; currencyCode: string }>

  /** Bills from /bills?start=tomorrow&end=endOfMonth. */
  billsQuery: ForecastQueryState<Bill[]>
}

export interface ForecastResult {
  status: ForecastStatus
  currency: { code: string; symbol: string; decimalPlaces: number } | null
  mtdSpent: number | null
  variableForecast: number | null
  billsForecast: number | null
  total: number | null
  breakdown: {
    daysInMonth: number
    daysElapsed: number
    daysRemaining: number
    weightedAvgDaily: number | null
    historyMonthsUsed: number
    pendingBills: PendingBill[]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function computeForecast(inputs: ComputeForecastInputs): ForecastResult {
  const { today, config, primaryCurrency, historicalQueries, mtdQuery, billsQuery } = inputs

  // --- Step 1: loading ---
  if (
    mtdQuery.status === 'pending' ||
    billsQuery.status === 'pending' ||
    historicalQueries.some((q) => q.status === 'pending')
  ) {
    return {
      status: 'loading',
      currency: null,
      mtdSpent: null,
      variableForecast: null,
      billsForecast: null,
      total: null,
      breakdown: {
        daysInMonth: 0,
        daysElapsed: 0,
        daysRemaining: 0,
        weightedAvgDaily: null,
        historyMonthsUsed: 0,
        pendingBills: [],
      },
    }
  }

  // Date computations (valid for all non-loading states)
  const daysInMonth = getDaysInMonth(today)
  const daysElapsed = today.getDate()
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed)
  const dateInfo = { daysInMonth, daysElapsed, daysRemaining }

  // --- Step 2: no primary currency → unavailable ---
  if (primaryCurrency === null) {
    return {
      status: 'unavailable',
      currency: null,
      mtdSpent: null,
      variableForecast: null,
      billsForecast: null,
      total: null,
      breakdown: { ...dateInfo, weightedAvgDaily: null, historyMonthsUsed: 0, pendingBills: [] },
    }
  }

  const currency = primaryCurrency

  // --- Step 3: MTD failed → error ---
  if (mtdQuery.status === 'error') {
    return {
      status: 'error',
      currency,
      mtdSpent: null,
      variableForecast: null,
      billsForecast: null,
      total: null,
      breakdown: {
        ...dateInfo,
        weightedAvgDaily: null,
        historyMonthsUsed: 0,
        pendingBills: billsQuery.status === 'success' ? buildPendingBills(billsQuery.data ?? [], today, currency.code) : [],
      },
    }
  }

  const mtdSpent = mtdQuery.data!.amount

  // --- Step 4: compute valid history months ---
  const validDailyRates: number[] = []
  for (const query of historicalQueries) {
    if (query.status !== 'success' || query.data === null) continue
    const { entries, daysInMonth: dim } = query.data
    if (dim <= 0) continue // defensive: skip degenerate month
    // Sum absolute expense for entries in primary currency
    const matching = entries.filter((e) => e.currency_code === currency.code)
    // Skip only if data exists in other currencies but not in primary.
    // An empty entries array means zero spending — a valid data point (dailyRate = 0).
    if (matching.length === 0 && entries.length > 0) continue
    const variableSpend = matching.reduce((sum, e) => sum + Math.abs(e.difference_float), 0)
    validDailyRates.push(variableSpend / dim)
  }

  const historyMonthsUsed = validDailyRates.length

  // --- Step 5: compute variable forecast ---
  let weightedAvgDaily: number | null = null
  let variableForecast: number | null = null

  if (historyMonthsUsed > 0) {
    const weights = computeWeights(historyMonthsUsed, config.model)
    weightedAvgDaily = validDailyRates.reduce((acc, rate, i) => acc + weights[i] * rate, 0)
    variableForecast = weightedAvgDaily * daysRemaining
  }

  // --- Step 6: compute pending bills ---
  let pendingBills: PendingBill[] = []
  let billsForecast: number | null = null

  if (billsQuery.status === 'success' && billsQuery.data !== null) {
    pendingBills = buildPendingBills(billsQuery.data, today, currency.code)
    billsForecast = pendingBills.reduce((sum, b) => sum + b.amount, 0)
  }

  // --- Step 7: determine final status ---
  // Precedence: loading > error (handled above) > partialNoHistory > partialNoBills > ok > unavailable

  if (historyMonthsUsed === 0 && billsQuery.status === 'error') {
    // No history AND no bills — nothing useful beyond the raw MTD
    return {
      status: 'unavailable',
      currency,
      mtdSpent,
      variableForecast: null,
      billsForecast: null,
      total: mtdSpent,
      breakdown: { ...dateInfo, weightedAvgDaily: null, historyMonthsUsed: 0, pendingBills: [] },
    }
  }

  // total formula: mtd + (variable ?? 0) + (bills ?? 0)
  const computeTotal = (vf: number | null, bf: number | null): number =>
    mtdSpent + (vf ?? 0) + (bf ?? 0)

  if (historyMonthsUsed < config.historyMonths) {
    // partialNoHistory: includes 0-months-with-bills and partial history
    return {
      status: 'partialNoHistory',
      currency,
      mtdSpent,
      variableForecast,
      billsForecast,
      total: computeTotal(variableForecast, billsForecast),
      breakdown: { ...dateInfo, weightedAvgDaily, historyMonthsUsed, pendingBills },
    }
  }

  if (billsQuery.status === 'error') {
    // partialNoBills: full history but bills unavailable
    return {
      status: 'partialNoBills',
      currency,
      mtdSpent,
      variableForecast,
      billsForecast: null,
      total: computeTotal(variableForecast, null),
      breakdown: { ...dateInfo, weightedAvgDaily, historyMonthsUsed, pendingBills: [] },
    }
  }

  // ok
  return {
    status: 'ok',
    currency,
    mtdSpent,
    variableForecast,
    billsForecast,
    total: computeTotal(variableForecast, billsForecast),
    breakdown: { ...dateInfo, weightedAvgDaily, historyMonthsUsed, pendingBills },
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildPendingBills(bills: Bill[], today: Date, primaryCurrencyCode: string): PendingBill[] {
  const todayStr = formatDate(today)
  const endOfMonthStr = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  const result: PendingBill[] = []

  for (const bill of bills) {
    if (!bill.active) continue
    for (const payDate of bill.payDates) {
      // Include dates strictly after today and up to end-of-month (inclusive)
      if (payDate <= todayStr) continue
      if (payDate > endOfMonthStr) continue
      // Exclude if already paid on that exact date
      if (bill.paidDates.some((pd) => pd.date === payDate)) continue
      let amount: number
      if (bill.pcAmountAvg !== null) {
        amount = bill.pcAmountAvg
      } else if (bill.currencyCode === primaryCurrencyCode) {
        amount = bill.amountAvg
      } else {
        // Cross-currency bill without primary-currency conversion — skip to avoid
        // silently summing foreign-currency amounts as primary.
        console.warn(
          `[buildPendingBills] Skipping bill "${bill.name}" (${bill.currencyCode}): ` +
          `pcAmountAvg is null and currency differs from primary (${primaryCurrencyCode})`
        )
        continue
      }
      result.push({ id: bill.id, name: bill.name, amount, date: payDate })
    }
  }

  return result
}
