import {
  useEffect,
  useState
} from 'react'

import { supabase } from './lib/supabase'

import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ResetPassword from './pages/ResetPassword'

function App() {
  const [
    session,
    setSession
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    passwordRecovery,
    setPasswordRecovery
  ] = useState(false)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(
          data.session
        )

        setLoading(false)
      })

    const {
      data: {
        subscription
      }
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            newSession
          ) => {
            setSession(
              newSession
            )

            if (
              event ===
              'PASSWORD_RECOVERY'
            ) {
              setPasswordRecovery(
                true
              )
            }
          }
        )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    )
  }

  if (passwordRecovery) {
    return (
      <ResetPassword
        onComplete={() =>
          setPasswordRecovery(false)
        }
      />
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <Dashboard
      user={session.user}
    />
  )
}

export default App
