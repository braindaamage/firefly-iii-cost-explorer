import { createApiClient } from './client'
import type { AutocompleteTag } from './types'

export async function fetchTags(
  baseUrl: string,
  token: string
): Promise<AutocompleteTag[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteTag[]>('/autocomplete/tags?limit=100')
}
