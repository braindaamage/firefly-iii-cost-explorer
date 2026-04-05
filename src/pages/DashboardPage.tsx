import { Header } from '../components/layout/Header'
import { PageHeader } from '../components/layout/PageHeader'
import { FilterBar } from '../components/filters/FilterBar'

export function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={true} />
      <main
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backgroundColor: '#121212',
        }}
      >
        <PageHeader
          title="Cost Explorer"
          subtitle="Analyze your spending trends and budget variance."
        />
        <FilterBar />
      </main>
    </div>
  )
}
