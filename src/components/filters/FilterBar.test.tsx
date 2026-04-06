import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilterBar } from './FilterBar'
import { DEFAULT_FILTERS } from '../../types/filters'

const mockUpdateFilter = vi.fn()
const mockAddOptionalFilter = vi.fn()
const mockRemoveOptionalFilter = vi.fn()

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
    isConfigured: true,
    saveConfig: vi.fn(),
    clearConfig: vi.fn(),
  }),
}))

vi.mock('../../api/accounts', () => ({
  fetchAssetAccounts: vi.fn().mockResolvedValue([
    { id: '1', name: 'Checking' },
    { id: '2', name: 'Savings' },
  ]),
}))

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue([
    { id: '1', name: 'Groceries' },
    { id: '2', name: 'Transport' },
  ]),
}))

vi.mock('../../api/budgets', () => ({
  fetchBudgets: vi.fn().mockResolvedValue([
    { id: '1', name: 'Monthly Food' },
  ]),
}))

vi.mock('../../api/tags', () => ({
  fetchTags: vi.fn().mockResolvedValue([
    { id: '1', name: 'vacation' },
  ]),
}))

const defaultProps = {
  filters: { ...DEFAULT_FILTERS },
  updateFilter: mockUpdateFilter,
  activeOptionalFilters: [] as ('budgetIds' | 'tagIds')[],
  addOptionalFilter: mockAddOptionalFilter,
  removeOptionalFilter: mockRemoveOptionalFilter,
  availableOptionalFilters: ['budgetIds', 'tagIds'] as ('budgetIds' | 'tagIds')[],
}

