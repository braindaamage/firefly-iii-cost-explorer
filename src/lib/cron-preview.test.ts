import { describe, it, expect } from 'vitest'
import { previewCron } from './cron-preview'

describe('previewCron', () => {
  it('previewCron_validExpression_returnsValidTrueAndNextRuns', () => {
    const result = previewCron('0 7 * * *')
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
    expect(result.nextRuns).toHaveLength(3)
    result.nextRuns.forEach((d) => expect(d).toBeInstanceOf(Date))
  })

  it('previewCron_invalidExpression_returnsValidFalseAndError', () => {
    const result = previewCron('not-a-cron')
    expect(result.valid).toBe(false)
    expect(result.error).not.toBeNull()
    expect(result.nextRuns).toHaveLength(0)
  })

  it('previewCron_defaultCount_is3', () => {
    const result = previewCron('0 7 * * *')
    expect(result.nextRuns).toHaveLength(3)
  })

  it('previewCron_customCount_returnsNItems', () => {
    const result = previewCron('0 7 * * *', 5)
    expect(result.nextRuns).toHaveLength(5)
  })

  it('previewCron_emptyString_returnsInvalid', () => {
    const result = previewCron('')
    expect(result.valid).toBe(false)
    expect(result.nextRuns).toHaveLength(0)
  })

  it('previewCron_weekdayExpression_returnsOnlyWeekdays', () => {
    // '0 7 * * 1-5' = Monday–Friday at 07:00
    const result = previewCron('0 7 * * 1-5', 7)
    expect(result.valid).toBe(true)
    result.nextRuns.forEach((d) => {
      const day = d.getDay()
      // getDay: 0=Sun, 6=Sat
      expect(day).not.toBe(0)
      expect(day).not.toBe(6)
    })
  })
})
