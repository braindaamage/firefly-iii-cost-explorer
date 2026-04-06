import { useSearchParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ConfigScreen } from '../components/config/ConfigScreen'
import { ErrorBanner } from '../components/ui/ErrorBanner'

export function ConfigPage() {
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('error') === 'auth'

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
