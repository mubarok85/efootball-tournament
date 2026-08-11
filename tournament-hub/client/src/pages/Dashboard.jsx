import {
  useCallback,
  useEffect,
  useState
} from 'react'

import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
import CreateTournamentWizard from '../components/CreateTournamentWizard'
import TournamentDetails from './TournamentDetails'
import PlayerAccountRequests from '../components/PlayerAccountRequests'

import './Dashboard.css'

function Dashboard({ user, profile }) {
  const [tournaments, setTournaments] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [showWizard, setShowWizard] =
    useState(false)

  const [
    selectedTournamentId,
    setSelectedTournamentId
  ] = useState(null)

  const [error, setError] =
    useState('')

  const [
    deletingTournamentId,
    setDeletingTournamentId
  ] = useState(null)

  const canDeleteTournament =
    [
      'admin',
      'super_admin'
    ].includes(
      profile?.role
    )

  const [stats, setStats] =
    useState({
      activeTournaments: 0,
      totalPlayers: 0,
      matchesPlayed: 0
    })

  const loadDashboard =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        let tournamentQuery =
          supabase
            .from('tournaments')
            .select('*')

        if (
          !canDeleteTournament
        ) {
          tournamentQuery =
            tournamentQuery.eq(
              'owner_id',
              user.id
            )
        }

        const {
          data,
          error: tournamentError
        } =
          await tournamentQuery
            .order(
              'created_at',
              {
                ascending: false
              }
            )

        if (tournamentError) {
          throw tournamentError
        }

        const tournamentList =
          data || []

        setTournaments(
          tournamentList
        )

        const tournamentIds =
          tournamentList.map(
            (tournament) =>
              tournament.id
          )


        /*
         * Player Library is GLOBAL
         * across approved administrators.
         *
         * RLS determines whether the
         * authenticated account can read it.
         */
        const {
          count:
            totalPlayers,
          error:
            playerLibraryError
        } = await supabase
          .from('players')
          .select(
            'id',
            {
              count: 'exact',
              head: true
            }
          )


        if (
          playerLibraryError
        ) {
          throw playerLibraryError
        }


        let matchesPlayed = 0


        /*
         * Matches Played remains related
         * to tournaments owned by the
         * current regular administrator.
         */
        if (
          tournamentIds.length >
          0
        ) {
          const {
            count:
              completedMatchCount,
            error:
              matchError
          } = await supabase
            .from('matches')
            .select(
              'id',
              {
                count: 'exact',
                head: true
              }
            )
            .in(
              'tournament_id',
              tournamentIds
            )
            .eq(
              'status',
              'completed'
            )


          if (
            matchError
          ) {
            throw matchError
          }


          matchesPlayed =
            completedMatchCount
            ||
            0
        }


        setStats({
          activeTournaments:
            tournamentList.filter(
              (tournament) =>
                tournament.status ===
                'active'
            ).length,

          totalPlayers,

          matchesPlayed
        })
      } catch (loadError) {
        console.error(loadError)

        setError(
          loadError.message ||
          'Unable to load dashboard.'
        )
      } finally {
        setLoading(false)
      }
    }, [user.id, canDeleteTournament])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])


  /*
   * Update Total Players automatically
   * when any approved administrator
   * changes the shared Player Library.
   */
  useEffect(
    () => {
      const channel =
        supabase
          .channel(
            `dashboard-player-count-${user.id}`
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'players'
            },
            () => {
              loadDashboard()
            }
          )
          .subscribe()


      return () => {
        supabase
          .removeChannel(
            channel
          )
      }
    },
    [
      user.id,
      loadDashboard
    ]
  )


  async function logout() {
    await supabase.auth.signOut()
  }

  async function handleTournamentCreated() {
    setShowWizard(false)
    await loadDashboard()
  }


  async function deleteTournament(
    tournament
  ) {
    if (
      !canDeleteTournament
    ) {
      return
    }

    const confirmation =
      window.prompt(
        `Permanently delete "${tournament.name}"? Type DELETE to confirm.`
      )

    if (
      confirmation !== 'DELETE'
    ) {
      return
    }

    setDeletingTournamentId(
      tournament.id
    )

    setError('')

    try {
      await apiRequest(
        `/api/tournaments/${tournament.id}`,
        {
          method: 'DELETE',

          body:
            JSON.stringify({
              confirmation: 'DELETE'
            })
        }
      )

      setTournaments(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              tournament.id
          )
      )

      await loadDashboard()
    } catch (deleteError) {
      setError(
        deleteError.message ||
        'Unable to delete tournament.'
      )
    } finally {
      setDeletingTournamentId(
        null
      )
    }
  }

  function formatTournamentFormat(
    format
  ) {
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

  if (selectedTournamentId) {
    return (
      <TournamentDetails
        user={user}
        tournamentId={selectedTournamentId}
        onBack={() => {
          setSelectedTournamentId(null)
          loadDashboard()
        }}
      />
    )
  }

  if (showWizard) {
    return (
      <CreateTournamentWizard
        user={user}
        onCancel={() =>
          setShowWizard(false)
        }
        onCreated={
          handleTournamentCreated
        }
      />
    )
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            ORGANIZER DASHBOARD
          </p>

          <h1>
            eFootball Tournament Hub
          </h1>
        </div>


      </header>

      <section className="welcome-card">
        <div>
          <p className="eyebrow">
            TOURNAMENT MANAGEMENT
          </p>

          <h2>
            Manage Your Competitions.
          </h2>

          <p>
            Create tournaments, manage participants, generate fixtures, and track results.
          </p>
        </div>

        <button
          type="button"
          className="primary-button dashboard-action"
          onClick={() =>
            setShowWizard(true)
          }
        >
          + Create Tournament
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>
            Active Tournaments
          </span>

          <strong>
            {stats.activeTournaments}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Total Players
          </span>

          <strong>
            {stats.totalPlayers}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Matches Played
          </span>

          <strong>
            {stats.matchesPlayed}
          </strong>
        </div>
      </section>

      <PlayerAccountRequests />


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <section className="tournament-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              MY TOURNAMENTS
            </p>

            <h2>
              Your Competitions
            </h2>
          </div>

          <span className="tournament-count">
            {tournaments.length}
            {' '}
            Tournament
            {tournaments.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        {loading ? (
          <div className="dashboard-state">
            Loading tournaments...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              🏆
            </div>

            <h3>
              No Tournaments Yet.
            </h3>

            <p>
              Create your first tournament to begin adding participants and managing your competition.
            </p>

            <button
              type="button"
              className="primary-button empty-button"
              onClick={() =>
                setShowWizard(true)
              }
            >
              Create Your First Tournament
            </button>
          </div>
        ) : (
          <div className="tournament-grid">
            {tournaments.map(
              (tournament) => (
                <article
                  key={
                    tournament.id
                  }
                  className="tournament-card"
                >
                  <div className="tournament-card-top">
                    {tournament.logo_url ? (
                      <img
                        src={
                          tournament.logo_url
                        }
                        alt=""
                        style={{
                          width: 48,
                          height: 48,
                          objectFit:
                            'cover',
                          borderRadius:
                            10
                        }}
                      />
                    ) : (
                      <div className="game-badge">
                        eFootball
                      </div>
                    )}

                    <span
                      className={
                        `status-badge status-${tournament.status}`
                      }
                    >
                      {
                        tournament.status
                      }
                    </span>
                  </div>

                  <h3>
                    {tournament.name}
                  </h3>

                  <p className="tournament-description">
                    {
                      tournament.description ||
                      'No description added.'
                    }
                  </p>

                  <div className="tournament-meta">
                    <div>
                      <span>
                        Format
                      </span>

                      <strong>
                        {
                          formatTournamentFormat(
                            tournament.format
                          )
                        }
                      </strong>
                    </div>

                    <div>
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

                    <div>
                      <span>
                        Participants
                      </span>

                      <strong>
                        {
                          tournament.participant_type ===
                          'team'
                            ? 'Team 2v2'
                            : 'Individual 1v1'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Status
                      </span>

                      <strong>
                        {
                          tournament.status
                        }
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginTop: '18px'
                    }}
                  >
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        setSelectedTournamentId(
                          tournament.id
                        )
                      }
                    >
                      Manage Tournament
                    </button>

                    {canDeleteTournament && (
                      <button
                        type="button"
                        disabled={
                          deletingTournamentId ===
                          tournament.id
                        }
                        onClick={() =>
                          deleteTournament(
                            tournament
                          )
                        }
                        style={{
                          padding:
                            '11px 18px',
                          border:
                            '1px solid #dc2626',
                          borderRadius:
                            '10px',
                          background:
                            '#fff',
                          color:
                            '#dc2626',
                          fontWeight:
                            700,
                          cursor:
                            deletingTournamentId ===
                            tournament.id
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            deletingTournamentId ===
                            tournament.id
                              ? 0.6
                              : 1
                        }}
                      >
                        {
                          deletingTournamentId ===
                          tournament.id
                            ? 'Deleting...'
                            : 'Delete Tournament'
                        }
                      </button>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default Dashboard
