import { useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ConfigScreen } from '../components/config/ConfigScreen'
import { ErrorBanner } from '../components/ui/ErrorBanner'

export function ConfigPage() {
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('error') === 'auth'
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) return
    // Three retries at 0/100/500ms — scrollIntoView is idempotent, handles late mounts
    const timers = [0, 100, 500].map((delay) =>
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [location.hash])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={false} />
      {authError && (
        <div style={{ padding: '24px 24px 0' }}>
          <ErrorBanner message="Your API token is invalid or expired. Please update it." />
        </div>
      )}
      <ConfigScreen />
    </div>
  )
}
