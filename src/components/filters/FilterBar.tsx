import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useConfig } from '../../hooks/useConfig'
import { fetchAssetAccounts } from '../../api/accounts'
import { fetchCategories } from '../../api/categories'
import { fetchBudgets } from '../../api/budgets'
import { fetchTags } from '../../api/tags'
import { getPresetLabel } from '../../lib/date-utils'
import type { FilterState, GroupBy, OptionalFilterKey } from '../../types/filters'
import { FilterChip } from './FilterChip'
import { FilterDropdown } from './FilterDropdown'
import { DateRangeFilter } from './DateRangeFilter'
import { AddFilterButton } from './AddFilterButton'

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  category: 'Category',
  budget: 'Budget',
  tag: 'Tag',
  expense_account: 'Expense Account',
  asset_account: 'Asset Account',
}

const GROUP_BY_OPTIONS: GroupBy[] = [
  'category',
  'budget',
  'tag',
  'expense_account',
  'asset_account',
]

const OPTIONAL_FILTER_LABELS: Record<OptionalFilterKey, string> = {
  budgetIds: 'Budgets:',
  tagIds: 'Tags:',
}

interface MultiSelectDropdownProps {
  items: { id: string; name: string }[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}

function MultiSelectDropdown({
  items,
  selectedIds,
  onChange,
  loading,
}: MultiSelectDropdownProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length

  function toggleItem(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([])
    } else {
      onChange(items.map((i) => i.id))
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '12px 16px', color: '#9aa0a6', fontSize: '13px' }}>
        Loading...
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={toggleAll}
        role="option"
        aria-selected={allSelected}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid #3c4043',
          fontSize: '13px',
          color: '#9aa0a6',
          fontFamily: "'Roboto', sans-serif",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = ''
        }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: '#8ab4f8' }}
        />
        {allSelected ? 'Deselect all' : 'Select all'}
      </div>
      {items.map((item) => {
        const checked = selectedIds.includes(item.id)
        return (
          <div
            key={item.id}
            role="option"
            aria-selected={checked}
            onClick={() => toggleItem(item.id)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#e8eaed',
              fontFamily: "'Roboto', sans-serif",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.backgroundColor = ''
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleItem(item.id)}
              aria-label={item.name}
              onClick={(e) => e.stopPropagation()}
              style={{ accentColor: '#8ab4f8' }}
            />
            {item.name}
          </div>
        )
      })}
    </div>
  )
}

type ActiveChip =
  | 'timeRange'
  | 'groupBy'
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'tags'
  | null

export interface FilterBarProps {
  filters: FilterState
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  activeOptionalFilters: OptionalFilterKey[]
  addOptionalFilter: (key: OptionalFilterKey) => void
  removeOptionalFilter: (key: OptionalFilterKey) => void
  availableOptionalFilters: OptionalFilterKey[]
}

