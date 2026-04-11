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

/**
 * @param {string} baseUrl  e.g. "http://firefly-iii:8080"
 * @param {string} pat      Personal Access Token (never logged)
 * @returns {FireflyClient}
 */
export function createFireflyClient(baseUrl, pat) {
  const authHeader = `Bearer ${pat}`

  /**
   * Raw fetch wrapper. Throws on non-2xx, with status attached.
   * The Authorization header value is NEVER interpolated into error messages.
   */
  async function request(path, options = {}) {
    const url = `${baseUrl}/api/v1${path}`
    const res = await fetch(url, {
      ...options,
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
      // Redact PAT from body in case Firefly echoes request headers
      err.body = body.replace(pat, '[REDACTED]')
      throw err
    }
    const text = await res.text()
    return text ? JSON.parse(text) : null
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

  return {
    /** Returns array of active currency codes, base currencies first. */
    async getCurrencies() {
      const data = await request('/currencies?active=true')
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

    /** PUT /preferences/{key} with { name, data }. */
    async putPreference(key, value) {
      await request(`/preferences/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ name: key, data: value }),
      })
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
     * Errors are swallowed (non-critical).
     */
    async writeLastRun(lastRun) {
      const key = 'costExplorer.ratesSidecar.lastRun'
      try {
        await request(`/preferences/${encodeURIComponent(key)}`, {
          method: 'PUT',
          body: JSON.stringify({ name: key, data: lastRun }),
        })
      } catch (err) {
        // Non-critical — swallow silently (caller logs if needed)
        void err
      }
    },
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
