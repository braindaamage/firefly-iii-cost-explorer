import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCategories } from './categories'
import type { CategoryRaw } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

function mockPaginatedResponse(data: CategoryRaw[], totalPages = 1) {
  return {
    data,
    meta: { pagination: { total: data.length, count: data.length, per_page: 50, current_page: 1, total_pages: totalPages } },
  }
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

describe('fetchCategories', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /categories endpoint (not autocomplete)', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    await fetchCategories(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/categories'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
      expect.stringContaining('autocomplete'),
      expect.anything()
    )
  })

  it('returns mapped { id, name } list', async () => {
    const raw: CategoryRaw[] = [
      { id: '1', attributes: { name: 'Groceries' } },
      { id: '2', attributes: { name: 'Transport' } },
    ]
    mockFetchOk(mockPaginatedResponse(raw))
    const result = await fetchCategories(BASE_URL, TOKEN)
    expect(result).toEqual([
      { id: '1', name: 'Groceries' },
      { id: '2', name: 'Transport' },
    ])
  })

  it('fetches all pages and returns combined results', async () => {
    const page1Raw: CategoryRaw[] = [{ id: '1', attributes: { name: 'Groceries' } }]
    const page2Raw: CategoryRaw[] = [{ id: '2', attributes: { name: 'Transport' } }]
    const page1 = { data: page1Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 1, total_pages: 2 } } }
    const page2 = { data: page2Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 2, total_pages: 2 } } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page2) })
    )
    const result = await fetchCategories(BASE_URL, TOKEN)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: '1', name: 'Groceries' })
    expect(result[1]).toEqual({ id: '2', name: 'Transport' })
  })
})
