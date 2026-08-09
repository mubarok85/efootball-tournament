import {
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import Dashboard from './Dashboard'
import PlayersPage from './PlayersPage'

import './MainApp.css'


function MainApp({
  user
}) {
  const [
    page,
    setPage
  ] = useState(
    'tournaments'
  )


  async function logout() {
    await supabase
      .auth
      .signOut()
  }


  return (
    <div className="main-app-shell">

      <header className="main-app-header">

        <div className="main-app-brand">

          <div className="main-app-logo">
            EF
          </div>

          <strong>
            eFootball Tournament Hub
          </strong>

        </div>


        <nav className="main-app-navigation">

          <button
            type="button"
            className={
              page ===
              'tournaments'
                ? 'active'
                : ''
            }
            onClick={() =>
              setPage(
                'tournaments'
              )
            }
          >
            Tournaments
          </button>


          <button
            type="button"
            className={
              page ===
              'players'
                ? 'active'
                : ''
            }
            onClick={() =>
              setPage(
                'players'
              )
            }
          >
            Players
          </button>

        </nav>


        <button
          type="button"
          className="main-app-logout"
          onClick={logout}
        >
          Logout
        </button>

      </header>


      {page ===
        'tournaments' && (
        <Dashboard
          user={user}
        />
      )}


      {page ===
        'players' && (
        <PlayersPage
          user={user}
        />
      )}

    </div>
  )
}


export default MainApp
