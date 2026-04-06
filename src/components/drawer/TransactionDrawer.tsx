import { useState, useEffect } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { useConfig } from '../../hooks/useConfig'
import { getEffectiveDateRange } from '../../lib/date-utils'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { exportTransactionsCSV } from '../../lib/csv-export'
import type { BreakdownRow } from '../../types/breakdown'
import type { FilterState } from '../../types/filters'

interface TransactionDrawerProps {
  row: BreakdownRow | null
  filters: FilterState
  onClose: () => void
}

function SkeletonRows() {
  return (
    <div aria-label="Loading transactions" style={{ padding: '8px 0' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '64px',
            margin: '4px 20px',
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

export function TransactionDrawer({ row, filters, onClose }: TransactionDrawerProps) {
  const { config } = useConfig()
  const range = getEffectiveDateRange(filters)

  // B-1: animation-aware close — track open state separately from row presence
  // Initialize currentRow from row so first render calls useTransactions with the correct id
  const [isOpen, setIsOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<BreakdownRow | null>(row)

  useEffect(() => {
    if (row !== null) {
      setCurrentRow(row)
      // Two rAFs ensure the element is mounted before the transition starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpen(true))
      })
    } else {
      setIsOpen(false)
      // currentRow is cleared in handleTransitionEnd after slide-out completes
    }
  }, [row])

  // M-1: close on Escape key
  useEffect(() => {
    if (!currentRow) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentRow, onClose])

  function handleTransitionEnd() {
    if (!isOpen) setCurrentRow(null)
  }

  const { transactions, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useTransactions(
      filters.groupBy,
      currentRow?.id ?? '',
      currentRow?.name ?? '',
      range,
      currentRow !== null && !!config
    )

  if (!currentRow) return null

  const subtitle = `${formatDate(range.start)} – ${formatDate(range.end)}`

  return (
    <>
      {/* Overlay */}
      <div
        data-testid="drawer-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Drawer panel */}
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '480px',
          height: '100vh',
          backgroundColor: '#1e1e1e',
          borderLeft: '1px solid #3c4043',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #3c4043',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h2
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 500,
                  fontSize: '16px',
                  color: '#e8eaed',
                  margin: 0,
                }}
              >
                {currentRow.name} — Transactions
              </h2>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: '12px',
                  color: '#9aa0a6',
                  margin: '4px 0 0',
                }}
              >
                {subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* B-2: disable when loading or no transactions */}
              <button
                type="button"
                onClick={() => exportTransactionsCSV(transactions, currentRow.name)}
                disabled={isLoading || transactions.length === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isLoading || transactions.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: '13px',
                  color: '#8ab4f8',
                  padding: '4px 8px',
                  opacity: isLoading || transactions.length === 0 ? 0.4 : 1,
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9aa0a6',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonRows />
        ) : transactions.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              fontFamily: "'Roboto', sans-serif",
              fontSize: '14px',
              color: '#9aa0a6',
            }}
          >
            No transactions found for this item.
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #3c4043',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: '12px',
                        color: '#9aa0a6',
                        marginBottom: '2px',
                      }}
                    >
                      {formatDate(tx.date)}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: '14px',
                        color: '#e8eaed',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tx.description}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: '12px',
                        color: '#9aa0a6',
                      }}
                    >
                      {tx.sourceAccount} → {tx.destinationAccount}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Roboto', sans-serif",
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#e8eaed',
                      marginLeft: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(tx.amount, tx.currencyCode)}
                  </div>
                </div>
              </div>
            ))}

            {/* Load more / End indicator */}
            <div style={{ padding: '16px 20px', textAlign: 'center' }}>
              {hasNextPage ? (
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: '13px',
                    color: '#8ab4f8',
                    background: 'none',
                    border: '1px solid #3c4043',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
                    opacity: isFetchingNextPage ? 0.6 : 1,
                  }}
                >
                  {isFetchingNextPage ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #8ab4f8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Loading...
                    </span>
                  ) : (
                    'Load more transactions'
                  )}
                </button>
              ) : (
                <span
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: '12px',
                    color: '#9aa0a6',
                  }}
                >
                  All transactions loaded
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
