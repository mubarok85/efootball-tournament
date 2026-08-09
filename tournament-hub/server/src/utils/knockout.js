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


export function isPowerOfTwo(value) {
  return (
    value >= 2 &&
    (value & (value - 1)) === 0
  )
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


function bracketPosition(
  roundSize,
  tieIndex
) {
  if (roundSize === 2) {
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
  twoLegged = false
}) {
  const count =
    participants.length


  if (
    !isPowerOfTwo(count)
    ||
    count > 32
  ) {
    throw new Error(
      'Knockout tournaments require 2, 4, 8, 16, or 32 participants.'
    )
  }


  /*
   * The draw happens once here.
   *
   * After these rows are saved,
   * refreshing the application will
   * never reshuffle the bracket.
   */
  const draw =
    shuffleParticipants(
      participants
    )


  const roundSizes = []

  let size = count

  while (size >= 2) {
    roundSizes.push(size)

    size /= 2
  }


  const tieRounds =
    roundSizes.map(
      (roundSize) =>
        Array.from(
          {
            length:
              roundSize / 2
          },
          () =>
            randomUUID()
        )
    )


  const rows = []


  roundSizes.forEach(
    (
      roundSize,
      roundIndex
    ) => {
      const stage =
        STAGE_BY_SIZE[
          roundSize
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


          /*
           * Only the opening round
           * receives participants.
           *
           * Future rounds start TBD.
           */
          if (
            roundIndex === 0
          ) {
            first =
              draw[
                tieIndex
              ]

            second =
              draw[
                count -
                1 -
                tieIndex
              ]
          }


          const {
            bracketSide,
            bracketOrder
          } =
            bracketPosition(
              roundSize,
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


          const legCount =
            twoLegged &&
            stage !== 'final'
              ? 2
              : 1


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

              status:
                'scheduled'
            })
          }
        }
      )
    }
  )


  return rows
}
