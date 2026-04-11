import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSummaryBasic } from './summary'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

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

function mockFetchError(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'Error',
      json: () => Promise.resolve({}),
    })
  )
}

function buildSummaryResponse(overrides: Record<string, unknown> = {}) {
  return {
    'spent-in-EUR': {
      key: 'spent-in-EUR',
      monetary_value: '-1234.56',
      currency_id: '1',
      currency_code: 'EUR',
      currency_symbol: '€',
      currency_decimal_places: 2,
      value_parsed: '-€1234.56',
    },
    'earned-in-EUR': {
      key: 'earned-in-EUR',
      monetary_value: '0',
      currency_id: '1',
      currency_code: 'EUR',
      currency_symbol: '€',
      currency_decimal_places: 2,
      value_parsed: '€0.00',
    },
    'balance-in-EUR': {
      key: 'balance-in-EUR',
      monetary_value: '-1234.56',
      currency_id: '1',
      currency_code: 'EUR',
      currency_symbol: '€',
      currency_decimal_places: 2,
      value_parsed: '-€1234.56',
    },
    ...overrides,
  }
}

describe('fetchSummaryBasic', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /summary/basic with start and end params', async () => {
    mockFetchOk(buildSummaryResponse())
    await fetchSummaryBasic(BASE_URL, TOKEN, { start: '2026-04-01', end: '2026-04-11', currencyCode: 'EUR' })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/api/v1/summary/basic')
    expect(url).toContain('start=2026-04-01')
    expect(url).toContain('end=2026-04-11')
  })

  it('does not send a currency param (filters client-side by key)', async () => {
    mockFetchOk(buildSummaryResponse())
    await fetchSummaryBasic(BASE_URL, TOKEN, { start: '2026-04-01', end: '2026-04-11', currencyCode: 'EUR' })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).not.toContain('currency')
  })

  it('happy path: spent-in-EUR "-1234.56" → { amount: 1234.56, currencyCode: "EUR" }', async () => {
    mockFetchOk(buildSummaryResponse())
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'EUR',
    })
    expect(result).toEqual({ amount: 1234.56, currencyCode: 'EUR' })
  })

  it('non-EUR currency: spent-in-USD "-50.00" → { amount: 50, currencyCode: "USD" }', async () => {
    mockFetchOk({
      'spent-in-USD': {
        key: 'spent-in-USD',
        monetary_value: '-50.00',
        currency_code: 'USD',
        currency_symbol: '$',
        currency_decimal_places: 2,
        value_parsed: '-$50.00',
      },
    })
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'USD',
    })
    expect(result).toEqual({ amount: 50, currencyCode: 'USD' })
  })

  it('integer monetary_value without decimals: "-1000" → { amount: 1000 }', async () => {
    mockFetchOk({
      'spent-in-EUR': {
        key: 'spent-in-EUR',
        monetary_value: '-1000',
        currency_code: 'EUR',
        currency_symbol: '€',
        currency_decimal_places: 2,
        value_parsed: '-€1000.00',
      },
    })
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'EUR',
    })
    expect(result.amount).toBe(1000)
  })

  it('12-decimal string "-80.000000000000" → { amount: 80 }', async () => {
    mockFetchOk({
      'spent-in-EUR': {
        key: 'spent-in-EUR',
        monetary_value: '-80.000000000000',
        currency_code: 'EUR',
        currency_symbol: '€',
        currency_decimal_places: 2,
        value_parsed: '-€80.00',
      },
    })
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'EUR',
    })
    expect(result.amount).toBe(80)
  })

  it('key absent → { amount: 0, currencyCode } (no transactions in that currency)', async () => {
    mockFetchOk({ 'spent-in-USD': { key: 'spent-in-USD', monetary_value: '-10.00', currency_code: 'USD' } })
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'EUR',
    })
    expect(result).toEqual({ amount: 0, currencyCode: 'EUR' })
  })

  it('empty response object → { amount: 0, currencyCode }', async () => {
    mockFetchOk({})
    const result = await fetchSummaryBasic(BASE_URL, TOKEN, {
      start: '2026-04-01',
      end: '2026-04-11',
      currencyCode: 'EUR',
    })
    expect(result).toEqual({ amount: 0, currencyCode: 'EUR' })
  })

  it('throws ApiError on 401', async () => {
    mockFetchError(401)
    await expect(
      fetchSummaryBasic(BASE_URL, TOKEN, { start: '2026-04-01', end: '2026-04-11', currencyCode: 'EUR' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws on 500', async () => {
    mockFetchError(500)
    await expect(
      fetchSummaryBasic(BASE_URL, TOKEN, { start: '2026-04-01', end: '2026-04-11', currencyCode: 'EUR' })
    ).rejects.toThrow()
  })
})
