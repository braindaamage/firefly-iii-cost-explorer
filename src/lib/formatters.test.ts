import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercentage, formatDate, formatCurrencyShort } from './formatters'

function expectedCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

describe('formatCurrency', () => {
  it('formats EUR correctly', () => {
    expect(formatCurrency(1500.8, 'EUR')).toBe(expectedCurrency(1500.8, 'EUR'))
  })

  it('formats USD correctly', () => {
    expect(formatCurrency(1500.8, 'USD')).toBe(expectedCurrency(1500.8, 'USD'))
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'EUR')).toBe(expectedCurrency(0, 'EUR'))
  })

  it('formats large amounts', () => {
    expect(formatCurrency(12345.67, 'USD')).toBe(expectedCurrency(12345.67, 'USD'))
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500, 'EUR')).toBe(expectedCurrency(-500, 'EUR'))
  })

  it('includes the currency symbol', () => {
    const result = formatCurrency(100, 'EUR')
    expect(result).toMatch(/€|EUR/)
  })

  it('includes the amount value', () => {
    const result = formatCurrency(1500.8, 'USD')
    expect(result).toContain('1')
    expect(result).toContain('500')
  })
})

describe('formatPercentage', () => {
  it('formats positive percentage without sign', () => {
    expect(formatPercentage(8.4)).toBe('8.4%')
  })

  it('formats negative value as positive percentage', () => {
    expect(formatPercentage(-7.3)).toBe('7.3%')
  })

  it('formats zero', () => {
    expect(formatPercentage(0)).toBe('0.0%')
  })

  it('rounds to one decimal place', () => {
    expect(formatPercentage(8.456)).toBe('8.5%')
  })
})

describe('formatDate', () => {
  it('formats date string correctly', () => {
    expect(formatDate('2026-03-15')).toBe('Mar 15, 2026')
  })

  it('formats January date', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 01, 2026')
  })

  it('formats December date', () => {
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026')
  })
})

describe('formatCurrencyShort', () => {
  it('formats zero as symbol+0', () => {
    const result = formatCurrencyShort(0, 'EUR')
    expect(result).toMatch(/[€E].*0/)
  })

  it('formats amounts under 1000 without K suffix', () => {
    const result = formatCurrencyShort(500, 'EUR')
    expect(result).toContain('500')
    expect(result).not.toContain('K')
  })

  it('formats 1000 as 1K', () => {
    const result = formatCurrencyShort(1000, 'EUR')
    expect(result).toContain('1K')
  })

  it('formats 1500 as 2K (rounded)', () => {
    const result = formatCurrencyShort(1500, 'USD')
    expect(result).toContain('2K')
  })

  it('formats 3000 as 3K', () => {
    const result = formatCurrencyShort(3000, 'EUR')
    expect(result).toContain('3K')
  })

  it('includes currency symbol', () => {
    const eurResult = formatCurrencyShort(500, 'EUR')
    expect(eurResult).toMatch(/[€E]/)
    const usdResult = formatCurrencyShort(500, 'USD')
    expect(usdResult).toMatch(/[$U]/)
  })
})
