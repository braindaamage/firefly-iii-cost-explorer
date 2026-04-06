import { createApiClient } from './client'
import type { AutocompleteBudget, BudgetLimit, BudgetLimitRaw, PaginatedResponse } from './types'

export async function fetchBudgets(
  baseUrl: string,
  token: string
): Promise<AutocompleteBudget[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<AutocompleteBudget[]>('/autocomplete/budgets?limit=100')
}

export async function fetchBudgetLimits(
  baseUrl: string,
  token: string,
  start: string,
  end: string
): Promise<BudgetLimit[]> {
  const client = createApiClient(baseUrl, token)
  const response = await client.fetch<PaginatedResponse<BudgetLimitRaw>>(
    `/budget-limits?start=${start}&end=${end}`
  )
  return response.data.map((item) => ({
    id: item.id,
    budget_id: String(item.attributes.budget_id),
    budget_name: item.attributes.budget_name,
    amount: parseFloat(item.attributes.amount),
    currency_code: item.attributes.currency_code,
  }))
}
