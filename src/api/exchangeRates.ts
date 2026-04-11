import { createApiClient, ApiError } from './client'
import type { PaginatedResponse } from './types'

export interface ExchangeRateRaw {
  id: string
  type: 'currency_exchange_rates'
  attributes: {
    from_currency_code: string
    to_currency_code: string
    rate: string
    date: string
  }
}

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  date: string
}

export async function fetchLatestExchangeRate(
  baseUrl: string,
  token: string,
  from: string,
  to: string
): Promise<ExchangeRate | null> {
  const client = createApiClient(baseUrl, token)
  let response: PaginatedResponse<ExchangeRateRaw>

  try {
    response = await client.fetch<PaginatedResponse<ExchangeRateRaw>>(
      `/exchange-rates/${from}/${to}?limit=50`
    )
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null
    }
    throw err
  }

  if (response.data.length === 0) {
    return null
  }

  const latest = response.data.reduce((a, b) =>
    new Date(a.attributes.date) > new Date(b.attributes.date) ? a : b
  )

  const rate = parseFloat(latest.attributes.rate)
  if (!isFinite(rate) || rate <= 0) {
    console.warn(
      `Invalid exchange rate for ${from}→${to}: "${latest.attributes.rate}". Treating as unavailable.`
    )
    return null
  }

  return {
    from: latest.attributes.from_currency_code,
    to: latest.attributes.to_currency_code,
    rate,
    date: latest.attributes.date,
  }
}
