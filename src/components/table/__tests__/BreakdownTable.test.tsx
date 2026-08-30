import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakdownTable } from '../BreakdownTable'
import { useBreakpoint } from '../../../hooks/useBreakpoint'
import type { BreakdownRow } from '../../../types/breakdown'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

// El mock se setea con mockReturnValue en varios describes y vitest.config.ts no declara
// restoreMocks/clearMocks: sin este reset el breakpoint se filtraría entre bloques según el
// orden de ejecución. Corre antes que los beforeEach de cada describe, que lo sobrescriben.
beforeEach(() => {
  vi.mocked(useBreakpoint).mockReturnValue('desktop')
})

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
// 62 alfanuméricos continuos: sin `/`, `.` ni `-`, que son oportunidades de corte estándar.
// Una URL partiría incluso sin `overflow-wrap: anywhere`, así que no sirve como peor caso.
const LONG_NAME_NOSPACE = 'Cuenta7fGh2Kp9Lm4Qr8Tv3Xz6Bd1Nj5Ws0Yc2Ae4Gi7Ko9Mu3Pq6Sx8Uz1Rt5'

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
    // zIndex 4 (Z_STICKY_CORNER): la esquina dejó de compartir estilo con stickyFirstCol al
    // implementarse el header fijado — ver spec-sticky-header-row.md §5.3.
    expect(th).toHaveStyle({ position: 'sticky', left: '0px', zIndex: '4' })
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

  // Sin esta transición en el <tr>, la fila cambia de golpe mientras la celda congelada hereda
  // la de cellStyle y hace fade de 150ms: medido en navegador, ~110ms de desfase en ambos sentidos.
  it('row transition matches the sticky cell so both fade together', () => {
    render(<BreakdownTable {...defaultProps} />)
    const row = screen.getAllByRole('row')[1]
    expect(row).toHaveStyle({ transition: 'background-color 150ms ease' })
    expect(firstColParts().td).toHaveStyle({ transition: 'background-color 150ms ease' })
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

// ---------------------------------------------------------------------------
// Tests añadidos tras el code review (spec §10.1.1)
// ---------------------------------------------------------------------------

/** Fuerza scrollLeft en jsdom, que no hace layout y nunca lo actualiza solo. */
function setScrollLeft(el: HTMLElement, value: number) {
  Object.defineProperty(el, 'scrollLeft', { value, writable: true, configurable: true })
}

const ELEVATION = 'rgba(0,0,0,0.5)'

describe('BreakdownTable — isScrolled no sobrevive al remontaje (H1)', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('limpia la elevación cuando la tabla se remonta tras isLoading', () => {
    const { rerender } = render(<BreakdownTable {...defaultProps} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    setScrollLeft(wrapper, 200)
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toContain(ELEVATION)

    rerender(<BreakdownTable {...defaultProps} isLoading={true} />)
    expect(screen.queryByTestId('breakdown-scroll')).toBeNull()

    rerender(<BreakdownTable {...defaultProps} isLoading={false} />)
    expect(firstColParts().td.style.boxShadow).not.toContain(ELEVATION)
  })

  it('limpia la elevación cuando la tabla se remonta tras quedarse sin filas', () => {
    const { rerender } = render(<BreakdownTable {...defaultProps} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    setScrollLeft(wrapper, 200)
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toContain(ELEVATION)

    rerender(<BreakdownTable {...defaultProps} rows={[]} />)
    expect(screen.queryByTestId('breakdown-scroll')).toBeNull()
    // El estado vacío y el contenedor de scroll son ambos <div> host en la misma posición del
    // árbol, así que React reutiliza el nodo DOM en vez de remontarlo. En un navegador real ese
    // nodo deja de desbordar y scrollLeft se clampea a 0; jsdom no hace layout, así que lo
    // simulamos. Sin el efecto de H1 la sombra seguiría pintada y este test fallaría igual.
    setScrollLeft(wrapper, 0)

    rerender(<BreakdownTable {...defaultProps} rows={rows} />)
    expect(firstColParts().td.style.boxShadow).not.toContain(ELEVATION)
  })

  it('limpia la elevación al reducir periods sin pasar por isLoading (caché caliente)', () => {
    const sixPeriods = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026']
    const { rerender } = render(<BreakdownTable {...defaultProps} periods={sixPeriods} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    setScrollLeft(wrapper, 200)
    fireEvent.scroll(wrapper)
    expect(firstColParts().td.style.boxShadow).toContain(ELEVATION)

    // El navegador clampea scrollLeft a 0 al dejar de haber desbordamiento; jsdom no hace
    // layout, así que lo simulamos. No se dispara ningún evento scroll a propósito: el efecto
    // debe leer el nodo real, no depender de que llegue el evento.
    setScrollLeft(wrapper, 0)
    rerender(<BreakdownTable {...defaultProps} periods={periods} />)
    expect(screen.getByTestId('breakdown-scroll')).toBe(wrapper) // mismo nodo, no hubo remontaje
    expect(firstColParts().td.style.boxShadow).not.toContain(ELEVATION)
  })
})

describe('BreakdownTable — criterio 10: sin minWidth con pocos periodos', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  // El caso `> 3` ya lo cubre el test de minWidth del bloque desktop, con los mismos 4 periodos.
  it('no fija minWidth en la tabla cuando hay 3 periodos o menos', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    expect(container.querySelector('table')!.style.minWidth).toBe('')
  })
})

describe('BreakdownTable — desktop cell padding (H2)', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('renders cells with desktop padding (12px 16px)', () => {
    render(<BreakdownTable {...defaultProps} />)
    expect(screen.getAllByRole('cell')[1]).toHaveStyle({ padding: '12px 16px' })
  })
})

// ---------------------------------------------------------------------------
// Header fijado (sticky vertical) — spec-sticky-header-row.md §10.3 y §10.4
// ---------------------------------------------------------------------------

const HEADER_EDGE = 'inset 0 -1px 0 #3c4043'
const COL_EDGE = 'inset -1px 0 0 #3c4043'

/** El <thead>, la esquina y las primeras celdas de tbody/tfoot en un solo sitio. */
function stickyParts(container: HTMLElement) {
  return {
    thead: container.querySelector('thead') as HTMLElement,
    corner: screen.getAllByRole('columnheader')[0],
    periodTh: screen.getAllByRole('columnheader')[1],
    bodyCell: screen.getAllByRole('cell')[0],
    footCell: container.querySelector('tfoot td') as HTMLElement,
  }
}

describe('BreakdownTable — sticky header row', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  it('posiciona el thead para que gane a la columna congelada del tbody', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    expect(stickyParts(container).thead).toHaveStyle({ position: 'relative', zIndex: '3' })
  })

  it('sube la esquina a 4 sin arrastrar a las celdas de tbody y tfoot', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { corner, bodyCell, footCell } = stickyParts(container)
    expect(corner).toHaveStyle({ zIndex: '4' })
    expect(bodyCell).toHaveStyle({ zIndex: '2' })
    expect(footCell).toHaveStyle({ zIndex: '2' })
  })

  it('pinta la esquina con un color literal, no con var(--row-bg)', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { corner, bodyCell } = stickyParts(container)
    expect(corner.style.backgroundColor).toBe('rgb(30, 30, 30)')
    expect(corner.style.backgroundColor).not.toContain('var(')
    // el tbody sí conserva la custom property: es lo que ilumina la fila en hover
    expect(bodyCell.style.backgroundColor).toContain('var(--row-bg')
  })

  it('dibuja el borde inferior del header con boxShadow y no con borderBottom', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { periodTh } = stickyParts(container)
    expect(periodTh.style.borderBottom).toBe('')
    expect(periodTh.style.boxShadow).toContain(HEADER_EDGE)
  })

  it('compone en la esquina las dos insets: la del header y la de la columna', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { corner } = stickyParts(container)
    expect(corner.style.boxShadow).toContain(HEADER_EDGE)
    expect(corner.style.boxShadow).toContain(COL_EDGE)
  })

  // Simétrico del anterior. Sin este assert, dejar la elevación permanente en stickyCorner no
  // rompe ningún test: los de elevación de la fase anterior miran la celda del tbody.
  it('no pinta elevación en la esquina mientras no hay scroll horizontal', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { corner } = stickyParts(container)
    expect(corner.style.boxShadow).toBe(`${HEADER_EDGE}, ${COL_EDGE}`)
    expect(corner.style.boxShadow).not.toContain('rgba(0,0,0,0.5)')
  })

  it('añade la elevación a la esquina sin perder las dos insets', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const wrapper = screen.getByTestId('breakdown-scroll')
    Object.defineProperty(wrapper, 'scrollLeft', { value: 120, writable: true, configurable: true })
    fireEvent.scroll(wrapper)

    const { corner } = stickyParts(container)
    expect(corner.style.boxShadow).toContain(HEADER_EDGE)
    expect(corner.style.boxShadow).toContain(COL_EDGE)
    expect(corner.style.boxShadow).toContain('rgba(0,0,0,0.5)')
  })

  it('no filtra la sombra inferior del header a las celdas del tbody', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    expect(stickyParts(container).bodyCell.style.boxShadow).not.toContain(HEADER_EDGE)
  })

  it('no declara top en ninguna parte: el mecanismo es transform, no position:sticky vertical', () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { thead, corner, bodyCell, footCell } = stickyParts(container)
    expect(thead.style.top).toBe('')
    expect(corner.style.top).toBe('')
    expect(bodyCell.style.top).toBe('')
    expect(footCell.style.top).toBe('')
  })

  it.each(BREAKPOINTS)('aplica sin condición de breakpoint en %s', (bp) => {
    setBreakpoint(bp)
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const { thead, corner } = stickyParts(container)
    expect(thead).toHaveStyle({ position: 'relative', zIndex: '3' })
    expect(corner).toHaveStyle({ zIndex: '4' })
  })

  it.each(GROUP_BYS)('la esquina es sticky con zIndex 4 para groupBy=%s', (groupBy) => {
    const { container } = render(<BreakdownTable {...defaultProps} groupBy={groupBy} />)
    expect(stickyParts(container).corner).toHaveStyle({ position: 'sticky', zIndex: '4' })
  })
})

