import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartHeader } from './ChartHeader'
import { useBreakpoint } from '../../hooks/useBreakpoint'

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

const defaultProps = {
  showCumulative: false,
  onToggleCumulative: vi.fn(),
  granularity: 'auto' as const,
  onGranularityChange: vi.fn(),
}

describe('ChartHeader', () => {
  it('renders the title "Spending Trend"', () => {
    render(<ChartHeader {...defaultProps} />)
    expect(screen.getByText('Spending Trend')).toBeInTheDocument()
  })

  it('renders the "Show cumulative" label', () => {
    render(<ChartHeader {...defaultProps} />)
    expect(screen.getByText('Show cumulative')).toBeInTheDocument()
  })

  it('toggle switch shows aria-checked=false when showCumulative is false', () => {
    render(<ChartHeader {...defaultProps} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle switch shows aria-checked=true when showCumulative is true', () => {
    render(<ChartHeader {...defaultProps} showCumulative={true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onToggleCumulative when toggle is clicked', async () => {
    const onToggle = vi.fn()
    render(<ChartHeader {...defaultProps} onToggleCumulative={onToggle} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders three-dot menu button', () => {
    render(<ChartHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /chart menu/i })).toBeInTheDocument()
  })

  it('opens dropdown with "Download as PNG" when menu button is clicked', async () => {
    render(<ChartHeader {...defaultProps} onExportPNG={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /chart menu/i }))
    expect(screen.getByText('Download as PNG')).toBeInTheDocument()
  })

  it('calls onExportPNG when "Download as PNG" is clicked', async () => {
    const onExportPNG = vi.fn()
    render(<ChartHeader {...defaultProps} onExportPNG={onExportPNG} />)
    await userEvent.click(screen.getByRole('button', { name: /chart menu/i }))
    await userEvent.click(screen.getByText('Download as PNG'))
    expect(onExportPNG).toHaveBeenCalledOnce()
  })

  it('renders 4 granularity buttons: Auto, Day, Week, Month', () => {
    render(<ChartHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument()
  })

  it('calls onGranularityChange with the right value when a granularity button is clicked', async () => {
    const onGranularityChange = vi.fn()
    render(<ChartHeader {...defaultProps} onGranularityChange={onGranularityChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Week' }))
    expect(onGranularityChange).toHaveBeenCalledWith('week')
  })

  it('active granularity button has aria-pressed=true', () => {
    render(<ChartHeader {...defaultProps} granularity="month" />)
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('ChartHeader — tablet', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
  })

  it('renders granularity buttons in a second row on tablet', () => {
    render(<ChartHeader {...defaultProps} />)
    // On tablet (isCompact), granularity buttons are rendered in the compact row
    const buttons = screen.getAllByRole('button', { name: /auto|day|week|month/i })
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })

  it('granularity buttons have flex: 1 on tablet', () => {
    render(<ChartHeader {...defaultProps} />)
    // On tablet (isCompact), only the compact row is rendered (not the inline segmented control)
    const autoButton = screen.getByRole('button', { name: 'Auto' })
    expect(autoButton).toHaveStyle('flex: 1')
  })
})
