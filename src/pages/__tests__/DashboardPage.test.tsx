import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../DashboardPage'

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
    isConfigured: true,
    saveConfig: vi.fn(),
    clearConfig: vi.fn(),
  }),
}))

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

vi.mock('../../api/accounts', () => ({
  fetchAssetAccounts: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/budgets', () => ({
  fetchBudgets: vi.fn().mockResolvedValue([]),
  fetchBudgetLimits: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/tags', () => ({
  fetchTags: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/insights', () => ({
  fetchInsightExpenseByCategory: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByBudget: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByTag: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByExpenseAccount: vi.fn().mockResolvedValue([]),
  fetchInsightExpenseByAssetAccount: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../api/transactions', () => ({
  fetchTransactionsByGroup: vi.fn().mockResolvedValue({
    transactions: [],
    pagination: { total: 0, count: 0, perPage: 50, currentPage: 1, totalPages: 1 },
  }),
}))

vi.mock('../../lib/csv-export', () => ({
  exportBreakdownCSV: vi.fn(),
  exportTransactionsCSV: vi.fn(),
}))

vi.mock('../../lib/chart-export', () => ({
  exportChartAsPNG: vi.fn(),
}))

function renderPage(initialEntries = ['/']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Cost Explorer')).toBeInTheDocument()
  })

  it('renders the filter bar', () => {
    renderPage()
    expect(screen.getByText('Filters:')).toBeInTheDocument()
  })

  it('renders the Spending Trend chart card', () => {
    renderPage()
    expect(screen.getByText('Spending Trend')).toBeInTheDocument()
  })

  it('renders the breakdown table card', () => {
    renderPage()
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
  })

  it('renders the Export CSV button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('renders the chart menu button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /chart menu/i })).toBeInTheDocument()
  })

  it('shows error banner when insight query fails', async () => {
    const { fetchInsightExpenseByCategory } = await import('../../api/insights')
    vi.mocked(fetchInsightExpenseByCategory).mockRejectedValueOnce(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Network error/i)).toBeInTheDocument()
  })
})
