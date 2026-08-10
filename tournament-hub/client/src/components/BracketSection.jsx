import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'

import {
  apiRequest
} from '../lib/api'

import {
  buildLiveGroupBracket
} from '../lib/liveBracketPreview'

import ParticipantAvatar from './ParticipantAvatar'
import CareerPlayerTrigger from './CareerPlayerTrigger'

import './BracketSection.css'


const STAGES = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final'
]


const STAGE_NAMES = {
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


function BracketSection({
  tournament,
  matches,
  players,
  teams,
  groups,
  groupMembers,
  onChanged
}) {
  const [
    moving,
    setMoving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    showChampionCelebration,
    setShowChampionCelebration
  ] = useState(false)


  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint: {
            distance: 6
          }
        }
      )
    )


  const participantType =
    tournament
      .participant_type


  function globalPlayerIdFor(
    participantId
  ) {
    if (
      participantType ===
      'team'
      ||
      !participantId
    ) {
      return null
    }


    return (
      players.find(
        (player) =>
          player.id ===
          participantId
      )?.master_player_id
      ||
      null
    )
  }


  const knockoutStages = [
    ...STAGES,
    'third_place',
    'final'
  ]


  const officialKnockoutExists =
    matches.some(
      (match) =>
        knockoutStages.includes(
          match.stage
        )
    )


  const liveProjection =
    useMemo(
      () =>
        buildLiveGroupBracket({
          tournament,
          players,
          teams,
          groups,
          groupMembers,
          matches
        }),
      [
        tournament,
        players,
        teams,
        groups,
        groupMembers,
        matches
      ]
    )


  const bracketMatches =
    officialKnockoutExists
      ? matches
      : liveProjection.matches


  const isProjectedBracket =
    !officialKnockoutExists
    &&
    liveProjection.projected


  const participantMap =
    useMemo(
      () => {
        const source =
          participantType ===
          'team'
            ? teams
            : players.filter(
                (player) =>
                  !player.team_id
              )


        return new Map(
          source.map(
            (participant) => [
              participant.id,
              participant.name
            ]
          )
        )
      },
      [
        participantType,
        players,
        teams
      ]
    )


  function participantImages(
    id
  ) {
    if (!id) {
      return []
    }


    if (
      participantType ===
      'team'
    ) {
      return players
        .filter(
          (player) =>
            player.team_id ===
              id
            &&
            player.image_url
        )
        .sort(
          (a, b) =>
            (
              a.team_position ||
              0
            )
            -
            (
              b.team_position ||
              0
            )
        )
        .map(
          (player) =>
            player.image_url
        )
        .slice(0, 2)
    }


    const player =
      players.find(
        (item) =>
          item.id === id
      )


    return player?.image_url
      ? [
          player.image_url
        ]
      : []
  }


  function getParticipantId(
    match,
    slot
  ) {
    if (
      participantType ===
      'team'
    ) {
      return slot === 1
        ? match.team1_id
        : match.team2_id
    }


    return slot === 1
      ? match.player1_id
      : match.player2_id
  }


  function participantName(
    id
  ) {
    if (!id) {
      return 'TBD'
    }


    return (
      participantMap.get(id) ||
      'Unknown'
    )
  }


  function winnerId(
    tie
  ) {
    const canonical =
      tie.find(
        (match) =>
          match.leg_number === 1
      )
      ||
      tie[0]


    return participantType ===
      'team'
      ? canonical
          ?.winner_team_id
      : canonical
          ?.winner_player_id
  }


  function aggregateScores(
    tie
  ) {
    const totals =
      new Map()

    let completed =
      false


    tie.forEach(
      (match) => {
        if (
          match.status !==
          'completed'
        ) {
          return
        }


        completed =
          true


        const first =
          getParticipantId(
            match,
            1
          )

        const second =
          getParticipantId(
            match,
            2
          )


        if (first) {
          totals.set(
            first,
            (
              totals.get(first) ||
              0
            )
            +
            Number(
              match
                .player1_score ||
              0
            )
          )
        }


        if (second) {
          totals.set(
            second,
            (
              totals.get(second) ||
              0
            )
            +
            Number(
              match
                .player2_score ||
              0
            )
          )
        }
      }
    )


    return {
      completed,
      totals
    }
  }


  const tiesByStage =
    useMemo(
      () => {
        const stageMap =
          new Map()


        bracketMatches
          .filter(
            (match) =>
              knockoutStages.includes(
                match.stage
              )
          )
          .forEach(
            (match) => {
              const stage =
                match.stage

              const tieId =
                match.tie_id ||
                match.id


              if (
                !stageMap.has(stage)
              ) {
                stageMap.set(
                  stage,
                  new Map()
                )
              }


              const ties =
                stageMap.get(
                  stage
                )


              if (
                !ties.has(tieId)
              ) {
                ties.set(
                  tieId,
                  []
                )
              }


              ties
                .get(tieId)
                .push(match)
            }
          )


        const result =
          new Map()


        for (
          const [
            stage,
            ties
          ]
          of stageMap.entries()
        ) {
          result.set(
            stage,

            [...ties.values()]
              .map(
                (tie) =>
                  tie.sort(
                    (a, b) =>
                      (
                        a.leg_number ||
                        1
                      )
                      -
                      (
                        b.leg_number ||
                        1
                      )
                  )
              )
              .sort(
                (a, b) =>
                  (
                    a[0]
                      ?.bracket_order
                    ||
                    a[0]
                      ?.match_order
                    ||
                    0
                  )
                  -
                  (
                    b[0]
                      ?.bracket_order
                    ||
                    b[0]
                      ?.match_order
                    ||
                    0
                  )
              )
          )
        }


        return result
      },
      [
        bracketMatches
      ]
    )


  function sideTies(
    stage,
    side
  ) {
    const ties =
      tiesByStage.get(
        stage
      )
      ||
      []


    const explicit =
      ties.filter(
        (tie) =>
          tie[0]
            ?.bracket_side ===
          side
      )


    if (
      explicit.length > 0
    ) {
      return explicit
    }


    const half =
      Math.ceil(
        ties.length / 2
      )


    return side ===
      'left'
      ? ties.slice(
          0,
          half
        )
      : ties.slice(
          half
        )
  }


  const activeStages =
    STAGES.filter(
      (stage) =>
        (
          tiesByStage.get(
            stage
          )
          ||
          []
        ).length > 0
    )


  const finalTie =
    (
      tiesByStage.get(
        'final'
      )
      ||
      []
    )[0]
    ||
    null


  const bronzeTie =
    (
      tiesByStage.get(
        'third_place'
      )
      ||
      []
    )[0]
    ||
    null


  const championId =
    participantType ===
    'team'
      ? tournament
          .champion_team_id
      : tournament
          .champion_player_id


  const finalCompleted =
    Boolean(
      finalTie
    )
    &&
    finalTie.every(
      (match) =>
        match.status ===
        'completed'
    )


  useEffect(
    () => {
      if (
        !championId ||
        !finalCompleted
      ) {
        setShowChampionCelebration(
          false
        )

        return
      }


      setShowChampionCelebration(
        true
      )


      const timer =
        window.setTimeout(
          () => {
            setShowChampionCelebration(
              false
            )
          },
          5000
        )


      return () => {
        window.clearTimeout(
          timer
        )
      }
    },
    [
      championId,
      finalCompleted
    ]
  )


  async function handleDragEnd(
    event
  ) {
    if (
      isProjectedBracket
    ) {
      return
    }


    const source =
      event.active
        ?.data
        ?.current

    const target =
      event.over
        ?.data
        ?.current


    if (
      !source ||
      !target
    ) {
      return
    }


    if (
      source.tieId ===
        target.tieId
      &&
      source.slot ===
        target.slot
    ) {
      return
    }


    setMoving(true)
    setError('')


    try {
      await apiRequest(
        '/api/matches/bracket/swap',
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              sourceTieId:
                source.tieId,

              sourceSlot:
                source.slot,

              targetTieId:
                target.tieId,

              targetSlot:
                target.slot
            })
        }
      )


      if (onChanged) {
        await onChanged()
      }
    } catch (swapError) {
      setError(
        swapError.message ||
        'Unable to move bracket participant.'
      )
    } finally {
      setMoving(false)
    }
  }


  const visibleKnockoutMatches =
    bracketMatches.filter(
      (match) =>
        knockoutStages.includes(
          match.stage
        )
    )


  if (
    visibleKnockoutMatches.length ===
    0
  ) {
    return (
      <section className="premium-bracket-section">

        <BracketHeader
          projected={false}
        />


        <div className="premium-bracket-empty">

          <WorldCupTrophy
            championName="Awaiting Champion"
          />

          <strong>
            Bracket Not Available Yet.
          </strong>

          <span>
            Generate the knockout stage to display the tournament bracket.
          </span>

        </div>

      </section>
    )
  }


  return (
    <section className="premium-bracket-section">

      {showChampionCelebration &&
        championId && (
        <ChampionCelebration
          name={
            participantName(
              championId
            )
          }
          images={
            participantImages(
              championId
            )
          }
        />
      )}


      <BracketHeader
        projected={
          isProjectedBracket
        }
      />


      {error && (
        <div className="premium-bracket-error">
          {error}
        </div>
      )}


      {moving && (
        <div className="premium-bracket-updating">
          Updating Bracket...
        </div>
      )}


      {isProjectedBracket && (
        <div className="premium-projection-notice">

          <div>
            <span className="projection-pulse" />

            <div>
              <strong>
                Live Qualification Projection.
              </strong>

              <p>
                {
                  liveProjection
                    .qualifiers
                    .length
                }
                {' '}
                players currently occupy knockout positions.
              </p>
            </div>
          </div>


          <span className="projection-chip">
            Updates With Standings
          </span>

        </div>
      )}


      <DndContext
        sensors={sensors}
        onDragEnd={
          handleDragEnd
        }
      >

        <div className="premium-bracket-viewport">

          <div
            className="premium-two-sided-bracket"
            style={{
              '--round-count':
                activeStages.length
            }}
          >


            <div className="premium-bracket-wing premium-left-wing">

              {activeStages.map(
                (stage) => (
                  <BracketRound
                    key={
                      `left-${stage}`
                    }
                    title={
                      STAGE_NAMES[
                        stage
                      ]
                    }
                    side="left"
                    ties={
                      sideTies(
                        stage,
                        'left'
                      )
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                participantImages
              }
              globalPlayerIdFor={
                globalPlayerIdFor
              }
                    getParticipantId={
                      getParticipantId
                    }
                    aggregateScores={
                      aggregateScores
                    }
                    winnerId={
                      winnerId
                    }
                    projected={
                      isProjectedBracket
                    }
                  />
                )
              )}

            </div>


            <div className="premium-bracket-center">

              <div className="central-trophy-area">

                <WorldCupTrophy
                  championName={
                    championId
                      ? participantName(
                          championId
                        )
                      : 'Awaiting Champion'
                  }
                />


                {championId && (
                  <div className="central-champion-avatar">

                    <ParticipantAvatar
                      name={
                        participantName(
                          championId
                        )
                      }
                      imageUrls={
                        participantImages(
                          championId
                        )
                      }
                      size="lg"
                    />

                  </div>
                )}

              </div>


              <div className="premium-center-match">

                <span className="premium-center-label final">
                  Final
                </span>


                {finalTie ? (
                  <BracketTie
                    tie={
                      finalTie
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                participantImages
              }
              globalPlayerIdFor={
                globalPlayerIdFor
              }
                    getParticipantId={
                      getParticipantId
                    }
                    aggregateScores={
                      aggregateScores
                    }
                    winnerId={
                      winnerId
                    }
                    projected={
                      isProjectedBracket
                    }
                    center
                  />
                ) : (
                  <div className="premium-center-tbd">
                    Final TBD.
                  </div>
                )}

              </div>


              {bronzeTie && (
                <div className="premium-center-match">

                  <span className="premium-center-label bronze">
                    Bronze Final
                  </span>

                  <BracketTie
                    tie={
                      bronzeTie
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                participantImages
              }
              globalPlayerIdFor={
                globalPlayerIdFor
              }
                    getParticipantId={
                      getParticipantId
                    }
                    aggregateScores={
                      aggregateScores
                    }
                    winnerId={
                      winnerId
                    }
                    projected={
                      isProjectedBracket
                    }
                    center
                  />

                </div>
              )}

            </div>


            <div className="premium-bracket-wing premium-right-wing">

              {[
                ...activeStages
              ]
                .reverse()
                .map(
                  (stage) => (
                    <BracketRound
                      key={
                        `right-${stage}`
                      }
                      title={
                        STAGE_NAMES[
                          stage
                        ]
                      }
                      side="right"
                      ties={
                        sideTies(
                          stage,
                          'right'
                        )
                      }
                      participantName={
                        participantName
                      }
                      participantImages={
                participantImages
              }
              globalPlayerIdFor={
                globalPlayerIdFor
              }
                      getParticipantId={
                        getParticipantId
                      }
                      aggregateScores={
                        aggregateScores
                      }
                      winnerId={
                        winnerId
                      }
                      projected={
                        isProjectedBracket
                      }
                    />
                  )
                )}

            </div>

          </div>

        </div>

      </DndContext>

    </section>
  )
}


