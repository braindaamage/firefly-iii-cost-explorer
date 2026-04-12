import { describe, it, expect } from 'vitest'
import { computeForecast } from './computeForecast'
import type {
  ComputeForecastInputs,
  ForecastQueryState,
  ExpenseNoBillEntry,
} from './computeForecast'
import type { Bill } from '../api/bills'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const EUR = { code: 'EUR', symbol: '€', decimalPlaces: 2 }

/** April 11 2026 — mid-month baseline: daysInMonth=30, daysElapsed=11, daysRemaining=19 */
const TODAY = new Date(2026, 3, 11) // months are 0-indexed

// Helpers to build ForecastQueryState objects
function success<T>(data: T): ForecastQueryState<T> {
  return { status: 'success', data }
}
function pending<T>(): ForecastQueryState<T> {
  return { status: 'pending', data: null }
}
function error<T>(): ForecastQueryState<T> {
  return { status: 'error', data: null }
}

// Build an InsightEntry for a given currency code and spend amount (positive = expense)
function entry(currencyCode: string, spend: number): ExpenseNoBillEntry {
  return {
    id: '1',
    name: 'Variable spend',
    difference: String(-spend),
    difference_float: -spend, // negative = expense
    currency_id: '1',
    currency_code: currencyCode,
    currency_symbol: currencyCode === 'EUR' ? '€' : '$',
  }
}

// Build a historical month query (success)
function historyMonth(spend: number, daysInMonth: number, currency = 'EUR') {
  return success({ entries: [entry(currency, spend)], daysInMonth })
}

// Build a bill fixture
function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: '1',
    name: 'Netflix',
    active: true,
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyDecimalPlaces: 2,
    amountMin: 12.99,
    amountMax: 12.99,
    amountAvg: 12.99,
    pcAmountMin: 14.00,
    pcAmountMax: 14.50,
    pcAmountAvg: 14.23,
    payDates: ['2026-04-20'],
    paidDates: [],
    ...overrides,
  }
}

const DEFAULT_MTD = success({ amount: 450, currencyCode: 'EUR' })

// 3 historical months for default inputs
const MARCH = historyMonth(620, 31)  // most recent: 620/31 ≈ 20.0/day
const FEB = historyMonth(560, 28)    // 560/28 = 20.0/day
const JAN = historyMonth(700, 31)    // 700/31 ≈ 22.6/day

function makeInputs(overrides: Partial<ComputeForecastInputs> = {}): ComputeForecastInputs {
  return {
    today: TODAY,
    config: { historyMonths: 3, model: 'weighted' },
    primaryCurrency: EUR,
    historicalQueries: [MARCH, FEB, JAN],
    mtdQuery: DEFAULT_MTD,
    billsQuery: success([makeBill()]),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Status: loading
// ---------------------------------------------------------------------------

describe('computeForecast — status: loading', () => {
  it('returns loading when mtdQuery is pending', () => {
    expect(computeForecast(makeInputs({ mtdQuery: pending() })).status).toBe('loading')
  })

  it('returns loading when billsQuery is pending', () => {
    expect(computeForecast(makeInputs({ billsQuery: pending() })).status).toBe('loading')
  })

  it('returns loading when any historicalQuery is pending', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, pending(), JAN] })
    )
    expect(result.status).toBe('loading')
  })

  it('loading result has null currency and null totals', () => {
    const result = computeForecast(makeInputs({ mtdQuery: pending() }))
    expect(result.currency).toBeNull()
    expect(result.mtdSpent).toBeNull()
    expect(result.total).toBeNull()
    expect(result.breakdown.daysInMonth).toBe(0)
  })

  it('loading takes precedence over all other states', () => {
    // Even if mtd is error, pending should dominate
    const result = computeForecast(
      makeInputs({ mtdQuery: error(), billsQuery: pending() })
    )
    expect(result.status).toBe('loading')
  })
})

// ---------------------------------------------------------------------------
// Status: unavailable
// ---------------------------------------------------------------------------

