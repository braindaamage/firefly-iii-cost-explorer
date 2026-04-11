import { createApiClient, ApiError } from './client'

interface PreferenceResponse<T> {
  data: {
    type: string
    id: string
    attributes: {
      name: string
      data: T
    }
  }
}

/**
 * Fetch a named Firefly III preference.
 * Returns null when the preference does not exist (404).
 * Throws for any other error.
 */
export async function getPreference<T>(
  baseUrl: string,
  token: string,
  name: string
): Promise<T | null> {
  const client = createApiClient(baseUrl, token)
  try {
    const response = await client.fetch<PreferenceResponse<T>>(
      `/preferences/${encodeURIComponent(name)}`
    )
    return response.data.attributes.data
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null
    }
    throw err
  }
}

/**
 * Create or update a named Firefly III preference.
 * Uses PUT which acts as upsert on Firefly III ≥6.x.
 * Throws on network or API error.
 */
export async function putPreference<T>(
  baseUrl: string,
  token: string,
  name: string,
  data: T
): Promise<void> {
  const client = createApiClient(baseUrl, token)
  await client.fetch<PreferenceResponse<T>>(
    `/preferences/${encodeURIComponent(name)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name, data }),
    }
  )
}