function BracketHeader({
  projected
}) {
  return (
    <header className="premium-bracket-header">

      <div>
        <p className="premium-bracket-eyebrow">
          LIVE KNOCKOUT
        </p>

        <h2>
          Tournament Bracket.
        </h2>

        <p>
          {
            projected
              ? 'The bracket is projected live from the current qualification standings.'
              : 'Follow every knockout round through to the tournament champion.'
          }
        </p>
      </div>


      <div
        className={
          projected
            ? 'premium-live-badge projected'
            : 'premium-live-badge'
        }
      >
        <span />

        {
          projected
            ? 'Live Projection'
            : 'Live Bracket'
        }
      </div>

    </header>
  )
}


function BracketRound({
  title,
  side,
  ties,
  participantName,
  participantImages,
  globalPlayerIdFor,
  getParticipantId,
  aggregateScores,
  winnerId,
  projected
}) {
  return (
    <div
      className={
        `premium-round-column ${side}`
      }
    >

      <div className="premium-round-title">
        {title}
      </div>


      <div className="premium-round-ties">

        {ties.map(
          (tie) => (
            <BracketTie
              key={
                tie[0]
                  ?.tie_id
                ||
                tie[0]?.id
              }
              tie={tie}
              participantName={
                participantName
              }
              participantImages={
                participantImages
              }
              globalPlayerIdFor={
                globalPlayerIdFor
              }
              getParticipantId={
                getParticipantId
              }
              aggregateScores={
                aggregateScores
              }
              winnerId={
                winnerId
              }
              projected={
                projected
              }
            />
          )
        )}

      </div>

    </div>
  )
}


