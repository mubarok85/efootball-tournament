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
  motmPlayers = [],
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
    homePenalty,
    setHomePenalty
  ] = useState(
    match
      .player1_penalty_score ??
    ''
  )

  const [
    awayPenalty,
    setAwayPenalty
  ] = useState(
    match
      .player2_penalty_score ??
    ''
  )

  const [
    showPenalties,
    setShowPenalties
  ] = useState(
    match
      .player1_penalty_score !==
      null
    ||
    match
      .player2_penalty_score !==
      null
  )

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    motmPlayerId,
    setMotmPlayerId
  ] = useState(
    match.motm_player_id ||
    ''
  )


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

      setHomePenalty(
        match
          .player1_penalty_score ??
        ''
      )

      setAwayPenalty(
        match
          .player2_penalty_score ??
        ''
      )

      setMotmPlayerId(
        match.motm_player_id ||
        ''
      )

      setEditing(
        match.status !==
        'completed'
      )
    },
    [match]
  )


  async function saveResult() {
    if (
      homeScore === '' ||
      awayScore === ''
    ) {
      setError(
        'Enter both scores.'
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
                Number(
                  homeScore
                ),

              player2_score:
                Number(
                  awayScore
                ),

              player1_penalty_score:
                homePenalty === ''
                  ? null
                  : Number(
                      homePenalty
                    ),

              player2_penalty_score:
                awayPenalty === ''
                  ? null
                  : Number(
                      awayPenalty
                    )
            })
        }
      )


      await apiRequest(
        `/api/matches/${match.id}/motm`,
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              motm_player_id:
                motmPlayerId ||
                null
            })
        }
      )


      setEditing(false)


      if (onSaved) {
        await onSaved()
      }
    } catch (saveError) {
      const message =
        saveError.message ||
        'Unable to save result.'


      if (
        message
          .toLowerCase()
          .includes(
            'penalty'
          )
      ) {
        setShowPenalties(
          true
        )
      }


      setError(
        message
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
                match
                  .player1_score
              }
            </strong>

            <span>
              -
            </span>

            <strong>
              {
                match
                  .player2_score
              }
            </strong>
          </div>

          <span>
            {awayName}
          </span>

        </div>


        {
          match
            .player1_penalty_score !==
            null
          &&
          match
            .player2_penalty_score !==
            null
          && (
            <div className="penalty-result">
              Penalties:
              {' '}
              {
                match
                  .player1_penalty_score
              }
              {' - '}
              {
                match
                  .player2_penalty_score
              }
            </div>
          )
        }


        {match.motm_player_id && (
          <div className="result-motm-display">

            <span>
              PLAYER OF THE MATCH
            </span>

            <strong>
              {
                motmPlayers.find(
                  (player) =>
                    player.id ===
                    match.motm_player_id
                )?.name ||
                'Selected Player'
              }
            </strong>

          </div>
        )}


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
          value={
            homeScore
          }
          onChange={
            (event) =>
              setHomeScore(
                event
                  .target
                  .value
              )
          }
        />

        <span className="result-dash">
          -
        </span>

        <input
          type="number"
          min="0"
          value={
            awayScore
          }
          onChange={
            (event) =>
              setAwayScore(
                event
                  .target
                  .value
              )
          }
        />

        <span className="result-team-name">
          {awayName}
        </span>

      </div>


      {showPenalties && (
        <div className="penalty-editor">

          <span>
            Penalty Shootout.
          </span>

          <input
            type="number"
            min="0"
            placeholder="Home"
            value={
              homePenalty
            }
            onChange={
              (event) =>
                setHomePenalty(
                  event
                    .target
                    .value
                )
            }
          />

          <span>
            -
          </span>

          <input
            type="number"
            min="0"
            placeholder="Away"
            value={
              awayPenalty
            }
            onChange={
              (event) =>
                setAwayPenalty(
                  event
                    .target
                    .value
                )
            }
          />

        </div>
      )}


      {error && (
        <div className="result-error">
          {error}
        </div>
      )}


      <div className="motm-editor">

        <div className="motm-editor-heading">

          <div>
            <span>
              MATCH AWARD
            </span>

            <strong>
              Player of the Match
            </strong>
          </div>

          <small>
            Optional
          </small>

        </div>


        <div className="motm-player-grid">

          {motmPlayers.map(
            (player) => {

              const selected =
                motmPlayerId ===
                player.id


              return (
                <button
                  key={
                    player.id
                  }
                  type="button"
                  className={
                    selected
                      ? 'motm-player-option selected'
                      : 'motm-player-option'
                  }
                  onClick={() =>
                    setMotmPlayerId(
                      player.id
                    )
                  }
                >

                  {
                    player.image_url
                      ? (
                        <img
                          src={
                            player.image_url
                          }
                          alt={
                            player.name
                          }
                        />
                      )
                      : (
                        <span className="motm-player-fallback">
                          {
                            String(
                              player.name ||
                              '?'
                            )
                              .charAt(0)
                              .toUpperCase()
                          }
                        </span>
                      )
                  }


                  <span className="motm-player-copy">

                    <strong>
                      {
                        player.name
                      }
                    </strong>

                    <small>
                      {
                        selected
                          ? 'Selected'
                          : 'Select MOTM'
                      }
                    </small>

                  </span>


                  <span className="motm-check">
                    {
                      selected
                        ? '✓'
                        : ''
                    }
                  </span>

                </button>
              )
            }
          )}

        </div>


        {motmPlayerId && (
          <button
            type="button"
            className="motm-clear-button"
            onClick={() =>
              setMotmPlayerId('')
            }
          >
            Clear Player of the Match
          </button>
        )}

      </div>


      <div className="result-actions">

        <button
          type="button"
          className="result-cancel"
          onClick={() =>
            setShowPenalties(
              !showPenalties
            )
          }
        >
          {
            showPenalties
              ? 'Hide Penalties'
              : 'Add Penalties'
          }
        </button>


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
          onClick={
            saveResult
          }
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
