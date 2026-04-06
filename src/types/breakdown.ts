export interface BreakdownRow {
  id: string
  name: string
  color: string
  actualCost: number
  budgeted: number | null
  variance: number | null
  percentChange: number | null
}
