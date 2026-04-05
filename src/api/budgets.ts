import { createApiClient } from './client'
import type { AutocompleteBudget } from './types'

export async function fetchBudgets(
  baseUrl: string,
  token: string
): Promise<AutocompleteBudget[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteBudget[]>('/autocomplete/budgets?limit=100')
}
