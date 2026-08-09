export function isPowerOfTwo(value) {
  return (
    value >= 2 &&
    (value & (value - 1)) === 0
  )
}

export function generateRoundRobin(
  participants,
  doubleRoundRobin = false
) {
  const list = [...participants]

  if (list.length % 2 !== 0) {
    list.push(null)
  }

  const rounds = []
  const totalRounds = list.length - 1
  const matchesPerRound =
    list.length / 2

  for (
    let round = 0;
    round < totalRounds;
    round += 1
  ) {
    const matches = []

    for (
      let index = 0;
      index < matchesPerRound;
      index += 1
    ) {
      let home = list[index]
      let away =
        list[
          list.length - 1 - index
        ]

      if (!home || !away) {
        continue
      }

      if (
        round % 2 === 1 &&
        index === 0
      ) {
        ;[home, away] =
          [away, home]
      }

      matches.push({
        roundNumber:
          round + 1,

        home,

        away
      })
    }

    rounds.push(...matches)

    const fixed = list[0]

    const rotating =
      list.slice(1)

    rotating.unshift(
      rotating.pop()
    )

    list.splice(
      0,
      list.length,
      fixed,
      ...rotating
    )
  }

  if (!doubleRoundRobin) {
    return rounds
  }

  const secondLeg =
    rounds.map((match) => ({
      roundNumber:
        match.roundNumber +
        totalRounds,

      home:
        match.away,

      away:
        match.home
    }))

  return [
    ...rounds,
    ...secondLeg
  ]
}


export function distributeGroups(
  participants,
  groupCount
) {
  const groups =
    Array.from(
      {
        length: groupCount
      },
      () => []
    )

  participants.forEach(
    (
      participant,
      index
    ) => {
      groups[
        index % groupCount
      ].push(participant)
    }
  )

  return groups
}


export function getGroupName(index) {
  let value = index
  let name = ''

  do {
    name =
      String.fromCharCode(
        65 + (value % 26)
      ) + name

    value =
      Math.floor(value / 26) - 1
  } while (value >= 0)

  return `Group ${name}`
}


export function getKnockoutStage(
  participantCount
) {
  const stages = {
    2: 'final',
    4: 'semi_final',
    8: 'quarter_final',
    16: 'round_of_16',
    32: 'round_of_32'
  }

  return stages[
    participantCount
  ] || null
}


export function generateKnockoutRound(
  participants,
  twoLegged = false
) {
  if (
    !isPowerOfTwo(
      participants.length
    )
  ) {
    throw new Error(
      'Knockout participants must be 2, 4, 8, 16, or 32.'
    )
  }

  if (
    participants.length > 32
  ) {
    throw new Error(
      'Maximum supported knockout size is 32 participants.'
    )
  }

  const stage =
    getKnockoutStage(
      participants.length
    )

  const matches = []

  const pairCount =
    participants.length / 2

  for (
    let index = 0;
    index < pairCount;
    index += 1
  ) {
    const home =
      participants[index]

    const away =
      participants[
        participants.length -
        1 -
        index
      ]

    const tieId =
      crypto.randomUUID()

    matches.push({
      roundNumber: 1,
      matchOrder:
        index + 1,
      stage,
      legNumber: 1,
      tieId,
      home,
      away
    })

    if (
      twoLegged &&
      stage !== 'final'
    ) {
      matches.push({
        roundNumber: 1,
        matchOrder:
          index + 1,
        stage,
        legNumber: 2,
        tieId,
        home: away,
        away: home
      })
    }
  }

  return matches
}
