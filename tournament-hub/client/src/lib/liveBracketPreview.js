import {
  calculateStandings
} from './standings'


const STAGE_BY_SIZE = {
  32: 'round_of_32',
  16: 'round_of_16',
  8: 'quarter_final',
  4: 'semi_final',
  2: 'final'
}


function nextPowerOfTwo(
  value
) {
  let size = 2

  while (size < value) {
    size *= 2
  }

  return size
}


function buildSeedOrder(
  size
) {
  if (size === 2) {
    return [1, 2]
  }


  let seeds = [1, 2]


  while (
    seeds.length < size
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


function bracketPosition(
  roundSize,
  tieIndex
) {
  if (roundSize === 2) {
    return {
      bracket_side:
        'center',

      bracket_order:
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
      bracket_side:
        'left',

      bracket_order:
        tieIndex + 1
    }
  }


  return {
    bracket_side:
      'right',

    bracket_order:
      tieIndex -
      tiesPerSide +
      1
  }
}


function participantFields(
  participantType,
  first,
  second
) {
  if (
    participantType ===
    'team'
  ) {
    return {
      player1_id: null,
      player2_id: null,

      team1_id:
        first?.id ||
        null,

      team2_id:
        second?.id ||
        null
    }
  }


  return {
    player1_id:
      first?.id ||
      null,

    player2_id:
      second?.id ||
      null,

    team1_id: null,
    team2_id: null
  }
}


function getParticipantId(
  match,
  participantType,
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


function setParticipantSlot(
  match,
  participantType,
  slot,
  participantId
) {
  if (
    participantType ===
    'team'
  ) {
    if (slot === 1) {
      match.team1_id =
        participantId
    } else {
      match.team2_id =
        participantId
    }

    return
  }


  if (slot === 1) {
    match.player1_id =
      participantId
  } else {
    match.player2_id =
      participantId
  }
}


export function buildLiveGroupBracket({
  tournament,
  players,
  teams,
  groups,
  groupMembers,
  matches
}) {
  if (
    tournament.format !==
    'multi_group_tournament'
  ) {
    return {
      matches: [],
      qualifiers: [],
      projected: false
    }
  }


  const qualifierCount =
    Number(
      tournament
        .qualifiers_per_group
    )


  if (
    !Number.isInteger(
      qualifierCount
    )
    ||
    qualifierCount < 1
  ) {
    return {
      matches: [],
      qualifiers: [],
      projected: false
    }
  }


  const participantType =
    tournament
      .participant_type


  const participants =
    participantType ===
    'team'
      ? teams
      : players.filter(
          (player) =>
            !player.team_id
        )


  const participantMap =
    new Map(
      participants.map(
        (participant) => [
          participant.id,
          participant
        ]
      )
    )


  const projectedQualifiers = []


  for (
    const group of groups
  ) {
    const members =
      groupMembers.filter(
        (member) =>
          member.group_id ===
          group.id
      )


    const groupParticipants =
      members
        .map(
          (member) => {
            const id =
              participantType ===
              'team'
                ? member.team_id
                : member.player_id


            return (
              participantMap.get(id) ||
              null
            )
          }
        )
        .filter(Boolean)


    const groupMatches =
      matches.filter(
        (match) =>
          match.stage ===
            'group'
          &&
          match.group_id ===
            group.id
      )


    const standings =
      calculateStandings({
        participants:
          groupParticipants,

        matches:
          groupMatches,

        participantType
      })


    standings
      .slice(
        0,
        qualifierCount
      )
      .forEach(
        (row) => {
          projectedQualifiers.push({
            id:
              row.id,

            name:
              row.name,

            groupId:
              group.id,

            groupName:
              group.name,

            groupOrder:
              group.group_order,

            groupPosition:
              row.position,

            points:
              row.points,

            goalDifference:
              row.goalDifference,

            goalsFor:
              row.goalsFor
          })
        }
      )
  }


  /*
   * Same seeding logic as the
   * backend qualification engine.
   *
   * 1. Group position.
   * 2. Points.
   * 3. Goal difference.
   * 4. Goals for.
   * 5. Group order.
   */
  projectedQualifiers.sort(
    (a, b) => {
      if (
        a.groupPosition !==
        b.groupPosition
      ) {
        return (
          a.groupPosition -
          b.groupPosition
        )
      }


      if (
        b.points !==
        a.points
      ) {
        return (
          b.points -
          a.points
        )
      }


      if (
        b.goalDifference !==
        a.goalDifference
      ) {
        return (
          b.goalDifference -
          a.goalDifference
        )
      }


      if (
        b.goalsFor !==
        a.goalsFor
      ) {
        return (
          b.goalsFor -
          a.goalsFor
        )
      }


      return (
        a.groupOrder -
        b.groupOrder
      )
    }
  )


  if (
    projectedQualifiers.length < 2
    ||
    projectedQualifiers.length > 32
  ) {
    return {
      matches: [],
      qualifiers:
        projectedQualifiers,
      projected: true
    }
  }


  const bracketSize =
    nextPowerOfTwo(
      projectedQualifiers.length
    )


  const seedOrder =
    buildSeedOrder(
      bracketSize
    )


  const roundSizes = []

  let currentSize =
    bracketSize


  while (
    currentSize >= 2
  ) {
    roundSizes.push(
      currentSize
    )

    currentSize /= 2
  }


  const tieRounds =
    roundSizes.map(
      (
        roundSize,
        roundIndex
      ) =>
        Array.from(
          {
            length:
              roundSize / 2
          },
          (
            _,
            tieIndex
          ) =>
            `preview-${roundIndex}-${tieIndex}`
        )
    )


  const previewMatches = []


  roundSizes.forEach(
    (
      roundSize,
      roundIndex
    ) => {
      const stage =
        STAGE_BY_SIZE[
          roundSize
        ]


      tieRounds[
        roundIndex
      ].forEach(
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
              projectedQualifiers[
                firstSeed - 1
              ] ||
              null

            second =
              projectedQualifiers[
                secondSeed - 1
              ] ||
              null
          }


          const hasNext =
            roundIndex <
            tieRounds.length - 1


          const nextTieId =
            hasNext
              ? tieRounds[
                  roundIndex + 1
                ][
                  Math.floor(
                    tieIndex / 2
                  )
                ]
              : null


          const nextSlot =
            hasNext
              ? (
                  tieIndex % 2 === 0
                    ? 1
                    : 2
                )
              : null


          previewMatches.push({
            id:
              `preview-match-${roundIndex}-${tieIndex}`,

            tournament_id:
              tournament.id,

            stage,

            tie_id:
              tieId,

            next_tie_id:
              nextTieId,

            next_slot:
              nextSlot,

            round_number:
              roundIndex + 1,

            match_order:
              tieIndex + 1,

            leg_number:
              1,

            ...bracketPosition(
              roundSize,
              tieIndex
            ),

            ...participantFields(
              participantType,
              first,
              second
            ),

            player1_score: null,
            player2_score: null,

            winner_player_id: null,
            winner_team_id: null,

            manual_slot1: false,
            manual_slot2: false,

            status:
              'projected',

            is_preview:
              true
          })
        }
      )
    }
  )


  /*
   * Immediately push projected
   * bye participants into the
   * next projected round.
   */
  const openingRound =
    previewMatches.filter(
      (match) =>
        match.round_number ===
        1
    )


  openingRound.forEach(
    (match) => {
      const first =
        getParticipantId(
          match,
          participantType,
          1
        )

      const second =
        getParticipantId(
          match,
          participantType,
          2
        )


      if (
        Boolean(first) ===
        Boolean(second)
      ) {
        return
      }


      const byeWinner =
        first ||
        second


      if (
        !match.next_tie_id ||
        !match.next_slot
      ) {
        return
      }


      const nextMatch =
        previewMatches.find(
          (candidate) =>
            candidate.tie_id ===
            match.next_tie_id
        )


      if (!nextMatch) {
        return
      }


      setParticipantSlot(
        nextMatch,
        participantType,
        match.next_slot,
        byeWinner
      )
  })


  return {
    matches:
      previewMatches,

    qualifiers:
      projectedQualifiers,

    projected:
      true
  }
}
