import { createApiClient } from './client'
import type { AccountRaw, AssetAccountBalance } from './types'

export async function fetchAssetAccounts(
  baseUrl: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<AccountRaw>('/accounts?type=asset')
  return raw.map((item) => ({ id: item.id, name: item.attributes.name }))
}

export async function fetchAssetAccountBalances(
  baseUrl: string,
  token: string
): Promise<AssetAccountBalance[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<AccountRaw>('/accounts?type=asset')
  return raw.map((item) => ({
    id: item.id,
    name: item.attributes.name,
    balance: parseFloat(item.attributes.current_balance),
    currencyCode: item.attributes.currency_code,
    currencySymbol: item.attributes.currency_symbol,
    currencyDecimalPlaces: item.attributes.currency_decimal_places,
  }))
}
