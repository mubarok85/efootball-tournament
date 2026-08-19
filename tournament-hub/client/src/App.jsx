import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  supabase
} from './lib/supabase'

import PublicApp from './pages/PublicApp'
import AdminAuth from './pages/AdminAuth'
import AdminAccessStatus from './pages/AdminAccessStatus'
import MainApp from './pages/MainApp'


function App() {
  const isAdminRoute =
    window.location.pathname
      .startsWith('/admin')


  const [
    session,
    setSession
  ] = useState(null)

  const [
    profile,
    setProfile
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(
    isAdminRoute
  )

  const [
    recoveryMode,
    setRecoveryMode
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')


  const loadProfile =
    useCallback(
      async (user) => {
        if (!user) {
          setProfile(null)
          setLoading(false)

          return
        }


        setLoading(true)
        setError('')


        const {
          data,
          error:
            profileError
        } =
          await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              email,
              role,
              approval_status,
              approved_by,
              approved_at,
              created_at
            `)
            .eq(
              'id',
              user.id
            )
            .single()


        if (profileError) {
          console.error(
            profileError
          )

          setProfile(null)

          setError(
            'Unable to load your administrator profile.'
          )
        } else {
          setProfile(data)
        }


        setLoading(false)
      },
      []
    )


  useEffect(
    () => {
      if (!isAdminRoute) {
        setLoading(false)

        return undefined
      }


      let active = true


      supabase.auth
        .getSession()
        .then(
          async ({
            data
          }) => {
            if (!active) {
              return
            }


            const currentSession =
              data.session


            setSession(
              currentSession
            )


            if (
              currentSession
                ?.user
            ) {
              await loadProfile(
                currentSession.user
              )
            } else {
              setLoading(false)
            }
          }
        )


      const {
        data: {
          subscription
        }
      } =
        supabase.auth
          .onAuthStateChange(
            (
              event,
              nextSession
            ) => {
              if (!active) {
                return
              }


              setSession(
                nextSession
              )


              if (
                event ===
                'PASSWORD_RECOVERY'
              ) {
                setRecoveryMode(
                  true
                )

                setLoading(false)

                return
              }


              if (
                nextSession
                  ?.user
              ) {
                window
                  .setTimeout(
                    () =>
                      loadProfile(
                        nextSession.user
                      ),
                    0
                  )
              } else {
                setProfile(null)
                setLoading(false)
              }
            }
          )


      return () => {
        active = false

        subscription
          .unsubscribe()
      }
    },
    [
      isAdminRoute,
      loadProfile
    ]
  )


  if (!isAdminRoute) {
    return <PublicApp />
  }


  if (loading) {
    return (
      <div className="loading-screen">
        Loading administrator portal...
      </div>
    )
  }


  if (recoveryMode) {
    return (
      <AdminAuth
        recoveryMode
        onRecoveryComplete={() =>
          setRecoveryMode(false)
        }
      />
    )
  }


  if (!session) {
    return <AdminAuth />
  }


  if (error) {
    return (
      <main className="admin-status-page">
        <section className="admin-status-card">
          <h1>
            Unable to Continue
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadProfile(
                session.user
              )
            }
          >
            Try Again
          </button>
        </section>
      </main>
    )
  }


  const isAdmin =
    profile?.role ===
      'admin'
    ||
    profile?.role ===
      'super_admin'


  if (!isAdmin) {
    return (
      <main className="admin-status-page">
        <section className="admin-status-card">
          <h1>
            Administrator Access Required
          </h1>

          <p>
            This account does not have administrator access.
          </p>

          <button
            type="button"
            onClick={() =>
              supabase.auth
                .signOut()
            }
          >
            Sign Out
          </button>
        </section>
      </main>
    )
  }


  const isSuperAdmin =
    profile?.role ===
    'super_admin'


  const isApproved =
    isSuperAdmin
    ||
    profile
      ?.approval_status ===
      'approved'


  if (!isApproved) {
    return (
      <AdminAccessStatus
        profile={profile}
        onRefresh={() =>
          loadProfile(
            session.user
          )
        }
      />
    )
  }


  return (
    <MainApp
      user={session.user}
      profile={profile}
    />
  )
}


export default App
