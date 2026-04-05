import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCategories } from './categories'
import type { AutocompleteCategory } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const mockCategories: AutocompleteCategory[] = [
  { id: '1', name: 'Groceries' },
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

describe('fetchCategories', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct URL', async () => {
    mockFetchOk(mockCategories)
    await fetchCategories(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/autocomplete/categories?limit=100`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
  })

  it('returns parsed category list', async () => {
    mockFetchOk(mockCategories)
    const result = await fetchCategories(BASE_URL, TOKEN)
    expect(result).toEqual(mockCategories)
  })
})
