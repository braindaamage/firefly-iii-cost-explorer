import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountBalancePanel } from '../AccountBalancePanel'
import type { AssetAccountBalance } from '../../../api/types'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

const accounts: AssetAccountBalance[] = [
  { id: '1', name: 'Checking', balance: 3456.78, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
  { id: '2', name: 'Savings', balance: 5000.0, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
  { id: '3', name: 'Cash', balance: 388.89, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
]

describe('AccountBalancePanel', () => {
  it('renders Net Worth label', () => {
    render(<AccountBalancePanel accounts={accounts} loading={false} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders all account names', () => {
    render(<AccountBalancePanel accounts={accounts} loading={false} />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('shows loading skeleton and no accounts when loading', () => {
    render(<AccountBalancePanel accounts={[]} loading={true} />)
    expect(screen.getByLabelText('Loading balances')).toBeInTheDocument()
    expect(screen.queryByText('Net Worth')).not.toBeInTheDocument()
  })

  it('renders nothing when accounts is empty and not loading', () => {
    const { container } = render(<AccountBalancePanel accounts={[]} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays the correct net worth total for single currency', () => {
    render(<AccountBalancePanel accounts={accounts} loading={false} />)
    // 3456.78 + 5000 + 388.89 = 8845.67
    expect(screen.getByTestId('net-worth-total')).toHaveTextContent('8,845.67')
  })

  it('orders accounts by balance descending', () => {
    render(<AccountBalancePanel accounts={accounts} loading={false} />)
    const accountNames = screen.getAllByTestId('account-name').map((el) => el.textContent)
    expect(accountNames[0]).toBe('Savings')    // 5000
    expect(accountNames[1]).toBe('Checking')   // 3456.78
    expect(accountNames[2]).toBe('Cash')       // 388.89
  })

  it('shows negative balance in red color', () => {
    const withNegative: AssetAccountBalance[] = [
      { id: '1', name: 'Overdraft', balance: -200.0, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
    ]
    render(<AccountBalancePanel accounts={withNegative} loading={false} />)
    const balanceEl = screen.getByTestId('account-balance-1')
    expect(balanceEl).toHaveStyle({ color: '#f28b82' })
  })

  it('shows multiple currency totals when accounts have different currencies', () => {
    const multiCurrency: AssetAccountBalance[] = [
      { id: '1', name: 'EUR Account', balance: 1000, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
      { id: '2', name: 'USD Account', balance: 500, currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2 },
    ]
    render(<AccountBalancePanel accounts={multiCurrency} loading={false} />)
    const totals = screen.getAllByTestId('currency-total')
    expect(totals).toHaveLength(2)
  })

  it('separates multi-currency totals with middle dot', () => {
    const multiCurrency: AssetAccountBalance[] = [
      { id: '1', name: 'EUR Account', balance: 1000, currencyCode: 'EUR', currencySymbol: '€', currencyDecimalPlaces: 2 },
      { id: '2', name: 'USD Account', balance: 500, currencyCode: 'USD', currencySymbol: '$', currencyDecimalPlaces: 2 },
    ]
    render(<AccountBalancePanel accounts={multiCurrency} loading={false} />)
    expect(screen.getByTestId('net-worth-totals')).toHaveTextContent('·')
  })
})
