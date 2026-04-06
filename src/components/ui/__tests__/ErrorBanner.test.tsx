import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBanner } from '../ErrorBanner'

describe('ErrorBanner', () => {
  it('renders the error message', () => {
    render(<ErrorBanner message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has role="alert"', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders Retry button when onRetry is provided', () => {
    render(<ErrorBanner message="Error" onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('does not render Retry button when onRetry is not provided', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('calls onRetry when Retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorBanner message="Error" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
