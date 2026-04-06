import { useState, useMemo } from 'react'
import { SortableHeader } from './SortableHeader'
import { formatCurrency, formatPercentage } from '../../lib/formatters'
import type { SortDirection } from './SortableHeader'
import type { BreakdownRow } from '../../types/breakdown'
import type { FilterState, GroupBy } from '../../types/filters'

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

type SortKey = 'name' | 'actualCost' | 'budgeted' | 'variance' | 'percentChange'

interface BreakdownTableProps {
  rows: BreakdownRow[]
  totals: BreakdownRow
  currencyCode: string
  isLoading: boolean
  filters: FilterState
  onRowClick: (row: BreakdownRow) => void
}

function VarianceCell({ value, currencyCode }: { value: number | null; currencyCode: string }) {
  if (value === null) return <span style={{ color: '#9aa0a6' }}>-</span>
  const isOverBudget = value > 0
  const color = isOverBudget ? '#f28b82' : '#81c995'
  const prefix = isOverBudget ? '+' : '-'
  return (
    <span style={{ color }}>
      {prefix}{formatCurrency(Math.abs(value), currencyCode)}
    </span>
  )
}

function PercentChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#9aa0a6' }}>-</span>
  const isIncrease = value >= 0
  const color = isIncrease ? '#f28b82' : '#81c995'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color, justifyContent: 'flex-end' }}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={isIncrease ? 'increase' : 'decrease'}
      >
        {isIncrease ? (
          <path d="M12 19V5M5 12l7-7 7 7" />
        ) : (
          <path d="M12 5v14M5 12l7 7 7-7" />
        )}
      </svg>
      {formatPercentage(value)}
    </span>
  )
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

export function BreakdownTable({
  rows,
  totals,
  currencyCode,
  isLoading,
  filters,
  onRowClick,
}: BreakdownTableProps) {
  const groupBy = filters.groupBy

  const [sortKey, setSortKey] = useState<SortKey>('actualCost')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  function handleSort(key: SortKey) {
    return (next: SortDirection) => {
      if (next === null) {
        setSortKey('actualCost')
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
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      const aNum = aVal as number
      const bNum = bVal as number
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [rows, sortKey, sortDir])

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontFamily: "'Roboto', sans-serif",
    fontSize: '13px',
    color: '#e8eaed',
  }

  const rightCell: React.CSSProperties = { ...cellStyle, textAlign: 'right' }

  const headerCellStyle: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: '#1e1e1e',
    borderBottom: '1px solid #3c4043',
  }

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
          disabled
          title="Coming in a future update"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'not-allowed',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '13px',
            color: '#8ab4f8',
            opacity: 0.5,
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, textAlign: 'left' }}>
                <SortableHeader
                  label={GROUP_COLUMN_LABEL[groupBy]}
                  direction={dirFor('name')}
                  onSort={handleSort('name')}
                />
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                <SortableHeader
                  label="Actual Cost"
                  direction={dirFor('actualCost')}
                  onSort={handleSort('actualCost')}
                />
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                <SortableHeader
                  label="Budgeted"
                  direction={dirFor('budgeted')}
                  onSort={handleSort('budgeted')}
                />
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                <SortableHeader
                  label="Variance"
                  direction={dirFor('variance')}
                  onSort={handleSort('variance')}
                />
              </th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                <SortableHeader
                  label="% Change"
                  direction={dirFor('percentChange')}
                  onSort={handleSort('percentChange')}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #2d2d2d' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#2d2d2d'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''
                }}
              >
                <td style={cellStyle}>
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
                <td style={rightCell}>{formatCurrency(row.actualCost, currencyCode)}</td>
                <td style={rightCell}>
                  {row.budgeted !== null
                    ? formatCurrency(row.budgeted, currencyCode)
                    : <span style={{ color: '#9aa0a6' }}>-</span>}
                </td>
                <td style={rightCell}>
                  <VarianceCell value={row.variance} currencyCode={currencyCode} />
                </td>
                <td style={rightCell}>
                  <PercentChangeCell value={row.percentChange} />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr
              style={{
                backgroundColor: 'rgba(18,18,18,0.3)',
                borderTop: '1px solid #3c4043',
              }}
            >
              <td style={{ ...cellStyle, fontWeight: 500, fontSize: '16px' }}>Total</td>
              <td style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                {formatCurrency(totals.actualCost, currencyCode)}
              </td>
              <td style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                {totals.budgeted !== null
                  ? formatCurrency(totals.budgeted, currencyCode)
                  : <span style={{ color: '#9aa0a6' }}>-</span>}
              </td>
              <td style={{ ...rightCell, fontWeight: 500, fontSize: '16px' }}>
                <VarianceCell value={totals.variance} currencyCode={currencyCode} />
              </td>
              <td style={rightCell}>
                <PercentChangeCell value={totals.percentChange} />
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
