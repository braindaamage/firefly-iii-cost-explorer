import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchAssetAndLiabilityAccountBalances } from '../api/accounts'
import { fetchCurrencies, findPrimary, findEnabledSecondaries } from '../api/currencies'
import { fetchLatestExchangeRate } from '../api/exchangeRates'
import { computeNetWorth } from './computeNetWorth'
import type { NetWorthResult } from './computeNetWorth'

export function useNetWorth(baseUrl: string, token: string): NetWorthResult {
  const enabled = !!baseUrl && !!token

  const accountsQuery = useQuery({
    // Fix 4: token excluded from queryKey (visible in DevTools; invalidated on login cycle)
    queryKey: ['accounts', 'asset,liability', baseUrl],
    queryFn: () => fetchAssetAndLiabilityAccountBalances(baseUrl, token),
    staleTime: 60_000,
    enabled,
  })

  const currenciesQuery = useQuery({
    queryKey: ['currencies', baseUrl],
    queryFn: () => fetchCurrencies(baseUrl, token),
    staleTime: 60 * 60_000,
    enabled,
  })

  const currencies = currenciesQuery.data ?? []

  const primary = useMemo(() => findPrimary(currencies), [currencies])
  const secondaries = useMemo(() => findEnabledSecondaries(currencies), [currencies])

  const rateQueryResults = useQueries({
    queries: secondaries.map((sec) => ({
      // Fix 4: baseUrl first, then currency codes; no token in key
      queryKey: ['exchangeRate', baseUrl, primary?.code ?? '', sec.code],
      queryFn: () => fetchLatestExchangeRate(baseUrl, token, primary!.code, sec.code),
      enabled: enabled && !!primary && !!sec.code,
      staleTime: 15 * 60_000,
    })),
  })

  return useMemo(
    () =>
      computeNetWorth({
        accountsStatus: accountsQuery.status,
        currenciesStatus: currenciesQuery.status,
        accounts: accountsQuery.data ?? [],
        currencies,
        primary,
        secondaries,
        // Fix 1: map to RateQueryState shape (data nested, no from/to)
        rateQueries: rateQueryResults.map((rq) => ({
          status: rq.status,
          data: rq.data ? { rate: rq.data.rate, date: rq.data.date } : null,
        })),
      }),
    [
      accountsQuery.status,
      accountsQuery.data,
      currenciesQuery.status,
      currencies,
      primary,
      secondaries,
      rateQueryResults,
    ]
  )
}
