import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartLegend } from './ChartLegend'
import type { SeriesData } from '../../hooks/useDashboardData'

const mockSeries: SeriesData[] = [
  { id: '1', name: 'Groceries', color: '#4285f4' },
  { id: '2', name: 'Transport', color: '#34a853' },
  { id: '3', name: 'Housing', color: '#fbbc05' },
]

describe('ChartLegend', () => {
  it('renders all series names', () => {
    render(<ChartLegend series={mockSeries} />)
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument()
  })

  it('renders color dots for each series', () => {
    const { container } = render(<ChartLegend series={mockSeries} />)
    const dots = container.querySelectorAll('[aria-hidden="true"]')
    expect(dots).toHaveLength(3)
  })

  it('applies correct background color to each dot', () => {
    const { container } = render(<ChartLegend series={mockSeries} />)
    const dots = Array.from(container.querySelectorAll('[aria-hidden="true"]'))
    expect((dots[0] as HTMLElement).style.backgroundColor).toBe('rgb(66, 133, 244)')
    expect((dots[1] as HTMLElement).style.backgroundColor).toBe('rgb(52, 168, 83)')
  })

  it('renders nothing for empty series', () => {
    const { container } = render(<ChartLegend series={[]} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})
