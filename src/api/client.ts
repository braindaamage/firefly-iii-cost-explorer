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
        throw new Error('Invalid API token. Please check your Personal Access Token.')
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. Check your token permissions.')
      }
      if (response.status === 404) {
        throw new Error('API endpoint not found. Check your Base URL.')
      }
      throw new Error(
        `Unexpected error: ${response.status} ${response.statusText}`
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

  return { fetch: apiFetch, testConnection }
}
