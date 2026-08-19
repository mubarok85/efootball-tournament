import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../utils/password'

function Auth() {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const {
    checks,
    valid
  } = validatePassword(password)

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      if (mode === 'forgot') {
        const redirectTo =
          `${window.location.origin}/`

        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo
              }
            )

        if (error) {
          throw error
        }

        setMessage(
          'Password reset link sent. Please check your email.'
        )

        return
      }

      if (mode === 'signup') {
        if (!valid) {
          throw new Error(
            'Please meet all password requirements.'
          )
        }

        const { data, error } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName
              }
            }
          })

        if (error) {
          throw error
        }

        if (!data.session) {
          setMessage(
            'Account created. Please check your email and verify your account.'
          )
        } else {
          setMessage(
            'Account created successfully.'
          )
        }

        return
      }

      const { error } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          })

      if (error) {
        throw error
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="brand">
          <span className="brand-badge">
            EF
          </span>

          <div>
            <h1>
              eFootball Tournament Hub
            </h1>

            <p>
              Secure tournament management.
            </p>
          </div>
        </div>

        {mode !== 'forgot' && (
          <div className="auth-tabs">

            <button
              type="button"
              className={
                mode === 'login'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setMode('login')
                setMessage('')
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={
                mode === 'signup'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setMode('signup')
                setMessage('')
              }}
            >
              Sign Up
            </button>

          </div>
        )}

        {mode === 'forgot' && (
          <div style={{
            marginBottom: '24px'
          }}>
            <h2 style={{
              marginBottom: '8px'
            }}>
              Forgot Password
            </h2>

            <p style={{
              color:
                'var(--text-secondary)',
              fontSize: '14px'
            }}>
              Enter your email, and we will send you a password reset link.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {mode === 'signup' && (
            <div className="form-group">
              <label>
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </div>

          {mode !== 'forgot' && (
            <>
              <div className="form-group">
                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              {mode === 'signup' && (
                <div className="password-rules">

                  <PasswordRule
                    valid={checks.length}
                    text="At least 8 characters."
                  />

                  <PasswordRule
                    valid={checks.lowercase}
                    text="One lowercase letter."
                  />

                  <PasswordRule
                    valid={checks.uppercase}
                    text="One uppercase letter."
                  />

                  <PasswordRule
                    valid={checks.number}
                    text="One number."
                  />

                  <PasswordRule
                    valid={checks.symbol}
                    text="One symbol."
                  />

                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {
              loading
                ? 'Please wait...'
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'signup'
                    ? 'Create Account'
                    : 'Login'
            }
          </button>

        </form>

        {mode === 'login' && (
          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setMode('forgot')
              setMessage('')
            }}
          >
            Forgot your password?
          </button>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setMode('login')
              setMessage('')
            }}
          >
            ← Back to Login
          </button>
        )}

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

      </div>
    </main>
  )
}

function PasswordRule({
  valid,
  text
}) {
  return (
    <div
      className={
        valid
          ? 'password-rule valid'
          : 'password-rule'
      }
    >
      <span>
        {valid ? '✓' : '○'}
      </span>

      {text}
    </div>
  )
}

export default Auth
