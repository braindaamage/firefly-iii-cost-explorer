import { useState } from 'react'
import { getStorageItem, setStorageItem } from '../lib/storage'
import type { GranularityOption } from '../types/filters'

const KEY = 'ff3_granularity'

export function useGranularity() {
  const [granularity, setGranularity] = useState<GranularityOption>(
    () => getStorageItem<GranularityOption>(KEY) ?? 'auto'
  )

  function updateGranularity(value: GranularityOption) {
    setGranularity(value)
    setStorageItem(KEY, value)
  }

  return { granularity, updateGranularity }
}
