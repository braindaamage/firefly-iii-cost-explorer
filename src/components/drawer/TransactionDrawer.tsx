import { useState, useEffect, useRef } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { useConfig } from '../../hooks/useConfig'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { formatCurrency, formatDate } from '../../lib/formatters'
import type { BreakdownRow } from '../../types/breakdown'
import type { FilterState, GroupBy } from '../../types/filters'
import type { Period } from '../../lib/period-utils'
import type { Transaction } from '../../api/types'

interface TransactionDrawerProps {
  row: BreakdownRow | null
  periods: Period[]
  filters: FilterState
  onClose: () => void
}

interface PeriodSectionProps {
  period: Period
  isExpanded: boolean
  onToggle: () => void
  periodTotal: number
  currencyCode: string
  groupBy: GroupBy
  itemId: string
  itemName: string
  baseUrl: string
}

function TransactionLink({ tx, baseUrl }: { tx: Transaction; baseUrl: string }) {
  return (
    <a
      href={`${baseUrl}/transactions/show/${tx.id}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label="Open transaction in Firefly III"
      style={{
        color: '#9aa0a6',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: '8px',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8ab4f8' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9aa0a6' }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  )
}

function SkeletonRows() {
  return (
    <div aria-label="Loading transactions" style={{ padding: '8px 0' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '56px',
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

function PeriodSection({
  period,
  isExpanded,
  onToggle,
  periodTotal,
  currencyCode,
  groupBy,
  itemId,
  itemName,
  baseUrl,
}: PeriodSectionProps) {
  const { transactions, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useTransactions(
      groupBy,
      itemId,
      itemName,
      { start: period.start, end: period.end },
      isExpanded
    )

  return (
    <div>
      {/* Accordion header */}
      <button
        type="button"
        aria-label={period.label}
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          cursor: 'pointer',
          backgroundColor: '#252525',
          border: 'none',
          borderBottom: '1px solid #3c4043',
          color: '#e8eaed',
          fontFamily: "'Roboto', sans-serif",
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2d2d2d' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#252525' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{period.label}</span>
        </div>
        <span style={{ fontSize: '14px', color: '#9aa0a6' }}>
          {formatCurrency(periodTotal, currencyCode)}
        </span>
      </button>

      {/* Accordion content */}
      {isExpanded && (
        <div>
          {isLoading ? (
            <SkeletonRows />
          ) : transactions.length === 0 ? (
            <div
              style={{
                padding: '24px 20px',
                textAlign: 'center',
                fontFamily: "'Roboto', sans-serif",
                fontSize: '13px',
                color: '#9aa0a6',
              }}
            >
              No transactions found for this period.
            </div>
          ) : (
            <div>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #2d2d2d',
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
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
                      <span
                        style={{
                          fontFamily: "'Roboto', sans-serif",
                          fontWeight: 500,
                          fontSize: '14px',
                          color: '#e8eaed',
                        }}
                      >
                        {formatCurrency(tx.amount, tx.currencyCode)}
                      </span>
                      <TransactionLink tx={tx} baseUrl={baseUrl} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Load more / end */}
              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
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
                      padding: '6px 16px',
                      cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
                      opacity: isFetchingNextPage ? 0.6 : 1,
                    }}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load more transactions'}
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
      )}
    </div>
  )
}

export function TransactionDrawer({ row, periods, filters, onClose }: TransactionDrawerProps) {
  const { config } = useConfig()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const baseUrl = config?.baseUrl ?? ''

  const [isOpen, setIsOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<BreakdownRow | null>(row)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(new Set([0]))

  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (row !== null) {
      setCurrentRow(row)
      setExpandedPeriods(new Set([0]))
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpen(true))
      })
    } else {
      setIsOpen(false)
    }
  }, [row])

  // Reset expanded state when row identity changes
  useEffect(() => {
    if (row !== null) {
      setExpandedPeriods(new Set([0]))
    }
  }, [row?.id])

  useEffect(() => {
    if (isOpen && isMobile) {
      closeBtnRef.current?.focus()
    }
  }, [isOpen, isMobile])

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

  function togglePeriod(index: number) {
    setExpandedPeriods((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (!currentRow) return null

  const currencyCode = currentRow ? (Object.keys(currentRow.values).length > 0 ? 'EUR' : 'EUR') : 'EUR'

  // Derive subtitle from periods range
  const firstPeriod = periods[0]
  const lastPeriod = periods[periods.length - 1]
  const subtitle = firstPeriod && lastPeriod
    ? `${firstPeriod.label} – ${lastPeriod.label}`
    : ''

  return (
    <>
      {!isMobile && (
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
      )}

      <div
        data-testid="drawer-panel"
        onTransitionEnd={handleTransitionEnd}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isMobile ? '100%' : '480px',
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
              {subtitle && (
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
              )}
            </div>

            <button
              ref={closeBtnRef}
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
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Accordion sections */}
        <div style={{ flex: 1 }}>
          {periods.map((period, index) => (
            <PeriodSection
              key={period.label}
              period={period}
              isExpanded={expandedPeriods.has(index)}
              onToggle={() => togglePeriod(index)}
              periodTotal={currentRow.values[period.label] ?? 0}
              currencyCode={currencyCode}
              groupBy={filters.groupBy}
              itemId={currentRow.id}
              itemName={currentRow.name}
              baseUrl={baseUrl}
            />
          ))}
        </div>

        {/* Footer: all-periods total */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #3c4043',
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#9aa0a6' }}>All periods total</span>
          <span style={{ color: '#e8eaed' }}>{formatCurrency(currentRow.total, currencyCode)}</span>
        </div>
      </div>
    </>
  )
}
