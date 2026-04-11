import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFireflyClient } from '../src/firefly-client.js'

const BASE_URL = 'http://firefly-iii:8080'
const PAT = 'secret-pat-12345'

function makeOkResponse(body, status = 200) {
  return {
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  }
}

function makeErrorResponse(status, body = '') {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  }
}

describe('createFireflyClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getCurrencies', () => {
    it('extracts currency codes from active=true response', async () => {
      fetch.mockResolvedValue(makeOkResponse({
        data: [
          { attributes: { code: 'EUR' } },
          { attributes: { code: 'USD' } },
          { attributes: { code: 'CLP' } },
        ],
      }))

      const client = createFireflyClient(BASE_URL, PAT)
      const codes = await client.getCurrencies()

      expect(codes).toEqual(['EUR', 'USD', 'CLP'])
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/v1/currencies?active=true&limit=200`,
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }) })
      )
    })
  })

  describe('getPreference', () => {
    it('returns the data attribute on 200', async () => {
      const prefData = { cronSchedule: '0 7 * * *', enabled: true }
      fetch.mockResolvedValue(makeOkResponse({ data: { attributes: { data: prefData } } }))

      const client = createFireflyClient(BASE_URL, PAT)
      const result = await client.getPreference('costExplorer.ratesSidecar')

      expect(result).toEqual(prefData)
    })

    it('returns null on 404', async () => {
      fetch.mockResolvedValue(makeErrorResponse(404))

      const client = createFireflyClient(BASE_URL, PAT)
      const result = await client.getPreference('costExplorer.ratesSidecar')

      expect(result).toBeNull()
    })

    it('throws on non-404 errors', async () => {
      fetch.mockResolvedValue(makeErrorResponse(500, 'Internal Server Error'))

      const client = createFireflyClient(BASE_URL, PAT)
      await expect(client.getPreference('any-key')).rejects.toThrow('500')
    })

    it('aborts request after FIREFLY_TIMEOUT_MS when fetch never resolves', async () => {
      vi.useFakeTimers()
      // Mock fetch that listens to the abort signal and rejects when aborted
      fetch.mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      const client = createFireflyClient(BASE_URL, PAT)
      // Attach rejection handler BEFORE advancing timers to avoid unhandled-rejection window
      const assertion = expect(client.getCurrencies()).rejects.toThrow()
      await vi.advanceTimersByTimeAsync(31_000)
      await assertion

      vi.useRealTimers()
    })
  })

  describe('putPreference', () => {
    it('PUTs successfully when preference exists', async () => {
      fetch.mockResolvedValue(makeOkResponse({ data: {} }, 200))
      const client = createFireflyClient(BASE_URL, PAT)

      await client.putPreference('costExplorer.ratesSidecar', { enabled: true })

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/v1/preferences/costExplorer.ratesSidecar`,
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('falls back to POST when PUT returns 404 (preference does not exist yet)', async () => {
      fetch
        .mockResolvedValueOnce(makeErrorResponse(404))  // PUT → 404
        .mockResolvedValueOnce(makeOkResponse({ data: {} }, 201))  // POST → 201

      const client = createFireflyClient(BASE_URL, PAT)
      await client.putPreference('costExplorer.ratesSidecar', { enabled: true })

      expect(fetch).toHaveBeenCalledTimes(2)
      const [, postCall] = fetch.mock.calls
      expect(postCall[0]).toBe(`${BASE_URL}/api/v1/preferences`)
      expect(postCall[1].method).toBe('POST')
      expect(JSON.parse(postCall[1].body)).toEqual({ name: 'costExplorer.ratesSidecar', data: { enabled: true } })
    })

    it('rethrows non-404 errors from PUT', async () => {
      fetch.mockResolvedValue(makeErrorResponse(500, 'Server Error'))
      const client = createFireflyClient(BASE_URL, PAT)

      await expect(client.putPreference('any-key', {})).rejects.toThrow('500')
    })
  })

  describe('postExchangeRates', () => {
    it('sends correct payload shape: { from, rates }', async () => {
      fetch.mockResolvedValue(makeOkResponse(null, 204))
      const client = createFireflyClient(BASE_URL, PAT)

      await client.postExchangeRates('2026-04-11', 'EUR', { USD: '1.08', CLP: '1042' })

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/v1/exchange-rates/by-date/2026-04-11`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ from: 'EUR', rates: { USD: '1.08', CLP: '1042' } }),
        })
      )
    })

    it('includes Authorization: Bearer header', async () => {
      fetch.mockResolvedValue(makeOkResponse(null, 204))
      const client = createFireflyClient(BASE_URL, PAT)

      await client.postExchangeRates('2026-04-11', 'EUR', { USD: '1.08' })

      const headers = fetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe(`Bearer ${PAT}`)
    })

    it('does NOT include PAT in thrown error message on 401', async () => {
      // First call fails with 401, retries also fail
      fetch.mockResolvedValue(makeErrorResponse(401, `Unauthorized ${PAT}`))

      const client = createFireflyClient(BASE_URL, PAT)

      try {
        await client.postExchangeRates('2026-04-11', 'EUR', { USD: '1.08' })
        expect.fail('should have thrown')
      } catch (err) {
        expect(err.message).not.toContain(PAT)
        expect(err.body).not.toContain(PAT)
      }
    })

    it('retries on failure and succeeds on 3rd attempt', async () => {
      vi.useFakeTimers()
      fetch
        .mockResolvedValueOnce(makeErrorResponse(503))
        .mockResolvedValueOnce(makeErrorResponse(503))
        .mockResolvedValue(makeOkResponse(null, 204))

      const client = createFireflyClient(BASE_URL, PAT)
      const promise = client.postExchangeRates('2026-04-11', 'EUR', { USD: '1.08' })

      // Advance timers through the two retry delays
      await vi.runAllTimersAsync()
      await promise

      expect(fetch).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })
  })

  describe('writeLastRun', () => {
    it('PUT 200: writes silently without fallback', async () => {
      fetch.mockResolvedValue(makeOkResponse({}, 200))
      const client = createFireflyClient(BASE_URL, PAT)

      await client.writeLastRun({ timestamp: '2026-04-11T00:00:00Z', status: 'success' })

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch.mock.calls[0][1].method).toBe('PUT')
    })

    it('PUT 404 → POST fallback', async () => {
      fetch
        .mockResolvedValueOnce(makeErrorResponse(404))           // PUT → 404
        .mockResolvedValueOnce(makeOkResponse({}, 201))          // POST → 201

      const client = createFireflyClient(BASE_URL, PAT)
      await client.writeLastRun({ timestamp: '2026-04-11T00:00:00Z', status: 'success' })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch.mock.calls[0][1].method).toBe('PUT')
      expect(fetch.mock.calls[1][1].method).toBe('POST')
    })

    it('PUT 500: error swallowed (non-critical)', async () => {
      fetch.mockResolvedValue(makeErrorResponse(500, 'Server Error'))
      const client = createFireflyClient(BASE_URL, PAT)

      await expect(
        client.writeLastRun({ timestamp: '2026-04-11T00:00:00Z', status: 'success' })
      ).resolves.toBeUndefined()
    })
  })
})
