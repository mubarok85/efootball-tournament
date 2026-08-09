import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import PublicTournamentPage from './PublicTournamentPage'

import './PublicApp.css'


const FORMAT_NAMES = {
  league:
    'League',

  multi_group_league:
    'Group League',

  knockout:
    'Knockout',

  league_final:
    'League + Final',

  league_knockout:
    'League + Knockout',

  multi_group_tournament:
    'Group + Knockout'
}


function PublicApp() {
  const [
    tournaments,
    setTournaments
  ] = useState([])

  const [
    matchStats,
    setMatchStats
  ] = useState({})

  const [
    selectedSlug,
    setSelectedSlug
  ] = useState(null)

  const [
    view,
    setView
  ] = useState('home')

  const [
    search,
    setSearch
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(true)


  const loadPublicData =
    useCallback(
      async () => {
        const {
          data,
          error
        } =
          await supabase
            .from('tournaments')
            .select('*')
            .eq(
              'is_public',
              true
            )
            .order(
              'published_at',
              {
                ascending: false
              }
            )


        if (error) {
          console.error(error)

          setLoading(false)

          return
        }


        const tournamentRows =
          data || []


        setTournaments(
          tournamentRows
        )


        if (
          tournamentRows.length ===
          0
        ) {
          setMatchStats({})
          setLoading(false)

          return
        }


        const ids =
          tournamentRows.map(
            (tournament) =>
              tournament.id
          )


        const {
          data:
            matchRows
        } =
          await supabase
            .from('matches')
            .select(`
              tournament_id,
              status
            `)
            .in(
              'tournament_id',
              ids
            )


        const stats = {}


        ;(
          matchRows || []
        ).forEach(
          (match) => {
            if (
              !stats[
                match.tournament_id
              ]
            ) {
              stats[
                match.tournament_id
              ] = {
                total: 0,
                completed: 0
              }
            }


            stats[
              match.tournament_id
            ].total += 1


            if (
              match.status ===
              'completed'
            ) {
              stats[
                match.tournament_id
              ].completed += 1
            }
          }
        )


        setMatchStats(
          stats
        )

        setLoading(false)
      },
      []
    )


  useEffect(
    () => {
      loadPublicData()
    },
    [loadPublicData]
  )


  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()


        if (!query) {
          return tournaments
        }


        return tournaments.filter(
          (tournament) =>
            tournament.name
              .toLowerCase()
              .includes(
                query
              )
            ||
            tournament
              .season
              ?.toLowerCase()
              .includes(
                query
              )
        )
      },
      [
        search,
        tournaments
      ]
    )


  const activeTournaments =
    tournaments.filter(
      (tournament) =>
        tournament.status !==
        'completed'
    )


  if (selectedSlug) {
    return (
      <PublicTournamentPage
        slug={
          selectedSlug
        }
        onBack={() =>
          setSelectedSlug(
            null
          )
        }
      />
    )
  }


  return (
    <main className="peslover-public">

      <header className="peslover-public-header">

        <button
          type="button"
          className="peslover-brand"
          onClick={() =>
            setView(
              'home'
            )
          }
        >
          <span>
            PL
          </span>

          <div>
            <strong>
              PESLOVER
            </strong>

            <small>
              eFootball Tournament Hub
            </small>
          </div>
        </button>


        <nav>

          <button
            type="button"
            className={
              view ===
              'home'
                ? 'active'
                : ''
            }
            onClick={() =>
              setView(
                'home'
              )
            }
          >
            Home
          </button>


          <button
            type="button"
            className={
              view ===
              'tournaments'
                ? 'active'
                : ''
            }
            onClick={() =>
              setView(
                'tournaments'
              )
            }
          >
            Tournaments
          </button>

        </nav>

      </header>


      {view ===
        'home' && (
        <>

          <section className="peslover-hero">

            <div className="peslover-hero-copy">

              <span>
                eFOOTBALL COMPETITION
              </span>

              <h1>
                Follow Every Match.
                <br />
                Witness Every Champion.
              </h1>

              <p>
                Live fixtures, standings, group qualification and premium knockout brackets in one tournament experience.
              </p>


              <button
                type="button"
                onClick={() =>
                  setView(
                    'tournaments'
                  )
                }
              >
                Explore Tournaments
              </button>

            </div>


            <div className="peslover-hero-trophy">

              <span>
                🏆
              </span>

              <strong>
                Road to Champion
              </strong>

              <small>
                Live Tournament Experience
              </small>

            </div>

          </section>


          <section className="peslover-public-section">

            <div className="peslover-section-heading">

              <div>
                <span>
                  LIVE COMPETITION
                </span>

                <h2>
                  Featured Tournaments
                </h2>
              </div>


              <button
                type="button"
                onClick={() =>
                  setView(
                    'tournaments'
                  )
                }
              >
                View All
              </button>

            </div>


            <TournamentGrid
              tournaments={
                activeTournaments
                  .slice(
                    0,
                    6
                  )
              }
              matchStats={
                matchStats
              }
              onOpen={
                setSelectedSlug
              }
              loading={
                loading
              }
            />

          </section>

        </>
      )}


      {view ===
        'tournaments' && (
        <section className="peslover-public-section tournaments-view">

          <div className="peslover-directory-header">

            <div>
              <span>
                TOURNAMENT DIRECTORY
              </span>

              <h1>
                Public Tournaments
              </h1>

              <p>
                Browse live and completed PESLOVER competitions.
              </p>
            </div>


            <input
              type="search"
              value={
                search
              }
              onChange={
                (event) =>
                  setSearch(
                    event.target
                      .value
                  )
              }
              placeholder="Search tournament..."
            />

          </div>


          <TournamentGrid
            tournaments={
              filtered
            }
            matchStats={
              matchStats
            }
            onOpen={
              setSelectedSlug
            }
            loading={
              loading
            }
          />

        </section>
      )}


      <footer className="peslover-public-footer">

        <strong>
          PESLOVER
        </strong>

        <span>
          eFootball Tournament Hub
        </span>

      </footer>

    </main>
  )
}


