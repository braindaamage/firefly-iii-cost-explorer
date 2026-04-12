import { useMemo } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { formatCurrency } from '../../lib/format-currency'
import type { Account } from '../../api/accounts'
import type { NetWorthResult, NetWorthConvertedValue } from '../../hooks/computeNetWorth'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

interface AccountBalancePanelProps {
  netWorth: NetWorthResult
  accounts: Account[]
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonPanel({ breakpoint }: { breakpoint: Breakpoint }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            width: '80px',
            height: '16px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '200px',
            height: '36px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s',
          }}
        />
        <div
          style={{
            width: '160px',
            height: '16px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s',
          }}
        />
      </div>
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

// ─── Net By Currency row (tier 2) ─────────────────────────────────────────────

interface NetByCurrencyRowProps {
  netByCurrency: NetWorthResult['netByCurrency']
  isCompact: boolean
  fontSize: string
}

function NetByCurrencyRow({ netByCurrency, isCompact, fontSize }: NetByCurrencyRowProps) {
  if (netByCurrency.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
      <div
        data-testid="net-by-currency-label"
        style={{
          fontFamily: "'Roboto', sans-serif",
          color: '#9aa0a6',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        By currency
      </div>
      <div
        data-testid="net-by-currency-values"
        style={
          isCompact
            ? { display: 'flex', flexDirection: 'column' as const, gap: '4px' }
            : { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }
        }
      >
        {netByCurrency.map((e, i) => (
          <span
            key={e.currencyCode}
            data-testid={`net-by-currency-${e.currencyCode}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {!isCompact && i > 0 && (
              <span style={{ color: '#9aa0a6', fontSize: '14px', lineHeight: '1' }}>·</span>
            )}
            <span
              data-testid={`net-by-currency-value-${e.currencyCode}`}
              style={{
                fontFamily: "'Roboto', sans-serif",
                color: e.total < 0 ? '#f28b82' : '#e8eaed',
                fontSize,
                fontWeight: 500,
              }}
            >
              {formatCurrency(e.total, e.currencyCode, e.decimalPlaces)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Warning chip ─────────────────────────────────────────────────────────────

interface WarningChipProps {
  label: string
  title?: string
  testId?: string
}

function WarningChip({ label, title, testId }: WarningChipProps) {
  return (
    <span
      data-testid={testId ?? 'warning-chip'}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#3c2e0033',
        color: '#f9ab00',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: "'Roboto', sans-serif",
        cursor: title ? 'help' : 'default',
      }}
    >
      ⚠ {label}
    </span>
  )
}

// ─── Unavailable banner ───────────────────────────────────────────────────────

function UnavailableBanner() {
  return (
    <div
      data-testid="unavailable-banner"
      role="note"
      style={{
        backgroundColor: '#1a237e22',
        border: '1px solid #8ab4f8',
        borderRadius: '6px',
        padding: '12px 16px',
        color: '#8ab4f8',
        fontSize: '13px',
        fontFamily: "'Roboto', sans-serif",
        lineHeight: '1.6',
      }}
    >
      ℹ Activá "Convert to primary currency" en tus ajustes de Firefly III para ver un net worth
      consolidado.{' '}
      <a
        href="https://docs.firefly-iii.org/explanation/financial-concepts/exchange-rates/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#8ab4f8', textDecoration: 'underline' }}
      >
        Ver docs
      </a>
    </div>
  )
}

// ─── Net Worth header ─────────────────────────────────────────────────────────

interface NetWorthHeaderProps {
  netWorth: NetWorthResult
  isCompact: boolean
  primaryFontSize: string
  sublineFontSize: string
}

function NetWorthHeader({ netWorth, isCompact, primaryFontSize, sublineFontSize }: NetWorthHeaderProps) {
  const { status } = netWorth

  if (status === 'error') {
    return (
      <div
        data-testid="net-worth-error"
        style={{ fontFamily: "'Roboto', sans-serif", color: '#f28b82', fontSize: '14px' }}
      >
        Failed to load balances. Please try again.
      </div>
    )
  }

  if (status === 'unavailable') {
    const { fallbackPerCurrency } = netWorth
    if (fallbackPerCurrency.length === 0) return null
    return (
      <div
        data-testid="net-worth-fallback"
        style={
          isCompact
            ? { display: 'flex', flexDirection: 'column' as const, gap: '4px' }
            : { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }
        }
      >
        {fallbackPerCurrency.map((f, i) => (
          <span
            key={f.currencyCode}
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
                fontSize: primaryFontSize,
                fontWeight: 600,
              }}
            >
              {formatCurrency(f.total, f.currencyCode, f.decimalPlaces)}
            </span>
          </span>
        ))}
      </div>
    )
  }

  if (netWorth.primaryTotal === null || netWorth.primaryCurrency === null) return null

  const { primaryTotal, primaryCurrency, secondaries } = netWorth
  const visibleSecondaries = secondaries.filter((s) => s.value !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        data-testid="net-worth-primary"
        style={{
          fontFamily: "'Roboto', sans-serif",
          color: '#e8eaed',
          fontSize: primaryFontSize,
          fontWeight: 600,
        }}
      >
        {formatCurrency(primaryTotal, primaryCurrency.code, primaryCurrency.decimalPlaces)}
      </div>

      {visibleSecondaries.length > 0 && (
        <div
          data-testid="net-worth-subline"
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '4px 12px',
            overflowWrap: 'anywhere' as const,
          }}
        >
          {visibleSecondaries.map((sec: NetWorthConvertedValue, i) => (
            <span key={sec.currencyCode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isCompact && i > 0 && (
                <span style={{ color: '#9aa0a6', fontSize: '16px', lineHeight: '1' }}>·</span>
              )}
              <span
                data-testid={`net-worth-secondary-${sec.currencyCode}`}
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  color: '#9aa0a6',
                  fontSize: sublineFontSize,
                  fontWeight: 400,
                }}
              >
                {formatCurrency(sec.value as number, sec.currencyCode, sec.currencyDecimalPlaces)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Warning chips row ────────────────────────────────────────────────────────

function WarningChipsRow({ netWorth }: { netWorth: NetWorthResult }) {
  const { status } = netWorth
  if (status !== 'partial' && status !== 'partialSecondary') return null

  const missingSecondaries = netWorth.secondaries.filter((s) => s.value === null)
  const allSecondariesMissing =
    netWorth.secondaries.length > 0 && missingSecondaries.length === netWorth.secondaries.length

  const hasExcluded = status === 'partial' && netWorth.excludedAccounts.length > 0
  const hasMissing = missingSecondaries.length > 0

  if (!hasExcluded && !hasMissing) return null

  return (
    <div
      data-testid="warning-chips"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}
    >
      {hasExcluded && (
        <WarningChip
          testId="chip-excluded"
          label={`${netWorth.excludedAccounts.length} cuentas excluidas`}
          title={netWorth.excludedAccounts.map((a) => `${a.name} (${a.currencyCode})`).join('\n')}
        />
      )}
      {allSecondariesMissing ? (
        <WarningChip
          testId="chip-all-rates-missing"
          label="No secondary rates available"
          title="No hay tasas de cambio disponibles para las monedas secundarias. Configurá las tasas en Firefly III."
        />
      ) : (
        missingSecondaries.map((s) => (
          <WarningChip
            key={s.currencyCode}
            testId={`chip-rate-missing-${s.currencyCode}`}
            label={`${s.currencyCode} rate missing`}
            title={`Configurá la tasa de cambio para ${s.currencyCode} en Firefly III.`}
          />
        ))
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccountBalancePanel({ netWorth, accounts }: AccountBalancePanelProps) {
  const breakpoint = useBreakpoint()
  const isCompact = breakpoint !== 'desktop'

  const primaryFontSize = isCompact ? '26px' : '32px'
  const sublineFontSize = isCompact ? '12px' : '14px'
  const balanceFontSize = { mobile: '14px', tablet: '15px', desktop: '16px' }[breakpoint]

  const cardsStyle =
    breakpoint === 'desktop'
      ? { display: 'flex', flexDirection: 'row' as const, gap: '8px', overflowX: 'auto' as const }
      : breakpoint === 'tablet'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }
        : { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }

  const cardPadding = breakpoint === 'mobile' ? '10px 12px' : '12px 16px'

  const sortedAccounts = useMemo(() => {
    const active = accounts.filter((a) => a.active)
    const byCurrency = new Map<string, Account[]>()
    active.forEach((acc) => {
      const group = byCurrency.get(acc.currencyCode) ?? []
      group.push(acc)
      byCurrency.set(acc.currencyCode, group)
    })
    return Array.from(byCurrency.values()).flatMap((group) =>
      group.sort((a, b) => b.currentBalance - a.currentBalance)
    )
  }, [accounts])

  if (netWorth.status === 'loading') return <SkeletonPanel breakpoint={breakpoint} />

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
            marginBottom: '8px',
          }}
        >
          Net Worth
        </div>
        <NetWorthHeader
          netWorth={netWorth}
          isCompact={isCompact}
          primaryFontSize={primaryFontSize}
          sublineFontSize={sublineFontSize}
        />
        <WarningChipsRow netWorth={netWorth} />
        {(netWorth.status === 'ok' ||
          netWorth.status === 'partial' ||
          netWorth.status === 'partialSecondary') && (
          <NetByCurrencyRow
            netByCurrency={netWorth.netByCurrency}
            isCompact={isCompact}
            fontSize={isCompact ? '14px' : '16px'}
          />
        )}
      </div>

      {/* Unavailable info banner */}
      {netWorth.status === 'unavailable' && <UnavailableBanner />}

      {/* Account cards */}
      {sortedAccounts.length > 0 && (
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
                  color: acc.currentBalance < 0 ? '#f28b82' : '#e8eaed',
                  fontSize: balanceFontSize,
                  fontWeight: 500,
                }}
              >
                {formatCurrency(acc.currentBalance, acc.currencyCode, acc.currencyDecimalPlaces)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
