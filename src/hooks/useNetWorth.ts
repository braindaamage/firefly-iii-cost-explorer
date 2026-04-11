import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchAssetAndLiabilityAccountBalances } from '../api/accounts'
import { fetchCurrencies, findPrimary, findEnabledSecondaries } from '../api/currencies'
import { fetchLatestExchangeRate } from '../api/exchangeRates'
import { computeNetWorth } from './computeNetWorth'
import type { NetWorthResult, RateResult } from './computeNetWorth'

export function useNetWorth(baseUrl: string, token: string): NetWorthResult {
  const enabled = !!baseUrl && !!token

  const accountsQuery = useQuery({
    queryKey: ['accounts', 'asset,liability', baseUrl, token],
    queryFn: () => fetchAssetAndLiabilityAccountBalances(baseUrl, token),
    staleTime: 60_000,
    enabled,
  })

  const currenciesQuery = useQuery({
    queryKey: ['currencies', baseUrl, token],
    queryFn: () => fetchCurrencies(baseUrl, token),
    staleTime: 60 * 60_000,
    enabled,
  })

  const currencies = currenciesQuery.data ?? []

  const primary = useMemo(() => findPrimary(currencies), [currencies])
  const secondaries = useMemo(() => findEnabledSecondaries(currencies), [currencies])

  const rateQueryResults = useQueries({
    queries: secondaries.map((sec) => ({
      queryKey: ['exchangeRate', primary?.code ?? '', sec.code, baseUrl, token],
      queryFn: () => fetchLatestExchangeRate(baseUrl, token, primary!.code, sec.code),
      enabled: enabled && !!primary && !!sec.code,
      staleTime: 15 * 60_000,
    })),
  })

  return useMemo(() => {
    const accounts = accountsQuery.data ?? []

    const accountsStatus = accountsQuery.isPending ? 'pending' : accountsQuery.isError ? 'error' : 'success'
    const currenciesStatus = currenciesQuery.isPending ? 'pending' : currenciesQuery.isError ? 'error' : 'success'

    const rateResults: RateResult[] = secondaries.map((sec, i) => {
      const result = rateQueryResults[i]
      return {
        from: primary?.code ?? '',
        to: sec.code,
        status: result.isPending ? 'pending' : result.isError ? 'error' : 'success',
        rate: result.data?.rate ?? null,
        rateDate: result.data?.date,
      }
    })

    return computeNetWorth({
      accounts,
      currencies,
      primary,
      secondaries,
      rateResults,
      accountsStatus,
      currenciesStatus,
    })
  }, [
    accountsQuery.data,
    accountsQuery.isPending,
    accountsQuery.isError,
    currenciesQuery.data,
    currenciesQuery.isPending,
    currenciesQuery.isError,
    currencies,
    primary,
    secondaries,
    rateQueryResults,
  ])
}
