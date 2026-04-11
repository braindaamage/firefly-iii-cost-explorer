import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { RatesSidecarSection } from './RatesSidecarSection'
import type { UseRatesSidecarConfigResult } from '../../hooks/useRatesSidecarConfig'
import type { RatesSidecarLastRun } from '../../api/ratesSidecarConfig'
import { DEFAULT_CONFIG } from '../../api/ratesSidecarConfig'
import type { Currency } from '../../api/currencies'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useRatesSidecarConfig', () => ({
  useRatesSidecarConfig: vi.fn(),
}))

vi.mock('../../api/currencies', () => ({
  fetchCurrencies: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUpdateConfig = vi.fn()
const mockRetryRemote = vi.fn()
const mockTriggerRunNow = vi.fn().mockResolvedValue('2026-04-11T14:32:08.512Z')

const MOCK_LAST_RUN_SUCCESS: RatesSidecarLastRun = {
  timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  status: 'success',
  source: 'open-er-api',
  currenciesUpdated: ['USD', 'CLP', 'GBP'],
  currenciesFailed: [],
  error: null,
  nextRunEstimated: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
}

const MOCK_LAST_RUN_PARTIAL: RatesSidecarLastRun = {
  ...MOCK_LAST_RUN_SUCCESS,
  status: 'partial',
  currenciesFailed: ['GBP'],
}

const MOCK_LAST_RUN_FAILED: RatesSidecarLastRun = {
  ...MOCK_LAST_RUN_SUCCESS,
  status: 'failed',
  error: 'Connection refused to open.er-api.com',
  currenciesUpdated: [],
}

const MOCK_CURRENCIES: Currency[] = [
  { id: '1', code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true, isPrimary: true },
  { id: '2', code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true, isPrimary: false },
  { id: '3', code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, enabled: true, isPrimary: false },
  { id: '4', code: 'CLP', name: 'Chilean Peso', symbol: 'CL$', decimalPlaces: 0, enabled: true, isPrimary: false },
  { id: '5', code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, enabled: false, isPrimary: false },
]

const BASE_HOOK_RESULT: UseRatesSidecarConfigResult = {
  config: DEFAULT_CONFIG,
  status: 'success',
  source: 'remote',
  lastRun: MOCK_LAST_RUN_SUCCESS,
  lastRunStatus: 'success',
  updateConfig: mockUpdateConfig,
  retryRemote: mockRetryRemote,
  triggerRunNow: mockTriggerRunNow,
  runNowPending: false,
  runNowTimedOut: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupMocks(overrides: Partial<UseRatesSidecarConfigResult> = {}) {
  const { useRatesSidecarConfig } = await import('../../hooks/useRatesSidecarConfig')
  vi.mocked(useRatesSidecarConfig).mockReturnValue({ ...BASE_HOOK_RESULT, ...overrides })

  const { fetchCurrencies } = await import('../../api/currencies')
  vi.mocked(fetchCurrencies).mockResolvedValue(MOCK_CURRENCIES)
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

function renderSection() {
  return render(
    <RatesSidecarSection baseUrl="https://firefly.example.com" token="token" />,
    { wrapper: makeWrapper() }
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RatesSidecarSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Loading state ─────────────────────────────────────────────────────────
  describe('Loading state', () => {
    it('renders loading skeleton while status === loading', async () => {
      await setupMocks({ status: 'loading', source: 'default', lastRunStatus: 'loading', lastRun: null })
      renderSection()
      expect(screen.getByLabelText('Loading exchange rates settings')).toBeInTheDocument()
    })
  })

  // ─── Status panel variants ─────────────────────────────────────────────────
  describe('Status panel', () => {
    it('renders "Not run yet" when lastRun === null', async () => {
      await setupMocks({ lastRun: null, lastRunStatus: 'success' })
      renderSection()
      expect(screen.getByTestId('last-run-status').textContent).toMatch(/not run yet/i)
    })

    it('renders green status with "Last run" text when lastRun.status === success', async () => {
      await setupMocks({ lastRun: MOCK_LAST_RUN_SUCCESS })
      renderSection()
      const panel = screen.getByTestId('last-run-status')
      expect(panel.textContent).toMatch(/success/i)
      expect(panel.textContent).toMatch(/last run/i)
    })

    it('renders yellow status when lastRun.status === partial', async () => {
      await setupMocks({ lastRun: MOCK_LAST_RUN_PARTIAL })
      renderSection()
      expect(screen.getByTestId('last-run-status').textContent).toMatch(/partial/i)
    })

    it('renders red status with error message when lastRun.status === failed', async () => {
      await setupMocks({ lastRun: MOCK_LAST_RUN_FAILED })
      renderSection()
      expect(screen.getByTestId('last-run-status').textContent).toMatch(/failed/i)
      expect(screen.getByTestId('last-run-error').textContent).toContain('Connection refused')
    })

    it('renders chips with lastRun.currenciesUpdated', async () => {
      await setupMocks({ lastRun: MOCK_LAST_RUN_SUCCESS })
      renderSection()
      const chips = screen.getAllByTestId('currency-chip')
      expect(chips.map((c) => c.textContent)).toEqual(
        expect.arrayContaining(['USD', 'CLP', 'GBP'])
      )
    })
  })

  // ─── Enabled toggle ────────────────────────────────────────────────────────
  describe('Enabled toggle', () => {
    it('shows enabled=true in checkbox from config', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, enabled: true } })
      renderSection()
      expect(screen.getByLabelText('Enable exchange rates auto-update')).toBeChecked()
    })

    it('changing toggle marks isDirty (enables Save)', async () => {
      await setupMocks()
      renderSection()
      const toggle = screen.getByLabelText('Enable exchange rates auto-update')
      await userEvent.click(toggle)
      expect(screen.getByRole('button', { name: /save rates sidecar settings/i })).not.toBeDisabled()
    })
  })

  // ─── Schedule (cron) input ─────────────────────────────────────────────────
  describe('Schedule input', () => {
    it('shows default cron schedule value', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByLabelText('Cron schedule')).toHaveValue('0 7 * * *')
    })

    it('editing cron triggers validation — valid shows next 3 runs', async () => {
      await setupMocks()
      renderSection()
      const input = screen.getByLabelText('Cron schedule')
      await userEvent.clear(input)
      await userEvent.type(input, '0 8 * * *')
      expect(screen.getByTestId('cron-preview')).toBeInTheDocument()
      expect(screen.queryByTestId('cron-error')).not.toBeInTheDocument()
    })

    it('editing cron with invalid expression shows error inline and disables Save', async () => {
      await setupMocks()
      renderSection()
      const input = screen.getByLabelText('Cron schedule')
      await userEvent.clear(input)
      await userEvent.type(input, 'not-valid-cron')
      expect(screen.getByTestId('cron-error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save rates sidecar settings/i })).toBeDisabled()
    })
  })

  // ─── Primary source radio ──────────────────────────────────────────────────
  describe('Primary source radio', () => {
    it('shows open-er-api as default primary source', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByLabelText('open.er-api.com (recommended)')).toBeChecked()
    })

    it('changing primary source marks dirty', async () => {
      await setupMocks()
      renderSection()
      const primaryGroup = screen.getByRole('radiogroup', { name: 'Primary source' })
      await userEvent.click(within(primaryGroup).getByLabelText('ECB'))
      expect(screen.getByRole('button', { name: /save rates sidecar settings/i })).not.toBeDisabled()
    })
  })

  // ─── Fallback section ──────────────────────────────────────────────────────
  describe('Fallback section', () => {
    it('fallback source radios visible when fallbackEnabled=true', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, fallbackEnabled: true } })
      renderSection()
      expect(screen.getByRole('radiogroup', { name: 'Fallback source' })).toBeInTheDocument()
    })

    it('fallback source radios hidden when fallbackEnabled=false', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, fallbackEnabled: false } })
      renderSection()
      expect(screen.queryByRole('radiogroup', { name: 'Fallback source' })).not.toBeInTheDocument()
    })

    it('unchecking fallbackEnabled hides fallback source radios', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, fallbackEnabled: true } })
      renderSection()
      await userEvent.click(screen.getByLabelText('Enable fallback source'))
      expect(screen.queryByRole('radiogroup', { name: 'Fallback source' })).not.toBeInTheDocument()
    })

    it('fallback source radio changes value when visible', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, fallbackEnabled: true, fallbackSource: 'ecb' } })
      renderSection()
      const radios = within(screen.getByRole('radiogroup', { name: 'Fallback source' })).getAllByRole('radio')
      const ecbRadio = radios.find((r) => r.getAttribute('value') === 'ecb')
      expect(ecbRadio).toBeChecked()
    })
  })

  // ─── Currency mode ─────────────────────────────────────────────────────────
  describe('Currency mode', () => {
    it('shows active as default currency mode', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByLabelText('Active currencies (auto)')).toBeChecked()
    })

    it('switching to explicit shows chips section', async () => {
      await setupMocks()
      renderSection()
      await userEvent.click(screen.getByLabelText('Explicit list'))
      expect(screen.getAllByTestId('explicit-currency-chip').length).toBeGreaterThan(0)
    })
  })

  // ─── Explicit currencies chips ─────────────────────────────────────────────
  describe('Explicit currencies chips', () => {
    it('renders chips from localConfig.explicitCurrencies', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, currencyMode: 'explicit', explicitCurrencies: ['USD', 'CLP'] } })
      renderSection()
      const chips = screen.getAllByTestId('explicit-currency-chip')
      expect(chips).toHaveLength(2)
      expect(chips[0].textContent).toContain('USD')
      expect(chips[1].textContent).toContain('CLP')
    })

    it('X button removes the chip', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, currencyMode: 'explicit', explicitCurrencies: ['USD', 'CLP'] } })
      renderSection()
      await userEvent.click(screen.getByLabelText('Remove USD'))
      const remaining = screen.getAllByTestId('explicit-currency-chip')
      expect(remaining).toHaveLength(1)
      expect(remaining[0].textContent).toContain('CLP')
    })

    it('autocomplete shows filtered list from currencies mock', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, currencyMode: 'explicit', explicitCurrencies: ['USD'] } })
      renderSection()
      const input = screen.getByLabelText('Add explicit currency')
      await userEvent.type(input, 'GBP')
      expect(screen.getByTestId('currency-suggestions')).toBeInTheDocument()
      expect(screen.getByTestId('currency-suggestions').textContent).toContain('GBP')
    })

    it('clicking suggestion adds it to array without duplicates', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, currencyMode: 'explicit', explicitCurrencies: [] } })
      renderSection()
      const input = screen.getByLabelText('Add explicit currency')
      await userEvent.type(input, 'GBP')
      const suggestions = screen.getByTestId('currency-suggestions')
      const gbpBtn = within(suggestions).getByRole('button', { name: /GBP/i })
      await userEvent.click(gbpBtn)
      const chips = screen.getAllByTestId('explicit-currency-chip')
      const codes = chips.map((c) => c.textContent?.replace('×', '').trim())
      expect(codes.filter((c) => c === 'GBP')).toHaveLength(1)
    })
  })

  // ─── Base currency dropdown ────────────────────────────────────────────────
  describe('Base currency dropdown', () => {
    it('is populated from currencies mock', async () => {
      await setupMocks()
      renderSection()
      // Wait for currencies query to resolve and options to appear
      await screen.findByRole('option', { name: /US Dollar/i })
      const select = screen.getByLabelText('Base currency')
      const options = within(select as HTMLSelectElement).getAllByRole('option')
      expect(options.some((o) => o.getAttribute('value') === 'EUR')).toBe(true)
      expect(options.some((o) => o.getAttribute('value') === 'USD')).toBe(true)
      // Disabled currencies should not appear (JPY is disabled)
      expect(options.some((o) => o.getAttribute('value') === 'JPY')).toBe(false)
    })
  })

  // ─── Save button ───────────────────────────────────────────────────────────
  describe('Save button', () => {
    it('is disabled when no changes (isDirty=false)', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByRole('button', { name: /save rates sidecar settings/i })).toBeDisabled()
    })

    it('is disabled when cron is invalid (hasValidationErrors=true)', async () => {
      await setupMocks()
      renderSection()
      await userEvent.clear(screen.getByLabelText('Cron schedule'))
      await userEvent.type(screen.getByLabelText('Cron schedule'), 'invalid')
      expect(screen.getByRole('button', { name: /save rates sidecar settings/i })).toBeDisabled()
    })

    it('click calls updateConfig with current local values', async () => {
      await setupMocks()
      renderSection()
      // Make a change to enable Save
      await userEvent.click(screen.getByLabelText('Enable exchange rates auto-update'))
      await userEvent.click(screen.getByRole('button', { name: /save rates sidecar settings/i }))
      expect(mockUpdateConfig).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      )
    })
  })

  // ─── Run now button ────────────────────────────────────────────────────────
  describe('Run now button', () => {
    it('is disabled when config.enabled is false', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, enabled: false } })
      renderSection()
      expect(screen.getByRole('button', { name: /run now/i })).toBeDisabled()
    })

    it('is enabled when config.enabled is true', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, enabled: true } })
      renderSection()
      expect(screen.getByRole('button', { name: /run now/i })).not.toBeDisabled()
    })

    it('click calls triggerRunNow', async () => {
      await setupMocks({ config: { ...DEFAULT_CONFIG, enabled: true } })
      renderSection()
      await userEvent.click(screen.getByRole('button', { name: /run now/i }))
      expect(mockTriggerRunNow).toHaveBeenCalledOnce()
    })

    it('shows spinner and "Running…" while runNowPending=true', async () => {
      await setupMocks({ runNowPending: true })
      renderSection()
      expect(screen.getByTestId('run-now-spinner')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /run now/i }).textContent).toMatch(/running/i)
    })

    it('Run now button is disabled when runNowPending', async () => {
      await setupMocks({ runNowPending: true })
      renderSection()
      expect(screen.getByRole('button', { name: /run now/i })).toBeDisabled()
    })
  })

  // ─── Revert button ─────────────────────────────────────────────────────────
  describe('Revert button', () => {
    it('is disabled when isDirty=false', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByRole('button', { name: /revert changes/i })).toBeDisabled()
    })

    it('click restores localConfig to config values', async () => {
      await setupMocks()
      renderSection()
      await userEvent.click(screen.getByLabelText('Enable exchange rates auto-update'))
      expect(screen.getByRole('button', { name: /revert changes/i })).not.toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: /revert changes/i }))
      expect(screen.getByLabelText('Enable exchange rates auto-update')).toBeChecked()
    })
  })

  // ─── Sync status inline ────────────────────────────────────────────────────
  describe('Sync status inline', () => {
    it('shows "Saved to Firefly III" when source=remote and status=success', async () => {
      await setupMocks({ source: 'remote', status: 'success' })
      renderSection()
      expect(screen.getByTestId('sync-status').textContent).toMatch(/saved to firefly/i)
    })

    it('shows "Using local backup" with Retry button when status=localFallback', async () => {
      await setupMocks({ status: 'localFallback', source: 'local' })
      renderSection()
      expect(screen.getByTestId('sync-status').textContent).toMatch(/local backup/i)
      const retryBtn = screen.getByRole('button', { name: /retry sync/i })
      expect(retryBtn).toBeInTheDocument()
      await userEvent.click(retryBtn)
      expect(mockRetryRemote).toHaveBeenCalledOnce()
    })

    it('shows "Could not load from Firefly III" when status=error', async () => {
      await setupMocks({ status: 'error', source: 'default' })
      renderSection()
      expect(screen.getByTestId('sync-status').textContent).toMatch(/could not load/i)
    })

    it('shows "Using default settings" when source=default and status=success', async () => {
      await setupMocks({ source: 'default', status: 'success' })
      renderSection()
      expect(screen.getByTestId('sync-status').textContent).toMatch(/using default settings/i)
    })

    it('shows timeout message when runNowTimedOut=true', async () => {
      await setupMocks({ runNowTimedOut: true })
      renderSection()
      expect(screen.getByTestId('run-now-timeout').textContent).toMatch(/didn't complete in time/i)
    })
  })

  // ─── ConfigScreen integration guard ───────────────────────────────────────
  describe('ConfigScreen integration', () => {
    it('renders title h2 with correct text', async () => {
      await setupMocks()
      renderSection()
      expect(screen.getByRole('heading', { name: /exchange rates auto-update/i })).toBeInTheDocument()
    })
  })
})
