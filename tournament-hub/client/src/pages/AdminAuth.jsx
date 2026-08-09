import {
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './AdminAuth.css'


function AdminAuth() {
  const [
    mode,
    setMode
  ] = useState('login')

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
  ] = useState('')


  async function handleSubmit(
    event
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setMessage('')


    try {
      if (
        mode === 'register'
      ) {
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
                email.trim(),

              password,

              options: {
                data: {
                  full_name:
                    fullName.trim(),

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
            'Registration completed. Please verify your email if required, then log in. Your admin account will remain pending until the Super Admin approves it.'
          )

          setMode(
            'login'
          )

          setPassword('')

          return
        }


        setMessage(
          'Registration completed. Your account is waiting for Super Admin approval.'
        )

        return
      }


      const {
        error:
          loginError
      } =
        await supabase
          .auth
          .signInWithPassword({
            email:
              email.trim(),

            password
          })


      if (
        loginError
      ) {
        throw loginError
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


  function switchMode(
    nextMode
  ) {
    setMode(
      nextMode
    )

    setError('')
    setMessage('')
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
                : 'Request Admin Access'
            }
          </h1>

          <span>
            {
              mode ===
              'login'
                ? 'Sign in to manage tournaments and competition data.'
                : 'Register your account. Access requires Super Admin approval.'
            }
          </span>

        </div>


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
                      event.target
                        .value
                    )
                }
                placeholder="Your full name"
                required
              />
            </label>
          )}


          <label>
            <span>
              Email Address
            </span>

            <input
              type="email"
              value={email}
              onChange={
                (event) =>
                  setEmail(
                    event.target
                      .value
                  )
              }
              placeholder="admin@example.com"
              required
            />
          </label>


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
                    event.target
                      .value
                  )
              }
              placeholder="••••••••"
              minLength="6"
              required
            />
          </label>


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
                  : 'Register for Approval'
            }
          </button>

        </form>


        <div className="admin-auth-footer">
          Admin access is restricted to approved accounts.
        </div>

      </section>

    </main>
  )
}


export default AdminAuth
