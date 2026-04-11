import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const UNAVAILABLE_NO_FALLBACK: NetWorthResult = {
  status: 'unavailable',
  primaryTotal: null,
  primaryCurrency: null,
  secondaries: [],
  excludedAccounts: [],
  fallbackPerCurrency: [],
}

const accounts: Account[] = [
  makeAccount({ id: '1', name: 'Checking', currentBalance: 3456.78 }),
  makeAccount({ id: '2', name: 'Savings', currentBalance: 5000.0 }),
  makeAccount({ id: '3', name: 'Cash', currentBalance: 388.89 }),
]

const singleAccount: Account[] = [
  makeAccount({ id: '1', name: 'Checking', currentBalance: 1000 }),
]


// ─── Tests — state rendering ──────────────────────────────────────────────────

describe('AccountBalancePanel — state: loading', () => {
  it('renders skeleton when status is loading', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    expect(screen.getByLabelText('Loading balances')).toBeInTheDocument()
    expect(screen.queryByText('Net Worth')).not.toBeInTheDocument()
  })
})

describe('AccountBalancePanel — state: error', () => {
  it('renders error message in red when status is error', () => {
    render(<AccountBalancePanel netWorth={ERROR} accounts={[]} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    const errorEl = screen.getByTestId('net-worth-error')
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveStyle({ color: '#f28b82' })
  })
})

describe('AccountBalancePanel — state: ok', () => {
  it('renders Net Worth label', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders primary total large', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    const primary = screen.getByTestId('net-worth-primary')
    expect(primary).toBeInTheDocument()
    expect(primary).toHaveStyle({ fontSize: '32px', fontWeight: 600 })
  })

  it('renders secondary subline', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    expect(screen.getByTestId('net-worth-subline')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
  })

  it('renders no warning chips', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    expect(screen.queryByTestId('warning-chips')).not.toBeInTheDocument()
  })

  it('renders account cards', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  it('renders all account names', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })
})

describe('AccountBalancePanel — state: partial', () => {
  it('renders primary total', () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={accounts} />)
    expect(screen.getByTestId('net-worth-primary')).toBeInTheDocument()
  })

  it('renders "N cuentas excluidas" chip', () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={accounts} />)
    expect(screen.getByTestId('chip-excluded')).toBeInTheDocument()
    expect(screen.getByTestId('chip-excluded')).toHaveTextContent('2 cuentas excluidas')
  })

  it('clicking excluded chip reveals account names', async () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={accounts} />)
    const chip = screen.getByTestId('chip-excluded')
    await userEvent.click(chip)
    const tooltip = screen.getByTestId('chip-excluded-tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Old Account')
    expect(tooltip).toHaveTextContent('CLP Account')
  })

  it('clicking chip again hides tooltip', async () => {
    render(<AccountBalancePanel netWorth={PARTIAL} accounts={accounts} />)
    const chip = screen.getByTestId('chip-excluded')
    await userEvent.click(chip)
    expect(screen.getByTestId('chip-excluded-tooltip')).toBeInTheDocument()
    await userEvent.click(chip)
    expect(screen.queryByTestId('chip-excluded-tooltip')).not.toBeInTheDocument()
  })
})

describe('AccountBalancePanel — state: partialSecondary (some missing)', () => {
  it('renders primary total', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_SOME} accounts={accounts} />)
    expect(screen.getByTestId('net-worth-primary')).toBeInTheDocument()
  })

  it('renders subline with visible secondary only', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_SOME} accounts={accounts} />)
    expect(screen.getByTestId('net-worth-secondary-USD')).toBeInTheDocument()
    expect(screen.queryByTestId('net-worth-secondary-CLP')).not.toBeInTheDocument()
  })

  it('renders individual chip for missing secondary', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_SOME} accounts={accounts} />)
    expect(screen.getByTestId('chip-rate-missing-CLP')).toBeInTheDocument()
    expect(screen.getByTestId('chip-rate-missing-CLP')).toHaveTextContent('CLP rate missing')
  })
})

describe('AccountBalancePanel — state: partialSecondary (all missing)', () => {
  it('renders no subline when all secondaries are missing', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_ALL} accounts={accounts} />)
    expect(screen.queryByTestId('net-worth-subline')).not.toBeInTheDocument()
  })

  it('renders global "no secondary rates" chip', () => {
    render(<AccountBalancePanel netWorth={PARTIAL_SECONDARY_ALL} accounts={accounts} />)
    expect(screen.getByTestId('chip-all-rates-missing')).toBeInTheDocument()
    expect(screen.getByTestId('chip-all-rates-missing')).toHaveTextContent('No secondary rates available')
  })
})

