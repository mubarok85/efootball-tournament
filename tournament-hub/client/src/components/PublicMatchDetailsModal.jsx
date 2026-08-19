import {
  useEffect
} from 'react'

import './PublicMatchDetailsModal.css'


const STAGE_NAMES = {
  league: 'League',
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final: 'Semi-Final',
  third_place: 'Bronze Final',
  final: 'Final'
}


function PublicMatchDetailsModal({
  match,
  tournament,
  players,
  teams,
  groups,
  onClose
}) {
  useEffect(
    () => {
      function handleKeyDown(event) {
        if (
          event.key ===
          'Escape'
        ) {
          onClose()
        }
      }

      window.addEventListener(
        'keydown',
        handleKeyDown
      )

      return () => {
        window.removeEventListener(
          'keydown',
          handleKeyDown
        )
      }
    },
    [onClose]
  )


  if (!match) {
    return null
  }


  const participantType =
    tournament.participant_type


  const firstId =
    participantType === 'team'
      ? match.team1_id
      : match.player1_id


  const secondId =
    participantType === 'team'
      ? match.team2_id
      : match.player2_id


  function findSideName(id) {
    if (!id) {
      return 'TBD'
    }

    if (
      participantType ===
      'team'
    ) {
      return (
        teams.find(
          (team) =>
            team.id === id
        )?.name ||
        'TBD'
      )
    }

    return (
      players.find(
        (player) =>
          player.id === id
      )?.name ||
      'TBD'
    )
  }


  function getWinnerSide() {
    if (
      match.status !==
      'completed'
    ) {
      return null
    }

    if (
      participantType ===
      'team'
    ) {
      if (
        match.winner_team_id ===
        firstId
      ) {
        return 1
      }

      if (
        match.winner_team_id ===
        secondId
      ) {
        return 2
      }
    } else {
      if (
        match.winner_player_id ===
        firstId
      ) {
        return 1
      }

      if (
        match.winner_player_id ===
        secondId
      ) {
        return 2
      }
    }

    if (
      Number(match.player1_score) >
      Number(match.player2_score)
    ) {
      return 1
    }

    if (
      Number(match.player2_score) >
      Number(match.player1_score)
    ) {
      return 2
    }

    if (
      match.player1_penalty_score !==
      null
      &&
      match.player2_penalty_score !==
      null
    ) {
      if (
        Number(
          match.player1_penalty_score
        ) >
        Number(
          match.player2_penalty_score
        )
      ) {
        return 1
      }

      if (
        Number(
          match.player2_penalty_score
        ) >
        Number(
          match.player1_penalty_score
        )
      ) {
        return 2
      }
    }

    return null
  }


  const winnerSide =
    getWinnerSide()


  const motmPlayer =
    players.find(
      (player) =>
        player.id ===
        match.motm_player_id
    )


  const firstPlayers =
    participantType === 'team'
      ? players.filter(
          (player) =>
            player.team_id ===
            firstId
        )
      : players.filter(
          (player) =>
            player.id ===
            firstId
        )


  const secondPlayers =
    participantType === 'team'
      ? players.filter(
          (player) =>
            player.team_id ===
            secondId
        )
      : players.filter(
          (player) =>
            player.id ===
            secondId
        )


  return (
    <div
      className="public-match-modal-backdrop"
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose()
          }
        }
      }
    >
      <section
        className="public-match-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Match details"
      >
        <button
          type="button"
          className="public-match-modal-close"
          onClick={onClose}
          aria-label="Close match details"
        >
          ×
        </button>

        <div className="public-match-modal-heading">
          <span>
            MATCH DETAILS
          </span>

          <h2>
            {
              STAGE_NAMES[
                match.stage
              ] ||
              match.stage
            }
          </h2>

          <p>
            {
              match.group_id
                ? groups.find(
                    (group) =>
                      group.id ===
                      match.group_id
                  )?.name ||
                  'Tournament Match'
                : 'Tournament Match'
            }
          </p>
        </div>

        <div className="public-match-scoreboard">

          <MatchSide
            name={
              findSideName(
                firstId
              )
            }
            players={
              firstPlayers
            }
            score={
              match.status ===
              'completed'
                ? match.player1_score
                : null
            }
            winner={
              winnerSide === 1
            }
          />

          <div className="public-match-score-center">

            <strong>
              {
                match.status ===
                'completed'
                  ? `${match.player1_score} - ${match.player2_score}`
                  : 'VS'
              }
            </strong>

            <span>
              {
                match.status ===
                'completed'
                  ? winnerSide
                    ? 'FULL TIME'
                    : 'FULL TIME · DRAW'
                  : 'UPCOMING'
              }
            </span>

            {
              match.player1_penalty_score !==
              null
              &&
              match.player2_penalty_score !==
              null
              && (
                <small>
                  Penalties
                  {' '}
                  {
                    match.player1_penalty_score
                  }
                  {' - '}
                  {
                    match.player2_penalty_score
                  }
                </small>
              )
            }

          </div>

          <MatchSide
            name={
              findSideName(
                secondId
              )
            }
            players={
              secondPlayers
            }
            score={
              match.status ===
              'completed'
                ? match.player2_score
                : null
            }
            winner={
              winnerSide === 2
            }
          />

        </div>


        {
          winnerSide && (
            <div className="public-winner-celebration">

              <span>
                WINNER
              </span>

              <strong>
                {
                  findSideName(
                    winnerSide === 1
                      ? firstId
                      : secondId
                  )
                }
              </strong>

              <p>
                Match Winner
              </p>

            </div>
          )
        }


        {
          match.status ===
          'completed'
          &&
          motmPlayer && (
            <div className="public-motm-showcase">

              <div className="public-motm-photo">

                {
                  motmPlayer.image_url
                    ? (
                      <img
                        src={
                          motmPlayer.image_url
                        }
                        alt={
                          motmPlayer.name
                        }
                      />
                    )
                    : (
                      <span>
                        {
                          String(
                            motmPlayer.name ||
                            '?'
                          )
                            .charAt(0)
                            .toUpperCase()
                        }
                      </span>
                    )
                }

              </div>

              <div className="public-motm-copy">

                <span>
                  PLAYER OF THE MATCH
                </span>

                <h3>
                  {
                    motmPlayer.name
                  }
                </h3>

                <p>
                  Outstanding performer of this match.
                </p>

              </div>

            </div>
          )
        }


        <div className="public-match-participant-list">

          <h3>
            Match Participants
          </h3>

          <div className="public-match-rosters">

            <Roster
              title={
                findSideName(
                  firstId
                )
              }
              players={
                firstPlayers
              }
              winner={
                winnerSide === 1
              }
              motmPlayerId={
                match.motm_player_id
              }
            />

            <Roster
              title={
                findSideName(
                  secondId
                )
              }
              players={
                secondPlayers
              }
              winner={
                winnerSide === 2
              }
              motmPlayerId={
                match.motm_player_id
              }
            />

          </div>

        </div>

      </section>
    </div>
  )
}


