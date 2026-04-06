import type { ChartDataPoint, SeriesData } from '../hooks/useDashboardData'
import type { BreakdownRow } from '../types/breakdown'

export function transformToBreakdownRows(
  chartData: ChartDataPoint[],
  series: SeriesData[]
): { rows: BreakdownRow[]; totals: BreakdownRow } {
  const rows: BreakdownRow[] = series.map((s) => {
    const values: Record<string, number> = {}
    let total = 0
    chartData.forEach((point) => {
      const val = (point[s.name] as number) ?? 0
      values[point.period] = val
      total += val
    })
    return { id: s.id, name: s.name, color: s.color, values, total }
  })

  // Sort by total descending
  rows.sort((a, b) => b.total - a.total)

  // Compute totals row
  const totalValues: Record<string, number> = {}
  chartData.forEach((point) => {
    totalValues[point.period] = series.reduce(
      (sum, s) => sum + ((point[s.name] as number) ?? 0),
      0
    )
  })
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)

  const totals: BreakdownRow = {
    id: 'total',
    name: 'Total',
    color: '',
    values: totalValues,
    total: grandTotal,
  }

  return { rows, totals }
}
