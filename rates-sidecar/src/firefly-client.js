/**
 * Minimal Firefly III API client for the rates sidecar.
 *
 * Covers only the 4 calls needed:
 *   1. GET /currencies?active=true  → list of active currency codes
 *   2. GET /preferences/{key}       → read a preference (null on 404)
 *   3. PUT /preferences/{key}       → write a preference
 *   4. POST /exchange-rates/by-date/{date} → batch-write rates (idempotent)
 *
 * The PAT is passed once at factory time and NEVER logged.
 */

/**
 * @typedef {Object} FireflyClient
 * @property {() => Promise<string[]>} getCurrencies
 * @property {(key: string) => Promise<any|null>} getPreference
 * @property {(key: string, value: any) => Promise<void>} putPreference
 * @property {(date: string, base: string, rates: Record<string, string>) => Promise<void>} postExchangeRates
 * @property {(lastRun: object) => Promise<void>} writeLastRun
 */

// Timeout for all Firefly API requests
const FIREFLY_TIMEOUT_MS = 30_000

/**
 * @param {string} baseUrl  e.g. "http://firefly-iii:8080"
 * @param {string} pat      Personal Access Token (never logged)
 * @returns {FireflyClient}
 */
export function createFireflyClient(baseUrl, pat) {
  const authHeader = `Bearer ${pat}`

  /**
   * Raw fetch wrapper with timeout. Throws on non-2xx, with status attached.
   * The Authorization header value is NEVER interpolated into error messages.
   */
  async function request(path, options = {}) {
    const url = `${baseUrl}/api/v1${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FIREFLY_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const err = new Error(`Firefly API ${res.status} on ${path}`)
        err.status = res.status
        // Redact all occurrences of PAT from body in case Firefly echoes request headers
        err.body = body.replaceAll(pat, '[REDACTED]')
        throw err
      }
      const text = await res.text()
      return text ? JSON.parse(text) : null
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Retry with exponential backoff. Default delays: 30s, 2min, 10min.
   * Client errors (4xx) are NOT retried — they indicate a permanent failure.
   */
  async function withRetry(fn, delays = [30_000, 120_000, 600_000]) {
    let lastErr
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        // Don't retry client errors (4xx) — they won't resolve with retries
        if (err.status >= 400 && err.status < 500) throw err
        if (attempt < delays.length) {
          await sleep(delays[attempt])
        }
      }
    }
    throw lastErr
  }

  /**
   * Internal: upsert a preference (PUT first; POST on 404).
   * Mirrors Firefly III 6.5.9 behaviour verified empirically.
   */
  async function upsertPreference(key, value) {
    try {
      await request(`/preferences/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ name: key, data: value }),
      })
    } catch (err) {
      if (err.status === 404) {
        await request('/preferences', {
          method: 'POST',
          body: JSON.stringify({ name: key, data: value }),
        })
      } else {
        throw err
      }
    }
  }

  return {
    /**
     * Returns array of active currency codes.
     * limit=200 covers practical cases; users with >200 active currencies should
     * use currencyMode='explicit'. See README "Known limitations".
     */
    async getCurrencies() {
      const data = await request('/currencies?active=true&limit=200')
      return (data?.data ?? []).map((c) => c.attributes?.code).filter(Boolean)
    },

    /** Returns the `data` field of the preference, or null on 404. */
    async getPreference(key) {
      try {
        const res = await request(`/preferences/${encodeURIComponent(key)}`)
        return res?.data?.attributes?.data ?? null
      } catch (err) {
        if (err.status === 404) return null
        throw err
      }
    },

    /** Upsert a preference. Delegates to internal upsertPreference. */
    async putPreference(key, value) {
      await upsertPreference(key, value)
    },

    /**
     * POST exchange rates for a given date.
     * Idempotent: re-running overwrites with the same rates.
     * Retries automatically on transient failures.
     */
    async postExchangeRates(date, base, rates) {
      await withRetry(() =>
        request(`/exchange-rates/by-date/${date}`, {
          method: 'POST',
          body: JSON.stringify({ from: base, rates }),
        })
      )
    },

    /**
     * Writes last-run status to a separate read-only preference consumed by the SPA.
     * Uses internal upsertPreference (PUT→POST fallback). Errors are swallowed (non-critical).
     */
    async writeLastRun(lastRun) {
      try {
        await upsertPreference('costExplorer.ratesSidecar.lastRun', lastRun)
      } catch {
        // Non-critical — swallow silently (caller logs if needed)
      }
    },
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
