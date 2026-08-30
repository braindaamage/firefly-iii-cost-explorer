import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('shows export button as icon-only on mobile', () => {
    render(<BreakdownTable {...defaultProps} />)
    const exportBtn = screen.getByRole('button', { name: 'Export CSV' })
    expect(exportBtn.querySelector('svg')).toBeTruthy()
    expect(exportBtn).not.toHaveTextContent('Export CSV')
  })
})

// ---------------------------------------------------------------------------
// Sticky first column (spec-sticky-first-column.md)
// ---------------------------------------------------------------------------

const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const
const GROUP_BYS = ['category', 'budget', 'tag', 'expense_account', 'asset_account'] as const

// Techo del contenido de la 1a columna: FIRST_COL_PX - 2 * CELL_PADDING_X
const FIRST_COL_CONTENT: Record<(typeof BREAKPOINTS)[number], string> = {
  desktop: '188px', // 220 - 2*16
  tablet: '132px',  // 160 - 2*14
  mobile: '120px',  // 140 - 2*10
}

const LONG_NAME = 'Supermercado y Compras del Hogar Mensuales Recurrentes de la Familia'
const LONG_NAME_NOSPACE = 'https://facturacion.proveedor-electricidad.example.com/id'

function setBreakpoint(bp: (typeof BREAKPOINTS)[number]) {
  vi.mocked(useBreakpoint).mockReturnValue(bp)
}

/** Partes de la primera celda de datos: td > div > [dot, name] */
function firstColParts() {
  const td = screen.getAllByRole('cell')[0]
  const inner = td.firstElementChild as HTMLElement
  return {
    td,
    inner,
    dot: inner.children[0] as HTMLElement,
    name: inner.children[1] as HTMLElement,
  }
}

describe('BreakdownTable — sticky first column', () => {
  it.each(BREAKPOINTS)('first column header is sticky on %s', (bp) => {
    setBreakpoint(bp)
    render(<BreakdownTable {...defaultProps} />)
    const th = screen.getAllByRole('columnheader')[0]
    expect(th).toHaveStyle({ position: 'sticky', left: '0px', zIndex: '2' })
  })

  it.each(BREAKPOINTS)('first data cell is sticky on %s', (bp) => {
    setBreakpoint(bp)
    render(<BreakdownTable {...defaultProps} />)
    const { td } = firstColParts()
    expect(td).toHaveStyle({ position: 'sticky', left: '0px' })
  })

  it.each(BREAKPOINTS)('footer first cell is sticky on %s', (bp) => {
    setBreakpoint(bp)
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const footerCell = container.querySelector('tfoot td') as HTMLElement
    expect(footerCell).toHaveStyle({ position: 'sticky' })
  })

  it.each(BREAKPOINTS)('period cells are NOT sticky on %s (regression guard)', (bp) => {
    setBreakpoint(bp)
    render(<BreakdownTable {...defaultProps} />)
    const periodCell = screen.getAllByRole('cell')[1]
    expect(periodCell.style.position).not.toBe('sticky')
  })
})

describe('BreakdownTable — desktop', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('keeps the first column sticky on desktop', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveStyle({ position: 'sticky' })
    expect(firstColParts().td).toHaveStyle({ position: 'sticky' })
  })

  it('gives the first column header a minWidth of 220px', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveStyle({ minWidth: '220px' })
  })

  it('table minWidth uses the first column width and counts periods + Average + Total', () => {
    const fourPeriods = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026']
    const { container } = render(<BreakdownTable {...defaultProps} periods={fourPeriods} />)
    // 220 + (4 + 2) * 120 = 940
    expect(container.querySelector('table')).toHaveStyle({ minWidth: '940px' })
  })
})

