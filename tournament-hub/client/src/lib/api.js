import { supabase } from './supabase'

const API_URL =
  import.meta.env.VITE_API_URL || ''

export async function apiRequest(
  path,
  options = {}
) {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error(
      'You must be logged in.'
    )
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      headers: {
        'Content-Type':
          'application/json',

        Authorization:
          `Bearer ${session.access_token}`,

        ...(options.headers || {})
      }
    }
  )

  const data =
    await response
      .json()
      .catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'API request failed.'
    )
  }

  return data
}
