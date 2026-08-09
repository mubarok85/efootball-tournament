import {
  randomInt,
  randomUUID
} from 'node:crypto'


const STAGE_BY_SIZE = {
  32: 'round_of_32',
  16: 'round_of_16',
  8: 'quarter_final',
  4: 'semi_final',
  2: 'final'
}


export function nextPowerOfTwo(
  value
) {
  let size = 2

  while (
    size < value
  ) {
    size *= 2
  }

  return size
}


function shuffleParticipants(
  participants
) {
  const result = [
    ...participants
  ]


  for (
    let index =
      result.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      randomInt(
        index + 1
      )

    ;[
      result[index],
      result[swapIndex]
    ] = [
      result[swapIndex],
      result[index]
    ]
  }


  return result
}


/*
 * Standard seeded bracket order.
 *
 * 8 slots:
 * 1, 8.
 * 4, 5.
 * 2, 7.
 * 3, 6.
 *
 * This spreads strong seeds
 * and therefore spreads byes
 * across both sides.
 */
function buildSeedOrder(
  size
) {
  if (size === 2) {
    return [
      1,
      2
    ]
  }


  let seeds = [
    1,
    2
  ]


  while (
    seeds.length <
    size
  ) {
    const sum =
      seeds.length * 2 + 1

    seeds =
      seeds.flatMap(
        (seed) => [
          seed,
          sum - seed
        ]
      )
  }


  return seeds
}


function participantFields({
  participantType,
  first,
  second,
  reverse = false
}) {
  const participantOne =
    reverse
      ? second
      : first

  const participantTwo =
    reverse
      ? first
      : second


  if (
    participantType ===
    'team'
  ) {
    return {
      player1_id: null,
      player2_id: null,

      team1_id:
        participantOne?.id ||
        null,

      team2_id:
        participantTwo?.id ||
        null
    }
  }


  return {
    player1_id:
      participantOne?.id ||
      null,

    player2_id:
      participantTwo?.id ||
      null,

    team1_id: null,
    team2_id: null
  }
}


function getParticipantId(
  row,
  participantType,
  physicalSlot
) {
  if (
    participantType ===
    'team'
  ) {
    return physicalSlot === 1
      ? row.team1_id
      : row.team2_id
  }


  return physicalSlot === 1
    ? row.player1_id
    : row.player2_id
}


function setWinner(
  row,
  participantType,
  participantId
) {
  if (
    participantType ===
    'team'
  ) {
    row.winner_team_id =
      participantId

    row.winner_player_id =
      null
  } else {
    row.winner_player_id =
      participantId

    row.winner_team_id =
      null
  }
}


function setLogicalSlot({
  rows,
  tieId,
  logicalSlot,
  participantType,
  participantId
}) {
  rows
    .filter(
      (row) =>
        row.tie_id ===
        tieId
    )
    .forEach(
      (row) => {
        let physicalSlot =
          logicalSlot


        if (
          row.leg_number ===
          2
        ) {
          physicalSlot =
            logicalSlot === 1
              ? 2
              : 1
        }


        if (
          participantType ===
          'team'
        ) {
          if (
            physicalSlot === 1
          ) {
            row.team1_id =
              participantId
          } else {
            row.team2_id =
              participantId
          }

          return
        }


        if (
          physicalSlot === 1
        ) {
          row.player1_id =
            participantId
        } else {
          row.player2_id =
            participantId
        }
      }
    )
}


function bracketPosition(
  roundSize,
  tieIndex
) {
  if (
    roundSize === 2
  ) {
    return {
      bracketSide:
        'center',

      bracketOrder:
        1
    }
  }


  const tieCount =
    roundSize / 2

  const tiesPerSide =
    tieCount / 2


  if (
    tieIndex <
    tiesPerSide
  ) {
    return {
      bracketSide:
        'left',

      bracketOrder:
        tieIndex + 1
    }
  }


  return {
    bracketSide:
      'right',

    bracketOrder:
      tieIndex -
      tiesPerSide +
      1
  }
}


