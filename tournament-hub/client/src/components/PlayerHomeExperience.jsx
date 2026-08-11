import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  getPlayerSessionToken,
  playerApiRequest
} from '../lib/playerApi'

import './PlayerHomeExperience.css'


function scrollToSection(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
}


function openPlayerProfile() {
  document
    .querySelector(
      '.player-account-button'
    )
    ?.click()
}


function formatStage(stage) {
  const labels = {
    league: 'League',
    group: 'Group Stage',
    round_of_32: 'Round of 32',
    round_of_16: 'Round of 16',
    quarter_final: 'Quarter Final',
    semifinal: 'Semi Final',
    third_place: 'Third Place',
    final: 'Final'
  }

  return (
    labels[stage] ||
    String(stage || 'Match')
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      )
  )
}


function formatTournament(format) {
  const labels = {
    league: 'League',
    multi_group_league:
      'Multi-Group League',
    knockout: 'Knockout',
    league_final:
      'League + Final',
    league_knockout:
      'League + Knockout',
    multi_group_tournament:
      'Multi-Group Tournament'
  }

  return (
    labels[format] ||
    format ||
    'Tournament'
  )
}


function PlayerHomeExperience() {
  const [
    sessionToken,
    setSessionToken
  ] = useState(
    () => getPlayerSessionToken()
  )

  const [
    data,
    setData
  ] = useState(null)

  const [
    loading,
    setLoading
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    selectedTournamentId,
    setSelectedTournamentId
  ] = useState('')


  useEffect(
    () => {
      function syncPlayerSession() {
        const token =
          getPlayerSessionToken()

        setSessionToken(
          (current) =>
            current === token
              ? current
              : token
        )
      }


      syncPlayerSession()


      const intervalId =
        window.setInterval(
          syncPlayerSession,
          750
        )


      window.addEventListener(
        'storage',
        syncPlayerSession
      )

      window.addEventListener(
        'focus',
        syncPlayerSession
      )


      return () => {
        window.clearInterval(
          intervalId
        )

        window.removeEventListener(
          'storage',
          syncPlayerSession
        )

        window.removeEventListener(
          'focus',
          syncPlayerSession
        )
      }
    },
    []
  )


  useEffect(
    () => {
      if (!sessionToken) {
        setData(null)
        setLoading(false)
        setError('')
        setSelectedTournamentId('')

        return undefined
      }


      let active = true


      async function loadPlayerHome() {
        try {
          setLoading(true)

          const result =
            await playerApiRequest(
              '/api/player-accounts/competition-home'
            )


          if (!active) {
            return
          }


          setData(result)
          setError('')


          const tournaments =
            result?.tournaments ||
            []


          setSelectedTournamentId(
            (current) => {
              const currentExists =
                tournaments.some(
                  (tournament) =>
                    tournament.id ===
                    current
                )


              if (currentExists) {
                return current
              }


              const tournamentWithStandings =
                tournaments.find(
                  (tournament) =>
                    Array.isArray(
                      tournament.standings
                    )
                    &&
                    tournament
                      .standings
                      .length > 0
                )


              return (
                tournamentWithStandings
                  ?.id
                ||
                tournaments[0]?.id
                ||
                ''
              )
            }
          )
        } catch (
          loadError
        ) {
          if (!active) {
            return
          }


          console.error(
            'Unable to load player home:',
            loadError
          )


          setError(
            loadError?.message ||
            'Unable to load your competition data.'
          )
        } finally {
          if (active) {
            setLoading(false)
          }
        }
      }


      loadPlayerHome()


      const refreshId =
        window.setInterval(
          loadPlayerHome,
          20000
        )


      return () => {
        active = false

        window.clearInterval(
          refreshId
        )
      }
    },
    [sessionToken]
  )


  const selectedTournament =
    useMemo(
      () =>
        data?.tournaments?.find(
          (tournament) =>
            tournament.id ===
            selectedTournamentId
        ) || null,
      [
        data,
        selectedTournamentId
      ]
    )


  void selectedTournament


  if (!sessionToken) {
    return null
  }


  return (
    <section
      id="player-home"
      className="player-home"
    >
      <div className="player-home-container">
        {loading && !data && (
          <div className="player-home-state">
            Loading your player dashboard...
          </div>
        )}


        {error && (
          <div className="player-home-state error">
            {error}
          </div>
        )}


        {data && !data.linked && (
          <div className="player-home-state">
            <strong>
              Player profile connection required
            </strong>

            <p>
              Your account must be linked to your PESLOVER player profile before competition data can be displayed.
            </p>
          </div>
        )}


        {data?.linked && (
          <>
          <section className="player-home-welcome">
            <div>
              <span className="player-home-eyebrow">
                PLAYER HOME
              </span>

              <h1>
                Welcome,{' '}
                {
                  data.player
                    ?.display_name ||
                  'Player'
                }
              </h1>

              <p>
                Your tournaments, matches and standings are available directly from your homepage.
              </p>
            </div>


            <div className="player-home-metrics">
              <div>
                <strong>
                  {
                    data.tournaments
                      ?.length || 0
                  }
                </strong>

                <span>
                  Tournaments
                </span>
              </div>

              <div>
                <strong>
                  {
                    data.upcoming_matches
                      ?.length || 0
                  }
                </strong>

                <span>
                  Upcoming
                </span>
              </div>

              <div>
                <strong>
                  {
                    data.completed_matches
                      ?.length || 0
                  }
                </strong>

                <span>
                  Completed
                </span>
              </div>
            </div>
          </section>


          <PlayerNextMatch
            match={data.next_match}
          />


          <PlayerTournamentSection
            tournaments={
              data.tournaments || []
            }
            onStandings={
              setSelectedTournamentId
            }
          />


          <PlayerMatchesSection
            upcomingMatches={
              data.upcoming_matches || []
            }
            completedMatches={
              data.completed_matches || []
            }
          />


          <PlayerStandingsSection
            tournaments={
              data.tournaments || []
            }
            tournament={
              selectedTournament
            }
            selectedId={
              selectedTournamentId
            }
            onSelect={
              setSelectedTournamentId
            }
          />
          </>
        )}
      </div>
    </section>
  )
}


