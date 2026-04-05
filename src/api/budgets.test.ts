import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBudgets } from './budgets'
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
