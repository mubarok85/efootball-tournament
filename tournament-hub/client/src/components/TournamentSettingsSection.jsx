import {
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'

import './TournamentSettingsSection.css'


function TournamentSettingsSection({
  tournament,
  matches,
  onChanged
}) {
  const [
    working,
    setWorking
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')

  const [
    success,
    setSuccess
  ] = useState('')


  const completedMatches =
    matches.filter(
      (match) =>
        match.status ===
        'completed'
    ).length


  const canRegenerate =
    matches.length > 0 &&
    completedMatches === 0


  async function regenerate() {
    const confirmed =
      window.confirm(
        'Regenerate all current fixtures? Existing manual group assignments will be preserved.'
      )


    if (!confirmed) {
      return
    }


    setWorking(
      'regenerate'
    )

    setError('')
    setSuccess('')


    try {
      const result =
        await apiRequest(
          `/api/tournaments/${tournament.id}/regenerate-fixtures`,
          {
            method:
              'POST'
          }
        )


      setSuccess(
        result.message
      )


      if (onChanged) {
        await onChanged()
      }
    } catch (requestError) {
      setError(
        requestError.message ||
        'Unable to regenerate fixtures.'
      )
    } finally {
      setWorking('')
    }
  }


  async function resetCompetition() {
    const confirmation =
      window.prompt(
        'This removes all fixtures, results, standings progression, groups, bracket data, and champion data. Assigned tournament participants will remain.\n\nType RESET to continue.'
      )


    if (
      confirmation !==
      'RESET'
    ) {
      return
    }


    setWorking(
      'reset'
    )

    setError('')
    setSuccess('')


    try {
      const result =
        await apiRequest(
          `/api/tournaments/${tournament.id}/reset-competition`,
          {
            method:
              'POST',

            body:
              JSON.stringify({
                confirmation:
                  'RESET'
              })
          }
        )


      setSuccess(
        result.message
      )


      if (onChanged) {
        await onChanged()
      }
    } catch (requestError) {
      setError(
        requestError.message ||
        'Unable to reset competition.'
      )
    } finally {
      setWorking('')
    }
  }


  return (
    <section className="tournament-settings-section">

      <div className="settings-section-heading">

        <p className="eyebrow">
          SETTINGS
        </p>

        <h2>
          Tournament Settings
        </h2>

        <p>
          Manage competition-level administrative actions.
        </p>

      </div>


      {error && (
        <div className="settings-action-error">
          {error}
        </div>
      )}


      {success && (
        <div className="settings-action-success">
          {success}
        </div>
      )}


      <div className="settings-summary-grid">

        <div>
          <span>
            Tournament Status
          </span>

          <strong>
            {tournament.status}
          </strong>
        </div>


        <div>
          <span>
            Fixtures
          </span>

          <strong>
            {matches.length}
          </strong>
        </div>


        <div>
          <span>
            Completed Matches
          </span>

          <strong>
            {completedMatches}
          </strong>
        </div>

      </div>


      <div className="competition-settings-card">

        <div className="competition-setting-copy">

          <h3>
            Regenerate Fixtures
          </h3>

          <p>
            Rebuild fixtures before any result has been entered. For group tournaments, your current manual group assignments are preserved.
          </p>

        </div>


        <button
          type="button"
          className="regenerate-fixtures-button"
          disabled={
            !canRegenerate ||
            Boolean(working)
          }
          onClick={
            regenerate
          }
        >
          {
            working ===
            'regenerate'
              ? 'Regenerating...'
              : 'Regenerate Fixtures'
          }
        </button>

      </div>


      <div className="competition-settings-card danger">

        <div className="competition-setting-copy">

          <h3>
            Reset Competition
          </h3>

          <p>
            Remove all fixtures, results, group assignments, knockout progression, and champion data. Tournament participants remain assigned.
          </p>

        </div>


        <button
          type="button"
          className="reset-competition-button"
          disabled={
            Boolean(
              working
            )
          }
          onClick={
            resetCompetition
          }
        >
          {
            working ===
            'reset'
              ? 'Resetting...'
              : 'Reset Competition'
          }
        </button>

      </div>

    </section>
  )
}


export default TournamentSettingsSection
