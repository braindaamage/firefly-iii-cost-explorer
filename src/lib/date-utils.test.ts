import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDateRangeFromPreset,
  getPresetLabel,
  getEffectiveDateRange,
} from './date-utils'
import type { FilterState } from '../types/filters'
import { DEFAULT_FILTERS } from '../types/filters'

// Fixed date: 2026-04-06
const FIXED_DATE = new Date('2026-04-06T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getDateRangeFromPreset', () => {
  it('last_7_days returns last 6 days + today', () => {
    const range = getDateRangeFromPreset('last_7_days')
    expect(range).toEqual({ start: '2026-03-31', end: '2026-04-06' })
  })

  it('last_30_days returns last 29 days + today', () => {
    const range = getDateRangeFromPreset('last_30_days')
    expect(range).toEqual({ start: '2026-03-08', end: '2026-04-06' })
  })

  it('this_month returns start and end of current month', () => {
    const range = getDateRangeFromPreset('this_month')
    expect(range).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })

  it('last_month returns start and end of previous month', () => {
    const range = getDateRangeFromPreset('last_month')
    expect(range).toEqual({ start: '2026-03-01', end: '2026-03-31' })
  })

  it('last_3_months returns 3 months back to today', () => {
    const range = getDateRangeFromPreset('last_3_months')
    expect(range).toEqual({ start: '2026-01-06', end: '2026-04-06' })
  })

  it('last_6_months returns 6 months back to today', () => {
    const range = getDateRangeFromPreset('last_6_months')
    expect(range).toEqual({ start: '2025-10-06', end: '2026-04-06' })
  })

  it('this_year returns start and end of current year', () => {
    const range = getDateRangeFromPreset('this_year')
    expect(range).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })
})

describe('getPresetLabel', () => {
  it('returns correct labels for all presets', () => {
    expect(getPresetLabel('last_7_days')).toBe('Last 7 days')
    expect(getPresetLabel('last_30_days')).toBe('Last 30 days')
    expect(getPresetLabel('this_month')).toBe('This month')
    expect(getPresetLabel('last_month')).toBe('Last month')
    expect(getPresetLabel('last_3_months')).toBe('Last 3 months')
    expect(getPresetLabel('last_6_months')).toBe('Last 6 months')
    expect(getPresetLabel('this_year')).toBe('This year')
    expect(getPresetLabel('custom')).toBe('Custom range')
  })
})

describe('getEffectiveDateRange', () => {
  it('returns preset range when timeRange is not custom', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, timeRange: 'this_month' }
    const range = getEffectiveDateRange(filters)
    expect(range).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })

  it('returns customDateRange when timeRange is custom and customDateRange is set', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      timeRange: 'custom',
      customDateRange: { start: '2026-01-01', end: '2026-03-31' },
    }
    const range = getEffectiveDateRange(filters)
    expect(range).toEqual({ start: '2026-01-01', end: '2026-03-31' })
  })

  it('falls back to last 30 days when custom but no customDateRange', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      timeRange: 'custom',
      customDateRange: null,
    }
    const range = getEffectiveDateRange(filters)
    expect(range).toEqual({ start: '2026-03-08', end: '2026-04-06' })
  })
})
