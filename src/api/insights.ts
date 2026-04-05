import { createApiClient } from './client'
import type { InsightEntry } from './types'

function buildQuery(params: {
  start: string
  end: string
  accounts?: string[]
  categories?: string[]
  budgets?: string[]
  tags?: string[]
}): string {
  const q = new URLSearchParams()
  q.set('start', params.start)
  q.set('end', params.end)
  params.accounts?.forEach((id) => q.append('accounts[]', id))
  params.categories?.forEach((id) => q.append('categories[]', id))
  params.budgets?.forEach((id) => q.append('budgets[]', id))
  params.tags?.forEach((id) => q.append('tags[]', id))
  return q.toString()
}

export async function fetchInsightExpenseByCategory(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; accounts?: string[]; categories?: string[] }
): Promise<InsightEntry[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<InsightEntry[]>(
    `/insight/expense/category?${buildQuery(params)}`
  )
}

export async function fetchInsightExpenseByBudget(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; accounts?: string[]; budgets?: string[] }
): Promise<InsightEntry[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<InsightEntry[]>(
    `/insight/expense/budget?${buildQuery(params)}`
  )
}

export async function fetchInsightExpenseByTag(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; accounts?: string[]; tags?: string[] }
): Promise<InsightEntry[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<InsightEntry[]>(
    `/insight/expense/tag?${buildQuery(params)}`
  )
}

export async function fetchInsightExpenseByExpenseAccount(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; accounts?: string[] }
): Promise<InsightEntry[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<InsightEntry[]>(
    `/insight/expense/expense?${buildQuery(params)}`
  )
}

export async function fetchInsightExpenseByAssetAccount(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; accounts?: string[] }
): Promise<InsightEntry[]> {
  const client = createApiClient(baseUrl, token)
  return client.fetch<InsightEntry[]>(
    `/insight/expense/asset?${buildQuery(params)}`
  )
}