describe('computeForecast — status: unavailable', () => {
  it('returns unavailable when primaryCurrency is null', () => {
    const result = computeForecast(makeInputs({ primaryCurrency: null }))
    expect(result.status).toBe('unavailable')
    expect(result.currency).toBeNull()
  })

  it('returns unavailable when historyMonthsUsed=0 AND bills failed', () => {
    const result = computeForecast(
      makeInputs({
        historicalQueries: [error(), error(), error()],
        billsQuery: error(),
      })
    )
    expect(result.status).toBe('unavailable')
  })

  it('unavailable includes date info in breakdown', () => {
    const result = computeForecast(makeInputs({ primaryCurrency: null }))
    expect(result.breakdown.daysInMonth).toBe(30)
    expect(result.breakdown.daysElapsed).toBe(11)
    expect(result.breakdown.daysRemaining).toBe(19)
  })

  it('unavailable when no history+no bills still exposes mtdSpent (only thing known)', () => {
    const result = computeForecast(
      makeInputs({
        historicalQueries: [error(), error(), error()],
        billsQuery: error(),
        mtdQuery: success({ amount: 300, currencyCode: 'EUR' }),
      })
    )
    expect(result.mtdSpent).toBe(300)
    expect(result.total).toBe(300) // total = mtdSpent when nothing else known
  })
})

// ---------------------------------------------------------------------------
// Status: error
// ---------------------------------------------------------------------------

describe('computeForecast — status: error', () => {
  it('returns error when mtdQuery fails (bills ok)', () => {
    const result = computeForecast(makeInputs({ mtdQuery: error() }))
    expect(result.status).toBe('error')
  })

  it('error result has null mtdSpent and null total', () => {
    const result = computeForecast(makeInputs({ mtdQuery: error() }))
    expect(result.mtdSpent).toBeNull()
    expect(result.total).toBeNull()
  })

  it('error result includes pendingBills in breakdown when bills succeeded', () => {
    const bill = makeBill({ id: '99', payDates: ['2026-04-20'] })
    const result = computeForecast(
      makeInputs({ mtdQuery: error(), billsQuery: success([bill]) })
    )
    expect(result.breakdown.pendingBills).toHaveLength(1)
    expect(result.breakdown.pendingBills[0].id).toBe('99')
  })

  it('error precedes unavailable (mtd error + bills error → error, not unavailable)', () => {
    // When both mtd and bills fail, error takes priority over unavailable
    // because error is detected before checking the unavailable matrix
    const result = computeForecast(
      makeInputs({ mtdQuery: error(), billsQuery: error() })
    )
    // mtdQuery.error is checked first → status = 'error'
    expect(result.status).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// Status: partialNoHistory
// ---------------------------------------------------------------------------

describe('computeForecast — status: partialNoHistory', () => {
  it('returns partialNoHistory when all history errored but bills ok', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [error(), error(), error()] })
    )
    expect(result.status).toBe('partialNoHistory')
  })

  it('returns partialNoHistory when 2 of 3 months succeed (historyMonthsUsed < configN)', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, error(), JAN] })
    )
    expect(result.status).toBe('partialNoHistory')
    expect(result.breakdown.historyMonthsUsed).toBe(2)
  })

  it('variableForecast is null when historyMonthsUsed=0', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [error(), error(), error()] })
    )
    expect(result.variableForecast).toBeNull()
    expect(result.breakdown.weightedAvgDaily).toBeNull()
  })

  it('variableForecast is computed when historyMonthsUsed>0 (partial history)', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, error(), JAN] })
    )
    expect(result.variableForecast).not.toBeNull()
    expect(result.variableForecast).toBeGreaterThan(0)
  })

  it('billsForecast included in total when bills available', () => {
    const bill = makeBill({ pcAmountAvg: 14.23, payDates: ['2026-04-20'] })
    const result = computeForecast(
      makeInputs({
        historicalQueries: [error(), error(), error()],
        billsQuery: success([bill]),
        mtdQuery: success({ amount: 450, currencyCode: 'EUR' }),
      })
    )
    expect(result.billsForecast).toBeCloseTo(14.23, 5)
    expect(result.total).toBeCloseTo(450 + 14.23, 5) // variableForecast=null → 0
  })

  it('historyMonthsUsed is 2 when 1 of 3 errored', () => {
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, error(), JAN] })
    )
    expect(result.breakdown.historyMonthsUsed).toBe(2)
  })

  it('partialNoHistory precedes partialNoBills', () => {
    // 2 of 3 history months + bills also fail → partialNoHistory wins
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, error(), JAN], billsQuery: error() })
    )
    expect(result.status).toBe('partialNoHistory')
  })
})

// ---------------------------------------------------------------------------
// Status: partialNoBills
// ---------------------------------------------------------------------------

