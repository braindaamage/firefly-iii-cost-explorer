import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from './useFilters'
import { DEFAULT_FILTERS } from '../types/filters'

describe('useFilters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with DEFAULT_FILTERS when localStorage is empty', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.filters).toEqual(DEFAULT_FILTERS)
  })

  it('loads persisted filters from localStorage', () => {
    const saved = { ...DEFAULT_FILTERS, timeRange: 'this_month' as const, groupBy: 'budget' as const }
    localStorage.setItem('ff3_filters', JSON.stringify(saved))

    const { result } = renderHook(() => useFilters())
    expect(result.current.filters.timeRange).toBe('this_month')
    expect(result.current.filters.groupBy).toBe('budget')
  })

  it('updateFilter persists the change to localStorage', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.updateFilter('groupBy', 'budget')
    })

    expect(result.current.filters.groupBy).toBe('budget')
    const stored = JSON.parse(localStorage.getItem('ff3_filters')!)
    expect(stored.groupBy).toBe('budget')
  })

  it('updateFilter updates accountIds', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.updateFilter('accountIds', ['1', '2', '3'])
    })

    expect(result.current.filters.accountIds).toEqual(['1', '2', '3'])
  })

  it('activeOptionalFilters starts empty', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.activeOptionalFilters).toEqual([])
  })

  it('availableOptionalFilters starts with both optional filters', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.availableOptionalFilters).toEqual(['budgetIds', 'tagIds'])
  })

  it('addOptionalFilter moves filter from available to active', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.addOptionalFilter('budgetIds')
    })

    expect(result.current.activeOptionalFilters).toContain('budgetIds')
    expect(result.current.availableOptionalFilters).not.toContain('budgetIds')
  })

  it('addOptionalFilter does not add duplicate', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.addOptionalFilter('budgetIds')
      result.current.addOptionalFilter('budgetIds')
    })

    expect(result.current.activeOptionalFilters.filter((k) => k === 'budgetIds')).toHaveLength(1)
  })

  it('removeOptionalFilter hides chip and resets its ids to empty', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.addOptionalFilter('tagIds')
      result.current.updateFilter('tagIds', ['1', '2'])
    })

    act(() => {
      result.current.removeOptionalFilter('tagIds')
    })

    expect(result.current.activeOptionalFilters).not.toContain('tagIds')
    expect(result.current.filters.tagIds).toEqual([])
  })

  it('derives activeOptionalFilters from persisted non-empty budgetIds on reload', () => {
    const saved = { ...DEFAULT_FILTERS, budgetIds: ['1', '2'] }
    localStorage.setItem('ff3_filters', JSON.stringify(saved))

    const { result } = renderHook(() => useFilters())
    expect(result.current.activeOptionalFilters).toContain('budgetIds')
  })

  it('derives activeOptionalFilters from persisted non-empty tagIds on reload', () => {
    const saved = { ...DEFAULT_FILTERS, tagIds: ['5'] }
    localStorage.setItem('ff3_filters', JSON.stringify(saved))

    const { result } = renderHook(() => useFilters())
    expect(result.current.activeOptionalFilters).toContain('tagIds')
  })

  it('resetFilters resets to DEFAULT_FILTERS and clears optional filters', () => {
    const { result } = renderHook(() => useFilters())

    act(() => {
      result.current.updateFilter('groupBy', 'tag')
      result.current.addOptionalFilter('budgetIds')
      result.current.addOptionalFilter('tagIds')
    })

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.filters).toEqual(DEFAULT_FILTERS)
    expect(result.current.activeOptionalFilters).toEqual([])
    expect(result.current.availableOptionalFilters).toEqual(['budgetIds', 'tagIds'])
  })
})
