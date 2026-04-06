import { createApiClient } from './client'
import type { CategoryRaw } from './types'

export async function fetchCategories(
  baseUrl: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<CategoryRaw>('/categories')
  return raw.map((item) => ({ id: item.id, name: item.attributes.name }))
}