export function FilterBar({
  filters,
  updateFilter,
  activeOptionalFilters,
  addOptionalFilter,
  removeOptionalFilter,
  availableOptionalFilters,
}: FilterBarProps) {
  const { config } = useConfig()

  const [openChip, setOpenChip] = useState<ActiveChip>(null)

  const timeRangeRef = useRef<HTMLDivElement>(null)
  const groupByRef = useRef<HTMLDivElement>(null)
  const accountsRef = useRef<HTMLDivElement>(null)
  const categoriesRef = useRef<HTMLDivElement>(null)
  const budgetsRef = useRef<HTMLDivElement>(null)
  const tagsRef = useRef<HTMLDivElement>(null)

  const baseUrl = config?.baseUrl ?? ''
  const token = config?.apiToken ?? ''
  const enabled = !!config

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts', baseUrl, token],
    queryFn: () => fetchAssetAccounts(baseUrl, token),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', baseUrl, token],
    queryFn: () => fetchCategories(baseUrl, token),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', baseUrl, token],
    queryFn: () => fetchBudgets(baseUrl, token),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', baseUrl, token],
    queryFn: () => fetchTags(baseUrl, token),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  function toggleChip(chip: ActiveChip) {
    setOpenChip((prev) => (prev === chip ? null : chip))
  }

  function closeChip() {
    setOpenChip(null)
  }

  function getSelectionLabel(ids: string[], total: number): string {
    if (ids.length === 0) return 'All'
    if (ids.length === total) return 'All'
    return `${ids.length} selected`
  }

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '17px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 500,
          fontSize: '14px',
          color: '#9aa0a6',
          flexShrink: 0,
        }}
      >
        Filters:
      </span>

      {/* Time range chip */}
      <div ref={timeRangeRef} style={{ position: 'relative' }}>
        <FilterChip
          label="Time range:"
          value={getPresetLabel(filters.timeRange)}
          onClick={() => toggleChip('timeRange')}
        />
        <FilterDropdown
          open={openChip === 'timeRange'}
          onClose={closeChip}
          anchorRef={timeRangeRef}
        >
          <DateRangeFilter
            currentPreset={filters.timeRange}
            customRange={filters.customDateRange}
            onSelectPreset={(preset) => updateFilter('timeRange', preset)}
            onSelectCustomRange={(range) => {
              updateFilter('timeRange', 'custom')
              updateFilter('customDateRange', range)
            }}
            onClose={closeChip}
          />
        </FilterDropdown>
      </div>

      {/* Group by chip */}
      <div ref={groupByRef} style={{ position: 'relative' }}>
        <FilterChip
          label="Group by:"
          value={GROUP_BY_LABELS[filters.groupBy]}
          onClick={() => toggleChip('groupBy')}
        />
        <FilterDropdown
          open={openChip === 'groupBy'}
          onClose={closeChip}
          anchorRef={groupByRef}
        >
          {GROUP_BY_OPTIONS.map((option) => (
            <div
              key={option}
              role="option"
              aria-selected={filters.groupBy === option}
              onClick={() => {
                updateFilter('groupBy', option)
                closeChip()
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: "'Roboto', sans-serif",
                fontSize: '13px',
                color: '#e8eaed',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.backgroundColor =
                  '#2d2d2d'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.backgroundColor = ''
              }}
            >
              {GROUP_BY_LABELS[option]}
              {filters.groupBy === option && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8ab4f8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          ))}
        </FilterDropdown>
      </div>

      {/* Accounts chip */}
      <div ref={accountsRef} style={{ position: 'relative' }}>
        <FilterChip
          label="Accounts:"
          value={getSelectionLabel(filters.accountIds, accounts?.length ?? 0)}
          onClick={() => toggleChip('accounts')}
        />
        <FilterDropdown
          open={openChip === 'accounts'}
          onClose={closeChip}
          anchorRef={accountsRef}
        >
          <MultiSelectDropdown
            items={accounts ?? []}
            selectedIds={filters.accountIds}
            onChange={(ids) => updateFilter('accountIds', ids)}
            loading={accountsLoading}
          />
        </FilterDropdown>
      </div>

      {/* Categories chip */}
      <div ref={categoriesRef} style={{ position: 'relative' }}>
        <FilterChip
          label="Categories:"
          value={getSelectionLabel(filters.categoryIds, categories?.length ?? 0)}
          onClick={() => toggleChip('categories')}
        />
        <FilterDropdown
          open={openChip === 'categories'}
          onClose={closeChip}
          anchorRef={categoriesRef}
        >
          <MultiSelectDropdown
            items={categories ?? []}
            selectedIds={filters.categoryIds}
            onChange={(ids) => updateFilter('categoryIds', ids)}
            loading={categoriesLoading}
          />
        </FilterDropdown>
      </div>

      {/* Optional chips */}
      {activeOptionalFilters.includes('budgetIds') && (
        <div ref={budgetsRef} style={{ position: 'relative' }}>
          <FilterChip
            label={OPTIONAL_FILTER_LABELS.budgetIds}
            value={getSelectionLabel(filters.budgetIds, budgets?.length ?? 0)}
            onClick={() => toggleChip('budgets')}
            onRemove={() => removeOptionalFilter('budgetIds')}
          />
          <FilterDropdown
            open={openChip === 'budgets'}
            onClose={closeChip}
            anchorRef={budgetsRef}
          >
            <MultiSelectDropdown
              items={budgets ?? []}
              selectedIds={filters.budgetIds}
              onChange={(ids) => updateFilter('budgetIds', ids)}
              loading={budgetsLoading}
            />
          </FilterDropdown>
        </div>
      )}

      {activeOptionalFilters.includes('tagIds') && (
        <div ref={tagsRef} style={{ position: 'relative' }}>
          <FilterChip
            label={OPTIONAL_FILTER_LABELS.tagIds}
            value={getSelectionLabel(filters.tagIds, tags?.length ?? 0)}
            onClick={() => toggleChip('tags')}
            onRemove={() => removeOptionalFilter('tagIds')}
          />
          <FilterDropdown
            open={openChip === 'tags'}
            onClose={closeChip}
            anchorRef={tagsRef}
          >
            <MultiSelectDropdown
              items={tags ?? []}
              selectedIds={filters.tagIds}
              onChange={(ids) => updateFilter('tagIds', ids)}
              loading={tagsLoading}
            />
          </FilterDropdown>
        </div>
      )}

      <div style={{ marginLeft: 'auto' }}>
        <AddFilterButton
          availableFilters={availableOptionalFilters}
          onAdd={addOptionalFilter}
        />
      </div>
    </div>
  )
}
