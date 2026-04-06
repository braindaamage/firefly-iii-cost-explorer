import { createApiClient } from './client'
import type { GroupBy } from '../types/filters'
import type { Transaction, Pagination, TransactionGroupRaw, PaginatedResponse } from './types'

function buildEndpoint(groupBy: GroupBy, itemId: string, itemName: string, params: URLSearchParams): string {
  switch (groupBy) {
    case 'category':
      return `/categories/${itemId}/transactions?${params}`
    case 'budget':
      return `/budgets/${itemId}/transactions?${params}`
    case 'tag':
      return `/tags/${encodeURIComponent(itemName)}/transactions?${params}`
    case 'expense_account':
    case 'asset_account':
      return `/accounts/${itemId}/transactions?${params}`
  }
}

export async function fetchTransactionsByGroup(
  baseUrl: string,
  token: string,
  groupBy: GroupBy,
  itemId: string,
  itemName: string,
  start: string,
  end: string,
  page: number = 1
): Promise<{ transactions: Transaction[]; pagination: Pagination }> {
  const client = createApiClient(baseUrl, token)
  const params = new URLSearchParams({
    start,
    end,
    type: 'withdrawal',
    page: String(page),
    limit: '50',
  })

  const endpoint = buildEndpoint(groupBy, itemId, itemName, params)
  const response = await client.fetch<PaginatedResponse<TransactionGroupRaw>>(endpoint)

  const transactions: Transaction[] = []
  response.data.forEach((group) => {
    group.attributes.transactions.forEach((t) => {
      transactions.push({
        id: `${group.id}-${t.transaction_journal_id}`,
        date: t.date.split('T')[0],
        description: t.description,
        amount: Math.abs(parseFloat(t.amount)),
        currencyCode: t.currency_code,
        sourceAccount: t.source_name,
        destinationAccount: t.destination_name,
      })
    })
  })

  const p = response.meta.pagination
  const pagination: Pagination = {
    total: p.total,
    count: p.count,
    perPage: p.per_page,
    currentPage: p.current_page,
    totalPages: p.total_pages,
  }

  return { transactions, pagination }
}
