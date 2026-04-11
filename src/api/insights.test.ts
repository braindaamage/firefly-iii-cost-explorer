import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchInsightExpenseByCategory,
  fetchInsightExpenseByBudget,
  fetchInsightExpenseByTag,
  fetchInsightExpenseByExpenseAccount,
  fetchInsightExpenseByAssetAccount,
  fetchExpenseNoBill,
} from './insights'
import type { InsightEntry } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const mockEntries: InsightEntry[] = [
  {
    id: '1',
    name: 'Groceries',
    difference: '-500.00',
    difference_float: -500.0,
    currency_id: '1',
    currency_code: 'EUR',
    currency_symbol: '€',
  },
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

describe('fetchInsightExpenseByCategory', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct endpoint with start and end params', async () => {
    mockFetchOk(mockEntries)
    await fetchInsightExpenseByCategory(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const url = (vi.mocked(fetch).mock.calls[0][0] as string)
    expect(url).toContain('/insight/expense/category')
    expect(url).toContain('start=2026-03-01')
    expect(url).toContain('end=2026-03-31')
  })

  it('includes accounts[] and categories[] filters', async () => {
    mockFetchOk(mockEntries)
    await fetchInsightExpenseByCategory(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
      accounts: ['1', '2'],
      categories: ['3'],
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('accounts%5B%5D=1')
    expect(url).toContain('accounts%5B%5D=2')
    expect(url).toContain('categories%5B%5D=3')
  })

  it('includes Authorization header', async () => {
    mockFetchOk(mockEntries)
    await fetchInsightExpenseByCategory(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('returns parsed InsightEntry list', async () => {
    mockFetchOk(mockEntries)
    const result = await fetchInsightExpenseByCategory(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    expect(result).toEqual(mockEntries)
  })
})

describe('fetchInsightExpenseByBudget', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /insight/expense/budget endpoint', async () => {
    mockFetchOk([])
    await fetchInsightExpenseByBudget(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
      budgets: ['1'],
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/insight/expense/budget')
    expect(url).toContain('budgets%5B%5D=1')
  })
})

describe('fetchInsightExpenseByTag', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /insight/expense/tag endpoint', async () => {
    mockFetchOk([])
    await fetchInsightExpenseByTag(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
      tags: ['vacation'],
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/insight/expense/tag')
    expect(url).toContain('tags%5B%5D=vacation')
  })
})

describe('fetchInsightExpenseByExpenseAccount', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /insight/expense/expense endpoint', async () => {
    mockFetchOk([])
    await fetchInsightExpenseByExpenseAccount(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/insight/expense/expense')
  })
})

describe('fetchInsightExpenseByAssetAccount', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /insight/expense/asset endpoint', async () => {
    mockFetchOk([])
    await fetchInsightExpenseByAssetAccount(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/insight/expense/asset')
  })
})

describe('fetchExpenseNoBill', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /insight/expense/no-bill endpoint with start and end', async () => {
    mockFetchOk(mockEntries)
    await fetchExpenseNoBill(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/insight/expense/no-bill')
    expect(url).toContain('start=2026-03-01')
    expect(url).toContain('end=2026-03-31')
  })

  it('does not send any currency param (server ignores them; filtering is client-side)', async () => {
    mockFetchOk(mockEntries)
    await fetchExpenseNoBill(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).not.toContain('currency_code')
    expect(url).not.toContain('currencies')
  })

  it('includes Authorization header', async () => {
    mockFetchOk(mockEntries)
    await fetchExpenseNoBill(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('returns parsed InsightEntry list', async () => {
    mockFetchOk(mockEntries)
    const result = await fetchExpenseNoBill(BASE_URL, TOKEN, {
      start: '2026-03-01',
      end: '2026-03-31',
    })
    expect(result).toEqual(mockEntries)
  })
})
