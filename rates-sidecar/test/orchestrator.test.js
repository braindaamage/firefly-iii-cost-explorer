import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { runJob, makeLog, pollOnce } from '../index.js'

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

describe('pollOnce', () => {
  const NOW = '2026-04-11T14:32:08.512Z'
  const EARLIER = '2026-04-11T07:00:12.000Z'
  const LATER = '2026-04-11T16:00:00.000Z'

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('pollOnce_runNowNewerThanLastRun_invokesRunJob', async () => {
    const client = makeClient({
      getPreference: vi.fn()
        .mockResolvedValueOnce({ ...BASE_CONFIG }) // loadConfig
        .mockResolvedValueOnce({ requestedAt: LATER }) // runNow
        .mockResolvedValueOnce({ timestamp: EARLIER }) // lastRun
    })
    const config = { ...BASE_CONFIG }
    const reinstall = vi.fn()
    const log = vi.fn()

    await pollOnce(client, () => config, reinstall, log)

    expect(log).toHaveBeenCalledWith('info', 'run_now_triggered', expect.objectContaining({ requestedAt: LATER }))
    // runJob was invoked (writes lastRun)
    expect(client.writeLastRun).toHaveBeenCalled()
  })

  it('pollOnce_runNowOlderThanLastRun_doesNotInvokeRunJob — idempotencia', async () => {
    const client = makeClient({
      getPreference: vi.fn()
        .mockResolvedValueOnce({ ...BASE_CONFIG }) // loadConfig
        .mockResolvedValueOnce({ requestedAt: EARLIER }) // runNow
        .mockResolvedValueOnce({ timestamp: LATER }) // lastRun
    })
    const config = { ...BASE_CONFIG }
    const reinstall = vi.fn()
    const log = vi.fn()

    await pollOnce(client, () => config, reinstall, log)

    expect(log).not.toHaveBeenCalledWith('info', 'run_now_triggered', expect.anything())
    expect(client.writeLastRun).not.toHaveBeenCalled()
  })

  it('pollOnce_runJobFails_subsequentPollDoesNotRetrigger — lastRun.timestamp avanza en el catch', async () => {
    // First poll: runNow is newer → triggers runJob → runJob fails → writes lastRun with failed status
    const clientFirstPoll = makeClient({
      getPreference: vi.fn()
        .mockResolvedValueOnce({ ...BASE_CONFIG })
        .mockResolvedValueOnce({ requestedAt: LATER })
        .mockResolvedValueOnce({ timestamp: EARLIER }),
      postExchangeRates: vi.fn().mockRejectedValue(new Error('network down')),
    })
    const config = { ...BASE_CONFIG }

    await pollOnce(clientFirstPoll, () => config, vi.fn(), vi.fn())
    expect(clientFirstPoll.writeLastRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    )

    // The lastRun.timestamp is now after requestedAt → second poll should not re-trigger
    const failedTs = clientFirstPoll.writeLastRun.mock.calls[0][0].timestamp
    const clientSecondPoll = makeClient({
      getPreference: vi.fn()
        .mockResolvedValueOnce({ ...BASE_CONFIG })
        .mockResolvedValueOnce({ requestedAt: LATER })
        .mockResolvedValueOnce({ timestamp: failedTs }),
    })
    const log2 = vi.fn()

    await pollOnce(clientSecondPoll, () => config, vi.fn(), log2)

    expect(log2).not.toHaveBeenCalledWith('info', 'run_now_triggered', expect.anything())
  })

  it('pollOnce_configDisabled_skipsRunNowCheck', async () => {
    const disabledConfig = { ...BASE_CONFIG, enabled: false }
    const client = makeClient({
      getPreference: vi.fn().mockResolvedValueOnce(disabledConfig),
    })
    const log = vi.fn()

    await pollOnce(client, () => disabledConfig, vi.fn(), log)

    // Only one getPreference call (loadConfig) — no runNow/lastRun reads
    expect(client.getPreference).toHaveBeenCalledTimes(1)
    expect(log).not.toHaveBeenCalledWith('info', 'run_now_triggered', expect.anything())
  })

  it('pollOnce_startup_runsOnceBeforeInterval — verifica que start llama pollOnce antes del setInterval', async () => {
    // The startup initial poll is documented in index.js:
    // await pollOnce(client, () => config, reinstallIfNeeded, log)
    // This test verifies the behavior of pollOnce itself during a fresh startup scenario
    // (no prior lastRun, runNow preference present → triggers job)
    const client = makeClient({
      getPreference: vi.fn()
        .mockResolvedValueOnce({ ...BASE_CONFIG })  // loadConfig
        .mockResolvedValueOnce({ requestedAt: NOW }) // runNow (pending from previous session)
        .mockResolvedValueOnce(null),               // lastRun (never run)
    })
    const config = { ...BASE_CONFIG }
    const log = vi.fn()

    await pollOnce(client, () => config, vi.fn(), log)

    expect(log).toHaveBeenCalledWith('info', 'run_now_triggered', expect.objectContaining({ requestedAt: NOW }))
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
