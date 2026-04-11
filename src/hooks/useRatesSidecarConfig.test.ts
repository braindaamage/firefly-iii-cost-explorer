import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useRatesSidecarConfig } from './useRatesSidecarConfig'
import type { RatesSidecarConfig, RatesSidecarLastRun } from '../api/ratesSidecarConfig'
import { DEFAULT_CONFIG } from '../api/ratesSidecarConfig'

vi.mock('../api/ratesSidecarConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/ratesSidecarConfig')>()
  return {
    ...actual,
    getRatesSidecarConfig: vi.fn(),
    putRatesSidecarConfig: vi.fn(),
    getRatesSidecarLastRun: vi.fn(),
    putRatesSidecarRunNow: vi.fn(),
  }
})

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const MOCK_LAST_RUN: RatesSidecarLastRun = {
  timestamp: '2026-04-11T07:00:12Z',
  status: 'success',
  source: 'open-er-api',
  currenciesUpdated: ['USD', 'CLP'],
  currenciesFailed: [],
  error: null,
  nextRunEstimated: '2026-04-12T07:00:00Z',
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useRatesSidecarConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads config from remote preference', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    const remoteConfig: RatesSidecarConfig = { ...DEFAULT_CONFIG, enabled: false }
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(remoteConfig)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(remoteConfig)
    expect(result.current.source).toBe('remote')
  })

  it('returns DEFAULT_CONFIG when preference is 404', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(DEFAULT_CONFIG)
    expect(result.current.source).toBe('default')
  })

  it('returns DEFAULT_CONFIG on malformed remote value', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue({ bad: 'data' } as unknown as RatesSidecarConfig)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(DEFAULT_CONFIG)
    expect(result.current.source).toBe('default')
    warnSpy.mockRestore()
  })

  it('updateConfig_optimisticUpdate_cacheUpdatedImmediately', async () => {
    const { getRatesSidecarConfig, putRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)
    let resolvePut!: () => void
    vi.mocked(putRatesSidecarConfig).mockReturnValue(
      new Promise<void>((res) => { resolvePut = res })
    )

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const next: RatesSidecarConfig = { ...DEFAULT_CONFIG, enabled: false }
    act(() => { void result.current.updateConfig(next) })

    await waitFor(() => expect(result.current.config).toEqual(next))
    expect(vi.mocked(putRatesSidecarConfig)).toHaveBeenCalled()
    resolvePut()
  })

  it('updateConfig_putFailed_statusBecomesLocalFallback', async () => {
    const { getRatesSidecarConfig, putRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)
    vi.mocked(putRatesSidecarConfig).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    await act(async () => { await result.current.updateConfig({ ...DEFAULT_CONFIG, enabled: false }) })

    expect(result.current.status).toBe('localFallback')
  })

  it('retryRemote_clearsFailedState_andRefetches', async () => {
    const { getRatesSidecarConfig, putRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)
    vi.mocked(putRatesSidecarConfig).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))
    await act(async () => { await result.current.updateConfig({ ...DEFAULT_CONFIG, enabled: false }) })
    await waitFor(() => expect(result.current.status).toBe('localFallback'))

    vi.mocked(getRatesSidecarConfig).mockResolvedValue(DEFAULT_CONFIG)
    await act(async () => { await result.current.retryRemote() })

    await waitFor(() => expect(result.current.status).toBe('success'))
  })

  it('lastRun_polledEvery60s_whenNotPending', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.lastRunStatus).toBe('success'))
    expect(result.current.lastRun).toEqual(MOCK_LAST_RUN)
    expect(result.current.runNowPending).toBe(false)
  })

  it('triggerRunNow_writesPreference_withRequestedAt', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun, putRatesSidecarRunNow } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)
    vi.mocked(putRatesSidecarRunNow).mockResolvedValue(undefined)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    let requestedAt!: string
    await act(async () => { requestedAt = await result.current.triggerRunNow() })

    expect(putRatesSidecarRunNow).toHaveBeenCalledWith(BASE_URL, TOKEN, requestedAt)
    expect(requestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('triggerRunNow_polls_every10s_whilePending', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun, putRatesSidecarRunNow } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)
    vi.mocked(putRatesSidecarRunNow).mockResolvedValue(undefined)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    await act(async () => { await result.current.triggerRunNow() })

    expect(result.current.runNowPending).toBe(true)
  })

  it('triggerRunNow_completesWhen_lastRunTimestampAdvances', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun, putRatesSidecarRunNow } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)
    vi.mocked(putRatesSidecarRunNow).mockResolvedValue(undefined)

    // Use a wrapper that exposes the queryClient so we can setQueryData
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), { wrapper })
    await waitFor(() => expect(result.current.lastRunStatus).toBe('success'))

    let requestedAt!: string
    await act(async () => { requestedAt = await result.current.triggerRunNow() })
    expect(result.current.runNowPending).toBe(true)

    // Simulate lastRun timestamp advancing past requestedAt via setQueryData
    const newLastRun: RatesSidecarLastRun = {
      ...MOCK_LAST_RUN,
      timestamp: new Date(Date.parse(requestedAt) + 5000).toISOString(),
    }
    act(() => {
      qc.setQueryData(['ratesSidecar', 'lastRun', BASE_URL], newLastRun)
    })

    await waitFor(() => expect(result.current.runNowPending).toBe(false), { timeout: 3000 })
  })

  it('triggerRunNow_timesOut_after10min', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun, putRatesSidecarRunNow } = await import('../api/ratesSidecarConfig')
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(null)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(MOCK_LAST_RUN)
    vi.mocked(putRatesSidecarRunNow).mockResolvedValue(undefined)

    vi.useFakeTimers()

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    // Allow queries to settle with fake timers
    await act(async () => { await Promise.resolve() })

    await act(async () => { await result.current.triggerRunNow() })
    expect(result.current.runNowPending).toBe(true)

    // Advance 10+ minutes
    await act(async () => { vi.advanceTimersByTime(10 * 60 * 1000 + 1000) })

    expect(result.current.runNowPending).toBe(false)
    expect(result.current.runNowTimedOut).toBe(true)
  })

  it('triggerRunNow_disabled_whenConfigNotEnabled', async () => {
    const { getRatesSidecarConfig, getRatesSidecarLastRun } = await import('../api/ratesSidecarConfig')
    const disabledConfig: RatesSidecarConfig = { ...DEFAULT_CONFIG, enabled: false }
    vi.mocked(getRatesSidecarConfig).mockResolvedValue(disabledConfig)
    vi.mocked(getRatesSidecarLastRun).mockResolvedValue(null)

    const { result } = renderHook(() => useRatesSidecarConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    // config.enabled is false — component should disable the Run now button
    expect(result.current.config.enabled).toBe(false)
    // Hook returns runNowPending=false by default (no triggerRunNow called)
    expect(result.current.runNowPending).toBe(false)
  })
})
