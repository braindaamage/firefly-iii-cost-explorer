import { describe, it, expect } from 'vitest'
import { computeForecastOverlay } from './forecast-overlay'
import type { Period } from './period-utils'
import type { PendingBill } from '../hooks/computeForecast'

// today = 2026-04-15 (Wednesday)
const TODAY = '2026-04-15'

const DAILY_RATE = 10 // €10/day

function makeDay(date: string, label?: string): Period {
  return { start: date, end: date, label: label ?? date }
}

function makeWeek(start: string, end: string, label?: string): Period {
  return { start, end, label: label ?? `${start}-${end}` }
}

function makeMonth(start: string, end: string, label: string): Period {
  return { start, end, label }
}

function makeBill(date: string, amount: number): PendingBill {
  return { id: `bill-${date}`, name: `Bill ${date}`, amount, date }
}

describe('computeForecastOverlay', () => {
  describe('weightedAvgDaily = null', () => {
    it('returns all zeros when weightedAvgDaily is null', () => {
      const periods = [
        makeDay('2026-04-14', 'Apr 14'),
        makeDay('2026-04-15', 'Apr 15'),
        makeDay('2026-04-16', 'Apr 16'),
      ]
      const result = computeForecastOverlay(periods, null, [], TODAY)
      expect(result).toEqual([
        { periodLabel: 'Apr 14', value: 0 },
        { periodLabel: 'Apr 15', value: 0 },
        { periodLabel: 'Apr 16', value: 0 },
      ])
    })

    it('returns empty array for empty periods', () => {
      const result = computeForecastOverlay([], null, [], TODAY)
      expect(result).toEqual([])
    })
  })

  describe('empty periods', () => {
    it('returns empty array', () => {
      const result = computeForecastOverlay([], DAILY_RATE, [], TODAY)
      expect(result).toEqual([])
    })
  })

  describe('past periods', () => {
    it('returns value = 0 for a period entirely in the past', () => {
      const periods = [makeDay('2026-04-14', 'Apr 14')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(0)
    })

    it('returns value = 0 when period.end < today (end of past week)', () => {
      const periods = [makeWeek('2026-04-07', '2026-04-13', 'Apr 7-13')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(0)
    })

    it('preserves periodLabel for past periods', () => {
      const periods = [makeDay('2026-04-01', 'Apr 1')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].periodLabel).toBe('Apr 1')
    })
  })

  describe('current period (daily granularity)', () => {
    it('returns weightedAvgDaily × 1 for today with no bills', () => {
      const periods = [makeDay('2026-04-15', 'Apr 15')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(10) // 10 × 1 day
    })

    it('adds bill on today to the value', () => {
      const periods = [makeDay('2026-04-15', 'Apr 15')]
      const bills = [makeBill('2026-04-15', 50)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(60) // 10 × 1 + 50
    })

    it('does not include a bill from a different day', () => {
      const periods = [makeDay('2026-04-15', 'Apr 15')]
      const bills = [makeBill('2026-04-20', 50)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(10) // only variable
    })
  })

  describe('current period (weekly granularity)', () => {
    it('returns weightedAvgDaily × daysInWeek for current week (no bills)', () => {
      // Week containing today: Mon Apr 13 – Sun Apr 19 (7 days)
      const periods = [makeWeek('2026-04-13', '2026-04-19', 'Apr 13-19')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(70) // 10 × 7
    })

    it('adds bills within the week to the value', () => {
      const periods = [makeWeek('2026-04-13', '2026-04-19', 'Apr 13-19')]
      const bills = [makeBill('2026-04-16', 30), makeBill('2026-04-18', 20)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(120) // 10 × 7 + 30 + 20
    })

    it('excludes bills outside the week', () => {
      const periods = [makeWeek('2026-04-13', '2026-04-19', 'Apr 13-19')]
      const bills = [makeBill('2026-04-12', 99), makeBill('2026-04-20', 99)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(70) // only variable
    })
  })

  describe('future period', () => {
    it('returns full forecast for a future day', () => {
      const periods = [makeDay('2026-04-20', 'Apr 20')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(10) // 10 × 1
    })

    it('returns full forecast for a future week', () => {
      const periods = [makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(70) // 10 × 7
    })

    it('includes bills in a future period', () => {
      const periods = [makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26')]
      const bills = [makeBill('2026-04-22', 45)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(115) // 10 × 7 + 45
    })
  })

  describe('bills placement', () => {
    it('bill on period start boundary is included', () => {
      const periods = [makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26')]
      const bills = [makeBill('2026-04-20', 100)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(170) // 10 × 7 + 100
    })

    it('bill on period end boundary is included', () => {
      const periods = [makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26')]
      const bills = [makeBill('2026-04-26', 100)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(170) // 10 × 7 + 100
    })

    it('bill exactly on today boundary is included in current day period', () => {
      const periods = [makeDay('2026-04-15', 'Apr 15')]
      const bills = [makeBill('2026-04-15', 25)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(35) // 10 × 1 + 25
    })

    it('multiple bills in one period are summed', () => {
      const periods = [makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26')]
      const bills = [
        makeBill('2026-04-21', 30),
        makeBill('2026-04-22', 20),
        makeBill('2026-04-25', 50),
      ]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(170) // 10 × 7 + 30 + 20 + 50
    })

    it('bill is only counted in the period that contains its date', () => {
      const periods = [
        makeWeek('2026-04-13', '2026-04-19', 'Apr 13-19'),
        makeWeek('2026-04-20', '2026-04-26', 'Apr 20-26'),
      ]
      const bills = [makeBill('2026-04-19', 80)] // end of first week
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(150) // 10 × 7 + 80 (in first week)
      expect(result[1].value).toBe(70)  // 10 × 7 + 0  (in second week)
    })
  })

  describe('weightedAvgDaily = 0', () => {
    it('returns only bills when weightedAvgDaily is 0', () => {
      const periods = [makeDay('2026-04-20', 'Apr 20')]
      const bills = [makeBill('2026-04-20', 75)]
      const result = computeForecastOverlay(periods, 0, bills, TODAY)
      expect(result[0].value).toBe(75)
    })

    it('returns 0 when weightedAvgDaily is 0 and no bills', () => {
      const periods = [makeDay('2026-04-20', 'Apr 20')]
      const result = computeForecastOverlay(periods, 0, [], TODAY)
      expect(result[0].value).toBe(0)
    })
  })

  describe('monthly granularity', () => {
    it('computes full month forecast for a single current-month period', () => {
      // April: 30 days. today=2026-04-15, so April is current (start<=today<=end)
      const periods = [makeMonth('2026-04-01', '2026-04-30', 'Apr 2026')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(300) // 10 × 30 days
    })

    it('includes bills within the month', () => {
      const periods = [makeMonth('2026-04-01', '2026-04-30', 'Apr 2026')]
      const bills = [makeBill('2026-04-20', 200), makeBill('2026-04-28', 100)]
      const result = computeForecastOverlay(periods, DAILY_RATE, bills, TODAY)
      expect(result[0].value).toBe(600) // 10 × 30 + 200 + 100
    })

    it('past month returns 0', () => {
      const periods = [makeMonth('2026-03-01', '2026-03-31', 'Mar 2026')]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(0)
    })
  })

  describe('mixed past/current/future periods', () => {
    it('correctly handles all three types in one array', () => {
      const periods = [
        makeDay('2026-04-14', 'Apr 14'), // past
        makeDay('2026-04-15', 'Apr 15'), // current
        makeDay('2026-04-16', 'Apr 16'), // future
      ]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result[0].value).toBe(0)  // past
      expect(result[1].value).toBe(10) // current: 10 × 1
      expect(result[2].value).toBe(10) // future: 10 × 1
    })

    it('returns parallel array with same length as periods', () => {
      const periods = [
        makeDay('2026-04-10', 'Apr 10'),
        makeDay('2026-04-15', 'Apr 15'),
        makeDay('2026-04-20', 'Apr 20'),
        makeDay('2026-04-25', 'Apr 25'),
      ]
      const result = computeForecastOverlay(periods, DAILY_RATE, [], TODAY)
      expect(result).toHaveLength(4)
      expect(result.map((r) => r.periodLabel)).toEqual([
        'Apr 10',
        'Apr 15',
        'Apr 20',
        'Apr 25',
      ])
    })
  })
})
