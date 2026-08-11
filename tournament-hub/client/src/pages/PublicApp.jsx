import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import PublicTournamentPage from './PublicTournamentPage'
import ParticipantAvatar from '../components/ParticipantAvatar'

import GlobalRankingsSection from '../components/GlobalRankingsSection'
import PlayerAccountPortal from '../components/PlayerAccountPortal'
import PlayerHomeExperience from '../components/PlayerHomeExperience'
import PlayerNavbarLinks from '../components/PlayerNavbarLinks'

import './PublicApp.css'


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


const STAGE_NAMES = {
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
    'Bronze Final',

  final:
    'Final'
}


function PublicApp() {
  const [
    tournaments,
    setTournaments
  ] = useState([])

  const [
    matches,
    setMatches
  ] = useState([])

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
    loading,
    setLoading
  ] = useState(true)

  const [
    selectedSlug,
    setSelectedSlug
  ] = useState(null)

  const [
    search,
    setSearch
  ] = useState('')

  const [
    selectedPlayer,
    setSelectedPlayer
  ] = useState(null)


  const homeRef =
    useRef(null)

  const tournamentsRef =
    useRef(null)

  const playersRef =
    useRef(null)

  const teamsRef =
    useRef(null)


  const loadPublicData =
    useCallback(
      async () => {
        setLoading(true)


        const {
          data:
            tournamentRows,
          error:
            tournamentError
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
                ascending:
                  false
              }
            )


        if (
          tournamentError
        ) {
          console.error(
            tournamentError
          )

          setLoading(false)

          return
        }


        const publicTournaments =
          tournamentRows || []


        setTournaments(
          publicTournaments
        )


        if (
          publicTournaments.length ===
          0
        ) {
          setMatches([])
          setPlayers([])
          setTeams([])
          setGroups([])
          setLoading(false)

          return
        }


        const tournamentIds =
          publicTournaments.map(
            (tournament) =>
              tournament.id
          )


        const [
          matchResult,
          playerResult,
          teamResult,
          groupResult
        ] =
          await Promise.all([

            supabase
              .from('matches')
              .select(`
                id,
                tournament_id,
                group_id,
                stage,
                round_number,
                match_order,
                player1_id,
                player2_id,
                team1_id,
                team2_id,
                player1_score,
                player2_score,
                status,
                completed_at,
                created_at
              `)
              .in(
                'tournament_id',
                tournamentIds
              ),

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
              .in(
                'tournament_id',
                tournamentIds
              ),

            supabase
              .from(
                'tournament_teams'
              )
              .select('*')
              .in(
                'tournament_id',
                tournamentIds
              ),

            supabase
              .from(
                'tournament_groups'
              )
              .select('*')
              .in(
                'tournament_id',
                tournamentIds
              )
          ])


        if (
          matchResult.error
        ) {
          console.error(
            matchResult.error
          )
        }

        if (
          playerResult.error
        ) {
          console.error(
            playerResult.error
          )
        }

        if (
          teamResult.error
        ) {
          console.error(
            teamResult.error
          )
        }

        if (
          groupResult.error
        ) {
          console.error(
            groupResult.error
          )
        }


        setMatches(
          matchResult.data ||
          []
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


  useEffect(
    () => {
      const matchChannel =
        supabase
          .channel(
            'public-home-matches'
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'matches'
            },
            () => {
              window.setTimeout(
                loadPublicData,
                250
              )
            }
          )
          .subscribe()


      const tournamentChannel =
        supabase
          .channel(
            'public-home-tournaments'
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tournaments'
            },
            () => {
              window.setTimeout(
                loadPublicData,
                250
              )
            }
          )
          .subscribe()


      return () => {
        supabase
          .removeChannel(
            matchChannel
          )

        supabase
          .removeChannel(
            tournamentChannel
          )
      }
    },
    [loadPublicData]
  )


  const tournamentMap =
    useMemo(
      () =>
        new Map(
          tournaments.map(
            (tournament) => [
              tournament.id,
              tournament
            ]
          )
        ),
      [tournaments]
    )


  const playerMap =
    useMemo(
      () =>
        new Map(
          players.map(
            (player) => [
              player.id,
              player
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
              team
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
              group
            ]
          )
        ),
      [groups]
    )


  const matchStats =
    useMemo(
      () => {
        const result = {}


        tournaments.forEach(
          (tournament) => {
            result[
              tournament.id
            ] = {
              total: 0,
              completed: 0
            }
          }
        )


        matches.forEach(
          (match) => {
            if (
              !result[
                match.tournament_id
              ]
            ) {
              return
            }


            result[
              match.tournament_id
            ].total += 1


            if (
              match.status ===
              'completed'
            ) {
              result[
                match.tournament_id
              ].completed += 1
            }
          }
        )


        return result
      },
      [
        tournaments,
        matches
      ]
    )


  const participantCounts =
    useMemo(
      () => {
        const result = {}


        tournaments.forEach(
          (tournament) => {
            if (
              tournament
                .participant_type ===
              'team'
            ) {
              result[
                tournament.id
              ] =
                teams.filter(
                  (team) =>
                    team
                      .tournament_id ===
                    tournament.id
                ).length
            } else {
              result[
                tournament.id
              ] =
                players.filter(
                  (player) =>
                    player
                      .tournament_id ===
                      tournament.id
                    &&
                    !player.team_id
                ).length
            }
          }
        )


        return result
      },
      [
        tournaments,
        players,
        teams
      ]
    )


  const groupCounts =
    useMemo(
      () => {
        const result = {}


        groups.forEach(
          (group) => {
            result[
              group.tournament_id
            ] =
              (
                result[
                  group.tournament_id
                ]
                ||
                0
              )
              +
              1
          }
        )


        return result
      },
      [groups]
    )


  const playerStats =
    useMemo(
      () =>
        calculatePlayerStats({
          tournaments,
          players,
          matches
        }),
      [
        tournaments,
        players,
        matches
      ]
    )


  const teamStats =
    useMemo(
      () =>
        calculateTeamStats({
          tournaments,
          teams,
          matches
        }),
      [
        tournaments,
        teams,
        matches
      ]
    )


  const completedMatches =
    useMemo(
      () =>
        matches.filter(
          (match) =>
            match.status ===
            'completed'
        ),
      [matches]
    )


  const scheduledMatches =
    useMemo(
      () =>
        matches.filter(
          (match) =>
            match.status !==
            'completed'
        ),
      [matches]
    )


  const activeTournaments =
    useMemo(
      () =>
        tournaments.filter(
          (tournament) =>
            tournament.status !==
            'completed'
        ),
      [tournaments]
    )


  const completedTournaments =
    useMemo(
      () =>
        tournaments.filter(
          (tournament) =>
            tournament.status ===
            'completed'
        ),
      [tournaments]
    )


  const featuredTournament =
    activeTournaments[0]
    ||
    tournaments[0]
    ||
    null


  const highestScoringMatch =
    useMemo(
      () =>
        [...completedMatches]
          .sort(
            (a, b) =>
              totalScore(b)
              -
              totalScore(a)
          )[0]
        ||
        null,
      [completedMatches]
    )


  const biggestMarginMatch =
    useMemo(
      () =>
        [...completedMatches]
          .sort(
            (a, b) =>
              winningMargin(b)
              -
              winningMargin(a)
          )[0]
        ||
        null,
      [completedMatches]
    )


  const activeTournamentIds =
    useMemo(
      () =>
        new Set(
          activeTournaments.map(
            (tournament) =>
              tournament.id
          )
        ),
      [activeTournaments]
    )


  const activeGoals =
    useMemo(
      () =>
        completedMatches
          .filter(
            (match) =>
              activeTournamentIds.has(
                match.tournament_id
              )
          )
          .reduce(
            (
              total,
              match
            ) =>
              total
              +
              totalScore(
                match
              ),
            0
          ),
      [
        completedMatches,
        activeTournamentIds
      ]
    )


  const latestResults =
    useMemo(
      () =>
        [...completedMatches]
          .sort(
            (a, b) =>
              dateValue(b)
              -
              dateValue(a)
          )
          .slice(
            0,
            5
          ),
      [completedMatches]
    )


  const upcomingMatches =
    useMemo(
      () =>
        [...scheduledMatches]
          .sort(
            (a, b) => {
              if (
                a.round_number !==
                b.round_number
              ) {
                return (
                  (
                    a.round_number ||
                    0
                  )
                  -
                  (
                    b.round_number ||
                    0
                  )
                )
              }


              return (
                (
                  a.match_order ||
                  0
                )
                -
                (
                  b.match_order ||
                  0
                )
              )
            }
          )
          .slice(
            0,
            5
          ),
      [scheduledMatches]
    )


  const goldenBoot =
    [...playerStats]
      .sort(
        (a, b) =>
          b.goals -
          a.goals
      )[0]
    ||
    null


  const mostWins =
    [...playerStats]
      .sort(
        (a, b) =>
          b.wins -
          a.wins
      )[0]
    ||
    null


  const bestWinRate =
    [...playerStats]
      .filter(
        (player) =>
          player.matchesPlayed >=
          2
      )
      .sort(
        (a, b) =>
          b.winRate -
          a.winRate
      )[0]
    ||
    null


  const currentLeader =
    [...playerStats]
      .filter(
        (player) =>
          player.matchesPlayed >
          0
      )
      .sort(
        (a, b) =>
          b.points -
          a.points
          ||
          b.goalDifference -
          a.goalDifference
          ||
          b.goals -
          a.goals
      )[0]
    ||
    null


  const platformParticipants =
    useMemo(
      () => {
        const keys =
          new Set()


        players
          .filter(
            (player) =>
              !player.team_id
          )
          .forEach(
            (player) => {
              keys.add(
                player.master_player_id
                ||
                player.name
                  .trim()
                  .toLowerCase()
              )
            }
          )


        teams.forEach(
          (team) => {
            keys.add(
              `team-${team.id}`
            )
          }
        )


        return keys.size
      },
      [
        players,
        teams
      ]
    )


  const filteredTournaments =
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
              ?.toLowerCase()
              .includes(query)
            ||
            tournament.season
              ?.toLowerCase()
              .includes(query)
        )
      },
      [
        tournaments,
        search
      ]
    )


  const filteredPlayers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()


        if (!query) {
          return playerStats
        }


        return playerStats.filter(
          (player) =>
            player.name
              .toLowerCase()
              .includes(query)
        )
      },
      [
        playerStats,
        search
      ]
    )


  const filteredTeams =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()


        if (!query) {
          return teamStats
        }


        return teamStats.filter(
          (team) =>
            team.name
              .toLowerCase()
              .includes(query)
        )
      },
      [
        teamStats,
        search
      ]
    )


  function scrollTo(
    section
  ) {
    const refs = {
      home:
        homeRef,

      tournaments:
        tournamentsRef,

      players:
        playersRef,

      teams:
        teamsRef
    }


    const target =
      refs[section]


    if (
      selectedSlug
    ) {
      setSelectedSlug(null)


      window.setTimeout(
        () => {
          target
            ?.current
            ?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start'
            })
        },
        80
      )

      return
    }


    target
      ?.current
      ?.scrollIntoView({
        behavior:
          'smooth',

        block:
          'start'
      })
  }


  function participantName(
    match,
    side
  ) {
    const tournament =
      tournamentMap.get(
        match.tournament_id
      )


    if (!tournament) {
      return 'TBD'
    }


    if (
      tournament
        .participant_type ===
      'team'
    ) {
      const id =
        side === 1
          ? match.team1_id
          : match.team2_id


      return (
        teamMap.get(id)
          ?.name
        ||
        'TBD'
      )
    }


    const id =
      side === 1
        ? match.player1_id
        : match.player2_id


    return (
      playerMap.get(id)
        ?.name
      ||
      'TBD'
    )
  }


  function matchContext(
    match
  ) {
    const tournament =
      tournamentMap.get(
        match.tournament_id
      )


    const pieces = [
      tournament?.name
    ]


    if (
      match.group_id
    ) {
      const group =
        groupMap.get(
          match.group_id
        )

      if (group?.name) {
        pieces.push(
          group.name
        )
      }
    }


    if (
      match.round_number
    ) {
      pieces.push(
        `Round ${match.round_number}`
      )
    }


    return pieces
      .filter(Boolean)
      .join(' · ')
  }


  function openTournament(
    slug
  ) {
    setSelectedSlug(
      slug
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  if (
    selectedSlug
  ) {
    return (
      <main className="peslover-public">

        <PublicNavbar
          onNavigate={
            scrollTo
          }
        />


        <div className="public-tournament-embedded">

          <PublicTournamentPage
            slug={
              selectedSlug
            }
            onBack={() =>
              scrollTo(
                'tournaments'
              )
            }
          />

        </div>


        <PublicFooter />

      </main>
    )
  }


  return (
    <main className="peslover-public">

      <PublicNavbar
        onNavigate={
          scrollTo
        }
      />


      <section
        ref={homeRef}
        className="public-home-hero"
      >

        <div className="public-grid-background" />


        <div className="public-home-shell">

          <div className="public-hero-copy">

            <span className="public-hero-chip">
              ⚡ LIVE eFOOTBALL TOURNAMENTS
            </span>


            <h1>
              Where every
              {' '}
              <span>
                match
              </span>
              {' '}
              becomes a
              {' '}
              <strong>
                story.
              </strong>
            </h1>


            <p>
              Follow tournaments, live standings, qualification battles,
              knockout brackets, player performances and champions from
              one premium eFootball command center.
            </p>


            <div className="public-hero-actions">

              <button
                type="button"
                className="public-primary-button"
                onClick={() =>
                  scrollTo(
                    'tournaments'
                  )
                }
              >
                Browse Tournaments
                <span>
                  →
                </span>
              </button>


              <button
                type="button"
                className="public-secondary-button"
                onClick={() =>
                  scrollTo(
                    'players'
                  )
                }
              >
                View Players
              </button>

            </div>


            <label className="public-search-box">

              <span>
                ⌕
              </span>

              <input
                type="search"
                value={
                  search
                }
                onChange={
                  (event) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Search tournaments, players, teams..."
              />

            </label>

          </div>


          <div className="public-hero-side">

            <div className="public-hero-trophy">
              <span>
                ♛
              </span>

              <strong>
                PESLOVER
              </strong>

              <small>
                Road to Champion
              </small>
            </div>

          </div>

        </div>

      </section>


      <section className="public-dashboard-band">

        <div className="public-home-shell public-dashboard-grid">

          <LiveTournamentCard
            tournament={
              featuredTournament
            }
            matchStats={
              matchStats
            }
            participantCounts={
              participantCounts
            }
            groupCounts={
              groupCounts
            }
            onOpen={
              openTournament
            }
          />


          <div className="public-platform-metrics">

            <MetricCard
              icon="♜"
              label="Tournaments"
              value={
                tournaments.length
              }
            />

            <MetricCard
              icon="♙"
              label="Participants"
              value={
                platformParticipants
              }
            />

            <MetricCard
              icon="◎"
              label="Matches Played"
              value={
                completedMatches
                  .length
              }
            />

            <MetricCard
              icon="♨"
              label="Active"
              value={
                activeTournaments
                  .length
              }
            />

          </div>

        </div>

      </section>


      <section className="public-home-section">

        <div className="public-home-shell">

          <SectionHeading
            icon="↗"
            title="Tournament Highlights"
            subtitle="Live statistics across every published competition."
          />


          <div className="public-highlight-grid">

            <HighlightCard
              label="Highest Scoring Match"
              value={
                highestScoringMatch
                  ? `${totalScore(highestScoringMatch)} goals`
                  : '—'
              }
              detail={
                highestScoringMatch
                  ? `${participantName(highestScoringMatch, 1)} ${highestScoringMatch.player1_score}-${highestScoringMatch.player2_score} ${participantName(highestScoringMatch, 2)}`
                  : 'No completed matches yet'
              }
            />


            <HighlightCard
              label="Biggest Winning Margin"
              value={
                biggestMarginMatch
                  ? `${winningMargin(biggestMarginMatch)} goals`
                  : '—'
              }
              detail={
                biggestMarginMatch
                  ? `${participantName(biggestMarginMatch, 1)} vs ${participantName(biggestMarginMatch, 2)}`
                  : 'No completed matches yet'
              }
            />


            <HighlightCard
              label="Total Goals · Active"
              value={
                activeGoals
              }
              detail="Across active public tournaments"
            />


            <HighlightCard
              label="Completed Matches"
              value={
                completedMatches
                  .length
              }
              detail="Across the PESLOVER platform"
            />


            <HighlightCard
              label="Current Leader"
              value={
                currentLeader
                  ?.name
                ||
                '—'
              }
              detail={
                currentLeader
                  ? `${currentLeader.points} pts · ${currentLeader.wins} wins`
                  : 'Waiting for live results'
              }
            />

          </div>

        </div>

      </section>


      <section
        ref={tournamentsRef}
        className="public-home-section section-anchor"
      >

        <div className="public-home-shell">

          <SectionHeading
            icon="♜"
            title="Live & Upcoming Tournaments"
            subtitle="Published competitions hosted on PESLOVER."
            action="All Tournaments"
          />


          {loading ? (
            <EmptyPanel
              text="Loading tournaments..."
            />
          ) : filteredTournaments.length ===
            0 ? (
            <EmptyPanel
              text="No matching tournaments found."
            />
          ) : (
            <div className="public-tournament-grid">

              {filteredTournaments.map(
                (tournament) => (
                  <TournamentCard
                    key={
                      tournament.id
                    }
                    tournament={
                      tournament
                    }
                    stats={
                      matchStats[
                        tournament.id
                      ]
                    }
                    participants={
                      participantCounts[
                        tournament.id
                      ]
                      ||
                      0
                    }
                    groups={
                      groupCounts[
                        tournament.id
                      ]
                      ||
                      0
                    }
                    onOpen={() =>
                      openTournament(
                        tournament.slug
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>


      <section className="public-home-section public-results-section">

        <div className="public-home-shell public-results-grid">

          <div>

            <SectionHeading
              icon="☷"
              title="Latest Results"
              subtitle="The most recently completed matches."
            />


            <div className="public-match-list">

              {latestResults.length ===
              0 ? (
                <EmptyPanel
                  text="No completed matches yet."
                />
              ) : latestResults.map(
                (match) => (
                  <ResultCard
                    key={
                      match.id
                    }
                    match={
                      match
                    }
                    context={
                      matchContext(
                        match
                      )
                    }
                    firstName={
                      participantName(
                        match,
                        1
                      )
                    }
                    secondName={
                      participantName(
                        match,
                        2
                      )
                    }
                    onOpen={() =>
                      openTournament(
                        tournamentMap
                          .get(
                            match
                              .tournament_id
                          )
                          ?.slug
                      )
                    }
                  />
                )
              )}

            </div>

          </div>


          <div>

            <SectionHeading
              icon="□"
              title="Upcoming Matches"
              subtitle="Scheduled matches waiting to be played."
            />


            <div className="public-match-list">

              {upcomingMatches.length ===
              0 ? (
                <EmptyPanel
                  text="No scheduled matches."
                />
              ) : upcomingMatches.map(
                (match) => (
                  <UpcomingCard
                    key={
                      match.id
                    }
                    context={
                      matchContext(
                        match
                      )
                    }
                    firstName={
                      participantName(
                        match,
                        1
                      )
                    }
                    secondName={
                      participantName(
                        match,
                        2
                      )
                    }
                    onOpen={() =>
                      openTournament(
                        tournamentMap
                          .get(
                            match
                              .tournament_id
                          )
                          ?.slug
                      )
                    }
                  />
                )
              )}

            </div>

          </div>

        </div>

      </section>


      
      <PlayerHomeExperience />

      <GlobalRankingsSection />

      <PlayerAccountPortal />


<section
        ref={playersRef}
        className="public-home-section section-anchor"
      >

        <div className="public-home-shell">

          <SectionHeading
            icon="♙"
            title="Top Players"
            subtitle="Performance leaders across public tournaments."
          />


          <div className="public-top-player-grid">

            <TopPlayerCard
              type="Golden Boot"
              icon="♛"
              player={
                goldenBoot
              }
              value={
                goldenBoot
                  ? `${goldenBoot.goals} goals`
                  : 'No data yet'
              }
            />


            <TopPlayerCard
              type="Most Wins"
              icon="⚡"
              player={
                mostWins
              }
              value={
                mostWins
                  ? `${mostWins.wins} wins`
                  : 'No data yet'
              }
            />


            <TopPlayerCard
              type="Best Win Rate"
              icon="◇"
              player={
                bestWinRate
              }
              value={
                bestWinRate
                  ? `${bestWinRate.winRate}%`
                  : 'No data yet'
              }
            />

          </div>


          <div className="public-featured-heading">

            <SectionHeading
              icon="♙"
              title="Featured Players"
              subtitle="Players making an impact across PESLOVER."
            />

          </div>


          {filteredPlayers.length ===
          0 ? (
            <EmptyPanel
              text="No public players available."
            />
          ) : (
            <div className="public-player-grid">

              {filteredPlayers
                .slice(
                  0,
                  8
                )
                .map(
                  (player) => (
                    <PlayerCard
                      key={
                        player.key
                      }
                      player={
                        player
                      }
                      onOpen={() =>
                        setSelectedPlayer(
                          player
                        )
                      }
                    />
                  )
                )}

            </div>
          )}

        </div>

      </section>


      <section
        ref={teamsRef}
        className="public-home-section section-anchor"
      >

        <div className="public-home-shell">

          <SectionHeading
            icon="♟"
            title="Featured Teams"
            subtitle="Team-based competitors from public tournaments."
          />


          {filteredTeams.length ===
          0 ? (
            <EmptyPanel
              text="No public teams available yet."
            />
          ) : (
            <div className="public-team-grid">

              {filteredTeams
                .slice(
                  0,
                  8
                )
                .map(
                  (team) => (
                    <TeamCard
                      key={
                        team.id
                      }
                      team={
                        team
                      }
                    />
                  )
                )}

            </div>
          )}

        </div>

      </section>


      <section className="public-home-section public-hall-section">

        <div className="public-home-shell">

          <SectionHeading
            icon="♛"
            title="Hall of Fame"
            subtitle="Champions preserved forever."
          />


          {completedTournaments
            .length ===
          0 ? (
            <EmptyPanel
              text="The Hall of Fame is waiting for its first champion."
            />
          ) : (
            <div className="public-hall-grid">

              {completedTournaments
                .slice(
                  0,
                  6
                )
                .map(
                  (tournament) => (
                    <HallOfFameCard
                      key={
                        tournament.id
                      }
                      tournament={
                        tournament
                      }
                      players={
                        players
                      }
                      teams={
                        teams
                      }
                      matches={
                        matches
                      }
                      onOpen={() =>
                        openTournament(
                          tournament.slug
                        )
                      }
                    />
                  )
                )}

            </div>
          )}

        </div>

      </section>


      <PublicFooter />


      {selectedPlayer && (
        <PlayerModal
          player={
            selectedPlayer
          }
          onClose={() =>
            setSelectedPlayer(
              null
            )
          }
        />
      )}

    </main>
  )
}


function PublicNavbar({
  onNavigate
}) {
  return (
    <header className="public-main-navbar">

      <div className="public-navbar-inner">

        <button
          type="button"
          className="public-navbar-brand"
          onClick={() =>
            onNavigate(
              'home'
            )
          }
        >
          <span className="public-navbar-logo">
            ♜
          </span>

          <div>
            <strong>
              PESLOVER
            </strong>

            <small>
              eFootball Tournament Platform
            </small>
          </div>
        </button>


        <nav>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                'home'
              )
            }
          >
            Home
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                'tournaments'
              )
            }
          >
            Tournaments
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                'players'
              )
            }
          >
            Players
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                'teams'
              )
            }
          >
            Teams
          </button>

          <PlayerNavbarLinks />

        </nav>


        <button
          type="button"
          className="public-admin-button"
          onClick={() => {
            window.location.href =
              '/admin'
          }}
        >
          <span>
            ▦
          </span>

          Admin
        </button>

      </div>

    </header>
  )
}


function LiveTournamentCard({
  tournament,
  matchStats,
  participantCounts,
  groupCounts,
  onOpen
}) {
  if (!tournament) {
    return (
      <div className="public-live-tournament empty">

        <span>
          LIVE TOURNAMENT
        </span>

        <h3>
          No active tournament.
        </h3>

      </div>
    )
  }


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
    <article className="public-live-tournament">

      <div className="public-live-label">
        <i />
        LIVE TOURNAMENT
      </div>


      <div className="public-live-title-row">

        <div className="public-live-logo">

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
              ♜
            </span>
          )}

        </div>


        <div>

          <h3>
            {
              tournament.name
            }
          </h3>

          <div className="public-live-tags">

            <span>
              {
                FORMAT_NAMES[
                  tournament.format
                ]
                ||
                tournament.format
              }
            </span>

            <strong>
              {
                tournament.status ===
                'completed'
                  ? 'Completed'
                  : 'Live'
              }
            </strong>

          </div>

        </div>

      </div>


      <div className="public-live-progress-copy">

        <span>
          Progress
        </span>

        <span>
          {
            stats.completed
          }
          /
          {
            stats.total
          }
        </span>

      </div>


      <div className="public-live-progress">

        <span
          style={{
            width:
              `${progress}%`
          }}
        />

      </div>


      <div className="public-live-meta">

        <span>
          Participants:
          {' '}
          <strong>
            {
              participantCounts[
                tournament.id
              ]
              ||
              0
            }
          </strong>
        </span>


        <span>
          Groups:
          {' '}
          <strong>
            {
              groupCounts[
                tournament.id
              ]
              ||
              0
            }
          </strong>
        </span>

      </div>


      <button
        type="button"
        onClick={() =>
          onOpen(
            tournament.slug
          )
        }
      >
        View Tournament
        <span>
          →
        </span>
      </button>

    </article>
  )
}