function BracketTie({
  tie,
  participantName,
  participantImages,
  globalPlayerIdFor,
  getParticipantId,
  aggregateScores,
  winnerId,
  projected,
  center = false
}) {
  const canonical =
    tie.find(
      (match) =>
        match.leg_number ===
        1
    )
    ||
    tie[0]


  const firstId =
    getParticipantId(
      canonical,
      1
    )

  const secondId =
    getParticipantId(
      canonical,
      2
    )


  const {
    completed,
    totals
  } =
    aggregateScores(
      tie
    )


  const winner =
    winnerId(
      tie
    )


  const locked =
    projected
    ||
    tie.some(
      (match) =>
        match.status ===
        'completed'
    )


  return (
    <article
      className={[
        'premium-bracket-tie',

        locked
          ? 'locked'
          : '',

        projected
          ? 'projected'
          : '',

        center
          ? 'center'
          : ''
      ].join(' ')}
    >

      <div className="premium-match-meta">

        <span>
          Match {
            canonical
              ?.bracket_order
            ||
            canonical
              ?.match_order
            ||
            '—'
          }
        </span>


        {projected && (
          <span className="projected-match-chip">
            Projected
          </span>
        )}

      </div>


      <BracketSlot
        tieId={
          canonical
            ?.tie_id
        }
        stage={
          canonical
            ?.stage
        }
        slot={1}
        participantId={
          firstId
        }
        name={
          participantName(
            firstId
          )
        }
        images={
          participantImages(
            firstId
          )
        }
        globalPlayerId={
          globalPlayerIdFor(
            firstId
          )
        }
        score={
          completed &&
          firstId
            ? (
                totals.get(
                  firstId
                )
                ??
                0
              )
            : null
        }
        winner={
          winner ===
          firstId
        }
        locked={
          locked
        }
        manual={
          canonical
            ?.manual_slot1
        }
        projected={
          projected
        }
      />


      <BracketSlot
        tieId={
          canonical
            ?.tie_id
        }
        stage={
          canonical
            ?.stage
        }
        slot={2}
        participantId={
          secondId
        }
        name={
          participantName(
            secondId
          )
        }
        images={
          participantImages(
            secondId
          )
        }
        globalPlayerId={
          globalPlayerIdFor(
            secondId
          )
        }
        score={
          completed &&
          secondId
            ? (
                totals.get(
                  secondId
                )
                ??
                0
              )
            : null
        }
        winner={
          winner ===
          secondId
        }
        locked={
          locked
        }
        manual={
          canonical
            ?.manual_slot2
        }
        projected={
          projected
        }
      />


      {tie.length > 1 && (
        <span className="premium-aggregate-label">
          Two-Leg Aggregate
        </span>
      )}

    </article>
  )
}