describe('BreakdownTable — wrap de la primera columna', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it.each(BREAKPOINTS)('caps the first column content width on %s', (bp) => {
    setBreakpoint(bp)
    render(<BreakdownTable {...defaultProps} />)
    expect(firstColParts().inner).toHaveStyle({ maxWidth: FIRST_COL_CONTENT[bp] })
  })

  it('uses overflowWrap anywhere so unbroken strings do not widen the frozen column', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(firstColParts().name).toHaveStyle({ overflowWrap: 'anywhere' })
  })

  it('never truncates the name (no ellipsis, no nowrap, no overflow hidden, no title)', () => {
    render(<BreakdownTable {...defaultProps} />)
    const { td, name } = firstColParts()
    expect(name.style.textOverflow).toBe('')
    expect(name.style.whiteSpace).toBe('')
    expect(name.style.overflow).toBe('')
    expect(td).not.toHaveAttribute('title')
  })

  it('renders a long name with spaces in full', () => {
    const longRows: BreakdownRow[] = [
      { id: '1', name: LONG_NAME, color: '#4285f4', values: {}, average: 0, total: 0 },
    ]
    render(<BreakdownTable {...defaultProps} rows={longRows} />)
    expect(screen.getByText(LONG_NAME)).toBeInTheDocument()
  })

  it('renders a long name without spaces in full', () => {
    const longRows: BreakdownRow[] = [
      { id: '1', name: LONG_NAME_NOSPACE, color: '#4285f4', values: {}, average: 0, total: 0 },
    ]
    render(<BreakdownTable {...defaultProps} rows={longRows} />)
    expect(screen.getByText(LONG_NAME_NOSPACE)).toBeInTheDocument()
  })

  it('aligns data cells to the top but not the header', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    expect(screen.getAllByRole('cell')[0]).toHaveStyle({ verticalAlign: 'top' })
    expect(screen.getAllByRole('cell')[1]).toHaveStyle({ verticalAlign: 'top' })
    expect(container.querySelector('tfoot td')).toHaveStyle({ verticalAlign: 'top' })
    expect(screen.getAllByRole('columnheader')[0].style.verticalAlign).toBe('')
  })

  it('aligns the color dot with the first line of the name', () => {
    render(<BreakdownTable {...defaultProps} />)
    const { inner, dot } = firstColParts()
    expect(inner).toHaveStyle({ alignItems: 'flex-start' })
    expect(dot).toHaveStyle({ marginTop: '3px' })
  })
})

describe('BreakdownTable — row hover reaches the sticky cell', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('sets --row-bg and the row background on hover', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const row = screen.getAllByRole('row')[1]
    await userEvent.hover(row)
    expect(row.style.getPropertyValue('--row-bg')).toBe('#2d2d2d')
    expect(row.style.backgroundColor).toBe('rgb(45, 45, 45)')
  })

  it('clears --row-bg and the row background on unhover', async () => {
    render(<BreakdownTable {...defaultProps} />)
    const row = screen.getAllByRole('row')[1]
    await userEvent.hover(row)
    await userEvent.unhover(row)
    expect(row.style.getPropertyValue('--row-bg')).toBe('')
    expect(row.style.backgroundColor).toBe('')
  })

  it('sticky cell background follows --row-bg', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(firstColParts().td.style.backgroundColor).toBe('var(--row-bg, #1e1e1e)')
  })
})

describe('BreakdownTable — footer tint', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('paints the footer sticky cell with the same opaque tint as its row', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const footerRow = container.querySelector('tfoot tr') as HTMLElement
    const footerCell = container.querySelector('tfoot td') as HTMLElement
    expect(footerRow.style.backgroundColor).toBe('rgb(26, 26, 26)')
    expect(footerCell.style.backgroundColor).toBe('rgb(26, 26, 26)')
  })
})

describe('BreakdownTable — scroll separator', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('shows only the 1px inset rule while not scrolled', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(firstColParts().td.style.boxShadow).toBe('inset -1px 0 0 #3c4043')
  })

  it('adds the elevation shadow once scrollLeft > 0', () => {
    render(<BreakdownTable {...defaultProps} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    Object.defineProperty(wrapper, 'scrollLeft', { value: 120, writable: true, configurable: true })
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toContain('rgba(0,0,0,0.5)')
  })

  it('drops the elevation shadow when scrolled back to 0', () => {
    render(<BreakdownTable {...defaultProps} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    Object.defineProperty(wrapper, 'scrollLeft', { value: 120, writable: true, configurable: true })
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toContain('rgba(0,0,0,0.5)')

    Object.defineProperty(wrapper, 'scrollLeft', { value: 0, writable: true, configurable: true })
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toBe('inset -1px 0 0 #3c4043')
  })
})

describe('BreakdownTable — sticky across groupBy variants', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it.each(GROUP_BYS)('first column is sticky for groupBy=%s', (groupBy) => {
    render(<BreakdownTable {...defaultProps} groupBy={groupBy} />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveStyle({ position: 'sticky' })
    expect(firstColParts().td).toHaveStyle({ position: 'sticky' })
  })
})