function MetricCard({
  icon,
  label,
  value
}) {
  return (
    <article className="public-metric-card">

      <span>
        {icon}
        {' '}
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </article>
  )
}


function SectionHeading({
  icon,
  title,
  subtitle,
  action
}) {
  return (
    <div className="public-section-heading">

      <div>
        <h2>
          <span>
            {icon}
          </span>

          {title}
        </h2>

        <p>
          {subtitle}
        </p>
      </div>


      {action && (
        <span className="public-heading-action">
          {action}
          {' '}
          →
        </span>
      )}

    </div>
  )
}


function HighlightCard({
  label,
  value,
  detail
}) {
  return (
    <article className="public-highlight-card">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>

    </article>
  )
}


function TournamentCard({
  tournament,
  stats = {
    total: 0,
    completed: 0
  },
  participants,
  groups,
  onOpen
}) {
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
    <article className="public-long-tournament-card">

      <div className="public-tournament-cover">

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
            ♜
          </span>
        )}


        <div
          className={
            tournament.status ===
            'completed'
              ? 'public-tournament-status completed'
              : 'public-tournament-status'
          }
        >
          {
            tournament.status ===
            'completed'
              ? 'Completed'
              : 'Live'
          }
        </div>

      </div>


      <div className="public-tournament-card-body">

        <div className="public-tournament-card-tags">

          <span>
            {
              FORMAT_NAMES[
                tournament.format
              ]
              ||
              tournament.format
            }
          </span>

          {tournament.season && (
            <span>
              {
                tournament.season
              }
            </span>
          )}

        </div>


        <h3>
          {tournament.name}
        </h3>


        <div className="public-card-progress-copy">

          <span>
            Progress
          </span>

          <span>
            {
              stats.completed
            }
            /
            {
              stats.total
            }
          </span>

        </div>


        <div className="public-card-progress">

          <span
            style={{
              width:
                `${progress}%`
            }}
          />

        </div>


        <div className="public-tournament-card-stats">

          <span>
            {
              participants
            }
            {' '}
            Participants
          </span>

          <span>
            {
              groups
            }
            {' '}
            Groups
          </span>

        </div>


        <button
          type="button"
          onClick={onOpen}
        >
          View Tournament
          <span>
            →
          </span>
        </button>

      </div>

    </article>
  )
}


