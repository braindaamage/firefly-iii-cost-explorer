import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchCurrencies, findPrimary, findEnabledSecondaries } from '../api/currencies'
import { fetchExpenseNoBill } from '../api/insights'
import { fetchSummaryBasic } from '../api/summary'
import { fetchBills } from '../api/bills'
import { computeForecast } from './computeForecast'
import { useForecastConfig } from './useForecastConfig'
import { useExchangeRates } from './useExchangeRates'
import {
  getMonthRanges,
  getMonthStart,
  getMonthEnd,
  getTomorrow,
  formatDate,
} from '../lib/forecast-dates'
import type { ForecastResult } from './computeForecast'

export function useForecast(
  baseUrl: string,
  token: string,
  today: Date = new Date()
): ForecastResult {
  const configResult = useForecastConfig(baseUrl, token)
  const enabled = !!baseUrl && !!token && configResult.status !== 'loading'

  // --- Date values (derived from `today`, stable across renders for same day) ---
  const todayISO = formatDate(today)
  const monthStart = getMonthStart(today)
  const endOfMonthISO = getMonthEnd(today)
  const tomorrowISO = getTomorrow(today)

  // --- Currencies ---
  const currenciesQuery = useQuery({
    queryKey: ['currencies', baseUrl],
    queryFn: () => fetchCurrencies(baseUrl, token),
    staleTime: 60 * 60_000,
    enabled,
  })

  const primary = useMemo(
    () => findPrimary(currenciesQuery.data ?? []),
    [currenciesQuery.data]
  )

  const foreignCodes = useMemo(
    () => findEnabledSecondaries(currenciesQuery.data ?? []).map((c) => c.code),
    [currenciesQuery.data]
  )

  const { rates: exchangeRates } = useExchangeRates(
    baseUrl,
    token,
    primary?.code ?? '',
    foreignCodes
  )

  // --- Historical month ranges (one per historyMonths config) ---
  const monthRanges = useMemo(
    () => getMonthRanges(today, configResult.config.historyMonths),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, configResult.config.historyMonths]
  )

  // --- Historical no-bill expense queries (parallel, immutable once month closes) ---
  const historyResults = useQueries({
    queries: monthRanges.map((r) => ({
      queryKey: ['forecast', 'history', baseUrl, r.start, r.end],
      queryFn: () => fetchExpenseNoBill(baseUrl, token, { start: r.start, end: r.end }),
      staleTime: Infinity,
      enabled: enabled && !!primary,
    })),
  })

  // --- MTD spend ---
  const mtdQuery = useQuery({
    queryKey: ['forecast', 'mtd', baseUrl, primary?.code ?? '', monthStart, todayISO],
    queryFn: () =>
      fetchSummaryBasic(baseUrl, token, {
        start: monthStart,
        end: todayISO,
        currencyCode: primary!.code,
      }),
    staleTime: 5 * 60_000,
    enabled: enabled && !!primary,
  })

  // --- Pending bills (tomorrow through end of month) ---
  const billsQuery = useQuery({
    queryKey: ['forecast', 'bills', baseUrl, tomorrowISO, endOfMonthISO],
    queryFn: () => fetchBills(baseUrl, token, { start: tomorrowISO, end: endOfMonthISO }),
    staleTime: 5 * 60_000,
    enabled,
  })

  // Single string dep for history results: stable length regardless of historyMonths.
  // Encodes status + dataUpdatedAt so any data/status change triggers recomputation.
  const historyFingerprint = historyResults
    .map((rq) => `${rq.status}:${rq.dataUpdatedAt ?? 0}`)
    .join('|')

  // --- Assemble ComputeForecastInputs and run pure computation ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () =>
      computeForecast({
        today,
        config: configResult.config,
        primaryCurrency: primary
          ? {
              code: primary.code,
              symbol: primary.symbol,
              decimalPlaces: primary.decimalPlaces,
            }
          : null,
        historicalQueries: historyResults.map((rq, i) => ({
          status: rq.status,
          data: rq.data
            ? { entries: rq.data, daysInMonth: monthRanges[i].daysInMonth }
            : null,
        })),
        mtdQuery: {
          status: mtdQuery.status,
          data: mtdQuery.data
            ? { amount: mtdQuery.data.amount, currencyCode: mtdQuery.data.currencyCode }
            : null,
        },
        billsQuery: {
          status: billsQuery.status,
          data: billsQuery.data ?? null,
        },
        exchangeRates,
      }),
    [
      today,
      configResult.config,
      primary,
      historyFingerprint,
      mtdQuery.status,
      mtdQuery.data,
      billsQuery.status,
      billsQuery.data,
      monthRanges,
      exchangeRates,
    ]
  )
}
