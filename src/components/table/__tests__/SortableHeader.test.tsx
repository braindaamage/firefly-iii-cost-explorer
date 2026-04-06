import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortableHeader } from '../SortableHeader'
import type { SortDirection } from '../SortableHeader'

describe('SortableHeader', () => {
  it('renders the column label', () => {
    render(
      <SortableHeader label="Actual Cost" direction={null} onSort={vi.fn()} />
    )
    expect(screen.getByText('Actual Cost')).toBeInTheDocument()
  })

  it('shows no arrow when direction is null', () => {
    const { container } = render(
      <SortableHeader label="Actual Cost" direction={null} onSort={vi.fn()} />
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('shows up arrow when direction is asc', () => {
    render(
      <SortableHeader label="Actual Cost" direction="asc" onSort={vi.fn()} />
    )
    expect(screen.getByLabelText('sorted ascending')).toBeInTheDocument()
  })

  it('shows down arrow when direction is desc', () => {
    render(
      <SortableHeader label="Actual Cost" direction="desc" onSort={vi.fn()} />
    )
    expect(screen.getByLabelText('sorted descending')).toBeInTheDocument()
  })

  it('cycles: null → desc → asc → null on repeated clicks', async () => {
    const onSort = vi.fn()
    render(<SortableHeader label="Actual Cost" direction={null} onSort={onSort} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSort).toHaveBeenNthCalledWith(1, 'desc')
  })

  it('calls onSort with asc when current is desc', async () => {
    const onSort = vi.fn()
    render(<SortableHeader label="Actual Cost" direction="desc" onSort={onSort} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSort).toHaveBeenCalledWith('asc')
  })

  it('calls onSort with null when current is asc', async () => {
    const onSort = vi.fn()
    render(<SortableHeader label="Actual Cost" direction="asc" onSort={onSort} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSort).toHaveBeenCalledWith(null as SortDirection)
  })
})
