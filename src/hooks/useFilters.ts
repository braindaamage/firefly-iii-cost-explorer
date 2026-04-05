import { useState } from 'react'
import {
  type FilterState,
  DEFAULT_FILTERS,
  type OptionalFilterKey,
} from '../types/filters'
import { getStorageItem, setStorageItem } from '../lib/storage'

const FILTERS_KEY = 'ff3_filters'

function readFilters(): FilterState {
  return getStorageItem<FilterState>(FILTERS_KEY) ?? DEFAULT_FILTERS
}

function deriveActiveOptionalFilters(filters: FilterState): OptionalFilterKey[] {
  const active: OptionalFilterKey[] = []
  if (filters.budgetIds.length > 0) active.push('budgetIds')
  if (filters.tagIds.length > 0) active.push('tagIds')
  return active
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(readFilters)
  const [activeOptionalFilters, setActiveOptionalFilters] = useState<
    OptionalFilterKey[]
  >(() => deriveActiveOptionalFilters(readFilters()))

  function updateFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ): void {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    setStorageItem(FILTERS_KEY, updated)
  }

  function resetFilters(): void {
    setFilters(DEFAULT_FILTERS)
    setActiveOptionalFilters([])
    setStorageItem(FILTERS_KEY, DEFAULT_FILTERS)
  }

  function addOptionalFilter(key: OptionalFilterKey): void {
    setActiveOptionalFilters((prev) => {
      if (prev.includes(key)) return prev
      return [...prev, key]
    })
  }

  function removeOptionalFilter(key: OptionalFilterKey): void {
    setActiveOptionalFilters((prev) => prev.filter((k) => k !== key))
    updateFilter(key, [])
  }

  const allOptional: OptionalFilterKey[] = ['budgetIds', 'tagIds']
  const availableOptionalFilters = allOptional.filter(
    (k) => !activeOptionalFilters.includes(k)
  )

  return {
    filters,
    updateFilter,
    resetFilters,
    activeOptionalFilters,
    addOptionalFilter,
    removeOptionalFilter,
    availableOptionalFilters,
  }
}