function ResultCard({
  match,
  context,
  firstName,
  secondName,
  onOpen
}) {
  return (
    <article className="public-result-card">

      <div>

        <span className="public-match-context">
          {context}
        </span>


        <div className="public-result-score">

          <strong>
            {firstName}
          </strong>

          <span>
            {
              match
                .player1_score
            }
            -
            {
              match
                .player2_score
            }
          </span>

          <strong>
            {secondName}
          </strong>

        </div>


        <small>
          {
            formatDate(
              match.completed_at
              ||
              match.created_at
            )
          }
        </small>

      </div>


      <button
        type="button"
        onClick={onOpen}
      >
        Details
      </button>

    </article>
  )
}


function UpcomingCard({
  context,
  firstName,
  secondName,
  onOpen
}) {
  return (
    <article className="public-upcoming-card">

      <div>

        <span className="public-match-context">
          {context}
        </span>


        <div className="public-upcoming-names">

          <strong>
            {firstName}
          </strong>

          <span>
            VS
          </span>

          <strong>
            {secondName}
          </strong>

        </div>

      </div>


      <button
        type="button"
        onClick={onOpen}
      >
        View
      </button>

    </article>
  )
}


function TopPlayerCard({
  type,
  icon,
  player,
  value
}) {
  return (
    <article className="public-top-player-card">

      <h3>
        <span>
          {icon}
        </span>

        {type}
      </h3>


      {!player ? (
        <p>
          No data yet.
        </p>
      ) : (
        <>

          <div className="public-top-player-main">

            <ParticipantAvatar
              name={
                player.name
              }
              imageUrl={
                player.imageUrl
              }
              size="md"
            />


            <div>
              <strong>
                {
                  player.name
                }
              </strong>

              <span>
                {
                  player.matchesPlayed
                }
                {' '}
                Matches
              </span>
            </div>


            <b>
              {value}
            </b>

          </div>


          <div className="public-top-player-sub">

            <span>
              Goals
              <strong>
                {
                  player.goals
                }
              </strong>
            </span>

            <span>
              Wins
              <strong>
                {
                  player.wins
                }
              </strong>
            </span>

            <span>
              Win %
              <strong>
                {
                  player.winRate
                }
              </strong>
            </span>

          </div>

        </>
      )}

    </article>
  )
}


