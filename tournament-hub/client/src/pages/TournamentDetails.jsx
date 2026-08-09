import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import { supabase } from '../lib/supabase'

import './TournamentDetails.css'

function TournamentDetails({
  user,
  tournamentId,
  onBack
}) {
  const [
    tournament,
    setTournament
  ] = useState(null)

  const [
    players,
    setPlayers
  ] = useState([])

  const [
    teams,
    setTeams
  ] = useState([])

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    playerName,
    setPlayerName
  ] = useState('')

  const [
    teamForm,
    setTeamForm
  ] = useState({
    teamName: '',
    playerOne: '',
    playerTwo: ''
  })

  const loadTournament =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const {
          data: tournamentData,
          error: tournamentError
        } = await supabase
          .from('tournaments')
          .select('*')
          .eq(
            'id',
            tournamentId
          )
          .eq(
            'owner_id',
            user.id
          )
          .single()

        if (tournamentError) {
          throw tournamentError
        }

        const [
          playerResult,
          teamResult
        ] = await Promise.all([
          supabase
            .from(
              'tournament_players'
            )
            .select(`
              id,
              tournament_id,
              name,
              team_id,
              team_position,
              created_at
            `)
            .eq(
              'tournament_id',
              tournamentId
            )
            .order(
              'created_at',
              {
                ascending: true
              }
            ),

          supabase
            .from(
              'tournament_teams'
            )
            .select(`
              id,
              tournament_id,
              name,
              created_at
            `)
            .eq(
              'tournament_id',
              tournamentId
            )
            .order(
              'created_at',
              {
                ascending: true
              }
            )
        ])

        if (playerResult.error) {
          throw playerResult.error
        }

        if (teamResult.error) {
          throw teamResult.error
        }

        setTournament(
          tournamentData
        )

        setPlayers(
          playerResult.data || []
        )

        setTeams(
          teamResult.data || []
        )
      } catch (loadError) {
        console.error(loadError)

        setError(
          loadError.message ||
          'Unable to load tournament.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      tournamentId,
      user.id
    ])

  useEffect(() => {
    loadTournament()
  }, [loadTournament])

  const individualPlayers =
    useMemo(
      () =>
        players.filter(
          (player) =>
            !player.team_id
        ),
      [players]
    )

  function getTeamMembers(teamId) {
    return players
      .filter(
        (player) =>
          player.team_id === teamId
      )
      .sort(
        (a, b) =>
          (a.team_position || 0) -
          (b.team_position || 0)
      )
  }

  async function addIndividual(
    event
  ) {
    event.preventDefault()

    const name =
      playerName.trim()

    if (!name) {
      setError(
        'Player name is required.'
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const {
        error: insertError
      } = await supabase
        .from(
          'tournament_players'
        )
        .insert({
          tournament_id:
            tournamentId,

          name,

          team_id: null,

          team_position: null
        })

      if (insertError) {
        throw insertError
      }

      setPlayerName('')

      await loadTournament()
    } catch (insertError) {
      console.error(insertError)

      setError(
        insertError.message ||
        'Unable to add player.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function addTeam(event) {
    event.preventDefault()

    const teamName =
      teamForm.teamName.trim()

    const playerOne =
      teamForm.playerOne.trim()

    const playerTwo =
      teamForm.playerTwo.trim()

    if (
      !teamName ||
      !playerOne ||
      !playerTwo
    ) {
      setError(
        'Team name and both player names are required.'
      )
      return
    }

    setSaving(true)
    setError('')

    let createdTeamId = null

    try {
      const {
        data: team,
        error: teamError
      } = await supabase
        .from(
          'tournament_teams'
        )
        .insert({
          tournament_id:
            tournamentId,

          name:
            teamName
        })
        .select()
        .single()

      if (teamError) {
        throw teamError
      }

      createdTeamId =
        team.id

      const {
        error: playerError
      } = await supabase
        .from(
          'tournament_players'
        )
        .insert([
          {
            tournament_id:
              tournamentId,

            team_id:
              team.id,

            team_position:
              1,

            name:
              playerOne
          },
          {
            tournament_id:
              tournamentId,

            team_id:
              team.id,

            team_position:
              2,

            name:
              playerTwo
          }
        ])

      if (playerError) {
        throw playerError
      }

      setTeamForm({
        teamName: '',
        playerOne: '',
        playerTwo: ''
      })

      await loadTournament()
    } catch (teamError) {
      console.error(teamError)

      if (createdTeamId) {
        await supabase
          .from(
            'tournament_teams'
          )
          .delete()
          .eq(
            'id',
            createdTeamId
          )
      }

      setError(
        teamError.message ||
        'Unable to create team.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function removePlayer(
    playerId
  ) {
    if (
      !window.confirm(
        'Remove this player?'
      )
    ) {
      return
    }

    setError('')

    const {
      error: deleteError
    } = await supabase
      .from(
        'tournament_players'
      )
      .delete()
      .eq(
        'id',
        playerId
      )

    if (deleteError) {
      setError(
        deleteError.message
      )
      return
    }

    await loadTournament()
  }

  async function removeTeam(
    teamId
  ) {
    if (
      !window.confirm(
        'Remove this team and both players?'
      )
    ) {
      return
    }

    setError('')

    const {
      error: deleteError
    } = await supabase
      .from(
        'tournament_teams'
      )
      .delete()
      .eq(
        'id',
        teamId
      )

    if (deleteError) {
      setError(
        deleteError.message
      )
      return
    }

    await loadTournament()
  }

  function formatFormat(format) {
    const formats = {
      league:
        'League',

      multi_group_league:
        'Multi-Group League',

      knockout:
        'Knockout',

      league_final:
        'League + Final',

      league_knockout:
        'League + Knockout',

      multi_group_tournament:
        'Multi-Group Tournament'
    }

    return (
      formats[format] ||
      format
    )
  }

  if (loading) {
    return (
      <div className="loading-screen">
        Loading Tournament...
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="loading-screen">
        Tournament Not Found.
      </div>
    )
  }

  const isTeamTournament =
    tournament.participant_type ===
    'team'

  const participantCount =
    isTeamTournament
      ? teams.length
      : individualPlayers.length

  return (
    <main className="tournament-details-page">
      <div className="details-container">

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <header className="tournament-hero">
          <div className="tournament-title-area">

            {tournament.logo_url ? (
              <img
                className="details-logo"
                src={
                  tournament.logo_url
                }
                alt=""
              />
            ) : (
              <div className="details-logo fallback">
                🏆
              </div>
            )}

            <div>
              <p className="eyebrow">
                TOURNAMENT MANAGEMENT
              </p>

              <h1>
                {tournament.name}
              </h1>

              <p className="details-description">
                {
                  tournament.description ||
                  'No tournament description.'
                }
              </p>
            </div>

          </div>

          <span
            className={
              `details-status status-${tournament.status}`
            }
          >
            {tournament.status}
          </span>
        </header>

        <section className="details-stats">

          <div className="details-stat-card">
            <span>
              Format
            </span>

            <strong>
              {
                formatFormat(
                  tournament.format
                )
              }
            </strong>
          </div>

          <div className="details-stat-card">
            <span>
              Participant Type
            </span>

            <strong>
              {
                isTeamTournament
                  ? 'Team 2v2'
                  : 'Individual 1v1'
              }
            </strong>
          </div>

          <div className="details-stat-card">
            <span>
              Season
            </span>

            <strong>
              {
                tournament.season ||
                '—'
              }
            </strong>
          </div>

          <div className="details-stat-card">
            <span>
              Participants
            </span>

            <strong>
              {participantCount}
            </strong>
          </div>

        </section>

        {error && (
          <div className="details-error">
            {error}
          </div>
        )}

        <section className="participants-section">

          <div className="details-section-heading">
            <div>
              <p className="eyebrow">
                PARTICIPANTS
              </p>

              <h2>
                {
                  isTeamTournament
                    ? 'Manage Teams'
                    : 'Manage Players'
                }
              </h2>
            </div>

            <span className="participant-count">
              {participantCount}
              {' '}
              {
                isTeamTournament
                  ? 'Teams'
                  : 'Players'
              }
            </span>
          </div>

          {isTeamTournament ? (
            <>
              <form
                className="participant-form team-form"
                onSubmit={addTeam}
              >

                <div className="participant-field">
                  <label>
                    Team Name
                  </label>

                  <input
                    type="text"
                    value={
                      teamForm.teamName
                    }
                    placeholder="Team Alpha"
                    onChange={(event) =>
                      setTeamForm(
                        (current) => ({
                          ...current,
                          teamName:
                            event.target.value
                        })
                      )
                    }
                  />
                </div>

                <div className="participant-field">
                  <label>
                    Player 1
                  </label>

                  <input
                    type="text"
                    value={
                      teamForm.playerOne
                    }
                    placeholder="Player one"
                    onChange={(event) =>
                      setTeamForm(
                        (current) => ({
                          ...current,
                          playerOne:
                            event.target.value
                        })
                      )
                    }
                  />
                </div>

                <div className="participant-field">
                  <label>
                    Player 2
                  </label>

                  <input
                    type="text"
                    value={
                      teamForm.playerTwo
                    }
                    placeholder="Player two"
                    onChange={(event) =>
                      setTeamForm(
                        (current) => ({
                          ...current,
                          playerTwo:
                            event.target.value
                        })
                      )
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button participant-add-button"
                  disabled={saving}
                >
                  {
                    saving
                      ? 'Adding...'
                      : '+ Add Team'
                  }
                </button>

              </form>

              <div className="team-grid">

                {teams.length === 0 ? (
                  <EmptyParticipants
                    text="No Teams Added Yet."
                  />
                ) : (
                  teams.map((team) => {
                    const members =
                      getTeamMembers(
                        team.id
                      )

                    return (
                      <article
                        key={team.id}
                        className="team-card"
                      >
                        <div className="team-card-header">

                          <div>
                            <span className="team-label">
                              TEAM
                            </span>

                            <h3>
                              {team.name}
                            </h3>
                          </div>

                          <button
                            type="button"
                            className="remove-button"
                            onClick={() =>
                              removeTeam(
                                team.id
                              )
                            }
                          >
                            Remove
                          </button>

                        </div>

                        <div className="team-members">

                          {members.map(
                            (member) => (
                              <div
                                key={member.id}
                                className="team-member"
                              >
                                <span>
                                  {
                                    member.team_position
                                  }
                                </span>

                                <strong>
                                  {
                                    member.name
                                  }
                                </strong>
                              </div>
                            )
                          )}

                        </div>
                      </article>
                    )
                  })
                )}

              </div>
            </>
          ) : (
            <>
              <form
                className="participant-form individual-form"
                onSubmit={
                  addIndividual
                }
              >

                <div className="participant-field">
                  <label>
                    Player Name
                  </label>

                  <input
                    type="text"
                    value={playerName}
                    placeholder="Enter player name"
                    onChange={(event) =>
                      setPlayerName(
                        event.target.value
                      )
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button participant-add-button"
                  disabled={saving}
                >
                  {
                    saving
                      ? 'Adding...'
                      : '+ Add Player'
                  }
                </button>

              </form>

              <div className="player-list">

                {
                  individualPlayers.length ===
                  0
                    ? (
                      <EmptyParticipants
                        text="No Players Added Yet."
                      />
                    )
                    : individualPlayers.map(
                      (
                        player,
                        index
                      ) => (
                        <div
                          key={
                            player.id
                          }
                          className="player-row"
                        >
                          <div className="player-identity">

                            <span className="player-number">
                              {
                                index + 1
                              }
                            </span>

                            <strong>
                              {
                                player.name
                              }
                            </strong>

                          </div>

                          <button
                            type="button"
                            className="remove-button"
                            onClick={() =>
                              removePlayer(
                                player.id
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )
                }

              </div>
            </>
          )}

        </section>
      </div>
    </main>
  )
}

function EmptyParticipants({
  text
}) {
  return (
    <div className="participants-empty">
      <span>
        👥
      </span>

      <strong>
        {text}
      </strong>

      <p>
        Add participants to prepare this tournament for fixture generation.
      </p>
    </div>
  )
}

export default TournamentDetails
