import {
  useEffect,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './AdminAuth.css'


function AdminAuth({
  recoveryMode = false,
  onRecoveryComplete
}) {
  const [
    mode,
    setMode
  ] = useState(
    recoveryMode
      ? 'change-password'
      : 'login'
  )

  const [
    fullName,
    setFullName
  ] = useState('')

  const [
    email,
    setEmail
  ] = useState('')

  const [
    password,
    setPassword
  ] = useState('')

  const [
    newPassword,
    setNewPassword
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    message,
    setMessage
  ] = useState(
    () => {
      const flash =
        sessionStorage.getItem(
          'peslover_admin_flash'
        )

      if (flash) {
        sessionStorage.removeItem(
          'peslover_admin_flash'
        )
      }

      return flash || ''
    }
  )


  useEffect(
    () => {
      if (
        recoveryMode
      ) {
        setMode(
          'change-password'
        )
      }
    },
    [recoveryMode]
  )


  function clearMessages() {
    setError('')
    setMessage('')
  }


  function switchMode(
    nextMode
  ) {
    clearMessages()

    setMode(
      nextMode
    )
  }


  async function handleSubmit(
    event
  ) {
    event.preventDefault()

    clearMessages()

    setLoading(true)


    try {
      if (
        mode === 'register'
      ) {
        await registerAdmin()
      }

      else if (
        mode === 'forgot'
      ) {
        await sendResetEmail()
      }

      else if (
        mode === 'change-password'
      ) {
        await changePassword()
      }

      else {
        await loginAdmin()
      }
    } catch (
      requestError
    ) {
      setError(
        requestError.message
        ||
        'Unable to continue.'
      )
    } finally {
      setLoading(false)
    }
  }


  async function loginAdmin() {
    const {
      error:
        loginError
    } =
      await supabase
        .auth
        .signInWithPassword({
          email:
            email
              .trim(),

          password
        })


    if (
      loginError
    ) {
      throw loginError
    }
  }


  async function registerAdmin() {
    if (
      !fullName.trim()
    ) {
      throw new Error(
        'Full name is required.'
      )
    }


    const {
      data,
      error:
        signUpError
    } =
      await supabase
        .auth
        .signUp({
          email:
            email
              .trim(),

          password,

          options: {
            data: {
              full_name:
                fullName
                  .trim(),

              requested_role:
                'admin'
            }
          }
        })


    if (
      signUpError
    ) {
      throw signUpError
    }


    if (
      !data.session
    ) {
      setMessage(
        'Registration completed. Verify your email if required, then log in. Your account must still be approved by the Super Admin.'
      )

      setPassword('')

      setMode(
        'login'
      )

      return
    }


    setMessage(
      'Registration completed. Your account is waiting for Super Admin approval.'
    )
  }


  async function sendResetEmail() {
    const normalizedEmail =
      email
        .trim()
        .toLowerCase()


    if (
      !normalizedEmail
    ) {
      throw new Error(
        'Enter your administrator email address.'
      )
    }


    const redirectTo =
      `${window.location.origin}/admin`


    const {
      error:
        resetError
    } =
      await supabase
        .auth
        .resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo
          }
        )


    if (
      resetError
    ) {
      throw resetError
    }


    setMessage(
      'If this administrator account exists, Supabase has sent a password reset link to the email address.'
    )
  }


  async function changePassword() {
    if (
      newPassword.length <
      6
    ) {
      throw new Error(
        'Your new password must contain at least 6 characters.'
      )
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      throw new Error(
        'The passwords do not match.'
      )
    }


    const {
      error:
        updateError
    } =
      await supabase
        .auth
        .updateUser({
          password:
            newPassword
        })


    if (
      updateError
    ) {
      throw updateError
    }


    sessionStorage.setItem(
      'peslover_admin_flash',
      'Password changed successfully. Sign in with your new password.'
    )


    await supabase
      .auth
      .signOut()


    window.history
      .replaceState(
        {},
        '',
        '/admin'
      )


    setNewPassword('')
    setConfirmPassword('')


    onRecoveryComplete?.()
  }


  return (
    <main className="admin-auth-page">

      <section className="admin-auth-card">

        <div className="admin-auth-brand">

          <span>
            PL
          </span>


          <div>

            <strong>
              PESLOVER
            </strong>

            <small>
              Administration Portal
            </small>

          </div>

        </div>


        <div className="admin-auth-heading">

          <p>
            ADMIN ACCESS
          </p>


          <h1>
            {
              mode ===
              'login'
                ? 'Welcome Back'
                : mode ===
                  'register'
                  ? 'Request Admin Access'
                  : mode ===
                    'forgot'
                    ? 'Reset Password'
                    : 'Create New Password'
            }
          </h1>


          <span>
            {
              mode ===
              'login'
                ? 'Sign in to manage PESLOVER tournaments.'
                : mode ===
                  'register'
                  ? 'Register your account. Super Admin approval is required before access is granted.'
                  : mode ===
                    'forgot'
                    ? 'Enter your administrator email. Supabase will send you a secure password reset link.'
                    : 'Choose a new password for your administrator account.'
            }
          </span>

        </div>


        {[
          'login',
          'register'
        ].includes(
          mode
        ) && (
          <div className="admin-auth-tabs">

            <button
              type="button"
              className={
                mode ===
                'login'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                switchMode(
                  'login'
                )
              }
            >
              Login
            </button>


            <button
              type="button"
              className={
                mode ===
                'register'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                switchMode(
                  'register'
                )
              }
            >
              Register
            </button>

          </div>
        )}


        <form
          onSubmit={
            handleSubmit
          }
        >

          {mode ===
            'register' && (
            <label>

              <span>
                Full Name
              </span>

              <input
                type="text"
                value={
                  fullName
                }
                onChange={
                  (event) =>
                    setFullName(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Your full name"
                required
              />

            </label>
          )}


          {mode !==
            'change-password' && (
            <label>

              <span>
                Email Address
              </span>

              <input
                type="email"
                value={
                  email
                }
                onChange={
                  (event) =>
                    setEmail(
                      event
                        .target
                        .value
                    )
                }
                placeholder="admin@example.com"
                autoComplete="email"
                required
              />

            </label>
          )}


          {[
            'login',
            'register'
          ].includes(
            mode
          ) && (
            <label>

              <span>
                Password
              </span>

              <input
                type="password"
                value={
                  password
                }
                onChange={
                  (event) =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                }
                placeholder="••••••••"
                minLength="6"
                autoComplete={
                  mode ===
                  'login'
                    ? 'current-password'
                    : 'new-password'
                }
                required
              />

            </label>
          )}


          {mode ===
            'change-password' && (
            <>

              <div className="admin-recovery-success-icon">
                ✓
              </div>


              <div className="admin-recovery-ready">

                <strong>
                  Recovery Link Verified
                </strong>

                <span>
                  Enter and confirm your new administrator password.
                </span>

              </div>


              <label>

                <span>
                  New Password
                </span>

                <input
                  type="password"
                  value={
                    newPassword
                  }
                  onChange={
                    (event) =>
                      setNewPassword(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="New password"
                  minLength="6"
                  autoComplete="new-password"
                  required
                />

              </label>


              <label>

                <span>
                  Confirm New Password
                </span>

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={
                    (event) =>
                      setConfirmPassword(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Confirm new password"
                  minLength="6"
                  autoComplete="new-password"
                  required
                />

              </label>

            </>
          )}


          {mode ===
            'login' && (
            <button
              type="button"
              className="admin-forgot-password"
              onClick={() =>
                switchMode(
                  'forgot'
                )
              }
            >
              Forgot Password?
            </button>
          )}


          {error && (
            <div className="admin-auth-error">
              {error}
            </div>
          )}


          {message && (
            <div className="admin-auth-message">
              {message}
            </div>
          )}


          <button
            type="submit"
            className="admin-auth-submit"
            disabled={
              loading
            }
          >
            {
              loading
                ? 'Please Wait...'
                : mode ===
                  'login'
                  ? 'Login to Admin Portal'
                  : mode ===
                    'register'
                    ? 'Register for Approval'
                    : mode ===
                      'forgot'
                      ? 'Send Reset Email'
                      : 'Save New Password'
            }
          </button>


          {mode ===
            'forgot' && (
            <button
              type="button"
              className="admin-back-login"
              onClick={() =>
                switchMode(
                  'login'
                )
              }
            >
              ← Back to Login
            </button>
          )}

        </form>


        <div className="admin-auth-footer">
          Admin access is restricted to approved accounts.
        </div>

      </section>

    </main>
  )
}


export default AdminAuth