function PlayerCard({
  player,
  onOpen
}) {
  return (
    <article className="public-player-card">

      <div className="public-player-photo">

        <ParticipantAvatar
          name={
            player.name
          }
          imageUrl={
            player.imageUrl
          }
          size="lg"
        />

      </div>


      <div className="public-player-card-body">

        <h3>
          {player.name}
        </h3>


        <div className="public-player-stats">

          <span>
            <strong>
              {
                player
                  .matchesPlayed
              }
            </strong>
            MP
          </span>

          <span>
            <strong>
              {
                player.goals
              }
            </strong>
            G
          </span>

          <span>
            <strong>
              {
                player.wins
              }
            </strong>
            W
          </span>

          <span>
            <strong>
              {
                player.winRate
              }%
            </strong>
            WIN%
          </span>

        </div>


        <button
          type="button"
          onClick={onOpen}
        >
          View Profile
        </button>

      </div>

    </article>
  )
}


function TeamCard({
  team
}) {
  return (
    <article className="public-team-card">

      <div className="public-team-icon">
        ♟
      </div>


      <div>

        <h3>
          {team.name}
        </h3>

        <span>
          {
            team.matchesPlayed
          }
          {' '}
          Matches
        </span>

      </div>


      <div className="public-team-stats">

        <span>
          {
            team.wins
          }
          {' '}
          Wins
        </span>

        <span>
          {
            team.goals
          }
          {' '}
          Goals
        </span>

        <strong>
          {
            team.winRate
          }%
        </strong>

      </div>

    </article>
  )
}


