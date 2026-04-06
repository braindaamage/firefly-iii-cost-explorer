export interface BreakdownRow {
  id: string
  name: string
  color: string
  values: Record<string, number>  // key = period label, value = amount
  total: number
}
