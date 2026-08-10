import {
  useEffect,
  useState
} from 'react'

import './PlayerAccountPortal.css'


const API_BASE =
  String(
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(
    /\/+$/,
    ''
  )


const STORAGE_KEY =
  'peslover_player_session'


function PlayerAccountPortal() {
  const [
    opened,
    setOpened
  ] = useState(false)

  const [
    view,
    setView
  ] = useState(
    'login'
  )

  const [
    account,
    setAccount
  ] = useState(null)

  const [
    busy,
    setBusy
  ] = useState(false)

  const [
    message,
    setMessage
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')

  const [
    loginForm,
    setLoginForm
  ] = useState({
    login: '',
    password: ''
  })

  const [
    registerForm,
    setRegisterForm
  ] = useState({
    full_name: '',
    username: '',
    email: '',
    password: ''
  })

  const [
    profileForm,
    setProfileForm
  ] = useState({
    full_name: '',
    username: ''
  })


  function token() {
    return (
      localStorage.getItem(
        STORAGE_KEY
      )
      ||
      ''
    )
  }


  async function request(
    path,
    options = {}
  ) {
    const currentToken =
      token()


    const response =
      await fetch(
        `${API_BASE}${path}`,
        {
          ...options,

          headers: {
            'Content-Type':
              'application/json',

            ...(currentToken
              ? {
                  Authorization:
                    `Bearer ${currentToken}`
                }
              : {}),

            ...options.headers
          }
        }
      )


    const data =
      await response
        .json()
        .catch(
          () => ({})
        )


    if (!response.ok) {
      throw new Error(
        data.message ||
        'Something went wrong.'
      )
    }


    return data
  }


  function useAccount(
    nextAccount
  ) {
    setAccount(
      nextAccount
    )

    setProfileForm({
      full_name:
        nextAccount
          .full_name,

      username:
        nextAccount
          .username
    })
  }


  useEffect(
    () => {
      async function restore() {
        if (!token()) {
          return
        }


        try {
          const data =
            await request(
              '/api/player-accounts/me'
            )

          useAccount(
            data.account
          )

          setView(
            'profile'
          )
        } catch {
          localStorage.removeItem(
            STORAGE_KEY
          )
        }
      }


      restore()
    },
    []
  )


  async function register(
    event
  ) {
    event.preventDefault()

    setBusy(true)
    setError('')
    setMessage('')


    try {
      const data =
        await request(
          '/api/player-accounts/register',
          {
            method:
              'POST',

            body:
              JSON.stringify(
                registerForm
              )
          }
        )


      setMessage(
        data.message
      )

      setView(
        'pending'
      )

    } catch (
      registerError
    ) {
      setError(
        registerError.message
      )
    } finally {
      setBusy(false)
    }
  }


  async function login(
    event
  ) {
    event.preventDefault()

    setBusy(true)
    setError('')
    setMessage('')


    try {
      const data =
        await request(
          '/api/player-accounts/login',
          {
            method:
              'POST',

            body:
              JSON.stringify(
                loginForm
              )
          }
        )


      localStorage.setItem(
        STORAGE_KEY,
        data.session_token
      )


      useAccount(
        data.account
      )

      setView(
        'profile'
      )

    } catch (
      loginError
    ) {
      setError(
        loginError.message
      )
    } finally {
      setBusy(false)
    }
  }


  async function saveProfile(
    event
  ) {
    event.preventDefault()

    setBusy(true)
    setError('')
    setMessage('')


    try {
      const data =
        await request(
          '/api/player-accounts/profile',
          {
            method:
              'PATCH',

            body:
              JSON.stringify(
                profileForm
              )
          }
        )


      useAccount(
        data.account
      )

      setMessage(
        'Name updated across PESLOVER.'
      )


      window.setTimeout(
        () =>
          window.location.reload(),
        700
      )

    } catch (
      profileError
    ) {
      setError(
        profileError.message
      )
    } finally {
      setBusy(false)
    }
  }


  function uploadPhoto(
    event
  ) {
    const file =
      event.target
        .files?.[0]


    if (!file) {
      return
    }


    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp'
      ].includes(
        file.type
      )
    ) {
      setError(
        'Use JPG, PNG or WEBP.'
      )

      return
    }


    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setError(
        'Profile photo must be 2 MB or smaller.'
      )

      return
    }


    const reader =
      new FileReader()


    reader.onload =
      async () => {
        setBusy(true)
        setError('')


        try {
          const data =
            await request(
              '/api/player-accounts/profile-photo',
              {
                method:
                  'PUT',

                body:
                  JSON.stringify({
                    image_data_url:
                      reader.result
                  })
              }
            )


          useAccount(
            data.account
          )

          setMessage(
            'Profile photo updated across PESLOVER.'
          )


          window.setTimeout(
            () =>
              window.location.reload(),
            700
          )

        } catch (
          photoError
        ) {
          setError(
            photoError.message
          )
        } finally {
          setBusy(false)
        }
      }


    reader.readAsDataURL(
      file
    )
  }


  async function logout() {
    try {
      await request(
        '/api/player-accounts/logout',
        {
          method:
            'POST'
        }
      )
    } catch {
      // Clear the local session anyway.
    }


    localStorage.removeItem(
      STORAGE_KEY
    )

    setAccount(null)
    setView('login')
    setOpened(false)
  }


  return (
    <>
      <button
        type="button"
        className="player-account-button"
        onClick={() =>
          setOpened(true)
        }
      >
        {account ? (
          <>
            {account.avatar_url ? (
              <img
                src={
                  account.avatar_url
                }
                alt=""
              />
            ) : (
              <span className="account-letter">
                {
                  account
                    .full_name
                    .charAt(0)
                    .toUpperCase()
                }
              </span>
            )}

            {
              account
                .full_name
            }
          </>
        ) : (
          <>
            <span className="account-icon">
              ●
            </span>

            Player Login
          </>
        )}
      </button>


      {opened && (
        <div
          className="player-account-backdrop"
          onMouseDown={
            (event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setOpened(false)
              }
            }
          }
        >
          <section className="player-account-box">

            <button
              type="button"
              className="account-close"
              onClick={() =>
                setOpened(false)
              }
            >
              ×
            </button>


            <header className="account-heading">

              <span>
                PESLOVER PLAYER
              </span>

              <h2>
                {view === 'register'
                  ? 'Create Player Account'
                  : view === 'pending'
                    ? 'Approval Pending'
                    : view === 'profile'
                      ? 'My Profile'
                      : 'Player Login'}
              </h2>

              <p>
                One account. One global PESLOVER player.
              </p>

            </header>


            {error && (
              <div className="account-error">
                {error}
              </div>
            )}


            {message && (
              <div className="account-success">
                {message}
              </div>
            )}


            {view === 'login' && (
              <form
                className="account-form"
                onSubmit={
                  login
                }
              >
                <label>
                  Username or Email

                  <input
                    required
                    value={
                      loginForm.login
                    }
                    onChange={
                      (event) =>
                        setLoginForm({
                          ...loginForm,

                          login:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <label>
                  Password

                  <input
                    required
                    type="password"
                    value={
                      loginForm
                        .password
                    }
                    onChange={
                      (event) =>
                        setLoginForm({
                          ...loginForm,

                          password:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <button
                  type="submit"
                  className="account-primary"
                  disabled={
                    busy
                  }
                >
                  {busy
                    ? 'Signing In...'
                    : 'Login'}
                </button>


                <button
                  type="button"
                  className="account-link"
                  onClick={() => {
                    setError('')
                    setMessage('')
                    setView(
                      'register'
                    )
                  }}
                >
                  Create a Player Account
                </button>

              </form>
            )}


            {view === 'register' && (
              <form
                className="account-form"
                onSubmit={
                  register
                }
              >
                <label>
                  Player Name

                  <input
                    required
                    maxLength="80"
                    value={
                      registerForm
                        .full_name
                    }
                    onChange={
                      (event) =>
                        setRegisterForm({
                          ...registerForm,

                          full_name:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <label>
                  Username

                  <input
                    required
                    maxLength="30"
                    value={
                      registerForm
                        .username
                    }
                    onChange={
                      (event) =>
                        setRegisterForm({
                          ...registerForm,

                          username:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <label>
                  Email

                  <input
                    required
                    type="email"
                    value={
                      registerForm
                        .email
                    }
                    onChange={
                      (event) =>
                        setRegisterForm({
                          ...registerForm,

                          email:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <label>
                  Password

                  <input
                    required
                    minLength="8"
                    type="password"
                    value={
                      registerForm
                        .password
                    }
                    onChange={
                      (event) =>
                        setRegisterForm({
                          ...registerForm,

                          password:
                            event.target
                              .value
                        })
                    }
                  />
                </label>


                <button
                  type="submit"
                  className="account-primary"
                  disabled={
                    busy
                  }
                >
                  {busy
                    ? 'Submitting...'
                    : 'Register'}
                </button>


                <button
                  type="button"
                  className="account-link"
                  onClick={() =>
                    setView('login')
                  }
                >
                  Already registered? Login
                </button>

              </form>
            )}


            {view === 'pending' && (
              <div className="account-pending">

                <span>
                  ✓
                </span>

                <h3>
                  Registration received
                </h3>

                <p>
                  Your account must be approved by a PESLOVER administrator before you can log in.
                </p>

                <button
                  type="button"
                  className="account-primary"
                  onClick={() => {
                    setView(
                      'login'
                    )

                    setMessage('')
                  }}
                >
                  Back to Login
                </button>

              </div>
            )}


            {view === 'profile' &&
              account && (
              <div className="player-profile-content">

                <div className="profile-summary">

                  <label className="profile-photo">

                    {account.avatar_url ? (
                      <img
                        src={
                          account
                            .avatar_url
                        }
                        alt=""
                      />
                    ) : (
                      <span>
                        {
                          account
                            .full_name
                            .charAt(0)
                            .toUpperCase()
                        }
                      </span>
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        uploadPhoto
                      }
                    />

                    <small>
                      Edit
                    </small>

                  </label>


                  <div>
                    <strong>
                      {
                        account
                          .full_name
                      }
                    </strong>

                    <span>
                      @
                      {
                        account
                          .username
                      }
                    </span>

                    <small>
                      Approved PESLOVER Player
                    </small>
                  </div>

                </div>


                <form
                  className="account-form"
                  onSubmit={
                    saveProfile
                  }
                >
                  <label>
                    Player Name

                    <input
                      required
                      value={
                        profileForm
                          .full_name
                      }
                      onChange={
                        (event) =>
                          setProfileForm({
                            ...profileForm,

                            full_name:
                              event.target
                                .value
                          })
                      }
                    />
                  </label>


                  <label>
                    Username

                    <input
                      required
                      value={
                        profileForm
                          .username
                      }
                      onChange={
                        (event) =>
                          setProfileForm({
                            ...profileForm,

                            username:
                              event.target
                                .value
                          })
                      }
                    />
                  </label>


                  <label>
                    Email

                    <input
                      disabled
                      value={
                        account.email
                      }
                    />
                  </label>


                  <button
                    type="submit"
                    className="account-primary"
                    disabled={
                      busy
                    }
                  >
                    Save Profile
                  </button>

                </form>


                <button
                  type="button"
                  className="account-logout"
                  onClick={
                    logout
                  }
                >
                  Logout
                </button>

              </div>
            )}

          </section>
        </div>
      )}
    </>
  )
}


export default PlayerAccountPortal
