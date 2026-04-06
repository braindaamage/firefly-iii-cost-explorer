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

  it('does not show clear button when onClear is not provided', () => {
    render(<FilterChip label="Categories:" value="All" onClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /clear categories/i })).not.toBeInTheDocument()
  })

  it('shows clear button when onClear is provided (and no onRemove)', () => {
    render(
      <FilterChip label="Categories:" value="2 selected" onClick={vi.fn()} onClear={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /clear categories/i })).toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', async () => {
    const onClear = vi.fn()
    const onClick = vi.fn()
    render(
      <FilterChip label="Categories:" value="2 selected" onClick={onClick} onClear={onClear} />
    )
    await userEvent.click(screen.getByRole('button', { name: /clear categories/i }))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows onRemove button (not clear button) when both onClear and onRemove are provided', () => {
    render(
      <FilterChip
        label="Budgets:"
        value="All"
        onClick={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /remove budgets/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /clear budgets/i })).not.toBeInTheDocument()
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
