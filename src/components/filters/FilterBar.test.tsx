import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilterBar } from './FilterBar'

// Mock hooks and API calls
const mockUpdateFilter = vi.fn()
const mockAddOptionalFilter = vi.fn()
const mockRemoveOptionalFilter = vi.fn()

const mockUseFilters = vi.fn()
const mockUseConfig = vi.fn()

vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => mockUseFilters(),
}))

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => mockUseConfig(),
}))

vi.mock('../../api/accounts', () => ({
  fetchAssetAccounts: vi.fn().mockResolvedValue([
    { id: '1', name: 'Checking', name_with_balance: 'Checking', type: 'asset', currency_id: '1', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2 },
    { id: '2', name: 'Savings', name_with_balance: 'Savings', type: 'asset', currency_id: '1', currency_code: 'EUR', currency_symbol: '€', currency_decimal_places: 2 },
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
    { id: '1', name: 'vacation', tag: 'vacation' },
  ]),
}))

import { DEFAULT_FILTERS } from '../../types/filters'

const defaultFiltersState = {
  filters: { ...DEFAULT_FILTERS },
  updateFilter: mockUpdateFilter,
  resetFilters: vi.fn(),
  activeOptionalFilters: [] as ('budgetIds' | 'tagIds')[],
  addOptionalFilter: mockAddOptionalFilter,
  removeOptionalFilter: mockRemoveOptionalFilter,
  availableOptionalFilters: ['budgetIds', 'tagIds'] as ('budgetIds' | 'tagIds')[],
}

function renderFilterBar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <FilterBar />
    </QueryClientProvider>
  )
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockUseConfig.mockReturnValue({
      config: { baseUrl: 'https://firefly.example.com', apiToken: 'token' },
      isConfigured: true,
      saveConfig: vi.fn(),
      clearConfig: vi.fn(),
    })

    mockUseFilters.mockReturnValue({ ...defaultFiltersState })
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

  it('adds an optional filter when selected from Add Filter dropdown', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
    await userEvent.click(screen.getByText('Budgets'))
    expect(mockAddOptionalFilter).toHaveBeenCalledWith('budgetIds')
  })

  it('shows budget chip when budgetIds is in activeOptionalFilters', () => {
    mockUseFilters.mockReturnValue({
      ...defaultFiltersState,
      activeOptionalFilters: ['budgetIds'],
      availableOptionalFilters: ['tagIds'],
    })
    renderFilterBar()
    expect(screen.getByText('Budgets:')).toBeInTheDocument()
  })

  it('removes optional filter chip when X is clicked', async () => {
    mockUseFilters.mockReturnValue({
      ...defaultFiltersState,
      activeOptionalFilters: ['budgetIds'],
      availableOptionalFilters: ['tagIds'],
    })
    renderFilterBar()
    await userEvent.click(screen.getByRole('button', { name: /remove budgets/i }))
    expect(mockRemoveOptionalFilter).toHaveBeenCalledWith('budgetIds')
  })
})
