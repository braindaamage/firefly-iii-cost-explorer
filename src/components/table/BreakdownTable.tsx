import { useState, useMemo, Fragment } from 'react'
import { SortableHeader } from './SortableHeader'
import { formatCurrency } from '../../lib/formatters'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { SortDirection } from './SortableHeader'
import type { BreakdownRow } from '../../types/breakdown'
import type { GroupBy } from '../../types/filters'

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

type SortKey = 'name' | 'total' | string  // string covers period labels

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
            backgroundColor: '#2d2d2d',
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
  const isMobileOrTablet = breakpoint === 'mobile' || breakpoint === 'tablet'

  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

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

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontFamily: "'Roboto', sans-serif",
    fontSize: '13px',
    color: '#e8eaed',
    transition: 'background-color 150ms ease',
  }

  const rightCell: React.CSSProperties = { ...cellStyle, textAlign: 'right' }

  const headerCellStyle: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: '#1e1e1e',
    borderBottom: '1px solid #3c4043',
  }

  const stickyFirstCol: React.CSSProperties = isMobileOrTablet
    ? { position: 'sticky', left: 0, zIndex: 1, backgroundColor: '#1e1e1e' }
    : {}

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #3c4043',
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
          borderBottom: '1px solid #3c4043',
        }}
      >
        <span
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 500,
            fontSize: '16px',
            color: '#e8eaed',
          }}
        >
          {GROUP_TITLES[groupBy]}
        </span>
        <button
          type="button"
          onClick={onExportCSV}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '13px',
            color: '#8ab4f8',
            padding: '4px 8px',
          }}
        >
          Export CSV
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: periods.length > 3 ? `${300 + periods.length * 120}px` : undefined }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left', ...stickyFirstCol }}>
                  <SortableHeader
                    label={GROUP_COLUMN_LABEL[groupBy]}
                    direction={dirFor('name')}
                    onSort={handleSort('name')}
                  />
                </th>
                {periods.map((period) => (
                  <th key={period} style={{ ...headerCellStyle, textAlign: 'right' }}>
                    <SortableHeader
                      label={period}
                      direction={dirFor(period)}
                      onSort={handleSort(period)}
                    />
                  </th>
                ))}
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
                      borderBottom: '1px solid #2d2d2d',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#2d2d2d'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''
                    }}
                  >
                    <td style={{ ...cellStyle, ...stickyFirstCol }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: row.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{row.name}</span>
                      </div>
                    </td>
                    {periods.map((period) => (
                      <td key={period} style={rightCell}>
                        <AmountCell value={row.values[period] ?? 0} currencyCode={currencyCode} />
                      </td>
                    ))}
                    <td style={{ ...rightCell, fontWeight: 500 }}>
                      <AmountCell value={row.total} currencyCode={currencyCode} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  backgroundColor: 'rgba(18,18,18,0.3)',
                  borderTop: '1px solid #3c4043',
                }}
              >
                <td style={{ ...cellStyle, fontWeight: 500, fontSize: '16px', ...stickyFirstCol }}>
                  Total
                </td>
                {periods.map((period) => (
                  <td key={period} style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                    <AmountCell value={totals.values[period] ?? 0} currencyCode={currencyCode} />
                  </td>
                ))}
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
