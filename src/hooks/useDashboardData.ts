import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useConfig } from './useConfig'
import { getEffectiveDateRange } from '../lib/date-utils'
import { getGranularity, splitIntoPeriods } from '../lib/period-utils'
import { getSeriesColor } from '../lib/colors'
import {
  fetchInsightExpenseByCategory,
  fetchInsightExpenseByBudget,
  fetchInsightExpenseByTag,
  fetchInsightExpenseByExpenseAccount,
  fetchInsightExpenseByAssetAccount,
} from '../api/insights'
import type { FilterState } from '../types/filters'
import type { Period } from '../lib/period-utils'
import type { InsightEntry } from '../api/types'

export interface SeriesData {
  id: string
  name: string
  color: string
}

export interface ChartDataPoint {
  period: string
  [seriesName: string]: number | string
}

export interface DashboardData {
  chartData: ChartDataPoint[]
  series: SeriesData[]
  currencyCode: string
  isLoading: boolean
  isFetching: boolean
  error: string | null
  rawError: Error | null
  refetch: () => void
  periods: Period[]
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

function processResults(
  periods: Period[],
  results: (InsightEntry[] | undefined)[]
): { chartData: ChartDataPoint[]; series: SeriesData[]; currencyCode: string } {
  // Collect all unique series names in insertion order
  const seriesMap = new Map<string, { id: string; name: string }>()
  let currencyCode = ''

  results.forEach((entries) => {
    entries?.forEach((entry) => {
      if (!seriesMap.has(entry.name)) {
        seriesMap.set(entry.name, { id: entry.id, name: entry.name })
      }
      if (entry.currency_code) currencyCode = entry.currency_code
    })
  })

  const seriesNames = Array.from(seriesMap.keys())
  const series: SeriesData[] = seriesNames.map((name, i) => ({
    id: seriesMap.get(name)!.id,
    name,
    color: getSeriesColor(i),
  }))

  const chartData: ChartDataPoint[] = periods.map((period, i) => {
    const entries = results[i] ?? []
    const point: ChartDataPoint = { period: period.label }
    seriesNames.forEach((name) => {
      const entry = entries.find((e) => e.name === name)
      point[name] = entry ? Math.abs(entry.difference_float) : 0
    })
    return point
  })

  return { chartData, series, currencyCode }
}

export function useDashboardData(filters: FilterState): DashboardData {
  const { config } = useConfig()
  const enabled = !!config
  const baseUrl = config?.baseUrl ?? ''
  const token = config?.apiToken ?? ''

  const range = getEffectiveDateRange(filters)
  const granularity = getGranularity(range)
  const periods = splitIntoPeriods(range, granularity)
  const fetchFn = getFetchFn(filters.groupBy)
  const filterParams = buildFilterParams(filters)

  const queryResults = useQueries({
    queries: periods.map((period) => ({
      queryKey: [
        'insight',
        filters.groupBy,
        period.start,
        period.end,
        filters.accountIds,
        filters.categoryIds,
        filters.budgetIds,
        filters.tagIds,
        baseUrl,
        token,
      ],
      queryFn: () =>
        fetchFn(baseUrl, token, {
          start: period.start,
          end: period.end,
          ...filterParams,
        }),
      staleTime: 2 * 60 * 1000,
      enabled,
    })),
  })

  const isLoading = queryResults.some((r) => r.isLoading)
  const isFetching = queryResults.some((r) => r.isFetching)
  const errorResult = queryResults.find((r) => r.error)
  const rawError = errorResult?.error instanceof Error ? errorResult.error : null
  const error = rawError ? rawError.message : null

  function refetch() {
    queryResults.forEach((r) => r.refetch())
  }

  const { chartData, series, currencyCode } = useMemo(() => {
    const allData = queryResults.map((r) => r.data)
    return processResults(periods, allData)
  }, [queryResults, periods])

  return { chartData, series, currencyCode, isLoading, isFetching, error, rawError, refetch, periods }
}