function HallOfFameCard({
  tournament,
  players,
  teams,
  matches,
  onOpen
}) {
  const participantType =
    tournament
      .participant_type


  const championId =
    participantType ===
    'team'
      ? tournament
          .champion_team_id
      : tournament
          .champion_player_id


  const champion =
    participantType ===
    'team'
      ? teams.find(
          (team) =>
            team.id ===
            championId
        )
      : players.find(
          (player) =>
            player.id ===
            championId
        )


  const finalMatch =
    matches.find(
      (match) =>
        match
          .tournament_id ===
          tournament.id
        &&
        match.stage ===
          'final'
        &&
        match.status ===
          'completed'
    )


  let runnerUp =
    null


  if (
    finalMatch &&
    championId
  ) {
    const finalistIds =
      participantType ===
      'team'
        ? [
            finalMatch.team1_id,
            finalMatch.team2_id
          ]
        : [
            finalMatch.player1_id,
            finalMatch.player2_id
          ]


    const runnerUpId =
      finalistIds.find(
        (id) =>
          id &&
          id !==
          championId
      )


    runnerUp =
      participantType ===
      'team'
        ? teams.find(
            (team) =>
              team.id ===
              runnerUpId
          )
        : players.find(
            (player) =>
              player.id ===
              runnerUpId
          )
  }


  return (
    <article className="public-hall-card">

      <div className="public-hall-header">

        <span className="public-hall-trophy">
          ♛
        </span>


        <div>

          <h3>
            {
              tournament.name
            }
          </h3>

          <span>
            {
              tournament.season
              ||
              'Completed Tournament'
            }
          </span>

        </div>


        <b>
          ♛
        </b>

      </div>


      <div className="public-hall-lines">

        <span>
          Champion

          <strong>
            {
              champion?.name
              ||
              'Champion'
            }
          </strong>
        </span>


        <span>
          Runner-up

          <strong>
            {
              runnerUp?.name
              ||
              '—'
            }
          </strong>
        </span>

      </div>


      <button
        type="button"
        onClick={onOpen}
      >
        View Tournament
      </button>

    </article>
  )
}


