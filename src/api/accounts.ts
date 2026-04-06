import { createApiClient } from './client'
import type { AccountRaw } from './types'

export async function fetchAssetAccounts(
  baseUrl: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<AccountRaw>('/accounts?type=asset')
  return raw.map((item) => ({ id: item.id, name: item.attributes.name }))
}
