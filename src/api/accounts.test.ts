import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAssetAccounts, fetchAssetAndLiabilityAccountBalances } from './accounts'
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
      { id: '1', attributes: { name: 'Checking', active: true, type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '1000.00', pc_current_balance: null, primary_currency_id: '1', primary_currency_code: 'EUR', primary_currency_symbol: '€', primary_currency_decimal_places: 2 } },
      { id: '2', attributes: { name: 'Savings', active: true, type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '2000.00', pc_current_balance: null, primary_currency_id: '1', primary_currency_code: 'EUR', primary_currency_symbol: '€', primary_currency_decimal_places: 2 } },
    ]
    mockFetchOk(mockPaginatedResponse(raw))
    const result = await fetchAssetAccounts(BASE_URL, TOKEN)
    expect(result).toEqual([
      { id: '1', name: 'Checking' },
      { id: '2', name: 'Savings' },
    ])
  })

  it('fetches all pages and returns combined results', async () => {
    const page1Raw: AccountRaw[] = [{ id: '1', attributes: { name: 'Checking', active: true, type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '1000.00', pc_current_balance: null, primary_currency_id: '1', primary_currency_code: 'EUR', primary_currency_symbol: '€', primary_currency_decimal_places: 2 } }]
    const page2Raw: AccountRaw[] = [{ id: '2', attributes: { name: 'Savings', active: true, type: 'asset', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2, current_balance: '2000.00', pc_current_balance: null, primary_currency_id: '1', primary_currency_code: 'EUR', primary_currency_symbol: '€', primary_currency_decimal_places: 2 } }]
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

describe('fetchAssetAndLiabilityAccountBalances', () => {
  beforeEach(() => vi.restoreAllMocks())

  const baseAssetRaw: AccountRaw = {
    id: '1',
    attributes: {
      name: 'Checking',
      active: true,
      type: 'asset',
      currency_code: 'EUR',
      currency_symbol: '€',
      currency_decimal_places: 2,
      current_balance: '1000.00',
      pc_current_balance: '1000.00',
      primary_currency_id: '1',
      primary_currency_code: 'EUR',
      primary_currency_symbol: '€',
      primary_currency_decimal_places: 2,
    },
  }

  function mockFetchOkDouble(assetBody: unknown, liabilityBody: unknown) {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(assetBody) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(liabilityBody) })
    )
  }

  const emptyPage = mockPaginatedResponse([])

  it('makes parallel calls to type=asset and type=liabilities', async () => {
    mockFetchOkDouble(mockPaginatedResponse([baseAssetRaw]), emptyPage)
    await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/type=asset(&|$)/),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }) })
    )
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('type=liabilities'),
      expect.anything()
    )
  })

  it('maps pc_current_balance string to number', async () => {
    mockFetchOkDouble(mockPaginatedResponse([baseAssetRaw]), emptyPage)
    const result = await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(result[0].pcCurrentBalance).toBe(1000)
  })

  it('maps pc_current_balance null to null (never NaN or 0)', async () => {
    const rawWithNullPc: AccountRaw = {
      ...baseAssetRaw,
      attributes: { ...baseAssetRaw.attributes, pc_current_balance: null },
    }
    mockFetchOkDouble(mockPaginatedResponse([rawWithNullPc]), emptyPage)
    const result = await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(result[0].pcCurrentBalance).toBeNull()
  })

  it('maps all primary_currency_* fields correctly', async () => {
    const rawWithPrimary: AccountRaw = {
      ...baseAssetRaw,
      attributes: {
        ...baseAssetRaw.attributes,
        primary_currency_id: '5',
        primary_currency_code: 'USD',
        primary_currency_symbol: '$',
        primary_currency_decimal_places: 2,
      },
    }
    mockFetchOkDouble(mockPaginatedResponse([rawWithPrimary]), emptyPage)
    const result = await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(result[0].primaryCurrencyCode).toBe('USD')
    expect(result[0].primaryCurrencySymbol).toBe('$')
    expect(result[0].primaryCurrencyDecimalPlaces).toBe(2)
  })

  it('includes liability accounts in the result', async () => {
    const liabilityRaw: AccountRaw = {
      id: '2',
      attributes: {
        name: 'Credit Card',
        active: true,
        type: 'liabilities',
        currency_code: 'EUR',
        currency_symbol: '€',
        currency_decimal_places: 2,
        current_balance: '-500.00',
        pc_current_balance: '-500.00',
        primary_currency_id: '1',
        primary_currency_code: 'EUR',
        primary_currency_symbol: '€',
        primary_currency_decimal_places: 2,
      },
    }
    mockFetchOkDouble(mockPaginatedResponse([baseAssetRaw]), mockPaginatedResponse([liabilityRaw]))
    const result = await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(result).toHaveLength(2)
    expect(result[1].type).toBe('liabilities')
    expect(result[1].currentBalance).toBe(-500)
    expect(result[1].pcCurrentBalance).toBe(-500)
  })

  it('preserves the active flag', async () => {
    const inactiveRaw: AccountRaw = {
      ...baseAssetRaw,
      id: '3',
      attributes: { ...baseAssetRaw.attributes, name: 'Old Account', active: false },
    }
    mockFetchOkDouble(mockPaginatedResponse([baseAssetRaw, inactiveRaw]), emptyPage)
    const result = await fetchAssetAndLiabilityAccountBalances(BASE_URL, TOKEN)
    expect(result[0].active).toBe(true)
    expect(result[1].active).toBe(false)
  })
})
