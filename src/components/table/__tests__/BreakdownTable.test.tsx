import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakdownTable } from '../BreakdownTable'
import type { BreakdownRow } from '../../../types/breakdown'
import type { FilterState } from '../../../types/filters'
import { DEFAULT_FILTERS } from '../../../types/filters'

const mockRows: BreakdownRow[] = [
  { id: '1', name: 'Groceries', color: '#4285f4', actualCost: 500, budgeted: null, variance: null, percentChange: 10 },
  { id: '2', name: 'Transport', color: '#34a853', actualCost: 200, budgeted: null, variance: null, percentChange: -5 },
]

const mockRowsWithBudget: BreakdownRow[] = [
  { id: '1', name: 'Monthly Food', color: '#4285f4', actualCost: 300, budgeted: 400, variance: -100, percentChange: 5 },
  { id: '2', name: 'Entertainment', color: '#34a853', actualCost: 600, budgeted: 500, variance: 100, percentChange: 15 },
]

const mockTotals: BreakdownRow = {
  id: 'total', name: 'Total', color: '', actualCost: 700, budgeted: null, variance: null, percentChange: 3,
}

const defaultProps = {
  rows: mockRows,
  totals: mockTotals,
  currencyCode: 'EUR',
  isLoading: false,
  filters: DEFAULT_FILTERS,
  onRowClick: vi.fn(),
}

describe('BreakdownTable', () => {
  it('renders table title based on groupBy', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
  })

  it('renders correct title for budget groupBy', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, groupBy: 'budget' }
    render(<BreakdownTable {...defaultProps} filters={filters} />)
    expect(screen.getByText('Budget Breakdown')).toBeInTheDocument()
  })

  it('renders row names', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })

  it('renders actual cost values', () => {
    render(<BreakdownTable {...defaultProps} />)
    // formatCurrency with EUR should format 500
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('renders "-" for null budgeted', () => {
    render(<BreakdownTable {...defaultProps} />)
    // Multiple cells with "-" for both rows
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders variance in green when negative (under budget)', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, groupBy: 'budget' }
    render(
      <BreakdownTable
        {...defaultProps}
        rows={mockRowsWithBudget}
        totals={{ ...mockTotals, budgeted: 900, variance: 0 }}
        filters={filters}
      />
    )
    // -100 variance = under budget = green
    const underBudgetCell = screen.getByText('-€100.00')
    expect(underBudgetCell).toHaveStyle({ color: '#81c995' })
  })

  it('renders variance in red when positive (over budget)', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, groupBy: 'budget' }
    render(
      <BreakdownTable
        {...defaultProps}
        rows={mockRowsWithBudget}
        totals={{ ...mockTotals, budgeted: 900, variance: 0 }}
        filters={filters}
      />
    )
    // +100 variance = over budget = red
    const overBudgetCell = screen.getByText('+€100.00')
    expect(overBudgetCell).toHaveStyle({ color: '#f28b82' })
  })

  it('renders Export CSV button as disabled', () => {
    render(<BreakdownTable {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /export csv/i })
    expect(btn).toBeDisabled()
  })

  it('renders loading skeleton when isLoading is true', () => {
    render(<BreakdownTable {...defaultProps} isLoading={true} />)
    expect(screen.getByLabelText('Loading table')).toBeInTheDocument()
  })

  it('renders empty state when rows are empty', () => {
    render(
      <BreakdownTable
        {...defaultProps}
        rows={[]}
        totals={{ id: 'total', name: 'Total', color: '', actualCost: 0, budgeted: null, variance: null, percentChange: null }}
      />
    )
    expect(screen.getByText('No data available for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = vi.fn()
    render(<BreakdownTable {...defaultProps} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Groceries'))
    expect(onRowClick).toHaveBeenCalledWith(mockRows[0])
  })

  it('renders % change with up arrow for positive values', () => {
    render(<BreakdownTable {...defaultProps} />)
    // 10% positive change for Groceries (and totals 3% too)
    const increases = screen.getAllByLabelText('increase')
    expect(increases.length).toBeGreaterThan(0)
  })

  it('renders % change with down arrow for negative values', () => {
    render(<BreakdownTable {...defaultProps} />)
    // -5% for Transport
    expect(screen.getByLabelText('decrease')).toBeInTheDocument()
  })

  it('renders totals row', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('allows sorting by Actual Cost on header click', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const actualCostHeader = screen.getByRole('button', { name: /actual cost/i })
    await userEvent.click(actualCostHeader)
    // After click, should show sorted indicator
    expect(screen.getByLabelText(/sorted/)).toBeInTheDocument()
  })
})
