import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createApiClient } from '../../api/client'
import { useConfig } from '../../hooks/useConfig'
import { maskToken } from '../../lib/mask-token'
import { ErrorBanner } from '../ui/ErrorBanner'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionState } from './ConnectionStatus'

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#121212',
  border: '1px solid #3c4043',
  borderRadius: '8px',
  padding: '12px 16px',
  color: '#e8eaed',
  fontSize: '14px',
  fontFamily: "'Roboto', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
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

export function ConfigScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAuthError = searchParams.get('error') === 'auth'
  const { config, saveConfig } = useConfig()

  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? '')
  const [apiToken, setApiToken] = useState(config?.apiToken ?? '')
  const [editingToken, setEditingToken] = useState(!config)
  const [showToken, setShowToken] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'idle',
  })

  const hasInput = baseUrl.trim() !== '' && apiToken.trim() !== ''
  const isTesting = connectionState.status === 'testing'
  const canSave = connectionState.status === 'success'

  function cleanUrl(url: string): string {
    return url.trim().replace(/\/+$/, '')
  }

  async function handleTestConnection() {
    const cleanedUrl = cleanUrl(baseUrl)
    setBaseUrl(cleanedUrl)

    try {
      new URL(cleanedUrl)
    } catch {
      setConnectionState({
        status: 'error',
        message:
          'Invalid URL format. Please enter a valid URL (e.g., https://firefly.example.com).',
      })
      return
    }

    setConnectionState({ status: 'testing' })

    const client = createApiClient(cleanedUrl, apiToken.trim())
    const result = await client.testConnection()

    if (result.success && result.version) {
      setConnectionState({ status: 'success', version: result.version })
    } else {
      setConnectionState({
        status: 'error',
        message: result.error ?? 'Unknown error occurred.',
      })
    }
  }

  function handleCancelEditToken() {
    setApiToken(config?.apiToken ?? '')
    setEditingToken(false)
    setConnectionState({ status: 'idle' })
  }

  function handleSave() {
    saveConfig({ baseUrl: cleanUrl(baseUrl), apiToken: apiToken.trim() })
    navigate('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121212',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid #3c4043',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {isAuthError && (
          <ErrorBanner message="Your session expired or the API token is invalid. Please reconnect." />
        )}

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 500,
              fontSize: '24px',
              color: '#e8eaed',
              margin: 0,
            }}
          >
            Firefly III Cost Explorer
          </h1>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 400,
              fontSize: '14px',
              color: '#9aa0a6',
              margin: '8px 0 0',
            }}
          >
            Connect to your Firefly III instance
          </p>
        </div>

        <div>
          <label htmlFor="base-url" style={labelStyle}>
            Base URL
          </label>
          <input
            id="base-url"
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value)
              setConnectionState({ status: 'idle' })
            }}
            placeholder="https://firefly.example.com"
            style={inputStyle}
            aria-label="Base URL"
          />
        </div>

        <div>
          <label htmlFor="api-token" style={labelStyle}>
            API Token
          </label>
          {!editingToken ? (
            <div style={{ position: 'relative' }}>
              <div
                id="api-token"
                data-testid="token-mask"
                aria-label="Current API token (masked)"
                style={{
                  ...inputStyle,
                  paddingRight: '72px',
                  color: '#9aa0a6',
                  letterSpacing: '0.12em',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {maskToken(apiToken)}
              </div>
              <button
                type="button"
                onClick={() => setEditingToken(true)}
                aria-label="Edit token"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8ab4f8',
                  fontSize: '13px',
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 500,
                  padding: '0',
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative' }}>
                <input
                  id="api-token"
                  type={showToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => {
                    setApiToken(e.target.value)
                    setConnectionState({ status: 'idle' })
                  }}
                  placeholder="Personal Access Token"
                  style={{
                    ...inputStyle,
                    paddingRight: '44px',
                  }}
                  aria-label="API Token"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9aa0a6',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showToken ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  )}
                </button>
              </div>
              {config && (
                <button
                  type="button"
                  onClick={handleCancelEditToken}
                  aria-label="Cancel edit token"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9aa0a6',
                    fontSize: '12px',
                    fontFamily: "'Roboto', sans-serif",
                    padding: '4px 0 0',
                    display: 'block',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        <ConnectionStatus state={connectionState} />

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!hasInput || isTesting}
          style={{
            background: 'transparent',
            border: '1px solid #3c4043',
            borderRadius: '9999px',
            padding: '8px 24px',
            color: '#8ab4f8',
            fontSize: '14px',
            fontFamily: "'Roboto', sans-serif",
            cursor: hasInput && !isTesting ? 'pointer' : 'not-allowed',
            opacity: hasInput && !isTesting ? 1 : 0.5,
            alignSelf: 'center',
          }}
        >
          Test Connection
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          style={{
            backgroundColor: canSave ? '#8ab4f8' : '#3c4043',
            border: 'none',
            borderRadius: '9999px',
            padding: '12px 24px',
            color: canSave ? '#121212' : '#9aa0a6',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: "'Roboto', sans-serif",
            cursor: canSave ? 'pointer' : 'not-allowed',
            width: '100%',
          }}
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  )
}
