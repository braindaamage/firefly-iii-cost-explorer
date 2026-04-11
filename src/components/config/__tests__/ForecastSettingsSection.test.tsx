import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForecastSettingsSection } from '../ForecastSettingsSection'
import type { UseForecastConfigResult } from '../../../hooks/useForecastConfig'

vi.mock('../../../hooks/useForecastConfig', () => ({
  useForecastConfig: vi.fn(),
}))

const mockUpdateConfig = vi.fn()
const mockRetryRemote = vi.fn()

const BASE_RETURN: UseForecastConfigResult = {
  config: { historyMonths: 3, model: 'weighted' },
  status: 'success',
  source: 'remote',
  updateConfig: mockUpdateConfig,
  retryRemote: mockRetryRemote,
}

async function setupMock(overrides: Partial<UseForecastConfigResult> = {}) {
  const { useForecastConfig } = await import('../../../hooks/useForecastConfig')
  vi.mocked(useForecastConfig).mockReturnValue({ ...BASE_RETURN, ...overrides })
}

describe('ForecastSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton when status is loading', async () => {
    await setupMock({ status: 'loading', source: 'default' })
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByLabelText('Loading forecast settings')).toBeInTheDocument()
  })

  it('renders historyMonths select with current config value', async () => {
    await setupMock({ config: { historyMonths: 6, model: 'weighted' } })
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByLabelText('History Months')).toHaveValue('6')
  })

  it('renders model select with current config value', async () => {
    await setupMock({ config: { historyMonths: 3, model: 'simple' } })
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByLabelText('Forecast Model')).toHaveValue('simple')
  })

  it('changing historyMonths updates local state but does NOT call updateConfig', async () => {
    await setupMock()
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    await userEvent.selectOptions(screen.getByLabelText('History Months'), '6')
    // Local state updated — select now shows 6
    expect(screen.getByLabelText('History Months')).toHaveValue('6')
    // updateConfig NOT called yet (requires explicit Save click)
    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })

  it('Save button is disabled when there are no changes', async () => {
    await setupMock()
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByRole('button', { name: /save forecast settings/i })).toBeDisabled()
  })

  it('clicking Save calls updateConfig with the current local values', async () => {
    await setupMock()
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    await userEvent.selectOptions(screen.getByLabelText('History Months'), '6')
    await userEvent.click(screen.getByRole('button', { name: /save forecast settings/i }))
    expect(mockUpdateConfig).toHaveBeenCalledWith({ historyMonths: 6, model: 'weighted' })
  })

  it('shows "Saved to Firefly III" sync status for remote source', async () => {
    await setupMock({ source: 'remote', status: 'success' })
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByTestId('sync-status').textContent).toMatch(/saved to firefly/i)
  })

  it('shows Retry button in localFallback state and calls retryRemote on click', async () => {
    await setupMock({ status: 'localFallback', source: 'local' })
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    const retryBtn = screen.getByRole('button', { name: /retry sync/i })
    expect(retryBtn).toBeInTheDocument()
    await userEvent.click(retryBtn)
    expect(mockRetryRemote).toHaveBeenCalledOnce()
  })

  it('displays helper text under History Months', async () => {
    await setupMock()
    render(<ForecastSettingsSection baseUrl="https://firefly.example.com" token="token" />)
    expect(screen.getByText(/more months.*stable/i)).toBeInTheDocument()
  })
})
