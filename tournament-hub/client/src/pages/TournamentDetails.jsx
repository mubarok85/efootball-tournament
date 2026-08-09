import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
import MatchResultEditor from '../components/MatchResultEditor'
import StandingsSection from '../components/StandingsSection'
import BracketSection from '../components/BracketSection'

import './TournamentDetails.css'


function TournamentDetails({
  user,
  tournamentId,
  onBack
}) {
  const [
    activePage,
    setActivePage
  ] = useState('overview')

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
    groups,
    setGroups
  ] = useState([])

  const [
    matches,
    setMatches
  ] = useState([])

  const [
    groupMembers,
    setGroupMembers
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
    generating,
    setGenerating
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    success,
    setSuccess
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
          teamResult,
          groupResult,
          groupMemberResult,
          matchResult
        ] = await Promise.all([
          supabase
            .from('tournament_players')
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
            .from('tournament_teams')
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
            ),

          supabase
            .from('tournament_groups')
            .select(`
              id,
              tournament_id,
              name,
              group_order
            `)
            .eq(
              'tournament_id',
              tournamentId
            )
            .order(
              'group_order',
              {
                ascending: true
              }
            ),

          supabase
            .from('tournament_group_members')
            .select(`
              id,
              tournament_id,
              group_id,
              player_id,
              team_id,
              seed_order
            `)
            .eq(
              'tournament_id',
              tournamentId
            )
            .order(
              'seed_order',
              {
                ascending: true
              }
            ),

          supabase
            .from('matches')
            .select(`
              id,
              tournament_id,
              group_id,
              player1_id,
              player2_id,
              team1_id,
              team2_id,
              player1_score,
              player2_score,
              player1_penalty_score,
              player2_penalty_score,
              round_number,
              stage,
              leg_number,
              tie_id,
              next_tie_id,
              next_slot,
              match_order,
              bracket_side,
              bracket_order,
              manual_slot1,
              manual_slot2,
              winner_player_id,
              winner_team_id,
              completed_at,
              status,
              created_at
            `)
            .eq(
              'tournament_id',
              tournamentId
            )
            .order(
              'round_number',
              {
                ascending: true
              }
            )
            .order(
              'match_order',
              {
                ascending: true
              }
            )
            .order(
              'leg_number',
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

        if (groupResult.error) {
          throw groupResult.error
        }

        if (groupMemberResult.error) {
          throw groupMemberResult.error
        }

        if (matchResult.error) {
          throw matchResult.error
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

        setGroups(
          groupResult.data || []
        )

        setGroupMembers(
          groupMemberResult.data || []
        )

        setMatches(
          matchResult.data || []
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


  useEffect(() => {
    const channel =
      supabase
        .channel(
          `tournament-matches-${tournamentId}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter:
              `tournament_id=eq.${tournamentId}`
          },
          () => {
            loadTournament()
          }
        )
        .subscribe()


    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [
    tournamentId,
    loadTournament
  ])


  const individualPlayers =
    useMemo(
      () =>
        players.filter(
          (player) =>
            !player.team_id
        ),
      [players]
    )


  const playerMap =
    useMemo(
      () =>
        new Map(
          players.map(
            (player) => [
              player.id,
              player.name
            ]
          )
        ),
      [players]
    )


  const teamMap =
    useMemo(
      () =>
        new Map(
          teams.map(
            (team) => [
              team.id,
              team.name
            ]
          )
        ),
      [teams]
    )


  const groupMap =
    useMemo(
      () =>
        new Map(
          groups.map(
            (group) => [
              group.id,
              group.name
            ]
          )
        ),
      [groups]
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


  function getParticipantName(
    match,
    side
  ) {
    if (
      tournament.participant_type ===
      'team'
    ) {
      const teamId =
        side === 1
          ? match.team1_id
          : match.team2_id

      return (
        teamMap.get(teamId) ||
        'TBD'
      )
    }

    const playerId =
      side === 1
        ? match.player1_id
        : match.player2_id

    return (
      playerMap.get(playerId) ||
      'TBD'
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

    if (matches.length > 0) {
      setError(
        'Players cannot be added after fixtures have been generated.'
      )
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

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

    if (matches.length > 0) {
      setError(
        'Teams cannot be added after fixtures have been generated.'
      )
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

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
    if (matches.length > 0) {
      setError(
        'Players cannot be removed after fixtures have been generated.'
      )
      return
    }

    if (
      !window.confirm(
        'Remove this player?'
      )
    ) {
      return
    }

    setError('')
    setSuccess('')

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
    if (matches.length > 0) {
      setError(
        'Teams cannot be removed after fixtures have been generated.'
      )
      return
    }

    if (
      !window.confirm(
        'Remove this team and both players?'
      )
    ) {
      return
    }

    setError('')
    setSuccess('')

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


  async function generateFixtures() {
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const result =
        await apiRequest(
          `/api/tournaments/${tournamentId}/generate-fixtures`,
          {
            method: 'POST'
          }
        )

      setSuccess(
        `${result.matches} fixtures generated successfully.`
      )

      await loadTournament()
    } catch (generateError) {
      console.error(
        generateError
      )

      setError(
        generateError.message ||
        'Unable to generate fixtures.'
      )
    } finally {
      setGenerating(false)
    }
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


  function formatStage(stage) {
    const stages = {
      league:
        'League',

      group:
        'Group Stage',

      round_of_32:
        'Round of 32',

      round_of_16:
        'Round of 16',

      quarter_final:
        'Quarter-Final',

      semi_final:
        'Semi-Final',

      third_place:
        'Third Place',

      final:
        'Final'
    }

    return (
      stages[stage] ||
      stage
    )
  }


  const isTeamTournament =
    tournament?.participant_type ===
    'team'


  const participantCount =
    isTeamTournament
      ? teams.length
      : individualPlayers.length


  const fixturesBySection =
    useMemo(() => {
      const sections = new Map()

      for (const match of matches) {
        let key
        let title

        if (
          match.stage === 'group'
        ) {
          const groupName =
            groupMap.get(
              match.group_id
            ) || 'Group'

          key =
            `group-${match.group_id}-round-${match.round_number}`

          title =
            `${groupName} · Round ${match.round_number}`
        } else if (
          match.stage === 'league'
        ) {
          key =
            `league-round-${match.round_number}`

          title =
            `League · Round ${match.round_number}`
        } else {
          key =
            `${match.stage}-round-${match.round_number}`

          title =
            formatStage(
              match.stage
            )
        }

        if (!sections.has(key)) {
          sections.set(
            key,
            {
              key,
              title,
              matches: []
            }
          )
        }

        sections
          .get(key)
          .matches
          .push(match)
      }

      return [
        ...sections.values()
      ]
    }, [
      matches,
      groupMap
    ])


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


        <nav className="tournament-navigation">

          <button
            type="button"
            className={
              activePage === 'overview'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('overview')
            }
          >
            Overview
          </button>

          <button
            type="button"
            className={
              activePage === 'participants'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('participants')
            }
          >
            Participants

            <span>
              {participantCount}
            </span>
          </button>

          <button
            type="button"
            className={
              activePage === 'fixtures'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('fixtures')
            }
          >
            Fixtures & Results

            <span>
              {matches.length}
            </span>
          </button>

          <button
            type="button"
            className={
              activePage === 'standings'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('standings')
            }
          >
            Standings
          </button>

          <button
            type="button"
            className={
              activePage === 'groups'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('groups')
            }
          >
            Groups
          </button>

          <button
            type="button"
            className={
              activePage === 'bracket'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('bracket')
            }
          >
            Bracket
          </button>

          <button
            type="button"
            className={
              activePage === 'settings'
                ? 'tournament-nav-item active'
                : 'tournament-nav-item'
            }
            onClick={() =>
              setActivePage('settings')
            }
          >
            Settings
          </button>

        </nav>


        <header
          className="tournament-hero"
          hidden={
            activePage !== 'overview'
          }
        >
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


        <section
          className="details-stats"
          hidden={
            activePage !== 'overview'
          }
        >

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
              Participants
            </span>

            <strong>
              {participantCount}
            </strong>
          </div>

          <div className="details-stat-card">
            <span>
              Fixtures
            </span>

            <strong>
              {matches.length}
            </strong>
          </div>

        </section>


        {error && (
          <div className="details-error">
            {error}
          </div>
        )}


        {success && (
          <div className="details-success">
            {success}
          </div>
        )}


        <section
          className="participants-section"
          hidden={
            activePage !== 'participants'
          }
        >

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


          {matches.length > 0 && (
            <div className="fixtures-locked-note">
              Fixtures have already been generated, so participant changes are locked.
            </div>
          )}


          {isTeamTournament ? (
            <>
              {matches.length === 0 && (
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
              )}


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

                          {matches.length === 0 && (
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
                          )}

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
              {matches.length === 0 && (
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
              )}


              <div className="player-list">

                {
                  individualPlayers.length === 0
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

                          {matches.length === 0 && (
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
                          )}

                        </div>
                      )
                    )
                }

              </div>
            </>
          )}

        </section>


        <section
          className="fixture-section"
          hidden={
            activePage !== 'fixtures'
          }
        >

          <div className="fixture-heading">

            <div>
              <p className="eyebrow">
                MATCHES
              </p>

              <h2>
                Fixtures
              </h2>

              <p>
                Generate and manage the tournament schedule.
              </p>
            </div>


            {matches.length === 0 && (
              <button
                type="button"
                className="primary-button generate-button"
                disabled={
                  generating ||
                  participantCount < 2
                }
                onClick={
                  generateFixtures
                }
              >
                {
                  generating
                    ? 'Generating...'
                    : 'Generate Fixtures'
                }
              </button>
            )}

          </div>


          {participantCount < 2 &&
            matches.length === 0 && (
              <div className="fixture-warning">
                Add at least two participants before generating fixtures.
              </div>
            )}


          {matches.length === 0 ? (
            <div className="fixtures-empty">
              <span>
                ⚽
              </span>

              <strong>
                No Fixtures Yet.
              </strong>

              <p>
                Once your participants are ready, generate the tournament schedule automatically.
              </p>
            </div>
          ) : (
            <div className="fixture-sections">

              {fixturesBySection.map(
                (section) => (
                  <div
                    key={
                      section.key
                    }
                    className="fixture-round"
                  >

                    <div className="fixture-round-heading">
                      <h3>
                        {
                          section.title
                        }
                      </h3>

                      <span>
                        {
                          section.matches.length
                        }
                        {' '}
                        Match
                        {
                          section.matches.length === 1
                            ? ''
                            : 'es'
                        }
                      </span>
                    </div>


                    <div className="fixture-list">

                      {section.matches.map(
                        (match) => (
                          <article
                            key={
                              match.id
                            }
                            className="fixture-card"
                          >

                            <div className="fixture-meta">
                              <span>
                                {
                                  formatStage(
                                    match.stage
                                  )
                                }
                              </span>

                              {match.leg_number > 1 && (
                                <span>
                                  Leg {
                                    match.leg_number
                                  }
                                </span>
                              )}

                              {match.group_id && (
                                <span>
                                  {
                                    groupMap.get(
                                      match.group_id
                                    )
                                  }
                                </span>
                              )}
                            </div>


                            <div className="fixture-matchup">

                              <strong className="fixture-participant home">
                                {
                                  getParticipantName(
                                    match,
                                    1
                                  )
                                }
                              </strong>

                              <div className="fixture-score">
                                <span className="versus">
                                  VS
                                </span>
                              </div>

                              <strong className="fixture-participant away">
                                {
                                  getParticipantName(
                                    match,
                                    2
                                  )
                                }
                              </strong>

                            </div>


                            <MatchResultEditor
                              match={match}
                              homeName={
                                getParticipantName(
                                  match,
                                  1
                                )
                              }
                              awayName={
                                getParticipantName(
                                  match,
                                  2
                                )
                              }
                              onSaved={
                                loadTournament
                              }
                            />


                            <div className="fixture-footer">

                              <span>
                                Match {
                                  match.match_order ||
                                  '—'
                                }
                              </span>

                              <span
                                className={
                                  `fixture-status fixture-status-${match.status}`
                                }
                              >
                                {
                                  match.status
                                }
                              </span>

                            </div>

                          </article>
                        )
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>


        <div
          hidden={
            activePage !== 'standings'
          }
        >
          <StandingsSection
            tournament={tournament}
            players={players}
            teams={teams}
            groups={groups}
            groupMembers={groupMembers}
            matches={matches}
          />
        </div>


        {activePage === 'groups' && (
          <section className="tournament-subpage">

            <div className="subpage-heading">
              <p className="eyebrow">
                COMPETITION
              </p>

              <h2>
                Groups
              </h2>

              <p>
                Group assignments and qualification will be managed here.
              </p>
            </div>

            <div className="subpage-placeholder">
              Tournament group management will appear here.
            </div>

          </section>
        )}


        {activePage === 'bracket' && (
          <BracketSection
            tournament={tournament}
            matches={matches}
            players={players}
            teams={teams}
            onChanged={loadTournament}
          />
        )}


        {activePage === 'settings' && (
          <section className="tournament-subpage">

            <div className="subpage-heading">
              <p className="eyebrow">
                SETTINGS
              </p>

              <h2>
                Tournament Settings
              </h2>

              <p>
                Manage tournament information, format, status, and administrative options.
              </p>
            </div>

            <div className="subpage-placeholder">
              Tournament settings will be available here.
            </div>

          </section>
        )}

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
