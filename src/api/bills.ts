import { createApiClient } from './client'

interface BillRaw {
  id: string
  attributes: {
    name: string
    active: boolean
    currency_code: string
    currency_symbol: string
    currency_decimal_places: number
    amount_min: string
    amount_max: string
    amount_avg: string
    pay_dates: string[]
    paid_dates: { date: string; transaction_journal_id: string; transaction_group_id: string }[]
    pc_amount_min: string | null
    pc_amount_max: string | null
    pc_amount_avg: string | null
  }
}

export interface Bill {
  id: string
  name: string
  active: boolean
  currencyCode: string
  currencySymbol: string
  currencyDecimalPlaces: number
  amountMin: number
  amountMax: number
  amountAvg: number
  pcAmountMin: number | null
  pcAmountMax: number | null
  pcAmountAvg: number | null
  // YYYY-MM-DD (normalized from Firefly ISO8601 at fetch time)
  payDates: string[]
  // YYYY-MM-DD (normalized from Firefly ISO8601 at fetch time)
  paidDates: { date: string; transactionJournalId: string; transactionGroupId: string }[]
}

/**
 * Firefly III 6.5.9 returns pay_dates / paid_dates[].date as ISO8601 datetime
 * strings with time + TZ suffix (e.g. "2026-04-15T00:00:00+00:00"). All
 * downstream code (computeForecast string comparisons, display in ForecastCard)
 * assumes the Bill contract exposes plain YYYY-MM-DD, so we normalize here at
 * the parser boundary. Accepts both "YYYY-MM-DD" and "YYYY-MM-DDT...".
 */
function normalizeDateString(s: string): string {
  return s.slice(0, 10)
}

function parseAmount(value: string | null): number | null {
  if (value === null) return null
  const n = parseFloat(value)
  return isFinite(n) ? n : null
}

function parseRequiredAmount(value: string): number {
  const n = parseFloat(value)
  return isFinite(n) ? n : 0
}

export async function fetchBills(
  baseUrl: string,
  token: string,
  params: { start: string; end: string }
): Promise<Bill[]> {
  const client = createApiClient(baseUrl, token)
  const raw = await client.fetchAllPages<BillRaw>(
    `/bills?start=${params.start}&end=${params.end}`
  )
  return raw.map((item) => ({
    id: item.id,
    name: item.attributes.name,
    active: item.attributes.active,
    currencyCode: item.attributes.currency_code,
    currencySymbol: item.attributes.currency_symbol,
    currencyDecimalPlaces: item.attributes.currency_decimal_places,
    amountMin: parseRequiredAmount(item.attributes.amount_min),
    amountMax: parseRequiredAmount(item.attributes.amount_max),
    amountAvg: parseRequiredAmount(item.attributes.amount_avg),
    pcAmountMin: parseAmount(item.attributes.pc_amount_min),
    pcAmountMax: parseAmount(item.attributes.pc_amount_max),
    pcAmountAvg: parseAmount(item.attributes.pc_amount_avg),
    payDates: item.attributes.pay_dates.map(normalizeDateString),
    paidDates: item.attributes.paid_dates.map((pd) => ({
      date: normalizeDateString(pd.date),
      transactionJournalId: pd.transaction_journal_id,
      transactionGroupId: pd.transaction_group_id,
    })),
  }))
}
