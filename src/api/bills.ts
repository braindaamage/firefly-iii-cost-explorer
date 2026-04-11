import { createApiClient } from './client'

interface BillRaw {
  id: string
  attributes: {
    name: string
    active: boolean
    amount_min: string
    amount_max: string
    amount_avg: string
    pay_dates: string[]
    paid_dates: { date: string; transaction_group_id: string | null }[]
    pc_amount_avg: string | null
  }
}

export interface Bill {
  id: string
  name: string
  active: boolean
  amountAvg: number
  pcAmountAvg: number | null
  payDates: string[]
  paidDates: string[]
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
    amountAvg: parseFloat(item.attributes.amount_avg),
    pcAmountAvg:
      item.attributes.pc_amount_avg !== null
        ? parseFloat(item.attributes.pc_amount_avg)
        : null,
    payDates: item.attributes.pay_dates,
    paidDates: item.attributes.paid_dates.map((pd) => pd.date),
  }))
}
