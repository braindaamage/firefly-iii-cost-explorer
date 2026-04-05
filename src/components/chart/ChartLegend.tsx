import type { SeriesData } from '../../hooks/useDashboardData'

interface ChartLegendProps {
  series: SeriesData[]
}

export function ChartLegend({ series }: ChartLegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '26px',
      }}
    >
      {series.map((s) => (
        <div
          key={s.id}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: s.color,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 400,
              fontSize: '11px',
              color: '#9aa0a6',
            }}
          >
            {s.name}
          </span>
        </div>
      ))}
    </div>
  )
}
