import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountBalancePanel } from '../AccountBalancePanel'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import { useNetWorth } from '../../../hooks/useNetWorth'
import type { Account } from '../../../api/accounts'
import type { NetWorthResult } from '../../../hooks/computeNetWorth'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

vi.mock('../../../hooks/useNetWorth', () => ({
  useNetWorth: vi.fn(),
}))

vi.mock('../../../api/accounts', () => ({
  fetchAssetAndLiabilityAccountBalances: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../api/currencies', () => ({
  fetchCurrencies: vi.fn().mockResolvedValue([]),
  findPrimary: vi.fn().mockReturnValue(undefined),
  findEnabledSecondaries: vi.fn().mockReturnValue([]),
}))

vi.mock('../../../api/exchangeRates', () => ({
  fetchLatestExchangeRate: vi.fn().mockResolvedValue(null),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

const LOADING: NetWorthResult = {
  status: 'loading',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const ERROR: NetWorthResult = {
  status: 'error',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const OK: NetWorthResult = {
  status: 'ok',
  primaryTotal: 8845.67,
  primaryCurrency: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
  secondaries: [
    { currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2, value: 9500.0, rateDate: '2024-03-15' },
  ],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const OK_TWO_SECONDARIES: NetWorthResult = {
  status: 'ok',
  primaryTotal: 5000,
  primaryCurrency: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
  secondaries: [
    { currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2, value: 5500, rateDate: '2024-03-15' },
    { currencyCode: 'CLP', currencySymbol: 'CLP', currencyDecimalPlaces: 0, value: 4800000, rateDate: '2024-03-15' },
  ],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const OK_CLP_PRIMARY: NetWorthResult = {
  status: 'ok',
  primaryTotal: 500000,
  primaryCurrency: { code: 'CLP', symbol: 'CLP', decimalPlaces: 0 },
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const PARTIAL: NetWorthResult = {
  status: 'partial',
  primaryTotal: 6000,
  primaryCurrency: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
  secondaries: [],
  excludedAccounts: [
    { id: '2', name: 'Old Account', currencyCode: 'USD' },
    { id: '3', name: 'CLP Account', currencyCode: 'CLP' },
  ],
  fallbackPerCurrency: [],
}

const PARTIAL_SECONDARY_SOME: NetWorthResult = {
  status: 'partialSecondary',
  primaryTotal: 5000,
  primaryCurrency: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
  secondaries: [
    { currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2, value: 5500, rateDate: '2024-03-15' },
    { currencyCode: 'CLP', currencySymbol: 'CLP', currencyDecimalPlaces: 0, value: null },
  ],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const PARTIAL_SECONDARY_ALL: NetWorthResult = {
  status: 'partialSecondary',
  primaryTotal: 5000,
  primaryCurrency: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
  secondaries: [
    { currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2, value: null },
    { currencyCode: 'CLP', currencySymbol: 'CLP', currencyDecimalPlaces: 0, value: null },
  ],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const UNAVAILABLE: NetWorthResult = {
  status: 'unavailable',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [
    { currencyCode: 'EUR', symbol: '€', total: 1000 },
    { currencyCode: 'USD', symbol: '$', total: 500 },
  ],
}

const UNAVAILABLE_NO_FALLBACK: NetWorthResult = {
  status: 'unavailable',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

// ─── Render helper ────────────────────────────────────────────────────────────

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'
const ACCOUNTS_QUERY_KEY = ['accounts', 'asset,liability', BASE_URL]

function renderPanel(seedAccounts?: Account[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (seedAccounts) {
    client.setQueryData(ACCOUNTS_QUERY_KEY, seedAccounts)
  }
  return render(
    <QueryClientProvider client={client}>
      <AccountBalancePanel baseUrl={BASE_URL} token={TOKEN} />
    </QueryClientProvider>
  )
}

// ─── Tests — state: loading ───────────────────────────────────────────────────

describe('AccountBalancePanel — state: loading', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(LOADING)
  })

  it('renders loading skeleton when netWorth.status is loading', () => {
    renderPanel()
    expect(screen.getByLabelText('Loading balances')).toBeInTheDocument()
    expect(screen.queryByText('Net Worth')).not.toBeInTheDocument()
  })

  it('does NOT render account cards in loading state', () => {
    renderPanel()
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
  })
})

// ─── Tests — state: error ─────────────────────────────────────────────────────

describe('AccountBalancePanel — state: error', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(ERROR)
  })

  it('renders error state with red error text', () => {
    renderPanel()
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    const errorEl = screen.getByTestId('net-worth-error')
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveStyle({ color: '#f28b82' })
  })
})

// ─── Tests — state: ok ────────────────────────────────────────────────────────

describe('AccountBalancePanel — state: ok', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(OK)
  })

  it('renders ok state with primary total and subline conversions', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-primary')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-subline')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
  })

  it('renders Net Worth label', () => {
    renderPanel()
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders no warning chips', () => {
    renderPanel()
    expect(screen.queryByTestId('warning-chips')).not.toBeInTheDocument()
  })

  it('formats primary total with CLP decimalPlaces 0', () => {
    vi.mocked(useNetWorth).mockReturnValue(OK_CLP_PRIMARY)
    renderPanel()
    const primary = screen.getByTestId('net-worth-primary')
    expect(primary).toBeInTheDocument()
    // CLP formatted without decimal places — no dot in the number
    expect(primary.textContent).not.toMatch(/\.\d{2}/)
  })
})

// ─── Tests — state: partial ───────────────────────────────────────────────────

describe('AccountBalancePanel — state: partial', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(PARTIAL)
  })

  it('renders partial state with excluded accounts chip and tooltip', () => {
    renderPanel()
    const chip = screen.getByTestId('chip-excluded')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent('2 cuentas excluidas')
    // title attribute contains excluded account names
    expect(chip).toHaveAttribute('title', expect.stringContaining('Old Account'))
    expect(chip).toHaveAttribute('title', expect.stringContaining('CLP Account'))
  })

  it('chip title includes currency code', () => {
    renderPanel()
    expect(screen.getByTestId('chip-excluded')).toHaveAttribute('title', expect.stringContaining('USD'))
  })
})

