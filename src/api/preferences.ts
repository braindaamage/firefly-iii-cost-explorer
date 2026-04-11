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
 *
 * Strategy: PUT first (update). If Firefly returns 404 (preference does not
 * exist yet), fall back to POST (create). Any other error re-throws.
 *
 * PUT body: { data }   — name is in the URL path.
 * POST body: { name, data } — name required in the body for resource creation.
 */
export async function putPreference<T>(
  baseUrl: string,
  token: string,
  name: string,
  data: T
): Promise<void> {
  const client = createApiClient(baseUrl, token)
  try {
    await client.fetch<PreferenceResponse<T>>(
      `/preferences/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ data }),
      }
    )
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      // Preference does not exist yet — create via POST
      // (Firefly III PUT may not upsert on all versions)
      await client.fetch<PreferenceResponse<T>>(
        '/preferences',
        {
          method: 'POST',
          body: JSON.stringify({ name, data }),
        }
      )
      return
    }
    throw err
  }
}
