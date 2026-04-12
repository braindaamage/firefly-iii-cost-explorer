import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPreference, putPreference } from '../api/preferences'
import type { ForecastModel } from '../lib/forecast-weights'

export interface ForecastConfig {
  historyMonths: number  // 1..12
  model: ForecastModel   // 'simple' | 'weighted'
}

export interface UseForecastConfigResult {
  config: ForecastConfig
  status: 'loading' | 'success' | 'error' | 'localFallback'
  source: 'remote' | 'local' | 'default'
  updateConfig: (next: ForecastConfig) => Promise<void>
  retryRemote: () => Promise<void>
}

const PREFERENCE_KEY = 'costExplorer.forecast'
const STORAGE_KEY = 'ff3_forecast_config'
const DEFAULTS: ForecastConfig = { historyMonths: 3, model: 'weighted' }

function isValidConfig(value: unknown): value is ForecastConfig {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.historyMonths !== 'number' || v.historyMonths < 1 || v.historyMonths > 12) return false
  if (v.model !== 'simple' && v.model !== 'weighted') return false
  return true
}

function readLocalStorage(): ForecastConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeLocalStorage(config: ForecastConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore storage errors
  }
}

export function useForecastConfig(baseUrl: string, token: string): UseForecastConfigResult {
  const queryClient = useQueryClient()
  const enabled = !!baseUrl && !!token
  const queryKey = ['forecast', 'config', baseUrl] as const

  // Tracks whether the last putPreference call failed.
  // Cleared explicitly in updateConfig (on success) and retryRemote (on retry).
  const [putFailed, setPutFailed] = useState(false)

  const query = useQuery({
    queryKey,
    queryFn: () => getPreference<ForecastConfig>(baseUrl, token, PREFERENCE_KEY),
    staleTime: Infinity,
    enabled,
  })

  // --- Derive config, status, source ---
  let config: ForecastConfig = DEFAULTS
  let status: UseForecastConfigResult['status'] = 'loading'
  let source: UseForecastConfigResult['source'] = 'default'

  if (!enabled) {
    status = 'loading'
    source = 'default'
    config = DEFAULTS
  } else if (query.status === 'pending') {
    status = 'loading'
    source = 'default'
    config = DEFAULTS
  } else if (query.status === 'success') {
    const remoteValue = query.data
    if (putFailed) {
      // Last put failed — optimistic value still in cache; surface as localFallback
      status = 'localFallback'
      source = 'local'
      config = isValidConfig(remoteValue) ? remoteValue : DEFAULTS
    } else if (remoteValue === null) {
      // 404 — preference does not exist yet
      status = 'success'
      source = 'default'
      config = DEFAULTS
    } else if (isValidConfig(remoteValue)) {
      status = 'success'
      source = 'remote'
      config = remoteValue
    } else {
      // Malformed remote value — treat as not present
      console.warn('[useForecastConfig] Remote value malformed, falling back to defaults:', remoteValue)
      status = 'success'
      source = 'default'
      config = DEFAULTS
    }
  } else {
    // query.status === 'error'
    const cached = readLocalStorage()
    if (cached !== null) {
      status = 'localFallback'
      source = 'local'
      config = cached
    } else {
      status = 'error'
      source = 'default'
      config = DEFAULTS
    }
  }

  // Persist remote config to localStorage after a successful fetch, outside the render body.
  useEffect(() => {
    if (status === 'success' && source === 'remote') {
      writeLocalStorage(config)
    }
  }, [status, source, config])

  // Auto-create preference on first use (eliminates 404 on subsequent loads)
  useEffect(() => {
    if (enabled && query.status === 'success' && query.data === null && !putFailed) {
      putPreference(baseUrl, token, PREFERENCE_KEY, DEFAULTS).catch(() => {
        // Silently ignore — defaults work without remote persistence.
        // The preference will be created on the user's first explicit save.
      })
    }
  }, [enabled, query.status, query.data, putFailed, baseUrl, token])

  async function updateConfig(next: ForecastConfig): Promise<void> {
    // 1. Optimistic write to localStorage immediately
    writeLocalStorage(next)
    // 2. Optimistic update of query cache for immediate UI update
    queryClient.setQueryData(queryKey, next)
    try {
      // 3. Persist to remote (PUT with fallback to POST from Fase 1)
      await putPreference(baseUrl, token, PREFERENCE_KEY, next)
      setPutFailed(false)
    } catch {
      // 4. Remote put failed: keep optimistic value, surface via localFallback status
      setPutFailed(true)
    }
  }

  async function retryRemote(): Promise<void> {
    // Clear putFailed optimistically before retry so UI shows loading/success state
    setPutFailed(false)
    await queryClient.invalidateQueries({ queryKey })
  }

  return { config, status, source, updateConfig, retryRemote }
}
