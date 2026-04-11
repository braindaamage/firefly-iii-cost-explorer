import { createApiClient } from './client'
import type { AccountRaw, AssetAccountBalance } from './types'

export interface Account {
  id: string
  name: string
  active: boolean
  type: string
  currentBalance: number
  currencyCode: string
  currencySymbol: string
  currencyDecimalPlaces: number
  pcCurrentBalance: number | null
  primaryCurrencyCode: string
  primaryCurrencySymbol: string
  primaryCurrencyDecimalPlaces: number
}

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

export async function fetchAssetAndLiabilityAccountBalances(
  baseUrl: string,
  token: string
): Promise<Account[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<AccountRaw>('/accounts?type=asset,liability')
  return raw.map((item) => ({
    id: item.id,
    name: item.attributes.name,
    active: item.attributes.active,
    type: item.attributes.type,
    currentBalance: parseFloat(item.attributes.current_balance),
    currencyCode: item.attributes.currency_code,
    currencySymbol: item.attributes.currency_symbol,
    currencyDecimalPlaces: item.attributes.currency_decimal_places,
    pcCurrentBalance:
      item.attributes.pc_current_balance == null
        ? null
        : parseFloat(item.attributes.pc_current_balance),
    primaryCurrencyCode: item.attributes.primary_currency_code,
    primaryCurrencySymbol: item.attributes.primary_currency_symbol,
    primaryCurrencyDecimalPlaces: item.attributes.primary_currency_decimal_places,
  }))
}
