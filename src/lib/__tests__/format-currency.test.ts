import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../format-currency'

describe('formatCurrency', () => {
  it('formats a positive EUR amount with 2 decimal places', () => {
    const result = formatCurrency(1234.56, 'EUR', 2)
    expect(result).toContain('1,234.56')
    expect(result).toMatch(/EUR|€/)
  })

  it('formats a positive USD amount with 2 decimal places', () => {
    const result = formatCurrency(999.99, 'USD', 2)
    expect(result).toContain('999.99')
    expect(result).toMatch(/USD|\$/)
  })

  it('formats a negative amount', () => {
    const result = formatCurrency(-500.0, 'EUR', 2)
    expect(result).toContain('500.00')
    expect(result).toMatch(/-/)
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'EUR', 2)
    expect(result).toContain('0.00')
  })

  it('respects decimal places of 0', () => {
    const result = formatCurrency(1000, 'JPY', 0)
    expect(result).not.toContain('.')
    expect(result).toContain('1,000')
  })

  it('respects decimal places of 3', () => {
    const result = formatCurrency(1.5, 'KWD', 3)
    expect(result).toContain('1.500')
  })
})
