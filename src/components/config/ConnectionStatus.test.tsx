import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionState } from './ConnectionStatus'

function renderStatus(state: ConnectionState) {
  return render(<ConnectionStatus state={state} />)
}

describe('ConnectionStatus', () => {
  it('renders nothing when idle', () => {
    const { container } = renderStatus({ status: 'idle' })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders testing spinner and message', () => {
    renderStatus({ status: 'testing' })
    expect(screen.getByText('Testing connection...')).toBeInTheDocument()
  })

  it('renders success message with version', () => {
    renderStatus({ status: 'success', version: '6.1.21' })
    expect(
      screen.getByText('Connected to Firefly III v6.1.21')
    ).toBeInTheDocument()
  })

  it('renders error message', () => {
    renderStatus({
      status: 'error',
      message: 'Invalid API token. Please check your Personal Access Token.',
    })
    expect(
      screen.getByText(
        'Invalid API token. Please check your Personal Access Token.'
      )
    ).toBeInTheDocument()
  })
})
