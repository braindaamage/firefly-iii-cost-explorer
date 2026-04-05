import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAssetAccounts, fetchExpenseAccounts } from './accounts'
import type { AutocompleteAccount } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const mockAccounts: AutocompleteAccount[] = [
  {
    id: '1',
    name: 'Checking',
    name_with_balance: 'Checking (€1,000)',
    type: 'asset',
    currency_id: '1',
    currency_code: 'EUR',
    currency_symbol: '€',
    currency_decimal_places: 2,
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

describe('fetchAssetAccounts', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct URL with asset type', async () => {
    mockFetchOk(mockAccounts)
    await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/autocomplete/accounts?type=asset&limit=100`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
  })

  it('returns parsed account list', async () => {
    mockFetchOk(mockAccounts)
    const result = await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(result).toEqual(mockAccounts)
  })
})

describe('fetchExpenseAccounts', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls correct URL with expense type', async () => {
    mockFetchOk([])
    await fetchExpenseAccounts(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/autocomplete/accounts?type=expense&limit=100`,
      expect.anything()
    )
  })

  it('returns parsed account list', async () => {
    mockFetchOk(mockAccounts)
    const result = await fetchExpenseAccounts(BASE_URL, TOKEN)
    expect(result).toEqual(mockAccounts)
  })
})