// ─── Tests — state: partialSecondary ─────────────────────────────────────────

describe('AccountBalancePanel — state: partialSecondary (some missing)', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(PARTIAL_SECONDARY_SOME)
  })

  it('renders partialSecondary state with rate missing chips per secondary', () => {
    renderPanel()
    expect(screen.getByTestId('chip-rate-missing-CLP')).toBeInTheDocument()
    expect(screen.getByTestId('chip-rate-missing-CLP')).toHaveTextContent('CLP rate missing')
  })

  it('shows only secondaries with values in subline', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
    expect(screen.queryByTestId('net-worth-secondary-CLP')).not.toBeInTheDocument()
  })
})

describe('AccountBalancePanel — state: partialSecondary (all missing)', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(PARTIAL_SECONDARY_ALL)
  })

  it('renders partialSecondary state with global chip when all secondaries fail', () => {
    renderPanel()
    expect(screen.getByTestId('chip-all-rates-missing')).toBeInTheDocument()
    expect(screen.getByTestId('chip-all-rates-missing')).toHaveTextContent('No secondary rates available')
  })

  it('renders no subline when all secondaries are missing', () => {
    renderPanel()
    expect(screen.queryByTestId('net-worth-subline')).not.toBeInTheDocument()
  })
})

// ─── Tests — state: unavailable ───────────────────────────────────────────────

describe('AccountBalancePanel — state: unavailable', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(UNAVAILABLE)
  })

  it('renders unavailable state with fallback per-currency and info banner', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-fallback')).toBeInTheDocument()
    expect(screen.getAllByTestId('net-worth-total')).toHaveLength(2)
    expect(screen.getByTestId('unavailable-banner')).toBeInTheDocument()
  })

  it('renders unavailable banner with link to Firefly docs', () => {
    renderPanel()
    const banner = screen.getByTestId('unavailable-banner')
    expect(banner).toHaveTextContent('Convert to primary currency')
    expect(banner).toHaveTextContent('Ver docs')
    expect(screen.getByRole('link', { name: 'Ver docs' })).toHaveAttribute(
      'href',
      'https://docs.firefly-iii.org/explanation/financial-concepts/exchange-rates/'
    )
  })

  it('renders nothing in header when fallback is empty', () => {
    vi.mocked(useNetWorth).mockReturnValue(UNAVAILABLE_NO_FALLBACK)
    renderPanel()
    expect(screen.queryByTestId('net-worth-fallback')).not.toBeInTheDocument()
  })
})

