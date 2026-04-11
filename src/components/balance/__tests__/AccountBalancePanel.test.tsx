import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountBalancePanel } from '../AccountBalancePanel'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { Account } from '../../../api/accounts'
import type { NetWorthResult } from '../../../hooks/computeNetWorth'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
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

const threeAccounts: Account[] = [
  makeAccount({ id: '1', name: 'Savings', currentBalance: 5000 }),
  makeAccount({ id: '2', name: 'Checking', currentBalance: 3456.78 }),
  makeAccount({ id: '3', name: 'Cash', currentBalance: 388.89 }),
]

const singleAccount: Account[] = [
  makeAccount({ id: '1', name: 'Checking', currentBalance: 1000 }),
]

// ─── Tests — state: loading ───────────────────────────────────────────────────

describe('AccountBalancePanel — state: loading', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders loading skeleton when netWorth.status is loading', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    expect(screen.getByLabelText('Loading balances')).toBeInTheDocument()
    expect(screen.queryByText('Net Worth')).not.toBeInTheDocument()
  })

  it('does NOT render account cards in loading state', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={threeAccounts} />)
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
  })
})

// ─── Tests — state: error ─────────────────────────────────────────────────────

describe('AccountBalancePanel — state: error', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders error state with red error text', () => {
    render(<AccountBalancePanel netWorth={ERROR} accounts={[]} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    const errorEl = screen.getByTestId('net-worth-error')
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveStyle({ color: '#f28b82' })
  })
})

// ─── Tests — state: ok ────────────────────────────────────────────────────────

describe('AccountBalancePanel — state: ok', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders ok state with primary total and subline conversions', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.getByTestId('net-worth-primary')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-subline')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
  })

  it('renders Net Worth label', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders no warning chips in ok state', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.queryByTestId('warning-chips')).not.toBeInTheDocument()
  })

  it('formats primary total with CLP decimalPlaces 0', () => {
    render(<AccountBalancePanel netWorth={OK_CLP_PRIMARY} accounts={[]} />)
    const primary = screen.getByTestId('net-worth-primary')
    expect(primary).toBeInTheDocument()
    // CLP has no decimal places — no dot followed by 2 digits
    expect(primary.textContent).not.toMatch(/\.\d{2}/)
  })
})

// ─── Tests — state: partial ───────────────────────────────────────────────────

describe('AccountBalancePanel — state: partial', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders partial state with excluded accounts chip and tooltip', () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={[]} />)
    const chip = screen.getByTestId('chip-excluded')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent('2 cuentas excluidas')
    expect(chip).toHaveAttribute('title', expect.stringContaining('Old Account'))
    expect(chip).toHaveAttribute('title', expect.stringContaining('CLP Account'))
  })

  it('chip title includes currency code of excluded accounts', () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={[]} />)
    expect(screen.getByTestId('chip-excluded')).toHaveAttribute('title', expect.stringContaining('USD'))
  })
})

// ─── Tests — state: partialSecondary ─────────────────────────────────────────

describe('AccountBalancePanel — state: partialSecondary (some missing)', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders partialSecondary state with rate missing chips per secondary', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_SOME} accounts={[]} />)
    expect(screen.getByTestId('chip-rate-missing-CLP')).toBeInTheDocument()
    expect(screen.getByTestId('chip-rate-missing-CLP')).toHaveTextContent('CLP rate missing')
  })

  it('shows only secondaries with values in subline', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_SOME} accounts={[]} />)
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
    expect(screen.queryByTestId('net-worth-secondary-CLP')).not.toBeInTheDocument()
  })
})

describe('AccountBalancePanel — state: partialSecondary (all missing)', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders partialSecondary state with global chip when all secondaries fail', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_ALL} accounts={[]} />)
    expect(screen.getByTestId('chip-all-rates-missing')).toBeInTheDocument()
    expect(screen.getByTestId('chip-all-rates-missing')).toHaveTextContent('No secondary rates available')
  })

  it('renders no subline when all secondaries are missing', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_ALL} accounts={[]} />)
    expect(screen.queryByTestId('net-worth-subline')).not.toBeInTheDocument()
  })
})

// ─── Tests — state: unavailable ───────────────────────────────────────────────

