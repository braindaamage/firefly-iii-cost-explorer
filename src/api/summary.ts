import { createApiClient } from './client'

export interface SummaryBasicResult {
  amount: number        // always positive (Math.abs of monetary_value)
  currencyCode: string  // same as the input currencyCode param
}

// NOTE: /summary/basic returns a flat object keyed by "spent-in-EUR", "balance-in-EUR", etc.
// Each value has monetary_value as a string (e.g. "-80.000000000000" or "0").
// There is no "data" wrapper — verified empirically against Firefly III 6.5.9 on 2026-04-11.
type SummaryEntry = {
  key: string
  monetary_value: string
  currency_code: string
}

type SummaryBasicResponse = Record<string, SummaryEntry>

export async function fetchSummaryBasic(
  baseUrl: string,
  token: string,
  params: { start: string; end: string; currencyCode: string }
): Promise<SummaryBasicResult> {
  const client = createApiClient(baseUrl, token)
  const q = new URLSearchParams()
  q.set('start', params.start)
  q.set('end', params.end)
  const response = await client.fetch<SummaryBasicResponse>(`/summary/basic?${q.toString()}`)

  const key = `spent-in-${params.currencyCode}`
  const entry = response[key]

  if (!entry) {
    // No transactions in this currency for the given range
    return { amount: 0, currencyCode: params.currencyCode }
  }

  const amount = Math.abs(parseFloat(entry.monetary_value))
  return { amount, currencyCode: params.currencyCode }
}
