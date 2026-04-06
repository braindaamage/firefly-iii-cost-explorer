import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTransactionsByGroup } from './transactions'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const rawGroup = {
  id: '1',
  attributes: {
    transactions: [
      {
        transaction_journal_id: 10,
        date: '2026-01-15T00:00:00+00:00',
        amount: '150.00',
        description: 'Grocery shopping',
        source_name: 'Checking Account',
        destination_name: 'Supermarket',
        currency_code: 'EUR',
      },
    ],
  },
}

const rawResponse = {
  data: [rawGroup],
  meta: {
    pagination: { total: 1, count: 1, per_page: 50, current_page: 1, total_pages: 1 },
  },
}

function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    })
  )
}

describe('fetchTransactionsByGroup', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('uses category endpoint for groupBy=category', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '5', 'Groceries', '2026-01-01', '2026-01-31', 1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/categories/5/transactions'),
      expect.anything()
    )
  })

  it('uses budget endpoint for groupBy=budget', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'budget', '3', 'Food', '2026-01-01', '2026-01-31', 1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/3/transactions'),
      expect.anything()
    )
  })

  it('uses tag name in URL for groupBy=tag', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'tag', '1', 'vacation', '2026-01-01', '2026-01-31', 1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/tags/vacation/transactions'),
      expect.anything()
    )
  })

  it('uses accounts endpoint for groupBy=expense_account', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'expense_account', '7', 'Supermarket', '2026-01-01', '2026-01-31', 1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/7/transactions'),
      expect.anything()
    )
  })

  it('uses accounts endpoint for groupBy=asset_account', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'asset_account', '2', 'Checking', '2026-01-01', '2026-01-31', 1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/2/transactions'),
      expect.anything()
    )
  })

  it('includes start, end, type and page params', async () => {
    mockFetchOk(rawResponse)
    await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '1', 'Food', '2026-01-01', '2026-01-31', 2)
    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('start=2026-01-01')
    expect(calledUrl).toContain('end=2026-01-31')
    expect(calledUrl).toContain('type=withdrawal')
    expect(calledUrl).toContain('page=2')
  })

  it('flattens transaction journals into Transaction objects', async () => {
    mockFetchOk(rawResponse)
    const result = await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '1', 'Food', '2026-01-01', '2026-01-31', 1)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      date: '2026-01-15',
      description: 'Grocery shopping',
      amount: 150,
      currencyCode: 'EUR',
      sourceAccount: 'Checking Account',
      destinationAccount: 'Supermarket',
    })
  })

  it('uses Math.abs() so amounts are always positive', async () => {
    const negResponse = {
      data: [{ id: '1', attributes: { transactions: [{ ...rawGroup.attributes.transactions[0], amount: '-150.00' }] } }],
      meta: rawResponse.meta,
    }
    mockFetchOk(negResponse)
    const result = await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '1', 'Food', '2026-01-01', '2026-01-31', 1)
    expect(result.transactions[0].amount).toBe(150)
  })

  it('returns pagination info', async () => {
    mockFetchOk(rawResponse)
    const result = await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '1', 'Food', '2026-01-01', '2026-01-31', 1)
    expect(result.pagination).toEqual({
      total: 1, count: 1, perPage: 50, currentPage: 1, totalPages: 1,
    })
  })

  it('handles multiple transaction journals per group', async () => {
    const multiGroup = {
      data: [{
        id: '1',
        attributes: {
          transactions: [
            { transaction_journal_id: 10, date: '2026-01-15T00:00:00+00:00', amount: '100.00', description: 'Split 1', source_name: 'Checking', destination_name: 'Shop A', currency_code: 'EUR' },
            { transaction_journal_id: 11, date: '2026-01-15T00:00:00+00:00', amount: '50.00', description: 'Split 2', source_name: 'Checking', destination_name: 'Shop B', currency_code: 'EUR' },
          ],
        },
      }],
      meta: rawResponse.meta,
    }
    mockFetchOk(multiGroup)
    const result = await fetchTransactionsByGroup(BASE_URL, TOKEN, 'category', '1', 'Food', '2026-01-01', '2026-01-31', 1)
    expect(result.transactions).toHaveLength(2)
  })
})
