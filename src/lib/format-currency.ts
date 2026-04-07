export function formatCurrency(
  amount: number,
  currencyCode: string,
  decimalPlaces: number
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount)
}
