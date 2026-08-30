import { useState, useMemo, useRef, useEffect, useLayoutEffect, Fragment } from 'react'
import { SortableHeader } from './SortableHeader'
import { formatCurrency } from '../../lib/formatters'
import { computeStickyHeaderOffset, canSkipStickyHeaderSync } from '../../lib/sticky-header'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { SortDirection } from './SortableHeader'
import type { BreakdownRow } from '../../types/breakdown'
import type { GroupBy } from '../../types/filters'

type Breakpoint = ReturnType<typeof useBreakpoint>

const SURFACE = '#1e1e1e' // superficie de card / celda sticky en reposo
const SURFACE_HOVER = '#2d2d2d' // fila hovered
const SURFACE_FOOTER = '#1a1a1a' // equivalente opaco de rgba(18,18,18,0.3) sobre SURFACE
const BORDER = '#3c4043'
const DIVIDER = '#2d2d2d' // separador entre filas y bloque de skeleton (mismo valor que
                          // SURFACE_HOVER, pero es otra cosa: no lo reutilices por coincidir)

// Escala de stacking dentro de la tabla:
//   2 -> celdas sticky de la primera columna (tbody + tfoot), en el stacking context raíz
//   3 -> <thead> (position: relative), que al ser stacking context propio contiene al 4
//   4 -> celda esquina (th de la 1ª columna), DENTRO del stacking context del thead
// El 3 del thead gana al 2 de la columna congelada: si no, la 1ª columna del tbody
// se pintaría por encima del header fijado.
// Matiz: como el <thead> es stacking context propio, el 4 de la esquina solo compite DENTRO
// del thead (contra los th de periodo/Average/Total, estáticos). Hacia fuera la esquina
// hereda el 3 del grupo; no es la aritmética plana que sugería la previsión anterior.
// Toda la escala queda por debajo del 10 que usan DashboardPage y RatesSidecarSection.
const Z_STICKY_COL = 2
const Z_STICKY_HEADER = 3
const Z_STICKY_CORNER = 4

// Capas de sombra. Se extraen para que la composición de la esquina sea legible y no un
// string concatenado a mano en tres sitios.
// HEADER_EDGE sustituye al borderBottom del header: con borderCollapse:'collapse' el borde
// pertenece a la rejilla de la tabla, se pinta en coordenadas de tabla y NO viaja con el
// <thead> desplazado, así que el header fijado se quedaría SIN línea inferior. La sombra inset
// sí forma parte del pintado de la propia celda y se desplaza con ella.
//
// El borde abandonado no llega a verse en ningún caso, por tres razones (medido; no busques
// una "línea huérfana" en el tbody, no existe): queda en `theadHeight - offset`, o sea siempre
// por encima de ~42px; mientras cae dentro del viewport lo tapa el propio <thead>, que es
// stacking context en z-index 3 con celdas de fondo opaco; y tras este cambio esa arista ya no
// declara ningún borde colapsado, porque el primer <tr> de tbody nunca tuvo borderTop.
const HEADER_EDGE = `inset 0 -1px 0 ${BORDER}`
const COL_EDGE = `inset -1px 0 0 ${BORDER}`
const COL_ELEVATION = '6px 0 8px -4px rgba(0,0,0,0.5)'

// Ancho de la primera columna (congelada) y padding de celda: única fuente de verdad.
// El piso (minWidth del th) y el techo (maxWidth del contenido) derivan del mismo número,
// por lo que la columna no se ensancha con nombres largos: el texto envuelve.
const FIRST_COL_PX: Record<Breakpoint, number> = { mobile: 140, tablet: 160, desktop: 220 }
const CELL_PADDING_X: Record<Breakpoint, number> = { mobile: 10, tablet: 14, desktop: 16 }
const CELL_PADDING_Y: Record<Breakpoint, number> = { mobile: 8, tablet: 10, desktop: 12 }

const GROUP_TITLES: Record<GroupBy, string> = {
  category: 'Category Breakdown',
  budget: 'Budget Breakdown',
  tag: 'Tag Breakdown',
  expense_account: 'Expense Account Breakdown',
  asset_account: 'Asset Account Breakdown',
}

const GROUP_COLUMN_LABEL: Record<GroupBy, string> = {
  category: 'Category',
  budget: 'Budget',
  tag: 'Tag',
  expense_account: 'Expense Account',
  asset_account: 'Asset Account',
}

type SortKey = 'name' | 'average' | 'total' | string  // string covers period labels

interface BreakdownTableProps {
  rows: BreakdownRow[]
  totals: BreakdownRow
  periods: string[]
  currencyCode: string
  isLoading: boolean
  groupBy: GroupBy
  onRowClick: (row: BreakdownRow) => void
  onExportCSV: () => void
}

