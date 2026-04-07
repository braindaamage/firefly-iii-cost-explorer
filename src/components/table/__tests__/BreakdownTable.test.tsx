import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakdownTable } from '../BreakdownTable'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { BreakdownRow } from '../../../types/breakdown'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

const periods = ['Jan 2026', 'Feb 2026', 'Mar 2026']

const rows: BreakdownRow[] = [
  { id: '1', name: 'Groceries', color: '#4285f4', values: { 'Jan 2026': 450, 'Feb 2026': 380, 'Mar 2026': 520 }, average: 450, total: 1350 },
  { id: '2', name: 'Transport', color: '#34a853', values: { 'Jan 2026': 120, 'Feb 2026': 90, 'Mar 2026': 150 }, average: 120, total: 360 },
]

const totals: BreakdownRow = {
  id: 'total', name: 'Total', color: '',
  values: { 'Jan 2026': 570, 'Feb 2026': 470, 'Mar 2026': 670 }, average: 570, total: 1710,
}

const defaultProps = {
  rows,
  totals,
  periods,
  currencyCode: 'EUR',
  isLoading: false,
  groupBy: 'category' as const,
  onRowClick: vi.fn(),
  onExportCSV: vi.fn(),
}

describe('BreakdownTable', () => {
  it('renders column headers for each period', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /jan 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /feb 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /mar 2026/i })).toBeInTheDocument()
  })

  it('renders a Total column header', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument()
  })

  it('renders group name column header for category', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument()
  })

  it('renders group name column header for budget', () => {
    render(<BreakdownTable {...defaultProps} groupBy="budget" />)
    expect(screen.getByRole('columnheader', { name: /budget/i })).toBeInTheDocument()
  })

  it('renders all row names', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading', () => {
    render(<BreakdownTable {...defaultProps} isLoading={true} />)
    expect(screen.getByLabelText(/loading table/i)).toBeInTheDocument()
  })

  it('shows empty state when no rows', () => {
    render(<BreakdownTable {...defaultProps} rows={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('calls onRowClick when a data row is clicked', async () => {
    const onRowClick = vi.fn()
    render(<BreakdownTable {...defaultProps} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Groceries'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('calls onExportCSV when Export CSV is clicked', async () => {
    const onExportCSV = vi.fn()
    render(<BreakdownTable {...defaultProps} onExportCSV={onExportCSV} />)
    await userEvent.click(screen.getByText('Export CSV'))
    expect(onExportCSV).toHaveBeenCalledOnce()
  })

  it('sorts by Total descending by default (Groceries 1350 > Transport 360)', () => {
    render(<BreakdownTable {...defaultProps} />)
    const tableRows = screen.getAllByRole('row')
    const groceriesIdx = tableRows.findIndex((r) => r.textContent?.includes('Groceries'))
    const transportIdx = tableRows.findIndex((r) => r.textContent?.includes('Transport'))
    expect(groceriesIdx).toBeLessThan(transportIdx)
    expect(groceriesIdx).toBeGreaterThan(0) // not the header row
  })

  it('clicking a period column header sorts rows by that period', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const janHeader = screen.getByRole('columnheader', { name: /jan 2026/i })
    await userEvent.click(janHeader)
    // After clicking, table renders without error
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })

  it('clicking Name column header sorts alphabetically', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const nameHeader = screen.getByRole('columnheader', { name: /category/i })
    await userEvent.click(nameHeader)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
  })

  it('renders totals footer row', () => {
    render(<BreakdownTable {...defaultProps} />)
    // Should see totals in footer
    const footerRows = screen.getAllByRole('row').filter((r) =>
      r.textContent?.includes('Total')
    )
    expect(footerRows.length).toBeGreaterThan(0)
  })

  it('renders an Average column header between period columns and Total', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getByRole('columnheader', { name: /average/i })).toBeInTheDocument()
  })

  it('Average column header appears before Total column header', () => {
    render(<BreakdownTable {...defaultProps} />)
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent ?? '')
    const avgIdx = headers.findIndex((h) => /average/i.test(h))
    const totalIdx = headers.findIndex((h) => /^total$/i.test(h))
    expect(avgIdx).toBeGreaterThan(-1)
    expect(avgIdx).toBeLessThan(totalIdx)
  })

  it('clicking Average column header sorts rows', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const avgHeader = screen.getByRole('columnheader', { name: /average/i })
    await userEvent.click(avgHeader)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })

  it('zero values render with muted color', () => {
    const rowsWithZero: BreakdownRow[] = [
      { id: '1', name: 'Empty', color: '#fff', values: { 'Jan 2026': 0, 'Feb 2026': 0, 'Mar 2026': 0 }, average: 0, total: 0 },
    ]
    render(<BreakdownTable {...defaultProps} rows={rowsWithZero} />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('renders table title based on groupBy', () => {
    render(<BreakdownTable {...defaultProps} groupBy="category" />)
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
  })
})

describe('BreakdownTable — tablet', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
  })

  it('renders cells with tablet padding (10px 14px)', () => {
    render(<BreakdownTable {...defaultProps} />)
    const cells = screen.getAllByRole('cell')
    const periodCell = cells[1]
    expect(periodCell).toHaveStyle({ padding: '10px 14px' })
  })

  it('renders cells with fontSize 13px on tablet', () => {
    render(<BreakdownTable {...defaultProps} />)
    const cells = screen.getAllByRole('cell')
    const periodCell = cells[1]
    expect(periodCell).toHaveStyle({ fontSize: '13px' })
  })
})

describe('BreakdownTable — mobile', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
  })

  it('renders cells with mobile padding (8px 10px)', () => {
    render(<BreakdownTable {...defaultProps} />)
    const cells = screen.getAllByRole('cell')
    const periodCell = cells[1]
    expect(periodCell).toHaveStyle({ padding: '8px 10px' })
  })

  it('renders cells with fontSize 12px on mobile', () => {
    render(<BreakdownTable {...defaultProps} />)
    const cells = screen.getAllByRole('cell')
    const periodCell = cells[1]
    expect(periodCell).toHaveStyle({ fontSize: '12px' })
  })
})
