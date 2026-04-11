import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForecastCard } from '../ForecastCard'
import type { ForecastResult } from '../../../hooks/computeForecast'
import type { ForecastConfig } from '../../../hooks/useForecastConfig'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EUR_CURRENCY = { code: 'EUR', symbol: '€', decimalPlaces: 2 }
const CLP_CURRENCY = { code: 'CLP', symbol: 'CL$', decimalPlaces: 0 }

const DEFAULT_CONFIG: ForecastConfig = { historyMonths: 3, model: 'weighted' }

const BREAKDOWN = {
  daysInMonth: 30,
  daysElapsed: 15,
  daysRemaining: 15,
  weightedAvgDaily: 10,
  historyMonthsUsed: 3,
  pendingBills: [],
}

const EMPTY_BREAKDOWN = {
  daysInMonth: 0,
  daysElapsed: 0,
  daysRemaining: 0,
  weightedAvgDaily: null,
  historyMonthsUsed: 0,
  pendingBills: [],
}

const LOADING_FORECAST: ForecastResult = {
  status: 'loading',
  currency: null,
  mtdSpent: null,
  variableForecast: null,
  billsForecast: null,
  total: null,
  breakdown: EMPTY_BREAKDOWN,
}

const OK_FORECAST: ForecastResult = {
  status: 'ok',
  currency: EUR_CURRENCY,
  mtdSpent: 500,
  variableForecast: 150,
  billsForecast: 0,
  total: 650,
  breakdown: BREAKDOWN,
}

const PARTIAL_NO_HISTORY: ForecastResult = {
  status: 'partialNoHistory',
  currency: EUR_CURRENCY,
  mtdSpent: 500,
  variableForecast: null,
  billsForecast: 0,
  total: 500,
  breakdown: { ...BREAKDOWN, historyMonthsUsed: 1, weightedAvgDaily: 8 },
}

const PARTIAL_NO_BILLS: ForecastResult = {
  status: 'partialNoBills',
  currency: EUR_CURRENCY,
  mtdSpent: 500,
  variableForecast: 150,
  billsForecast: null,
  total: 650,
  breakdown: BREAKDOWN,
}

const UNAVAILABLE_FORECAST: ForecastResult = {
  status: 'unavailable',
  currency: null,
  mtdSpent: null,
  variableForecast: null,
  billsForecast: null,
  total: null,
  breakdown: { ...BREAKDOWN, weightedAvgDaily: null, historyMonthsUsed: 0 },
}

const UNAVAILABLE_WITH_MTD: ForecastResult = {
  status: 'unavailable',
  currency: EUR_CURRENCY,
  mtdSpent: 500,
  variableForecast: null,
  billsForecast: null,
  total: 500,
  breakdown: { ...BREAKDOWN, weightedAvgDaily: null, historyMonthsUsed: 0 },
}

const ERROR_FORECAST: ForecastResult = {
  status: 'error',
  currency: EUR_CURRENCY,
  mtdSpent: null,
  variableForecast: null,
  billsForecast: null,
  total: null,
  breakdown: { ...BREAKDOWN, weightedAvgDaily: null, historyMonthsUsed: 0 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderCard(
  forecast: ForecastResult,
  config: ForecastConfig = DEFAULT_CONFIG,
  onOpenSettings = vi.fn()
) {
  return render(
    <ForecastCard forecast={forecast} config={config} onOpenSettings={onOpenSettings} />
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ForecastCard', () => {
  it('renders loading skeleton when status=loading', () => {
    renderCard(LOADING_FORECAST)
    expect(screen.getByLabelText('Loading forecast')).toBeInTheDocument()
  })

  it('renders forecast total when status=ok', () => {
    renderCard(OK_FORECAST)
    expect(screen.getByTestId('forecast-total')).toBeInTheDocument()
  })

  it('renders 3 sub-cards: forecast-mtd, forecast-variable, forecast-bills', () => {
    renderCard(OK_FORECAST)
    expect(screen.getByTestId('forecast-mtd')).toBeInTheDocument()
    expect(screen.getByTestId('forecast-variable')).toBeInTheDocument()
    expect(screen.getByTestId('forecast-bills')).toBeInTheDocument()
  })

  it('forecast-mtd sub-card shows MTD amount', () => {
    renderCard(OK_FORECAST)
    expect(screen.getByTestId('forecast-mtd').textContent).toMatch(/500/)
  })

  it('shows footer with Day X of Y and days remaining', () => {
    renderCard(OK_FORECAST)
    expect(screen.getByText(/Day 15 of 30/i)).toBeInTheDocument()
    expect(screen.getByText(/15 days remaining/i)).toBeInTheDocument()
  })

  it('footer shows model name', () => {
    renderCard(OK_FORECAST)
    expect(screen.getByText(/Model: weighted/i)).toBeInTheDocument()
  })

  it('shows warning badge for status=partialNoHistory with history counts', () => {
    renderCard(PARTIAL_NO_HISTORY, { historyMonths: 3, model: 'weighted' })
    const warning = screen.getByTestId('forecast-warning')
    // Should include actual counts from breakdown and config
    expect(warning.textContent).toMatch(/1.*of.*3/i)
  })

  it('shows warning badge for status=partialNoBills', () => {
    renderCard(PARTIAL_NO_BILLS)
    const warning = screen.getByTestId('forecast-warning')
    expect(warning.textContent).toMatch(/bills/i)
  })

  it('renders unavailable state', () => {
    renderCard(UNAVAILABLE_FORECAST)
    expect(screen.getByTestId('forecast-unavailable')).toBeInTheDocument()
  })

  it('unavailable state shows mtdSpent when available', () => {
    renderCard(UNAVAILABLE_WITH_MTD)
    expect(screen.getByTestId('forecast-mtd')).toBeInTheDocument()
    expect(screen.getByTestId('forecast-mtd').textContent).toMatch(/500/)
  })

  it('renders error state with alert role', () => {
    renderCard(ERROR_FORECAST)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clicking gear button calls onOpenSettings', async () => {
    const onOpenSettings = vi.fn()
    render(<ForecastCard forecast={OK_FORECAST} config={DEFAULT_CONFIG} onOpenSettings={onOpenSettings} />)
    await userEvent.click(screen.getByRole('button', { name: /open forecast settings/i }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('formats CLP (decimalPlaces=0) without decimal places; EUR (decimalPlaces=2) with two', () => {
    const clpForecast: ForecastResult = {
      ...OK_FORECAST,
      currency: CLP_CURRENCY,
      mtdSpent: 100000,
      total: 150000,
    }
    const { rerender } = render(
      <ForecastCard forecast={clpForecast} config={DEFAULT_CONFIG} onOpenSettings={() => {}} />
    )
    const clpTotal = screen.getByTestId('forecast-total').textContent ?? ''
    // CLP has 0 decimals: should not have ".XX" after a round number
    expect(clpTotal).not.toMatch(/150[.,]\d{2}$/)

    rerender(
      <ForecastCard forecast={OK_FORECAST} config={DEFAULT_CONFIG} onOpenSettings={() => {}} />
    )
    const eurTotal = screen.getByTestId('forecast-total').textContent ?? ''
    // EUR has 2 decimals: should have ",00" or ".00"
    expect(eurTotal).toMatch(/650[.,]00/)
  })
})
