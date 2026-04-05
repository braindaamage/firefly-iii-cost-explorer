import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { useConfig } from './hooks/useConfig'

vi.mock('./hooks/useConfig')
vi.mock('./pages/ConfigPage', () => ({
  ConfigPage: () => <div>Config Page</div>,
}))
vi.mock('./pages/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard Page</div>,
}))

const mockUseConfig = vi.mocked(useConfig)

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
