function createRow(
  participant
) {
  return {
    id:
      participant.id,

    name:
      participant.name,

    played:
      0,

    won:
      0,

    drawn:
      0,

    lost:
      0,

    goalsFor:
      0,

    goalsAgainst:
      0,

    goalDifference:
      0,

    points:
      0
  }
}


export function calculateStandings({
  participants,
  matches,
  participantType
}) {
  const table =
    new Map()


  participants.forEach(
    (participant) => {
      table.set(
        participant.id,
        createRow(
          participant
        )
      )
    }
  )


  matches
    .filter(
      (match) =>
        match.status ===
          'completed'
        &&
        match.player1_score !==
          null
        &&
        match.player2_score !==
          null
    )
    .forEach(
      (match) => {
        const firstId =
          participantType ===
          'team'
            ? match.team1_id
            : match.player1_id

        const secondId =
          participantType ===
          'team'
            ? match.team2_id
            : match.player2_id


        const first =
          table.get(
            firstId
          )

        const second =
          table.get(
            secondId
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
          )

        const secondScore =
          Number(
            match.player2_score
          )


        first.played += 1
        second.played += 1


        first.goalsFor +=
          firstScore

        first.goalsAgainst +=
          secondScore


        second.goalsFor +=
          secondScore

        second.goalsAgainst +=
          firstScore


        if (
          firstScore >
          secondScore
        ) {
          first.won += 1
          first.points += 3

          second.lost += 1
        }

        else if (
          secondScore >
          firstScore
        ) {
          second.won += 1
          second.points += 3

          first.lost += 1
        }

        else {
          first.drawn += 1
          second.drawn += 1

          first.points += 1
          second.points += 1
        }
      }
    )


  const standings =
    [...table.values()]
      .map(
        (row) => ({
          ...row,

          goalDifference:
            row.goalsFor -
            row.goalsAgainst
        })
      )


  standings.sort(
    (a, b) => {
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


      return a.name
        .localeCompare(
          b.name
        )
    }
  )


  return standings.map(
    (
      row,
      index
    ) => ({
      ...row,

      position:
        index + 1
    })
  )
}