function BracketSlot({
  tieId,
  stage,
  slot,
  participantId,
  name,
  images = [],
  globalPlayerId,
  score,
  winner,
  locked,
  manual,
  projected
}) {
  const data = {
    tieId,
    stage,
    slot,
    participantId
  }


  const {
    attributes,
    listeners,
    setNodeRef:
      setDragRef,
    transform,
    isDragging
  } =
    useDraggable({
      id:
        `drag-${tieId}-${slot}`,

      disabled:
        locked
        ||
        projected
        ||
        !participantId,

      data
    })


  const {
    setNodeRef:
      setDropRef,
    isOver
  } =
    useDroppable({
      id:
        `drop-${tieId}-${slot}`,

      disabled:
        locked
        ||
        projected,

      data
    })


  function setRefs(node) {
    setDragRef(node)
    setDropRef(node)
  }


  const style =
    transform
      ? {
          transform:
            `translate3d(${transform.x}px, ${transform.y}px, 0)`
        }
      : undefined


  return (
    <div
      ref={setRefs}
      style={style}
      className={[
        'premium-bracket-slot',

        winner
          ? 'winner'
          : '',

        isDragging
          ? 'dragging'
          : '',

        isOver
          ? 'drag-over'
          : '',

        !participantId
          ? 'empty'
          : ''
      ].join(' ')}
      {...attributes}
      {...listeners}
    >

      <span className="premium-drag-handle">
        {
          projected ||
          locked
            ? '•'
            : '⋮⋮'
        }
      </span>


      {
        participantId
          ? (
            <CareerPlayerTrigger
              as="span"
              className="premium-bracket-career-trigger"
              globalPlayerId={
                globalPlayerId
              }
              stopPointerDown
              title={
                name
                  ? `View ${name} career`
                  : 'View player career'
              }
            >
              <ParticipantAvatar
                name={
                  name
                }
                imageUrls={
                  images
                }
                size="sm"
              />
            </CareerPlayerTrigger>
          )
          : (
            <span className="premium-avatar-placeholder" />
          )
      }


      <span className="premium-slot-player">

        {name}

        {manual && (
          <small>
            Manual
          </small>
        )}

      </span>


      <strong className="premium-slot-score">
        {
          score === null
            ? '–'
            : score
        }
      </strong>

    </div>
  )
}


