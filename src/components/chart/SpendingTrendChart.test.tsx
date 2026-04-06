import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpendingTrendChart, accumulateData } from './SpendingTrendChart'

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'desktop',
}))

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      children,
  }
})
import type { ChartDataPoint, SeriesData } from '../../hooks/useDashboardData'

const mockSeries: SeriesData[] = [
  { id: '1', name: 'Groceries', color: '#4285f4' },
  { id: '2', name: 'Transport', color: '#34a853' },
]

const mockData: ChartDataPoint[] = [
  { period: 'Jan 2026', Groceries: 500, Transport: 200 },
  { period: 'Feb 2026', Groceries: 700, Transport: 300 },
  { period: 'Mar 2026', Groceries: 400, Transport: 100 },
]

const defaultProps = {
  data: mockData,
  series: mockSeries,
  currencyCode: 'EUR',
  isLoading: false,
  cumulative: false,
}

describe('SpendingTrendChart', () => {
  it('renders chart container with correct height', () => {
    const { container } = render(<SpendingTrendChart {...defaultProps} />)
    const chartWrapper = container.firstChild as HTMLElement
    expect(chartWrapper.style.height).toBe('400px')
  })

  it('shows loading skeleton when isLoading is true', () => {
    render(<SpendingTrendChart {...defaultProps} isLoading={true} />)
    expect(screen.getByLabelText('Loading chart')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<SpendingTrendChart {...defaultProps} data={[]} />)
    expect(screen.getByLabelText('No data')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No expenses found for the selected period and filters.'
      )
    ).toBeInTheDocument()
  })

  it('shows empty state when series is empty', () => {
    render(<SpendingTrendChart {...defaultProps} series={[]} />)
    expect(screen.getByLabelText('No data')).toBeInTheDocument()
  })

  it('renders chart container when data is present', () => {
    const { container } = render(<SpendingTrendChart {...defaultProps} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.height).toBe('400px')
    expect(screen.queryByLabelText('Loading chart')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('No data')).not.toBeInTheDocument()
  })
})

describe('accumulateData', () => {
  it('accumulates values across periods', () => {
    const data: ChartDataPoint[] = [
      { period: 'Jan', Groceries: 100, Transport: 50 },
      { period: 'Feb', Groceries: 200, Transport: 100 },
      { period: 'Mar', Groceries: 150, Transport: 75 },
    ]
    const result = accumulateData(data, mockSeries)
    expect(result[0]['Groceries']).toBe(100)
    expect(result[1]['Groceries']).toBe(300)
    expect(result[2]['Groceries']).toBe(450)
    expect(result[0]['Transport']).toBe(50)
    expect(result[1]['Transport']).toBe(150)
    expect(result[2]['Transport']).toBe(225)
  })

  it('handles missing values as zero in accumulation', () => {
    const data: ChartDataPoint[] = [
      { period: 'Jan', Groceries: 100 },
      { period: 'Feb', Groceries: 200 },
    ]
    const series: SeriesData[] = [
      { id: '1', name: 'Groceries', color: '#4285f4' },
      { id: '2', name: 'Transport', color: '#34a853' },
    ]
    const result = accumulateData(data, series)
    expect(result[0]['Transport']).toBe(0)
    expect(result[1]['Transport']).toBe(0)
  })

  it('preserves period labels', () => {
    const result = accumulateData(mockData, mockSeries)
    expect(result[0].period).toBe('Jan 2026')
    expect(result[1].period).toBe('Feb 2026')
    expect(result[2].period).toBe('Mar 2026')
  })
})
