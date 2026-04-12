import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDashboardData } from './useDashboardData'
import { DEFAULT_FILTERS } from '../types/filters'
import type { FilterState } from '../types/filters'
vi.mock('./useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
    isConfigured: true,
  }),
}))

vi.mock('../api/insights', () => ({
  fetchInsightExpenseByCategory: vi.fn().mockResolvedValue([
    { id: '1', name: 'Groceries', difference: '-500.00', difference_float: -500.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
    { id: '2', name: 'Transport', difference: '-200.00', difference_float: -200.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
  ]),
  fetchInsightExpenseByBudget: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByTag: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByExpenseAccount: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByAssetAccount: vi.fn().mockResolvedValue([]),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

describe('useDashboardData', () => {
  it('returns loading true initially', () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    expect(result.current.isLoading).toBe(true)
  })

  it('processes results and returns series with colors', async () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.series.length).toBeGreaterThan(0)
    expect(result.current.series[0]).toMatchObject({
      name: 'Groceries',
      color: expect.stringMatching(/^#/),
    })
  })

  it('converts negative difference_float to positive amounts in chart data', async () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const firstPoint = result.current.chartData[0]
    expect(firstPoint['Groceries']).toBe(500)
    expect(firstPoint['Transport']).toBe(200)
  })

  it('assigns unique colors to each series', async () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const colors = result.current.series.map((s) => s.color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(colors.length)
  })

  it('returns currencyCode from entries', async () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currencyCode).toBe('EUR')
  })

  it('returns periods array', async () => {
    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.periods.length).toBeGreaterThan(0)
  })

  it('propagates error when a query fails', async () => {
    const { fetchInsightExpenseByCategory } = await import('../api/insights')
    vi.mocked(fetchInsightExpenseByCategory).mockRejectedValueOnce(
      new Error('API error')
    )

    const { result } = renderHook(
      () => useDashboardData({ ...DEFAULT_FILTERS }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 3000,
    })
    expect(result.current.error).not.toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('uses budget fetch function when groupBy is budget', async () => {
    const { fetchInsightExpenseByBudget } = await import('../api/insights')
    const filters: FilterState = { ...DEFAULT_FILTERS, groupBy: 'budget' }
    const { result } = renderHook(() => useDashboardData(filters), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(vi.mocked(fetchInsightExpenseByBudget)).toHaveBeenCalled()
  })

  it('with granularityOverride "month" returns monthly periods for last_30_days range', async () => {
    // last_30_days would normally use 'week' granularity, but with 'month' override it uses month
    const filters: FilterState = { ...DEFAULT_FILTERS, timeRange: 'last_30_days' }
    const { result } = renderHook(() => useDashboardData(filters, 'month'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // All periods should be monthly (label format "MMM yyyy")
    result.current.periods.forEach((p) => {
      expect(p.label).toMatch(/^[A-Z][a-z]+ \d{4}$/)
    })
  })

  it('with granularityOverride "day" returns daily periods', async () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, timeRange: 'last_7_days' }
    const { result } = renderHook(() => useDashboardData(filters, 'day'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // All periods should be daily (label format "MMM d")
    result.current.periods.forEach((p) => {
      expect(p.label).toMatch(/^[A-Z][a-z]+ \d+$/)
    })
  })

  it('with granularityOverride "auto" uses automatic granularity', async () => {
    // last_7_days = 7 days, auto would pick 'day'
    const filters: FilterState = { ...DEFAULT_FILTERS, timeRange: 'last_7_days' }
    const { result } = renderHook(() => useDashboardData(filters, 'auto'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.periods.length).toBeGreaterThan(0)
  })

  describe('exchange rate conversion', () => {
    const EUR_ENTRIES = [
      { id: '1', name: 'Groceries', difference: '-500.00', difference_float: -500.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
      { id: '2', name: 'Transport', difference: '-200.00', difference_float: -200.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
    ]

    beforeEach(async () => {
      const { fetchInsightExpenseByCategory } = await import('../api/insights')
      // Reset to default EUR mock before each test in this block
      vi.mocked(fetchInsightExpenseByCategory).mockResolvedValue(EUR_ENTRIES)
    })

    it('converts foreign currency amounts using exchangeRates', async () => {
      const { fetchInsightExpenseByCategory } = await import('../api/insights')
      vi.mocked(fetchInsightExpenseByCategory).mockResolvedValue([
        { id: '1', name: 'Foreign', difference: '-100.00', difference_float: -100.0, currency_id: '2', currency_code: 'USD' },
      ])

      const exchangeRates = { USD: 0.9 }
      const { result } = renderHook(
        () => useDashboardData({ ...DEFAULT_FILTERS }, 'auto', exchangeRates, 'EUR'),
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const firstPoint = result.current.chartData[0]
      // 100 USD * 0.9 = 90 EUR
      expect(firstPoint['Foreign']).toBeCloseTo(90, 8)
    })

    it('uses nominal amount as fallback when exchangeRates is undefined', async () => {
      const { fetchInsightExpenseByCategory } = await import('../api/insights')
      vi.mocked(fetchInsightExpenseByCategory).mockResolvedValue([
        { id: '1', name: 'Foreign', difference: '-100.00', difference_float: -100.0, currency_id: '2', currency_code: 'USD' },
      ])

      const { result } = renderHook(
        () => useDashboardData({ ...DEFAULT_FILTERS }),  // no exchangeRates
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const firstPoint = result.current.chartData[0]
      expect(firstPoint['Foreign']).toBe(100)  // nominal, no conversion
    })

    it('uses nominal as fallback when rate for the entry currency is missing', async () => {
      const { fetchInsightExpenseByCategory } = await import('../api/insights')
      vi.mocked(fetchInsightExpenseByCategory).mockResolvedValue([
        { id: '1', name: 'Foreign', difference: '-100.00', difference_float: -100.0, currency_id: '2', currency_code: 'GBP' },
      ])

      const exchangeRates = { USD: 0.9 }  // no GBP rate
      const { result } = renderHook(
        () => useDashboardData({ ...DEFAULT_FILTERS }, 'auto', exchangeRates, 'EUR'),
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const firstPoint = result.current.chartData[0]
      expect(firstPoint['Foreign']).toBe(100)  // fallback to nominal
    })

    it('uses primaryCurrencyCode as currencyCode when provided', async () => {
      const { result } = renderHook(
        () => useDashboardData({ ...DEFAULT_FILTERS }, 'auto', {}, 'EUR'),
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.currencyCode).toBe('EUR')
    })

    it('primary currency entries are NOT converted even when exchangeRates is provided', async () => {
      const { result } = renderHook(
        () => useDashboardData({ ...DEFAULT_FILTERS }, 'auto', { EUR: 999 }, 'EUR'),
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const firstPoint = result.current.chartData[0]
      // EUR 500 should not be multiplied by the EUR entry in exchangeRates
      expect(firstPoint['Groceries']).toBe(500)
      expect(firstPoint['Transport']).toBe(200)
    })
  })
})
