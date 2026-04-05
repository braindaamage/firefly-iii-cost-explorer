import { useState } from 'react'
import { getPresetLabel } from '../../lib/date-utils'
import type { DateRange, TimeRangePreset } from '../../types/filters'

const PRESETS: TimeRangePreset[] = [
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'this_year',
  'custom',
]

const optionStyle: React.CSSProperties = {
  padding: '10px 16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontFamily: "'Roboto', sans-serif",
  fontSize: '13px',
  color: '#e8eaed',
}

interface DateRangeFilterProps {
  currentPreset: TimeRangePreset
  customRange: DateRange | null
  onSelectPreset: (preset: TimeRangePreset) => void
  onSelectCustomRange: (range: DateRange) => void
  onClose: () => void
}

export function DateRangeFilter({
  currentPreset,
  customRange,
  onSelectPreset,
  onSelectCustomRange,
  onClose,
}: DateRangeFilterProps) {
  const [showCustomInputs, setShowCustomInputs] = useState(
    currentPreset === 'custom'
  )
  const [startDate, setStartDate] = useState(customRange?.start ?? '')
  const [endDate, setEndDate] = useState(customRange?.end ?? '')
  const [dateError, setDateError] = useState<string | null>(null)

  function handlePresetClick(preset: TimeRangePreset) {
    if (preset === 'custom') {
      setShowCustomInputs(true)
    } else {
      onSelectPreset(preset)
      onClose()
    }
  }

  function handleApplyCustom() {
    if (startDate && endDate) {
      if (startDate > endDate) {
        setDateError('End date must be after start date')
        return
      }
      setDateError(null)
      onSelectCustomRange({ start: startDate, end: endDate })
      onClose()
    }
  }

  return (
    <div>
      {PRESETS.map((preset) => (
        <div
          key={preset}
          role="option"
          aria-selected={currentPreset === preset}
          onClick={() => handlePresetClick(preset)}
          style={optionStyle}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.backgroundColor = ''
          }}
        >
          <span>{getPresetLabel(preset)}</span>
          {currentPreset === preset && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8ab4f8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="selected"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      ))}

      {showCustomInputs && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #3c4043',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              backgroundColor: '#121212',
              border: '1px solid #3c4043',
              borderRadius: '4px',
              color: '#e8eaed',
              padding: '6px 8px',
              fontSize: '13px',
              fontFamily: "'Roboto', sans-serif",
              colorScheme: 'dark',
            }}
          />
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              backgroundColor: '#121212',
              border: '1px solid #3c4043',
              borderRadius: '4px',
              color: '#e8eaed',
              padding: '6px 8px',
              fontSize: '13px',
              fontFamily: "'Roboto', sans-serif",
              colorScheme: 'dark',
            }}
          />
          {dateError && (
            <span
              role="alert"
              style={{ color: '#f28b82', fontSize: '12px' }}
            >
              {dateError}
            </span>
          )}
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!startDate || !endDate}
            style={{
              backgroundColor: '#8ab4f8',
              border: 'none',
              borderRadius: '4px',
              color: '#121212',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: startDate && endDate ? 'pointer' : 'not-allowed',
              opacity: startDate && endDate ? 1 : 0.5,
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
