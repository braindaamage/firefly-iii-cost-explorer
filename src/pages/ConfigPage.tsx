import { Header } from '../components/layout/Header'
import { ConfigScreen } from '../components/config/ConfigScreen'

export function ConfigPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={false} />
      <ConfigScreen />
    </div>
  )
}