function WorldCupTrophy({
  championName
}) {
  return (
    <div className="world-cup-trophy-wrap">

      <div className="world-cup-glow" />


      <svg
        className="world-cup-trophy-svg"
        viewBox="0 0 160 210"
        role="img"
        aria-label="Tournament champion trophy"
      >

        <defs>

          <linearGradient
            id="trophyGold"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#FFF3A4"
            />

            <stop
              offset="28%"
              stopColor="#F7CA4C"
            />

            <stop
              offset="62%"
              stopColor="#D99A19"
            />

            <stop
              offset="100%"
              stopColor="#8D5B07"
            />
          </linearGradient>


          <linearGradient
            id="trophyDarkGold"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#EBC04C"
            />

            <stop
              offset="100%"
              stopColor="#7B4A05"
            />
          </linearGradient>

        </defs>


        <circle
          cx="80"
          cy="43"
          r="30"
          fill="url(#trophyGold)"
        />


        <path
          d="M53 43C61 34 69 29 80 28C91 29 99 34 107 43"
          fill="none"
          stroke="#8A5B0C"
          strokeWidth="2.5"
          opacity="0.72"
        />


        <path
          d="M54 50C70 57 90 57 106 50"
          fill="none"
          stroke="#8A5B0C"
          strokeWidth="2"
          opacity="0.65"
        />


        <path
          d="M80 14C71 28 69 45 80 72C91 45 89 28 80 14Z"
          fill="none"
          stroke="#8A5B0C"
          strokeWidth="2"
          opacity="0.55"
        />


        <path
          d="M54 55C42 66 37 81 41 98C45 115 59 122 66 134L76 145L80 112L70 86Z"
          fill="url(#trophyGold)"
        />


        <path
          d="M106 55C118 66 123 81 119 98C115 115 101 122 94 134L84 145L80 112L90 86Z"
          fill="url(#trophyGold)"
        />


        <path
          d="M68 70C72 83 74 97 73 111L65 146H95L87 111C86 97 88 83 92 70C86 75 74 75 68 70Z"
          fill="url(#trophyDarkGold)"
        />


        <path
          d="M62 143H98L104 158H56Z"
          fill="url(#trophyGold)"
        />


        <rect
          x="50"
          y="157"
          width="60"
          height="14"
          rx="4"
          fill="#9B6610"
        />


        <rect
          x="44"
          y="170"
          width="72"
          height="15"
          rx="4"
          fill="url(#trophyGold)"
        />


        <rect
          x="38"
          y="184"
          width="84"
          height="12"
          rx="4"
          fill="#68400A"
        />

      </svg>


      <div className="trophy-name-slot">

        <span>
          Champion
        </span>

        <strong>
          {championName}
        </strong>

      </div>

    </div>
  )
}


function ChampionCelebration({
  name,
  images
}) {
  const particles =
    Array.from(
      {
        length: 22
      },
      (
        _,
        index
      ) => index
    )


  return (
    <div
      className="champion-celebration-overlay"
      aria-live="polite"
    >

      <div className="champion-confetti">

        {particles.map(
          (index) => (
            <span
              key={index}
              style={{
                '--particle-x':
                  `${5 + ((index * 17) % 90)}%`,

                '--particle-delay':
                  `${(index % 8) * 0.09}s`,

                '--particle-rotation':
                  `${index * 31}deg`
              }}
            />
          )
        )}

      </div>


      <div className="champion-celebration-card">

        <p className="champion-celebration-kicker">
          Tournament Champion.
        </p>


        <WorldCupTrophy
          championName={
            name
          }
        />


        <div className="celebration-player">

          <ParticipantAvatar
            name={name}
            imageUrls={
              images
            }
            size="lg"
          />


          <div>
            <span>
              Congratulations.
            </span>

            <strong>
              {name}
            </strong>
          </div>

        </div>

      </div>

    </div>
  )
}


export default BracketSection
