import { useXAxisScale, useYAxisScale } from 'recharts'
import type { ForecastOverlayPoint } from '../../lib/forecast-overlay'

interface ForecastOverlayProps {
  forecastData: ForecastOverlayPoint[]
}

/**
 * SVG ghost bars rendered directly inside Recharts BarChart (Recharts 3.x style —
 * no <Customized> wrapper needed). Uses Recharts hooks to access chart scales.
 *
 * Ghost bars appear behind the stacked spending bars, showing the forecast
 * for the full period.
 *
 * Bandwidth is derived from the x-scale by comparing 'start' vs 'end' positions
 * of the same category — works with the exported useXAxisScale hook only.
 */
export function ForecastOverlay({ forecastData }: ForecastOverlayProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()

  if (!xScale || !yScale || forecastData.length === 0) return null

  // Compute bandwidth: difference between 'end' and 'start' of the same category slot.
  // Works because RechartsScale.map adjusts for position on band scales.
  const firstLabel = forecastData[0].periodLabel
  const slotStart = xScale(firstLabel)
  const slotEnd = xScale(firstLabel, { position: 'end' })
  if (slotStart == null || slotEnd == null) return null
  const bandwidth = slotEnd - slotStart

  const baseline = yScale(0) ?? 0

  return (
    <g aria-label="Forecast overlay">
      {forecastData
        .filter((p) => p.value > 0)
        .map((p) => {
          const x = xScale(p.periodLabel)
          const y = yScale(p.value)
          if (x == null || y == null) return null

          const barHeight = baseline - y
          if (barHeight <= 0) return null

          return (
            <rect
              key={p.periodLabel}
              x={x}
              y={y}
              width={bandwidth}
              height={barHeight}
              fill="rgba(255, 255, 255, 0.12)"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeDasharray="4 2"
              strokeWidth={1}
              rx={2}
            />
          )
        })}
    </g>
  )
}
