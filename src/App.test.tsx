import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useConfig } from './hooks/useConfig'
import { ConfigPage } from './pages/ConfigPage'
import { DashboardPage } from './pages/DashboardPage'

vi.mock('./hooks/useConfig')
vi.mock('./pages/ConfigPage', () => ({
  ConfigPage: () => <div>Config Page</div>,
}))
vi.mock('./pages/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard Page</div>,
}))

const mockUseConfig = vi.mocked(useConfig)

function AppRoutes() {
  const { isConfigured } = useConfig()
  return (
    <Routes>
      <Route
        path="/"
        element={
          isConfigured ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/config" replace />
          )
        }
      />
      <Route path="/config" element={<ConfigPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function renderApp(initialPath: string, isConfigured: boolean) {
  mockUseConfig.mockReturnValue({
    config: isConfigured ? { baseUrl: 'https://x.com', apiToken: 'tok' } : null,
    isConfigured,
    saveConfig: vi.fn(),
    clearConfig: vi.fn(),
  })

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('redirects to /config when not configured', () => {
    renderApp('/', false)
    expect(screen.getByText('Config Page')).toBeInTheDocument()
  })

  it('redirects to /dashboard when configured', () => {
    renderApp('/', true)
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('shows config page at /config', () => {
    renderApp('/config', false)
    expect(screen.getByText('Config Page')).toBeInTheDocument()
  })

  it('shows dashboard page at /dashboard when configured', () => {
    renderApp('/dashboard', true)
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('redirects unknown paths to / (which then redirects to /config when not configured)', () => {
    renderApp('/unknown-path', false)
    expect(screen.getByText('Config Page')).toBeInTheDocument()
  })
})
