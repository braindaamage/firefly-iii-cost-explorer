import { describe, it, expect } from 'vitest'
import { computeForecast } from './computeForecast'
import type { ComputeForecastInputs, HistoryMonthInput, PendingBill } from './computeForecast'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EUR = { code: 'EUR', symbol: '€', decimalPlaces: 2 }

/** April 11 2026 — mid-month baseline */
const TODAY = new Date(2026, 3, 11) // month is 0-indexed

const BASE_BILL: PendingBill = { id: '1', name: 'Netflix', amount: 14.23, date: '2026-04-20' }
const SPOTIFY: PendingBill = { id: '2', name: 'Spotify', amount: 9.99, date: '2026-04-28' }

/** March 2026: 31 days, €620 variable spend */
const MARCH: HistoryMonthInput = { variableSpend: 620, daysInMonth: 31 }
/** February 2026: 28 days, €560 variable spend */
const FEB: HistoryMonthInput = { variableSpend: 560, daysInMonth: 28 }
/** January 2026: 31 days, €700 variable spend */
const JAN: HistoryMonthInput = { variableSpend: 700, daysInMonth: 31 }

function makeInputs(overrides: Partial<ComputeForecastInputs> = {}): ComputeForecastInputs {
  return {
    today: TODAY,
    config: { historyMonths: 3, model: 'weighted' },
    primaryCurrency: EUR,
    historyStatuses: ['success', 'success', 'success'],
    mtdStatus: 'success',
    billsStatus: 'success',
    historyData: [MARCH, FEB, JAN],
    mtdSpent: 450,
    pendingBills: [BASE_BILL],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function dateInfo(today: Date = TODAY) {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed
  return { daysInMonth, daysElapsed, daysRemaining }
}

// ---------------------------------------------------------------------------
// Status: loading
// ---------------------------------------------------------------------------

describe('computeForecast — status: loading', () => {
  it('returns loading when mtdStatus is pending', () => {
    const result = computeForecast(makeInputs({ mtdStatus: 'pending' }))
    expect(result.status).toBe('loading')
  })

  it('returns loading when billsStatus is pending', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'pending' }))
    expect(result.status).toBe('loading')
  })

  it('returns loading when any historyStatus is pending', () => {
    const result = computeForecast(
      makeInputs({ historyStatuses: ['success', 'pending', 'success'] })
    )
    expect(result.status).toBe('loading')
  })

  it('returns loading when all historyStatuses are pending', () => {
    const result = computeForecast(
      makeInputs({ historyStatuses: ['pending', 'pending', 'pending'] })
    )
    expect(result.status).toBe('loading')
  })

  it('loading result has null currency and null totals', () => {
    const result = computeForecast(makeInputs({ mtdStatus: 'pending' }))
    expect(result.currency).toBeNull()
    expect(result.mtdSpent).toBeNull()
    expect(result.total).toBeNull()
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

  it('returns unavailable when mtdStatus and billsStatus are both error', () => {
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', billsStatus: 'error', mtdSpent: null })
    )
    expect(result.status).toBe('unavailable')
  })

  it('unavailable result includes correct date info', () => {
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', billsStatus: 'error', mtdSpent: null })
    )
    const { daysInMonth, daysElapsed, daysRemaining } = dateInfo()
    expect(result.breakdown.daysInMonth).toBe(daysInMonth)
    expect(result.breakdown.daysElapsed).toBe(daysElapsed)
    expect(result.breakdown.daysRemaining).toBe(daysRemaining)
  })
})

// ---------------------------------------------------------------------------
// Status: error
// ---------------------------------------------------------------------------

describe('computeForecast — status: error', () => {
  it('returns error when mtdStatus is error but billsStatus is success', () => {
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', mtdSpent: null })
    )
    expect(result.status).toBe('error')
  })

  it('error result has null mtdSpent and null total', () => {
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', mtdSpent: null })
    )
    expect(result.mtdSpent).toBeNull()
    expect(result.total).toBeNull()
  })

  it('error result includes pending bills in breakdown when bills succeeded', () => {
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', mtdSpent: null, pendingBills: [BASE_BILL] })
    )
    expect(result.breakdown.pendingBills).toEqual([BASE_BILL])
  })

  it('error result has empty pendingBills in breakdown when bills also errored', () => {
    // This case is unreachable in practice (would be 'unavailable') but let's guard
    // — handled as error since mtdStatus=error takes priority over the bills check
    // Actually: if mtd=error and bills=error → unavailable (tested above).
    // If mtd=error and bills=success → error with pendingBills.
    // So this branch tests: mtd=error, bills=error → unavailable (not error).
    const result = computeForecast(
      makeInputs({ mtdStatus: 'error', billsStatus: 'error', mtdSpent: null })
    )
    expect(result.status).toBe('unavailable') // unavailable takes priority
  })
})

// ---------------------------------------------------------------------------
// Status: partialNoHistory
// ---------------------------------------------------------------------------

