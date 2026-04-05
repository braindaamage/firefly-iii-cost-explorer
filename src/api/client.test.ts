import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient } from './client'

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  })
}

function mockFetchError(status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  })
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new Error('Failed to fetch'))
}

describe('createApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetch', () => {
    it('builds correct URL with base and endpoint', async () => {
      const fetchMock = mockFetchOk({ data: {} })
      vi.stubGlobal('fetch', fetchMock)

      const client = createApiClient('https://firefly.example.com', 'mytoken')
      await client.fetch('/accounts')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://firefly.example.com/api/v1/accounts',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
            Accept: 'application/vnd.api+json',
          }),
        })
      )
    })

    it('strips trailing slash from baseUrl', async () => {
      const fetchMock = mockFetchOk({ data: {} })
      vi.stubGlobal('fetch', fetchMock)

      const client = createApiClient('https://firefly.example.com/', 'mytoken')
      await client.fetch('/accounts')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://firefly.example.com/api/v1/accounts',
        expect.anything()
      )
    })

    it('returns parsed JSON on success', async () => {
      const responseBody = { data: { id: '1', name: 'Test' } }
      vi.stubGlobal('fetch', mockFetchOk(responseBody))

      const client = createApiClient('https://firefly.example.com', 'token')
      const result = await client.fetch('/accounts')
      expect(result).toEqual(responseBody)
    })

    it('throws 401 error with descriptive message', async () => {
      vi.stubGlobal('fetch', mockFetchError(401, 'Unauthorized'))

      const client = createApiClient('https://firefly.example.com', 'badtoken')
      await expect(client.fetch('/accounts')).rejects.toThrow(
        'Invalid API token. Please check your Personal Access Token.'
      )
    })

    it('throws 403 error with descriptive message', async () => {
      vi.stubGlobal('fetch', mockFetchError(403, 'Forbidden'))

      const client = createApiClient('https://firefly.example.com', 'token')
      await expect(client.fetch('/accounts')).rejects.toThrow(
        'Access forbidden. Check your token permissions.'
      )
    })

    it('throws 404 error with descriptive message', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Not Found'))

      const client = createApiClient('https://firefly.example.com', 'token')
      await expect(client.fetch('/accounts')).rejects.toThrow(
        'API endpoint not found. Check your Base URL.'
      )
    })

    it('throws network error with descriptive message', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError())

      const client = createApiClient('https://firefly.example.com', 'token')
      await expect(client.fetch('/accounts')).rejects.toThrow(
        'Cannot connect to server. Check your Base URL and network connection.'
      )
    })

    it('throws generic error for unexpected status codes', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Internal Server Error'))

      const client = createApiClient('https://firefly.example.com', 'token')
      await expect(client.fetch('/accounts')).rejects.toThrow(
        'Unexpected error: 500 Internal Server Error'
      )
    })
  })

  describe('testConnection', () => {
    it('returns success with version on successful /about response', async () => {
      const responseBody = {
        data: { version: '6.1.21', os: 'Linux', php_version: '8.2' },
      }
      vi.stubGlobal('fetch', mockFetchOk(responseBody))

      const client = createApiClient('https://firefly.example.com', 'token')
      const result = await client.testConnection()

      expect(result).toEqual({ success: true, version: '6.1.21' })
    })

    it('returns failure with error message on 401', async () => {
      vi.stubGlobal('fetch', mockFetchError(401, 'Unauthorized'))

      const client = createApiClient('https://firefly.example.com', 'badtoken')
      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe(
        'Invalid API token. Please check your Personal Access Token.'
      )
    })

    it('returns failure with error message on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError())

      const client = createApiClient('https://firefly.example.com', 'token')
      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe(
        'Cannot connect to server. Check your Base URL and network connection.'
      )
    })
  })
})
