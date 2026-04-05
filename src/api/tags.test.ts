import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTags } from './tags'
import type { AutocompleteTag } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const mockTags: AutocompleteTag[] = [
  { id: '1', name: 'vacation', tag: 'vacation' },
  { id: '2', name: 'work', tag: 'work' },
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

describe('fetchTags', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct URL', async () => {
    mockFetchOk(mockTags)
    await fetchTags(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/autocomplete/tags?limit=100`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
  })

  it('returns parsed tag list', async () => {
    mockFetchOk(mockTags)
    const result = await fetchTags(BASE_URL, TOKEN)
    expect(result).toEqual(mockTags)
  })
})
