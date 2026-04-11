import { useState, useEffect, useRef } from 'react'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Returns a stable Date for the current local calendar day.
 * Updates at most once per minute (via setInterval) when the day rolls over.
 * Prevents spurious useMemo invalidations in hooks that receive `today` as a prop.
 */
export function useStableToday(): Date {
  const [today, setToday] = useState(() => new Date())
  const dayKeyRef = useRef(dayKey(today))

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const key = dayKey(now)
      if (key !== dayKeyRef.current) {
        dayKeyRef.current = key
        setToday(now)
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return today
}
