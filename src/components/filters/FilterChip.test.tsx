import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterChip } from './FilterChip'

describe('FilterChip', () => {
  it('renders label and value', () => {
    render(
      <FilterChip label="Time range:" value="Last 30 days" onClick={vi.fn()} />
    )
    expect(screen.getByText('Time range:')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('calls onClick when chip button is clicked', async () => {
    const onClick = vi.fn()
    render(<FilterChip label="Group by:" value="Category" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: /group by/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not show remove button when onRemove is not provided', () => {
    render(<FilterChip label="Time range:" value="Last 30 days" onClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('shows remove button when onRemove is provided', () => {
    render(
      <FilterChip
        label="Budgets:"
        value="All"
        onClick={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn()
    const onClick = vi.fn()
    render(
      <FilterChip
        label="Tags:"
        value="All"
        onClick={onClick}
        onRemove={onRemove}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })
})
