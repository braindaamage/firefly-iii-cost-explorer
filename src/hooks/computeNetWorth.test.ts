import { describe, it, expect } from 'vitest'
import { computeNetWorth } from './computeNetWorth'
import type { ComputeNetWorthInputs, RateQueryState } from './computeNetWorth'
import type { Account } from '../api/accounts'
import type { Currency } from '../api/currencies'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: '1',
    name: 'Checking',
    active: true,
    type: 'asset',
    currentBalance: 1000,
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyDecimalPlaces: 2,
    pcCurrentBalance: 1000,
    primaryCurrencyCode: 'EUR',
    primaryCurrencySymbol: '€',
    primaryCurrencyDecimalPlaces: 2,
    ...overrides,
  }
}

const EUR: Currency = {
  id: '1', code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true, isPrimary: true,
}

const USD: Currency = {
  id: '2', code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true, isPrimary: false,
}

const CLP: Currency = {
  id: '3', code: 'CLP', name: 'Chilean Peso', symbol: 'CLP', decimalPlaces: 0, enabled: true, isPrimary: false,
}

// Fix 1: helper now builds RateQueryState (data nested), no from/to
function makeRateQuery(overrides: Partial<RateQueryState> = {}): RateQueryState {
  return {
    status: 'success',
    data: { rate: 1.1, date: '2024-03-15' },
    ...overrides,
  }
}

