import {
  useEffect,
  useState
} from 'react'

import {
  getPlayerSessionToken
} from '../lib/playerApi'


function scrollToPlayerSection(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
}


function openPlayerProfile() {
  document
    .querySelector(
      '.player-account-button'
    )
    ?.click()
}


function PlayerNavbarLinks() {
  const [
    loggedIn,
    setLoggedIn
  ] = useState(
    () =>
      Boolean(
        getPlayerSessionToken()
      )
  )


  useEffect(() => {
    function syncSession() {
      setLoggedIn(
        Boolean(
          getPlayerSessionToken()
        )
      )
    }

    syncSession()

    const intervalId =
      window.setInterval(
        syncSession,
        750
      )

    window.addEventListener(
      'storage',
      syncSession
    )

    window.addEventListener(
      'focus',
      syncSession
    )

    return () => {
      window.clearInterval(
        intervalId
      )

      window.removeEventListener(
        'storage',
        syncSession
      )

      window.removeEventListener(
        'focus',
        syncSession
      )
    }
  }, [])


  if (!loggedIn) {
    return null
  }


  return (
    <>
      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-home'
          )
        }
      >
        Player Home
      </button>

      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-next-match'
          )
        }
      >
        Next Match
      </button>

      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-tournaments'
          )
        }
      >
        My Tournaments
      </button>

      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-upcoming'
          )
        }
      >
        Upcoming
      </button>

      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-completed'
          )
        }
      >
        Completed
      </button>

      <button
        type="button"
        onClick={() =>
          scrollToPlayerSection(
            'player-standings'
          )
        }
      >
        My Standings
      </button>

      <button
        type="button"
        onClick={
          openPlayerProfile
        }
      >
        Profile
      </button>
    </>
  )
}


export default PlayerNavbarLinks
