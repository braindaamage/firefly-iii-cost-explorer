import { createApiClient } from './client'
import type { BudgetRaw, BudgetLimit, BudgetLimitRaw, PaginatedResponse } from './types'

export async function fetchBudgets(
  baseUrl: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<BudgetRaw>('/budgets')
  return raw.map((item) => ({ id: item.id, name: item.attributes.name }))
}

export async function fetchBudgetLimits(
  baseUrl: string,
  token: string,
  start: string,
  end: string
): Promise<BudgetLimit[]> {
  const client = createApiClient(baseUrl, token)
  const params = new URLSearchParams({ start, end })
  const response = await client.fetch<PaginatedResponse<BudgetLimitRaw>>(
    `/budget-limits?${params}`
  )
  return response.data.map((item) => ({
    id: item.id,
    budget_id: String(item.attributes.budget_id),
    budget_name: item.attributes.budget_name,
    amount: parseFloat(item.attributes.amount),
    currency_code: item.attributes.currency_code,
  }))
}
