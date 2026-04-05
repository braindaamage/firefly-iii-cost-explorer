import { format, parseISO } from 'date-fns'

export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM dd, yyyy')
}
