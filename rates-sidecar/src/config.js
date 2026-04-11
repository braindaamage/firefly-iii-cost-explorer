/**
 * Config loader for the rates sidecar.
 *
 * Split of responsibilities (§10.3):
 *   - Secrets/infra (FIREFLY_URL, FIREFLY_PAT, TZ, LOG_LEVEL) → env vars
 *   - Tunables (schedule, currencies, sources, enable) → Firefly preferences
 *     under key `costExplorer.ratesSidecar`, writable from the SPA without
 *     restarting the container.
 */

import { parseExpression } from 'cron-parser'

export const PREFERENCE_KEY = 'costExplorer.ratesSidecar'
export const LAST_RUN_PREFERENCE_KEY = 'costExplorer.ratesSidecar.lastRun'

export const DEFAULTS = Object.freeze({
  version: 1,
  enabled: true,
  cronSchedule: '0 7 * * *',
  primarySource: 'open-er-api',
  fallbackEnabled: true,
  fallbackSource: 'ecb',
  currencyMode: 'active',
  explicitCurrencies: ['USD', 'CLP'],
  baseCurrency: 'EUR',
})

const VALID_SOURCES = ['open-er-api', 'ecb']
const VALID_CURRENCY_MODES = ['active', 'explicit']

/**
 * Validates and merges a raw preference object with DEFAULTS.
 * Unknown/invalid fields fall back to the default value.
 * Returns { config, warnings: string[] }.
 */
export function validateConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { config: { ...DEFAULTS }, warnings: ['raw value is not an object, using defaults'] }
  }

  const config = { ...DEFAULTS }
  const warnings = []

  if (typeof raw.enabled === 'boolean') {
    config.enabled = raw.enabled
  }

  if (typeof raw.cronSchedule === 'string') {
    try {
      parseExpression(raw.cronSchedule)
      config.cronSchedule = raw.cronSchedule
    } catch {
      warnings.push(`invalid cronSchedule "${raw.cronSchedule}", using default`)
    }
  }

  if (VALID_SOURCES.includes(raw.primarySource)) {
    config.primarySource = raw.primarySource
  } else if (raw.primarySource != null) {
    warnings.push(`unknown primarySource "${raw.primarySource}", using default`)
  }

  if (typeof raw.fallbackEnabled === 'boolean') {
    config.fallbackEnabled = raw.fallbackEnabled
  }

  if (VALID_SOURCES.includes(raw.fallbackSource)) {
    config.fallbackSource = raw.fallbackSource
  }

  if (VALID_CURRENCY_MODES.includes(raw.currencyMode)) {
    config.currencyMode = raw.currencyMode
  }

  if (Array.isArray(raw.explicitCurrencies)) {
    config.explicitCurrencies = raw.explicitCurrencies.filter((c) => typeof c === 'string' && c.length > 0)
  }

  if (typeof raw.baseCurrency === 'string' && raw.baseCurrency.length === 3) {
    config.baseCurrency = raw.baseCurrency.toUpperCase()
  }

  if (typeof raw.version === 'number') {
    config.version = raw.version
  }

  return { config, warnings }
}

/**
 * Loads config from Firefly preferences, bootstrapping with DEFAULTS on first run (404).
 * Falls back to DEFAULTS on any fetch error, with a warning log.
 *
 * @param {import('./firefly-client.js').FireflyClient} fireflyClient
 * @param {function} log
 * @returns {Promise<typeof DEFAULTS>}
 */
export async function loadConfig(fireflyClient, log) {
  try {
    const raw = await fireflyClient.getPreference(PREFERENCE_KEY)

    if (raw === null) {
      // 404 — first run: bootstrap defaults into Firefly preferences
      log('info', 'config_bootstrap', { message: 'No preference found, writing defaults' })
      try {
        await fireflyClient.putPreference(PREFERENCE_KEY, DEFAULTS)
      } catch (putErr) {
        log('warn', 'config_bootstrap_put_failed', { error: putErr.message })
      }
      return { ...DEFAULTS }
    }

    const { config, warnings } = validateConfig(raw)
    if (warnings.length > 0) {
      log('warn', 'config_validation_warnings', { warnings })
    }
    log('info', 'config_loaded', { source: 'remote', cronSchedule: config.cronSchedule, enabled: config.enabled })
    return config
  } catch (err) {
    log('warn', 'config_load_failed', { error: err.message, fallback: 'defaults' })
    return { ...DEFAULTS }
  }
}

/**
 * Returns true if two config objects differ in fields that require cron reinstall.
 */
export function requiresCronReinstall(prev, next) {
  return prev.cronSchedule !== next.cronSchedule || prev.enabled !== next.enabled
}
