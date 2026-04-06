import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportBreakdownCSV } from '../csv-export'
import type { BreakdownRow } from '../../types/breakdown'

// Mock DOM APIs used for download
const mockClick = vi.fn()
const mockRevokeObjectURL = vi.fn()
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')

beforeEach(() => {
  vi.restoreAllMocks()
  mockClick.mockClear()
  mockCreateObjectURL.mockClear()
  mockRevokeObjectURL.mockClear()
  vi.stubGlobal('URL', { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL })
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    return document.createElement.call(document, tag)
  })
})

const periods = ['Jan 2026', 'Feb 2026', 'Mar 2026']

const mockRows: BreakdownRow[] = [
  { id: '1', name: 'Groceries', color: '#4285f4', values: { 'Jan 2026': 450, 'Feb 2026': 380, 'Mar 2026': 520 }, average: 450, total: 1350 },
  { id: '2', name: 'Transport', color: '#34a853', values: { 'Jan 2026': 120, 'Feb 2026': 90, 'Mar 2026': 150 }, average: 120, total: 360 },
]

const mockTotals: BreakdownRow = {
  id: 'total', name: 'Total', color: '',
  values: { 'Jan 2026': 570, 'Feb 2026': 470, 'Mar 2026': 670 }, average: 570, total: 1710,
}

describe('exportBreakdownCSV', () => {
  it('triggers a download', () => {
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(mockClick).toHaveBeenCalledOnce()
  })

  it('filename includes groupBy and date', () => {
    const mockAnchor = { href: '', download: '', click: mockClick }
    vi.spyOn(document, 'createElement').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
    exportBreakdownCSV(mockRows, mockTotals, periods, 'budget')
    expect(mockAnchor.download).toMatch(/cost-explorer-breakdown-budget-\d{4}-\d{2}-\d{2}\.csv/)
  })

  it('uses dynamic group column label based on groupBy', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      content: string
      constructor(parts: BlobPart[], _opts: BlobPropertyBag) {
        this.content = String(parts[0])
        capturedContent = this.content
      }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(capturedContent).toContain('Category')
    expect(capturedContent).not.toContain('Group Name')
  })

  it('uses "Budget" as column label for budget groupBy', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'budget')
    expect(capturedContent).toContain('Budget')
  })

  it('includes header row with period columns, Average, and Total', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      content: string
      constructor(parts: BlobPart[], _opts: BlobPropertyBag) {
        this.content = String(parts[0])
        capturedContent = this.content
      }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(capturedContent).toContain('Jan 2026')
    expect(capturedContent).toContain('Feb 2026')
    expect(capturedContent).toContain('Mar 2026')
    expect(capturedContent).toContain('Average')
    expect(capturedContent).toContain('Total')
  })

  it('Average column appears before Total column in header', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    const headerLine = capturedContent.split('\r\n')[0]
    const avgIdx = headerLine.indexOf('Average')
    const totalIdx = headerLine.indexOf('Total')
    expect(avgIdx).toBeGreaterThan(-1)
    expect(avgIdx).toBeLessThan(totalIdx)
  })

  it('includes average value in each data row', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    // Groceries average = 450.00
    expect(capturedContent).toContain('450.00')
  })

  it('includes row data with period values in CSV', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(capturedContent).toContain('Groceries')
    expect(capturedContent).toContain('450')
    expect(capturedContent).toContain('1350')
    expect(capturedContent).toContain('Transport')
  })

  it('includes totals row at the end', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    const lines = capturedContent.split('\r\n')
    expect(lines[lines.length - 1]).toContain('Total')
    expect(lines[lines.length - 1]).toContain('1710')
  })

  it('uses CRLF line endings', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(capturedContent).toContain('\r\n')
  })
})
