export type ForecastModel = 'simple' | 'weighted'

/**
 * Compute normalized weights for N historical months.
 *
 * 'weighted': linear descending — most recent month gets highest weight.
 *   w[i] = (N - i) / sum(1..N)   (index 0 = most recent)
 *
 * 'simple': uniform — all months weighted equally.
 *   w[i] = 1 / N
 *
 * Throws RangeError when n < 1 — passing 0 or negative is a programming error.
 * The returned weights always sum to 1 (within floating-point precision).
 */
export function computeWeights(n: number, model: ForecastModel): number[] {
  if (n < 1) throw new RangeError(`computeWeights: n must be > 0, got ${n}`)

  if (model === 'simple') {
    return Array<number>(n).fill(1 / n)
  }

  // weighted: w[i] = (n - i) / triangular(n)
  const triangular = (n * (n + 1)) / 2
  return Array.from({ length: n }, (_, i) => (n - i) / triangular)
}
