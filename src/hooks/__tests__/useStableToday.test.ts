import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStableToday } from '../useStableToday'

describe('useStableToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the same Date reference on re-render within the same day', () => {
    const { result, rerender } = renderHook(() => useStableToday())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('updates the Date when the calendar day rolls over', async () => {
    vi.useFakeTimers()
    // Set initial time to April 15 noon UTC (April 15 in all timezones UTC-11 to UTC+11)
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))
    const { result } = renderHook(() => useStableToday())
    const initial = result.current

    // Advance system clock by two days and fire interval ticks
    await act(async () => {
      vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'))
      await vi.advanceTimersByTimeAsync(120_000)
    })

    // The hook should have detected the day change and returned a new Date instance
    expect(result.current).not.toBe(initial)
  })

  it('clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useStableToday())
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
