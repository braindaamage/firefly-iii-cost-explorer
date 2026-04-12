import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useExchangeRates } from './useExchangeRates'

vi.mock('../api/exchangeRates', () => ({
  fetchLatestExchangeRate: vi.fn(),
}))

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'
const PRIMARY = 'EUR'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useExchangeRates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty rates and no loading when foreignCodes is empty', () => {
    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, []),
      { wrapper: makeWrapper() }
    )
    expect(result.current.rates).toEqual({})
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('inverts primary→foreign stored rate to produce foreign→primary factor', async () => {
    const { fetchLatestExchangeRate } = await import('../api/exchangeRates')
    // API stores EUR→USD: 1 EUR = 1.25 USD → we want USD→EUR = 1/1.25 = 0.8
    vi.mocked(fetchLatestExchangeRate).mockResolvedValue({
      from: 'EUR',
      to: 'USD',
      rate: 1.25,
      date: '2026-04-12',
    })

    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, ['USD']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates['USD']).toBeCloseTo(1 / 1.25, 8)
    expect(result.current.hasError).toBe(false)
  })

  it('uses rate directly when stored as foreign→primary', async () => {
    const { fetchLatestExchangeRate } = await import('../api/exchangeRates')
    // Unusual case: stored as USD→EUR directly
    vi.mocked(fetchLatestExchangeRate).mockResolvedValue({
      from: 'USD',
      to: 'EUR',
      rate: 0.80,
      date: '2026-04-12',
    })

    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, ['USD']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates['USD']).toBeCloseTo(0.80, 8)
  })

  it('handles two foreign currencies, building correct rates map', async () => {
    const { fetchLatestExchangeRate } = await import('../api/exchangeRates')
    vi.mocked(fetchLatestExchangeRate)
      .mockResolvedValueOnce({ from: 'EUR', to: 'USD', rate: 1.20, date: '2026-04-12' })
      .mockResolvedValueOnce({ from: 'EUR', to: 'GBP', rate: 0.85, date: '2026-04-12' })

    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, ['USD', 'GBP']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates['USD']).toBeCloseTo(1 / 1.20, 8)
    expect(result.current.rates['GBP']).toBeCloseTo(1 / 0.85, 8)
    expect(result.current.hasError).toBe(false)
  })

  it('hasError is true and partial rates returned when one query fails', async () => {
    const { fetchLatestExchangeRate } = await import('../api/exchangeRates')
    vi.mocked(fetchLatestExchangeRate)
      .mockResolvedValueOnce({ from: 'EUR', to: 'USD', rate: 1.20, date: '2026-04-12' })
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, ['USD', 'GBP']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates['USD']).toBeCloseTo(1 / 1.20, 8)
    expect(result.current.rates['GBP']).toBeUndefined()
    expect(result.current.hasError).toBe(true)
  })

  it('omits currency when fetchLatestExchangeRate returns null (pair not configured)', async () => {
    const { fetchLatestExchangeRate } = await import('../api/exchangeRates')
    vi.mocked(fetchLatestExchangeRate).mockResolvedValue(null)

    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, PRIMARY, ['USD']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates['USD']).toBeUndefined()
    expect(result.current.hasError).toBe(false)
  })

  it('does not fetch when primaryCode is empty', () => {
    const { result } = renderHook(
      () => useExchangeRates(BASE_URL, TOKEN, '', ['USD']),
      { wrapper: makeWrapper() }
    )
    // enabled=false → no loading, no fetching
    expect(result.current.isLoading).toBe(false)
    expect(result.current.rates).toEqual({})
  })
})
