import { supabase } from '../lib/supabase'

function Dashboard({ user }) {
  async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">ORGANIZER DASHBOARD</p>

          <h1>
            eFootball Tournament Hub
          </h1>
        </div>

        <div className="user-area">
          <span>{user.email}</span>

          <button
            type="button"
            onClick={logout}
            className="logout-button"
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
            Welcome to your dashboard.
          </h2>

          <p>
            Your authentication system is connected to Supabase successfully.
          </p>
        </div>

        <button className="primary-button dashboard-action">
          Create Tournament
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Active Tournaments</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Total Players</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Matches Played</span>
          <strong>0</strong>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