function PlayerNextMatch({
  match
}) {
  return (
    <section
      id="player-next-match"
      className="player-home-block"
    >
      <div className="player-block-heading">
        <span>
          NEXT MATCH
        </span>

        <h2>
          Your Next Fixture
        </h2>
      </div>


      {!match ? (
        <div className="player-home-state">
          No upcoming match has been generated yet.
        </div>
      ) : (
        <article className="player-next-match-card">

          <div className="player-next-match-meta">
            <strong>
              {match.tournament_name}
            </strong>

            <span>
              {formatStage(match.stage)}

              {match.round_number
                ? ` • Round ${match.round_number}`
                : ''}
            </span>
          </div>


          <div className="player-next-match-versus">

            <strong
              className={
                match.is_home
                  ? 'current-player'
                  : ''
              }
            >
              {match.home_name}
            </strong>


            <span>
              VS
            </span>


            <strong
              className={
                !match.is_home
                  ? 'current-player'
                  : ''
              }
            >
              {match.away_name}
            </strong>

          </div>


          <button
            type="button"
            onClick={() =>
              scrollToSection(
                'player-matches'
              )
            }
          >
            View My Matches
          </button>

        </article>
      )}
    </section>
  )
}


function PlayerTournamentSection({
  tournaments,
  onStandings
}) {
  return (
    <section
      id="player-tournaments"
      className="player-home-block"
    >
      <div className="player-block-heading">
        <span>
          MY TOURNAMENTS
        </span>

        <h2>
          Assigned Competitions
        </h2>

        <p>
          Your active PESLOVER tournament assignments.
        </p>
      </div>


      {tournaments.length === 0 ? (
        <div className="player-home-state">
          You are not assigned to any tournament yet.
        </div>
      ) : (
        <div className="player-tournament-grid">

          {tournaments.map(
            (tournament) => (
              <article
                key={tournament.id}
                className="player-tournament-card"
              >

                <div className="player-tournament-card-top">

                  <div className="player-tournament-logo">
                    {tournament.logo_url ? (
                      <img
                        src={tournament.logo_url}
                        alt=""
                      />
                    ) : (
                      <span>
                        PL
                      </span>
                    )}
                  </div>


                  <span className="player-tournament-status">
                    {
                      String(
                        tournament.status ||
                        'Tournament'
                      )
                        .replace(
                          /_/g,
                          ' '
                        )
                        .replace(
                          /\b\w/g,
                          (letter) =>
                            letter.toUpperCase()
                        )
                    }
                  </span>

                </div>


                <h3>
                  {tournament.name}
                </h3>


                <p>
                  {
                    formatTournament(
                      tournament.format
                    )
                  }
                </p>


                <div className="player-tournament-stats">

                  {tournament.group_name && (
                    <div>
                      <span>
                        Group
                      </span>

                      <strong>
                        {tournament.group_name}
                      </strong>
                    </div>
                  )}


                  {tournament.position != null && (
                    <div>
                      <span>
                        Position
                      </span>

                      <strong>
                        #{tournament.position}
                      </strong>
                    </div>
                  )}


                  {tournament.points != null && (
                    <div>
                      <span>
                        Points
                      </span>

                      <strong>
                        {tournament.points}
                      </strong>
                    </div>
                  )}

                </div>


                <button
                  type="button"
                  onClick={() => {
                    onStandings(
                      tournament.id
                    )

                    window.setTimeout(
                      () =>
                        scrollToSection(
                          'player-standings'
                        ),
                      50
                    )
                  }}
                >
                  {tournament.standings?.length
                    ? 'View Point Table'
                    : 'View Competition'}
                </button>

              </article>
            )
          )}

        </div>
      )}
    </section>
  )
}


