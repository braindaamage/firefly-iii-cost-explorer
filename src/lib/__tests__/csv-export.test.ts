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

const mockRows: BreakdownRow[] = [
  { id: '1', name: 'Groceries', color: '#4285f4', actualCost: 500, budgeted: 600, variance: -100, percentChange: 10 },
  { id: '2', name: 'Transport', color: '#34a853', actualCost: 200, budgeted: null, variance: null, percentChange: -5 },
]

const mockTotals: BreakdownRow = {
  id: 'total', name: 'Total', color: '', actualCost: 700, budgeted: 600, variance: 100, percentChange: 3,
}

const mockTransactions: Transaction[] = [
  { id: '1-10', date: '2026-01-15', description: 'Grocery shopping', amount: 150, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Supermarket' },
  { id: '1-11', date: '2026-01-20', description: 'Bus ticket', amount: 5, currencyCode: 'EUR', sourceAccount: 'Checking', destinationAccount: 'Transit' },
]

describe('exportBreakdownCSV', () => {
  it('triggers a download', () => {
    exportBreakdownCSV(mockRows, mockTotals, 'category', 'EUR')
    expect(mockClick).toHaveBeenCalledOnce()
  })

  it('filename includes groupBy and date', () => {
    const mockAnchor = { href: '', download: '', click: mockClick }
    vi.spyOn(document, 'createElement').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
    exportBreakdownCSV(mockRows, mockTotals, 'budget', 'EUR')
    expect(mockAnchor.download).toMatch(/cost-explorer-breakdown-budget-\d{4}-\d{2}-\d{2}\.csv/)
  })

  it('includes header row with correct columns', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      content: string
      constructor(parts: BlobPart[], _opts: BlobPropertyBag) {
        this.content = String(parts[0])
        capturedContent = this.content
      }
    })
    exportBreakdownCSV(mockRows, mockTotals, 'category', 'EUR')
    expect(capturedContent).toContain('Group Name')
    expect(capturedContent).toContain('Actual Cost')
    expect(capturedContent).toContain('Budgeted')
    expect(capturedContent).toContain('Variance')
    expect(capturedContent).toContain('% Change')
  })

  it('includes row data in CSV', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, 'category', 'EUR')
    expect(capturedContent).toContain('Groceries')
    expect(capturedContent).toContain('500.00')
    expect(capturedContent).toContain('Transport')
  })

  it('includes totals row at the end', () => {
    let capturedContent = ''
    vi.stubGlobal('Blob', class MockBlob {
      constructor(parts: BlobPart[]) { capturedContent = String(parts[0]) }
    })
    exportBreakdownCSV(mockRows, mockTotals, 'category', 'EUR')
    const lines = capturedContent.split('\n')
    expect(lines[lines.length - 1]).toContain('Total')
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
})
