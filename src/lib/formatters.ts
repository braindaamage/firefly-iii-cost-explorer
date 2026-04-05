import { format, parseISO } from 'date-fns'

export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
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

export function formatCurrencyShort(amount: number, currencyCode: string): string {
  const symbol =
    new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? ''

  if (amount === 0) return `${symbol}0`
  if (Math.abs(amount) >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`
  return `${symbol}${amount.toFixed(0)}`
}
