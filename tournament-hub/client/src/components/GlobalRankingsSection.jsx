import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import GlobalPlayerProfileModal from './GlobalPlayerProfileModal'

import './GlobalRankingsSection.css'


function GlobalRankingsSection() {
  const [
    rankings,
    setRankings
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
    selectedPlayerId,
    setSelectedPlayerId
  ] = useState(null)


  const loadRankings =
    useCallback(
      async () => {
        setError('')

        const {
          data,
          error:
            rankingError
        } =
          await supabase
            .rpc(
              'get_global_player_rankings',
              {
                limit_count: 50
              }
            )


        if (
          rankingError
        ) {
          console.error(
            'Unable to load global rankings:',
            rankingError
          )

          setError(
            rankingError.message
          )

          setLoading(false)

          return
        }


        setRankings(
          data || []
        )

        setLoading(false)
      },
      []
    )


  useEffect(
    () => {
      loadRankings()
    },
    [loadRankings]
  )


  useEffect(
    () => {
      const channel =
        supabase
          .channel(
            'public-global-rankings'
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table:
                'player_ratings'
            },
            () => {
              window.setTimeout(
                loadRankings,
                150
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
    [loadRankings]
  )


  const topThree =
    rankings.slice(
      0,
      3
    )


  function openPlayer(
    playerId
  ) {
    if (!playerId) {
      return
    }

    setSelectedPlayerId(
      playerId
    )
  }


  return (
    <section
      id="global-rankings"
      className="global-rankings-section"
    >

      <div className="global-rankings-shell">

        <header className="global-rankings-heading">

          <div>

            <span className="global-rankings-eyebrow">
              PESLOVER WORLD RANKING
            </span>

            <h2>
              Global Player Rankings
            </h2>

            <p>
              Competitive ELO ratings calculated automatically from official PESLOVER match results.
            </p>

          </div>


          <div className="global-rankings-live">

            <i />

            Live Rankings

          </div>

        </header>


        {loading ? (
          <div className="ranking-state">
            Loading global rankings...
          </div>

        ) : error ? (
          <div className="ranking-state ranking-error">
            {error}
          </div>

        ) : rankings.length ===
          0 ? (

          <div className="ranking-state">

            <strong>
              Rankings are waiting for players.
            </strong>

            <span>
              Add players to the PESLOVER Player Library to begin the global leaderboard.
            </span>

          </div>

        ) : (
          <>

            <div className="ranking-podium">

              {topThree.map(
                (
                  player,
                  index
                ) => (
                  <PodiumCard
                    key={
                      player.player_id
                    }
                    player={
                      player
                    }
                    position={
                      index + 1
                    }
                    onOpen={
                      openPlayer
                    }
                  />
                )
              )}

            </div>


            <div className="ranking-table-card">

              <div className="ranking-table-header">

                <span>
                  Rank
                </span>

                <span>
                  Player
                </span>

                <span>
                  Rating
                </span>

                <span>
                  Tier
                </span>

                <span>
                  MP
                </span>

                <span>
                  W
                </span>

                <span>
                  D
                </span>

                <span>
                  L
                </span>

                <span>
                  GF
                </span>

                <span>
                  GD
                </span>

                <span>
                  Win %
                </span>

                <span>
                  Change
                </span>

              </div>


              <div className="ranking-table-body">

                {rankings.map(
                  (player) => (
                    <RankingRow
                      key={
                        player.player_id
                      }
                      player={
                        player
                      }
                      onOpen={
                        openPlayer
                      }
                    />
                  )
                )}

              </div>

            </div>

          </>
        )}

      </div>


      {selectedPlayerId && (
        <GlobalPlayerProfileModal
          playerId={
            selectedPlayerId
          }
          onClose={() =>
            setSelectedPlayerId(
              null
            )
          }
        />
      )}

    </section>
  )
}


function PodiumCard({
  player,
  position,
  onOpen
}) {
  const positionLabel =
    position === 1
      ? 'Champion Rank'
      : position === 2
        ? 'Second Rank'
        : 'Third Rank'


  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
        'Enter' ||
      event.key ===
        ' '
    ) {
      event.preventDefault()

      onOpen(
        player.player_id
      )
    }
  }


  return (
    <article
      className={
        `ranking-podium-card position-${position}`
      }
      role="button"
      tabIndex={0}
      aria-label={
        `View ${player.player_name} career profile`
      }
      title={
        `View ${player.player_name} career`
      }
      onClick={() =>
        onOpen(
          player.player_id
        )
      }
      onKeyDown={
        handleKeyDown
      }
      style={{
        cursor: 'pointer'
      }}
    >

      <div className="ranking-podium-number">
        #{position}
      </div>


      <PlayerAvatar
        player={
          player
        }
        large
      />


      <span className="ranking-position-label">
        {positionLabel}
      </span>


      <h3>
        {
          player.player_name
        }
      </h3>


      <div className="ranking-big-rating">

        <strong>
          {
            player.current_rating
          }
        </strong>

        <span>
          ELO
        </span>

      </div>


      <TierBadge
        tier={
          player.tier
        }
      />


      <div className="ranking-podium-stats">

        <span>
          <strong>
            {
              player.matches_played
            }
          </strong>

          Matches
        </span>


        <span>
          <strong>
            {
              player.wins
            }
          </strong>

          Wins
        </span>


        <span>
          <strong>
            {
              player.win_rate
            }%
          </strong>

          Win Rate
        </span>

      </div>

    </article>
  )
}


function RankingRow({
  player,
  onOpen
}) {
  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
        'Enter' ||
      event.key ===
        ' '
    ) {
      event.preventDefault()

      onOpen(
        player.player_id
      )
    }
  }


  return (
    <div
      className="ranking-table-row"
      role="button"
      tabIndex={0}
      aria-label={
        `View ${player.player_name} career profile`
      }
      title={
        `View ${player.player_name} career`
      }
      onClick={() =>
        onOpen(
          player.player_id
        )
      }
      onKeyDown={
        handleKeyDown
      }
      style={{
        cursor: 'pointer'
      }}
    >

      <div className="ranking-number">

        {Number(
          player.global_rank
        ) <= 3 ? (
          <span
            className={
              `rank-medal rank-${player.global_rank}`
            }
          >
            {
              player.global_rank
            }
          </span>
        ) : (
          <strong>
            #
            {
              player.global_rank
            }
          </strong>
        )}

      </div>


      <div className="ranking-player-cell">

        <PlayerAvatar
          player={
            player
          }
        />


        <div>

          <strong>
            {
              player.player_name
            }
          </strong>

          <span>
            Peak:
            {' '}
            {
              player.peak_rating
            }
          </span>

        </div>

      </div>


      <div className="ranking-rating-cell">

        <strong>
          {
            player.current_rating
          }
        </strong>

        <span>
          ELO
        </span>

      </div>


      <TierBadge
        tier={
          player.tier
        }
      />


      <span className="ranking-stat">
        {
          player.matches_played
        }
      </span>


      <span className="ranking-stat">
        {
          player.wins
        }
      </span>


      <span className="ranking-stat">
        {
          player.draws
        }
      </span>


      <span className="ranking-stat">
        {
          player.losses
        }
      </span>


      <span className="ranking-stat">
        {
          player.goals_for
        }
      </span>


      <span
        className={
          Number(
            player.goal_difference
          ) >= 0
            ? 'ranking-stat positive'
            : 'ranking-stat negative'
        }
      >
        {
          Number(
            player.goal_difference
          ) > 0
            ? '+'
            : ''
        }

        {
          player.goal_difference
        }
      </span>


      <span className="ranking-stat">
        {
          player.win_rate
        }%
      </span>


      <RatingChange
        value={
          player.last_change
        }
      />

    </div>
  )
}


function PlayerAvatar({
  player,
  large = false
}) {
  return (
    <div
      className={
        large
          ? 'ranking-avatar large'
          : 'ranking-avatar'
      }
    >

      {player.image_url ? (
        <img
          src={
            player.image_url
          }
          alt={
            player.player_name
          }
        />
      ) : (
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
        >

          <circle
            cx="32"
            cy="24"
            r="12"
          />

          <path
            d="M12 56c1.6-12.2 9.4-18 20-18s18.4 5.8 20 18"
          />

        </svg>
      )}

    </div>
  )
}


function TierBadge({
  tier
}) {
  const tierClass =
    String(
      tier ||
      'Gold'
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        '-'
      )


  return (
    <span
      className={
        `ranking-tier tier-${tierClass}`
      }
    >
      {tier}
    </span>
  )
}


function RatingChange({
  value
}) {
  const change =
    Number(
      value ||
      0
    )


  if (
    change > 0
  ) {
    return (
      <span className="rating-change up">
        ↑ +{change}
      </span>
    )
  }


  if (
    change < 0
  ) {
    return (
      <span className="rating-change down">
        ↓ {change}
      </span>
    )
  }


  return (
    <span className="rating-change neutral">
      —
    </span>
  )
}


export default GlobalRankingsSection
