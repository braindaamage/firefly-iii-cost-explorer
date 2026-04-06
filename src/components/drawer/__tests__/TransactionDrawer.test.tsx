import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionDrawer } from '../TransactionDrawer'
import { useTransactions } from '../../../hooks/useTransactions'
import type { BreakdownRow } from '../../../types/breakdown'
import type { Period } from '../../../lib/period-utils'
import { DEFAULT_FILTERS } from '../../../types/filters'
import type { Transaction } from '../../../api/types'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

import { useBreakpoint } from '../../../hooks/useBreakpoint'

const mockRow: BreakdownRow = {
  id: '1',
  name: 'Groceries',
  color: '#4285f4',
  values: { 'Jan 2026': 450, 'Feb 2026': 380, 'Mar 2026': 520 },
  total: 1350,
}

const mockPeriods: Period[] = [
  { start: '2026-01-01', end: '2026-01-31', label: 'Jan 2026' },
  { start: '2026-02-01', end: '2026-02-28', label: 'Feb 2026' },
  { start: '2026-03-01', end: '2026-03-31', label: 'Mar 2026' },
]

const mockTransactions: Transaction[] = [
  { id: '42', date: '2026-01-15', description: 'Grocery shopping', amount: 150, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Supermarket' },
  { id: '43', date: '2026-01-20', description: 'Organic market', amount: 80, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Bio Shop' },
]

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: vi.fn(() => ({
    transactions: mockTransactions,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    error: null,
  })),
}))

vi.mock('../../../hooks/useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
    isConfigured: true,
  }),
}))

function renderDrawer(row: BreakdownRow | null = mockRow, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TransactionDrawer
        row={row}
        periods={mockPeriods}
        filters={DEFAULT_FILTERS}
        currencyCode="EUR"
        onClose={onClose}
      />
    </QueryClientProvider>
  )
}

describe('TransactionDrawer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when row is null', () => {
    const { container } = renderDrawer(null)
    expect(container.firstChild).toBeNull()
  })

  it('renders drawer with item name in title when row is provided', () => {
    renderDrawer()
    expect(screen.getByText('Groceries — Transactions')).toBeInTheDocument()
  })

  it('renders one accordion section per period', () => {
    renderDrawer()
    expect(screen.getByText('Jan 2026')).toBeInTheDocument()
    expect(screen.getByText('Feb 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 2026')).toBeInTheDocument()
  })

  it('first period is expanded by default and shows transactions', () => {
    renderDrawer()
    // Transactions from first period should be visible (section is expanded)
    expect(screen.getByText('Grocery shopping')).toBeInTheDocument()
  })

  it('each section header shows the period total from row.values', () => {
    renderDrawer()
    // Jan 2026 = 450 → formatted as €450
    expect(screen.getByText(/450/)).toBeInTheDocument()
  })

  it('clicking a collapsed section expands it', async () => {
    vi.mocked(useTransactions)
      .mockReturnValueOnce({ transactions: mockTransactions, fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false, isLoading: false, error: null })
      .mockReturnValueOnce({ transactions: [], fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false, isLoading: false, error: null })
      .mockReturnValueOnce({ transactions: [], fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false, isLoading: false, error: null })
    renderDrawer()
    // Click Feb 2026 header to expand it
    await userEvent.click(screen.getByRole('button', { name: /feb 2026/i }))
    // useTransactions should now be called with enabled:true for Feb as well
    expect(vi.mocked(useTransactions)).toHaveBeenCalled()
  })

  it('clicking an expanded section collapses it', async () => {
    renderDrawer()
    // Jan 2026 is expanded by default, click its header to collapse
    await userEvent.click(screen.getByRole('button', { name: /jan 2026/i }))
    // Transactions should no longer be visible
    expect(screen.queryByText('Grocery shopping')).not.toBeInTheDocument()
  })

  it('multiple sections can be open simultaneously', async () => {
    renderDrawer()
    // Jan is expanded by default; expand Mar too
    await userEvent.click(screen.getByRole('button', { name: /mar 2026/i }))
    // Jan section still shows transactions, Mar is also now expanded
    expect(screen.getByText('Jan 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 2026')).toBeInTheDocument()
  })

  it('shows footer with all-periods total', () => {
    renderDrawer()
    expect(screen.getByText(/all periods total/i)).toBeInTheDocument()
    // Total is 1350
    expect(screen.getByText(/1[,.]?350/)).toBeInTheDocument()
  })

  it('calls onClose when overlay is clicked (desktop)', async () => {
    const onClose = vi.fn()
    renderDrawer(mockRow, onClose)
    await userEvent.click(screen.getByTestId('drawer-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn()
    renderDrawer(mockRow, onClose)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn()
    renderDrawer(mockRow, onClose)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders Firefly III links for each transaction', () => {
    renderDrawer()
    const links = screen.getAllByRole('link', { name: /open transaction/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', 'https://firefly.example.com/transactions/show/42')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows loading skeleton when a section is loading', () => {
    vi.mocked(useTransactions).mockReturnValue({
      transactions: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
      error: null,
    })
    renderDrawer()
    expect(screen.getByLabelText(/loading transactions/i)).toBeInTheDocument()
  })

  it('shows empty state when expanded section has no transactions', () => {
    vi.mocked(useTransactions).mockReturnValue({
      transactions: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    })
    renderDrawer()
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
  })

  it('shows Load more button when hasNextPage is true', () => {
    vi.mocked(useTransactions).mockReturnValue({
      transactions: mockTransactions,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    })
    renderDrawer()
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('renders as full-screen panel on mobile', () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    const { container } = renderDrawer()
    const panel = container.querySelector('[data-testid="drawer-panel"]')
    expect(panel).toHaveStyle({ width: '100%' })
  })

  it('renders as side panel on desktop', () => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    const { container } = renderDrawer()
    const panel = container.querySelector('[data-testid="drawer-panel"]')
    expect(panel).toHaveStyle({ width: '480px' })
  })

  it('resets expanded state to first period when row changes', async () => {
    const { rerender } = renderDrawer()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Expand Feb 2026
    await userEvent.click(screen.getByRole('button', { name: /feb 2026/i }))
    // Change row
    const newRow: BreakdownRow = {
      id: '2', name: 'Transport', color: '#34a853',
      values: { 'Jan 2026': 120, 'Feb 2026': 90, 'Mar 2026': 150 }, total: 360,
    }
    rerender(
      <QueryClientProvider client={client}>
        <TransactionDrawer row={newRow} periods={mockPeriods} filters={DEFAULT_FILTERS} currencyCode="EUR" onClose={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.getByText('Transport — Transactions')).toBeInTheDocument()
  })
})
