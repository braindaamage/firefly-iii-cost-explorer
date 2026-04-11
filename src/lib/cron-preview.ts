// cron-parser is CJS; use default import for ESM interop (same pattern as sidecar)
import cronParser from 'cron-parser'
const { parseExpression } = cronParser

export interface CronPreview {
  valid: boolean
  error: string | null
  nextRuns: Date[]  // empty if invalid
}

/**
 * Validates a cron expression and computes the next N run times.
 * Uses cron-parser with the same parser the sidecar uses.
 *
 * Note on timezone: dates are returned in the browser's local timezone.
 * The sidecar runs in its own container timezone (TZ env var), which may differ.
 */
export function previewCron(expression: string, count: number = 3): CronPreview {
  if (!expression || expression.trim() === '') {
    return { valid: false, error: 'Expression cannot be empty', nextRuns: [] }
  }
  try {
    const interval = parseExpression(expression)
    const nextRuns: Date[] = []
    for (let i = 0; i < count; i++) {
      nextRuns.push(interval.next().toDate())
    }
    return { valid: true, error: null, nextRuns }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid cron expression',
      nextRuns: [],
    }
  }
}
