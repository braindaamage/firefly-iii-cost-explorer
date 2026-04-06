import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartHeader } from './ChartHeader'

describe('ChartHeader', () => {
  it('renders the title "Spending Trend"', () => {
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} />)
    expect(screen.getByText('Spending Trend')).toBeInTheDocument()
  })

  it('renders the "Show cumulative" label', () => {
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} />)
    expect(screen.getByText('Show cumulative')).toBeInTheDocument()
  })

  it('toggle switch shows aria-checked=false when showCumulative is false', () => {
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle switch shows aria-checked=true when showCumulative is true', () => {
    render(<ChartHeader showCumulative={true} onToggleCumulative={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onToggleCumulative when toggle is clicked', async () => {
    const onToggle = vi.fn()
    render(<ChartHeader showCumulative={false} onToggleCumulative={onToggle} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders three-dot menu button', () => {
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} />)
    expect(screen.getByRole('button', { name: /chart menu/i })).toBeInTheDocument()
  })

  it('opens dropdown with "Download as PNG" when menu button is clicked', async () => {
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} onExportPNG={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /chart menu/i }))
    expect(screen.getByText('Download as PNG')).toBeInTheDocument()
  })

  it('calls onExportPNG when "Download as PNG" is clicked', async () => {
    const onExportPNG = vi.fn()
    render(<ChartHeader showCumulative={false} onToggleCumulative={vi.fn()} onExportPNG={onExportPNG} />)
    await userEvent.click(screen.getByRole('button', { name: /chart menu/i }))
    await userEvent.click(screen.getByText('Download as PNG'))
    expect(onExportPNG).toHaveBeenCalledOnce()
  })
})
