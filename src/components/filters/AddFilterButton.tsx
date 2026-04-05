import { useRef, useState } from 'react'
import { FilterDropdown } from './FilterDropdown'
import type { OptionalFilterKey } from '../../types/filters'

const FILTER_LABELS: Record<OptionalFilterKey, string> = {
  budgetIds: 'Budgets',
  tagIds: 'Tags',
}

interface AddFilterButtonProps {
  availableFilters: OptionalFilterKey[]
  onAdd: (key: OptionalFilterKey) => void
}

export function AddFilterButton({ availableFilters, onAdd }: AddFilterButtonProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (availableFilters.length === 0) return null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Add filter"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: '1px dashed #3c4043',
          borderRadius: '9999px',
          padding: '7px 13px',
          cursor: 'pointer',
          color: '#8ab4f8',
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 500,
          fontSize: '12px',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Filter
      </button>

      <FilterDropdown open={open} onClose={() => setOpen(false)} anchorRef={buttonRef}>
        {availableFilters.map((key) => (
          <div
            key={key}
            role="option"
            aria-selected={false}
            onClick={() => {
              onAdd(key)
              setOpen(false)
            }}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              fontFamily: "'Roboto', sans-serif",
              fontSize: '13px',
              color: '#e8eaed',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.backgroundColor = ''
            }}
          >
            {FILTER_LABELS[key]}
          </div>
        ))}
      </FilterDropdown>
    </div>
  )
}