describe('AccountBalancePanel — state: unavailable', () => {
  it('renders unavailable banner (snapshot-like check)', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    const banner = screen.getByTestId('unavailable-banner')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent('Convert to primary currency')
    expect(banner).toHaveTextContent('Ver docs')
    // jsdom normalizes hex → rgb/rgba; verify spec color applied via color property
    expect(banner).toHaveStyle({ color: 'rgb(138, 180, 248)' })
  })

  it('renders fallback per-currency totals', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    expect(screen.getByTestId('net-worth-fallback')).toBeInTheDocument()
    expect(screen.getAllByTestId('net-worth-total')).toHaveLength(2)
  })

  it('renders nothing for header when fallback is empty', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE_NO_FALLBACK} accounts={[]} />)
    expect(screen.queryByTestId('net-worth-fallback')).not.toBeInTheDocument()
  })

  it('banner link points to firefly docs', () => {
    render(<AccountBalancePanel netWorth={UNAVAILABLE} accounts={[]} />)
    const link = screen.getByRole('link', { name: 'Ver docs' })
    expect(link).toHaveAttribute(
      'href',
      'https://docs.firefly-iii.org/explanation/financial-concepts/exchange-rates/'
    )
  })
})

// ─── Tests — account cards ────────────────────────────────────────────────────

describe('AccountBalancePanel — account cards', () => {
  it('orders accounts by balance descending within currency group', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={accounts} />)
    const accountNames = screen.getAllByTestId('account-name').map((el) => el.textContent)
    expect(accountNames[0]).toBe('Savings')    // 5000
    expect(accountNames[1]).toBe('Checking')   // 3456.78
    expect(accountNames[2]).toBe('Cash')       // 388.89
  })

  it('shows negative balance in red', () => {
    const withNegative: Account[] = [
      makeAccount({ id: '1', name: 'Overdraft', currentBalance: -200.0 }),
    ]
    render(<AccountBalancePanel netWorth={OK} accounts={withNegative} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ color: '#f28b82' })
  })

  it('shows positive balance in light color', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ color: '#e8eaed' })
  })

  it('groups accounts by currency then sorts by balance within each group', () => {
    const mixedAccounts: Account[] = [
      makeAccount({ id: '1', name: 'EUR Savings', currentBalance: 3000 }),
      makeAccount({ id: '2', name: 'USD Main', currentBalance: 4000, currencyCode: 'USD', currencySymbol: '$' }),
      makeAccount({ id: '3', name: 'EUR Checking', currentBalance: 5000 }),
      makeAccount({ id: '4', name: 'USD Savings', currentBalance: 1000, currencyCode: 'USD', currencySymbol: '$' }),
    ]
    render(<AccountBalancePanel netWorth={OK} accounts={mixedAccounts} />)
    const names = screen.getAllByTestId('account-name').map((el) => el.textContent)
    expect(names[0]).toBe('EUR Checking')
    expect(names[1]).toBe('EUR Savings')
    expect(names[2]).toBe('USD Main')
    expect(names[3]).toBe('USD Savings')
  })

  it('renders no card container when accounts is empty', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={[]} />)
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
  })
})

// ─── Tests — responsive ───────────────────────────────────────────────────────

describe('AccountBalancePanel — mobile responsive', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
  })

  it('renders skeleton with single column on mobile', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr' })
  })

  it('renders primary total font-size 26px on mobile', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '26px' })
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

describe('AccountBalancePanel — tablet responsive', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
  })

  it('renders skeleton with two column grid on tablet', () => {
    render(<AccountBalancePanel netWorth={LOADING} accounts={[]} />)
    const skeleton = screen.getByLabelText('Loading balances')
    const cardsContainer = skeleton.lastElementChild as HTMLElement
    expect(cardsContainer).toHaveStyle({ gridTemplateColumns: '1fr 1fr' })
  })

  it('renders primary total font-size 26px on tablet (compact)', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
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

describe('AccountBalancePanel — desktop responsive', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
  })

  it('renders primary total font-size 32px on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('net-worth-primary')).toHaveStyle({ fontSize: '32px' })
  })

  it('renders account balance font-size 16px on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    expect(screen.getByTestId('account-balance-1')).toHaveStyle({ fontSize: '16px' })
  })

  it('renders subline with · separator on desktop (two secondaries)', () => {
    render(<AccountBalancePanel netWorth={OK_TWO_SECONDARIES} accounts={accounts} />)
    expect(screen.getByTestId('net-worth-subline')).toHaveTextContent('·')
  })

  it('renders cards container with overflowX auto on desktop', () => {
    render(<AccountBalancePanel netWorth={OK} accounts={singleAccount} />)
    const card = screen.getByTestId('account-card')
    expect(card.parentElement).toHaveStyle({ overflowX: 'auto' })
  })
})
