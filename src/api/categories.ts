import { createApiClient } from './client'
import type { AutocompleteCategory } from './types'

export async function fetchCategories(
  baseUrl: string,
  token: string
): Promise<AutocompleteCategory[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteCategory[]>('/autocomplete/categories?limit=100')
}