// ─── Tests — account cards ────────────────────────────────────────────────────

describe('AccountBalancePanel — account cards', () => {
  const threeAccounts: Account[] = [
    makeAccount({ id: '1', name: 'Savings', currentBalance: 5000 }),
    makeAccount({ id: '2', name: 'Checking', currentBalance: 3456.78 }),
    makeAccount({ id: '3', name: 'Cash', currentBalance: 388.89 }),
  ]

  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(OK)
  })

  it('renders account cards below header in ok state', () => {
    renderPanel(threeAccounts)
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  it('renders all account names', () => {
    renderPanel(threeAccounts)
    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('renders account cards below header in unavailable state', () => {
    vi.mocked(useNetWorth).mockReturnValue(UNAVAILABLE)
    renderPanel(threeAccounts)
    expect(screen.getByTestId('unavailable-banner')).toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  it('negative balance on individual card shows red color', () => {
    const overdraft = [makeAccount({ id: '99', name: 'Overdraft', currentBalance: -200 })]
    renderPanel(overdraft)
    expect(screen.getByTestId('account-balance-99')).toHaveStyle({ color: '#f28b82' })
  })

  it('account cards are grouped by currency then sorted by balance desc', () => {
    const mixed: Account[] = [
      makeAccount({ id: '1', name: 'EUR Savings', currentBalance: 3000 }),
      makeAccount({ id: '2', name: 'USD Main', currentBalance: 4000, currencyCode: 'USD', currencySymbol: '$' }),
      makeAccount({ id: '3', name: 'EUR Checking', currentBalance: 5000 }),
      makeAccount({ id: '4', name: 'USD Savings', currentBalance: 1000, currencyCode: 'USD', currencySymbol: '$' }),
    ]
    renderPanel(mixed)
    const names = screen.getAllByTestId('account-name').map((el) => el.textContent)
    expect(names[0]).toBe('EUR Checking')
    expect(names[1]).toBe('EUR Savings')
    expect(names[2]).toBe('USD Main')
    expect(names[3]).toBe('USD Savings')
  })

  it('inactive accounts are not rendered as cards', () => {
    const withInactive: Account[] = [
      makeAccount({ id: '1', name: 'Active Account', active: true, currentBalance: 500 }),
      makeAccount({ id: '2', name: 'Inactive Account', active: false, currentBalance: 9999 }),
    ]
    renderPanel(withInactive)
    expect(screen.getAllByTestId('account-card')).toHaveLength(1)
    expect(screen.getByText('Active Account')).toBeInTheDocument()
    expect(screen.queryByText('Inactive Account')).not.toBeInTheDocument()
  })
})

// ─── Tests — responsive ───────────────────────────────────────────────────────

describe('AccountBalancePanel — responsive: mobile', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    vi.mocked(useNetWorth).mockReturnValue(OK)
  })

  it('renders loading skeleton with single column on mobile', () => {
    vi.mocked(useNetWorth).mockReturnValue(LOADING)
    renderPanel()
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr' })
  })

  it('responsive: uses 26px total on mobile', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '26px' })
  })

  it('responsive: subline uses flex-wrap on mobile', () => {
    vi.mocked(useNetWorth).mockReturnValue(OK_TWO_SECONDARIES)
    renderPanel()
    expect(screen.getByTestId('net-worth-subline')).toHaveStyle({ flexWrap: 'wrap' })
  })
})

describe('AccountBalancePanel — responsive: tablet', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
    vi.mocked(useNetWorth).mockReturnValue(OK)
  })

  it('renders loading skeleton with two column grid on tablet', () => {
    vi.mocked(useNetWorth).mockReturnValue(LOADING)
    renderPanel()
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr 1fr' })
  })

  it('uses 26px primary total on tablet (compact)', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '26px' })
  })
})

describe('AccountBalancePanel — responsive: desktop', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    vi.mocked(useNetWorth).mockReturnValue(OK)
  })

  it('responsive: uses 32px total on desktop', () => {
    renderPanel()
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '32px' })
  })

  it('renders subline with · separator on desktop (two secondaries)', () => {
    vi.mocked(useNetWorth).mockReturnValue(OK_TWO_SECONDARIES)
    renderPanel()
    expect(screen.getByTestId('net-worth-subline')).toHaveTextContent('·')
  })
})
