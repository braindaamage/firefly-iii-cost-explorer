import { describe, it, expect } from 'vitest'
import { DEFAULT_FILTERS } from './filters'

describe('DEFAULT_FILTERS', () => {
  it('has correct default timeRange', () => {
    expect(DEFAULT_FILTERS.timeRange).toBe('last_30_days')
  })

  it('has null customDateRange by default', () => {
    expect(DEFAULT_FILTERS.customDateRange).toBeNull()
  })

  it('has category as default groupBy', () => {
    expect(DEFAULT_FILTERS.groupBy).toBe('category')
  })

  it('has empty arrays for all id filters', () => {
    expect(DEFAULT_FILTERS.accountIds).toEqual([])
    expect(DEFAULT_FILTERS.categoryIds).toEqual([])
    expect(DEFAULT_FILTERS.budgetIds).toEqual([])
    expect(DEFAULT_FILTERS.tagIds).toEqual([])
  })
})
