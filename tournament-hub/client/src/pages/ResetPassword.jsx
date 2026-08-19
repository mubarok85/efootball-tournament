import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../utils/password'

function ResetPassword({
  onComplete
}) {
  const [password, setPassword] =
    useState('')

  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const {
    checks,
    valid
  } = validatePassword(password)

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')

    if (!valid) {
      setMessage(
        'Please meet all password requirements.'
      )

      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        'Passwords do not match.'
      )

      return
    }

    setLoading(true)

    const {
      error
    } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(
      'Password updated successfully.'
    )

    setLoading(false)

    setTimeout(() => {
      onComplete?.()
    }, 1200)
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
              Set New Password.
            </h1>

            <p>
              Choose a strong password for your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>
              New Password.
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

          <div className="form-group">
            <label>
              Confirm Password.
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {
              loading
                ? 'Updating...'
                : 'Update Password'
            }
          </button>

        </form>

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

export default ResetPassword
