import {
  useCallback,
  useEffect,
  useState
} from 'react'

import { supabase } from '../lib/supabase'
import CreateTournamentWizard from '../components/CreateTournamentWizard'
import TournamentDetails from './TournamentDetails'

import './Dashboard.css'

function Dashboard({ user }) {
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
        const {
          data,
          error: tournamentError
        } = await supabase
          .from('tournaments')
          .select('*')
          .eq(
            'owner_id',
            user.id
          )
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

        let totalPlayers = 0
        let matchesPlayed = 0

        if (
          tournamentIds.length > 0
        ) {
          const [
            playerResult,
            matchResult
          ] = await Promise.all([
            supabase
              .from(
                'tournament_players'
              )
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
              ),

            supabase
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
          ])

          if (playerResult.error) {
            throw playerResult.error
          }

          if (matchResult.error) {
            throw matchResult.error
          }

          totalPlayers =
            playerResult.count || 0

          matchesPlayed =
            matchResult.count || 0
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
    }, [user.id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  async function logout() {
    await supabase.auth.signOut()
  }

  async function handleTournamentCreated() {
    setShowWizard(false)
    await loadDashboard()
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

        <div className="user-area">
          <span>
            {user.email}
          </span>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
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

                  <button
                    type="button"
                    className="primary-button"
                    style={{
                      marginTop: '18px'
                    }}
                    onClick={() =>
                      setSelectedTournamentId(
                        tournament.id
                      )
                    }
                  >
                    Manage Tournament
                  </button>
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
