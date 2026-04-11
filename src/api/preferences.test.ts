import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPreference, putPreference } from './preferences'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'
const PREF_NAME = 'costExplorer.forecast'

interface ForecastConfig {
  historyMonths: number
  model: 'simple' | 'weighted'
}

const SAMPLE_DATA: ForecastConfig = { historyMonths: 3, model: 'weighted' }

function mockFetchOkWith(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    })
  )
}

function mockFetchError(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'Error',
      json: () => Promise.resolve({}),
    })
  )
}

function preferenceResponse<T>(name: string, data: T) {
  return {
    data: {
      type: 'preferences',
      id: name,
      attributes: { name, data },
    },
  }
}

describe('getPreference', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls GET /preferences/{name}', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/api/v1/preferences/')
    expect(url).toContain(encodeURIComponent(PREF_NAME))
  })

  it('includes Authorization header', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('returns parsed data on 200', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    const result = await getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    expect(result).toEqual(SAMPLE_DATA)
  })

  it('returns null on 404 (preference does not exist yet)', async () => {
    mockFetchError(404)
    const result = await getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    expect(result).toBeNull()
  })

  it('throws on 401 (not swallowed like 404)', async () => {
    mockFetchError(401)
    await expect(
      getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws on 500', async () => {
    mockFetchError(500)
    await expect(
      getPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME)
    ).rejects.toThrow()
  })
})

describe('putPreference', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls PUT /preferences/{name} first', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/api/v1/preferences/')
    expect(url).toContain(encodeURIComponent(PREF_NAME))
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(options.method).toBe('PUT')
  })

  it('PUT body is { data } only — name is in the URL', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ data: SAMPLE_DATA })
    expect(body).not.toHaveProperty('name')
  })

  it('includes Authorization header', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('resolves without return value on PUT success', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    const result = await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    expect(result).toBeUndefined()
  })

  it('falls back to POST when PUT returns 404 (preference not created yet)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(preferenceResponse(PREF_NAME, SAMPLE_DATA)),
        })
    )
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    // Second call is POST
    const postOptions = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    expect(postOptions.method).toBe('POST')
  })

  it('POST fallback body is { name, data }', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(preferenceResponse(PREF_NAME, SAMPLE_DATA)),
        })
    )
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const postOptions = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    const body = JSON.parse(postOptions.body as string)
    expect(body).toEqual({ name: PREF_NAME, data: SAMPLE_DATA })
  })

  it('POST fallback URL is /preferences (no name in path)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(preferenceResponse(PREF_NAME, SAMPLE_DATA)),
        })
    )
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const postUrl = vi.mocked(fetch).mock.calls[1][0] as string
    expect(postUrl).toMatch(/\/api\/v1\/preferences$/)
  })

  it('throws on PUT 500 without attempting POST', async () => {
    mockFetchError(500)
    await expect(
      putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    ).rejects.toThrow()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('throws on PUT 401 without attempting POST', async () => {
    mockFetchError(401)
    await expect(
      putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    ).rejects.toMatchObject({ statusCode: 401 })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('throws when POST fallback also fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          json: () => Promise.resolve({}),
        })
    )
    await expect(
      putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    ).rejects.toThrow()
  })
})