export function generateKnockoutBracket({
  tournamentId,
  participants,
  participantType,
  twoLegged = false,
  shuffle = true
}) {
  const count =
    participants.length


  if (
    count < 2 ||
    count > 32
  ) {
    throw new Error(
      'Knockout stages currently support between 2 and 32 participants.'
    )
  }


  const bracketSize =
    nextPowerOfTwo(
      count
    )


  const participantOrder =
    shuffle
      ? shuffleParticipants(
          participants
        )
      : [
          ...participants
        ]


  const seedOrder =
    buildSeedOrder(
      bracketSize
    )


  const roundSizes = []

  let roundSize =
    bracketSize


  while (
    roundSize >= 2
  ) {
    roundSizes.push(
      roundSize
    )

    roundSize /= 2
  }


  const tieRounds =
    roundSizes.map(
      (size) =>
        Array.from(
          {
            length:
              size / 2
          },
          () =>
            randomUUID()
        )
    )


  const rows = []


  roundSizes.forEach(
    (
      size,
      roundIndex
    ) => {
      const stage =
        STAGE_BY_SIZE[
          size
        ]

      const ties =
        tieRounds[
          roundIndex
        ]


      ties.forEach(
        (
          tieId,
          tieIndex
        ) => {
          let first = null
          let second = null


          if (
            roundIndex === 0
          ) {
            const firstSeed =
              seedOrder[
                tieIndex * 2
              ]

            const secondSeed =
              seedOrder[
                tieIndex * 2 + 1
              ]


            first =
              participantOrder[
                firstSeed - 1
              ] ||
              null

            second =
              participantOrder[
                secondSeed - 1
              ] ||
              null
          }


          const {
            bracketSide,
            bracketOrder
          } =
            bracketPosition(
              size,
              tieIndex
            )


          const hasNextRound =
            roundIndex <
            tieRounds.length - 1


          const nextTieId =
            hasNextRound
              ? tieRounds[
                  roundIndex + 1
                ][
                  Math.floor(
                    tieIndex / 2
                  )
                ]
              : null


          const nextSlot =
            hasNextRound
              ? (
                  tieIndex % 2 === 0
                    ? 1
                    : 2
                )
              : null


          const isOpeningBye =
            roundIndex === 0
            &&
            Boolean(first) !==
              Boolean(second)


          const legCount =
            isOpeningBye
              ? 1
              : (
                  twoLegged &&
                  stage !== 'final'
                    ? 2
                    : 1
                )


          for (
            let leg = 1;
            leg <= legCount;
            leg += 1
          ) {
            rows.push({
              id:
                randomUUID(),

              tournament_id:
                tournamentId,

              round_number:
                roundIndex + 1,

              stage,

              tie_id:
                tieId,

              next_tie_id:
                nextTieId,

              next_slot:
                nextSlot,

              leg_number:
                leg,

              match_order:
                tieIndex + 1,

              bracket_side:
                bracketSide,

              bracket_order:
                bracketOrder,

              manual_slot1:
                false,

              manual_slot2:
                false,

              ...participantFields({
                participantType,

                first,

                second,

                reverse:
                  leg === 2
              }),

              player1_score:
                null,

              player2_score:
                null,

              player1_penalty_score:
                null,

              player2_penalty_score:
                null,

              winner_player_id:
                null,

              winner_team_id:
                null,

              completed_at:
                null,

              status:
                'scheduled'
            })
          }
        }
      )
    }
  )


  /*
   * Resolve automatic byes.
   *
   * A bye is represented as a
   * completed bracket position
   * without a played score.
   *
   * Its participant is immediately
   * inserted into the next tie.
   */
  const openingTieIds =
    tieRounds[0]


  openingTieIds.forEach(
    (tieId) => {
      const tieRows =
        rows.filter(
          (row) =>
            row.tie_id ===
            tieId
        )


      const canonical =
        tieRows.find(
          (row) =>
            row.leg_number === 1
        )


      if (!canonical) {
        return
      }


      const firstId =
        getParticipantId(
          canonical,
          participantType,
          1
        )

      const secondId =
        getParticipantId(
          canonical,
          participantType,
          2
        )


      const isBye =
        Boolean(firstId) !==
        Boolean(secondId)


      if (!isBye) {
        return
      }


      const winnerId =
        firstId ||
        secondId


      tieRows.forEach(
        (row) => {
          row.status =
            'completed'

          row.completed_at =
            new Date()
              .toISOString()

          setWinner(
            row,
            participantType,
            winnerId
          )
        }
      )


      if (
        canonical.next_tie_id &&
        canonical.next_slot
      ) {
        setLogicalSlot({
          rows,

          tieId:
            canonical.next_tie_id,

          logicalSlot:
            canonical.next_slot,

          participantType,

          participantId:
            winnerId
        })
      }
    }
  )


  return rows
}
