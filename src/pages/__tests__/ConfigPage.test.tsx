import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigPage } from '../ConfigPage'

vi.mock('../../components/layout/Header', () => ({
  Header: () => null,
}))

vi.mock('../../components/config/ConfigScreen', () => ({
  ConfigScreen: () => (
    <div>
      <div id="forecast" />
    </div>
  ),
}))

vi.mock('../../components/ui/ErrorBanner', () => ({
  ErrorBanner: () => null,
}))

describe('ConfigPage — scroll-to-hash', () => {
  afterEach(() => {
    vi.useRealTimers()
    // Clean up scrollIntoView mock if set
    delete (HTMLElement.prototype as Record<string, unknown>).scrollIntoView
  })

  it('scrolls to the anchor element matching the URL hash', async () => {
    vi.useFakeTimers()
    const scrollIntoViewMock = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    render(
      <MemoryRouter initialEntries={['/config#forecast']}>
        <ConfigPage />
      </MemoryRouter>
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('does not scroll when the URL has no hash', async () => {
    vi.useFakeTimers()
    const scrollIntoViewMock = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    render(
      <MemoryRouter initialEntries={['/config']}>
        <ConfigPage />
      </MemoryRouter>
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })
})
