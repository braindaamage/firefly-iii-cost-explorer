import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionDrawer } from '../TransactionDrawer'
import { useTransactions } from '../../../hooks/useTransactions'
import type { BreakdownRow } from '../../../types/breakdown'
import { DEFAULT_FILTERS } from '../../../types/filters'
import type { Transaction } from '../../../api/types'

const mockRow: BreakdownRow = {
  id: '1', name: 'Groceries', color: '#4285f4',
  actualCost: 500, budgeted: null, variance: null, percentChange: 10,
}

const mockTransactions: Transaction[] = [
  { id: '1-10', date: '2026-01-15', description: 'Grocery shopping', amount: 150, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Supermarket' },
  { id: '1-11', date: '2026-01-20', description: 'Organic market', amount: 80, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Bio Shop' },
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

vi.mock('../../../lib/csv-export', () => ({
  exportTransactionsCSV: vi.fn(),
}))

function renderDrawer(row: BreakdownRow | null = mockRow, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TransactionDrawer row={row} filters={DEFAULT_FILTERS} onClose={onClose} />
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

  it('renders date range subtitle', () => {
    renderDrawer()
    // DEFAULT_FILTERS uses last_30_days — subtitle is a <p> with date range
    const subtitle = screen.getByText(/\w{3} \d{2}, \d{4} – \w{3} \d{2}, \d{4}/)
    expect(subtitle).toBeInTheDocument()
  })

  it('renders transaction descriptions', () => {
    renderDrawer()
    expect(screen.getByText('Grocery shopping')).toBeInTheDocument()
    expect(screen.getByText('Organic market')).toBeInTheDocument()
  })

  it('renders transaction amounts', () => {
    renderDrawer()
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })

  it('renders source → destination account info', () => {
    renderDrawer()
    expect(screen.getByText(/Checking.*Supermarket/)).toBeInTheDocument()
  })

  it('calls onClose when overlay is clicked', async () => {
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

  it('shows "All transactions loaded" when hasNextPage is false', () => {
    renderDrawer()
    expect(screen.getByText('All transactions loaded')).toBeInTheDocument()
  })

  it('shows Load more button when hasNextPage is true', () => {
    vi.mocked(useTransactions).mockReturnValueOnce({
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

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useTransactions).mockReturnValueOnce({
      transactions: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
      error: null,
    })
    renderDrawer()
    expect(screen.getByLabelText('Loading transactions')).toBeInTheDocument()
  })

  it('shows empty state when no transactions', () => {
    vi.mocked(useTransactions).mockReturnValueOnce({
      transactions: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    })
    renderDrawer()
    expect(screen.getByText('No transactions found for this item.')).toBeInTheDocument()
  })

  it('calls exportTransactionsCSV when Export CSV is clicked', async () => {
    const { exportTransactionsCSV } = await import('../../../lib/csv-export')
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(exportTransactionsCSV).toHaveBeenCalledWith(mockTransactions, 'Groceries')
  })
})
