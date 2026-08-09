import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

function Dashboard({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({
    activeTournaments: 0,
    totalPlayers: 0,
    matchesPlayed: 0
  })

  const [form, setForm] = useState({
    name: '',
    game: 'eFootball',
    description: '',
    format: 'round_robin'
  })

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: tournamentData, error: tournamentError } =
        await supabase
          .from('tournaments')
          .select(`
            id,
            owner_id,
            name,
            slug,
            game,
            description,
            format,
            status,
            created_at
          `)
          .eq('owner_id', user.id)
          .order('created_at', {
            ascending: false
          })

      if (tournamentError) {
        throw tournamentError
      }

      const tournamentsList = tournamentData || []

      setTournaments(tournamentsList)

      const tournamentIds =
        tournamentsList.map(
          (tournament) => tournament.id
        )

      let totalPlayers = 0
      let matchesPlayed = 0

      if (tournamentIds.length > 0) {
        const [
          playersResult,
          matchesResult
        ] = await Promise.all([
          supabase
            .from('tournament_players')
            .select('id', {
              count: 'exact',
              head: true
            })
            .in(
              'tournament_id',
              tournamentIds
            ),

          supabase
            .from('matches')
            .select('id', {
              count: 'exact',
              head: true
            })
            .in(
              'tournament_id',
              tournamentIds
            )
            .eq(
              'status',
              'completed'
            )
        ])

        if (playersResult.error) {
          throw playersResult.error
        }

        if (matchesResult.error) {
          throw matchesResult.error
        }

        totalPlayers =
          playersResult.count || 0

        matchesPlayed =
          matchesResult.count || 0
      }

      setStats({
        activeTournaments:
          tournamentsList.filter(
            (tournament) =>
              tournament.status === 'active'
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

  function handleChange(event) {
    const {
      name,
      value
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  function createSlug(name) {
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return `${cleanName}-${Date.now().toString(36)}`
  }

  async function createTournament(event) {
    event.preventDefault()

    setCreating(true)
    setError('')

    try {
      const name = form.name.trim()

      if (!name) {
        throw new Error(
          'Tournament name is required.'
        )
      }

      const { error: createError } =
        await supabase
          .from('tournaments')
          .insert({
            owner_id: user.id,
            name,
            slug: createSlug(name),
            game:
              form.game.trim() ||
              'eFootball',
            description:
              form.description.trim() ||
              null,
            format: form.format,
            status: 'draft'
          })

      if (createError) {
        throw createError
      }

      setForm({
        name: '',
        game: 'eFootball',
        description: '',
        format: 'round_robin'
      })

      setShowCreateForm(false)

      await loadDashboard()
    } catch (createError) {
      console.error(createError)

      setError(
        createError.message ||
          'Unable to create tournament.'
      )
    } finally {
      setCreating(false)
    }
  }

  async function logout() {
    const { error: logoutError } =
      await supabase.auth.signOut()

    if (logoutError) {
      console.error(logoutError)
      setError(logoutError.message)
    }
  }

  function formatTournamentFormat(format) {
    const formats = {
      round_robin: 'Round Robin',
      knockout: 'Knockout',
      groups_knockout:
        'Groups + Knockout'
    }

    return formats[format] || format
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
            Manage your competitions.
          </h2>

          <p>
            Create tournaments, manage
            players, generate fixtures,
            and track results.
          </p>
        </div>

        <button
          type="button"
          className="primary-button dashboard-action"
          onClick={() =>
            setShowCreateForm(
              (current) => !current
            )
          }
        >
          {showCreateForm
            ? 'Close Form'
            : '+ Create Tournament'}
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

      {showCreateForm && (
        <section className="create-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                NEW COMPETITION
              </p>

              <h2>
                Create Tournament
              </h2>
            </div>
          </div>

          <form
            className="create-form"
            onSubmit={createTournament}
          >
            <div className="form-group">
              <label>
                Tournament Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Weekend Championship"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Game
              </label>

              <input
                type="text"
                name="game"
                value={form.game}
                onChange={handleChange}
                placeholder="eFootball"
                required
              />
            </div>

            <div className="form-group form-full">
              <label>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Add a short tournament description."
                rows="4"
              />
            </div>

            <div className="form-group form-full">
              <label>
                Tournament Format
              </label>

              <select
                name="format"
                value={form.format}
                onChange={handleChange}
              >
                <option value="round_robin">
                  Round Robin
                </option>

                <option value="knockout">
                  Knockout
                </option>

                <option value="groups_knockout">
                  Groups + Knockout
                </option>
              </select>
            </div>

            <div className="form-actions form-full">
              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowCreateForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button create-button"
                disabled={creating}
              >
                {creating
                  ? 'Creating...'
                  : 'Create Tournament'}
              </button>
            </div>
          </form>
        </section>
      )}

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
              No tournaments yet.
            </h3>

            <p>
              Create your first tournament
              to start managing players,
              fixtures, and results.
            </p>

            <button
              type="button"
              className="primary-button empty-button"
              onClick={() =>
                setShowCreateForm(true)
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
                  key={tournament.id}
                  className="tournament-card"
                >
                  <div className="tournament-card-top">
                    <div className="game-badge">
                      {tournament.game}
                    </div>

                    <span
                      className={`status-badge status-${tournament.status}`}
                    >
                      {tournament.status}
                    </span>
                  </div>

                  <h3>
                    {tournament.name}
                  </h3>

                  <p className="tournament-description">
                    {tournament.description ||
                      'No description added.'}
                  </p>

                  <div className="tournament-meta">
                    <div>
                      <span>
                        Format
                      </span>

                      <strong>
                        {formatTournamentFormat(
                          tournament.format
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Created
                      </span>

                      <strong>
                        {new Date(
                          tournament.created_at
                        ).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>

                  <div className="tournament-card-footer">
                    <span>
                      Tournament ID
                    </span>

                    <code>
                      {tournament.id
                        .slice(0, 8)}
                    </code>
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
