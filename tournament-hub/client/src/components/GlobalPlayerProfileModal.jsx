import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './GlobalPlayerProfileModal.css'


function signedNumber(value) {
  const number =
    Number(value || 0)

  return number > 0
    ? `+${number}`
    : String(number)
}


function GlobalPlayerProfileModal({
  playerId,
  onClose
}) {
  const [profile, setProfile] =
    useState(null)

  const [history, setHistory] =
    useState([])

  const [tournaments, setTournaments] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  useEffect(
    () => {
      if (!playerId) {
        return
      }

      let active = true


      async function loadProfile() {
        setLoading(true)
        setError('')


        try {
          const [
            profileResult,
            historyResult,
            tournamentResult
          ] =
            await Promise.all([
              supabase.rpc(
                'get_global_player_profile',
                {
                  profile_player_id:
                    playerId
                }
              ),

              supabase.rpc(
                'get_global_player_form',
                {
                  profile_player_id:
                    playerId,
                  match_limit: 20
                }
              ),

              supabase.rpc(
                'get_global_player_tournaments',
                {
                  profile_player_id:
                    playerId
                }
              )
            ])


          if (profileResult.error) {
            throw profileResult.error
          }

          if (historyResult.error) {
            throw historyResult.error
          }

          if (tournamentResult.error) {
            throw tournamentResult.error
          }


          if (!active) {
            return
          }


          setProfile(
            profileResult.data?.[0] ||
            null
          )

          setHistory(
            historyResult.data ||
            []
          )

          setTournaments(
            tournamentResult.data ||
            []
          )

        } catch (loadError) {
          if (active) {
            setError(
              loadError.message ||
              'Unable to load player career.'
            )
          }
        } finally {
          if (active) {
            setLoading(false)
          }
        }
      }


      loadProfile()


      return () => {
        active = false
      }
    },
    [playerId]
  )


  useEffect(
    () => {
      function handleKeyDown(event) {
        if (event.key === 'Escape') {
          onClose()
        }
      }


      window.addEventListener(
        'keydown',
        handleKeyDown
      )


      return () =>
        window.removeEventListener(
          'keydown',
          handleKeyDown
        )
    },
    [onClose]
  )


  const recentForm =
    useMemo(
      () =>
        history
          .slice(0, 5)
          .map(
            (item) =>
              String(
                item.result || ''
              )
                .charAt(0)
                .toUpperCase()
          ),
      [history]
    )


  const championshipCount =
    tournaments.filter(
      (tournament) =>
        tournament.is_champion
    ).length


  return (
    <div
      className="career-modal-backdrop"
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
      <section className="career-modal">

        <button
          type="button"
          className="career-close"
          onClick={onClose}
          aria-label="Close player profile"
        >
          ×
        </button>


        {loading ? (
          <div className="career-state">
            Loading player career...
          </div>

        ) : error ? (
          <div className="career-error">
            {error}
          </div>

        ) : !profile ? (
          <div className="career-state">
            Player not found.
          </div>

        ) : (
          <>
            <header className="career-hero">

              <div className="career-avatar">
                {profile.image_url ? (
                  <img className="career-profile-photo-image"
                    src={profile.image_url}
                    alt={profile.player_name}
                  />
                ) : (
                  <span>
                    {
                      profile.player_name
                        .charAt(0)
                        .toUpperCase()
                    }
                  </span>
                )}
              </div>


              <div className="career-player-info">
                <span>
                  PESLOVER PLAYER
                </span>

                <h2>
                  {profile.player_name}
                </h2>

                <div className="career-badges">
                  <span>
                    Global Rank #
                    {profile.global_rank}
                  </span>

                  <span>
                    {profile.current_tier}
                  </span>

                  <span>
                    {championshipCount}
                    {' '}
                    Championship
                    {championshipCount === 1
                      ? ''
                      : 's'}
                  </span>
                </div>
              </div>


              <div className="career-rating">
                <small>
                  CURRENT ELO
                </small>

                <strong>
                  {profile.current_rating}
                </strong>

                <span
                  className={
                    Number(
                      profile.last_change
                    ) >= 0
                      ? 'career-positive'
                      : 'career-negative'
                  }
                >
                  {
                    signedNumber(
                      profile.last_change
                    )
                  }
                </span>
              </div>

            </header>


            <div className="career-stats">

              <Stat
                label="Matches"
                value={profile.matches_played}
              />

              <Stat
                label="Wins"
                value={profile.wins}
              />

              <Stat
                label="Draws"
                value={profile.draws}
              />

              <Stat
                label="Losses"
                value={profile.losses}
              />

              <Stat
                label="Win Rate"
                value={`${profile.win_rate}%`}
              />

              <Stat
                label="Goals"
                value={profile.goals_for}
              />

              <Stat
                label="Goal Diff."
                value={
                  signedNumber(
                    profile.goal_difference
                  )
                }
              />

              <Stat
                label="Peak ELO"
                value={profile.peak_rating}
              />

            </div>


            <div className="career-layout">

              <section className="career-card">

                <div className="career-card-heading">
                  <div>
                    <span>
                      PERFORMANCE
                    </span>

                    <h3>
                      Match & ELO History
                    </h3>
                  </div>


                  <div className="career-form">
                    {recentForm.length ? (
                      recentForm.map(
                        (result, index) => (
                          <span
                            key={`${result}-${index}`}
                            className={
                              `career-form-${result.toLowerCase()}`
                            }
                          >
                            {result}
                          </span>
                        )
                      )
                    ) : (
                      <small>
                        No form yet
                      </small>
                    )}
                  </div>
                </div>


                <div className="career-rating-summary">

                  <div>
                    <span>
                      Current
                    </span>
                    <strong>
                      {profile.current_rating}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Peak
                    </span>
                    <strong>
                      {profile.peak_rating}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Lowest
                    </span>
                    <strong>
                      {profile.lowest_rating}
                    </strong>
                  </div>

                </div>


                <div className="career-history">

                  {history.length === 0 ? (
                    <div className="career-empty">
                      No ranked matches yet.
                    </div>
                  ) : (
                    history.map(
                      (match) => (
                        <div
                          key={match.history_id}
                          className="career-match"
                        >

                          <span
                            className={
                              `career-result career-result-${String(
                                match.result
                              )
                                .charAt(0)
                                .toLowerCase()}`
                            }
                          >
                            {
                              String(
                                match.result
                              )
                                .charAt(0)
                                .toUpperCase()
                            }
                          </span>


                          <div>
                            <strong>
                              {match.goals_for}
                              {' – '}
                              {match.goals_against}
                            </strong>

                            <small>
                              Opponent ELO
                              {' '}
                              {match.opponent_rating}
                            </small>
                          </div>


                          <div className="career-match-rating">
                            <strong>
                              {match.rating_after}
                            </strong>

                            <span
                              className={
                                Number(
                                  match.rating_change
                                ) >= 0
                                  ? 'career-positive'
                                  : 'career-negative'
                              }
                            >
                              {
                                signedNumber(
                                  match.rating_change
                                )
                              }
                            </span>
                          </div>

                        </div>
                      )
                    )
                  )}

                </div>

              </section>


              <section className="career-card">

                <div className="career-card-heading">
                  <div>
                    <span>
                      CAREER
                    </span>

                    <h3>
                      Tournament History
                    </h3>
                  </div>
                </div>


                <div className="career-tournaments">

                  {tournaments.length === 0 ? (
                    <div className="career-empty">
                      No public tournament history yet.
                    </div>
                  ) : (
                    tournaments.map(
                      (tournament) => (
                        <article
                          key={
                            tournament.tournament_id
                          }
                          className={
                            tournament.is_champion
                              ? 'career-tournament champion'
                              : 'career-tournament'
                          }
                        >

                          <div>
                            <strong>
                              {
                                tournament
                                  .tournament_name
                              }
                            </strong>

                            <span>
                              {
                                tournament.season ||
                                'No season'
                              }
                            </span>
                          </div>


                          <div className="career-tournament-status">
                            {tournament.is_champion && (
                              <span className="champion-badge">
                                🏆 Champion
                              </span>
                            )}

                            <small>
                              {
                                tournament
                                  .tournament_status
                              }
                            </small>
                          </div>

                        </article>
                      )
                    )
                  )}

                </div>

              </section>

            </div>
          </>
        )}

      </section>
    </div>
  )
}


function Stat({
  label,
  value
}) {
  return (
    <article className="career-stat">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  )
}


export default GlobalPlayerProfileModal
