interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      style={{
        backgroundColor: 'rgba(242, 139, 130, 0.15)',
        border: '1px solid #f28b82',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <span
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontSize: '14px',
          color: '#f28b82',
        }}
      >
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'none',
            border: '1px solid #f28b82',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: "'Roboto', sans-serif",
            fontSize: '13px',
            color: '#f28b82',
            padding: '4px 12px',
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
