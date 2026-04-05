import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercentage, formatDate } from './formatters'

describe('formatCurrency', () => {
  it('formats EUR correctly', () => {
    expect(formatCurrency(1500.8, 'EUR')).toBe('€1,500.80')
  })

  it('formats USD correctly', () => {
    expect(formatCurrency(1500.8, 'USD')).toBe('$1,500.80')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'EUR')).toBe('€0.00')
  })

  it('formats large amounts with comma separator', () => {
    expect(formatCurrency(12345.67, 'USD')).toBe('$12,345.67')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500, 'EUR')).toBe('-€500.00')
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
