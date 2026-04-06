import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'desktop',
}))

function renderHeader(showSettings: boolean) {
  return render(
    <MemoryRouter>
      <Header showSettings={showSettings} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('renders the app title', () => {
    renderHeader(false)
    expect(screen.getByText('Firefly III Cost Explorer')).toBeInTheDocument()
  })

  it('does not show settings button when showSettings is false', () => {
    renderHeader(false)
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
  })

  it('shows settings button when showSettings is true', () => {
    renderHeader(true)
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('settings link navigates to /config', () => {
    renderHeader(true)
    const link = screen.getByRole('link', { name: /settings/i })
    expect(link).toHaveAttribute('href', '/config')
  })
})
