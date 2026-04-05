import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ConfigScreen } from './ConfigScreen'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockSaveConfig = vi.fn()

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    config: null,
    saveConfig: mockSaveConfig,
    clearConfig: vi.fn(),
    isConfigured: false,
  }),
}))

function mockFetchAbout(version: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({ data: { version, os: 'Linux', php_version: '8.2' } }),
    })
  )
}

function mockFetchError(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'Error',
      json: () => Promise.resolve({}),
    })
  )
}

function renderConfigScreen() {
  return render(
    <MemoryRouter>
      <ConfigScreen />
    </MemoryRouter>
  )
}

describe('ConfigScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
    mockSaveConfig.mockReset()
    localStorage.clear()
  })

  it('renders empty fields initially', () => {
    renderConfigScreen()
    expect(screen.getByLabelText('Base URL')).toHaveValue('')
    expect(screen.getByLabelText('API Token')).toHaveValue('')
  })

  it('"Test Connection" button is disabled when inputs are empty', () => {
    renderConfigScreen()
    expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled()
  })

  it('"Test Connection" button is enabled when both inputs have values', async () => {
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')

    expect(screen.getByRole('button', { name: /test connection/i })).not.toBeDisabled()
  })

  it('"Save & Continue" is disabled initially', () => {
    renderConfigScreen()
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled()
  })

  it('shows testing state when "Test Connection" is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () =>
                    Promise.resolve({ data: { version: '6.1.21' } }),
                }),
              100
            )
          )
      )
    )

    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    expect(screen.getByText('Testing connection...')).toBeInTheDocument()
  })

  it('shows success status with version after successful test', async () => {
    mockFetchAbout('6.1.21')
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Connected to Firefly III v6.1.21')
      ).toBeInTheDocument()
    })
  })

  it('shows error status after failed test (401)', async () => {
    mockFetchError(401)
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'badtoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Invalid API token. Please check your Personal Access Token.'
        )
      ).toBeInTheDocument()
    })
  })

  it('"Save & Continue" is disabled until connection is successful', async () => {
    mockFetchError(401)
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'badtoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid api token/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled()
  })

  it('"Save & Continue" saves config and navigates to dashboard after successful test', async () => {
    mockFetchAbout('6.1.21')
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & continue/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(mockSaveConfig).toHaveBeenCalledWith({
      baseUrl: 'https://firefly.example.com',
      apiToken: 'mytoken',
    })
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('strips trailing slash from URL before testing', async () => {
    mockFetchAbout('6.1.21')
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(
      screen.getByLabelText('Base URL'),
      'https://firefly.example.com/'
    )
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Connected to Firefly III v6.1.21')
      ).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Base URL')).toHaveValue(
      'https://firefly.example.com'
    )
  })
})
