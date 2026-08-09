import {
  useEffect,
  useState
} from 'react'

import {
  apiRequest
} from '../lib/api'

import './MatchResultEditor.css'


function MatchResultEditor({
  match,
  homeName,
  awayName,
  onSaved
}) {
  const [
    editing,
    setEditing
  ] = useState(
    match.status !==
    'completed'
  )

  const [
    homeScore,
    setHomeScore
  ] = useState(
    match.player1_score ??
    ''
  )

  const [
    awayScore,
    setAwayScore
  ] = useState(
    match.player2_score ??
    ''
  )

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')


  useEffect(
    () => {
      setHomeScore(
        match.player1_score ??
        ''
      )

      setAwayScore(
        match.player2_score ??
        ''
      )

      setEditing(
        match.status !==
        'completed'
      )
    },
    [
      match.player1_score,
      match.player2_score,
      match.status
    ]
  )


  async function saveResult() {
    const firstScore =
      Number(homeScore)

    const secondScore =
      Number(awayScore)


    if (
      homeScore === ''
      ||
      awayScore === ''
    ) {
      setError(
        'Enter both scores.'
      )
      return
    }


    if (
      !Number.isInteger(
        firstScore
      )
      ||
      !Number.isInteger(
        secondScore
      )
      ||
      firstScore < 0
      ||
      secondScore < 0
    ) {
      setError(
        'Scores must be whole numbers.'
      )
      return
    }


    setSaving(true)
    setError('')


    try {
      await apiRequest(
        `/api/matches/${match.id}/result`,
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              player1_score:
                firstScore,

              player2_score:
                secondScore
            })
        }
      )


      setEditing(false)


      if (onSaved) {
        await onSaved()
      }
    } catch (saveError) {
      setError(
        saveError.message ||
        'Unable to save result.'
      )
    } finally {
      setSaving(false)
    }
  }


  if (!editing) {
    return (
      <div className="result-completed">

        <div className="result-display">

          <span>
            {homeName}
          </span>

          <div className="result-score">
            <strong>
              {
                match.player1_score
              }
            </strong>

            <span>
              -
            </span>

            <strong>
              {
                match.player2_score
              }
            </strong>
          </div>

          <span>
            {awayName}
          </span>

        </div>


        <button
          type="button"
          className="edit-result-button"
          onClick={() =>
            setEditing(true)
          }
        >
          Edit Result
        </button>

      </div>
    )
  }


  return (
    <div className="result-editor">

      <div className="result-input-row">

        <span className="result-team-name">
          {homeName}
        </span>

        <input
          type="number"
          min="0"
          value={homeScore}
          onChange={(event) =>
            setHomeScore(
              event.target.value
            )
          }
        />

        <span className="result-dash">
          -
        </span>

        <input
          type="number"
          min="0"
          value={awayScore}
          onChange={(event) =>
            setAwayScore(
              event.target.value
            )
          }
        />

        <span className="result-team-name">
          {awayName}
        </span>

      </div>


      {error && (
        <div className="result-error">
          {error}
        </div>
      )}


      <div className="result-actions">

        {match.status ===
          'completed' && (
          <button
            type="button"
            className="result-cancel"
            onClick={() =>
              setEditing(false)
            }
          >
            Cancel
          </button>
        )}


        <button
          type="button"
          className="result-save"
          disabled={saving}
          onClick={saveResult}
        >
          {
            saving
              ? 'Saving...'
              : 'Save Result'
          }
        </button>

      </div>

    </div>
  )
}


export default MatchResultEditor
