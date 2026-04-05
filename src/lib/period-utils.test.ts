import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGranularity, splitIntoPeriods } from './period-utils'

const FIXED = new Date('2026-04-06T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED)
})
afterEach(() => vi.useRealTimers())

describe('getGranularity', () => {
  it('returns day for range <= 14 days', () => {
    expect(getGranularity({ start: '2026-03-31', end: '2026-04-06' })).toBe('day')
  })

  it('returns day for exactly 14 days', () => {
    expect(getGranularity({ start: '2026-03-24', end: '2026-04-06' })).toBe('day')
  })

  it('returns week for 15 to 90 days', () => {
    expect(getGranularity({ start: '2026-03-08', end: '2026-04-06' })).toBe('week')
  })

  it('returns week for exactly 90 days', () => {
    expect(getGranularity({ start: '2026-01-06', end: '2026-04-06' })).toBe('week')
  })

  it('returns month for range > 90 days', () => {
    expect(getGranularity({ start: '2025-10-06', end: '2026-04-06' })).toBe('month')
  })
})

describe('splitIntoPeriods — day granularity', () => {
  it('returns one period per day', () => {
    const range = { start: '2026-03-31', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'day')
    expect(periods).toHaveLength(7)
  })

  it('first period starts and ends on the range start', () => {
    const range = { start: '2026-03-31', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'day')
    expect(periods[0]).toEqual({ start: '2026-03-31', end: '2026-03-31', label: 'Mar 31' })
  })

  it('labels use "MMM d" format', () => {
    const range = { start: '2026-04-01', end: '2026-04-03' }
    const periods = splitIntoPeriods(range, 'day')
    expect(periods.map((p) => p.label)).toEqual(['Apr 1', 'Apr 2', 'Apr 3'])
  })
})

describe('splitIntoPeriods — week granularity', () => {
  it('returns approximately 4-5 weeks for a 30 day range', () => {
    const range = { start: '2026-03-08', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'week')
    expect(periods.length).toBeGreaterThanOrEqual(4)
    expect(periods.length).toBeLessThanOrEqual(6)
  })

  it('clamps first period start to range start', () => {
    const range = { start: '2026-03-10', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'week')
    expect(periods[0].start).toBe('2026-03-10')
  })

  it('clamps last period end to range end', () => {
    const range = { start: '2026-03-08', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'week')
    expect(periods[periods.length - 1].end).toBe('2026-04-06')
  })

  it('week labels show start-end day range', () => {
    const range = { start: '2026-03-16', end: '2026-03-22' }
    const periods = splitIntoPeriods(range, 'week')
    // Mon Mar 16 – Sun Mar 22
    expect(periods[0].label).toContain('Mar')
  })
})

describe('splitIntoPeriods — month granularity', () => {
  it('returns 6 periods for a 6-month range', () => {
    const range = { start: '2025-10-06', end: '2026-04-06' }
    const periods = splitIntoPeriods(range, 'month')
    expect(periods).toHaveLength(7) // Oct, Nov, Dec, Jan, Feb, Mar, Apr
  })

  it('month labels use "MMM yyyy" format', () => {
    const range = { start: '2026-01-01', end: '2026-03-31' }
    const periods = splitIntoPeriods(range, 'month')
    expect(periods[0].label).toBe('Jan 2026')
    expect(periods[1].label).toBe('Feb 2026')
    expect(periods[2].label).toBe('Mar 2026')
  })

  it('clamps first period to range start', () => {
    const range = { start: '2026-01-15', end: '2026-03-31' }
    const periods = splitIntoPeriods(range, 'month')
    expect(periods[0].start).toBe('2026-01-15')
    expect(periods[0].end).toBe('2026-01-31')
  })

  it('clamps last period to range end', () => {
    const range = { start: '2026-01-01', end: '2026-03-15' }
    const periods = splitIntoPeriods(range, 'month')
    expect(periods[periods.length - 1].end).toBe('2026-03-15')
  })
})
