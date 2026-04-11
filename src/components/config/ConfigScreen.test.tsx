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
const mockUseConfig = vi.fn()

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => mockUseConfig(),
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

function renderConfigScreen(initialPath = '/config') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
    mockUseConfig.mockReturnValue({
      config: null,
      saveConfig: mockSaveConfig,
      clearConfig: vi.fn(),
      isConfigured: false,
    })
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

  it('shows error when URL format is invalid without making a network request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'not-a-url')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    expect(
      screen.getByText(
        'Invalid URL format. Please enter a valid URL (e.g., https://firefly.example.com).'
      )
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows auth error banner when ?error=auth is in the URL', () => {
    renderConfigScreen('/config?error=auth')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/session expired|token is invalid/i)).toBeInTheDocument()
  })

  it('does not show auth error banner without ?error=auth', () => {
    renderConfigScreen()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('toggles API token visibility when eye button is clicked', async () => {
    renderConfigScreen()
    const user = userEvent.setup()

    const tokenInput = screen.getByLabelText('API Token')
    expect(tokenInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show token/i }))
    expect(tokenInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /hide token/i }))
    expect(tokenInput).toHaveAttribute('type', 'password')
  })

  it('resets connection state to idle when inputs are modified after a successful test', async () => {
    mockFetchAbout('6.1.21')
    renderConfigScreen()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Base URL'), 'https://firefly.example.com')
    await user.type(screen.getByLabelText('API Token'), 'mytoken')
    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(screen.getByText('Connected to Firefly III v6.1.21')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /save & continue/i })).not.toBeDisabled()

    // Modify URL input
    await user.type(screen.getByLabelText('Base URL'), '/extra')

    // Connection status reset to idle → success message gone, save disabled
    expect(screen.queryByText('Connected to Firefly III v6.1.21')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled()
  })
})

describe('ConfigScreen — rehydration from saved config', () => {
  const savedConfig = {
    baseUrl: 'https://firefly.example.com',
    apiToken: 'my-long-saved-token-8a3f',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
    mockSaveConfig.mockReset()
    localStorage.clear()
    mockUseConfig.mockReturnValue({
      config: savedConfig,
      saveConfig: mockSaveConfig,
      clearConfig: vi.fn(),
      isConfigured: true,
    })
  })

  function renderConfigScreen(initialPath = '/config') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <ConfigScreen />
      </MemoryRouter>
    )
  }

  it('pre-fills Base URL from saved config', () => {
    renderConfigScreen()
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://firefly.example.com')
  })

  it('shows masked token instead of editable input on initial load', () => {
    renderConfigScreen()
    expect(screen.getByTestId('token-mask')).toBeInTheDocument()
    expect(screen.getByTestId('token-mask')).toHaveTextContent('••••••••8a3f')
    expect(screen.queryByLabelText('API Token')).not.toBeInTheDocument()
  })

  it('Edit button switches token to editable input pre-filled with saved value', async () => {
    renderConfigScreen()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /edit token/i }))

    expect(screen.queryByTestId('token-mask')).not.toBeInTheDocument()
    const input = screen.getByLabelText('API Token')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(savedConfig.apiToken)
  })

  it('Cancel button reverts to masked token display', async () => {
    renderConfigScreen()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /edit token/i }))
    expect(screen.getByLabelText('API Token')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel edit token/i }))

    expect(screen.getByTestId('token-mask')).toBeInTheDocument()
    expect(screen.queryByLabelText('API Token')).not.toBeInTheDocument()
  })

  it('Test Connection is enabled immediately (both fields have values from config)', () => {
    renderConfigScreen()
    expect(screen.getByRole('button', { name: /test connection/i })).not.toBeDisabled()
  })

  it('saving without editing preserves the token from saved config', async () => {
    mockFetchAbout('6.1.21')
    renderConfigScreen()
    const user = userEvent.setup()

    // Test connection without entering Edit mode — token stays as masked display
    await user.click(screen.getByRole('button', { name: /test connection/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & continue/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(mockSaveConfig).toHaveBeenCalledWith({
      baseUrl: savedConfig.baseUrl,
      apiToken: savedConfig.apiToken,
    })
  })
})
