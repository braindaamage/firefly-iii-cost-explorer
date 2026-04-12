import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchLatestExchangeRate } from '../api/exchangeRates'

/**
 * Fetches exchange rates for converting foreign currencies to the primary currency.
 *
 * Returns `rates` as a Record<foreignCode, conversionFactor> where each factor
 * converts FROM the foreign currency TO the primary currency:
 *   foreignAmount * rates[foreignCode] = primaryAmount
 *
 * The Firefly III API stores exchange rates in the primary→foreign direction
 * (e.g., EUR→USD: 1.17 means 1 EUR = 1.17 USD). This hook inverts those values
 * to produce usable foreign→primary factors (USD→EUR = 1/1.17 ≈ 0.853).
 */
export function useExchangeRates(
  baseUrl: string,
  token: string,
  primaryCode: string,
  foreignCodes: string[]
): { rates: Record<string, number>; isLoading: boolean; hasError: boolean } {
  const enabled = !!baseUrl && !!token && !!primaryCode

  const results = useQueries({
    queries: foreignCodes.map((code) => ({
      queryKey: ['exchangeRate', baseUrl, primaryCode, code],
      queryFn: () => fetchLatestExchangeRate(baseUrl, token, primaryCode, code),
      staleTime: Infinity,
      enabled,
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const hasError = results.some((r) => r.isError)

  // Fingerprint ensures the rates object reference is stable between renders when
  // no data has changed — avoids unnecessary recomputation downstream.
  const ratesFingerprint = results
    .map((r, i) => `${foreignCodes[i]}:${r.data?.rate ?? r.status}`)
    .join('|')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rates = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    results.forEach((r, i) => {
      const result = r.data
      if (!result) return
      // API always returns rates from primary→foreign (result.from === primaryCode).
      // Invert to obtain the foreign→primary conversion factor.
      // If an unusual foreign→primary rate is stored, use it directly.
      map[foreignCodes[i]] = result.from === primaryCode ? 1 / result.rate : result.rate
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratesFingerprint, primaryCode])

  return { rates, isLoading, hasError }
}
