import { format } from 'date-fns'
import type { BreakdownRow } from '../types/breakdown'
import type { Transaction } from '../api/types'
import type { GroupBy } from '../types/filters'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
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
  groupBy: GroupBy,
  _currencyCode: string
): void {
  const date = format(new Date(), 'yyyy-MM-dd')
  const filename = `cost-explorer-breakdown-${groupBy}-${date}.csv`

  const header = ['Group Name', 'Actual Cost', 'Budgeted', 'Variance', '% Change'].join(',')

  function rowToCSV(row: BreakdownRow): string {
    return [
      escapeCSV(row.name),
      row.actualCost.toFixed(2),
      row.budgeted !== null ? row.budgeted.toFixed(2) : '',
      row.variance !== null ? row.variance.toFixed(2) : '',
      row.percentChange !== null ? `${row.percentChange.toFixed(1)}%` : '',
    ].join(',')
  }

  const lines = [header, ...rows.map(rowToCSV), rowToCSV(totals)]
  downloadCSV(lines.join('\n'), filename)
}

export function exportTransactionsCSV(transactions: Transaction[], itemName: string): void {
  const date = format(new Date(), 'yyyy-MM-dd')
  const filename = `cost-explorer-transactions-${itemName}-${date}.csv`

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

  downloadCSV(lines.join('\n'), filename)
}
