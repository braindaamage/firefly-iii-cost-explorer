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


export interface InsightEntry {
  id: string
  name: string
  difference: string
  difference_float: number
  currency_id: string
  currency_code: string
  currency_symbol: string
}

export interface CategoryRaw {
  id: string
  attributes: {
    name: string
  }
}

export interface AccountRaw {
  id: string
  attributes: {
    name: string
    type: string
    currency_code: string
    currency_symbol: string
    currency_decimal_places: number
    current_balance: string
  }
}

export interface AssetAccountBalance {
  id: string
  name: string
  balance: number
  currencyCode: string
  currencySymbol: string
  currencyDecimalPlaces: number
}

export interface BudgetRaw {
  id: string
  attributes: {
    name: string
  }
}

export interface TagRaw {
  id: string
  attributes: {
    tag: string
  }
}

export interface BudgetLimitRaw {
  id: string
  attributes: {
    budget_id: number
    budget_name: string
    amount: string
    currency_code: string
  }
}

export interface BudgetLimit {
  id: string
  budget_id: string
  budget_name: string
  amount: number
  currency_code: string
}

export interface TransactionJournalRaw {
  transaction_journal_id: number
  date: string
  amount: string
  description: string
  source_name: string
  destination_name: string
  currency_code: string
}

export interface TransactionGroupRaw {
  id: string
  attributes: {
    transactions: TransactionJournalRaw[]
  }
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  currencyCode: string
  sourceAccount: string
  destinationAccount: string
}

export interface Pagination {
  total: number
  count: number
  perPage: number
  currentPage: number
  totalPages: number
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
