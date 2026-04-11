import { describe, it, expect } from 'vitest'
import { computeWeights } from './forecast-weights'

const SUM_TOLERANCE = 1e-10

function sum(weights: number[]): number {
  return weights.reduce((acc, w) => acc + w, 0)
}

function isStrictlyDecreasing(weights: number[]): boolean {
  for (let i = 1; i < weights.length; i++) {
    if (weights[i] >= weights[i - 1]) return false
  }
  return true
}

describe('computeWeights — simple model', () => {
  it('N=1 returns [1]', () => {
    expect(computeWeights(1, 'simple')).toEqual([1])
  })

  it('N=3 returns uniform [1/3, 1/3, 1/3]', () => {
    const w = computeWeights(3, 'simple')
    expect(w).toHaveLength(3)
    w.forEach((weight) => expect(weight).toBeCloseTo(1 / 3, 10))
  })

  it('N=6 returns uniform [1/6, ...]', () => {
    const w = computeWeights(6, 'simple')
    expect(w).toHaveLength(6)
    w.forEach((weight) => expect(weight).toBeCloseTo(1 / 6, 10))
  })

  it('N=12 returns uniform [1/12, ...]', () => {
    const w = computeWeights(12, 'simple')
    expect(w).toHaveLength(12)
    w.forEach((weight) => expect(weight).toBeCloseTo(1 / 12, 10))
  })

  it('weights sum to 1 for any N', () => {
    for (const n of [1, 2, 3, 6, 9, 12]) {
      expect(Math.abs(sum(computeWeights(n, 'simple')) - 1)).toBeLessThan(SUM_TOLERANCE)
    }
  })

  it('all weights are positive', () => {
    computeWeights(6, 'simple').forEach((w) => expect(w).toBeGreaterThan(0))
  })
})

describe('computeWeights — weighted model', () => {
  it('N=1 returns [1]', () => {
    expect(computeWeights(1, 'weighted')).toEqual([1])
  })

  it('N=3: first weight is 0.5, sum is 1', () => {
    const w = computeWeights(3, 'weighted')
    expect(w).toHaveLength(3)
    expect(w[0]).toBeCloseTo(0.5, 10) // 3/6
    expect(Math.abs(sum(w) - 1)).toBeLessThan(SUM_TOLERANCE)
  })

  it('N=3: weights are strictly decreasing (most recent is highest)', () => {
    const w = computeWeights(3, 'weighted')
    expect(isStrictlyDecreasing(w)).toBe(true)
  })

  it('N=6: sum is 1, strictly decreasing, all positive', () => {
    const w = computeWeights(6, 'weighted')
    expect(w).toHaveLength(6)
    expect(Math.abs(sum(w) - 1)).toBeLessThan(SUM_TOLERANCE)
    expect(isStrictlyDecreasing(w)).toBe(true)
    w.forEach((weight) => expect(weight).toBeGreaterThan(0))
  })

  it('N=12: sum is 1, strictly decreasing, last weight is smallest', () => {
    const w = computeWeights(12, 'weighted')
    expect(w).toHaveLength(12)
    expect(Math.abs(sum(w) - 1)).toBeLessThan(SUM_TOLERANCE)
    expect(isStrictlyDecreasing(w)).toBe(true)
    expect(w[11]).toBeCloseTo(1 / 78, 10) // 1 / (12*13/2)
  })

  it('index 0 always has the highest weight for N>1', () => {
    for (const n of [2, 3, 6, 12]) {
      const w = computeWeights(n, 'weighted')
      const maxWeight = Math.max(...w)
      expect(w[0]).toBe(maxWeight)
    }
  })

  it('N=2: weights are [2/3, 1/3]', () => {
    const w = computeWeights(2, 'weighted')
    expect(w[0]).toBeCloseTo(2 / 3, 10)
    expect(w[1]).toBeCloseTo(1 / 3, 10)
  })
})

describe('computeWeights — edge cases', () => {
  it('N=0 returns empty array', () => {
    expect(computeWeights(0, 'simple')).toEqual([])
    expect(computeWeights(0, 'weighted')).toEqual([])
  })

  it('negative N returns empty array', () => {
    expect(computeWeights(-1, 'weighted')).toEqual([])
  })
})
