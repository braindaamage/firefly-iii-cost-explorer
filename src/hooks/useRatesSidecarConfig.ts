import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRatesSidecarConfig,
  putRatesSidecarConfig,
  getRatesSidecarLastRun,
  putRatesSidecarRunNow,
  DEFAULT_CONFIG,
  isValidConfig,
} from '../api/ratesSidecarConfig'
import type { RatesSidecarConfig, RatesSidecarLastRun } from '../api/ratesSidecarConfig'

const STORAGE_KEY = 'ff3_rates_sidecar_config'
const RUN_NOW_TIMEOUT_MS = 10 * 60 * 1000  // 10 minutes

export interface UseRatesSidecarConfigResult {
  config: RatesSidecarConfig
  status: 'loading' | 'success' | 'error' | 'localFallback'
  source: 'remote' | 'local' | 'default'
  lastRun: RatesSidecarLastRun | null
  lastRunStatus: 'loading' | 'success' | 'error'
  updateConfig: (next: RatesSidecarConfig) => Promise<void>
  retryRemote: () => Promise<void>
  triggerRunNow: () => Promise<string>   // returns the requestedAt ISO used
  runNowPending: boolean                 // true while waiting for lastRun.timestamp > requestedAt
  runNowTimedOut: boolean                // true if >10min passed without lastRun advancing
}

function readLocalStorage(): RatesSidecarConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeLocalStorage(config: RatesSidecarConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore storage errors
  }
}

export function useRatesSidecarConfig(
  baseUrl: string,
  token: string
): UseRatesSidecarConfigResult {
  const queryClient = useQueryClient()
  const enabled = !!baseUrl && !!token

  const configQueryKey = ['ratesSidecar', 'config', baseUrl] as const
  const lastRunQueryKey = ['ratesSidecar', 'lastRun', baseUrl] as const

  const [putFailed, setPutFailed] = useState(false)

  // runNow pending state — lost on browser refresh (acceptable v1)
  const [runNowPendingRequestedAt, setRunNowPendingRequestedAt] = useState<string | null>(null)
  const [runNowTimedOut, setRunNowTimedOut] = useState(false)

  // Query 1: config — staleTime: Infinity, only refetched manually
  const configQuery = useQuery({
    queryKey: configQueryKey,
    queryFn: () => getRatesSidecarConfig(baseUrl, token),
    staleTime: Infinity,
    enabled,
  })

  // Query 2: lastRun — polled every 60s normally, every 10s when runNow is pending
  const lastRunQuery = useQuery({
    queryKey: lastRunQueryKey,
    queryFn: () => getRatesSidecarLastRun(baseUrl, token),
    refetchInterval: runNowPendingRequestedAt !== null && !runNowTimedOut ? 10_000 : 60_000,
    enabled,
  })

  // runNowPending is derived: pending while a requestedAt is stored AND lastRun hasn't advanced past it.
  // Avoids a separate clearing effect (and associated setState-in-effect lint warning).
  const lastRunTimestamp = (lastRunQuery.data as { timestamp?: string } | null | undefined)?.timestamp ?? null
  const runNowPending =
    runNowPendingRequestedAt !== null &&
    !runNowTimedOut &&
    !(lastRunTimestamp && lastRunTimestamp > runNowPendingRequestedAt)

  // --- 10 min timeout for runNow: fires in a callback (not synchronously in effect body) ---
  useEffect(() => {
    if (!runNowPendingRequestedAt || runNowTimedOut) return
    const timer = setTimeout(() => {
      setRunNowTimedOut(true)
    }, RUN_NOW_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [runNowPendingRequestedAt, runNowTimedOut])

  // --- Derive config status/source ---
  let config: RatesSidecarConfig = DEFAULT_CONFIG
  let status: UseRatesSidecarConfigResult['status'] = 'loading'
  let source: UseRatesSidecarConfigResult['source'] = 'default'

  if (!enabled) {
    status = 'loading'
    source = 'default'
    config = DEFAULT_CONFIG
  } else if (configQuery.status === 'pending') {
    status = 'loading'
    source = 'default'
    config = DEFAULT_CONFIG
  } else if (configQuery.status === 'success') {
    const remoteValue = configQuery.data
    if (putFailed) {
      status = 'localFallback'
      source = 'local'
      config = isValidConfig(remoteValue) ? remoteValue : DEFAULT_CONFIG
    } else if (remoteValue === null) {
      status = 'success'
      source = 'default'
      config = DEFAULT_CONFIG
    } else if (isValidConfig(remoteValue)) {
      status = 'success'
      source = 'remote'
      config = remoteValue
    } else {
      console.warn('[useRatesSidecarConfig] Remote value malformed, falling back to defaults:', remoteValue)
      status = 'success'
      source = 'default'
      config = DEFAULT_CONFIG
    }
  } else {
    // configQuery.status === 'error'
    const cached = readLocalStorage()
    if (cached !== null) {
      status = 'localFallback'
      source = 'local'
      config = cached
    } else {
      status = 'error'
      source = 'default'
      config = DEFAULT_CONFIG
    }
  }

  // Persist remote config to localStorage after a successful fetch
  useEffect(() => {
    if (status === 'success' && source === 'remote') {
      writeLocalStorage(config)
    }
  }, [status, source, config])

  // --- Derive lastRun ---
  const lastRun = lastRunQuery.data ?? null
  const lastRunStatus: UseRatesSidecarConfigResult['lastRunStatus'] =
    lastRunQuery.status === 'pending' ? 'loading' :
    lastRunQuery.status === 'error' ? 'error' : 'success'

  async function updateConfig(next: RatesSidecarConfig): Promise<void> {
    writeLocalStorage(next)
    queryClient.setQueryData(configQueryKey, next)
    try {
      await putRatesSidecarConfig(baseUrl, token, next)
      setPutFailed(false)
    } catch {
      setPutFailed(true)
    }
  }

  async function retryRemote(): Promise<void> {
    setPutFailed(false)
    await queryClient.invalidateQueries({ queryKey: configQueryKey })
  }

  async function triggerRunNow(): Promise<string> {
    const requestedAt = new Date().toISOString()
    await putRatesSidecarRunNow(baseUrl, token, requestedAt)
    setRunNowPendingRequestedAt(requestedAt)
    setRunNowTimedOut(false)
    return requestedAt
  }

  return {
    config,
    status,
    source,
    lastRun,
    lastRunStatus,
    updateConfig,
    retryRemote,
    triggerRunNow,
    runNowPending,
    runNowTimedOut,
  }
}
