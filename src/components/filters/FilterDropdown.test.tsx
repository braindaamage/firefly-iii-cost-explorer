import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { FilterDropdown } from './FilterDropdown'

function Wrapper({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  return (
    <div>
      <button ref={anchorRef}>Anchor</button>
      <div style={{ position: 'relative' }}>
        <FilterDropdown open={open} onClose={onClose} anchorRef={anchorRef}>
          <div>Dropdown content</div>
        </FilterDropdown>
      </div>
    </div>
  )
}

describe('FilterDropdown', () => {
  it('renders children when open', () => {
    render(<Wrapper open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Dropdown content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Wrapper open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Dropdown content')).not.toBeInTheDocument()
  })

  it('calls onClose when clicking outside', () => {
    const onClose = vi.fn()
    render(
      <div>
        <Wrapper open={true} onClose={onClose} />
        <div data-testid="outside">Outside</div>
      </div>
    )
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when clicking inside dropdown', () => {
    const onClose = vi.fn()
    render(<Wrapper open={true} onClose={onClose} />)
    fireEvent.mouseDown(screen.getByText('Dropdown content'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
