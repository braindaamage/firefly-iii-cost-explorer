import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLatestExchangeRate } from './exchangeRates'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

function makeRateRaw(id: string, rate: string, date: string) {
  return {
    id,
    type: 'currency_exchange_rates',
    attributes: {
      from_currency_code: 'EUR',
      to_currency_code: 'USD',
      rate,
      date,
    },
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

function mockFetchStatus(status: number, statusText = '') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve({}),
    })
  )
}

function paginatedResponse(data: unknown[]) {
  return {
    data,
    meta: { pagination: { total: data.length, count: data.length, per_page: 50, current_page: 1, total_pages: 1 } },
  }
}

describe('fetchLatestExchangeRate', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns the rate with the most recent date when multiple exist', async () => {
    const rates = [
      makeRateRaw('1', '1.05', '2024-01-01'),
      makeRateRaw('2', '1.10', '2024-03-15'),
      makeRateRaw('3', '1.08', '2024-02-20'),
    ]
    mockFetchOk(paginatedResponse(rates))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result).not.toBeNull()
    expect(result!.rate).toBe(1.10)
    expect(result!.date).toBe('2024-03-15')
  })

  it('returns the correct from/to codes', async () => {
    mockFetchOk(paginatedResponse([makeRateRaw('1', '1.05', '2024-01-01')]))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result!.from).toBe('EUR')
    expect(result!.to).toBe('USD')
  })

  it('returns null when data array is empty', async () => {
    mockFetchOk(paginatedResponse([]))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result).toBeNull()
  })

  it('returns null on 404 (rate pair not configured in Firefly)', async () => {
    mockFetchStatus(404, 'Not Found')
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'CLP')
    expect(result).toBeNull()
  })

  it('propagates errors that are not 404', async () => {
    mockFetchStatus(500, 'Internal Server Error')
    await expect(fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')).rejects.toThrow()
  })

  it('propagates 401 errors', async () => {
    mockFetchStatus(401, 'Unauthorized')
    await expect(fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')).rejects.toThrow()
  })

  it('returns null when rate is "0" (invalid)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetchOk(paginatedResponse([makeRateRaw('1', '0', '2024-01-01')]))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('returns null when rate is negative (invalid)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetchOk(paginatedResponse([makeRateRaw('1', '-1', '2024-01-01')]))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('returns null when rate is not a number (invalid)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetchOk(paginatedResponse([makeRateRaw('1', 'not a number', '2024-01-01')]))
    const result = await fetchLatestExchangeRate(BASE_URL, TOKEN, 'EUR', 'USD')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
  })
})