function SkeletonRows() {
  return (
    <div aria-label="Loading table" style={{ padding: '8px 0' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '44px',
            margin: '4px 16px',
            borderRadius: '4px',
            backgroundColor: DIVIDER,
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

function AmountCell({ value, currencyCode }: { value: number; currencyCode: string }) {
  if (value === 0) {
    return <span style={{ color: '#9aa0a6' }}>{formatCurrency(0, currencyCode)}</span>
  }
  return <span>{formatCurrency(value, currencyCode)}</span>
}

export function BreakdownTable({
  rows,
  totals,
  periods,
  currencyCode,
  isLoading,
  groupBy,
  onRowClick,
  onExportCSV,
}: BreakdownTableProps) {
  const breakpoint = useBreakpoint()

  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [isScrolled, setIsScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const tfootRef = useRef<HTMLTableSectionElement>(null)

  // El div de scroll se desmonta al entrar en loading o en el estado vacío, pero isScrolled es
  // estado del padre y sobrevive: al remontar quedaría la elevación pintada sin nada oculto
  // detrás, y ningún onScroll la corrige. Se deriva del nodo real en vez de asumir 0, para
  // cubrir también los cambios de periods que no pasan por loading (caché caliente).
  const showTable = !isLoading && rows.length > 0
  useEffect(() => {
    setIsScrolled((scrollRef.current?.scrollLeft ?? 0) > 0)
  }, [showTable, periods.length, breakpoint])

  // Header fijado al top del viewport mediante transform sobre el <thead>.
  //
  // No se usa position:sticky porque no puede funcionar aquí: el scrollport más cercano del
  // thead es el div de scroll horizontal (:overflowX 'auto', que hace computar overflow-y a
  // 'auto'), y ese div no tiene rango vertical propio. Quitarle el overflow lo arreglaría a
  // costa de perder el scroll horizontal y dejar inerte la columna congelada.
  //
  // El offset NO vive en estado de React: cambia en cada frame de scroll y un useState
  // dispararía un re-render completo de la tabla por frame. Se escribe imperativamente, igual
  // que ya hace el hover de fila más abajo. React solo escribe/limpia las claves presentes en
  // el objeto `style` del JSX, y `transform` no está en ninguno: no lo pisa en los re-renders.
  //
  // useLayoutEffect y no useEffect: el cálculo inicial tras (re)montar debe aplicarse antes
  // del paint, o al volver de un skeleton estando scrolleado se ve un frame con el header en
  // su posición natural antes de saltar a la fijada.
  useLayoutEffect(() => {
    if (!showTable) return

    let rafId: number | null = null
    // -1 no es un offset posible: fuerza la primera escritura tras (re)montar, porque el nodo
    // puede ser nuevo (sin transform) o el mismo con un transform viejo ya inválido. El segundo
    // caso ocurre de verdad: en desarrollo bajo StrictMode (main.tsx:7) React corre
    // setup -> cleanup -> setup sin recrear el DOM, así que el efecto se reinstala sobre el
    // mismo <thead>, que conserva el transform de la pasada anterior.
    let lastOffset = -1

    function sync() {
      const table = tableRef.current
      const thead = theadRef.current
      if (!table || !thead) return

      const tableTop = table.getBoundingClientRect().top
      // FAST PATH: estado permanente cuando la tabla es corta y nunca alcanza el top del
      // viewport. Evita las tres lecturas de offsetHeight y toda escritura al DOM.
      if (canSkipStickyHeaderSync(tableTop, lastOffset)) return

      // Todas las lecturas primero, una sola escritura al final: no hay layout thrashing.
      const offset = computeStickyHeaderOffset({
        tableTop,
        tableHeight: table.offsetHeight,
        theadHeight: thead.offsetHeight,
        tfootHeight: tfootRef.current?.offsetHeight ?? 0,
      })
      if (offset === lastOffset) return
      lastOffset = offset
      // '' y no 'translateY(0px)': sin transform el <thead> no crea stacking context ni
      // containing block, y la feature inactiva no deja rastro alguno en el DOM.
      thead.style.transform = offset === 0 ? '' : `translateY(${offset}px)`
    }

    function schedule() {
      if (rafId !== null) return // coalescing: como máximo un cálculo por frame
      rafId = requestAnimationFrame(() => {
        rafId = null
        sync()
      })
    }

    sync() // estado inicial, antes del paint

    // Los listeners van en window porque hoy quien scrollea es html y toda la cadena de
    // ancestros computa overflow: visible. Si alguien hiciera scrollable un ancestro
    // (<main>, un layout con sidebar fija…), habría que escuchar también ahí.
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // El ResizeObserver cubre los cambios de geometría (datos nuevos, reordenar con nombres
    // multilínea, periods, breakpoint, carga tardía de Roboto) sin enumerarlos en un array de
    // deps que se desactualizaría en la siguiente feature.
    //
    // Observar la tabla NO basta: cubre su tamaño propio, pero no un cambio de POSICIÓN por un
    // hermano que crece por encima de ella. Ahí la tabla no cambia de tamaño, nadie scrollea y
    // la ventana no cambia, así que ninguno de los tres disparadores llega y el transform se
    // queda obsoleto: el header aparece flotando sobre el tbody hasta el siguiente scroll.
    // Es un caso real — accountsData, netWorth, forecast y currenciesQuery (DashboardPage
    // :49-63) son queries independientes de dashboardData, alimentan paneles de encima de la
    // tabla y no controlan su desmontaje: un refetch al recuperar el foco cambia su altura con
    // la tabla montada. Sin riesgo de bucle: sync solo escribe transform, que no afecta al
    // layout y por tanto no puede realimentar al observer.
    const ro = new ResizeObserver(schedule)
    if (tableRef.current) ro.observe(tableRef.current)
    ro.observe(document.body)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
    // El nodo <table> solo se crea/destruye cuando el ternario de render cambia de rama, y esa
    // condición es exactamente showTable. En cualquier otro re-render React reutiliza el nodo.
  }, [showTable])

  function handleSort(key: SortKey) {
    return (next: SortDirection) => {
      if (next === null) {
        setSortKey('total')
        setSortDir('desc')
      } else {
        setSortKey(key)
        setSortDir(next)
      }
    }
  }

  function dirFor(key: SortKey): SortDirection {
    return sortKey === key ? sortDir : null
  }

  const sorted = useMemo(() => {
    if (!sortDir) return rows
    return [...rows].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string
      if (sortKey === 'name') {
        aVal = a.name
        bVal = b.name
      } else if (sortKey === 'average') {
        aVal = a.average
        bVal = b.average
      } else if (sortKey === 'total') {
        aVal = a.total
        bVal = b.total
      } else {
        // period key
        aVal = a.values[sortKey] ?? 0
        bVal = b.values[sortKey] ?? 0
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [rows, sortKey, sortDir])

  const cellPadding = `${CELL_PADDING_Y[breakpoint]}px ${CELL_PADDING_X[breakpoint]}px`
  const cellFontSize = breakpoint === 'mobile' ? '12px' : '13px'
  const headerFontSize = breakpoint === 'mobile' ? '11px' : '12px'
  const minColWidth = breakpoint === 'mobile' ? '90px' : breakpoint === 'tablet' ? '100px' : '120px'

  const firstColPx = FIRST_COL_PX[breakpoint]
  const firstColMinWidth = `${firstColPx}px`
  // Ancho interior disponible para el contenido: box-sizing es border-box (index.css),
  // así que el minWidth del th incluye el padding y hay que descontarlo.
  const firstColContentWidth = `${firstColPx - CELL_PADDING_X[breakpoint] * 2}px`

  const cellStyle: React.CSSProperties = {
    padding: cellPadding,
    fontFamily: "'Roboto', sans-serif",
    fontSize: cellFontSize,
    color: '#e8eaed',
    transition: 'background-color 150ms ease',
    // Las filas tienen altura variable (el nombre envuelve): los montos se alinean
    // con la primera línea del nombre en vez de centrarse contra el bloque.
    verticalAlign: 'top',
  }

  const rightCell: React.CSSProperties = { ...cellStyle, textAlign: 'right' }

  const headerCellStyle: React.CSSProperties = {
    padding: cellPadding,
    fontSize: headerFontSize,
    backgroundColor: SURFACE,
    // boxShadow y no borderBottom: el borde colapsado no viajaría con el thead desplazado.
    boxShadow: HEADER_EDGE,
  }

  // La regla inset de 1px marca el límite de la columna congelada siempre; se pinta dentro
  // de la celda, así que no la afecta borderCollapse. La elevación aparece solo cuando hay
  // contenido pasando por debajo (scrollLeft > 0).
  const stickyFirstCol: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: Z_STICKY_COL,
    backgroundColor: `var(--row-bg, ${SURFACE})`,
    boxShadow: isScrolled ? `${COL_EDGE}, ${COL_ELEVATION}` : COL_EDGE,
  }

  // La esquina es la única celda que combina las dos direcciones: congelada a la izquierda
  // (como el resto de la columna) y dentro del header fijado. No puede compartir estilo con
  // stickyFirstCol, que alimenta también a los td de tbody y tfoot: necesita otro z-index y
  // un color literal. El header no participa del hover, así que nada de var(--row-bg, …) —
  // esa custom property es del tbody y dejaría el color del header a merced de quien la
  // setease más arriba en el DOM.
  const stickyCorner: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: Z_STICKY_CORNER,
    backgroundColor: SURFACE,
    boxShadow: isScrolled
      ? `${HEADER_EDGE}, ${COL_EDGE}, ${COL_ELEVATION}`
      : `${HEADER_EDGE}, ${COL_EDGE}`,
  }

  return (
    <div
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 500,
            fontSize: breakpoint === 'mobile' ? '14px' : '16px',
            color: '#e8eaed',
          }}
        >
          {GROUP_TITLES[groupBy]}
        </span>
        <button
          type="button"
          onClick={onExportCSV}
          aria-label="Export CSV"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '13px',
            color: '#8ab4f8',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          {breakpoint !== 'mobile' && <span>Export CSV</span>}
        </button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '14px',
            color: '#9aa0a6',
          }}
        >
          No data available for the selected filters.
        </div>
      ) : (
        <div
          ref={scrollRef}
          data-testid="breakdown-scroll"
          style={{ overflowX: 'auto' }}
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollLeft > 0)}
        >
          <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse', minWidth: periods.length > 3 ? `${firstColPx + (periods.length + 2) * parseInt(minColWidth)}px` : undefined }}>
            {/* position/zIndex son PERMANENTES, no condicionales: sin ellos las celdas
                congeladas del tbody (z-index 2) se pintarían encima del header fijado. Y al
                serlo siempre, el thead ya es stacking context en ambos estados, así que ganar
                o perder el transform al cruzar el umbral no reordena capa alguna. */}
            <thead ref={theadRef} style={{ position: 'relative', zIndex: Z_STICKY_HEADER }}>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left', minWidth: firstColMinWidth, ...stickyCorner }}>
                  <SortableHeader
                    label={GROUP_COLUMN_LABEL[groupBy]}
                    direction={dirFor('name')}
                    onSort={handleSort('name')}
                  />
                </th>
                {periods.map((period) => (
                  <th key={period} style={{ ...headerCellStyle, textAlign: 'right', minWidth: minColWidth }}>
                    <SortableHeader
                      label={period}
                      direction={dirFor(period)}
                      onSort={handleSort(period)}
                    />
                  </th>
                ))}
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                  <SortableHeader
                    label="Average"
                    direction={dirFor('average')}
                    onSort={handleSort('average')}
                  />
                </th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                  <SortableHeader
                    label="Total"
                    direction={dirFor('total')}
                    onSort={handleSort('total')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => onRowClick(row)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: `1px solid ${DIVIDER}`,
                      // La celda congelada hereda la transition de cellStyle y hace fade de 150ms.
                      // Sin esto el resto de la fila cambia de golpe y la primera columna llega tarde.
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      // --row-bg hereda por DOM hasta la celda sticky, que es opaca y de otro
                      // modo taparía el fondo del <tr>. Cero re-render de React.
                      const tr = e.currentTarget as HTMLTableRowElement
                      tr.style.backgroundColor = SURFACE_HOVER
                      tr.style.setProperty('--row-bg', SURFACE_HOVER)
                    }}
                    onMouseLeave={(e) => {
                      const tr = e.currentTarget as HTMLTableRowElement
                      tr.style.backgroundColor = ''
                      tr.style.removeProperty('--row-bg')
                    }}
                  >
                    <td style={{ ...cellStyle, ...stickyFirstCol }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: firstColContentWidth }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: row.color,
                            flexShrink: 0,
                            marginTop: '3px',
                          }}
                        />
                        <span style={{ fontWeight: 500, minWidth: 0, overflowWrap: 'anywhere' }}>{row.name}</span>
                      </div>
                    </td>
                    {periods.map((period) => (
                      <td key={period} style={rightCell}>
                        <AmountCell value={row.values[period] ?? 0} currencyCode={currencyCode} />
                      </td>
                    ))}
                    <td style={rightCell}>
                      <AmountCell value={row.average} currencyCode={currencyCode} />
                    </td>
                    <td style={{ ...rightCell, fontWeight: 500 }}>
                      <AmountCell value={row.total} currencyCode={currencyCode} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
            <tfoot ref={tfootRef}>
              <tr
                style={{
                  backgroundColor: SURFACE_FOOTER,
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                {/* backgroundColor va después del spread para ganarle al var(--row-bg, …) */}
                <td style={{ ...cellStyle, fontWeight: 500, fontSize: '16px', ...stickyFirstCol, backgroundColor: SURFACE_FOOTER }}>
                  Total
                </td>
                {periods.map((period) => (
                  <td key={period} style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                    <AmountCell value={totals.values[period] ?? 0} currencyCode={currencyCode} />
                  </td>
                ))}
                <td style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                  <AmountCell value={totals.average} currencyCode={currencyCode} />
                </td>
                <td style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                  <AmountCell value={totals.total} currencyCode={currencyCode} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
