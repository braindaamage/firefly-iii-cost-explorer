import { createApiClient } from './client'

export interface CurrencyRaw {
  id: string
  type: 'currencies'
  attributes: {
    enabled: boolean
    primary: boolean
    code: string
    name: string
    symbol: string
    decimal_places: number
  }
}

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  enabled: boolean
  isPrimary: boolean
}

export async function fetchCurrencies(baseUrl: string, token: string): Promise<Currency[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<CurrencyRaw>('/currencies')
  return raw.map((item) => ({
    id: item.id,
    code: item.attributes.code,
    name: item.attributes.name,
    symbol: item.attributes.symbol,
    decimalPlaces: item.attributes.decimal_places,
    enabled: item.attributes.enabled,
    isPrimary: item.attributes.primary,
  }))
}

export function findPrimary(currencies: Currency[]): Currency | undefined {
  return currencies.find((c) => c.isPrimary)
}

export function findEnabledSecondaries(currencies: Currency[]): Currency[] {
  return currencies
    .filter((c) => c.enabled && !c.isPrimary)
    .sort((a, b) => a.code.localeCompare(b.code))
}