describe('computeForecast — status: partialNoBills', () => {
  it('returns partialNoBills when bills errored and all history ok', () => {
    const result = computeForecast(makeInputs({ billsQuery: error() }))
    expect(result.status).toBe('partialNoBills')
  })

  it('billsForecast is null in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsQuery: error() }))
    expect(result.billsForecast).toBeNull()
  })

  it('variableForecast is computed normally in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsQuery: error() }))
    expect(result.variableForecast).not.toBeNull()
    expect(result.variableForecast).toBeGreaterThan(0)
  })

  it('total = mtdSpent + variableForecast when bills null', () => {
    const result = computeForecast(makeInputs({ billsQuery: error() }))
    expect(result.total).toBeCloseTo(result.mtdSpent! + result.variableForecast!, 8)
  })

  it('pendingBills in breakdown is empty in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsQuery: error() }))
    expect(result.breakdown.pendingBills).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Status: ok — full calculation
// ---------------------------------------------------------------------------

describe('computeForecast — status: ok', () => {
  it('returns ok when all queries succeed with full history', () => {
    expect(computeForecast(makeInputs()).status).toBe('ok')
  })

  it('currency is passed through', () => {
    expect(computeForecast(makeInputs()).currency).toEqual(EUR)
  })

  it('total = mtdSpent + variableForecast + billsForecast', () => {
    const result = computeForecast(makeInputs())
    expect(result.total).toBeCloseTo(
      result.mtdSpent! + result.variableForecast! + result.billsForecast!,
      8
    )
  })

  it('billsForecast = sum of all pendingBill amounts', () => {
    const bill1 = makeBill({ id: '1', pcAmountAvg: 14.23, payDates: ['2026-04-20'] })
    const bill2 = makeBill({ id: '2', name: 'Spotify', pcAmountAvg: 9.99, payDates: ['2026-04-28'] })
    const result = computeForecast(makeInputs({ billsQuery: success([bill1, bill2]) }))
    expect(result.billsForecast).toBeCloseTo(14.23 + 9.99, 5)
  })

  it('billsForecast = 0 when no bills have pay_dates in range', () => {
    const billNoMatch = makeBill({ payDates: ['2026-03-15'] }) // past date
    const result = computeForecast(makeInputs({ billsQuery: success([billNoMatch]) }))
    expect(result.billsForecast).toBe(0)
    expect(result.breakdown.pendingBills).toEqual([])
  })

  it('historyMonthsUsed = config.historyMonths in ok state', () => {
    expect(computeForecast(makeInputs()).breakdown.historyMonthsUsed).toBe(3)
  })

  it('mtdSpent is passed through unchanged', () => {
    const result = computeForecast(makeInputs({ mtdQuery: success({ amount: 1234.56, currencyCode: 'EUR' }) }))
    expect(result.mtdSpent).toBe(1234.56)
  })
})

// ---------------------------------------------------------------------------
// Date calculations
// ---------------------------------------------------------------------------

describe('computeForecast — date calculations', () => {
  it('April 11: daysInMonth=30, daysElapsed=11, daysRemaining=19', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 11) }))
    expect(result.breakdown.daysInMonth).toBe(30)
    expect(result.breakdown.daysElapsed).toBe(11)
    expect(result.breakdown.daysRemaining).toBe(19)
  })

  it('last day of month: daysRemaining=0 → variableForecast=0', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 30) }))
    expect(result.breakdown.daysRemaining).toBe(0)
    expect(result.variableForecast).toBe(0)
  })

  it('first day of month: daysElapsed=1, daysRemaining=29', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 1) }))
    expect(result.breakdown.daysElapsed).toBe(1)
    expect(result.breakdown.daysRemaining).toBe(29)
  })

  it('February 2026 (non-leap): daysInMonth=28', () => {
    const result = computeForecast(
      makeInputs({
        today: new Date(2026, 1, 15),
        historicalQueries: [
          historyMonth(600, 31), // Jan
          historyMonth(550, 31), // Dec
          historyMonth(580, 30), // Nov
        ],
      })
    )
    expect(result.breakdown.daysInMonth).toBe(28)
  })

  it('February 2028 (leap year): daysInMonth=29', () => {
    const result = computeForecast(
      makeInputs({
        today: new Date(2028, 1, 15),
        historicalQueries: [
          historyMonth(600, 31),
          historyMonth(550, 31),
          historyMonth(580, 30),
        ],
      })
    )
    expect(result.breakdown.daysInMonth).toBe(29)
  })
})

// ---------------------------------------------------------------------------
// Weighted average calculation
// ---------------------------------------------------------------------------

