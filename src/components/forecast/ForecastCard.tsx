import { useState } from 'react'
import { formatCurrency } from '../../lib/format-currency'
import type { ForecastResult, PendingBill } from '../../hooks/computeForecast'
import type { ForecastConfig } from '../../hooks/useForecastConfig'

export interface ForecastCardProps {
  forecast: ForecastResult
  config: ForecastConfig
  onOpenSettings: () => void
}

const panelStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  border: '1px solid #3c4043',
  borderRadius: '8px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  color: '#9aa0a6',
  fontSize: '13px',
  fontWeight: 500,
}

const subCardStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#121212',
  border: '1px solid #3c4043',
  borderRadius: '6px',
  padding: '12px 16px',
}

const subCardLabelStyle: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  color: '#9aa0a6',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '4px',
}

const subCardValueStyle: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  color: '#e8eaed',
  fontSize: '16px',
  fontWeight: 500,
}

// ─── Gear button ──────────────────────────────────────────────────────────────

function GearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open forecast settings"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#9aa0a6',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58
          c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96
          c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84
          c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33
          c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58
          C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61
          l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54
          c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54
          c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32
          c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z
          M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
      </svg>
    </button>
  )
}

// ─── Expandable bills list ────────────────────────────────────────────────────

function PendingBillsToggle({
  bills,
  currency,
}: {
  bills: PendingBill[]
  currency: { code: string; decimalPlaces: number }
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (bills.length === 0) return null

  const label = isExpanded
    ? 'Hide pending bills'
    : `View ${bills.length} pending bill${bills.length !== 1 ? 's' : ''}`

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="pending-bills-list"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#8ab4f8',
          fontSize: '13px',
          fontFamily: "'Roboto', sans-serif",
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {isExpanded ? '▲' : '▼'} {label}
      </button>

      {isExpanded && (
        <ul
          id="pending-bills-list"
          role="list"
          style={{
            marginTop: '8px',
            padding: '0',
            listStyle: 'none',
            backgroundColor: '#121212',
            border: '1px solid #3c4043',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {bills.map((bill, i) => (
            <li
              key={bill.id}
              style={{
                padding: '8px 12px',
                color: '#9aa0a6',
                fontSize: '13px',
                fontFamily: "'Roboto', sans-serif",
                borderTop: i > 0 ? '1px solid #3c4043' : 'none',
              }}
            >
              {bill.name} · {formatCurrency(bill.amount, currency.code, currency.decimalPlaces)} · {bill.date}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ForecastSkeleton() {
  return (
    <div aria-label="Loading forecast" style={panelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            width: '120px',
            height: '14px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '160px',
            height: '32px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s',
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '60px',
                backgroundColor: '#2d2d2d',
                borderRadius: '6px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ForecastCard({ forecast, config, onOpenSettings }: ForecastCardProps) {
  const { status } = forecast

  if (status === 'loading') return <ForecastSkeleton />

  const { currency, total, mtdSpent, variableForecast, billsForecast, breakdown } = forecast

  // Unavailable: no primary currency or no history + no bills
  if (status === 'unavailable') {
    return (
      <div role="region" aria-label="Monthly cost forecast" style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={sectionLabelStyle}>Monthly Forecast</div>
          <GearButton onClick={onOpenSettings} />
        </div>
        <div
          data-testid="forecast-unavailable"
          style={{
            color: '#9aa0a6',
            fontSize: '14px',
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Forecast unavailable — spending history or billing data not found.
        </div>
        {mtdSpent !== null && currency && (
          <div
            data-testid="forecast-mtd-fallback"
            style={{ color: '#9aa0a6', fontSize: '14px', fontFamily: "'Roboto', sans-serif" }}
          >
            Spent so far: {formatCurrency(mtdSpent, currency.code, currency.decimalPlaces)}
          </div>
        )}
      </div>
    )
  }

  // Error: MTD query failed
  if (status === 'error') {
    return (
      <div role="region" aria-label="Monthly cost forecast" style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={sectionLabelStyle}>Monthly Forecast</div>
          <GearButton onClick={onOpenSettings} />
        </div>
        <div
          role="alert"
          style={{
            color: '#f28b82',
            fontSize: '14px',
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Failed to load forecast data. Please try again.
        </div>
      </div>
    )
  }

  // ok, partialNoBills, partialNoHistory
  const warningMessage =
    status === 'partialNoHistory'
      ? `⚠ Partial — based on ${breakdown.historyMonthsUsed} of ${config.historyMonths} history months`
      : status === 'partialNoBills'
        ? '⚠ Partial — bills data unavailable'
        : null

  return (
    <div role="region" aria-label="Monthly cost forecast" style={panelStyle}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={sectionLabelStyle}>Monthly Forecast</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {warningMessage && (
            <span
              data-testid="forecast-warning"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#3c2f1a',
                border: '1px solid #fdd663',
                color: '#fdd663',
                fontSize: '12px',
                fontWeight: 500,
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              {warningMessage}
            </span>
          )}
          <GearButton onClick={onOpenSettings} />
        </div>
      </div>

      {/* Total */}
      {total !== null && currency && (
        <div
          data-testid="forecast-total"
          aria-live="polite"
          style={{
            fontFamily: "'Roboto', sans-serif",
            color: '#e8eaed',
            fontSize: '28px',
            fontWeight: 600,
          }}
        >
          {formatCurrency(total, currency.code, currency.decimalPlaces)}
        </div>
      )}

      {/* 3 sub-cards: MTD, Variable, Bills */}
      {currency && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div data-testid="forecast-mtd" style={subCardStyle}>
            <div style={subCardLabelStyle}>Spent so far</div>
            <div style={subCardValueStyle}>
              {mtdSpent !== null
                ? formatCurrency(mtdSpent, currency.code, currency.decimalPlaces)
                : '—'}
            </div>
          </div>

          <div data-testid="forecast-variable" style={subCardStyle}>
            <div style={subCardLabelStyle}>Variable forecast</div>
            <div style={subCardValueStyle}>
              {variableForecast !== null
                ? formatCurrency(variableForecast, currency.code, currency.decimalPlaces)
                : '—'}
            </div>
          </div>

          <div data-testid="forecast-bills" style={subCardStyle}>
            <div style={subCardLabelStyle}>Pending bills</div>
            <div style={subCardValueStyle}>
              {billsForecast !== null
                ? formatCurrency(billsForecast, currency.code, currency.decimalPlaces)
                : '—'}
            </div>
            {breakdown.pendingBills.length > 0 && (
              <div style={{ color: '#9aa0a6', fontSize: '12px', fontFamily: "'Roboto', sans-serif", marginTop: '4px' }}>
                {breakdown.pendingBills.length} bill{breakdown.pendingBills.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expandable pending bills — only for ok / partialNoHistory */}
      {currency && (status === 'ok' || status === 'partialNoHistory') && (
        <PendingBillsToggle bills={breakdown.pendingBills} currency={currency} />
      )}

      {/* Footer */}
      {breakdown.daysElapsed > 0 && (
        <div
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: '12px',
            color: '#5f6368',
          }}
        >
          {`Day ${breakdown.daysElapsed} of ${breakdown.daysInMonth} · ${breakdown.daysRemaining} days remaining · Model: ${config.model}`}
        </div>
      )}
    </div>
  )
}
