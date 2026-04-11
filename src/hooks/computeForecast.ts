import { computeWeights, type ForecastModel } from '../lib/forecast-weights'

export type ForecastStatus =
  | 'loading'
  | 'error'
  | 'ok'
  | 'partialNoBills'
  | 'partialNoHistory'
  | 'unavailable'

export interface HistoryMonthInput {
  /** Absolute value of variable expense for the month (positive number). */
  variableSpend: number
  /** Total calendar days in that historical month. */
  daysInMonth: number
}

export interface PendingBill {
  id: string
  name: string
  /** Amount in primary currency. */
  amount: number
  /** Payment date (ISO date string). */
  date: string
}

export interface ComputeForecastInputs {
  /** Reference date for all date calculations (use real Date.now() in production; inject in tests). */
  today: Date
  config: { historyMonths: number; model: ForecastModel }
  primaryCurrency: { code: string; symbol: string; decimalPlaces: number } | null

  /** Query status for each historical month; parallel to historyData. Length = config.historyMonths. */
  historyStatuses: ('pending' | 'success' | 'error')[]
  mtdStatus: 'pending' | 'success' | 'error'
  billsStatus: 'pending' | 'success' | 'error'

  /** One entry per historical month (most recent first). null when that month's query errored. */
  historyData: (HistoryMonthInput | null)[]
  /** Already-spent amount this month (from /summary/basic). */
  mtdSpent: number | null
  /**
   * Bills with a pay_date in the forecast window.
   * Pre-filtered by the hook: active=true, pay_date in (today, endOfMonth], pcAmountAvg available.
   */
  pendingBills: PendingBill[]
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

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function loadingResult(): ForecastResult {
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

function unavailableResult(
  currency: ForecastResult['currency'],
  dateInfo: { daysInMonth: number; daysElapsed: number; daysRemaining: number }
): ForecastResult {
  return {
    status: 'unavailable',
    currency,
    mtdSpent: null,
    variableForecast: null,
    billsForecast: null,
    total: null,
    breakdown: {
      ...dateInfo,
      weightedAvgDaily: null,
      historyMonthsUsed: 0,
      pendingBills: [],
    },
  }
}

export function computeForecast(inputs: ComputeForecastInputs): ForecastResult {
  const {
    today,
    config,
    primaryCurrency,
    historyStatuses,
    mtdStatus,
    billsStatus,
    historyData,
    mtdSpent,
    pendingBills,
  } = inputs

  // Step 1 — loading: any query still pending
  if (
    historyStatuses.some((s) => s === 'pending') ||
    mtdStatus === 'pending' ||
    billsStatus === 'pending'
  ) {
    return loadingResult()
  }

  // Date computations (needed for all non-loading results)
  const daysInMonth = getDaysInMonth(today)
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed
  const dateInfo = { daysInMonth, daysElapsed, daysRemaining }

  // Step 2 — unavailable: no primary currency configured
  if (primaryCurrency === null) {
    return unavailableResult(null, dateInfo)
  }

  const currency = primaryCurrency

  // Step 3 — unavailable: neither MTD nor bills are available
  if (mtdStatus === 'error' && billsStatus === 'error') {
    return unavailableResult(currency, dateInfo)
  }

  // Step 4 — error: MTD failed (cannot compute "already spent" component)
  if (mtdStatus === 'error') {
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
        pendingBills: billsStatus === 'success' ? pendingBills : [],
      },
    }
  }

  // Step 5 — compute variable forecast from valid history months
  const validMonths = historyData.filter((m): m is HistoryMonthInput => m !== null)
  const historyMonthsUsed = validMonths.length

  let weightedAvgDaily: number | null = null
  let variableForecast: number | null = null

  if (historyMonthsUsed > 0) {
    const weights = computeWeights(historyMonthsUsed, config.model)
    weightedAvgDaily = validMonths.reduce(
      (acc, month, i) => acc + weights[i] * (month.variableSpend / month.daysInMonth),
      0
    )
    variableForecast = weightedAvgDaily * daysRemaining
  }

  // Step 6 — partialNoHistory: no valid history, but MTD + bills are available
  if (historyMonthsUsed === 0) {
    const billsForecast =
      billsStatus === 'success'
        ? pendingBills.reduce((sum, b) => sum + b.amount, 0)
        : null
    return {
      status: 'partialNoHistory',
      currency,
      mtdSpent,
      variableForecast: null,
      billsForecast,
      total: billsForecast !== null && mtdSpent !== null ? mtdSpent + billsForecast : null,
      breakdown: {
        ...dateInfo,
        weightedAvgDaily: null,
        historyMonthsUsed: 0,
        pendingBills: billsStatus === 'success' ? pendingBills : [],
      },
    }
  }

  // Step 7 — partialNoBills: history and MTD ok, but bills query failed
  if (billsStatus === 'error') {
    return {
      status: 'partialNoBills',
      currency,
      mtdSpent,
      variableForecast,
      billsForecast: null,
      total: mtdSpent !== null && variableForecast !== null ? mtdSpent + variableForecast : null,
      breakdown: {
        ...dateInfo,
        weightedAvgDaily,
        historyMonthsUsed,
        pendingBills: [],
      },
    }
  }

  // Step 8 — ok (or ok-with-partial-history, noted in historyMonthsUsed)
  const billsForecast = pendingBills.reduce((sum, b) => sum + b.amount, 0)
  const total =
    mtdSpent !== null && variableForecast !== null
      ? mtdSpent + variableForecast + billsForecast
      : null

  return {
    status: 'ok',
    currency,
    mtdSpent,
    variableForecast,
    billsForecast,
    total,
    breakdown: {
      ...dateInfo,
      weightedAvgDaily,
      historyMonthsUsed,
      pendingBills,
    },
  }
}