describe('computeForecast — weightedAvgDaily calculation', () => {
  it('N=1 weighted: weightedAvgDaily = variableSpend / daysInMonth', () => {
    const result = computeForecast(
      makeInputs({
        config: { historyMonths: 1, model: 'weighted' },
        historicalQueries: [historyMonth(620, 31)],
      })
    )
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(620 / 31, 8)
  })

  it('N=3 weighted: correct linear-descending weighted average', () => {
    const w0 = 3 / 6 // 0.5
    const w1 = 2 / 6
    const w2 = 1 / 6
    const expected =
      w0 * (620 / 31) + w1 * (560 / 28) + w2 * (700 / 31)
    const result = computeForecast(makeInputs())
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(expected, 8)
  })

  it('N=3 simple: weightedAvgDaily = arithmetic mean of daily rates', () => {
    const expected = ((620 / 31) + (560 / 28) + (700 / 31)) / 3
    const result = computeForecast(
      makeInputs({ config: { historyMonths: 3, model: 'simple' } })
    )
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(expected, 8)
  })

  it('variableForecast = weightedAvgDaily * daysRemaining', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 11) }))
    const { daysRemaining, weightedAvgDaily } = result.breakdown
    expect(result.variableForecast).toBeCloseTo(weightedAvgDaily! * daysRemaining, 8)
  })

  it('gap months excluded: 2 valid of 3, recomputed weights (N=2)', () => {
    const w0 = 2 / 3
    const w1 = 1 / 3
    const expected = w0 * (620 / 31) + w1 * (700 / 31)
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, error(), JAN] })
    )
    // Note: status is partialNoHistory (2 < 3), but calculation is still correct
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(expected, 8)
  })

  it('N=1 simple === N=1 weighted (computeWeights(1, *) = [1])', () => {
    const simpleResult = computeForecast(
      makeInputs({ config: { historyMonths: 1, model: 'simple' }, historicalQueries: [MARCH] })
    )
    const weightedResult = computeForecast(
      makeInputs({ config: { historyMonths: 1, model: 'weighted' }, historicalQueries: [MARCH] })
    )
    expect(simpleResult.breakdown.weightedAvgDaily).toBeCloseTo(
      weightedResult.breakdown.weightedAvgDaily!,
      8
    )
  })

  it('history entry with non-primary currency excluded from calculation', () => {
    const usdEntry = entry('USD', 500)
    const eurEntry = entry('EUR', 620)
    // Month has both USD and EUR entries — only EUR should contribute
    const mixedMonth = success({ entries: [usdEntry, eurEntry], daysInMonth: 31 })
    const result = computeForecast(
      makeInputs({
        config: { historyMonths: 1, model: 'simple' },
        historicalQueries: [mixedMonth],
      })
    )
    // Only EUR 620 used: 620/31
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(620 / 31, 8)
    expect(result.status).toBe('ok')
  })

  it('history month with only non-primary currency entries excluded entirely', () => {
    const usdOnlyMonth = success({ entries: [entry('USD', 500)], daysInMonth: 31 })
    const result = computeForecast(
      makeInputs({
        historicalQueries: [MARCH, usdOnlyMonth, JAN],
        config: { historyMonths: 3, model: 'weighted' },
      })
    )
    // Only MARCH and JAN contribute → partialNoHistory (2 < 3)
    expect(result.status).toBe('partialNoHistory')
    expect(result.breakdown.historyMonthsUsed).toBe(2)
  })

  it('daysInMonth=0 in historical query is skipped (defensive)', () => {
    const badMonth = success({ entries: [entry('EUR', 500)], daysInMonth: 0 })
    const result = computeForecast(
      makeInputs({ historicalQueries: [MARCH, badMonth, JAN] })
    )
    expect(result.breakdown.historyMonthsUsed).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Bill filtering logic
// ---------------------------------------------------------------------------

describe('computeForecast — bill filtering', () => {
  it('bill payDate on today is excluded (today is already in MTD)', () => {
    const todayBill = makeBill({ payDates: ['2026-04-11'] }) // today
    const result = computeForecast(makeInputs({ billsQuery: success([todayBill]) }))
    expect(result.breakdown.pendingBills).toEqual([])
    expect(result.billsForecast).toBe(0)
  })

  it('bill payDate strictly after today is included', () => {
    const futureBill = makeBill({ payDates: ['2026-04-12'] }) // tomorrow
    const result = computeForecast(makeInputs({ billsQuery: success([futureBill]) }))
    expect(result.breakdown.pendingBills).toHaveLength(1)
  })

  it('bill payDate beyond end-of-month is excluded', () => {
    const nextMonthBill = makeBill({ payDates: ['2026-05-01'] })
    const result = computeForecast(makeInputs({ billsQuery: success([nextMonthBill]) }))
    expect(result.breakdown.pendingBills).toEqual([])
  })

  it('last day of month payDate is included', () => {
    // Input is the normalized Bill.payDates contract (YYYY-MM-DD). Normalization from Firefly ISO8601 datetime happens in bills.ts parser — see bills.test.ts for that boundary.
    const lastDayBill = makeBill({ payDates: ['2026-04-30'] })
    const result = computeForecast(makeInputs({ billsQuery: success([lastDayBill]) }))
    expect(result.breakdown.pendingBills).toHaveLength(1)
  })

  it('bill with multiple payDates in range generates multiple pendingBill entries', () => {
    const multiBill = makeBill({ payDates: ['2026-04-15', '2026-04-25'] })
    const result = computeForecast(makeInputs({ billsQuery: success([multiBill]) }))
    expect(result.breakdown.pendingBills).toHaveLength(2)
    expect(result.billsForecast).toBeCloseTo(14.23 * 2, 5)
  })

  it('inactive bill is ignored', () => {
    const inactiveBill = makeBill({ active: false })
    const result = computeForecast(makeInputs({ billsQuery: success([inactiveBill]) }))
    expect(result.breakdown.pendingBills).toEqual([])
    expect(result.billsForecast).toBe(0)
  })

  it('already-paid payDate is excluded (matches paidDates)', () => {
    const paidBill = makeBill({
      payDates: ['2026-04-20'],
      paidDates: [{ date: '2026-04-20', transactionJournalId: '5', transactionGroupId: '3' }],
    })
    const result = computeForecast(makeInputs({ billsQuery: success([paidBill]) }))
    expect(result.breakdown.pendingBills).toEqual([])
    expect(result.billsForecast).toBe(0)
  })

  it('uses pcAmountAvg when available', () => {
    const bill = makeBill({ pcAmountAvg: 14.23, amountAvg: 12.99 })
    const result = computeForecast(makeInputs({ billsQuery: success([bill]) }))
    expect(result.breakdown.pendingBills[0].amount).toBeCloseTo(14.23, 5)
  })

  it('falls back to amountAvg when pcAmountAvg is null', () => {
    const bill = makeBill({ pcAmountAvg: null, amountAvg: 12.99 })
    const result = computeForecast(makeInputs({ billsQuery: success([bill]) }))
    expect(result.breakdown.pendingBills[0].amount).toBeCloseTo(12.99, 5)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('computeForecast — edge cases', () => {
  it('all history months same daily rate: simple and weighted give same result', () => {
    const uniform = historyMonth(620, 31) // 20/day
    const simpleResult = computeForecast(
      makeInputs({
        config: { historyMonths: 3, model: 'simple' },
        historicalQueries: [uniform, uniform, uniform],
      })
    )
    const weightedResult = computeForecast(
      makeInputs({
        config: { historyMonths: 3, model: 'weighted' },
        historicalQueries: [uniform, uniform, uniform],
      })
    )
    expect(simpleResult.variableForecast).toBeCloseTo(weightedResult.variableForecast!, 8)
  })

  it('daysRemaining=0 on last day: variableForecast=0, total=mtd+bills', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 30) }))
    expect(result.variableForecast).toBe(0)
    expect(result.total).toBeCloseTo(result.mtdSpent! + result.billsForecast!, 8)
  })

  it('mtdSpent=0 (beginning of month): total = variableForecast + billsForecast', () => {
    const result = computeForecast(
      makeInputs({ mtdQuery: success({ amount: 0, currencyCode: 'EUR' }) })
    )
    expect(result.mtdSpent).toBe(0)
    expect(result.total).toBeCloseTo(result.variableForecast! + result.billsForecast!, 8)
  })

  it('total formula: mtd + (variable ?? 0) + (bills ?? 0)', () => {
    // partialNoHistory: variableForecast=null, billsForecast=14.23, mtd=450
    const bill = makeBill({ pcAmountAvg: 14.23 })
    const result = computeForecast(
      makeInputs({
        historicalQueries: [error(), error(), error()],
        billsQuery: success([bill]),
        mtdQuery: success({ amount: 450, currencyCode: 'EUR' }),
      })
    )
    // variable=null → 0; total = 450 + 0 + 14.23
    expect(result.total).toBeCloseTo(450 + 14.23, 5)
  })

  it('no bills at all: billsForecast=0, total=mtd+variableForecast', () => {
    const result = computeForecast(makeInputs({ billsQuery: success([]) }))
    expect(result.billsForecast).toBe(0)
    expect(result.total).toBeCloseTo(result.mtdSpent! + result.variableForecast!, 8)
  })
})
