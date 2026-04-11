import { describe, it, expect } from 'vitest'
import { shouldTriggerRunNow } from '../src/run-now.js'

const NOW = '2026-04-11T14:32:08.512Z'
const EARLIER = '2026-04-11T07:00:12.000Z'
const LATER = '2026-04-11T16:00:00.000Z'

describe('shouldTriggerRunNow', () => {
  it('shouldTriggerRunNow_withNullRunNow_returnsFalse', () => {
    expect(shouldTriggerRunNow(null, null)).toBe(false)
  })

  it('shouldTriggerRunNow_withNullLastRun_returnsTrue — primera corrida, nunca corrió antes', () => {
    expect(shouldTriggerRunNow({ requestedAt: NOW }, null)).toBe(true)
  })

  it('shouldTriggerRunNow_requestedAtNewerThanLastRun_returnsTrue', () => {
    expect(shouldTriggerRunNow(
      { requestedAt: LATER },
      { timestamp: EARLIER }
    )).toBe(true)
  })

  it('shouldTriggerRunNow_requestedAtOlderThanLastRun_returnsFalse — idempotencia', () => {
    expect(shouldTriggerRunNow(
      { requestedAt: EARLIER },
      { timestamp: LATER }
    )).toBe(false)
  })

  it('shouldTriggerRunNow_requestedAtEqualLastRun_returnsFalse — edge boundary', () => {
    expect(shouldTriggerRunNow(
      { requestedAt: NOW },
      { timestamp: NOW }
    )).toBe(false)
  })

  it('shouldTriggerRunNow_malformedRequestedAt_returnsFalse — safety', () => {
    expect(shouldTriggerRunNow({ requestedAt: 'not-a-date' }, null)).toBe(false)
    expect(shouldTriggerRunNow({ requestedAt: 42 }, null)).toBe(false)
    expect(shouldTriggerRunNow({}, null)).toBe(false)
  })

  it('shouldTriggerRunNow_malformedLastRunTimestamp_returnsTrue — treat broken lastRun as null', () => {
    expect(shouldTriggerRunNow(
      { requestedAt: NOW },
      { timestamp: 'not-a-date' }
    )).toBe(true)
    expect(shouldTriggerRunNow(
      { requestedAt: NOW },
      { timestamp: null }
    )).toBe(true)
  })
})
