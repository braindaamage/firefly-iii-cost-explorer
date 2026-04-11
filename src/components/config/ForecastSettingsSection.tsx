import { useState, useEffect } from 'react'
import { useForecastConfig } from '../../hooks/useForecastConfig'
import type { ForecastConfig } from '../../hooks/useForecastConfig'

interface ForecastSettingsSectionProps {
  baseUrl: string
  token: string
}

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

const helperTextStyle: React.CSSProperties = {
  marginTop: '6px',
  color: '#5f6368',
  fontSize: '12px',
  fontFamily: "'Roboto', sans-serif",
}

export function ForecastSettingsSection({ baseUrl, token }: ForecastSettingsSectionProps) {
  const { config, status, source, updateConfig, retryRemote } = useForecastConfig(baseUrl, token)

  // Local draft — syncs from remote config on initial load and after save
  const [localConfig, setLocalConfig] = useState<ForecastConfig>(config)

  // Sync local draft when remote config changes (first load, after successful save, after retry)
  useEffect(() => {
    setLocalConfig({ historyMonths: config.historyMonths, model: config.model })
  }, [config.historyMonths, config.model])

  const isDirty =
    localConfig.historyMonths !== config.historyMonths || localConfig.model !== config.model

  if (status === 'loading') {
    return (
      <div
        aria-label="Loading forecast settings"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div
          style={{
            width: '140px',
            height: '14px',
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '42px',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '42px',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s',
          }}
        />
      </div>
    )
  }

  function handleHistoryMonthsChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLocalConfig((prev) => ({ ...prev, historyMonths: parseInt(e.target.value, 10) }))
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLocalConfig((prev) => ({ ...prev, model: e.target.value as ForecastConfig['model'] }))
  }

  function handleSave() {
    updateConfig(localConfig)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 500,
          fontSize: '16px',
          color: '#e8eaed',
          margin: 0,
        }}
      >
        Forecast Settings
      </h2>

      <div>
        <label htmlFor="forecast-history-months" style={labelStyle}>
          History Months
        </label>
        <select
          id="forecast-history-months"
          value={localConfig.historyMonths}
          onChange={handleHistoryMonthsChange}
          style={selectStyle}
          aria-label="History Months"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} month{n !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <p style={helperTextStyle}>
          More months = more stable average, but slower to adapt to spending changes.
        </p>
      </div>

      <div>
        <label htmlFor="forecast-model" style={labelStyle}>
          Forecast Model
        </label>
        <select
          id="forecast-model"
          value={localConfig.model}
          onChange={handleModelChange}
          style={selectStyle}
          aria-label="Forecast Model"
        >
          <option value="weighted">Weighted (recent months weighted more)</option>
          <option value="simple">Simple (equal weight)</option>
        </select>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty}
        aria-label="Save forecast settings"
        style={{
          backgroundColor: isDirty ? '#8ab4f8' : '#3c4043',
          border: 'none',
          borderRadius: '9999px',
          padding: '10px 20px',
          color: isDirty ? '#121212' : '#9aa0a6',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: "'Roboto', sans-serif",
          cursor: isDirty ? 'pointer' : 'not-allowed',
          alignSelf: 'flex-start',
        }}
      >
        Save
      </button>

      {/* Sync status */}
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
      </div>
    </div>
  )
}
