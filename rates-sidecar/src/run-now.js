/**
 * Decides whether the sidecar should run the job out-of-band based on
 * the current `runNow` preference and the last completed run.
 *
 * Contract:
 *   - runNowPref: object from `GET /preferences/costExplorer.ratesSidecar.runNow`,
 *                 shape: { requestedAt: ISO8601 } | null (404 → null)
 *   - lastRun:    object from `GET /preferences/costExplorer.ratesSidecar.lastRun`,
 *                 shape: { timestamp: ISO8601, status, ... } | null
 *
 * Returns true iff runNowPref.requestedAt is strictly newer than lastRun.timestamp.
 * If lastRun is null (never run) and runNowPref has a valid requestedAt → true.
 * Malformed inputs → false (safe default: no out-of-band run).
 *
 * Idempotency: after runJob completes, lastRun.timestamp advances past requestedAt,
 * so subsequent polls return false without any flag to clear.
 */
export function shouldTriggerRunNow(runNowPref, lastRun) {
  if (!runNowPref || typeof runNowPref.requestedAt !== 'string') return false
  const requestedAt = Date.parse(runNowPref.requestedAt)
  if (Number.isNaN(requestedAt)) return false
  if (!lastRun || typeof lastRun.timestamp !== 'string') return true
  const lastRunAt = Date.parse(lastRun.timestamp)
  if (Number.isNaN(lastRunAt)) return true
  return requestedAt > lastRunAt
}