function PlayerModal({
  player,
  onClose
}) {
  return (
    <div className="public-player-modal">

      <div className="public-player-modal-card">

        <button
          type="button"
          className="public-player-modal-close"
          onClick={
            onClose
          }
        >
          ×
        </button>


        <ParticipantAvatar
          name={
            player.name
          }
          imageUrl={
            player.imageUrl
          }
          size="lg"
        />


        <span>
          PLAYER PROFILE
        </span>

        <h2>
          {player.name}
        </h2>


        <div className="public-modal-stats">

          <div>
            <strong>
              {
                player
                  .matchesPlayed
              }
            </strong>

            <span>
              Matches
            </span>
          </div>


          <div>
            <strong>
              {
                player.goals
              }
            </strong>

            <span>
              Goals
            </span>
          </div>


          <div>
            <strong>
              {
                player.wins
              }
            </strong>

            <span>
              Wins
            </span>
          </div>


          <div>
            <strong>
              {
                player.winRate
              }%
            </strong>

            <span>
              Win Rate
            </span>
          </div>

        </div>

      </div>

    </div>
  )
}


function EmptyPanel({
  text
}) {
  return (
    <div className="public-empty-panel">
      {text}
    </div>
  )
}


function PublicFooter() {
  return (
    <footer className="public-main-footer">

      <div className="public-footer-inner">

        <div className="public-footer-brand">

          <span>
            ♜
          </span>

          <div>
            <strong>
              PESLOVER
            </strong>

            <small>
              eFootball Tournament Platform
            </small>
          </div>

        </div>


        <p>
          Follow tournaments, results, standings, brackets,
          players and champions from one live competition platform.
        </p>


        <div className="public-footer-divider" />


        <div className="public-footer-bottom">

          <span>
            © {
              new Date()
                .getFullYear()
            } PESLOVER
          </span>


          <div className="public-created-by">

            <span>
              Created By
            </span>

            <strong>
              Mubarok Hossain
            </strong>

          </div>

        </div>

      </div>

    </footer>
  )
}


