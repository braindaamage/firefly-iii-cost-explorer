import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCurrencies, findPrimary, findEnabledSecondaries } from './currencies'
import type { Currency } from './currencies'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

function mockPaginatedResponse(data: unknown[], totalPages = 1) {
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

const eurRaw = {
  id: '1',
  type: 'currencies',
  attributes: { enabled: true, primary: true, code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2 },
}

const usdRaw = {
  id: '2',
  type: 'currencies',
  attributes: { enabled: true, primary: false, code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2 },
}

const clpRaw = {
  id: '3',
  type: 'currencies',
  attributes: { enabled: true, primary: false, code: 'CLP', name: 'Chilean Peso', symbol: 'CLP', decimal_places: 0 },
}

const disabledRaw = {
  id: '4',
  type: 'currencies',
  attributes: { enabled: false, primary: false, code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
}

describe('fetchCurrencies', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('maps CurrencyRaw to Currency domain model correctly', async () => {
    mockFetchOk(mockPaginatedResponse([eurRaw]))
    const result = await fetchCurrencies(BASE_URL, TOKEN)
    expect(result).toEqual([
      {
        id: '1',
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        enabled: true,
        isPrimary: true,
      },
    ])
  })

  it('fetches all pages and returns combined results', async () => {
    const page1 = { data: [eurRaw], meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 1, total_pages: 2 } } }
    const page2 = { data: [usdRaw], meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 2, total_pages: 2 } } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page2) })
    )
    const result = await fetchCurrencies(BASE_URL, TOKEN)
    expect(result).toHaveLength(2)
    expect(result[0].code).toBe('EUR')
    expect(result[1].code).toBe('USD')
  })

  it('maps isPrimary=false for non-primary currencies', async () => {
    mockFetchOk(mockPaginatedResponse([usdRaw]))
    const result = await fetchCurrencies(BASE_URL, TOKEN)
    expect(result[0].isPrimary).toBe(false)
  })
})

describe('findPrimary', () => {
  const currencies: Currency[] = [
    { id: '1', code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true, isPrimary: true },
    { id: '2', code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true, isPrimary: false },
  ]

  it('returns the currency with isPrimary=true', () => {
    expect(findPrimary(currencies)?.code).toBe('EUR')
  })

  it('returns undefined when no primary exists', () => {
    const noPrimary = currencies.map((c) => ({ ...c, isPrimary: false }))
    expect(findPrimary(noPrimary)).toBeUndefined()
  })
})

describe('findEnabledSecondaries', () => {
  const currencies: Currency[] = [
    { id: '1', code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true, isPrimary: true },
    { id: '2', code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true, isPrimary: false },
    { id: '3', code: 'CLP', name: 'Chilean Peso', symbol: 'CLP', decimalPlaces: 0, enabled: true, isPrimary: false },
    { id: '4', code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, enabled: false, isPrimary: false },
  ]

  it('excludes the primary currency', () => {
    const result = findEnabledSecondaries(currencies)
    expect(result.every((c) => !c.isPrimary)).toBe(true)
  })

  it('excludes disabled currencies', () => {
    const result = findEnabledSecondaries(currencies)
    expect(result.every((c) => c.enabled)).toBe(true)
    expect(result.find((c) => c.code === 'JPY')).toBeUndefined()
  })

  it('sorts results alphabetically by code', () => {
    const result = findEnabledSecondaries(currencies)
    expect(result.map((c) => c.code)).toEqual(['CLP', 'USD'])
  })

  it('returns empty array when no enabled secondaries exist', () => {
    const onlyPrimary = [currencies[0]]
    expect(findEnabledSecondaries(onlyPrimary)).toEqual([])
  })
})

// Suppress unused variable warning for raw fixtures used only for shape reference
void [clpRaw, disabledRaw]
