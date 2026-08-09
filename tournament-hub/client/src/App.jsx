import {
  useEffect,
  useState
} from 'react'

import {
  supabase
} from './lib/supabase'

import Auth from './pages/Auth'
import MainApp from './pages/MainApp'
import PublicTournamentPage from './pages/PublicTournamentPage'


function getPublicTournamentSlug() {
  const path =
    window.location.pathname
      .replace(
        /\/+$/,
        ''
      )


  const match =
    path.match(
      /^\/t\/([^/]+)$/
    )


  if (!match) {
    return null
  }


  try {
    return decodeURIComponent(
      match[1]
    )
  } catch {
    return match[1]
  }
}


function App() {
  const [
    session,
    setSession
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(true)


  const publicTournamentSlug =
    getPublicTournamentSlug()


  useEffect(
    () => {
      /*
       * Public tournament pages do
       * not require an auth session.
       */
      if (
        publicTournamentSlug
      ) {
        setLoading(false)

        return undefined
      }


      supabase
        .auth
        .getSession()
        .then(
          ({
            data
          }) => {
            setSession(
              data.session
            )

            setLoading(false)
          }
        )


      const {
        data:
          authListener
      } =
        supabase
          .auth
          .onAuthStateChange(
            (
              _event,
              nextSession
            ) => {
              setSession(
                nextSession
              )
            }
          )


      return () => {
        authListener
          .subscription
          .unsubscribe()
      }
    },
    [
      publicTournamentSlug
    ]
  )


  if (
    publicTournamentSlug
  ) {
    return (
      <PublicTournamentPage
        slug={
          publicTournamentSlug
        }
      />
    )
  }


  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    )
  }


  if (!session) {
    return (
      <Auth />
    )
  }


  return (
    <MainApp
      user={
        session.user
      }
    />
  )
}


export default App
