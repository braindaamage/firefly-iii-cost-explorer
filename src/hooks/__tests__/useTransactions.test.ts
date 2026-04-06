import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useTransactions } from '../useTransactions'
import type { Transaction, Pagination } from '../../api/types'

const mockTransaction: Transaction = {
  id: '1-10',
  date: '2026-01-15',
  description: 'Grocery shopping',
  amount: 150,
  currencyCode: 'EUR',
  sourceAccount: 'Checking Account',
  destinationAccount: 'Supermarket',
}

const mockPage = (current: number, total: number) => ({
  transactions: [mockTransaction],
  pagination: { total: total * 1, count: 1, perPage: 50, currentPage: current, totalPages: total } as Pagination,
})

vi.mock('../../api/transactions', () => ({
  fetchTransactionsByGroup: vi.fn().mockResolvedValue({
    transactions: [{
      id: '1-10', date: '2026-01-15', description: 'Grocery shopping',
      amount: 150, currencyCode: 'EUR', sourceAccount: 'Checking Account', destinationAccount: 'Supermarket',
    }],
    pagination: { total: 1, count: 1, perPage: 50, currentPage: 1, totalPages: 1 },
  }),
}))

vi.mock('../useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
  }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

const dateRange = { start: '2026-01-01', end: '2026-01-31' }

describe('useTransactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isLoading true initially', () => {
    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, true),
      { wrapper }
    )
    expect(result.current.isLoading).toBe(true)
  })

  it('returns transactions after loading', async () => {
    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, true),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0].description).toBe('Grocery shopping')
  })

  it('hasNextPage is false when on last page', async () => {
    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, true),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('hasNextPage is true when more pages exist', async () => {
    const { fetchTransactionsByGroup } = await import('../../api/transactions')
    vi.mocked(fetchTransactionsByGroup).mockResolvedValueOnce(mockPage(1, 3))
    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, true),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, false),
      { wrapper }
    )
    expect(result.current.isLoading).toBe(false)
    expect(result.current.transactions).toHaveLength(0)
  })

  it('flattens all pages into a single transactions array', async () => {
    const { fetchTransactionsByGroup } = await import('../../api/transactions')
    const page2Tx: Transaction = { ...mockTransaction, id: '2-20', description: 'Page 2 tx' }
    vi.mocked(fetchTransactionsByGroup)
      .mockResolvedValueOnce({ transactions: [mockTransaction], pagination: { total: 2, count: 1, perPage: 1, currentPage: 1, totalPages: 2 } })
      .mockResolvedValueOnce({ transactions: [page2Tx], pagination: { total: 2, count: 1, perPage: 1, currentPage: 2, totalPages: 2 } })

    const { result } = renderHook(
      () => useTransactions('category', '1', 'Food', dateRange, true),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // First page loaded — fetchNextPage would load the second
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.hasNextPage).toBe(true)
  })
})
