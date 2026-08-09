import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import StandingsSection from '../components/StandingsSection'
import GroupsSection from '../components/GroupsSection'
import BracketSection from '../components/BracketSection'
import PublicFixturesSection from '../components/PublicFixturesSection'
import ParticipantAvatar from '../components/ParticipantAvatar'

import './PublicTournamentPage.css'


const FORMAT_NAMES = {
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


function PublicTournamentPage({
  slug,
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
    groups,
    setGroups
  ] = useState([])

  const [
    groupMembers,
    setGroupMembers
  ] = useState([])

  const [
    matches,
    setMatches
  ] = useState([])

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState('')

  const [
    activePage,
    setActivePage
  ] = useState(
    'overview'
  )


  const loadTournament =
    useCallback(
      async () => {
        try {
          setError('')


          const {
            data:
              tournamentData,
            error:
              tournamentError
          } = await supabase
            .from('tournaments')
            .select('*')
            .eq(
              'slug',
              slug
            )
            .eq(
              'is_public',
              true
            )
            .single()


          if (
            tournamentError ||
            !tournamentData
          ) {
            throw new Error(
              'This tournament is unavailable or has not been published.'
            )
          }


          const tournamentId =
            tournamentData.id


          const [
            playerResult,
            teamResult,
            groupResult,
            memberResult,
            matchResult
          ] = await Promise.all([

            supabase
              .from(
                'tournament_players'
              )
              .select(`
                id,
                tournament_id,
                master_player_id,
                name,
                image_url,
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
              .select('*')
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
                'tournament_groups'
              )
              .select('*')
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
              .from(
                'tournament_group_members'
              )
              .select('*')
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
              .select('*')
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
          ])


          if (
            playerResult.error
          ) {
            throw playerResult.error
          }

          if (
            teamResult.error
          ) {
            throw teamResult.error
          }

          if (
            groupResult.error
          ) {
            throw groupResult.error
          }

          if (
            memberResult.error
          ) {
            throw memberResult.error
          }

          if (
            matchResult.error
          ) {
            throw matchResult.error
          }


          setTournament(
            tournamentData
          )

          setPlayers(
            playerResult.data ||
            []
          )

          setTeams(
            teamResult.data ||
            []
          )

          setGroups(
            groupResult.data ||
            []
          )

          setGroupMembers(
            memberResult.data ||
            []
          )

          setMatches(
            matchResult.data ||
            []
          )
        } catch (loadError) {
          setError(
            loadError.message ||
            'Unable to load tournament.'
          )
        } finally {
          setLoading(false)
        }
      },
      [slug]
    )


  useEffect(
    () => {
      loadTournament()
    },
    [loadTournament]
  )


  useEffect(
    () => {
      if (
        !tournament?.id
      ) {
        return undefined
      }


      const channel =
        supabase
          .channel(
            `public-tournament-${tournament.id}`
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'matches',
              filter:
                `tournament_id=eq.${tournament.id}`
            },
            () => {
              window.setTimeout(
                () => {
                  loadTournament()
                },
                250
              )
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
      tournament?.id,
      loadTournament
    ]
  )


  const individualPlayers =
    useMemo(
      () =>
        players.filter(
          (player) =>
            !player.team_id
        ),
      [players]
    )


  const participantCount =
    tournament
      ?.participant_type ===
      'team'
      ? teams.length
      : individualPlayers.length


  const completedMatches =
    matches.filter(
      (match) =>
        match.status ===
        'completed'
    ).length


  const progress =
    matches.length > 0
      ? Math.round(
          (
            completedMatches /
            matches.length
          )
          *
          100
        )
      : 0


  function championData() {
    if (!tournament) {
      return null
    }


    if (
      tournament
        .participant_type ===
      'team'
    ) {
      const team =
        teams.find(
          (item) =>
            item.id ===
            tournament
              .champion_team_id
        )


      if (!team) {
        return null
      }


      const images =
        players
          .filter(
            (player) =>
              player.team_id ===
                team.id
              &&
              player.image_url
          )
          .map(
            (player) =>
              player.image_url
          )


      return {
        name:
          team.name,

        images
      }
    }


    const player =
      players.find(
        (item) =>
          item.id ===
          tournament
            .champion_player_id
      )


    if (!player) {
      return null
    }


    return {
      name:
        player.name,

      images:
        player.image_url
          ? [
              player.image_url
            ]
          : []
    }
  }


  const champion =
    championData()


  if (loading) {
    return (
      <div className="public-tournament-loading">
        Loading Tournament...
      </div>
    )
  }


  if (
    error ||
    !tournament
  ) {
    return (
      <main className="public-tournament-unavailable">

        <div>
          <span>
            eFootball Tournament Hub
          </span>

          <h1>
            Tournament Unavailable.
          </h1>

          <p>
            {
              error ||
              'This tournament cannot be viewed.'
            }
          </p>
        </div>

      </main>
    )
  }


  return (
    <main className="public-tournament-page">

      <div className="public-tournament-shell">


        <header className="public-topbar">

          {onBack && (
            <button
              type="button"
              className="public-back-home"
              onClick={onBack}
            >
              ← Back to Tournaments
            </button>
          )}


          <div className="public-brand">

            <span className="public-brand-mark">
              EF
            </span>

            <div>
              <strong>
                Tournament Hub
              </strong>

              <span>
                Live Competition
              </span>
            </div>

          </div>


          <span
            className={
              tournament.status ===
              'completed'
                ? 'public-live-status completed'
                : 'public-live-status'
            }
          >
            <i />

            {
              tournament.status ===
              'completed'
                ? 'Completed'
                : 'Live'
            }
          </span>

        </header>


        <section className="public-tournament-hero">

          <div className="public-hero-main">

            {tournament.logo_url ? (
              <img
                className="public-tournament-logo"
                src={
                  tournament.logo_url
                }
                alt=""
              />
            ) : (
              <div className="public-tournament-logo fallback">
                🏆
              </div>
            )}


            <div>

              <span className="public-format">
                {
                  FORMAT_NAMES[
                    tournament.format
                  ]
                  ||
                  tournament.format
                }
              </span>


              <h1>
                {tournament.name}
              </h1>


              <div className="public-hero-meta">

                {tournament.season && (
                  <span>
                    {
                      tournament.season
                    }
                  </span>
                )}

                <span>
                  {
                    tournament
                      .participant_type ===
                    'team'
                      ? '2v2 Teams'
                      : '1v1 Players'
                  }
                </span>

                <span>
                  {
                    participantCount
                  }
                  {' '}
                  Participants
                </span>

              </div>

            </div>

          </div>


          {champion && (
            <div className="public-champion-chip">

              <ParticipantAvatar
                name={
                  champion.name
                }
                imageUrls={
                  champion.images
                }
                size="md"
              />

              <div>
                <span>
                  Champion
                </span>

                <strong>
                  {
                    champion.name
                  }
                </strong>
              </div>

            </div>
          )}

        </section>


        <nav className="public-tournament-nav">

          <PublicNavButton
            active={
              activePage ===
              'overview'
            }
            onClick={() =>
              setActivePage(
                'overview'
              )
            }
          >
            Overview
          </PublicNavButton>


          <PublicNavButton
            active={
              activePage ===
              'fixtures'
            }
            onClick={() =>
              setActivePage(
                'fixtures'
              )
            }
          >
            Fixtures
          </PublicNavButton>


          <PublicNavButton
            active={
              activePage ===
              'standings'
            }
            onClick={() =>
              setActivePage(
                'standings'
              )
            }
          >
            Standings
          </PublicNavButton>


          {groups.length > 0 && (
            <PublicNavButton
              active={
                activePage ===
                'groups'
              }
              onClick={() =>
                setActivePage(
                  'groups'
                )
              }
            >
              Groups
            </PublicNavButton>
          )}


          <PublicNavButton
            active={
              activePage ===
              'bracket'
            }
            onClick={() =>
              setActivePage(
                'bracket'
              )
            }
          >
            Bracket
          </PublicNavButton>

        </nav>


        <div className="public-page-content">

          {activePage ===
            'overview' && (
            <PublicOverview
              tournament={
                tournament
              }
              participantCount={
                participantCount
              }
              matches={
                matches
              }
              completedMatches={
                completedMatches
              }
              progress={
                progress
              }
              champion={
                champion
              }
            />
          )}


          {activePage ===
            'fixtures' && (
            <PublicFixturesSection
              tournament={
                tournament
              }
              players={
                players
              }
              teams={
                teams
              }
              groups={
                groups
              }
              matches={
                matches
              }
            />
          )}


          {activePage ===
            'standings' && (
            <StandingsSection
              tournament={
                tournament
              }
              players={
                players
              }
              teams={
                teams
              }
              groups={
                groups
              }
              groupMembers={
                groupMembers
              }
              matches={
                matches
              }
            />
          )}


          {activePage ===
            'groups' && (
            <div className="public-readonly">

              <GroupsSection
                tournament={
                  tournament
                }
                players={
                  players
                }
                teams={
                  teams
                }
                groups={
                  groups
                }
                groupMembers={
                  groupMembers
                }
                matches={
                  matches
                }
              />

            </div>
          )}


          {activePage ===
            'bracket' && (
            <div className="public-readonly-bracket">

              <BracketSection
                tournament={
                  tournament
                }
                matches={
                  matches
                }
                players={
                  players
                }
                teams={
                  teams
                }
                groups={
                  groups
                }
                groupMembers={
                  groupMembers
                }
              />

            </div>
          )}

        </div>


        <footer className="public-tournament-footer">

          <span>
            eFootball Tournament Hub.
          </span>

          <span>
            Live tournament data.
          </span>

        </footer>

      </div>

    </main>
  )
}


function PublicNavButton({
  active,
  onClick,
  children
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'public-nav-button active'
          : 'public-nav-button'
      }
      onClick={onClick}
    >
      {children}
    </button>
  )
}


function PublicOverview({
  tournament,
  participantCount,
  matches,
  completedMatches,
  progress,
  champion
}) {
  return (
    <section className="public-overview">

      <div className="public-overview-stats">

        <PublicMetric
          label="Participants"
          value={
            participantCount
          }
        />

        <PublicMetric
          label="Matches"
          value={
            matches.length
          }
        />

        <PublicMetric
          label="Completed"
          value={
            completedMatches
          }
        />

        <PublicMetric
          label="Progress"
          value={
            `${progress}%`
          }
        />

      </div>


      <div className="public-overview-grid">

        <article className="public-overview-card">

          <p className="eyebrow">
            TOURNAMENT
          </p>

          <h2>
            About This Competition.
          </h2>

          <p className="public-description">
            {
              tournament.description
              ||
              'Follow fixtures, results, standings, qualification, and knockout progression live.'
            }
          </p>


          <div className="public-progress-track">

            <span
              style={{
                width:
                  `${progress}%`
              }}
            />

          </div>


          <div className="public-progress-copy">

            <span>
              Tournament Progress
            </span>

            <strong>
              {progress}%
            </strong>

          </div>

        </article>


        <article className="public-overview-card public-champion-card">

          {champion ? (
            <>

              <span className="public-champion-trophy">
                🏆
              </span>

              <ParticipantAvatar
                name={
                  champion.name
                }
                imageUrls={
                  champion.images
                }
                size="lg"
              />

              <span>
                Tournament Champion
              </span>

              <strong>
                {
                  champion.name
                }
              </strong>

            </>
          ) : (
            <>

              <span className="public-champion-trophy pending">
                🏆
              </span>

              <span>
                Tournament Champion
              </span>

              <strong>
                To Be Decided.
              </strong>

              <p>
                Follow the bracket to see who claims the trophy.
              </p>

            </>
          )}

        </article>

      </div>

    </section>
  )
}


function PublicMetric({
  label,
  value
}) {
  return (
    <div className="public-metric">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  )
}


export default PublicTournamentPage
