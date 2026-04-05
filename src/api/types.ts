export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

export interface AutocompleteAccount {
  id: string
  name: string
  name_with_balance: string
  type: string
  currency_id: string
  currency_code: string
  currency_symbol: string
  currency_decimal_places: number
}

export interface AutocompleteCategory {
  id: string
  name: string
}

export interface AutocompleteBudget {
  id: string
  name: string
}

export interface AutocompleteTag {
  id: string
  name: string
  tag: string
}

export interface InsightEntry {
  id: string
  name: string
  difference: string
  difference_float: number
  currency_id: string
  currency_code: string
  currency_symbol: string
}

export interface AboutResponse {
  data: {
    version: string
    api_version: string
    php_version: string
    os: string
    driver: string
  }
}

export interface CurrencyResponse {
  data: {
    id: string
    attributes: {
      code: string
      name: string
      symbol: string
      decimal_places: number
    }
  }
}
