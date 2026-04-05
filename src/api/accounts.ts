import { createApiClient } from './client'
import type { AutocompleteAccount } from './types'

export async function fetchAssetAccounts(
  baseUrl: string,
  token: string
): Promise<AutocompleteAccount[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteAccount[]>(
    '/autocomplete/accounts?type=asset&limit=100'
  )
}

export async function fetchExpenseAccounts(
  baseUrl: string,
  token: string
): Promise<AutocompleteAccount[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteAccount[]>(
    '/autocomplete/accounts?type=expense&limit=100'
  )
}
