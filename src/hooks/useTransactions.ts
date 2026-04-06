import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useConfig } from './useConfig'
import { fetchTransactionsByGroup } from '../api/transactions'
import type { GroupBy } from '../types/filters'
import type { DateRange } from '../types/filters'
import type { Transaction } from '../api/types'

export interface UseTransactionsResult {
  transactions: Transaction[]
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  error: string | null
}

export function useTransactions(
  groupBy: GroupBy,
  itemId: string,
  itemName: string,
  dateRange: DateRange,
  enabled: boolean
): UseTransactionsResult {
  const { config } = useConfig()
  const baseUrl = config?.baseUrl ?? ''
  const token = config?.apiToken ?? ''

  const query = useInfiniteQuery({
    queryKey: ['transactions', groupBy, itemId, itemName, dateRange.start, dateRange.end, baseUrl, token],
    queryFn: ({ pageParam }) =>
      fetchTransactionsByGroup(baseUrl, token, groupBy, itemId, itemName, dateRange.start, dateRange.end, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage.pagination
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    enabled: enabled && !!config,
    staleTime: 2 * 60 * 1000,
  })

  const transactions = useMemo(
    () => query.data?.pages.flatMap((p) => p.transactions) ?? [],
    [query.data]
  )

  const error =
    query.error instanceof Error ? query.error.message : null

  return {
    transactions,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error,
  }
}