function MatchSide({
  name,
  players,
  winner
}) {
  const image =
    players.find(
      (player) =>
        player.image_url
    )?.image_url


  return (
    <div
      className={
        winner
          ? 'public-match-side winner'
          : 'public-match-side'
      }
    >

      <div className="public-match-side-photo">

        {
          image
            ? (
              <img
                src={image}
                alt={name}
              />
            )
            : (
              <span>
                {
                  String(
                    name ||
                    '?'
                  )
                    .charAt(0)
                    .toUpperCase()
                }
              </span>
            )
        }

      </div>

      <strong>
        {name}
      </strong>

      {
        winner && (
          <small>
            WINNER
          </small>
        )
      }

    </div>
  )
}


function Roster({
  title,
  players,
  winner,
  motmPlayerId
}) {
  return (
    <div
      className={
        winner
          ? 'public-match-roster winner'
          : 'public-match-roster'
      }
    >

      <div className="public-match-roster-title">
        <strong>
          {title}
        </strong>

        {
          winner && (
            <span>
              WINNER
            </span>
          )
        }
      </div>


      {
        players.map(
          (player) => (
            <div
              key={
                player.id
              }
              className={
                player.id ===
                motmPlayerId
                  ? 'public-roster-player motm'
                  : 'public-roster-player'
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
                    <span className="public-roster-fallback">
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

              <strong>
                {
                  player.name
                }
              </strong>

              {
                player.id ===
                motmPlayerId
                && (
                  <small>
                    POTM
                  </small>
                )
              }

            </div>
          )
        )
      }

    </div>
  )
}


export default PublicMatchDetailsModal
