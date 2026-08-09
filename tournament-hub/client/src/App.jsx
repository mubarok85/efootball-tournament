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


function getEntryPoint() {
  const path =
    window.location.pathname
      .replace(
        /\/+$/,
        ''
      )
    ||
    '/'


  if (
    path ===
    '/admin'
  ) {
    return 'admin'
  }


  /*
   * Only two supported URLs.
   * Any other path returns to
   * the public homepage.
   */
  if (
    path !==
    '/'
  ) {
    window.history
      .replaceState(
        {},
        '',
        '/'
      )
  }


  return 'public'
}


function App() {
  const entryPoint =
    getEntryPoint()


  if (
    entryPoint ===
    'admin'
  ) {
    return (
      <AdminPortal />
    )
  }


  return (
    <PublicApp />
  )
}


function AdminPortal() {
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
  ] = useState(true)

  const [
    profileLoading,
    setProfileLoading
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')


  const loadProfile =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          setProfile(null)

          return
        }


        setProfileLoading(
          true
        )

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
              userId
            )
            .maybeSingle()


        if (
          profileError
        ) {
          setError(
            profileError.message
          )

          setProfile(null)
        } else {
          setProfile(
            data
          )
        }


        setProfileLoading(
          false
        )
      },
      []
    )


  useEffect(
    () => {
      let mounted =
        true


      supabase
        .auth
        .getSession()
        .then(
          async ({
            data
          }) => {
            if (!mounted) {
              return
            }


            const nextSession =
              data.session


            setSession(
              nextSession
            )


            if (
              nextSession
                ?.user
                ?.id
            ) {
              await loadProfile(
                nextSession
                  .user
                  .id
              )
            }


            if (mounted) {
              setLoading(false)
            }
          }
        )


      const {
        data:
          listener
      } =
        supabase
          .auth
          .onAuthStateChange(
            async (
              _event,
              nextSession
            ) => {
              setSession(
                nextSession
              )


              if (
                nextSession
                  ?.user
                  ?.id
              ) {
                /*
                 * Small delay allows
                 * signup trigger to
                 * create profile.
                 */
                window.setTimeout(
                  () => {
                    loadProfile(
                      nextSession
                        .user
                        .id
                    )
                  },
                  250
                )
              } else {
                setProfile(null)
              }
            }
          )


      return () => {
        mounted = false

        listener
          .subscription
          .unsubscribe()
      }
    },
    [
      loadProfile
    ]
  )


  if (
    loading ||
    profileLoading
  ) {
    return (
      <div className="loading-screen">
        Loading Admin Portal...
      </div>
    )
  }


  if (!session) {
    return (
      <AdminAuth />
    )
  }


  if (
    error
    ||
    !profile
  ) {
    return (
      <main className="admin-status-page">

        <section className="admin-status-card">

          <h1>
            Unable to Load Admin Profile
          </h1>

          <p>
            {
              error
              ||
              'Administrator profile was not found.'
            }
          </p>


          <button
            type="button"
            className="admin-status-refresh"
            onClick={() =>
              loadProfile(
                session.user.id
              )
            }
          >
            Retry
          </button>

        </section>

      </main>
    )
  }


  if (
    profile
      .approval_status !==
    'approved'
  ) {
    return (
      <AdminAccessStatus
        profile={
          profile
        }
        onRefresh={() =>
          loadProfile(
            session.user.id
          )
        }
      />
    )
  }


  if (
    ![
      'admin',
      'super_admin'
    ].includes(
      profile.role
    )
  ) {
    return (
      <AdminAccessStatus
        profile={{
          ...profile,
          approval_status:
            'revoked'
        }}
        onRefresh={() =>
          loadProfile(
            session.user.id
          )
        }
      />
    )
  }


  return (
    <MainApp
      user={
        session.user
      }
      profile={
        profile
      }
    />
  )
}


export default App
