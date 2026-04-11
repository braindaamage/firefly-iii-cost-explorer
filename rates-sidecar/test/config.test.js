import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateConfig, loadConfig, requiresCronReinstall, DEFAULTS, PREFERENCE_KEY, RUN_NOW_PREFERENCE_KEY } from '../src/config.js'

const noop = () => {}

function makeClient(overrides = {}) {
  return {
    getPreference: vi.fn().mockResolvedValue(null),
    putPreference: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('validateConfig', () => {
  it('returns DEFAULTS when raw is null', () => {
    const { config, warnings } = validateConfig(null)
    expect(config).toEqual(DEFAULTS)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('returns DEFAULTS when raw is not an object', () => {
    const { config } = validateConfig('invalid')
    expect(config).toEqual(DEFAULTS)
  })

  it('merges valid fields from raw object over defaults', () => {
    const { config, warnings } = validateConfig({
      enabled: false,
      cronSchedule: '0 8 * * 1-5',
      primarySource: 'ecb',
      fallbackEnabled: false,
      currencyMode: 'explicit',
      explicitCurrencies: ['USD', 'GBP'],
      baseCurrency: 'usd',
    })
    expect(config.enabled).toBe(false)
    expect(config.cronSchedule).toBe('0 8 * * 1-5')
    expect(config.primarySource).toBe('ecb')
    expect(config.fallbackEnabled).toBe(false)
    expect(config.currencyMode).toBe('explicit')
    expect(config.explicitCurrencies).toEqual(['USD', 'GBP'])
    expect(config.baseCurrency).toBe('USD')  // uppercased
    expect(warnings).toHaveLength(0)
  })

  it('falls back to defaults for invalid cronSchedule', () => {
    const { config, warnings } = validateConfig({ cronSchedule: 'not-a-cron' })
    expect(config.cronSchedule).toBe(DEFAULTS.cronSchedule)
    expect(warnings.some((w) => w.includes('cronSchedule'))).toBe(true)
  })

  it('falls back to defaults for unknown primarySource', () => {
    const { config, warnings } = validateConfig({ primarySource: 'fixer.io' })
    expect(config.primarySource).toBe(DEFAULTS.primarySource)
    expect(warnings.some((w) => w.includes('primarySource'))).toBe(true)
  })

  it('filters non-string entries from explicitCurrencies', () => {
    const { config } = validateConfig({ explicitCurrencies: ['USD', 42, null, 'CLP'] })
    expect(config.explicitCurrencies).toEqual(['USD', 'CLP'])
  })
})

describe('loadConfig', () => {
  it('returns DEFAULTS and bootstraps preference on 404 (null)', async () => {
    const client = makeClient({ getPreference: vi.fn().mockResolvedValue(null) })
    const log = vi.fn()

    const config = await loadConfig(client, log)

    expect(config).toEqual(DEFAULTS)
    expect(client.putPreference).toHaveBeenCalledWith(PREFERENCE_KEY, DEFAULTS)
    expect(log).toHaveBeenCalledWith('info', 'config_bootstrap', expect.any(Object))
  })

  it('returns remote config when preference exists', async () => {
    const remote = { ...DEFAULTS, cronSchedule: '0 8 * * *', enabled: false }
    const client = makeClient({ getPreference: vi.fn().mockResolvedValue(remote) })

    const config = await loadConfig(client, noop)

    expect(config.cronSchedule).toBe('0 8 * * *')
    expect(config.enabled).toBe(false)
    expect(client.putPreference).not.toHaveBeenCalled()
  })

  it('returns DEFAULTS and logs warning when fetch throws', async () => {
    const client = makeClient({ getPreference: vi.fn().mockRejectedValue(new Error('network')) })
    const log = vi.fn()

    const config = await loadConfig(client, log)

    expect(config).toEqual(DEFAULTS)
    expect(log).toHaveBeenCalledWith('warn', 'config_load_failed', expect.objectContaining({ error: 'network' }))
  })

  it('logs validation warnings for malformed remote preference', async () => {
    const malformed = { cronSchedule: 'bad-cron', primarySource: 'unknown' }
    const client = makeClient({ getPreference: vi.fn().mockResolvedValue(malformed) })
    const log = vi.fn()

    await loadConfig(client, log)

    expect(log).toHaveBeenCalledWith('warn', 'config_validation_warnings', expect.any(Object))
  })
})

describe('RUN_NOW_PREFERENCE_KEY', () => {
  it('exports RUN_NOW_PREFERENCE_KEY with correct value', () => {
    expect(RUN_NOW_PREFERENCE_KEY).toBe('costExplorer.ratesSidecar.runNow')
  })
})

describe('requiresCronReinstall', () => {
  it('returns true when cronSchedule changes', () => {
    expect(requiresCronReinstall(
      { cronSchedule: '0 7 * * *', enabled: true },
      { cronSchedule: '0 8 * * *', enabled: true }
    )).toBe(true)
  })

  it('returns true when enabled toggles', () => {
    expect(requiresCronReinstall(
      { cronSchedule: '0 7 * * *', enabled: true },
      { cronSchedule: '0 7 * * *', enabled: false }
    )).toBe(true)
  })

  it('returns false when only non-cron fields change', () => {
    expect(requiresCronReinstall(
      { cronSchedule: '0 7 * * *', enabled: true, primarySource: 'open-er-api' },
      { cronSchedule: '0 7 * * *', enabled: true, primarySource: 'ecb' }
    )).toBe(false)
  })
})
