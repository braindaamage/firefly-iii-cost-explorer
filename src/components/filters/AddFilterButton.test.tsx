import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddFilterButton } from './AddFilterButton'
import type { OptionalFilterKey } from '../../types/filters'

const ALL_FILTERS: OptionalFilterKey[] = ['budgetIds', 'tagIds']

describe('AddFilterButton', () => {
  it('renders when there are available filters', () => {
    render(<AddFilterButton availableFilters={ALL_FILTERS} onAdd={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument()
  })

  it('renders nothing when availableFilters is empty', () => {
    render(<AddFilterButton availableFilters={[]} onAdd={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /add filter/i })).not.toBeInTheDocument()
  })

  it('shows dropdown with available filter options when clicked', async () => {
    render(<AddFilterButton availableFilters={ALL_FILTERS} onAdd={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
    expect(screen.getByText('Budgets')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
  })

  it('calls onAdd with the correct key when an option is selected', async () => {
    const onAdd = vi.fn()
    render(<AddFilterButton availableFilters={ALL_FILTERS} onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: /add filter/i }))
    await userEvent.click(screen.getByText('Budgets'))
    expect(onAdd).toHaveBeenCalledWith('budgetIds')
  })

  it('shows only remaining available filters', () => {
    render(
      <AddFilterButton availableFilters={['tagIds']} onAdd={vi.fn()} />
    )
    userEvent.click(screen.getByRole('button', { name: /add filter/i }))
  })
})
