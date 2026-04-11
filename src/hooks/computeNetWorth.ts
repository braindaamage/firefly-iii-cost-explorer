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

export interface RateResult {
  from: string
  to: string
  status: 'pending' | 'success' | 'error'
  rate: number | null
  rateDate?: string
}

export interface ComputeNetWorthInputs {
  accounts: Account[]
  currencies: Currency[]
  primary: Currency | undefined
  secondaries: Currency[]
  rateResults: RateResult[]
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
  return Array.from(map.entries()).map(([currencyCode, { symbol, total }]) => ({
    currencyCode,
    symbol,
    total,
  }))
}

export function computeNetWorth(inputs: ComputeNetWorthInputs): NetWorthResult {
  const { accounts, primary, secondaries, rateResults, accountsStatus, currenciesStatus } = inputs

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

  // Step 4: no active accounts or no primary defined → unavailable (spec §8.2)
  if (activeAccounts.length === 0 || primary === undefined) {
    return {
      status: 'unavailable',
      primaryTotal: null,
      primaryCurrency: primary
        ? { code: primary.code, symbol: primary.symbol, decimalPlaces: primary.decimalPlaces }
        : null,
      secondaries: [],
      excludedAccounts: [],
      fallbackPerCurrency: [],
    }
  }

  // Step 5: partition accounts by presence of pc_current_balance
  // pcCurrentBalance === 0 counts as present (spec §8.7)
  const withPc = activeAccounts.filter((a) => a.pcCurrentBalance !== null)
  const withoutPc = activeAccounts.filter((a) => a.pcCurrentBalance === null)

  const primaryCurrency = {
    code: primary.code,
    symbol: primary.symbol,
    decimalPlaces: primary.decimalPlaces,
  }

  // Step 6: all accounts without pc → feature unavailable, show fallback per-currency
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

  // Step 9: build secondaries from rateResults (arrays are parallel)
  const secondaryValues: NetWorthConvertedValue[] = []
  let anySecondaryMissing = false

  for (let i = 0; i < secondaries.length; i++) {
    const sec = secondaries[i]
    const rateResult = rateResults[i]

    if (!rateResult || rateResult.status === 'pending') {
      return LOADING_RESULT
    }

    if (rateResult.status === 'error' || rateResult.rate === null) {
      secondaryValues.push({
        currencyCode: sec.code,
        currencySymbol: sec.symbol,
        currencyDecimalPlaces: sec.decimalPlaces,
        value: null,
      })
      anySecondaryMissing = true
    } else {
      secondaryValues.push({
        currencyCode: sec.code,
        currencySymbol: sec.symbol,
        currencyDecimalPlaces: sec.decimalPlaces,
        value: primaryTotal * rateResult.rate,
        rateDate: rateResult.rateDate,
      })
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
