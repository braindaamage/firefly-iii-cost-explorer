import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useRatesSidecarConfig } from '../../hooks/useRatesSidecarConfig'
import { fetchCurrencies } from '../../api/currencies'
import { previewCron } from '../../lib/cron-preview'
import type { RatesSidecarConfig } from '../../api/ratesSidecarConfig'
import type { Currency } from '../../api/currencies'

interface RatesSidecarSectionProps {
  baseUrl: string
  token: string
}

// ─── Shared styles (mirror ForecastSettingsSection) ───────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  color: '#9aa0a6',
  fontSize: '12px',
  fontFamily: "'Roboto', sans-serif",
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#121212',
  border: '1px solid #3c4043',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e8eaed',
  fontSize: '14px',
  fontFamily: "'Roboto', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#121212',
  border: '1px solid #3c4043',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e8eaed',
  fontSize: '14px',
  fontFamily: "'Roboto', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}

const helperTextStyle: React.CSSProperties = {
  marginTop: '6px',
  color: '#5f6368',
  fontSize: '12px',
  fontFamily: "'Roboto', sans-serif",
}

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#e8eaed',
  fontSize: '14px',
  fontFamily: "'Roboto', sans-serif",
  cursor: 'pointer',
}

// ─── Status panel ─────────────────────────────────────────────────────────────

type LastRunStatus = 'success' | 'partial' | 'failed'

function statusDotColor(status: LastRunStatus | null): string {
  if (status === 'success') return '#81c995'
  if (status === 'partial') return '#f9ab00'
  if (status === 'failed') return '#f28b82'
  return '#9aa0a6'
}

