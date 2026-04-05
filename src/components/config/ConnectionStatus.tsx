export type ConnectionState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; version: string }
  | { status: 'error'; message: string }

interface ConnectionStatusProps {
  state: ConnectionState
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  if (state.status === 'idle') return null

  if (state.status === 'testing') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#9aa0a6',
        }}
        aria-live="polite"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'spin 1s linear infinite' }}
          aria-hidden="true"
        >
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#9aa0a6"
            strokeWidth="2"
            fill="none"
            strokeDasharray="30 70"
          />
        </svg>
        <span style={{ fontSize: '14px' }}>Testing connection...</span>
      </div>
    )
  }

  if (state.status === 'success') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#81c995',
        }}
        aria-live="polite"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="#81c995"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontSize: '14px' }}>
          Connected to Firefly III v{state.version}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#f28b82',
      }}
      aria-live="polite"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="#f28b82"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: '14px' }}>{state.message}</span>
    </div>
  )
}
