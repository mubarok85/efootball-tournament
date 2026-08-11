import {
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import Dashboard from './Dashboard'
import PlayersPage from './PlayersPage'
import AdminManagementPage from './AdminManagementPage'

import './MainApp.css'


function MainApp({
  user,
  profile
}) {
  const [
    activePage,
    setActivePage
  ] = useState(
    'tournaments'
  )


  async function logout() {
    await supabase
      .auth
      .signOut()
  }


  const isSuperAdmin =
    profile?.role ===
    'super_admin'


  return (
    <div className="main-app">

      <header className="main-app-header">

        <div className="main-app-brand">

          <span>
            PL
          </span>

          <div>
            <strong>
              PESLOVER
            </strong>

            <small>
              Admin Portal
            </small>
          </div>

        </div>


        <nav className="main-app-nav">

          <button
            type="button"
            className={
              activePage ===
              'tournaments'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage(
                'tournaments'
              )
            }
          >
            Tournaments
          </button>


          <button
            type="button"
            className={
              activePage ===
              'players'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage(
                'players'
              )
            }
          >
            Players
          </button>


          {isSuperAdmin && (
            <button
              type="button"
              className={
                activePage ===
                'admins'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActivePage(
                  'admins'
                )
              }
            >
              Admins
            </button>
          )}

        </nav>


        <div className="main-app-account">

          <div>
            <span>
              {
                profile
                  ?.full_name
                ||
                user.email
              }
            </span>

            <strong>
              {
                isSuperAdmin
                  ? 'Super Admin'
                  : 'Admin'
              }
            </strong>
          </div>


          <button
            type="button"
            onClick={
              logout
            }
          >
            Logout
          </button>

        </div>

      </header>


      <main className="main-app-content">

        {activePage ===
          'tournaments' && (
          <Dashboard
            user={user}
            profile={profile}
          />
        )}


        {activePage ===
          'players' && (
          <PlayersPage
            user={user}
          />
        )}


        {activePage ===
          'admins'
          &&
          isSuperAdmin && (
          <AdminManagementPage
            user={user}
          />
        )}

      </main>

    </div>
  )
}


export default MainApp
