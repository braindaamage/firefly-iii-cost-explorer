import { Header } from '../components/layout/Header'

export function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={true} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9aa0a6',
          fontFamily: "'Roboto', sans-serif",
          fontSize: '16px',
        }}
      >
        Dashboard coming in Phase 2
      </main>
    </div>
  )
}