function calculatePlayerStats({
  tournaments,
  players,
  matches
}) {
  const tournamentMap =
    new Map(
      tournaments.map(
        (tournament) => [
          tournament.id,
          tournament
        ]
      )
    )


  const snapshotToKey =
    new Map()

  const stats =
    new Map()


  players
    .filter(
      (player) =>
        !player.team_id
    )
    .forEach(
      (player) => {
        const key =
          player.master_player_id
          ||
          `${player.name.trim().toLowerCase()}`


        snapshotToKey.set(
          player.id,
          key
        )


        if (
          !stats.has(key)
        ) {
          stats.set(
            key,
            {
              key,
              name:
                player.name,
              imageUrl:
                player.image_url,
              matchesPlayed:
                0,
              goals:
                0,
              goalsAgainst:
                0,
              wins:
                0,
              draws:
                0,
              losses:
                0,
              points:
                0,
              goalDifference:
                0,
              winRate:
                0
            }
          )
        } else if (
          !stats.get(key)
            .imageUrl
          &&
          player.image_url
        ) {
          stats.get(
            key
          ).imageUrl =
            player.image_url
        }
      }
    )


  matches
    .filter(
      (match) =>
        match.status ===
        'completed'
    )
    .forEach(
      (match) => {
        const tournament =
          tournamentMap.get(
            match.tournament_id
          )


        if (
          !tournament
          ||
          tournament
            .participant_type ===
            'team'
        ) {
          return
        }


        const firstKey =
          snapshotToKey.get(
            match.player1_id
          )

        const secondKey =
          snapshotToKey.get(
            match.player2_id
          )


        const first =
          stats.get(
            firstKey
          )

        const second =
          stats.get(
            secondKey
          )


        if (
          !first ||
          !second
        ) {
          return
        }


        const firstScore =
          Number(
            match.player1_score
            ||
            0
          )

        const secondScore =
          Number(
            match.player2_score
            ||
            0
          )


        first.matchesPlayed +=
          1

        second.matchesPlayed +=
          1


        first.goals +=
          firstScore

        second.goals +=
          secondScore


        first.goalsAgainst +=
          secondScore

        second.goalsAgainst +=
          firstScore


        if (
          firstScore >
          secondScore
        ) {
          first.wins += 1
          first.points += 3

          second.losses += 1
        } else if (
          secondScore >
          firstScore
        ) {
          second.wins += 1
          second.points += 3

          first.losses += 1
        } else {
          first.draws += 1
          second.draws += 1

          first.points += 1
          second.points += 1
        }
      }
    )


  return [
    ...stats.values()
  ]
    .map(
      (player) => ({
        ...player,

        goalDifference:
          player.goals -
          player.goalsAgainst,

        winRate:
          player.matchesPlayed
            ? Math.round(
                (
                  player.wins /
                  player.matchesPlayed
                )
                *
                100
              )
            : 0
      })
    )
    .sort(
      (a, b) =>
        b.matchesPlayed -
        a.matchesPlayed
        ||
        b.wins -
        a.wins
    )
}