function renderFilterBar(props = defaultProps) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <FilterBar {...props} />
    </QueryClientProvider>
  )
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders all default chips (Time range, Group by, Accounts, Categories)', () => {
    renderFilterBar()
    expect(screen.getByText('Time range:')).toBeInTheDocument()
    expect(screen.getByText('Group by:')).toBeInTheDocument()
    expect(screen.getByText('Accounts:')).toBeInTheDocument()
    expect(screen.getByText('Categories:')).toBeInTheDocument()
  })

  it('shows correct default values on chips', () => {
    renderFilterBar()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('opens time range dropdown when Time range chip is clicked', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /time range/i }))
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
  })

  it('calls updateFilter when a time range preset is selected', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /time range/i }))
    await userEvent.click(screen.getByText('Last 7 days'))
    expect(mockUpdateFilter).toHaveBeenCalledWith('timeRange', 'last_7_days')
  })

  it('opens group by dropdown when Group by chip is clicked', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /group by/i }))
    expect(screen.getByText('Budget')).toBeInTheDocument()
    expect(screen.getByText('Tag')).toBeInTheDocument()
  })

  it('calls updateFilter when a group by option is selected', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /group by/i }))
    await userEvent.click(screen.getByText('Budget'))
    expect(mockUpdateFilter).toHaveBeenCalledWith('groupBy', 'budget')
  })

  it('opens accounts multi-select when Accounts chip is clicked', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeInTheDocument()
      expect(screen.getByText('Savings')).toBeInTheDocument()
    })
  })

  it('calls updateFilter with selected account ids', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Checking'))
    await userEvent.click(screen.getByLabelText('Checking'))
    expect(mockUpdateFilter).toHaveBeenCalledWith('accountIds', ['1'])
  })

  it('shows Add Filter button when optional filters are available', () => {
    renderFilterBar()
    expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument()
  })

  it('calls addOptionalFilter when selected from Add Filter dropdown', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
    await userEvent.click(screen.getByText('Budgets'))
    expect(mockAddOptionalFilter).toHaveBeenCalledWith('budgetIds')
  })

  it('shows budget chip when budgetIds is in activeOptionalFilters', () => {
    renderFilterBar({
      ...defaultProps,
      activeOptionalFilters: ['budgetIds'],
      availableOptionalFilters: ['tagIds'],
    })
    expect(screen.getByText('Budgets:')).toBeInTheDocument()
  })

  it('renders search input inside accounts dropdown', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    expect(screen.getByLabelText('Search items')).toBeInTheDocument()
  })

  it('filters accounts by search text', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    await userEvent.type(screen.getByLabelText('Search items'), 'Savings')
    expect(screen.queryByLabelText('Checking')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Savings')).toBeInTheDocument()
  })

  it('clearing search shows all items again', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    await userEvent.type(screen.getByLabelText('Search items'), 'Savings')
    await userEvent.clear(screen.getByLabelText('Search items'))
    expect(screen.getByLabelText('Checking')).toBeInTheDocument()
    expect(screen.getByLabelText('Savings')).toBeInTheDocument()
  })

  it('Select all with search active only selects filtered items', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    await userEvent.type(screen.getByLabelText('Search items'), 'Savings')
    await userEvent.click(screen.getByLabelText('Select all'))
    expect(mockUpdateFilter).toHaveBeenCalledWith('accountIds', ['2'])
  })

  it('search input is empty when dropdown is reopened after closing', async () => {
    renderFilterBar()
    // Open accounts dropdown
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    // Type search text
    await userEvent.type(screen.getByLabelText('Search items'), 'Savings')
    expect(screen.queryByLabelText('Checking')).not.toBeInTheDocument()
    // Close dropdown by clicking the chip again
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    // Reopen dropdown
    await userEvent.click(screen.getByRole('button', { name: /accounts/i }))
    await waitFor(() => screen.getByLabelText('Search items'))
    // Search should be reset and all items visible
    expect(screen.getByLabelText('Search items')).toHaveValue('')
    expect(screen.getByLabelText('Checking')).toBeInTheDocument()
    expect(screen.getByLabelText('Savings')).toBeInTheDocument()
  })

  it('shows clear button on Categories chip when categoryIds is non-empty', async () => {
    renderFilterBar({
      ...defaultProps,
      filters: { ...DEFAULT_FILTERS, categoryIds: ['1'] },
    })
    expect(screen.getByRole('button', { name: /clear categories/i })).toBeInTheDocument()
  })

  it('does not show clear button on Categories chip when categoryIds is empty', () => {
    renderFilterBar()
    expect(screen.queryByRole('button', { name: /clear categories/i })).not.toBeInTheDocument()
  })

  it('clicking clear on Categories chip calls updateFilter with empty array', async () => {
    renderFilterBar({
      ...defaultProps,
      filters: { ...DEFAULT_FILTERS, categoryIds: ['1'] },
    })
    await userEvent.click(screen.getByRole('button', { name: /clear categories/i }))
    expect(mockUpdateFilter).toHaveBeenCalledWith('categoryIds', [])
  })

  it('shows clear button on Accounts chip when accountIds is non-empty', () => {
    renderFilterBar({
      ...defaultProps,
      filters: { ...DEFAULT_FILTERS, accountIds: ['1'] },
    })
    expect(screen.getByRole('button', { name: /clear accounts/i })).toBeInTheDocument()
  })

  it('clicking clear on Accounts chip calls updateFilter with empty array', async () => {
    renderFilterBar({
      ...defaultProps,
      filters: { ...DEFAULT_FILTERS, accountIds: ['1'] },
    })
    await userEvent.click(screen.getByRole('button', { name: /clear accounts/i }))
    expect(mockUpdateFilter).toHaveBeenCalledWith('accountIds', [])
  })

  it('calls removeOptionalFilter when X is clicked on optional chip', async () => {
    renderFilterBar({
      ...defaultProps,
      activeOptionalFilters: ['budgetIds'],
      availableOptionalFilters: ['tagIds'],
    })
    await userEvent.click(screen.getByRole('button', { name: /remove budgets/i }))
    expect(mockRemoveOptionalFilter).toHaveBeenCalledWith('budgetIds')
  })
})