function StatusPanel({
  lastRun,
  lastRunStatus,
}: {
  lastRun: {
    timestamp: string
    status: 'success' | 'failed' | 'partial'
    source: string
    currenciesUpdated: string[]
    currenciesFailed: string[]
    error: string | null
    nextRunEstimated: string | null
  } | null
  lastRunStatus: 'loading' | 'success' | 'error'
}) {
  if (lastRunStatus === 'loading') {
    return (
      <div
        aria-label="Loading last run status"
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {[80, 160, 120].map((w, i) => (
          <div
            key={i}
            style={{
              width: `${w}px`,
              height: '14px',
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (lastRun === null) {
    return (
      <div
        data-testid="last-run-status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#9aa0a6',
          fontSize: '14px',
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#9aa0a6',
            flexShrink: 0,
          }}
        />
        Not run yet
      </div>
    )
  }

  const dot = statusDotColor(lastRun.status)
  const lastRunAgo = formatDistanceToNow(new Date(lastRun.timestamp), { addSuffix: true })
  const nextRunIn = lastRun.nextRunEstimated
    ? formatDistanceToNow(new Date(lastRun.nextRunEstimated), { addSuffix: true })
    : null

  return (
    <div
      data-testid="last-run-status"
      style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: dot,
            flexShrink: 0,
          }}
        />
        <span style={{ color: dot, fontSize: '14px', fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
          {lastRun.status === 'success' ? 'Success' : lastRun.status === 'partial' ? 'Partial' : 'Failed'}
        </span>
      </div>
      <div style={{ color: '#9aa0a6', fontSize: '13px', fontFamily: "'Roboto', sans-serif" }}>
        Last run {lastRunAgo}
        {nextRunIn && ` · Next run ${nextRunIn}`}
      </div>
      {lastRun.currenciesUpdated.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {lastRun.currenciesUpdated.map((c) => (
            <span
              key={c}
              data-testid="currency-chip"
              style={{
                padding: '2px 8px',
                backgroundColor: '#1e3a2e',
                border: '1px solid #81c995',
                borderRadius: '12px',
                color: '#81c995',
                fontSize: '12px',
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {lastRun.status === 'failed' && lastRun.error && (
        <div
          data-testid="last-run-error"
          style={{
            color: '#f28b82',
            fontSize: '13px',
            fontFamily: "'Roboto', sans-serif",
            wordBreak: 'break-word',
          }}
        >
          {lastRun.error.length > 120 ? lastRun.error.slice(0, 120) + '…' : lastRun.error}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RatesSidecarSection({ baseUrl, token }: RatesSidecarSectionProps) {
  const {
    config,
    status,
    source,
    lastRun,
    lastRunStatus,
    updateConfig,
    retryRemote,
    triggerRunNow,
    runNowPending,
    runNowTimedOut,
  } = useRatesSidecarConfig(baseUrl, token)

  // ─── Currencies query ─────────────────────────────────────────────────────
  const currenciesQuery = useQuery({
    queryKey: ['currencies', baseUrl],
    queryFn: () => fetchCurrencies(baseUrl, token),
    staleTime: 5 * 60_000,
    enabled: !!baseUrl && !!token,
  })
  const enabledCurrencies: Currency[] = (currenciesQuery.data ?? []).filter((c) => c.enabled)

  // ─── Local draft state (mirror ForecastSettingsSection B1 pattern) ────────
  const [localConfig, setLocalConfig] = useState<RatesSidecarConfig>(config)

  const isDirty = JSON.stringify(localConfig) !== JSON.stringify(config)

  // Sync local draft when remote config changes, but only when no unsaved edits.
  useEffect(() => {
    if (!isDirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalConfig({ ...config })
    }
  }, [config, isDirty])

  // ─── Cron validation ──────────────────────────────────────────────────────
  const cronPreview = previewCron(localConfig.cronSchedule, 3)

  // ─── Autocomplete state for explicit currencies ───────────────────────────
  const [currencyInput, setCurrencyInput] = useState('')
  const [showCurrencySuggestions, setShowCurrencySuggestions] = useState(false)

  const filteredCurrencySuggestions = enabledCurrencies
    .filter(
      (c) =>
        currencyInput.length > 0 &&
        (c.code.toLowerCase().includes(currencyInput.toLowerCase()) ||
          c.name.toLowerCase().includes(currencyInput.toLowerCase())) &&
        !localConfig.explicitCurrencies.includes(c.code)
    )
    .slice(0, 8)

  const hasValidationErrors = !cronPreview.valid

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleCronChange(value: string) {
    setLocalConfig((prev) => ({ ...prev, cronSchedule: value }))
  }

  function handleRemoveCurrency(code: string) {
    setLocalConfig((prev) => ({
      ...prev,
      explicitCurrencies: prev.explicitCurrencies.filter((c) => c !== code),
    }))
  }

  function handleAddCurrency(code: string) {
    if (!localConfig.explicitCurrencies.includes(code)) {
      setLocalConfig((prev) => ({
        ...prev,
        explicitCurrencies: [...prev.explicitCurrencies, code],
      }))
    }
    setCurrencyInput('')
    setShowCurrencySuggestions(false)
  }

  function handleSave() {
    updateConfig(localConfig)
  }

  function handleRevert() {
    setLocalConfig({ ...config })
  }

  async function handleRunNow() {
    await triggerRunNow()
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div
        aria-label="Loading exchange rates settings"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {[140, '100%', '100%', '100%'].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: i === 0 ? 14 : 42,
              backgroundColor: '#2d2d2d',
              borderRadius: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <h2
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 500,
          fontSize: '16px',
          color: '#e8eaed',
          margin: 0,
        }}
      >
        Exchange rates auto-update
      </h2>

      {/* Status panel */}
      <StatusPanel lastRun={lastRun} lastRunStatus={lastRunStatus} />

      {/* Enabled toggle */}
      <div>
        <label style={{ ...radioLabelStyle, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => setLocalConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
            aria-label="Enable exchange rates auto-update"
            style={{ accentColor: '#8ab4f8', width: '16px', height: '16px' }}
          />
          <span style={{ ...labelStyle, display: 'inline', margin: 0 }}>
            Enable auto-update
          </span>
        </label>
      </div>

      {/* Schedule (cron) input */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <label htmlFor="cron-schedule" style={{ ...labelStyle, display: 'inline', margin: 0 }}>
            Schedule (cron)
          </label>
          <span
            title="Cron expression — 5 fields: min hour day month weekday"
            aria-label="Cron help: 5 fields — min hour day month weekday"
            style={{
              color: '#9aa0a6',
              fontSize: '12px',
              fontFamily: "'Roboto', sans-serif",
              cursor: 'help',
              border: '1px solid #3c4043',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ?
          </span>
        </div>
        <input
          id="cron-schedule"
          type="text"
          value={localConfig.cronSchedule}
          onChange={(e) => handleCronChange(e.target.value)}
          aria-label="Cron schedule"
          style={{
            ...inputStyle,
            borderColor: !cronPreview.valid ? '#f28b82' : '#3c4043',
          }}
        />
        {!cronPreview.valid && (
          <p
            data-testid="cron-error"
            style={{ ...helperTextStyle, color: '#f28b82', marginTop: '4px' }}
          >
            {cronPreview.error}
          </p>
        )}
        {cronPreview.valid && (
          <div style={{ marginTop: '8px' }}>
            <p style={helperTextStyle}>Next 3 runs:</p>
            <ul
              data-testid="cron-preview"
              style={{
                margin: '4px 0 0',
                padding: '0 0 0 16px',
                color: '#9aa0a6',
                fontSize: '12px',
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              {cronPreview.nextRuns.map((d, i) => (
                <li key={i}>{d.toLocaleString()}</li>
              ))}
            </ul>
            <p style={{ ...helperTextStyle, marginTop: '4px' }}>
              Times shown in your browser timezone. The sidecar runs in its own container timezone.
            </p>
          </div>
        )}
      </div>

      {/* Primary source radio group */}
      <div>
        <label style={labelStyle}>Primary source</label>
        <div style={radioGroupStyle} role="radiogroup" aria-label="Primary source">
          {[
            { value: 'open-er-api', label: 'open.er-api.com (recommended)' },
            { value: 'ecb', label: 'ECB' },
          ].map(({ value, label }) => (
            <label key={value} style={radioLabelStyle}>
              <input
                type="radio"
                name="primary-source"
                value={value}
                checked={localConfig.primarySource === value}
                onChange={() =>
                  setLocalConfig((prev) => ({ ...prev, primarySource: value as RatesSidecarConfig['primarySource'] }))
                }
                aria-label={label}
                style={{ accentColor: '#8ab4f8' }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Fallback enabled checkbox */}
      <div>
        <label style={{ ...radioLabelStyle, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={localConfig.fallbackEnabled}
            onChange={(e) =>
              setLocalConfig((prev) => ({ ...prev, fallbackEnabled: e.target.checked }))
            }
            aria-label="Enable fallback source"
            style={{ accentColor: '#8ab4f8', width: '16px', height: '16px' }}
          />
          <span style={{ ...labelStyle, display: 'inline', margin: 0 }}>
            Enable fallback source
          </span>
        </label>
      </div>

      {/* Fallback source radio group (hidden if fallbackEnabled is false) */}
      {localConfig.fallbackEnabled && (
        <div style={{ paddingLeft: '24px' }}>
          <label style={labelStyle}>Fallback source</label>
          <div style={radioGroupStyle} role="radiogroup" aria-label="Fallback source">
            {[
              { value: 'open-er-api', label: 'open.er-api.com' },
              { value: 'ecb', label: 'ECB' },
            ].map(({ value, label }) => (
              <label key={value} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="fallback-source"
                  value={value}
                  checked={localConfig.fallbackSource === value}
                  onChange={() =>
                    setLocalConfig((prev) => ({ ...prev, fallbackSource: value as RatesSidecarConfig['fallbackSource'] }))
                  }
                  aria-label={label}
                  style={{ accentColor: '#8ab4f8' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Currency mode radio */}
      <div>
        <label style={labelStyle}>Currency mode</label>
        <div style={radioGroupStyle} role="radiogroup" aria-label="Currency mode">
          {[
            { value: 'active', label: 'Active currencies (auto)' },
            { value: 'explicit', label: 'Explicit list' },
          ].map(({ value, label }) => (
            <label key={value} style={radioLabelStyle}>
              <input
                type="radio"
                name="currency-mode"
                value={value}
                checked={localConfig.currencyMode === value}
                onChange={() =>
                  setLocalConfig((prev) => ({ ...prev, currencyMode: value as RatesSidecarConfig['currencyMode'] }))
                }
                aria-label={label}
                style={{ accentColor: '#8ab4f8' }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Explicit currencies chips (visible when currencyMode === 'explicit') */}
      {localConfig.currencyMode === 'explicit' && (
        <div>
          <label style={labelStyle}>Explicit currencies</label>

          {/* Existing chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {localConfig.explicitCurrencies.map((code) => (
              <span
                key={code}
                data-testid="explicit-currency-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  backgroundColor: '#1e2a38',
                  border: '1px solid #8ab4f8',
                  borderRadius: '12px',
                  color: '#8ab4f8',
                  fontSize: '12px',
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                {code}
                <button
                  type="button"
                  onClick={() => handleRemoveCurrency(code)}
                  aria-label={`Remove ${code}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8ab4f8',
                    fontSize: '14px',
                    padding: '0',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Autocomplete input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={currencyInput}
              onChange={(e) => {
                setCurrencyInput(e.target.value)
                setShowCurrencySuggestions(true)
              }}
              onFocus={() => setShowCurrencySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCurrencySuggestions(false), 150)}
              placeholder="Add currency…"
              aria-label="Add explicit currency"
              style={{ ...inputStyle, width: '200px' }}
            />
            {showCurrencySuggestions && filteredCurrencySuggestions.length > 0 && (
              <ul
                data-testid="currency-suggestions"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 10,
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #3c4043',
                  borderRadius: '6px',
                  listStyle: 'none',
                  margin: '4px 0 0',
                  padding: '4px 0',
                  width: '200px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {filteredCurrencySuggestions.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onMouseDown={() => handleAddCurrency(c.code)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '8px 12px',
                        color: '#e8eaed',
                        fontSize: '14px',
                        fontFamily: "'Roboto', sans-serif",
                        cursor: 'pointer',
                      }}
                    >
                      {c.code} — {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {currenciesQuery.isError && (
              <p style={helperTextStyle}>Could not load currencies</p>
            )}
          </div>
        </div>
      )}

      {/* Base currency dropdown */}
      <div>
        <label htmlFor="base-currency" style={labelStyle}>
          Base currency
        </label>
        <select
          id="base-currency"
          value={localConfig.baseCurrency}
          onChange={(e) =>
            setLocalConfig((prev) => ({ ...prev, baseCurrency: e.target.value }))
          }
          aria-label="Base currency"
          style={selectStyle}
        >
          {enabledCurrencies.length === 0 && (
            <option value={localConfig.baseCurrency}>{localConfig.baseCurrency}</option>
          )}
          {enabledCurrencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        {currenciesQuery.isError && (
          <p style={helperTextStyle}>Could not load currencies</p>
        )}
      </div>

      {/* Button row: Save | Run now | Revert */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || hasValidationErrors}
          aria-label="Save rates sidecar settings"
          style={{
            backgroundColor: isDirty && !hasValidationErrors ? '#8ab4f8' : '#3c4043',
            border: 'none',
            borderRadius: '9999px',
            padding: '10px 20px',
            color: isDirty && !hasValidationErrors ? '#121212' : '#9aa0a6',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: "'Roboto', sans-serif",
            cursor: isDirty && !hasValidationErrors ? 'pointer' : 'not-allowed',
          }}
        >
          Save
        </button>

        <button
          type="button"
          onClick={handleRunNow}
          disabled={!config.enabled || runNowPending}
          aria-label="Run now"
          style={{
            background: 'transparent',
            border: '1px solid #3c4043',
            borderRadius: '9999px',
            padding: '9px 20px',
            color: config.enabled && !runNowPending ? '#8ab4f8' : '#9aa0a6',
            fontSize: '14px',
            fontFamily: "'Roboto', sans-serif",
            cursor: config.enabled && !runNowPending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {runNowPending && (
            <span
              data-testid="run-now-spinner"
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #9aa0a6',
                borderTopColor: '#8ab4f8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          )}
          {runNowPending ? 'Running…' : 'Run now'}
        </button>

        <button
          type="button"
          onClick={handleRevert}
          disabled={!isDirty}
          aria-label="Revert changes"
          style={{
            background: 'none',
            border: 'none',
            padding: '9px 12px',
            color: isDirty ? '#9aa0a6' : '#5f6368',
            fontSize: '14px',
            fontFamily: "'Roboto', sans-serif",
            cursor: isDirty ? 'pointer' : 'not-allowed',
          }}
        >
          Revert
        </button>
      </div>

      {/* Sync status (mirror ForecastSettingsSection pattern) */}
      <div
        style={{
          fontSize: '12px',
          fontFamily: "'Roboto', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '20px',
        }}
      >
        {source === 'remote' && status === 'success' && (
          <span data-testid="sync-status" style={{ color: '#81c995' }}>
            ✓ Saved to Firefly III
          </span>
        )}
        {status === 'localFallback' && (
          <>
            <span data-testid="sync-status" style={{ color: '#f9ab00' }}>
              ⚠ Using local backup — sync failed
            </span>
            <button
              type="button"
              onClick={retryRemote}
              aria-label="Retry sync with Firefly III"
              style={{
                background: 'none',
                border: '1px solid #3c4043',
                borderRadius: '4px',
                padding: '2px 8px',
                color: '#8ab4f8',
                fontSize: '12px',
                fontFamily: "'Roboto', sans-serif",
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </>
        )}
        {status === 'error' && (
          <span data-testid="sync-status" style={{ color: '#f28b82' }}>
            ✕ Could not load from Firefly III
          </span>
        )}
        {source === 'default' && status === 'success' && (
          <span data-testid="sync-status" style={{ color: '#9aa0a6' }}>
            Using default settings
          </span>
        )}
        {runNowTimedOut && (
          <span data-testid="run-now-timeout" style={{ color: '#9aa0a6' }}>
            Run didn't complete in time. Check sidecar logs.
          </span>
        )}
      </div>
    </div>
  )
}
