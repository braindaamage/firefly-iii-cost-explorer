import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useForecastConfig } from './useForecastConfig'
import type { ForecastConfig } from './useForecastConfig'

vi.mock('../api/preferences', () => ({
  getPreference: vi.fn(),
  putPreference: vi.fn(),
}))

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'
const DEFAULTS: ForecastConfig = { historyMonths: 3, model: 'weighted' }

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useForecastConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('mount with GET 404 → defaults, source="default", status="success"', async () => {
    const { getPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(DEFAULTS)
    expect(result.current.source).toBe('default')
  })

  it('mount with GET success → remote config, source="remote", localStorage updated', async () => {
    const { getPreference } = await import('../api/preferences')
    const remoteConfig: ForecastConfig = { historyMonths: 6, model: 'simple' }
    vi.mocked(getPreference).mockResolvedValue(remoteConfig)

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(remoteConfig)
    expect(result.current.source).toBe('remote')
    const stored = JSON.parse(localStorage.getItem('ff3_forecast_config')!)
    expect(stored).toEqual(remoteConfig)
  })

  it('mount with GET success but malformed value → defaults, warning logged', async () => {
    const { getPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue({ historyMonths: 999 } as ForecastConfig)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.config).toEqual(DEFAULTS)
    expect(result.current.source).toBe('default')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed'),
      expect.anything()
    )
    warnSpy.mockRestore()
  })

  it('mount with GET error + localStorage cache → localFallback, source="local"', async () => {
    const { getPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockRejectedValue(new Error('Network error'))
    const cachedConfig: ForecastConfig = { historyMonths: 2, model: 'simple' }
    localStorage.setItem('ff3_forecast_config', JSON.stringify(cachedConfig))

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('localFallback'))
    expect(result.current.config).toEqual(cachedConfig)
    expect(result.current.source).toBe('local')
  })

  it('mount with GET error + no localStorage → defaults, status="error"', async () => {
    const { getPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.config).toEqual(DEFAULTS)
    expect(result.current.source).toBe('default')
  })

  it('updateConfig optimistic: config updates before put resolves', async () => {
    const { getPreference, putPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)
    let resolvePut!: () => void
    vi.mocked(putPreference).mockReturnValue(
      new Promise<void>((res) => { resolvePut = res })
    )

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const next: ForecastConfig = { historyMonths: 6, model: 'simple' }
    // Start update but don't await it — put is still pending
    act(() => { void result.current.updateConfig(next) })

    // Config updates via setQueryData before the put promise resolves
    await waitFor(() => expect(result.current.config).toEqual(next))

    // Verify put was called but hasn't completed yet (resolvePut still pending)
    expect(vi.mocked(putPreference)).toHaveBeenCalled()
    resolvePut()
  })

  it('updateConfig with putPreference success → status stays "success"', async () => {
    const { getPreference, putPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)
    vi.mocked(putPreference).mockResolvedValue(undefined)

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const next: ForecastConfig = { historyMonths: 6, model: 'simple' }
    await act(async () => { await result.current.updateConfig(next) })

    await waitFor(() => expect(result.current.config).toEqual(next))
    expect(result.current.status).toBe('success')
  })

  it('updateConfig with putPreference failure → status="localFallback", optimistic not reverted', async () => {
    const { getPreference, putPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)
    vi.mocked(putPreference).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const next: ForecastConfig = { historyMonths: 6, model: 'simple' }
    await act(() => result.current.updateConfig(next))

    expect(result.current.status).toBe('localFallback')
    // Config was not reverted — optimistic value remains
    expect(result.current.config).toEqual(next)
  })

  it('updateConfig writes localStorage before put', async () => {
    const { getPreference, putPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)
    let storageValueDuringPut: string | null = null
    vi.mocked(putPreference).mockImplementation(async () => {
      storageValueDuringPut = localStorage.getItem('ff3_forecast_config')
    })

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const next: ForecastConfig = { historyMonths: 6, model: 'simple' }
    await act(() => result.current.updateConfig(next))

    expect(storageValueDuringPut).not.toBeNull()
    expect(JSON.parse(storageValueDuringPut!)).toEqual(next)
  })

  it('retryRemote triggers re-invalidation', async () => {
    const { getPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Call retryRemote — should not throw and triggers re-query
    await act(() => result.current.retryRemote())
    expect(vi.mocked(getPreference)).toHaveBeenCalledTimes(2)
  })

  it('retryRemote after putFailed transitions from localFallback to success', async () => {
    const { getPreference, putPreference } = await import('../api/preferences')
    vi.mocked(getPreference).mockResolvedValue(null)
    vi.mocked(putPreference).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useForecastConfig(BASE_URL, TOKEN), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Trigger failure
    await act(async () => { await result.current.updateConfig({ historyMonths: 6, model: 'simple' }) })
    await waitFor(() => expect(result.current.status).toBe('localFallback'))

    // Now retryRemote with success
    vi.mocked(getPreference).mockResolvedValue({ historyMonths: 6, model: 'simple' })
    await act(async () => { await result.current.retryRemote() })

    await waitFor(() => expect(result.current.status).toBe('success'))
  })

  it('enabled: false when baseUrl or token empty → status="loading", config=defaults', () => {
    const { result } = renderHook(() => useForecastConfig('', ''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.status).toBe('loading')
    expect(result.current.config).toEqual(DEFAULTS)
    expect(result.current.source).toBe('default')
  })
})
