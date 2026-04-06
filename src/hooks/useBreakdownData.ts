import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, parseISO, subDays, format } from 'date-fns'
import { useConfig } from './useConfig'
import { getEffectiveDateRange } from '../lib/date-utils'
import { getSeriesColor } from '../lib/colors'
import {
  fetchInsightExpenseByCategory,
  fetchInsightExpenseByBudget,
  fetchInsightExpenseByTag,
  fetchInsightExpenseByExpenseAccount,
  fetchInsightExpenseByAssetAccount,
} from '../api/insights'
import { fetchBudgetLimits } from '../api/budgets'
import type { FilterState } from '../types/filters'
import type { BreakdownRow } from '../types/breakdown'
import type { InsightEntry, BudgetLimit } from '../api/types'

export interface BreakdownData {
  rows: BreakdownRow[]
  totals: BreakdownRow
  currencyCode: string
  isLoading: boolean
  isFetching: boolean
  error: string | null
}

function getFetchFn(groupBy: FilterState['groupBy']) {
  switch (groupBy) {
    case 'category':
      return fetchInsightExpenseByCategory
    case 'budget':
      return fetchInsightExpenseByBudget
    case 'tag':
      return fetchInsightExpenseByTag
    case 'expense_account':
      return fetchInsightExpenseByExpenseAccount
    case 'asset_account':
      return fetchInsightExpenseByAssetAccount
  }
}

function buildFilterParams(filters: FilterState) {
  return {
    accounts: filters.accountIds.length > 0 ? filters.accountIds : undefined,
    categories: filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
    budgets: filters.budgetIds.length > 0 ? filters.budgetIds : undefined,
    tags: filters.tagIds.length > 0 ? filters.tagIds : undefined,
  }
}

function getPreviousRange(start: string, end: string): { start: string; end: string } {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const duration = differenceInDays(endDate, startDate) + 1
  const prevEnd = subDays(startDate, 1)
  const prevStart = subDays(startDate, duration)
  return {
    start: format(prevStart, 'yyyy-MM-dd'),
    end: format(prevEnd, 'yyyy-MM-dd'),
  }
}

function processBreakdown(
  current: InsightEntry[],
  previous: InsightEntry[],
  budgetLimits: BudgetLimit[],
  groupBy: FilterState['groupBy']
): { rows: BreakdownRow[]; totals: BreakdownRow; currencyCode: string } {
  const prevMap = new Map<string, number>()
  previous.forEach((e) => prevMap.set(e.name, Math.abs(e.difference_float)))

  let currencyCode = ''
  const supportsBudget = groupBy === 'budget'

  const rows: BreakdownRow[] = current.map((entry, i) => {
    if (entry.currency_code) currencyCode = entry.currency_code
    const actualCost = Math.abs(entry.difference_float)
    const prevCost = prevMap.get(entry.name)

    const percentChange =
      prevCost !== undefined && prevCost > 0
        ? ((actualCost - prevCost) / prevCost) * 100
        : null

    let budgeted: number | null = null
    let variance: number | null = null

    if (supportsBudget) {
      const limit = budgetLimits.find((l) => l.budget_name === entry.name)
      if (limit) {
        budgeted = limit.amount
        variance = actualCost - budgeted
      }
    }

    return {
      id: entry.id,
      name: entry.name,
      color: getSeriesColor(i),
      actualCost,
      budgeted,
      variance,
      percentChange,
    }
  })

  rows.sort((a, b) => b.actualCost - a.actualCost)

  const totalActual = rows.reduce((sum, r) => sum + r.actualCost, 0)
  const rowsWithBudget = rows.filter((r) => r.budgeted !== null)
  const totalBudgeted =
    rowsWithBudget.length > 0
      ? rowsWithBudget.reduce((sum, r) => sum + r.budgeted!, 0)
      : null
  const totalVariance =
    totalBudgeted !== null
      ? rowsWithBudget.reduce((sum, r) => sum + r.actualCost, 0) - totalBudgeted
      : null

  const prevTotal = previous.reduce((sum, e) => sum + Math.abs(e.difference_float), 0)
  const totalPercentChange =
    prevTotal > 0 ? ((totalActual - prevTotal) / prevTotal) * 100 : null

  const totals: BreakdownRow = {
    id: 'total',
    name: 'Total',
    color: '',
    actualCost: totalActual,
    budgeted: totalBudgeted,
    variance: totalVariance,
    percentChange: totalPercentChange,
  }

  return { rows, totals, currencyCode }
}

export function useBreakdownData(filters: FilterState): BreakdownData {
  const { config } = useConfig()
  const enabled = !!config
  const baseUrl = config?.baseUrl ?? ''
  const token = config?.apiToken ?? ''

  const range = getEffectiveDateRange(filters)
  const prevRange = getPreviousRange(range.start, range.end)
  const fetchFn = getFetchFn(filters.groupBy)
  const filterParams = buildFilterParams(filters)

  const currentQuery = useQuery({
    queryKey: ['breakdown', filters.groupBy, range.start, range.end, filters.accountIds, filters.categoryIds, filters.budgetIds, filters.tagIds, baseUrl, token],
    queryFn: () => fetchFn(baseUrl, token, { start: range.start, end: range.end, ...filterParams }),
    enabled,
    staleTime: 2 * 60 * 1000,
  })

  const previousQuery = useQuery({
    queryKey: ['breakdown-prev', filters.groupBy, prevRange.start, prevRange.end, filters.accountIds, filters.categoryIds, filters.budgetIds, filters.tagIds, baseUrl, token],
    queryFn: () => fetchFn(baseUrl, token, { start: prevRange.start, end: prevRange.end, ...filterParams }),
    enabled,
    staleTime: 2 * 60 * 1000,
  })

  const budgetLimitsQuery = useQuery({
    queryKey: ['budget-limits', range.start, range.end, baseUrl, token],
    queryFn: () => fetchBudgetLimits(baseUrl, token, range.start, range.end),
    enabled: enabled && filters.groupBy === 'budget',
    staleTime: 5 * 60 * 1000,
  })

  const isLoading =
    currentQuery.isLoading ||
    previousQuery.isLoading ||
    (filters.groupBy === 'budget' && budgetLimitsQuery.isLoading)

  const isFetching =
    currentQuery.isFetching ||
    previousQuery.isFetching ||
    (filters.groupBy === 'budget' && budgetLimitsQuery.isFetching)

  const error =
    currentQuery.error instanceof Error
      ? currentQuery.error.message
      : previousQuery.error instanceof Error
        ? previousQuery.error.message
        : (filters.groupBy === 'budget' && budgetLimitsQuery.error instanceof Error)
          ? budgetLimitsQuery.error.message
          : null

  const { rows, totals, currencyCode } = useMemo(() => {
    const current = currentQuery.data ?? []
    const previous = previousQuery.data ?? []
    const budgetLimits = budgetLimitsQuery.data ?? []
    return processBreakdown(current, previous, budgetLimits, filters.groupBy)
  }, [currentQuery.data, previousQuery.data, budgetLimitsQuery.data, filters.groupBy])

  return { rows, totals, currencyCode, isLoading, isFetching, error }
}