describe('computeForecast — status: partialNoHistory', () => {
  it('returns partialNoHistory when all historyData are null (all errored)', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
      })
    )
    expect(result.status).toBe('partialNoHistory')
  })

  it('variableForecast is null in partialNoHistory', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
      })
    )
    expect(result.variableForecast).toBeNull()
    expect(result.breakdown.weightedAvgDaily).toBeNull()
  })

  it('billsForecast is computed from pendingBills in partialNoHistory', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
        pendingBills: [BASE_BILL, SPOTIFY],
      })
    )
    expect(result.billsForecast).toBeCloseTo(BASE_BILL.amount + SPOTIFY.amount, 5)
  })

  it('total = mtdSpent + billsForecast in partialNoHistory', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
        mtdSpent: 450,
        pendingBills: [BASE_BILL],
      })
    )
    expect(result.total).toBeCloseTo(450 + BASE_BILL.amount, 5)
  })

  it('historyMonthsUsed is 0 in partialNoHistory', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
      })
    )
    expect(result.breakdown.historyMonthsUsed).toBe(0)
  })

  it('total is null when billsForecast is unavailable too (bills errored)', () => {
    // bills also errored → billsForecast null, total null
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['error', 'error', 'error'],
        historyData: [null, null, null],
        billsStatus: 'error',
      })
    )
    // But wait: mtd=success, bills=error, history=all error
    // → historyMonthsUsed=0 → partialNoHistory path
    // → billsForecast=null, total=null
    expect(result.status).toBe('partialNoHistory')
    expect(result.billsForecast).toBeNull()
    expect(result.total).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Status: partialNoBills
// ---------------------------------------------------------------------------

