import {
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

import ParticipantAvatar from './ParticipantAvatar'

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
    const first =
      tie[0]

    return participantType ===
      'team'
      ? first
          .winner_team_id
      : first
          .winner_player_id
  }


  function aggregateScores(
    tie
  ) {
    const totals =
      new Map()

    let completed = false


    tie.forEach(
      (match) => {
        if (
          match.status !==
          'completed'
        ) {
          return
        }

        completed = true

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
            ) +
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
            ) +
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
        const map =
          new Map()


        matches
          .filter(
            (match) =>
              [
                ...STAGES,
                'third_place',
                'final'
              ].includes(
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
                !map.has(stage)
              ) {
                map.set(
                  stage,
                  new Map()
                )
              }


              if (
                !map
                  .get(stage)
                  .has(tieId)
              ) {
                map
                  .get(stage)
                  .set(
                    tieId,
                    []
                  )
              }


              map
                .get(stage)
                .get(tieId)
                .push(match)
            }
          )


        const result =
          new Map()


        for (
          const [
            stage,
            stageMap
          ]
          of map.entries()
        ) {
          const ties =
            [...stageMap.values()]
              .map(
                (tie) =>
                  tie.sort(
                    (a, b) =>
                      a.leg_number -
                      b.leg_number
                  )
              )
              .sort(
                (a, b) =>
                  (
                    a[0]
                      ?.bracket_order ||
                    a[0]
                      ?.match_order ||
                    0
                  )
                  -
                  (
                    b[0]
                      ?.bracket_order ||
                    b[0]
                      ?.match_order ||
                    0
                  )
              )


          result.set(
            stage,
            ties
          )
        }


        return result
      },
      [matches]
    )


  function sideTies(
    stage,
    side
  ) {
    const ties =
      tiesByStage.get(
        stage
      ) || []


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


    /*
     * Fallback for old data.
     */
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
          ) || []
        ).length > 0
    )


  const finalTie =
    (
      tiesByStage.get(
        'final'
      ) || []
    )[0] ||
    null


  const bronzeTie =
    (
      tiesByStage.get(
        'third_place'
      ) || []
    )[0] ||
    null


  const championId =
    participantType ===
    'team'
      ? tournament
          .champion_team_id
      : tournament
          .champion_player_id


  async function handleDragEnd(
    event
  ) {
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


  if (
    matches.filter(
      (match) =>
        [
          ...STAGES,
          'final'
        ].includes(
          match.stage
        )
    ).length === 0
  ) {
    return (
      <section className="bracket-section">

        <div className="bracket-heading">
          <div>
            <p className="eyebrow">
              LIVE KNOCKOUT
            </p>

            <h2>
              Tournament Bracket
            </h2>

            <p>
              The bracket will appear when the knockout stage is generated.
            </p>
          </div>
        </div>

        <div className="bracket-empty">
          No knockout bracket has been generated yet.
        </div>

      </section>
    )
  }


  return (
    <section className="bracket-section">

      <div className="bracket-heading">

        <div>
          <p className="eyebrow">
            LIVE KNOCKOUT
          </p>

          <h2>
            Tournament Bracket
          </h2>

          <p>
            Results advance automatically. Drag an unplayed participant onto another slot in the same round to correct the draw manually.
          </p>
        </div>

        <div className="bracket-live-badge">
          <span />
          Live
        </div>

      </div>


      {error && (
        <div className="bracket-error">
          {error}
        </div>
      )}


      {moving && (
        <div className="bracket-moving">
          Updating bracket...
        </div>
      )}


      <DndContext
        sensors={sensors}
        onDragEnd={
          handleDragEnd
        }
      >

        <div className="bracket-viewport">

          <div className="two-sided-bracket">


            <div className="bracket-wing bracket-left-wing">

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
                    participantType={
                      participantType
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                      participantImages
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
                  />
                )
              )}

            </div>


            <div className="bracket-center">

              <div className="champion-area">

                <div className="champion-trophy">
                  🏆
                </div>

                {championId && (
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
                )}

                <strong>
                  {
                    championId
                      ? participantName(
                          championId
                        )
                      : 'Champion'
                  }
                </strong>

                <span>
                  CHAMPION
                </span>

              </div>


              <div className="center-final">

                <div className="center-title">
                  Final
                </div>

                {finalTie ? (
                  <BracketTie
                    tie={
                      finalTie
                    }
                    participantType={
                      participantType
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                      participantImages
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
                  />
                ) : (
                  <div className="center-tbd">
                    Final TBD.
                  </div>
                )}

              </div>


              {bronzeTie && (
                <div className="center-bronze">

                  <div className="center-title bronze">
                    Bronze Final
                  </div>

                  <BracketTie
                    tie={
                      bronzeTie
                    }
                    participantType={
                      participantType
                    }
                    participantName={
                      participantName
                    }
                    participantImages={
                      participantImages
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
                  />

                </div>
              )}

            </div>


            <div className="bracket-wing bracket-right-wing">

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
                      participantType={
                        participantType
                      }
                      participantName={
                        participantName
                      }
                      participantImages={
                        participantImages
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


function BracketRound({
  title,
  side,
  ties,
  participantName,
  participantImages,
  getParticipantId,
  aggregateScores,
  winnerId
}) {
  return (
    <div
      className={
        `bracket-round-column ${side}`
      }
    >

      <div className="bracket-round-name">
        {title}
      </div>

      <div className="bracket-round-ties">

        {ties.map(
          (tie) => (
            <BracketTie
              key={
                tie[0]
                  .tie_id ||
                tie[0].id
              }
              tie={tie}
              participantName={
                participantName
              }
              participantImages={
                participantImages
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
  getParticipantId,
  aggregateScores,
  winnerId
}) {
  const canonical =
    tie.find(
      (match) =>
        match.leg_number === 1
    ) ||
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
    tie.some(
      (match) =>
        match.status ===
        'completed'
    )


  return (
    <article
      className={
        locked
          ? 'bracket-tie-card locked'
          : 'bracket-tie-card'
      }
    >

      <span className="bracket-tie-label">
        Match {
          canonical
            .bracket_order ||
          canonical
            .match_order ||
          '—'
        }
      </span>


      <BracketSlot
        tieId={
          canonical
            .tie_id
        }
        stage={
          canonical.stage
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
        score={
          completed &&
          firstId
            ? (
                totals.get(
                  firstId
                ) ?? 0
              )
            : null
        }
        winner={
          winner ===
          firstId
        }
        locked={locked}
        manual={
          canonical
            .manual_slot1
        }
      />


      <BracketSlot
        tieId={
          canonical
            .tie_id
        }
        stage={
          canonical.stage
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
        score={
          completed &&
          secondId
            ? (
                totals.get(
                  secondId
                ) ?? 0
              )
            : null
        }
        winner={
          winner ===
          secondId
        }
        locked={locked}
        manual={
          canonical
            .manual_slot2
        }
      />


      {tie.length > 1 && (
        <span className="bracket-aggregate">
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
  score,
  winner,
  locked,
  manual
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
        locked ||
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
        locked,

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
        'bracket-slot',

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

      <span className="slot-drag-handle">
        {
          locked
            ? '•'
            : '⋮⋮'
        }
      </span>

      {
        participantId ? (
          <ParticipantAvatar
            name={name}
            imageUrls={images}
            size="sm"
          />
        ) : (
          <span className="bracket-avatar-spacer" />
        )
      }

      <span className="slot-player">
        {name}

        {manual && (
          <small>
            Manual
          </small>
        )}
      </span>

      <strong>
        {
          score === null
            ? '-'
            : score
        }
      </strong>

    </div>
  )
}


export default BracketSection
