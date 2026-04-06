import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBudgets, fetchBudgetLimits } from './budgets'
import type { AutocompleteBudget } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const mockBudgets: AutocompleteBudget[] = [
  { id: '1', name: 'Monthly Food' },
  { id: '2', name: 'Transport' },
]

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

describe('fetchBudgets', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct URL', async () => {
    mockFetchOk(mockBudgets)
    await fetchBudgets(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/autocomplete/budgets?limit=100`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
  })

  it('returns parsed budget list', async () => {
    mockFetchOk(mockBudgets)
    const result = await fetchBudgets(BASE_URL, TOKEN)
    expect(result).toEqual(mockBudgets)
  })
})

describe('fetchBudgetLimits', () => {
  beforeEach(() => vi.restoreAllMocks())

  const rawResponse = {
    data: [
      {
        id: '1',
        attributes: {
          budget_id: 1,
          budget_name: 'Monthly Food',
          amount: '500.00',
          currency_code: 'EUR',
        },
      },
      {
        id: '2',
        attributes: {
          budget_id: 2,
          budget_name: 'Transport',
          amount: '200.00',
          currency_code: 'EUR',
        },
      },
    ],
    meta: { pagination: { total: 2, count: 2, per_page: 50, current_page: 1, total_pages: 1 } },
  }

  it('calls the budget-limits endpoint with start and end params', async () => {
    mockFetchOk(rawResponse)
    await fetchBudgetLimits(BASE_URL, TOKEN, '2026-01-01', '2026-01-31')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('budget-limits'),
      expect.anything()
    )
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('start=2026-01-01'),
      expect.anything()
    )
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('end=2026-01-31'),
      expect.anything()
    )
  })

  it('returns parsed BudgetLimit array', async () => {
    mockFetchOk(rawResponse)
    const result = await fetchBudgetLimits(BASE_URL, TOKEN, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: '1',
      budget_id: '1',
      budget_name: 'Monthly Food',
      amount: 500,
      currency_code: 'EUR',
    })
    expect(result[1].amount).toBe(200)
  })

  it('returns empty array when no limits exist', async () => {
    mockFetchOk({ data: [], meta: {} })
    const result = await fetchBudgetLimits(BASE_URL, TOKEN, '2026-01-01', '2026-01-31')
    expect(result).toEqual([])
  })
})
