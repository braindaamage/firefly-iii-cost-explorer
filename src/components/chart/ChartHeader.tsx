interface ChartHeaderProps {
  showCumulative: boolean
  onToggleCumulative: () => void
}

export function ChartHeader({ showCumulative, onToggleCumulative }: ChartHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        Spending Trend
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Toggle cumulative */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <button
            type="button"
            role="switch"
            aria-checked={showCumulative}
            onClick={onToggleCumulative}
            aria-label="Toggle cumulative"
            style={{
              width: '32px',
              height: '16px',
              borderRadius: '9999px',
              border: showCumulative ? 'none' : '1px solid #3c4043',
              backgroundColor: showCumulative ? '#8ab4f8' : '#121212',
              cursor: 'pointer',
              position: 'relative',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: showCumulative ? '16px' : '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: showCumulative ? '#121212' : '#9aa0a6',
                transition: 'left 0.15s ease',
              }}
            />
          </button>
          <span
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 400,
              fontSize: '12px',
              color: '#e8eaed',
              userSelect: 'none',
            }}
          >
            Show cumulative
          </span>
        </label>

        {/* Three-dot menu button */}
        <button
          type="button"
          aria-label="Chart menu"
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
