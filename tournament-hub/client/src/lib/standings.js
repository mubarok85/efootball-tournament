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
        const homeId =
          participantType ===
          'team'
            ? match.team1_id
            : match.player1_id

        const awayId =
          participantType ===
          'team'
            ? match.team2_id
            : match.player2_id


        const home =
          table.get(
            homeId
          )

        const away =
          table.get(
            awayId
          )


        if (
          !home ||
          !away
        ) {
          return
        }


        const homeScore =
          Number(
            match.player1_score
          )

        const awayScore =
          Number(
            match.player2_score
          )


        home.played += 1
        away.played += 1


        home.goalsFor +=
          homeScore

        home.goalsAgainst +=
          awayScore


        away.goalsFor +=
          awayScore

        away.goalsAgainst +=
          homeScore


        if (
          homeScore >
          awayScore
        ) {
          home.won += 1
          home.points += 3

          away.lost += 1
        } else if (
          awayScore >
          homeScore
        ) {
          away.won += 1
          away.points += 3

          home.lost += 1
        } else {
          home.drawn += 1
          away.drawn += 1

          home.points += 1
          away.points += 1
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
