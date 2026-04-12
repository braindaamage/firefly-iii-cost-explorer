import { useXAxisScale, useYAxisScale } from 'recharts'
import type { ForecastOverlayPoint } from '../../lib/forecast-overlay'

interface ForecastOverlayProps {
  forecastData: ForecastOverlayPoint[]
  /**
   * Must match the `barCategoryGap` of the parent `<BarChart>`.
   * Recharts applies this as `barCategoryGap` px inset on each side of the
   * category slot, so the actual bar width = bandwidth − 2 × barCategoryGap.
   * Defaults to 0 (no adjustment).
   */
  barCategoryGap?: number
}

/**
 * SVG ghost bars rendered directly inside Recharts BarChart (Recharts 3.x style —
 * no <Customized> wrapper needed). Uses Recharts hooks to access chart scales.
 *
 * Ghost bars are inset to match the exact width and x position of the stacked
 * spending bars, accounting for barCategoryGap.
 */
export function ForecastOverlay({ forecastData, barCategoryGap = 0 }: ForecastOverlayProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()

  if (!xScale || !yScale || forecastData.length === 0) return null

  // Full category slot width: difference between 'end' and 'start' positions.
  const firstLabel = forecastData[0].periodLabel
  const slotStart = xScale(firstLabel)
  const slotEnd = xScale(firstLabel, { position: 'end' })
  if (slotStart == null || slotEnd == null) return null
  const bandwidth = slotEnd - slotStart

  // Adjust for barCategoryGap: Recharts insets bars by barCategoryGap on each side.
  const barWidth = bandwidth - 2 * barCategoryGap
  if (barWidth <= 0) return null
  const xOffset = barCategoryGap

  const baseline = yScale(0) ?? 0

  return (
    <g aria-label="Forecast overlay">
      {forecastData
        .filter((p) => p.value > 0)
        .map((p) => {
          const slotX = xScale(p.periodLabel)
          const y = yScale(p.value)
          if (slotX == null || y == null) return null

          const barHeight = baseline - y
          if (barHeight <= 0) return null

          return (
            <rect
              key={p.periodLabel}
              x={slotX + xOffset}
              y={y}
              width={barWidth}
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