function calculateTeamStats({
  tournaments,
  teams,
  matches
}) {
  const tournamentMap =
    new Map(
      tournaments.map(
        (tournament) => [
          tournament.id,
          tournament
        ]
      )
    )


  const stats =
    new Map()


  teams.forEach(
    (team) => {
      stats.set(
        team.id,
        {
          id:
            team.id,
          name:
            team.name,
          matchesPlayed:
            0,
          wins:
            0,
          goals:
            0,
          goalsAgainst:
            0,
          winRate:
            0
        }
      )
    }
  )


  matches
    .filter(
      (match) =>
        match.status ===
        'completed'
    )
    .forEach(
      (match) => {
        const tournament =
          tournamentMap.get(
            match.tournament_id
          )


        if (
          !tournament
          ||
          tournament
            .participant_type !==
            'team'
        ) {
          return
        }


        const first =
          stats.get(
            match.team1_id
          )

        const second =
          stats.get(
            match.team2_id
          )


        if (
          !first ||
          !second
        ) {
          return
        }


        const firstScore =
          Number(
            match.player1_score
            ||
            0
          )

        const secondScore =
          Number(
            match.player2_score
            ||
            0
          )


        first.matchesPlayed +=
          1

        second.matchesPlayed +=
          1


        first.goals +=
          firstScore

        second.goals +=
          secondScore


        first.goalsAgainst +=
          secondScore

        second.goalsAgainst +=
          firstScore


        if (
          firstScore >
          secondScore
        ) {
          first.wins += 1
        } else if (
          secondScore >
          firstScore
        ) {
          second.wins += 1
        }
      }
    )


  return [
    ...stats.values()
  ]
    .map(
      (team) => ({
        ...team,

        winRate:
          team.matchesPlayed
            ? Math.round(
                (
                  team.wins /
                  team.matchesPlayed
                )
                *
                100
              )
            : 0
      })
    )
    .sort(
      (a, b) =>
        b.matchesPlayed -
        a.matchesPlayed
    )
}


function totalScore(
  match
) {
  return (
    Number(
      match.player1_score
      ||
      0
    )
    +
    Number(
      match.player2_score
      ||
      0
    )
  )
}


function winningMargin(
  match
) {
  return Math.abs(
    Number(
      match.player1_score
      ||
      0
    )
    -
    Number(
      match.player2_score
      ||
      0
    )
  )
}


function dateValue(
  match
) {
  return new Date(
    match.completed_at
    ||
    match.created_at
    ||
    0
  ).getTime()
}


function formatDate(
  value
) {
  if (!value) {
    return ''
  }


  return new Intl
    .DateTimeFormat(
      'en-US',
      {
        month:
          'short',

        day:
          'numeric',

        year:
          'numeric'
      }
    )
    .format(
      new Date(
        value
      )
    )
}


export default PublicApp
