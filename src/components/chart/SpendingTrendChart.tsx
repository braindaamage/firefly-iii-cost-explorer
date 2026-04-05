import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatCurrencyShort, formatCurrency } from '../../lib/formatters'
import type { ChartDataPoint, SeriesData } from '../../hooks/useDashboardData'

interface SpendingTrendChartProps {
  data: ChartDataPoint[]
  series: SeriesData[]
  currencyCode: string
  isLoading: boolean
  cumulative: boolean
}

function accumulateData(
  data: ChartDataPoint[],
  series: SeriesData[]
): ChartDataPoint[] {
  return data.map((point, i) => {
    const accumulated: ChartDataPoint = { period: point.period }
    series.forEach((s) => {
      let sum = 0
      for (let j = 0; j <= i; j++) {
        sum += (data[j][s.name] as number) || 0
      }
      accumulated[s.name] = sum
    })
    return accumulated
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currencyCode: string
}

function CustomTooltip({ active, payload, label, currencyCode }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)

  return (
    <div
      style={{
        backgroundColor: '#2d2d2d',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '12px 16px',
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: '13px',
          color: '#e8eaed',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#e8eaed',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#9aa0a6', marginRight: '4px' }}>{entry.name}:</span>
          {formatCurrency(entry.value, currencyCode)}
        </div>
      ))}
      <div
        style={{
          borderTop: '1px solid #3c4043',
          marginTop: '8px',
          paddingTop: '8px',
          fontSize: '12px',
          color: '#e8eaed',
          fontWeight: 500,
        }}
      >
        Total: {formatCurrency(total, currencyCode)}
      </div>
    </div>
  )
}

export function SpendingTrendChart({
  data,
  series,
  currencyCode,
  isLoading,
  cumulative,
}: SpendingTrendChartProps) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading chart"
        style={{
          height: '400px',
          backgroundColor: '#1e1e1e',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    )
  }

  if (data.length === 0 || series.length === 0) {
    return (
      <div
        style={{
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#9aa0a6',
        }}
        aria-label="No data"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="7" width="4" height="14" rx="1" />
          <rect x="17" y="4" width="4" height="17" rx="1" />
          <line x1="3" y1="3" x2="21" y2="3" />
        </svg>
        <span
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 400,
            fontSize: '14px',
          }}
        >
          No expenses found for the selected period and filters.
        </span>
      </div>
    )
  }

  const chartData = cumulative ? accumulateData(data, series) : data

  return (
    <div style={{ height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          barCategoryGap={8}
        >
          <CartesianGrid vertical={false} stroke="#3c4043" strokeDasharray="" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#9aa0a6', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrencyShort(v, currencyCode)}
            tick={{ fill: '#9aa0a6', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={
              <CustomTooltip currencyCode={currencyCode} />
            }
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {series.map((s) => (
            <Bar
              key={s.id}
              dataKey={s.name}
              stackId="a"
              fill={s.color}
              radius={series.indexOf(s) === series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export { accumulateData }