describe('computeForecast — status: partialNoBills', () => {
  it('returns partialNoBills when billsStatus is error (history and MTD ok)', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'error' }))
    expect(result.status).toBe('partialNoBills')
  })

  it('billsForecast is null in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'error' }))
    expect(result.billsForecast).toBeNull()
  })

  it('variableForecast is computed normally in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'error' }))
    expect(result.variableForecast).not.toBeNull()
    expect(result.variableForecast).toBeGreaterThan(0)
  })

  it('total = mtdSpent + variableForecast in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'error', mtdSpent: 450 }))
    expect(result.total).toBeCloseTo(450 + result.variableForecast!, 5)
  })

  it('pendingBills in breakdown is empty array in partialNoBills', () => {
    const result = computeForecast(makeInputs({ billsStatus: 'error' }))
    expect(result.breakdown.pendingBills).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Status: ok — full calculation
// ---------------------------------------------------------------------------

describe('computeForecast — status: ok', () => {
  it('returns ok when all data is available', () => {
    expect(computeForecast(makeInputs()).status).toBe('ok')
  })

  it('propagates currency correctly', () => {
    const result = computeForecast(makeInputs())
    expect(result.currency).toEqual(EUR)
  })

  it('mtdSpent is passed through unchanged', () => {
    const result = computeForecast(makeInputs({ mtdSpent: 450 }))
    expect(result.mtdSpent).toBe(450)
  })

  it('total = mtdSpent + variableForecast + billsForecast', () => {
    const result = computeForecast(makeInputs({ pendingBills: [BASE_BILL] }))
    expect(result.total).toBeCloseTo(
      result.mtdSpent! + result.variableForecast! + result.billsForecast!,
      8
    )
  })

  it('billsForecast = sum of all pendingBills amounts', () => {
    const result = computeForecast(
      makeInputs({ pendingBills: [BASE_BILL, SPOTIFY] })
    )
    expect(result.billsForecast).toBeCloseTo(BASE_BILL.amount + SPOTIFY.amount, 5)
  })

  it('billsForecast = 0 when no pending bills', () => {
    const result = computeForecast(makeInputs({ pendingBills: [] }))
    expect(result.billsForecast).toBe(0)
  })

  it('pendingBills in breakdown matches the input pendingBills', () => {
    const result = computeForecast(makeInputs({ pendingBills: [BASE_BILL, SPOTIFY] }))
    expect(result.breakdown.pendingBills).toEqual([BASE_BILL, SPOTIFY])
  })

  it('historyMonthsUsed reflects actual valid months (all 3 valid)', () => {
    const result = computeForecast(makeInputs())
    expect(result.breakdown.historyMonthsUsed).toBe(3)
  })

  it('historyMonthsUsed reflects actual valid months (1 errored, 2 valid)', () => {
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['success', 'error', 'success'],
        historyData: [MARCH, null, JAN],
      })
    )
    expect(result.status).toBe('ok')
    expect(result.breakdown.historyMonthsUsed).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Date calculations
// ---------------------------------------------------------------------------

describe('computeForecast — date calculations', () => {
  it('April 11 2026: daysInMonth=30, daysElapsed=11, daysRemaining=19', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 11) }))
    expect(result.breakdown.daysInMonth).toBe(30)
    expect(result.breakdown.daysElapsed).toBe(11)
    expect(result.breakdown.daysRemaining).toBe(19)
  })

  it('April 30 (last day): daysRemaining=0 → variableForecast=0', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 30) }))
    expect(result.breakdown.daysRemaining).toBe(0)
    expect(result.variableForecast).toBe(0)
  })

  it('April 1 (first day): daysElapsed=1, daysRemaining=29', () => {
    const result = computeForecast(makeInputs({ today: new Date(2026, 3, 1) }))
    expect(result.breakdown.daysElapsed).toBe(1)
    expect(result.breakdown.daysRemaining).toBe(29)
  })

  it('February 28 2026 (non-leap): daysInMonth=28', () => {
    const result = computeForecast(
      makeInputs({
        today: new Date(2026, 1, 28),
        historyData: [
          { variableSpend: 600, daysInMonth: 31 }, // Jan
          { variableSpend: 550, daysInMonth: 31 }, // Dec
          { variableSpend: 580, daysInMonth: 30 }, // Nov
        ],
      })
    )
    expect(result.breakdown.daysInMonth).toBe(28)
    expect(result.breakdown.daysElapsed).toBe(28)
    expect(result.breakdown.daysRemaining).toBe(0)
  })

  it('February 29 2028 (leap year): daysInMonth=29', () => {
    const result = computeForecast(
      makeInputs({
        today: new Date(2028, 1, 15),
        historyData: [
          { variableSpend: 600, daysInMonth: 31 },
          { variableSpend: 550, daysInMonth: 31 },
          { variableSpend: 580, daysInMonth: 30 },
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
        historyStatuses: ['success'],
        historyData: [MARCH], // 620 / 31
      })
    )
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(620 / 31, 8)
  })

  it('N=3 weighted: most recent month has highest influence', () => {
    // March (most recent): 620/31 ≈ 20.0/day
    // Feb:                 560/28 = 20.0/day
    // Jan:                 700/31 ≈ 22.6/day
    // Weighted: 0.5 * (620/31) + (1/3) * (560/28) + (1/6) * (700/31)
    const w0 = 3 / 6 // 0.5
    const w1 = 2 / 6 // 0.333...
    const w2 = 1 / 6 // 0.166...
    const expected =
      w0 * (MARCH.variableSpend / MARCH.daysInMonth) +
      w1 * (FEB.variableSpend / FEB.daysInMonth) +
      w2 * (JAN.variableSpend / JAN.daysInMonth)
    const result = computeForecast(makeInputs())
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(expected, 8)
  })

  it('N=3 simple: weightedAvgDaily = arithmetic mean of daily rates', () => {
    const expected =
      ((MARCH.variableSpend / MARCH.daysInMonth) +
        (FEB.variableSpend / FEB.daysInMonth) +
        (JAN.variableSpend / JAN.daysInMonth)) /
      3
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

  it('gap months are excluded from weighted average (2 valid, 1 null)', () => {
    // Only MARCH and JAN are valid; weights are recomputed for N=2
    const w0 = 2 / 3
    const w1 = 1 / 3
    const expected =
      w0 * (MARCH.variableSpend / MARCH.daysInMonth) +
      w1 * (JAN.variableSpend / JAN.daysInMonth)
    const result = computeForecast(
      makeInputs({
        historyStatuses: ['success', 'error', 'success'],
        historyData: [MARCH, null, JAN],
      })
    )
    expect(result.breakdown.weightedAvgDaily).toBeCloseTo(expected, 8)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('computeForecast — edge cases', () => {
  it('single pending bill: billsForecast equals that bill amount', () => {
    const result = computeForecast(makeInputs({ pendingBills: [BASE_BILL] }))
    expect(result.billsForecast).toBeCloseTo(BASE_BILL.amount, 8)
  })

  it('mtdSpent=0 (beginning of month): total includes only forecast components', () => {
    const result = computeForecast(makeInputs({ mtdSpent: 0 }))
    expect(result.mtdSpent).toBe(0)
    expect(result.total).toBeCloseTo(result.variableForecast! + result.billsForecast!, 8)
  })

  it('all history months have same daily rate: simple and weighted give same result', () => {
    const uniform: HistoryMonthInput = { variableSpend: 620, daysInMonth: 31 }
    const simpleResult = computeForecast(
      makeInputs({
        config: { historyMonths: 3, model: 'simple' },
        historyData: [uniform, uniform, uniform],
      })
    )
    const weightedResult = computeForecast(
      makeInputs({
        config: { historyMonths: 3, model: 'weighted' },
        historyData: [uniform, uniform, uniform],
      })
    )
    expect(simpleResult.variableForecast).toBeCloseTo(weightedResult.variableForecast!, 8)
  })

  it('N=1 history: historyMonthsUsed=1, status ok', () => {
    const result = computeForecast(
      makeInputs({
        config: { historyMonths: 1, model: 'weighted' },
        historyStatuses: ['success'],
        historyData: [MARCH],
      })
    )
    expect(result.status).toBe('ok')
    expect(result.breakdown.historyMonthsUsed).toBe(1)
  })
})
