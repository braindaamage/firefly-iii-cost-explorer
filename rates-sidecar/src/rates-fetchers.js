/**
 * Rate fetchers: open.er-api.com (primary) and ECB XML (fallback).
 *
 * open.er-api.com: free, no API key, ~daily refresh, includes CLP and 160+ currencies.
 * ECB XML:        free, ~28 major currencies (no CLP), updated on business days ~16:00 CET.
 *
 * fetchRates() orchestrates primary → retry 3x → fallback (if enabled).
 */

import { XMLParser } from 'fast-xml-parser'

export const OPEN_ER_URL = 'https://open.er-api.com/v6/latest/EUR'
export const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

const FETCH_TIMEOUT_MS = 15_000
const RETRY_DELAYS_MS = [30_000, 120_000]  // 30s then 2min before 3rd attempt

/**
 * Fetch from open.er-api.com.
 * @returns {Promise<Record<string, number>>} rates keyed by currency code
 */
export async function fetchPrimary() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(OPEN_ER_URL, { signal: controller.signal })
    if (!res.ok) throw new Error(`open.er-api.com returned ${res.status}`)
    const json = await res.json()
    if (json.result !== 'success' || !json.rates || typeof json.rates !== 'object') {
      throw new Error(`open.er-api.com unexpected shape: result=${json.result}`)
    }
    return json.rates  // e.g. { USD: 1.08, CLP: 1042.5, ... }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch and parse the ECB eurofxref-daily.xml.
 * @returns {Promise<Record<string, number>>} rates keyed by currency code (EUR base, ~28 currencies)
 */
export async function fetchEcb() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(ECB_URL, { signal: controller.signal })
    if (!res.ok) throw new Error(`ECB returned ${res.status}`)
    const xml = await res.text()
    return parseEcbXml(xml)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parses ECB eurofxref XML into a rates map.
 * Exported for unit testing without network I/O.
 */
export function parseEcbXml(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)

  // The XML structure: gesmes:Envelope > Cube > Cube[time] > Cube[currency, rate][]
  const outerCube = parsed?.['gesmes:Envelope']?.Cube?.Cube
  if (!outerCube) {
    throw new Error('ECB XML: missing gesmes:Envelope.Cube.Cube')
  }

  // outerCube may be a single Cube (one date entry) with nested Cube array
  const entries = Array.isArray(outerCube?.Cube) ? outerCube.Cube
    : Array.isArray(outerCube) ? outerCube.flatMap((c) => (Array.isArray(c.Cube) ? c.Cube : []))
    : []

  if (entries.length === 0) {
    throw new Error('ECB XML: no rate entries found')
  }

  const rates = {}
  for (const entry of entries) {
    const currency = entry['@_currency']
    const rate = entry['@_rate']
    if (typeof currency === 'string' && (typeof rate === 'number' || typeof rate === 'string')) {
      rates[currency] = parseFloat(String(rate))
    }
  }
  return rates
}

/**
 * Fetches rates using primary source with retries, falling back to the secondary
 * source if all primary attempts fail and fallback is enabled.
 *
 * @param {object} config  sidecar config (primarySource, fallbackEnabled, fallbackSource)
 * @param {function} log   structured logger (level, event, data)
 * @returns {Promise<{ rates: Record<string, number>, source: string, usedFallback: boolean }>}
 */
export async function fetchRates(config, log) {
  const fetchFn = config.primarySource === 'open-er-api' ? fetchPrimary : fetchEcb

  // Try primary up to 3 times with backoff
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const rates = await fetchFn()
      log('info', 'fetch_primary_ok', { source: config.primarySource, attempt })
      return { rates, source: config.primarySource, usedFallback: false }
    } catch (err) {
      lastErr = err
      log('warn', 'fetch_primary_attempt_failed', {
        source: config.primarySource,
        attempt,
        error: err.message,
      })
      if (attempt < 3) {
        await sleep(RETRY_DELAYS_MS[attempt - 1])
      }
    }
  }

  // All primary attempts failed
  if (!config.fallbackEnabled) {
    throw new Error(
      `Primary source (${config.primarySource}) failed 3 times and fallback is disabled. Last error: ${lastErr.message}`
    )
  }

  log('warn', 'fetch_using_fallback', { fallbackSource: config.fallbackSource, primaryError: lastErr.message })
  const fallbackFn = config.fallbackSource === 'ecb' ? fetchEcb : fetchPrimary
  const rates = await fallbackFn()
  return { rates, source: config.fallbackSource, usedFallback: true }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
