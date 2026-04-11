import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRatesSidecarConfig,
  putRatesSidecarConfig,
  getRatesSidecarLastRun,
  putRatesSidecarRunNow,
  DEFAULT_CONFIG,
  RATES_SIDECAR_CONFIG_KEY,
  RATES_SIDECAR_LAST_RUN_KEY,
  RATES_SIDECAR_RUN_NOW_KEY,
} from './ratesSidecarConfig'
import type { RatesSidecarConfig, RatesSidecarLastRun } from './ratesSidecarConfig'

vi.mock('./preferences', () => ({
  getPreference: vi.fn(),
  putPreference: vi.fn(),
}))

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

const MOCK_CONFIG: RatesSidecarConfig = { ...DEFAULT_CONFIG, enabled: false }

const MOCK_LAST_RUN: RatesSidecarLastRun = {
  timestamp: '2026-04-11T07:00:12Z',
  status: 'success',
  source: 'open-er-api',
  currenciesUpdated: ['USD', 'CLP'],
  currenciesFailed: [],
  error: null,
  nextRunEstimated: '2026-04-12T07:00:00Z',
}

describe('ratesSidecarConfig API wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getRatesSidecarConfig_returnsParsedConfig', async () => {
    const { getPreference } = await import('./preferences')
    vi.mocked(getPreference).mockResolvedValue(MOCK_CONFIG)

    const result = await getRatesSidecarConfig(BASE_URL, TOKEN)

    expect(result).toEqual(MOCK_CONFIG)
    expect(getPreference).toHaveBeenCalledWith(BASE_URL, TOKEN, RATES_SIDECAR_CONFIG_KEY)
  })

  it('getRatesSidecarConfig_on404_returnsNull', async () => {
    const { getPreference } = await import('./preferences')
    vi.mocked(getPreference).mockResolvedValue(null)

    const result = await getRatesSidecarConfig(BASE_URL, TOKEN)

    expect(result).toBeNull()
  })

  it('putRatesSidecarConfig_sendsPutWithCorrectBody', async () => {
    const { putPreference } = await import('./preferences')
    vi.mocked(putPreference).mockResolvedValue(undefined)

    await putRatesSidecarConfig(BASE_URL, TOKEN, MOCK_CONFIG)

    expect(putPreference).toHaveBeenCalledWith(BASE_URL, TOKEN, RATES_SIDECAR_CONFIG_KEY, MOCK_CONFIG)
  })

  it('getRatesSidecarLastRun_returnsParsedLastRun', async () => {
    const { getPreference } = await import('./preferences')
    vi.mocked(getPreference).mockResolvedValue(MOCK_LAST_RUN)

    const result = await getRatesSidecarLastRun(BASE_URL, TOKEN)

    expect(result).toEqual(MOCK_LAST_RUN)
    expect(getPreference).toHaveBeenCalledWith(BASE_URL, TOKEN, RATES_SIDECAR_LAST_RUN_KEY)
  })

  it('getRatesSidecarLastRun_on404_returnsNull', async () => {
    const { getPreference } = await import('./preferences')
    vi.mocked(getPreference).mockResolvedValue(null)

    const result = await getRatesSidecarLastRun(BASE_URL, TOKEN)

    expect(result).toBeNull()
  })

  it('putRatesSidecarRunNow_sendsPutWithRequestedAt', async () => {
    const { putPreference } = await import('./preferences')
    vi.mocked(putPreference).mockResolvedValue(undefined)
    const requestedAt = '2026-04-11T14:32:08.512Z'

    await putRatesSidecarRunNow(BASE_URL, TOKEN, requestedAt)

    expect(putPreference).toHaveBeenCalledWith(
      BASE_URL, TOKEN, RATES_SIDECAR_RUN_NOW_KEY, { requestedAt }
    )
  })
})
