import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../Header'

vi.mock('../../../hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}))

import { useBreakpoint } from '../../../hooks/useBreakpoint'

function renderHeader(showSettings = false) {
  return render(
    <MemoryRouter>
      <Header showSettings={showSettings} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('shows full title on desktop', () => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    renderHeader()
    expect(screen.getByText('Firefly III Cost Explorer')).toBeInTheDocument()
  })

  it('shows full title on tablet', () => {
    vi.mocked(useBreakpoint).mockReturnValue('tablet')
    renderHeader()
    expect(screen.getByText('Firefly III Cost Explorer')).toBeInTheDocument()
  })

  it('shows short title on mobile', () => {
    vi.mocked(useBreakpoint).mockReturnValue('mobile')
    renderHeader()
    expect(screen.getByText('Cost Explorer')).toBeInTheDocument()
    expect(screen.queryByText('Firefly III Cost Explorer')).not.toBeInTheDocument()
  })

  it('renders settings link when showSettings is true', () => {
    vi.mocked(useBreakpoint).mockReturnValue('desktop')
    renderHeader(true)
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })
})
