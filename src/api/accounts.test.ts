import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAssetAccounts, fetchAssetAccountBalances } from './accounts'
import type { AccountRaw } from './types'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

function mockPaginatedResponse(data: AccountRaw[], totalPages = 1) {
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

const fullAccountRaw: AccountRaw = {
  id: '1',
  attributes: {
    name: 'Checking',
    type: 'asset',
    currency_code: 'EUR',
    currency_symbol: '€',
    currency_decimal_places: 2,
    current_balance: '3456.78',
  },
}

describe('fetchAssetAccountBalances', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /accounts?type=asset endpoint', async () => {
    mockFetchOk(mockPaginatedResponse([fullAccountRaw]))
    await fetchAssetAccountBalances(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/accounts'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
  })

  it('returns mapped AssetAccountBalance list with parsed balance', async () => {
    mockFetchOk(mockPaginatedResponse([fullAccountRaw]))
    const result = await fetchAssetAccountBalances(BASE_URL, TOKEN)
    expect(result).toEqual([
      {
        id: '1',
        name: 'Checking',
        balance: 3456.78,
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyDecimalPlaces: 2,
      },
    ])
  })

  it('parses negative balance correctly', async () => {
    const negativeRaw: AccountRaw = {
      ...fullAccountRaw,
      id: '2',
      attributes: { ...fullAccountRaw.attributes, current_balance: '-500.00' },
    }
    mockFetchOk(mockPaginatedResponse([negativeRaw]))
    const result = await fetchAssetAccountBalances(BASE_URL, TOKEN)
    expect(result[0].balance).toBe(-500)
  })

  it('fetches all pages and returns combined results', async () => {
    const page1Raw: AccountRaw[] = [fullAccountRaw]
    const page2Raw: AccountRaw[] = [{ ...fullAccountRaw, id: '2', attributes: { ...fullAccountRaw.attributes, name: 'Savings', current_balance: '5000.00' } }]
    const page1 = { data: page1Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 1, total_pages: 2 } } }
    const page2 = { data: page2Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 2, total_pages: 2 } } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page2) })
    )
    const result = await fetchAssetAccountBalances(BASE_URL, TOKEN)
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('Savings')
    expect(result[1].balance).toBe(5000)
  })
})

describe('fetchAssetAccounts', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /accounts?type=asset endpoint (not autocomplete)', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/accounts'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
      expect.stringContaining('autocomplete'),
      expect.anything()
    )
  })

  it('includes type=asset in the request', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('type=asset'),
      expect.anything()
    )
  })

  it('returns mapped { id, name } list', async () => {
    const raw: AccountRaw[] = [
      { id: '1', attributes: { name: 'Checking', type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '1000.00' } },
      { id: '2', attributes: { name: 'Savings', type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '2000.00' } },
    ]
    mockFetchOk(mockPaginatedResponse(raw))
    const result = await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(result).toEqual([
      { id: '1', name: 'Checking' },
      { id: '2', name: 'Savings' },
    ])
  })

  it('fetches all pages and returns combined results', async () => {
    const page1Raw: AccountRaw[] = [{ id: '1', attributes: { name: 'Checking', type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '1000.00' } }]
    const page2Raw: AccountRaw[] = [{ id: '2', attributes: { name: 'Savings', type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '2000.00' } }]
    const page1 = { data: page1Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 1, total_pages: 2 } } }
    const page2 = { data: page2Raw, meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 2, total_pages: 2 } } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page2) })
    )
    const result = await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: '1', name: 'Checking' })
    expect(result[1]).toEqual({ id: '2', name: 'Savings' })
  })
})
