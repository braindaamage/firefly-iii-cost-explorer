import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangeFilter } from './DateRangeFilter'

const defaultProps = {
  currentPreset: 'last_30_days' as const,
  customRange: null,
  onSelectPreset: vi.fn(),
  onSelectCustomRange: vi.fn(),
  onClose: vi.fn(),
}

describe('DateRangeFilter', () => {
  it('renders all presets', () => {
    render(<DateRangeFilter {...defaultProps} />)
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
    expect(screen.getByText('Last month')).toBeInTheDocument()
    expect(screen.getByText('Last 3 months')).toBeInTheDocument()
    expect(screen.getByText('Last 6 months')).toBeInTheDocument()
    expect(screen.getByText('This year')).toBeInTheDocument()
    expect(screen.getByText('Custom range')).toBeInTheDocument()
  })

  it('marks the current preset as selected', () => {
    render(<DateRangeFilter {...defaultProps} currentPreset="this_month" />)
    const thisMonth = screen.getByRole('option', { name: /this month/i })
    expect(thisMonth).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onSelectPreset and onClose when selecting a non-custom preset', async () => {
    const onSelectPreset = vi.fn()
    const onClose = vi.fn()
    render(
      <DateRangeFilter
        {...defaultProps}
        onSelectPreset={onSelectPreset}
        onClose={onClose}
      />
    )
    await userEvent.click(screen.getByText('Last 7 days'))
    expect(onSelectPreset).toHaveBeenCalledWith('last_7_days')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows date inputs when custom range is selected', async () => {
    render(<DateRangeFilter {...defaultProps} />)
    await userEvent.click(screen.getByText('Custom range'))
    expect(screen.getByLabelText('Start date')).toBeInTheDocument()
    expect(screen.getByLabelText('End date')).toBeInTheDocument()
  })

  it('calls onSelectCustomRange and onClose when Apply is clicked with valid dates', async () => {
    const onSelectCustomRange = vi.fn()
    const onClose = vi.fn()
    render(
      <DateRangeFilter
        {...defaultProps}
        currentPreset="custom"
        onSelectCustomRange={onSelectCustomRange}
        onClose={onClose}
      />
    )

    await userEvent.type(screen.getByLabelText('Start date'), '2026-01-01')
    await userEvent.type(screen.getByLabelText('End date'), '2026-03-31')
    await userEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSelectCustomRange).toHaveBeenCalledWith({
      start: '2026-01-01',
      end: '2026-03-31',
    })
    expect(onClose).toHaveBeenCalled()
  })
})
