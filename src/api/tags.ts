import { createApiClient } from './client'
import type { TagRaw } from './types'

export async function fetchTags(
  baseUrl: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<TagRaw>('/tags')
  return raw.map((item) => ({ id: item.id, name: item.attributes.tag }))
}
