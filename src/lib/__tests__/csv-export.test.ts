import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportBreakdownCSV, exportTransactionsCSV } from '../csv-export'
import type { BreakdownRow } from '../../types/breakdown'
import type { Transaction } from '../../api/types'

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
  { id: '1', name: 'Groceries', color: '#4285f4', values: { 'Jan 2026': 450, 'Feb 2026': 380, 'Mar 2026': 520 }, total: 1350 },
  { id: '2', name: 'Transport', color: '#34a853', values: { 'Jan 2026': 120, 'Feb 2026': 90, 'Mar 2026': 150 }, total: 360 },
]

const mockTotals: BreakdownRow = {
  id: 'total', name: 'Total', color: '',
  values: { 'Jan 2026': 570, 'Feb 2026': 470, 'Mar 2026': 670 }, total: 1710,
}

const mockTransactions: Transaction[] = [
  { id: '1-10', date: '2026-01-15', description: 'Grocery shopping', amount: 150, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Supermarket' },
  { id: '1-11', date: '2026-01-20', description: 'Bus ticket', amount: 5, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Transit' },
]

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

  it('includes header row with Group Name, period columns, and Total', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      content: string
      constructor(parts: BlobPart[], _opts: BlobPropertyBag) {
        this.content = String(parts[0])
        capturedContent = this.content
      }
    })
    exportBreakdownCSV(mockRows, mockTotals, periods, 'category')
    expect(capturedContent).toContain('Group Name')
    expect(capturedContent).toContain('Jan 2026')
    expect(capturedContent).toContain('Feb 2026')
    expect(capturedContent).toContain('Mar 2026')
    expect(capturedContent).toContain('Total')
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

describe('exportTransactionsCSV', () => {
  it('triggers a download', () => {
    exportTransactionsCSV(mockTransactions, 'Groceries')
    expect(mockClick).toHaveBeenCalledOnce()
  })

  it('filename includes item name and date', () => {
    const mockAnchor = { href: '', download: '', click: mockClick }
    vi.spyOn(document, 'createElement').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
    exportTransactionsCSV(mockTransactions, 'Groceries')
    expect(mockAnchor.download).toMatch(/cost-explorer-transactions-Groceries-\d{4}-\d{2}-\d{2}\.csv/)
  })

  it('sanitizes special characters in itemName for filename', () => {
    const mockAnchor = { href: '', download: '', click: mockClick }
    vi.spyOn(document, 'createElement').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
    exportTransactionsCSV(mockTransactions, 'Food & Drink')
    expect(mockAnchor.download).toMatch(/cost-explorer-transactions-Food---Drink-\d{4}-\d{2}-\d{2}\.csv/)
  })

  it('includes header and transaction rows', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportTransactionsCSV(mockTransactions, 'Groceries')
    expect(capturedContent).toContain('Date')
    expect(capturedContent).toContain('Description')
    expect(capturedContent).toContain('Amount')
    expect(capturedContent).toContain('Grocery shopping')
    expect(capturedContent).toContain('150.00')
  })

  it('uses CRLF line endings', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportTransactionsCSV(mockTransactions, 'Groceries')
    expect(capturedContent).toContain('\r\n')
  })

  it('escapes commas in descriptions', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    const txWithComma: Transaction = {
      ...mockTransactions[0],
      description: 'Shop, market',
    }
    exportTransactionsCSV([txWithComma], 'Test')
    expect(capturedContent).toContain('"Shop, market"')
  })

  it('escapes carriage returns in descriptions', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    const txWithCR: Transaction = {
      ...mockTransactions[0],
      description: 'Line1\rLine2',
    }
    exportTransactionsCSV([txWithCR], 'Test')
    expect(capturedContent).toContain('"Line1\rLine2"')
  })
})
