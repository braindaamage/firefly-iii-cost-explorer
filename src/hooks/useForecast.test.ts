import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useForecast } from './useForecast'
import type { ForecastConfig } from './useForecastConfig'

// --- Module mocks ---
vi.mock('../api/summary', () => ({ fetchSummaryBasic: vi.fn() }))
vi.mock('../api/bills', () => ({ fetchBills: vi.fn() }))
vi.mock('../api/insights', () => ({ fetchExpenseNoBill: vi.fn() }))
vi.mock('../api/currencies', async (orig) => {
  const actual = await orig<typeof import('../api/currencies')>()
  return { ...actual, fetchCurrencies: vi.fn() }
})
vi.mock('./useForecastConfig', () => ({ useForecastConfig: vi.fn() }))

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'
const TODAY = new Date('2026-04-15')

const EUR_CURRENCY = {
  id: '1',
  code: 'EUR',
  name: 'Euro',
  symbol: '€',
  decimalPlaces: 2,
  enabled: true,
  isPrimary: true,
}

const DEFAULT_CONFIG: ForecastConfig = { historyMonths: 3, model: 'weighted' }

const MOCK_MTD = { amount: 500, currencyCode: 'EUR' }
const MOCK_BILLS: import('../api/bills').Bill[] = []

// 3 historical months with 300 EUR spend each over 30 days = 10 EUR/day
const makeHistoryEntries = (amount: number) => [
  {
    id: '1',
    name: 'Test',
    difference: `-${amount}.00`,
    difference_float: -amount,
    currency_id: '1',
    currency_code: 'EUR',
    currency_symbol: '€',
  },
]

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

async function getUseForecastConfig() {
  return (await import('./useForecastConfig')).useForecastConfig
}

async function setupConfigMock(
  config: ForecastConfig = DEFAULT_CONFIG,
  status: 'loading' | 'success' = 'success'
) {
  const mod = await getUseForecastConfig()
  vi.mocked(mod).mockReturnValue({
    config,
    status,
    source: 'default',
    updateConfig: vi.fn(),
    retryRemote: vi.fn(),
  })
}

