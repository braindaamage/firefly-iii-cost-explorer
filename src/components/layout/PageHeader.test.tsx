import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(
      <PageHeader
        title="Cost Explorer"
        subtitle="Analyze your spending trends."
      />
    )
    expect(screen.getByText('Cost Explorer')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(
      <PageHeader
        title="Cost Explorer"
        subtitle="Analyze your spending trends."
      />
    )
    expect(screen.getByText('Analyze your spending trends.')).toBeInTheDocument()
  })
})
