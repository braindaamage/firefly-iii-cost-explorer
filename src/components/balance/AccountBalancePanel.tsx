import { useMemo } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { formatCurrency } from '../../lib/format-currency'
import type { AssetAccountBalance } from '../../api/types'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

interface CurrencyTotal {
  currencyCode: string
  currencySymbol: string
  currencyDecimalPlaces: number
  total: number
}

interface AccountBalancePanelProps {
  accounts: AssetAccountBalance[]
  loading: boolean
}

interface SkeletonPanelProps {
  breakpoint: Breakpoint
}

function SkeletonPanel({ breakpoint }: SkeletonPanelProps) {
  const cardsStyle =
    breakpoint === 'desktop'
      ? { display: 'flex', gap: '12px' }
      : breakpoint === 'tablet'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }
        : { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }

  return (
    <div
      aria-label="Loading balances"
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '200px',
          height: '28px',
          backgroundColor: '#2d2d2d',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div style={cardsStyle}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: breakpoint === 'desktop' ? '150px' : undefined,
              height: '60px',
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function AccountBalancePanel({ accounts, loading }: AccountBalancePanelProps) {
  const breakpoint = useBreakpoint()
  const isCompact = breakpoint !== 'desktop'

  const totals = useMemo<CurrencyTotal[]>(() => {
    const map = new Map<string, CurrencyTotal>()
    accounts.forEach((acc) => {
      const existing = map.get(acc.currencyCode)
      if (existing) {
        existing.total += acc.balance
      } else {
        map.set(acc.currencyCode, {
          currencyCode: acc.currencyCode,
          currencySymbol: acc.currencySymbol,
          currencyDecimalPlaces: acc.currencyDecimalPlaces,
          total: acc.balance,
        })
      }
    })
    return Array.from(map.values())
  }, [accounts])

  const sortedAccounts = useMemo(() => {
    const byCurrency = new Map<string, AssetAccountBalance[]>()
    accounts.forEach((acc) => {
      const group = byCurrency.get(acc.currencyCode) ?? []
      group.push(acc)
      byCurrency.set(acc.currencyCode, group)
    })
    return Array.from(byCurrency.values()).flatMap((group) =>
      group.sort((a, b) => b.balance - a.balance)
    )
  }, [accounts])

  if (loading) return <SkeletonPanel breakpoint={breakpoint} />
  if (accounts.length === 0) return null

  const totalsFontSize = { mobile: '20px', tablet: '22px', desktop: '24px' }[breakpoint]
  const balanceFontSize = { mobile: '14px', tablet: '15px', desktop: '16px' }[breakpoint]

  const totalsStyle = isCompact
    ? { display: 'flex', flexDirection: 'column' as const, gap: '4px' }
    : { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }

  const cardsStyle =
    breakpoint === 'desktop'
      ? { display: 'flex', flexDirection: 'row' as const, gap: '8px', overflowX: 'auto' as const }
      : breakpoint === 'tablet'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }
        : { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }

  const cardPadding = breakpoint === 'mobile' ? '10px 12px' : '12px 16px'

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Net Worth header */}
      <div>
        <div
          style={{
            fontFamily: "'Roboto', sans-serif",
            color: '#9aa0a6',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          Net Worth
        </div>
        <div data-testid="net-worth-totals" style={totalsStyle}>
          {totals.map((t, i) => (
            <span
              key={t.currencyCode}
              data-testid="currency-total"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {!isCompact && i > 0 && (
                <span style={{ color: '#9aa0a6', fontSize: '20px', lineHeight: '1' }}>·</span>
              )}
              <span
                data-testid="net-worth-total"
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  color: '#e8eaed',
                  fontSize: totalsFontSize,
                  fontWeight: 600,
                }}
              >
                {formatCurrency(t.total, t.currencyCode, t.currencyDecimalPlaces)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Account cards */}
      <div style={cardsStyle}>
        {sortedAccounts.map((acc) => (
          <div
            key={acc.id}
            data-testid="account-card"
            style={{
              backgroundColor: '#121212',
              border: '1px solid #3c4043',
              borderRadius: '6px',
              padding: cardPadding,
              flexShrink: 0,
              minWidth: breakpoint === 'desktop' ? '140px' : undefined,
            }}
          >
            <div
              data-testid="account-name"
              style={{
                fontFamily: "'Roboto', sans-serif",
                color: '#9aa0a6',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {acc.name}
            </div>
            <div
              data-testid={`account-balance-${acc.id}`}
              style={{
                fontFamily: "'Roboto', sans-serif",
                color: acc.balance < 0 ? '#f28b82' : '#e8eaed',
                fontSize: balanceFontSize,
                fontWeight: 500,
              }}
            >
              {formatCurrency(acc.balance, acc.currencyCode, acc.currencyDecimalPlaces)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