describe('AccountBalancePanel — state: unavailable', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders unavailable state with fallback per-currency and info banner', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    expect(screen.getByTestId('net-worth-fallback')).toBeInTheDocument()
    expect(screen.getAllByTestId('net-worth-total')).toHaveLength(2)
    expect(screen.getByTestId('unavailable-banner')).toBeInTheDocument()
  })

  it('renders unavailable banner with link to Firefly docs', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    const banner = screen.getByTestId('unavailable-banner')
    expect(banner).toHaveTextContent('Convert to primary currency')
    expect(banner).toHaveTextContent('Ver docs')
    expect(screen.getByRole('link', { name: 'Ver docs' })).toHaveAttribute(
      'href',
      'https://docs.firefly-iii.org/explanation/financial-concepts/exchange-rates/'
    )
  })

  it('renders banner info color #8ab4f8', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    expect(screen.getByTestId('unavailable-banner')).toHaveStyle({ color: 'rgb(138, 180, 248)' })
  })

  it('renders nothing in header when fallback is empty', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE_NO_FALLBACK} accounts={[]} />)
    expect(screen.queryByTestId('net-worth-fallback')).not.toBeInTheDocument()
  })

  it('renders account cards below header in unavailable state', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={threeAccounts} />)
    expect(screen.getByTestId('unavailable-banner')).toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })
})

// ─── Tests — account cards ────────────────────────────────────────────────────

describe('AccountBalancePanel — account cards', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('renders account cards below header in ok state', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={threeAccounts} />)
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  it('renders all account names', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={threeAccounts} />)
    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('negative balance on individual card shows red color', () => {
    const overdraft = [makeAccount({ id: '99', name: 'Overdraft', currentBalance: -200 })]
    render(<AccountBalancePanel netWorth={OK} accounts={overdraft} />)
    expect(screen.getByTestId('account-balance-99')).toHaveStyle({ color: '#f28b82' })
  })

  it('positive balance shows light color', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ color: '#e8eaed' })
  })

  it('account cards are grouped by currency then sorted by balance desc', () => {
    const mixed: Account[] = [
      makeAccount({ id: '1', name: 'EUR Savings', currentBalance: 3000 }),
      makeAccount({ id: '2', name: 'USD Main', currentBalance: 4000, currencyCode: 'USD', currencySymbol: '$' }),
      makeAccount({ id: '3', name: 'EUR Checking', currentBalance: 5000 }),
      makeAccount({ id: '4', name: 'USD Savings', currentBalance: 1000, currencyCode: 'USD', currencySymbol: '$' }),
    ]
    render(<AccountBalancePanel netWorth={OK} accounts={mixed} />)
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
    render(<AccountBalancePanel netWorth={OK} accounts={withInactive} />)
    expect(screen.getAllByTestId('account-card')).toHaveLength(1)
    expect(screen.getByText('Active Account')).toBeInTheDocument()
    expect(screen.queryByText('Inactive Account')).not.toBeInTheDocument()
  })

  it('renders no card container when accounts is empty', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
  })
})

// ─── Tests — responsive ───────────────────────────────────────────────────────

describe('AccountBalancePanel — responsive: mobile', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('mobile'))

  it('renders loading skeleton with single column on mobile', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr' })
  })

  it('responsive: uses 26px total on mobile', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '26px' })
  })

  it('responsive: subline uses flex-wrap on mobile', () => {
    render(<AccountBalancePanel netWorth={OK_TWO_SECONDARIES} accounts={[]} />)
    expect(screen.getByTestId('net-worth-subline')).toHaveStyle({ flexWrap: 'wrap' })
  })

  it('renders account balance font-size 14px on mobile', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ fontSize: '14px' })
  })

  it('renders cards in single column grid on mobile', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    const card = screen.getByTestId('account-card')
    expect(card.parentElement).toHaveStyle({ gridTemplateColumns: '1fr' })
  })
})

describe('AccountBalancePanel — responsive: tablet', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('tablet'))

  it('renders loading skeleton with two column grid on tablet', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr 1fr' })
  })

  it('uses 26px primary total on tablet (compact)', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '26px' })
  })

  it('renders account balance font-size 15px on tablet', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ fontSize: '15px' })
  })

  it('renders cards in two column grid on tablet', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    const card = screen.getByTestId('account-card')
    expect(card.parentElement).toHaveStyle({ gridTemplateColumns: '1fr 1fr' })
  })
})

describe('AccountBalancePanel — responsive: desktop', () => {
  beforeEach(() => vi.mocked(useBreakpoint).mockReturnValue('desktop'))

  it('responsive: uses 32px total on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '32px' })
  })

  it('renders subline with · separator on desktop (two secondaries)', () => {
    render(<AccountBalancePanel netWorth={OK_TWO_SECONDARIES} accounts={[]} />)
    expect(screen.getByTestId('net-worth-subline')).toHaveTextContent('·')
  })

  it('renders account balance font-size 16px on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ fontSize: '16px' })
  })

  it('renders cards container with overflowX auto on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    const card = screen.getByTestId('account-card')
    expect(card.parentElement).toHaveStyle({ overflowX: 'auto' })
  })
})
