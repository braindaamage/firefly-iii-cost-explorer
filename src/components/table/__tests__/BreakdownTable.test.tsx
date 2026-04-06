import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakdownTable } from '../BreakdownTable'
import type { BreakdownRow } from '../../../types/breakdown'
import type { FilterState } from '../../../types/filters'
import { DEFAULT_FILTERS } from '../../../types/filters'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

import { useBreakpoint } from '../../../hooks/useBreakpoint'

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
  onExportCSV: vi.fn(),
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
    const underBudgetCell = screen.getByText((text) => text.startsWith('-') && text.includes('100'))
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
    const overBudgetCell = screen.getByText((text) => text.startsWith('+') && text.includes('100'))
    expect(overBudgetCell).toHaveStyle({ color: '#f28b82' })
  })

  it('renders Export CSV button as enabled and calls onExportCSV on click', async () => {
    const onExportCSV = vi.fn()
    render(<BreakdownTable {...defaultProps} onExportCSV={onExportCSV} />)
    const btn = screen.getByRole('button', { name: /export csv/i })
    expect(btn).not.toBeDisabled()
    await userEvent.click(btn)
    expect(onExportCSV).toHaveBeenCalledOnce()
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

describe('BreakdownTable — responsive', () => {
  it('shows % Change column on desktop', () => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /% change/i })).toBeInTheDocument()
  })

  it('hides % Change column on tablet', () => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.queryByRole('columnheader', { name: /% change/i })).not.toBeInTheDocument()
  })

  it('hides % Change column on mobile', () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.queryByRole('columnheader', { name: /% change/i })).not.toBeInTheDocument()
  })

  it('shows expand chevron on mobile', () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getAllByRole('button', { name: /expand/i }).length).toBeGreaterThan(0)
  })

  it('expands row details on chevron click in mobile', async () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    render(
      <BreakdownTable
        {...defaultProps}
        rows={[{ id: '1', name: 'Groceries', color: '#4285f4', actualCost: 500, budgeted: 400, variance: -100, percentChange: 10 }]}
      />
    )
    const expandBtn = screen.getByRole('button', { name: /expand/i })
    await userEvent.click(expandBtn)
    // Expanded row shows extra columns
    expect(screen.getByText('Budgeted')).toBeInTheDocument()
    expect(screen.getByText('Variance')).toBeInTheDocument()
    expect(screen.getByText('% Change')).toBeInTheDocument()
  })

  it('collapses row on second chevron click', async () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    render(
      <BreakdownTable
        {...defaultProps}
        rows={[{ id: '1', name: 'Groceries', color: '#4285f4', actualCost: 500, budgeted: 400, variance: -100, percentChange: 10 }]}
      />
    )
    const expandBtn = screen.getByRole('button', { name: /expand/i })
    await userEvent.click(expandBtn)
    expect(screen.getByText('Budgeted')).toBeInTheDocument()
    await userEvent.click(expandBtn)
    expect(screen.queryByText('Budgeted')).not.toBeInTheDocument()
  })
})