describe('BreakdownTable — ciclo de vida del header fijado', () => {
  beforeEach(() => {
    setBreakpoint('desktop')
  })

  // jsdom no hace layout: todas las métricas son 0, así que el offset siempre es 0 y el thead
  // nunca debe recibir atributo transform. Es el ancla del no-op de la spec §6.1.
  it('no escribe transform en el thead cuando no hay nada que medir', async () => {
    const { container } = render(<BreakdownTable {...defaultProps} />)
    const thead = container.querySelector('thead') as HTMLElement
    expect(thead.style.transform).toBe('')

    fireEvent.scroll(window)
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())))

    expect(thead.style.transform).toBe('')
  })

  it('limpia listeners y rAF al desmontar', () => {
    const { unmount } = render(<BreakdownTable {...defaultProps} />)
    unmount()
    expect(() => {
      fireEvent.scroll(window)
      fireEvent.resize(window)
    }).not.toThrow()
  })

  it('reinstala el efecto al volver del skeleton sin dejar el observer anterior colgado', async () => {
    const { rerender, container } = render(<BreakdownTable {...defaultProps} isLoading={true} />)
    expect(container.querySelector('table')).toBeNull()

    rerender(<BreakdownTable {...defaultProps} isLoading={false} />)

    const thead = container.querySelector('thead') as HTMLElement
    expect(thead).not.toBeNull()
    fireEvent.scroll(window)
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
    expect(thead.style.transform).toBe('')
  })
})
