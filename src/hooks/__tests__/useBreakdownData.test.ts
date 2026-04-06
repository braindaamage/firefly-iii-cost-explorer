import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useBreakdownData } from '../useBreakdownData'
import { DEFAULT_FILTERS } from '../../types/filters'
import type { FilterState } from '../../types/filters'

vi.mock('../useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
    isConfigured: true,
  }),
}))

vi.mock('../../api/insights', () => ({
  fetchInsightExpenseByCategory: vi.fn().mockResolvedValue([
    { id: '1', name: 'Groceries', difference: '-500.00', difference_float: -500.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
    { id: '2', name: 'Transport', difference: '-200.00', difference_float: -200.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
  ]),
  fetchInsightExpenseByBudget: vi.fn().mockResolvedValue([
    { id: '1', name: 'Monthly Food', difference: '-300.00', difference_float: -300.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' },
  ]),
  fetchInsightExpenseByTag: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByExpenseAccount: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByAssetAccount: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/budgets', () => ({
  fetchBudgets: vi.fn().mockResolvedValue([]),
  fetchBudgetLimits: vi.fn().mockResolvedValue([
    { id: '1', budget_id: '1', budget_name: 'Monthly Food', amount: 400, currency_code: 'EUR' },
  ]),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

describe('useBreakdownData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isLoading true initially', () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })

  it('returns rows with positive actualCost (abs of difference_float)', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows[0].actualCost).toBe(500)
    expect(result.current.rows[1].actualCost).toBe(200)
  })

  it('returns rows sorted by actualCost descending by default', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows[0].actualCost).toBeGreaterThanOrEqual(result.current.rows[1].actualCost)
  })

  it('assigns colors to rows', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows[0].color).toMatch(/^#/)
  })

  it('returns null for budgeted and variance when groupBy is category', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows[0].budgeted).toBeNull()
    expect(result.current.rows[0].variance).toBeNull()
  })

  it('returns budgeted and variance when groupBy is budget', async () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, groupBy: 'budget' }
    const { result } = renderHook(() => useBreakdownData(filters), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const row = result.current.rows.find((r) => r.name === 'Monthly Food')
    expect(row).toBeDefined()
    expect(row!.budgeted).toBe(400)
    expect(row!.variance).toBe(-100) // actual (300) - budgeted (400) = -100 (under budget)
  })

  it('returns totals row with summed values', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.totals.actualCost).toBe(700)
  })

  it('returns percentChange null when no previous data exists', async () => {
    const { fetchInsightExpenseByCategory } = await import('../../api/insights')
    // current returns data, previous returns empty → percentChange = null
    vi.mocked(fetchInsightExpenseByCategory)
      .mockResolvedValueOnce([{ id: '1', name: 'Groceries', difference: '-500.00', difference_float: -500.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' }])
      .mockResolvedValueOnce([])
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const row = result.current.rows.find((r) => r.name === 'Groceries')
    expect(row?.percentChange).toBeNull()
  })

  it('calculates percentChange correctly', async () => {
    const { fetchInsightExpenseByCategory } = await import('../../api/insights')
    // Simulate: current = 600, previous = 500 → +20%
    vi.mocked(fetchInsightExpenseByCategory)
      .mockResolvedValueOnce([{ id: '1', name: 'Groceries', difference: '-600.00', difference_float: -600.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' }])
      .mockResolvedValueOnce([{ id: '1', name: 'Groceries', difference: '-500.00', difference_float: -500.0, currency_id: '1', currency_code: 'EUR', currency_symbol: '€' }])
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const row = result.current.rows.find((r) => r.name === 'Groceries')
    expect(row?.percentChange).toBeCloseTo(20, 0)
  })

  it('returns currencyCode from results', async () => {
    const { result } = renderHook(() => useBreakdownData(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currencyCode).toBe('EUR')
  })
})
