import type { PaginatedResponse } from './types'

export class ApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export function createApiClient(baseUrl: string, token: string) {
  const base = baseUrl.replace(/\/$/, '')

  async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${base}/api/v1${endpoint}`
    let response: Response

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
    } catch {
      throw new Error(
        'Cannot connect to server. Check your Base URL and network connection.'
      )
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('Invalid API token. Please check your Personal Access Token.', 401)
      }
      if (response.status === 403) {
        throw new ApiError('Access forbidden. Check your token permissions.', 403)
      }
      if (response.status === 404) {
        throw new ApiError('API endpoint not found. Check your Base URL.', 404)
      }
      throw new ApiError(
        `Unexpected error: ${response.status} ${response.statusText}`,
        response.status
      )
    }

    return response.json() as Promise<T>
  }

  async function testConnection(): Promise<{
    success: boolean
    version?: string
    error?: string
  }> {
    try {
      const data = await apiFetch<{ data: { version: string } }>('/about')
      return { success: true, version: data.data.version }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function fetchAllPages<TRaw>(endpoint: string): Promise<TRaw[]> {
    const sep = endpoint.includes('?') ? '&' : '?'
    const firstPage = await apiFetch<PaginatedResponse<TRaw>>(`${endpoint}${sep}page=1`)
    const allData = [...firstPage.data]
    const totalPages = firstPage.meta.pagination.total_pages

    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await apiFetch<PaginatedResponse<TRaw>>(`${endpoint}${sep}page=${page}`)
      allData.push(...nextPage.data)
    }

    return allData
  }

  return { fetch: apiFetch, fetchAllPages, testConnection }
}