function PlayerMatchesSection({
  upcomingMatches,
  completedMatches
}) {
  return (
    <section
      id="player-matches"
      className="player-home-block"
    >
      <div className="player-block-heading">
        <span>
          MY MATCHES
        </span>

        <h2>
          Fixtures & Results
        </h2>

        <p>
          Your upcoming fixtures and latest completed matches.
        </p>
      </div>


      <div className="player-match-columns">

        <div
          id="player-upcoming"
          className="player-match-column"
        >
          <div className="player-match-column-heading">
            <div>
              <span>
                UPCOMING
              </span>

              <h3>
                Upcoming Matches
              </h3>
            </div>

            <strong>
              {upcomingMatches.length}
            </strong>
          </div>


          {upcomingMatches.length === 0 ? (
            <div className="player-home-state">
              No upcoming matches yet.
            </div>
          ) : (
            <div className="player-match-list">
              {upcomingMatches.map(
                (match) => (
                  <PlayerMatchCard
                    key={match.id}
                    match={match}
                  />
                )
              )}
            </div>
          )}
        </div>


        <div
          id="player-completed"
          className="player-match-column"
        >
          <div className="player-match-column-heading">
            <div>
              <span>
                COMPLETED
              </span>

              <h3>
                Recent Results
              </h3>
            </div>

            <strong>
              {completedMatches.length}
            </strong>
          </div>


          {completedMatches.length === 0 ? (
            <div className="player-home-state">
              No completed matches yet.
            </div>
          ) : (
            <div className="player-match-list">
              {completedMatches.map(
                (match) => (
                  <PlayerMatchCard
                    key={match.id}
                    match={match}
                    completed
                  />
                )
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}


function PlayerMatchCard({
  match,
  completed = false
}) {
  const resultClass =
    match.result
      ? ` result-${match.result.toLowerCase()}`
      : ''


  return (
    <article className="player-match-card">

      <div className="player-match-card-meta">
        <strong>
          {match.tournament_name}
        </strong>

        <span>
          {formatStage(match.stage)}

          {match.round_number
            ? ` • Round ${match.round_number}`
            : ''}
        </span>
      </div>


      <div className="player-match-card-versus">

        <strong
          className={
            match.is_home
              ? 'current-player'
              : ''
          }
        >
          {match.home_name}
        </strong>


        {completed ? (
          <div className="player-match-score">
            <strong>
              {match.home_score}
            </strong>

            <span>
              -
            </span>

            <strong>
              {match.away_score}
            </strong>
          </div>
        ) : (
          <span className="player-match-vs">
            VS
          </span>
        )}


        <strong
          className={
            !match.is_home
              ? 'current-player'
              : ''
          }
        >
          {match.away_name}
        </strong>

      </div>


      {completed && match.result && (
        <span
          className={
            `player-match-result${resultClass}`
          }
        >
          {match.result === 'W'
            ? 'WIN'
            : match.result === 'L'
              ? 'LOSS'
              : 'DRAW'}
        </span>
      )}

    </article>
  )
}


function PlayerStandingsSection({
  tournaments,
  tournament,
  selectedId,
  onSelect
}) {
  return (
    <section
      id="player-standings"
      className="player-home-block"
    >
      <div className="player-block-heading">
        <span>MY STANDINGS</span>
        <h2>Point Table</h2>
        <p>
          Your current position in your assigned competition.
        </p>
      </div>

      {tournaments.length > 1 && (
        <select
          className="player-standings-select"
          value={selectedId}
          onChange={(event) =>
            onSelect(event.target.value)
          }
        >
          {tournaments.map(
            (item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            )
          )}
        </select>
      )}

      {!tournament ? (
        <div className="player-home-state">
          No tournament selected.
        </div>
      ) : !tournament.standings?.length ? (
        <div className="player-home-state">
          {formatTournament(
            tournament.format
          )} does not currently have a points table.
        </div>
      ) : (
        <div className="player-standings-wrap">
          <table className="player-standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player / Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>PTS</th>
              </tr>
            </thead>

            <tbody>
              {tournament.standings.map(
                (row) => {
                  const isCurrent =
                    row.id ===
                    tournament.participant_id

                  return (
                    <tr
                      key={row.id}
                      className={
                        isCurrent
                          ? 'current-player-row'
                          : ''
                      }
                    >
                      <td>#{row.position}</td>

                      <td>
                        <strong>
                          {row.name}
                        </strong>

                        {isCurrent && (
                          <span className="player-you-badge">
                            YOU
                          </span>
                        )}
                      </td>

                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goals_for}</td>
                      <td>{row.goals_against}</td>

                      <td>
                        {row.goal_difference > 0
                          ? `+${row.goal_difference}`
                          : row.goal_difference}
                      </td>

                      <td>
                        <strong>
                          {row.points}
                        </strong>
                      </td>
                    </tr>
                  )
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}


export default PlayerHomeExperience