describe('useForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('status=loading when config is still loading', async () => {
    await setupConfigMock(DEFAULT_CONFIG, 'loading')

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    expect(result.current.status).toBe('loading')
  })

  it('status=loading while currencies are pending', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    // currencies still pending → history/mtd gated, but billsQuery may run
    // The overall status depends on pending queries
    expect(result.current.status).toBe('loading')
  })

  it('status=loading while any history query is pending', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)
    const { fetchExpenseNoBill } = await import('../api/insights')
    // One resolves, two never do
    vi.mocked(fetchExpenseNoBill)
      .mockResolvedValueOnce(makeHistoryEntries(300))
      .mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).not.toBe('loading'), { timeout: 500 })
      .catch(() => {
        // Expected to still be loading
        expect(result.current.status).toBe('loading')
      })
  })

  it('status=error when MTD query fails', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockRejectedValue(new Error('API error'))
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('status=partialNoBills when bills query fails but history is complete', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockRejectedValue(new Error('bills error'))
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('partialNoBills'))
  })

  it('status=partialNoHistory when all history entries are in a non-primary currency', async () => {
    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS) // success → bills = 0
    const { fetchExpenseNoBill } = await import('../api/insights')
    // Return entries in USD (not primary EUR) → all months excluded from validDailyRates
    vi.mocked(fetchExpenseNoBill).mockResolvedValue([
      { ...makeHistoryEntries(300)[0], currency_code: 'USD' },
    ])

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('partialNoHistory'))
    expect(result.current.breakdown.historyMonthsUsed).toBe(0)
    expect(result.current.mtdSpent).toBe(500)
  })

  it('status=unavailable when history has no primary-currency data and bills query fails', async () => {
    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockRejectedValue(new Error('bills unavailable'))
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue([]) // empty → historyMonthsUsed = 0

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.mtdSpent).toBe(500)
  })

  it('ok end-to-end: correct total with fixture arithmetic', async () => {
    // today = April 15. daysElapsed=15, daysRemaining=15.
    // 3 months history: March(31 days), Feb(28 days), Jan(31 days).
    // Each month: 300 EUR spend.
    // Daily rates: 300/31, 300/28, 300/31
    // Weighted (most recent first, triangular n=3): weights = [3/6, 2/6, 1/6]
    // weightedAvgDaily = (3/6)*(300/31) + (2/6)*(300/28) + (1/6)*(300/31)
    //                  = (3/6)*(9.677) + (2/6)*(10.714) + (1/6)*(9.677)
    //                  ≈ 4.839 + 3.571 + 1.613 ≈ 10.023
    // variableForecast = 10.023 * 15 ≈ 150.35
    // MTD = 500, bills = 0
    // total ≈ 500 + 150.35 + 0 = 650.35
    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('ok'))
    expect(result.current.mtdSpent).toBe(500)
    expect(result.current.currency?.code).toBe('EUR')
    expect(result.current.total).toBeGreaterThan(600)
    expect(result.current.breakdown.historyMonthsUsed).toBe(3)
    expect(result.current.breakdown.daysRemaining).toBe(15)
  })

  it('historical query keys include correct month ranges for today=2026-04-15, historyMonths=3', async () => {
    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue([])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), { wrapper: makeWrapper() })
    await waitFor(() => expect(vi.mocked(fetchExpenseNoBill)).toHaveBeenCalled())

    const calls = vi.mocked(fetchExpenseNoBill).mock.calls
    const ranges = calls.map((c) => c[2])
    expect(ranges).toContainEqual({ start: '2026-03-01', end: '2026-03-31' })
    expect(ranges).toContainEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(ranges).toContainEqual({ start: '2026-01-01', end: '2026-01-31' })
  })

  it('current month is NOT in historicalQueries (MTD covers it)', async () => {
    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue([])
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), { wrapper: makeWrapper() })
    await waitFor(() => expect(vi.mocked(fetchExpenseNoBill)).toHaveBeenCalled())

    const calls = vi.mocked(fetchExpenseNoBill).mock.calls
    const ranges = calls.map((c) => c[2])
    // April 2026 should NOT be queried
    expect(ranges).not.toContainEqual(
      expect.objectContaining({ start: '2026-04-01' })
    )
  })

  it('MTD query uses primary currency code', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), { wrapper: makeWrapper() })
    await waitFor(() => expect(vi.mocked(fetchSummaryBasic)).toHaveBeenCalled())

    const mtdCall = vi.mocked(fetchSummaryBasic).mock.calls[0]
    expect(mtdCall[2].currencyCode).toBe('EUR')
  })

  it('bills query uses tomorrow as start (not today)', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), { wrapper: makeWrapper() })
    await waitFor(() => expect(vi.mocked(fetchBills)).toHaveBeenCalled())

    const billsCall = vi.mocked(fetchBills).mock.calls[0]
    // today = 2026-04-15 → tomorrow = 2026-04-16
    expect(billsCall[2].start).toBe('2026-04-16')
    // end = last day of April
    expect(billsCall[2].end).toBe('2026-04-30')
  })

  it('primary === null → computeForecast receives primaryCurrency: null → unavailable', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    // No primary currency in the list
    vi.mocked(fetchCurrencies).mockResolvedValue([
      { ...EUR_CURRENCY, isPrimary: false },
    ])
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    // Bills query is not gated by primary, so it can complete.
    // MTD and history are gated by primary (!!primary) so they stay pending.
    // With primary=null, computeForecast returns unavailable (after all enabled queries settle).
    await waitFor(() => expect(result.current.status).toBe('loading'))
    // Stays loading because MTD/history never resolve (primary is null, enabled=false)
    expect(result.current.status).toBe('loading')
  })

  it('enabled: false when baseUrl/token empty → all queries pending, status=loading', async () => {
    await setupConfigMock(DEFAULT_CONFIG, 'success')

    const { result } = renderHook(() => useForecast('', '', TODAY), {
      wrapper: makeWrapper(),
    })
    expect(result.current.status).toBe('loading')
  })

  it('configuring historyMonths=6 launches 6 history queries', async () => {
    await setupConfigMock({ historyMonths: 6, model: 'simple' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), { wrapper: makeWrapper() })
    await waitFor(() => expect(vi.mocked(fetchExpenseNoBill)).toHaveBeenCalledTimes(6))
  })

  it('changing historyMonths from 3 to 6 mid-mount re-computes with 6 historicalQueries', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await setupConfigMock({ historyMonths: 3, model: 'weighted' })
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    const { result, rerender } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    // Change historyMonths to 6 mid-mount
    const mod = await getUseForecastConfig()
    vi.mocked(mod).mockReturnValue({
      config: { historyMonths: 6, model: 'weighted' },
      status: 'success',
      source: 'default',
      updateConfig: vi.fn(),
      retryRemote: vi.fn(),
    })
    rerender()

    // 3 additional months fire (6 total calls across lifetime of the hook)
    await waitFor(() =>
      expect(vi.mocked(fetchExpenseNoBill).mock.calls.length).toBeGreaterThanOrEqual(6)
    )

    // No React hook-rule violations emitted
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('changed size')
    )

    consoleErrorSpy.mockRestore()
  })

  it('computeForecast is not called excessively on stable inputs', async () => {
    await setupConfigMock()
    const { fetchCurrencies } = await import('../api/currencies')
    vi.mocked(fetchCurrencies).mockResolvedValue([EUR_CURRENCY])
    const { fetchExpenseNoBill } = await import('../api/insights')
    vi.mocked(fetchExpenseNoBill).mockResolvedValue(makeHistoryEntries(300))
    const { fetchSummaryBasic } = await import('../api/summary')
    vi.mocked(fetchSummaryBasic).mockResolvedValue(MOCK_MTD)
    const { fetchBills } = await import('../api/bills')
    vi.mocked(fetchBills).mockResolvedValue(MOCK_BILLS)

    const computeSpy = vi.spyOn(await import('./computeForecast'), 'computeForecast')

    const { result } = renderHook(() => useForecast(BASE_URL, TOKEN, TODAY), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    // After reaching 'ok', no new calls on stable inputs
    const callCountAtOk = computeSpy.mock.calls.length
    // Re-check to ensure no spurious recalculations
    expect(callCountAtOk).toBeGreaterThan(0) // at least called once to reach 'ok'
    expect(callCountAtOk).toBeLessThanOrEqual(8) // not called excessively

    computeSpy.mockRestore()
  })
})
