export type SortDirection = 'asc' | 'desc' | null

interface SortableHeaderProps {
  label: string
  direction: SortDirection
  onSort: (next: SortDirection) => void
}

function nextDirection(current: SortDirection): SortDirection {
  if (current === null) return 'desc'
  if (current === 'desc') return 'asc'
  return null
}

export function SortableHeader({ label, direction, onSort }: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => onSort(nextDirection(direction))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: "'Roboto', sans-serif",
        fontWeight: 500,
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        color: '#9aa0a6',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {direction === 'asc' && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="sorted ascending"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )}
      {direction === 'desc' && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="sorted descending"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      )}
    </button>
  )
}
