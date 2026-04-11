/**
 * Firefly III rates sidecar — main entry point.
 *
 * Startup sequence:
 *   1. Validate env vars (FIREFLY_URL, FIREFLY_PAT required)
 *   2. Load config from Firefly preferences (bootstrap on first run)
 *   3. Install cron job per config.cronSchedule
 *   4. Poll every CONFIG_POLL_INTERVAL_MS (default 5min) for preference changes
 *   5. On SIGHUP: reload config and reinstall cron if needed
 *
 * Config split (§10.3):
 *   - env: FIREFLY_URL, FIREFLY_PAT, TZ, LOG_LEVEL, CONFIG_POLL_INTERVAL_MS
 *   - preferences: everything else (schedule, currencies, sources, enabled)
 */

import { writeFileSync } from 'fs'
// cron-parser is CJS; use default import for ESM interop
import cronParser from 'cron-parser'
const { parseExpression } = cronParser
import cron from 'node-cron'
import { createFireflyClient } from './src/firefly-client.js'
import { loadConfig, requiresCronReinstall, PREFERENCE_KEY } from './src/config.js'
import { fetchRates } from './src/rates-fetchers.js'

// --- Env vars ---
const FIREFLY_URL = process.env.FIREFLY_URL
const FIREFLY_PAT = process.env.FIREFLY_PAT
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
const CONFIG_POLL_INTERVAL_MS = parseInt(process.env.CONFIG_POLL_INTERVAL_MS ?? '300000', 10)

// --- Structured logger (never interpolates FIREFLY_PAT) ---
export function makeLog(pat, level) {
  return function log(msgLevel, event, data = {}) {
    if (msgLevel === 'debug' && level !== 'debug') return
    const payload = { timestamp: new Date().toISOString(), level: msgLevel, event, ...data }
    // Redact PAT if it somehow leaks into a field value
    const safe = pat ? JSON.stringify(payload).replaceAll(pat, '[REDACTED]') : JSON.stringify(payload)
    console.log(safe)
  }
}

// --- Job runner (exported for testing) ---
export async function runJob(config, client, log) {
  log('info', 'job_start', { cronSchedule: config.cronSchedule })
  const startTs = Date.now()

  try {
    // 1. Determine target currencies
    let currencies
    if (config.currencyMode === 'active') {
      const all = await client.getCurrencies()
      currencies = all.filter((c) => c !== config.baseCurrency)
    } else {
      currencies = config.explicitCurrencies.filter((c) => c !== config.baseCurrency)
    }
    log('info', 'currencies_determined', { count: currencies.length, currencies })

    if (currencies.length === 0) {
      log('warn', 'no_target_currencies', { currencyMode: config.currencyMode, baseCurrency: config.baseCurrency })
      await client.writeLastRun({
        timestamp: new Date().toISOString(),
        status: 'success',
        source: 'none',
        currenciesUpdated: [],
        currenciesFailed: [],
        error: null,
        nextRunEstimated: computeNextRun(config.cronSchedule),
      })
      return
    }

    // 2. Fetch rates from primary (+ fallback if needed)
    const { rates: allRates, source, usedFallback } = await fetchRates(config, log)

    // 3. Filter to requested currencies; warn on missing
    const filteredRates = {}
    const missing = []
    for (const code of currencies) {
      if (allRates[code] != null) {
        filteredRates[code] = String(allRates[code])
      } else {
        missing.push(code)
      }
    }
    if (missing.length > 0) {
      log('warn', 'currencies_missing_in_source', { source, missing })
    }

    // 4. POST to Firefly III (idempotent, retried internally)
    const today = new Date().toISOString().slice(0, 10)
    await client.postExchangeRates(today, config.baseCurrency, filteredRates)

    // 5. Write healthcheck file and lastRun preference
    const successTs = Date.now()
    writeFileSync('/tmp/last-success', String(successTs))

    await client.writeLastRun({
      timestamp: new Date().toISOString(),
      status: usedFallback ? 'partial' : 'success',
      source,
      currenciesUpdated: Object.keys(filteredRates),
      currenciesFailed: missing,
      error: null,
      nextRunEstimated: computeNextRun(config.cronSchedule),
    })

    log('info', 'job_success', {
      source,
      currenciesUpdated: Object.keys(filteredRates).length,
      durationMs: successTs - startTs,
    })
  } catch (err) {
    log('error', 'job_failed', { error: err.message, durationMs: Date.now() - startTs })

    await client.writeLastRun({
      timestamp: new Date().toISOString(),
      status: 'failed',
      source: config.primarySource,
      currenciesUpdated: [],
      currenciesFailed: [],
      error: err.message,
      nextRunEstimated: computeNextRun(config.cronSchedule),
    }).catch(() => {})
  }
}

function computeNextRun(cronSchedule) {
  try {
    return parseExpression(cronSchedule).next().toISOString()
  } catch {
    return null
  }
}

// --- Cron installer ---
function installCronJob(schedule, jobFn, log) {
  if (!cron.validate(schedule)) {
    log('error', 'invalid_cron_schedule', { schedule })
    return null
  }
  const task = cron.schedule(schedule, jobFn, { scheduled: true })
  log('info', 'cron_installed', { schedule, nextRun: computeNextRun(schedule) })
  return task
}

// --- Main startup (runs only when executed as the main module) ---
export async function start(client, log) {
  log('info', 'sidecar_startup', { firefly_url: FIREFLY_URL })

  let config = await loadConfig(client, log)
  let currentJob = null

  function reinstallIfNeeded(newConfig) {
    if (requiresCronReinstall(config, newConfig)) {
      if (currentJob) {
        currentJob.stop()
        log('info', 'cron_stopped', { oldSchedule: config.cronSchedule })
      }
      config = newConfig
      if (config.enabled) {
        currentJob = installCronJob(config.cronSchedule, () => runJob(config, client, log), log)
      } else {
        currentJob = null
        log('info', 'sidecar_disabled', { message: 'enabled=false in preferences, cron not installed' })
      }
    } else {
      config = newConfig  // update non-cron fields for next run
    }
  }

  // Initial cron install
  if (config.enabled) {
    currentJob = installCronJob(config.cronSchedule, () => runJob(config, client, log), log)
  } else {
    log('info', 'sidecar_disabled', { message: 'enabled=false at startup, waiting for poll to re-enable' })
  }

  // Poll every CONFIG_POLL_INTERVAL_MS for preference changes
  const pollInterval = setInterval(async () => {
    try {
      const newConfig = await loadConfig(client, log)
      reinstallIfNeeded(newConfig)
    } catch (err) {
      log('warn', 'config_poll_failed', { error: err.message })
    }
  }, CONFIG_POLL_INTERVAL_MS)
  pollInterval.unref()  // don't prevent process exit

  // SIGHUP: reload config immediately
  process.on('SIGHUP', async () => {
    log('info', 'sighup_received', { message: 'Reloading config' })
    try {
      const newConfig = await loadConfig(client, log)
      reinstallIfNeeded(newConfig)
    } catch (err) {
      log('warn', 'sighup_config_reload_failed', { error: err.message })
    }
  })
}

// Auto-start only when run as main script (not when imported by tests)
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  if (!FIREFLY_URL || !FIREFLY_PAT) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'startup_failed',
      error: 'FIREFLY_URL and FIREFLY_PAT environment variables are required',
    }))
    process.exit(1)
  }

  const client = createFireflyClient(FIREFLY_URL, FIREFLY_PAT)
  const log = makeLog(FIREFLY_PAT, LOG_LEVEL)

  start(client, log).catch((err) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'startup_exception',
      error: err.message,
    }))
    process.exit(1)
  })
}
