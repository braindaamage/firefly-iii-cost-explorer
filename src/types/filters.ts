export type TimeRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom'

export interface DateRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

export type GroupBy =
  | 'category'
  | 'budget'
  | 'tag'
  | 'expense_account'
  | 'asset_account'

export interface FilterState {
  timeRange: TimeRangePreset
  customDateRange: DateRange | null // solo usado cuando timeRange === 'custom'
  groupBy: GroupBy
  accountIds: string[] // vacio = All
  categoryIds: string[] // vacio = All
  budgetIds: string[] // vacio = All
  tagIds: string[] // vacio = All
}

export const DEFAULT_FILTERS: FilterState = {
  timeRange: 'last_30_days',
  customDateRange: null,
  groupBy: 'category',
  accountIds: [],
  categoryIds: [],
  budgetIds: [],
  tagIds: [],
}

// Filtros opcionales (se muestran via "Add Filter")
export type OptionalFilterKey = 'budgetIds' | 'tagIds'
