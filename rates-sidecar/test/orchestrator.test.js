import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { runJob, makeLog } from '../index.js'

function makeClient(overrides = {}) {
  return {
    getCurrencies: vi.fn().mockResolvedValue(['EUR', 'USD', 'CLP', 'GBP']),
    getPreference: vi.fn().mockResolvedValue(null),
    putPreference: vi.fn().mockResolvedValue(undefined),
    postExchangeRates: vi.fn().mockResolvedValue(undefined),
    writeLastRun: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const BASE_CONFIG = {
  version: 1,
  enabled: true,
  cronSchedule: '0 7 * * *',
  primarySource: 'open-er-api',
  fallbackEnabled: true,
  fallbackSource: 'ecb',
  currencyMode: 'active',
  explicitCurrencies: ['USD', 'CLP'],
  baseCurrency: 'EUR',
}

const noop = () => {}

// Mock fetchRates so orchestrator tests don't do real HTTP
vi.mock('../src/rates-fetchers.js', () => ({
  fetchRates: vi.fn().mockResolvedValue({
    rates: { USD: 1.08, CLP: 1042.5, GBP: 0.86 },
    source: 'open-er-api',
    usedFallback: false,
  }),
}))

describe('runJob', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('posts exchange rates with correct payload and writes /tmp/last-success', async () => {
    const client = makeClient()

    await runJob(BASE_CONFIG, client, noop)

    // postExchangeRates called with today's date, EUR base, and filtered rates
    const [date, base, rates] = client.postExchangeRates.mock.calls[0]
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(base).toBe('EUR')
    expect(typeof rates.USD).toBe('string')
    expect(typeof rates.CLP).toBe('string')
    expect(rates.EUR).toBeUndefined()  // base currency excluded

    // Healthcheck file written
    expect(existsSync('/tmp/last-success')).toBe(true)
    const ts = parseInt(readFileSync('/tmp/last-success', 'utf8'), 10)
    expect(ts).toBeGreaterThan(0)
    expect(Date.now() - ts).toBeLessThan(5000)
  })

  it('writes lastRun preference with success status', async () => {
    const client = makeClient()

    await runJob(BASE_CONFIG, client, noop)

    expect(client.writeLastRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        source: 'open-er-api',
        currenciesUpdated: expect.arrayContaining(['USD', 'CLP']),
        currenciesFailed: expect.any(Array),
        error: null,
      })
    )
  })

  it('filters currencies by active list, excluding base currency', async () => {
    const client = makeClient({
      getCurrencies: vi.fn().mockResolvedValue(['EUR', 'USD', 'CLP']),
    })

    await runJob({ ...BASE_CONFIG, currencyMode: 'active' }, client, noop)

    const rates = client.postExchangeRates.mock.calls[0][2]
    expect(Object.keys(rates)).not.toContain('EUR')
    expect(Object.keys(rates)).toContain('USD')
  })

  it('uses explicit currencies list when currencyMode is "explicit"', async () => {
    const client = makeClient()
    const config = { ...BASE_CONFIG, currencyMode: 'explicit', explicitCurrencies: ['USD', 'GBP'] }

    await runJob(config, client, noop)

    expect(client.getCurrencies).not.toHaveBeenCalled()
    const rates = client.postExchangeRates.mock.calls[0][2]
    expect(Object.keys(rates)).toContain('USD')
    expect(Object.keys(rates)).toContain('GBP')
    expect(Object.keys(rates)).not.toContain('CLP')
  })

  it('writes lastRun with failed status and logs error when postExchangeRates throws', async () => {
    const client = makeClient({
      postExchangeRates: vi.fn().mockRejectedValue(new Error('Firefly unreachable')),
    })
    const log = vi.fn()

    await runJob(BASE_CONFIG, client, log)

    expect(log).toHaveBeenCalledWith('error', 'job_failed', expect.objectContaining({ error: 'Firefly unreachable' }))
    expect(client.writeLastRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Firefly unreachable' })
    )
  })
})

describe('makeLog', () => {
  it('redacts PAT from logged output', () => {
    const secret = 'super-secret-pat'
    const log = makeLog(secret, 'info')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    log('error', 'test_event', { message: `auth failed: Bearer ${secret}` })

    const output = consoleSpy.mock.calls[0][0]
    expect(output).not.toContain(secret)
    expect(output).toContain('[REDACTED]')
    consoleSpy.mockRestore()
  })

  it('suppresses debug messages when level is info', () => {
    const log = makeLog('pat', 'info')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    log('debug', 'debug_event', {})

    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