function baseInputs(overrides: Partial<ComputeNetWorthInputs> = {}): ComputeNetWorthInputs {
  return {
    accounts: [makeAccount()],
    currencies: [EUR],
    primary: EUR,
    secondaries: [],
    rateQueries: [],
    accountsStatus: 'success',
    currenciesStatus: 'success',
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('computeNetWorth', () => {
  it('computeNetWorth_allOk_returnsOkWithSumAndConversions', () => {
    const accounts = [
      makeAccount({ id: '1', pcCurrentBalance: 1000 }),
      makeAccount({ id: '2', pcCurrentBalance: 500 }),
    ]
    const rateQueries = [makeRateQuery({ data: { rate: 1.1, date: '2024-03-15' } })]

    const result = computeNetWorth(baseInputs({
      accounts,
      secondaries: [USD],
      rateQueries,
    }))

    expect(result.status).toBe('ok')
    expect(result.primaryTotal).toBe(1500)
    expect(result.primaryCurrency).toEqual({ code: 'EUR', symbol: '€', decimalPlaces: 2 })
    expect(result.secondaries).toHaveLength(1)
    expect(result.secondaries[0].value).toBeCloseTo(1650)
    expect(result.secondaries[0].currencyCode).toBe('USD')
    expect(result.secondaries[0].rateDate).toBe('2024-03-15')
    expect(result.excludedAccounts).toHaveLength(0)
    expect(result.fallbackPerCurrency).toHaveLength(0)
  })

  it('computeNetWorth_allPcNull_returnsUnavailableWithFallback', () => {
    const accounts = [
      makeAccount({ id: '1', currencyCode: 'EUR', currencySymbol: '€', currentBalance: 600, pcCurrentBalance: null }),
      makeAccount({ id: '2', currencyCode: 'EUR', currencySymbol: '€', currentBalance: 400, pcCurrentBalance: null }),
      makeAccount({ id: '3', currencyCode: 'USD', currencySymbol: '$', currentBalance: 200, pcCurrentBalance: null }),
    ]

    const result = computeNetWorth(baseInputs({ accounts }))

    expect(result.status).toBe('unavailable')
    expect(result.primaryTotal).toBeNull()
    expect(result.secondaries).toHaveLength(0)
    expect(result.excludedAccounts).toHaveLength(0)

    const eur = result.fallbackPerCurrency.find((f) => f.currencyCode === 'EUR')
    expect(eur?.total).toBe(1000)
    const usd = result.fallbackPerCurrency.find((f) => f.currencyCode === 'USD')
    expect(usd?.total).toBe(200)
  })

  it('computeNetWorth_somePcNull_returnsPartialWithExclusions', () => {
    const accounts = [
      makeAccount({ id: '1', name: 'Savings', pcCurrentBalance: 800 }),
      makeAccount({ id: '2', name: 'Old Account', currencyCode: 'USD', pcCurrentBalance: null }),
    ]

    const result = computeNetWorth(baseInputs({ accounts }))

    expect(result.status).toBe('partial')
    expect(result.primaryTotal).toBe(800)
    expect(result.excludedAccounts).toHaveLength(1)
    expect(result.excludedAccounts[0].id).toBe('2')
    expect(result.excludedAccounts[0].name).toBe('Old Account')
    expect(result.excludedAccounts[0].currencyCode).toBe('USD')
  })

  it('computeNetWorth_allRatesMissing_returnsPartialSecondaryNoSubline', () => {
    const accounts = [makeAccount({ pcCurrentBalance: 1000 })]
    const rateQueries = [
      makeRateQuery({ status: 'success', data: null }),
      makeRateQuery({ status: 'success', data: null }),
    ]

    const result = computeNetWorth(baseInputs({
      accounts,
      secondaries: [USD, CLP],
      rateQueries,
    }))

    expect(result.status).toBe('partialSecondary')
    expect(result.primaryTotal).toBe(1000)
    expect(result.secondaries).toHaveLength(2)
    expect(result.secondaries.every((s) => s.value === null)).toBe(true)
  })

  it('computeNetWorth_someRatesMissing_returnsPartialSecondaryWithChip', () => {
    const accounts = [makeAccount({ pcCurrentBalance: 1000 })]
    const rateQueries = [
      makeRateQuery({ data: { rate: 1.1, date: '2024-03-15' } }),
      makeRateQuery({ status: 'success', data: null }),
    ]

    const result = computeNetWorth(baseInputs({
      accounts,
      secondaries: [USD, CLP],
      rateQueries,
    }))

    expect(result.status).toBe('partialSecondary')
    expect(result.secondaries[0].value).toBeCloseTo(1100)
    expect(result.secondaries[1].value).toBeNull()
  })

  it('computeNetWorth_accountsError_returnsError', () => {
    const result = computeNetWorth(baseInputs({ accountsStatus: 'error' }))
    expect(result.status).toBe('error')
    expect(result.primaryTotal).toBeNull()
    expect(result.secondaries).toHaveLength(0)
  })

  it('computeNetWorth_currenciesError_returnsError', () => {
    const result = computeNetWorth(baseInputs({ currenciesStatus: 'error' }))
    expect(result.status).toBe('error')
    expect(result.primaryTotal).toBeNull()
  })

  it('computeNetWorth_loading_whenAnyQueryPending', () => {
    const withAccountsPending = computeNetWorth(baseInputs({ accountsStatus: 'pending' }))
    expect(withAccountsPending.status).toBe('loading')

    const withCurrenciesPending = computeNetWorth(baseInputs({ currenciesStatus: 'pending' }))
    expect(withCurrenciesPending.status).toBe('loading')

    // Rate query pending also triggers loading
    const rateQueries: RateQueryState[] = [{ status: 'pending', data: null }]
    const withRatePending = computeNetWorth(baseInputs({
      accounts: [makeAccount({ pcCurrentBalance: 1000 })],
      secondaries: [USD],
      rateQueries,
    }))
    expect(withRatePending.status).toBe('loading')
  })

  it('computeNetWorth_liabilityNegativeBalance_subtractedCorrectly', () => {
    const accounts = [
      makeAccount({ id: '1', name: 'Savings', type: 'asset', pcCurrentBalance: 2000 }),
      makeAccount({ id: '2', name: 'Credit Card', type: 'liability', pcCurrentBalance: -500 }),
    ]

    const result = computeNetWorth(baseInputs({ accounts }))

    expect(result.status).toBe('ok')
    expect(result.primaryTotal).toBe(1500)
  })

  it('computeNetWorth_inactiveAccounts_excluded', () => {
    const accounts = [
      makeAccount({ id: '1', name: 'Active', active: true, pcCurrentBalance: 1000 }),
      makeAccount({ id: '2', name: 'Inactive', active: false, pcCurrentBalance: 5000 }),
    ]

    const result = computeNetWorth(baseInputs({ accounts }))

    expect(result.status).toBe('ok')
    // Inactive balance is silently ignored (not in excludedAccounts)
    expect(result.primaryTotal).toBe(1000)
    expect(result.excludedAccounts).toHaveLength(0)
  })

  it('computeNetWorth_rateZero_treatedAsMissing', () => {
    // Fix 3: computeNetWorth checks rate > 0 internally — rate=0 in data → value null
    const rateQueries: RateQueryState[] = [
      { status: 'success', data: { rate: 0, date: '2024-03-15' } },
    ]

    const result = computeNetWorth(baseInputs({
      accounts: [makeAccount({ pcCurrentBalance: 1000 })],
      secondaries: [USD],
      rateQueries,
    }))

    expect(result.status).toBe('partialSecondary')
    expect(result.secondaries[0].value).toBeNull()
  })

  it('computeNetWorth_singleCurrency_noSubline', () => {
    const result = computeNetWorth(baseInputs({
      accounts: [makeAccount({ pcCurrentBalance: 1000 })],
      secondaries: [],
      rateQueries: [],
    }))

    expect(result.status).toBe('ok')
    expect(result.primaryTotal).toBe(1000)
    expect(result.secondaries).toHaveLength(0)
  })

  it('computeNetWorth_decimalPlacesZero_formatCLP', () => {
    const clpPrimary: Currency = {
      id: '3', code: 'CLP', name: 'Chilean Peso', symbol: 'CLP', decimalPlaces: 0, enabled: true, isPrimary: true,
    }
    const accounts = [makeAccount({
      primaryCurrencyCode: 'CLP',
      primaryCurrencySymbol: 'CLP',
      primaryCurrencyDecimalPlaces: 0,
      pcCurrentBalance: 500000,
    })]

    const result = computeNetWorth(baseInputs({
      accounts,
      primary: clpPrimary,
      currencies: [clpPrimary],
    }))

    expect(result.status).toBe('ok')
    expect(result.primaryCurrency?.decimalPlaces).toBe(0)
    expect(result.primaryCurrency?.code).toBe('CLP')
    expect(result.primaryTotal).toBe(500000)
  })

  it('computeNetWorth_pcBalanceZero_includedNotExcluded', () => {
    // Fix 2: account with currentBalance=0 and pcCurrentBalance=null (spec §8.7)
    // must NOT appear in excludedAccounts and must NOT make status 'partial'
    const accounts = [
      makeAccount({ id: '1', name: 'Zero Balance', currentBalance: 0, pcCurrentBalance: null }),
      makeAccount({ id: '2', name: 'Savings', pcCurrentBalance: 500 }),
    ]

    const result = computeNetWorth(baseInputs({ accounts }))

    expect(result.status).toBe('ok')           // not 'partial'
    expect(result.excludedAccounts).toHaveLength(0)
    expect(result.primaryTotal).toBe(500)      // 0 + 500
  })
})
