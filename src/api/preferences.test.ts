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

  it('calls PUT /preferences/{name}', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/api/v1/preferences/')
    expect(url).toContain(encodeURIComponent(PREF_NAME))
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(options.method).toBe('PUT')
  })

  it('sends name and data in the request body', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ name: PREF_NAME, data: SAMPLE_DATA })
  })

  it('includes Authorization header', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('resolves without return value on success', async () => {
    mockFetchOkWith(preferenceResponse(PREF_NAME, SAMPLE_DATA))
    const result = await putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    expect(result).toBeUndefined()
  })

  it('throws on 401', async () => {
    mockFetchError(401)
    await expect(
      putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws on 500', async () => {
    mockFetchError(500)
    await expect(
      putPreference<ForecastConfig>(BASE_URL, TOKEN, PREF_NAME, SAMPLE_DATA)
    ).rejects.toThrow()
  })
})
