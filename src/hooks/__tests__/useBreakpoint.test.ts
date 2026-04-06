import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBreakpoint } from '../useBreakpoint'

type ChangeHandler = () => void

function mockMatchMedia(width: number) {
  const handlers: ChangeHandler[] = []
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('1024')
      ? width >= 1024
      : query.includes('768')
        ? width >= 768
        : false,
    addEventListener: (_: string, fn: ChangeHandler) => handlers.push(fn),
    removeEventListener: vi.fn(),
  }))
  return handlers
}

afterEach(() => vi.restoreAllMocks())

describe('useBreakpoint', () => {
  it('returns "desktop" when width >= 1024', () => {
    mockMatchMedia(1440)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('desktop')
  })

  it('returns "tablet" when 768 <= width < 1024', () => {
    mockMatchMedia(900)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('tablet')
  })

  it('returns "mobile" when width < 768', () => {
    mockMatchMedia(375)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')
  })

  it('updates when media query changes to mobile', () => {
    // Use mutable mock objects so the B-4 handler reads updated .matches from the closure
    interface MqRecord { matches: boolean; handlers: ChangeHandler[] }
    const mqRecords: MqRecord[] = []

    vi.stubGlobal('matchMedia', (query: string) => {
      const rec: MqRecord = {
        matches: query.includes('1024') ? true : false,
        handlers: [],
      }
      mqRecords.push(rec)
      return {
        get matches() { return rec.matches },
        addEventListener: (_: string, fn: ChangeHandler) => rec.handlers.push(fn),
        removeEventListener: vi.fn(),
      }
    })

    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('desktop')

    // Simulate resize to mobile: flip all matches to false
    mqRecords.forEach((rec) => { rec.matches = false })

    act(() => {
      mqRecords.flatMap((rec) => rec.handlers).forEach((h) => h())
    })

    expect(result.current).toBe('mobile')
  })

  it('cleans up event listeners on unmount', () => {
    const removeEventListener = vi.fn()
    vi.stubGlobal('matchMedia', (_query: string) => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener,
    }))
    const { unmount } = renderHook(() => useBreakpoint())
    unmount()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
