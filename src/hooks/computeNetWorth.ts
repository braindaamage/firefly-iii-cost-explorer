import type { Account } from '../api/accounts'
import type { Currency } from '../api/currencies'

export type NetWorthStatus =
  | 'loading'
  | 'unavailable'
  | 'ok'
  | 'partial'
  | 'partialSecondary'
  | 'error'

export interface NetWorthConvertedValue {
  currencyCode: string
  currencySymbol: string
  currencyDecimalPlaces: number
  value: number | null
  rateDate?: string
}

export interface NetWorthResult {
  status: NetWorthStatus
  primaryTotal: number | null
  primaryCurrency: { code: string; symbol: string; decimalPlaces: number } | null
  secondaries: NetWorthConvertedValue[]
  excludedAccounts: { id: string; name: string; currencyCode: string }[]
  fallbackPerCurrency: { currencyCode: string; symbol: string; total: number }[]
}

// Fix 1: RateQueryState replaces the old RateResult — data is nested, no from/to needed
export interface RateQueryState {
  status: 'pending' | 'success' | 'error'
  data: { rate: number; date: string } | null
}

export interface ComputeNetWorthInputs {
  accounts: Account[]
  currencies: Currency[]
  primary: Currency | undefined
  secondaries: Currency[]
  rateQueries: RateQueryState[]
  accountsStatus: 'pending' | 'success' | 'error'
  currenciesStatus: 'pending' | 'success' | 'error'
}

const LOADING_RESULT: NetWorthResult = {
  status: 'loading',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const ERROR_RESULT: NetWorthResult = {
  status: 'error',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

function buildFallbackPerCurrency(
  activeAccounts: Account[]
): { currencyCode: string; symbol: string; total: number }[] {
  const map = new Map<string, { symbol: string; total: number }>()
  for (const acc of activeAccounts) {
    const existing = map.get(acc.currencyCode)
    if (existing) {
      existing.total += acc.currentBalance
    } else {
      map.set(acc.currencyCode, { symbol: acc.currencySymbol, total: acc.currentBalance })
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, { symbol, total }]) => ({ currencyCode, symbol, total }))
}

export function computeNetWorth(inputs: ComputeNetWorthInputs): NetWorthResult {
  const { accounts, primary, secondaries, rateQueries, accountsStatus, currenciesStatus } = inputs

  // Step 1: loading state for main queries
  if (accountsStatus === 'pending' || currenciesStatus === 'pending') {
    return LOADING_RESULT
  }

  // Step 2: error state for main queries
  if (accountsStatus === 'error' || currenciesStatus === 'error') {
    return ERROR_RESULT
  }

  // Step 3: filter inactive accounts (spec §8.6)
  const activeAccounts = accounts.filter((a) => a.active)

  // Fix 6: empty accounts → nothing to show; primary undefined → show fallback with available accounts
  // These are two distinct cases (spec §8.2 + matrix row #6)
  if (activeAccounts.length === 0) {
    return {
      status: 'unavailable',
      primaryTotal: null,
      primaryCurrency: null,
      secondaries: [],
      excludedAccounts: [],
      fallbackPerCurrency: [],
    }
  }

  if (primary === undefined) {
    return {
      status: 'unavailable',
      primaryTotal: null,
      primaryCurrency: null,
      secondaries: [],
      excludedAccounts: [],
      fallbackPerCurrency: buildFallbackPerCurrency(activeAccounts),
    }
  }

  // Fix 2: edge case §8.7 — account with currentBalance === 0 and pcCurrentBalance === null
  // is treated as having pcCurrentBalance = 0 (not excluded, contributes 0 to total)
  const normalized = activeAccounts.map((acc) => {
    if (acc.pcCurrentBalance === null && acc.currentBalance === 0) {
      return { ...acc, pcCurrentBalance: 0 as number }
    }
    return acc
  })

  const primaryCurrency = {
    code: primary.code,
    symbol: primary.symbol,
    decimalPlaces: primary.decimalPlaces,
  }

  // Step 5: partition normalized accounts by presence of pcCurrentBalance
  const withPc = normalized.filter((a) => a.pcCurrentBalance !== null)
  const withoutPc = normalized.filter((a) => a.pcCurrentBalance === null)

  // Step 6: all without pc → feature unavailable, show fallback per-currency
  if (withPc.length === 0) {
    return {
      status: 'unavailable',
      primaryTotal: null,
      primaryCurrency,
      secondaries: [],
      excludedAccounts: [],
      fallbackPerCurrency: buildFallbackPerCurrency(activeAccounts),
    }
  }

  // Steps 7-8: determine preStatus and compute primaryTotal
  const preStatus: 'partial' | 'ok' = withoutPc.length > 0 ? 'partial' : 'ok'
  const primaryTotal = withPc.reduce((sum, a) => sum + (a.pcCurrentBalance as number), 0)
  const excludedAccounts = withoutPc.map((a) => ({
    id: a.id,
    name: a.name,
    currencyCode: a.currencyCode,
  }))

  // Step 9: build secondaries from rateQueries (arrays are parallel)
  const secondaryValues: NetWorthConvertedValue[] = []
  let anySecondaryMissing = false

  for (let i = 0; i < secondaries.length; i++) {
    const sec = secondaries[i]
    const rateQuery = rateQueries[i]

    if (!rateQuery || rateQuery.status === 'pending') {
      return LOADING_RESULT
    }

    // Fix 3: defense in depth — validate rate > 0 and finite in the pure function itself
    const rateData = rateQuery.data
    const validRate =
      rateQuery.status === 'success' &&
      rateData !== null &&
      isFinite(rateData.rate) &&
      rateData.rate > 0

    if (validRate && rateData !== null) {
      secondaryValues.push({
        currencyCode: sec.code,
        currencySymbol: sec.symbol,
        currencyDecimalPlaces: sec.decimalPlaces,
        value: primaryTotal * rateData.rate,
        rateDate: rateData.date,
      })
    } else {
      secondaryValues.push({
        currencyCode: sec.code,
        currencySymbol: sec.symbol,
        currencyDecimalPlaces: sec.decimalPlaces,
        value: null,
      })
      anySecondaryMissing = true
    }
  }

  // Step 10: determine final status
  // partial takes priority over partialSecondary (spec §6.5 step 10)
  let finalStatus: NetWorthStatus
  if (preStatus === 'partial') {
    finalStatus = 'partial'
  } else if (anySecondaryMissing) {
    finalStatus = 'partialSecondary'
  } else {
    finalStatus = 'ok'
  }

  return {
    status: finalStatus,
    primaryTotal,
    primaryCurrency,
    secondaries: secondaryValues,
    excludedAccounts,
    fallbackPerCurrency: [],
  }
}
