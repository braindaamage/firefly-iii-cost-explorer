import { format } from 'date-fns'
import type { BreakdownRow } from '../types/breakdown'
import type { Transaction } from '../api/types'
import type { GroupBy } from '../types/filters'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportBreakdownCSV(
  rows: BreakdownRow[],
  totals: BreakdownRow,
  periods: string[],
  groupBy: GroupBy
): void {
  const date = format(new Date(), 'yyyy-MM-dd')
  const filename = `cost-explorer-breakdown-${groupBy}-${date}.csv`

  const headers = ['Group Name', ...periods, 'Total'].join(',')

  function rowToCSV(row: BreakdownRow): string {
    return [
      escapeCSV(row.name),
      ...periods.map((p) => (row.values[p] ?? 0).toFixed(2)),
      row.total.toFixed(2),
    ].join(',')
  }

  const lines = [headers, ...rows.map(rowToCSV), rowToCSV(totals)]
  downloadCSV(lines.join('\r\n'), filename)
}

export function exportTransactionsCSV(transactions: Transaction[], itemName: string): void {
  const date = format(new Date(), 'yyyy-MM-dd')
  const safeName = itemName.replace(/[^\w\-]/g, '-')
  const filename = `cost-explorer-transactions-${safeName}-${date}.csv`

  const header = ['Date', 'Description', 'Amount', 'Currency', 'Source Account', 'Destination Account'].join(',')

  const lines = [
    header,
    ...transactions.map((t) =>
      [
        t.date,
        escapeCSV(t.description),
        t.amount.toFixed(2),
        t.currencyCode,
        escapeCSV(t.sourceAccount),
        escapeCSV(t.destinationAccount),
      ].join(',')
    ),
  ]

  downloadCSV(lines.join('\r\n'), filename)
}
