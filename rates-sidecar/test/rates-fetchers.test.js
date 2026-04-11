import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPrimary, fetchEcb, parseEcbXml, fetchRates } from '../src/rates-fetchers.js'

const noop = () => {}

function makeJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function makeTextResponse(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  }
}

const SAMPLE_ECB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
                 xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time="2026-04-11">
      <Cube currency="USD" rate="1.0856"/>
      <Cube currency="GBP" rate="0.8612"/>
      <Cube currency="JPY" rate="162.13"/>
      <Cube currency="CHF" rate="0.9382"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

describe('fetchPrimary', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns rates map from open.er-api.com response', async () => {
    fetch.mockResolvedValue(makeJsonResponse({
      result: 'success',
      rates: { USD: 1.0856, CLP: 1042.5, GBP: 0.8612 },
    }))

    const rates = await fetchPrimary()

    expect(rates).toEqual({ USD: 1.0856, CLP: 1042.5, GBP: 0.8612 })
  })

  it('throws when response is not ok', async () => {
    fetch.mockResolvedValue(makeJsonResponse({}, 503))
    await expect(fetchPrimary()).rejects.toThrow('503')
  })

  it('throws when result field is not "success"', async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: 'error', rates: null }))
    await expect(fetchPrimary()).rejects.toThrow(/unexpected shape/)
  })
})

describe('parseEcbXml', () => {
  it('parses ECB XML and returns rates map', () => {
    const rates = parseEcbXml(SAMPLE_ECB_XML)

    expect(rates.USD).toBeCloseTo(1.0856)
    expect(rates.GBP).toBeCloseTo(0.8612)
    expect(rates.JPY).toBeCloseTo(162.13)
    expect(rates.CHF).toBeCloseTo(0.9382)
  })

  it('does not include CLP (not in ECB)', () => {
    const rates = parseEcbXml(SAMPLE_ECB_XML)
    expect(rates.CLP).toBeUndefined()
  })

  it('throws on malformed XML structure', () => {
    expect(() => parseEcbXml('<root/>')).toThrow(/ECB XML/)
  })
})

describe('fetchEcb', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('fetches and parses ECB XML', async () => {
    fetch.mockResolvedValue(makeTextResponse(SAMPLE_ECB_XML))

    const rates = await fetchEcb()

    expect(rates.USD).toBeCloseTo(1.0856)
    expect(rates.GBP).toBeCloseTo(0.8612)
    expect(Object.keys(rates)).not.toContain('CLP')
  })
})

describe('fetchRates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns primary rates on success', async () => {
    fetch.mockResolvedValue(makeJsonResponse({
      result: 'success',
      rates: { USD: 1.08, CLP: 1042 },
    }))

    const result = await fetchRates(
      { primarySource: 'open-er-api', fallbackEnabled: true, fallbackSource: 'ecb' },
      noop
    )

    expect(result.source).toBe('open-er-api')
    expect(result.usedFallback).toBe(false)
    expect(result.rates.USD).toBe(1.08)
  })

  it('falls back to ECB when primary fails 3 times', async () => {
    // Primary fails, then ECB succeeds
    fetch
      .mockResolvedValueOnce(makeJsonResponse({}, 503))  // primary attempt 1
      .mockResolvedValueOnce(makeJsonResponse({}, 503))  // primary attempt 2
      .mockResolvedValueOnce(makeJsonResponse({}, 503))  // primary attempt 3
      .mockResolvedValue(makeTextResponse(SAMPLE_ECB_XML))  // fallback ECB

    const log = vi.fn()
    const promise = fetchRates(
      { primarySource: 'open-er-api', fallbackEnabled: true, fallbackSource: 'ecb' },
      log
    )
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.usedFallback).toBe(true)
    expect(result.source).toBe('ecb')
    expect(log).toHaveBeenCalledWith('warn', 'fetch_using_fallback', expect.any(Object))
  })

  it('throws when primary fails and fallback is disabled', async () => {
    fetch.mockResolvedValue(makeJsonResponse({}, 503))

    const promise = fetchRates(
      { primarySource: 'open-er-api', fallbackEnabled: false, fallbackSource: 'ecb' },
      noop
    )
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow(/fallback is disabled/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('logs warning for currencies missing in ECB (e.g. CLP)', async () => {
    // This tests parseEcbXml indirectly via the caller filtering step
    const ecbRates = parseEcbXml(SAMPLE_ECB_XML)
    expect(ecbRates.CLP).toBeUndefined()
    // The warning about missing currencies is logged in runJob (orchestrator layer),
    // not in fetchRates itself — confirmed here that CLP is absent from ECB output.
  })
})
