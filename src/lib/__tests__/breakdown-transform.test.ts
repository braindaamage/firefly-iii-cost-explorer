import { describe, it, expect } from 'vitest'
import { transformToBreakdownRows } from '../breakdown-transform'
import type { ChartDataPoint, SeriesData } from '../../hooks/useDashboardData'

const series: SeriesData[] = [
  { id: 's1', name: 'Groceries', color: '#4285f4' },
  { id: 's2', name: 'Transport', color: '#34a853' },
]

const chartData: ChartDataPoint[] = [
  { period: 'Jan 2026', Groceries: 450, Transport: 120 },
  { period: 'Feb 2026', Groceries: 380, Transport: 90 },
  { period: 'Mar 2026', Groceries: 520, Transport: 150 },
]

describe('transformToBreakdownRows', () => {
  it('generates one row per series', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    expect(rows).toHaveLength(2)
  })

  it('each row has values keyed by period label', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    const groceries = rows.find((r) => r.name === 'Groceries')!
    expect(groceries.values['Jan 2026']).toBe(450)
    expect(groceries.values['Feb 2026']).toBe(380)
    expect(groceries.values['Mar 2026']).toBe(520)
  })

  it('each row total is sum of all period values', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    const groceries = rows.find((r) => r.name === 'Groceries')!
    expect(groceries.total).toBe(450 + 380 + 520)
  })

  it('rows are sorted by total descending', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    expect(rows[0].name).toBe('Groceries') // 1350 > 360
    expect(rows[1].name).toBe('Transport')
  })

  it('totals row has sum across all series per period', () => {
    const { totals } = transformToBreakdownRows(chartData, series)
    expect(totals.values['Jan 2026']).toBe(570)
    expect(totals.values['Feb 2026']).toBe(470)
    expect(totals.values['Mar 2026']).toBe(670)
  })

  it('totals.total is the grand total', () => {
    const { totals } = transformToBreakdownRows(chartData, series)
    expect(totals.total).toBe(1350 + 360)
  })

  it('totals row has id "total"', () => {
    const { totals } = transformToBreakdownRows(chartData, series)
    expect(totals.id).toBe('total')
  })

  it('rows preserve id, name, color from series', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    const groceries = rows.find((r) => r.name === 'Groceries')!
    expect(groceries.id).toBe('s1')
    expect(groceries.color).toBe('#4285f4')
  })

  it('handles missing period values as 0', () => {
    const partialChart: ChartDataPoint[] = [
      { period: 'Jan 2026', Groceries: 100 },
      { period: 'Feb 2026' },
    ]
    const { rows } = transformToBreakdownRows(partialChart, series)
    const transport = rows.find((r) => r.name === 'Transport')!
    expect(transport.values['Jan 2026']).toBe(0)
    expect(transport.values['Feb 2026']).toBe(0)
  })

  it('returns empty rows and zero totals for empty series', () => {
    const { rows, totals } = transformToBreakdownRows(chartData, [])
    expect(rows).toHaveLength(0)
    expect(totals.total).toBe(0)
  })

  it('each row average is total / numberOfPeriods', () => {
    const { rows } = transformToBreakdownRows(chartData, series)
    const groceries = rows.find((r) => r.name === 'Groceries')!
    // total = 450 + 380 + 520 = 1350, periods = 3
    expect(groceries.average).toBeCloseTo(1350 / 3)
    const transport = rows.find((r) => r.name === 'Transport')!
    // total = 120 + 90 + 150 = 360, periods = 3
    expect(transport.average).toBeCloseTo(360 / 3)
  })

  it('totals average is grandTotal / numberOfPeriods', () => {
    const { totals } = transformToBreakdownRows(chartData, series)
    // grandTotal = 1350 + 360 = 1710, periods = 3
    expect(totals.average).toBeCloseTo(1710 / 3)
  })

  it('average is 0 when chartData is empty', () => {
    const { rows, totals } = transformToBreakdownRows([], series)
    rows.forEach((r) => expect(r.average).toBe(0))
    expect(totals.average).toBe(0)
  })
})
