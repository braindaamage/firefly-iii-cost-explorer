import { getPreference, putPreference } from './preferences'

// Preference keys — must match rates-sidecar/src/config.js constants
export const RATES_SIDECAR_CONFIG_KEY = 'costExplorer.ratesSidecar'
export const RATES_SIDECAR_LAST_RUN_KEY = 'costExplorer.ratesSidecar.lastRun'
export const RATES_SIDECAR_RUN_NOW_KEY = 'costExplorer.ratesSidecar.runNow'

export type PrimarySource = 'open-er-api' | 'ecb'
export type FallbackSource = 'open-er-api' | 'ecb'
export type CurrencyMode = 'active' | 'explicit'

export interface RatesSidecarConfig {
  version: number
  enabled: boolean
  cronSchedule: string
  primarySource: PrimarySource
  fallbackEnabled: boolean
  fallbackSource: FallbackSource
  currencyMode: CurrencyMode
  explicitCurrencies: string[]
  baseCurrency: string
}

export interface RatesSidecarLastRun {
  timestamp: string            // ISO8601
  status: 'success' | 'failed' | 'partial'
  source: string               // 'open-er-api' | 'ecb' | 'none'
  currenciesUpdated: string[]
  currenciesFailed: string[]
  error: string | null
  nextRunEstimated: string | null
}

export interface RatesSidecarRunNow {
  requestedAt: string          // ISO8601
}

/**
 * DEFAULT_CONFIG must be byte-compatible with DEFAULTS in rates-sidecar/src/config.js.
 * If either changes, update both together.
 */
export const DEFAULT_CONFIG: RatesSidecarConfig = {
  version: 1,
  enabled: true,
  cronSchedule: '0 7 * * *',
  primarySource: 'open-er-api',
  fallbackEnabled: true,
  fallbackSource: 'ecb',
  currencyMode: 'active',
  explicitCurrencies: ['USD', 'CLP'],
  baseCurrency: 'EUR',
}

const VALID_SOURCES: string[] = ['open-er-api', 'ecb']
const VALID_CURRENCY_MODES: string[] = ['active', 'explicit']

export function isValidConfig(value: unknown): value is RatesSidecarConfig {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.version !== 'number') return false
  if (typeof v.enabled !== 'boolean') return false
  if (typeof v.cronSchedule !== 'string' || v.cronSchedule.length === 0) return false
  if (!VALID_SOURCES.includes(v.primarySource as string)) return false
  if (typeof v.fallbackEnabled !== 'boolean') return false
  if (!VALID_SOURCES.includes(v.fallbackSource as string)) return false
  if (!VALID_CURRENCY_MODES.includes(v.currencyMode as string)) return false
  if (!Array.isArray(v.explicitCurrencies)) return false
  if (typeof v.baseCurrency !== 'string' || v.baseCurrency.length === 0) return false
  return true
}

export async function getRatesSidecarConfig(
  baseUrl: string,
  token: string
): Promise<RatesSidecarConfig | null> {
  return getPreference<RatesSidecarConfig>(baseUrl, token, RATES_SIDECAR_CONFIG_KEY)
}

export async function putRatesSidecarConfig(
  baseUrl: string,
  token: string,
  config: RatesSidecarConfig
): Promise<void> {
  return putPreference(baseUrl, token, RATES_SIDECAR_CONFIG_KEY, config)
}

export async function getRatesSidecarLastRun(
  baseUrl: string,
  token: string
): Promise<RatesSidecarLastRun | null> {
  return getPreference<RatesSidecarLastRun>(baseUrl, token, RATES_SIDECAR_LAST_RUN_KEY)
}

export async function putRatesSidecarRunNow(
  baseUrl: string,
  token: string,
  requestedAt: string
): Promise<void> {
  return putPreference<RatesSidecarRunNow>(baseUrl, token, RATES_SIDECAR_RUN_NOW_KEY, { requestedAt })
}
