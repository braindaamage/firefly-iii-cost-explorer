import { describe, it, expect } from 'vitest'
import { SERIES_COLORS, getSeriesColor } from './colors'

describe('SERIES_COLORS', () => {
  it('has 10 colors', () => {
    expect(SERIES_COLORS).toHaveLength(10)
  })

  it('first color is Google blue', () => {
    expect(SERIES_COLORS[0]).toBe('#4285f4')
  })
})

describe('getSeriesColor', () => {
  it('returns first color for index 0', () => {
    expect(getSeriesColor(0)).toBe('#4285f4')
  })

  it('returns correct color for index within range', () => {
    expect(getSeriesColor(1)).toBe('#34a853')
    expect(getSeriesColor(9)).toBe('#f07b72')
  })

  it('cycles back to first color at index 10', () => {
    expect(getSeriesColor(10)).toBe('#4285f4')
  })

  it('cycles correctly for large indices', () => {
    expect(getSeriesColor(21)).toBe(SERIES_COLORS[1])
  })
})
