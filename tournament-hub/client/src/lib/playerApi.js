const API_URL =
  import.meta.env.VITE_API_URL || ''

export const PLAYER_SESSION_KEY =
  'peslover_player_session'


export function getPlayerSessionToken() {
  return (
    window.localStorage.getItem(
      PLAYER_SESSION_KEY
    ) || ''
  )
}


export function hasPlayerSession() {
  return Boolean(
    getPlayerSessionToken()
  )
}


export async function playerApiRequest(
  path,
  options = {}
) {
  const token =
    getPlayerSessionToken()

  if (!token) {
    throw new Error(
      'Player login is required.'
    )
  }

  const headers = {
    Authorization:
      `Bearer ${token}`,

    ...(options.headers || {})
  }

  if (
    options.body &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] =
      'application/json'
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        credentials: 'include',
        headers
      }
    )

  const data =
    await response
      .json()
      .catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'Unable to load player data.'
    )
  }

  return data
}