function TournamentGrid({
  tournaments,
  matchStats,
  onOpen,
  loading
}) {
  if (loading) {
    return (
      <div className="public-tournament-loading-state">
        Loading Tournaments...
      </div>
    )
  }


  if (
    tournaments.length ===
    0
  ) {
    return (
      <div className="public-tournament-empty-state">
        No published tournaments are available yet.
      </div>
    )
  }


  return (
    <div className="peslover-tournament-grid">

      {tournaments.map(
        (tournament) => {
          const stats =
            matchStats[
              tournament.id
            ]
            ||
            {
              total: 0,
              completed: 0
            }


          const progress =
            stats.total
              ? Math.round(
                  (
                    stats.completed /
                    stats.total
                  )
                  *
                  100
                )
              : 0


          return (
            <article
              key={
                tournament.id
              }
              className="peslover-tournament-card"
            >

              <div className="tournament-card-cover">

                {tournament
                  .logo_url ? (
                  <img
                    src={
                      tournament
                        .logo_url
                    }
                    alt=""
                  />
                ) : (
                  <span>
                    🏆
                  </span>
                )}


                <div
                  className={
                    tournament
                      .status ===
                    'completed'
                      ? 'tournament-live-chip completed'
                      : 'tournament-live-chip'
                  }
                >
                  {
                    tournament
                      .status ===
                    'completed'
                      ? 'Completed'
                      : 'Live'
                  }
                </div>

              </div>


              <div className="tournament-card-body">

                <span className="tournament-card-format">
                  {
                    FORMAT_NAMES[
                      tournament
                        .format
                    ]
                    ||
                    tournament
                      .format
                  }
                </span>


                <h3>
                  {
                    tournament
                      .name
                  }
                </h3>


                {tournament
                  .season && (
                  <p>
                    {
                      tournament
                        .season
                    }
                  </p>
                )}


                <div className="tournament-progress-bar">

                  <span
                    style={{
                      width:
                        `${progress}%`
                    }}
                  />

                </div>


                <div className="tournament-card-stats">

                  <span>
                    {
                      stats.completed
                    }
                    {' / '}
                    {
                      stats.total
                    }
                    {' '}
                    Matches
                  </span>

                  <strong>
                    {
                      progress
                    }%
                  </strong>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    onOpen(
                      tournament
                        .slug
                    )
                  }
                >
                  View Tournament
                </button>

              </div>

            </article>
          )
        }
      )}

    </div>
  )
}


export default PublicApp
