import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportChartAsPNG } from '../chart-export'

describe('exportChartAsPNG', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('does nothing when no SVG element is found', () => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null)
    // Should not throw
    expect(() => exportChartAsPNG()).not.toThrow()
  })

  it('serializes SVG and creates an image when SVG is found', () => {
    const mockSvg = {
      clientWidth: 800,
      clientHeight: 400,
    } as SVGSVGElement
    vi.spyOn(document, 'querySelector').mockReturnValue(mockSvg)

    const mockSerialize = vi.fn().mockReturnValue('<svg></svg>')
    vi.stubGlobal('XMLSerializer', class { serializeToString = mockSerialize })

    const mockUrl = 'blob:mock'
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue(mockUrl), revokeObjectURL: vi.fn() })

    vi.stubGlobal('Image', class { onload = null; src = '' })

    exportChartAsPNG()
    expect(mockSerialize).toHaveBeenCalledWith(mockSvg)
  })
})
