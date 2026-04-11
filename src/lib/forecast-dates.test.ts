import { describe, it, expect } from 'vitest'
import { getMonthRanges, getMonthStart, getMonthEnd, getTomorrow, formatDate } from './forecast-dates'

describe('getMonthRanges', () => {
  const today = new Date('2026-04-15')

  it('returns n ranges ordered most-recent-first', () => {
    const ranges = getMonthRanges(today, 3)
    expect(ranges).toHaveLength(3)
    expect(ranges[0].label).toBe('2026-03')
    expect(ranges[1].label).toBe('2026-02')
    expect(ranges[2].label).toBe('2026-01')
  })

  it('March 2026 range: 2026-03-01 to 2026-03-31, 31 days', () => {
    const ranges = getMonthRanges(today, 1)
    expect(ranges[0].start).toBe('2026-03-01')
    expect(ranges[0].end).toBe('2026-03-31')
    expect(ranges[0].daysInMonth).toBe(31)
  })

  it('February 2026 range: 2026-02-01 to 2026-02-28, 28 days', () => {
    const ranges = getMonthRanges(today, 2)
    expect(ranges[1].start).toBe('2026-02-01')
    expect(ranges[1].end).toBe('2026-02-28')
    expect(ranges[1].daysInMonth).toBe(28)
  })

  it('January 2026: 31 days', () => {
    const ranges = getMonthRanges(today, 3)
    expect(ranges[2].start).toBe('2026-01-01')
    expect(ranges[2].end).toBe('2026-01-31')
    expect(ranges[2].daysInMonth).toBe(31)
  })

  it('returns 0 ranges when n = 0', () => {
    expect(getMonthRanges(today, 0)).toHaveLength(0)
  })

  it('does not include current month (April 2026)', () => {
    const ranges = getMonthRanges(today, 3)
    ranges.forEach((r) => {
      expect(r.label).not.toBe('2026-04')
    })
  })

  it('handles month boundary: today is first day of month', () => {
    const firstOfApril = new Date('2026-04-01')
    const ranges = getMonthRanges(firstOfApril, 1)
    expect(ranges[0].start).toBe('2026-03-01')
    expect(ranges[0].end).toBe('2026-03-31')
  })

  it('handles year wrap: Dec→Jan', () => {
    const jan = new Date('2026-01-20')
    const ranges = getMonthRanges(jan, 2)
    expect(ranges[0].label).toBe('2025-12')
    expect(ranges[1].label).toBe('2025-11')
  })

  it('February in leap year has 29 days', () => {
    const march2024 = new Date('2024-03-15')
    const ranges = getMonthRanges(march2024, 1)
    expect(ranges[0].start).toBe('2024-02-01')
    expect(ranges[0].end).toBe('2024-02-29')
    expect(ranges[0].daysInMonth).toBe(29)
  })
})

describe('getMonthStart', () => {
  it('returns first day of month', () => {
    expect(getMonthStart(new Date('2026-04-15'))).toBe('2026-04-01')
    expect(getMonthStart(new Date('2026-04-01'))).toBe('2026-04-01')
    expect(getMonthStart(new Date('2026-04-30'))).toBe('2026-04-01')
  })
})

describe('getMonthEnd', () => {
  it('returns last day of month', () => {
    expect(getMonthEnd(new Date('2026-04-15'))).toBe('2026-04-30')
    expect(getMonthEnd(new Date('2026-02-10'))).toBe('2026-02-28')
    expect(getMonthEnd(new Date('2024-02-10'))).toBe('2024-02-29')
  })
})

describe('getTomorrow', () => {
  it('returns next day', () => {
    expect(getTomorrow(new Date('2026-04-15'))).toBe('2026-04-16')
    expect(getTomorrow(new Date('2026-04-30'))).toBe('2026-05-01')
  })
})

describe('formatDate', () => {
  it('formats date to YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-04-15'))).toBe('2026-04-15')
  })
})
