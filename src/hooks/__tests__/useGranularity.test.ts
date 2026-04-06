import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGranularity } from '../useGranularity'

describe('useGranularity', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to "auto"', () => {
    const { result } = renderHook(() => useGranularity())
    expect(result.current.granularity).toBe('auto')
  })

  it('reads from localStorage on init', () => {
    localStorage.setItem('ff3_granularity', JSON.stringify('month'))
    const { result } = renderHook(() => useGranularity())
    expect(result.current.granularity).toBe('month')
  })

  it('updateGranularity changes the value', () => {
    const { result } = renderHook(() => useGranularity())
    act(() => result.current.updateGranularity('week'))
    expect(result.current.granularity).toBe('week')
  })

  it('updateGranularity persists to localStorage', () => {
    const { result } = renderHook(() => useGranularity())
    act(() => result.current.updateGranularity('day'))
    expect(localStorage.getItem('ff3_granularity')).toBe(JSON.stringify('day'))
  })

  it('new hook instance reads persisted value', () => {
    const { result: r1 } = renderHook(() => useGranularity())
    act(() => r1.current.updateGranularity('month'))
    const { result: r2 } = renderHook(() => useGranularity())
    expect(r2.current.granularity).toBe('month')
  })
})
