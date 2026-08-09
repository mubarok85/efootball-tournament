import {
  calculateStandings
} from './standings.js'

import {
  generateKnockoutBracket
} from './knockout.js'


const KNOCKOUT_STAGES = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
]


async function loadParticipants(
  supabase,
  tournament
) {
  if (
    tournament.participant_type ===
    'team'
  ) {
    const {
      data,
      error
    } = await supabase
      .from(
        'tournament_teams'
      )
      .select(
        'id, name'
      )
      .eq(
        'tournament_id',
        tournament.id
      )


    if (error) {
      throw error
    }


    return data || []
  }


  const {
    data,
    error
  } = await supabase
    .from(
      'tournament_players'
    )
    .select(
      'id, name'
    )
    .eq(
      'tournament_id',
      tournament.id
    )
    .is(
      'team_id',
      null
    )


  if (error) {
    throw error
  }


  return data || []
}


async function knockoutAlreadyExists(
  supabase,
  tournamentId
) {
  const {
    count,
    error
  } = await supabase
    .from('matches')
    .select(
      'id',
      {
        count:
          'exact',

        head:
          true
      }
    )
    .eq(
      'tournament_id',
      tournamentId
    )
    .in(
      'stage',
      KNOCKOUT_STAGES
    )


  if (error) {
    throw error
  }


  return count > 0
}


async function createKnockout({
  supabase,
  tournament,
  participants
}) {
  if (
    participants.length < 2
  ) {
    throw new Error(
      'At least two qualified participants are required for the knockout stage.'
    )
  }


  if (
    participants.length > 32
  ) {
    throw new Error(
      'The current knockout bracket supports a maximum of 32 qualified participants.'
    )
  }


  const rows =
    generateKnockoutBracket({
      tournamentId:
        tournament.id,

      participants,

      participantType:
        tournament
          .participant_type,

      twoLegged:
        tournament
          .two_legged_knockout,

      /*
       * Qualification standings
       * already determine seeding.
       */
      shuffle:
        false
    })


  const {
    error
  } = await supabase
    .from('matches')
    .insert(
      rows
    )


  if (error) {
    throw error
  }


  return rows.length
}


async function progressLeague({
  supabase,
  tournament
}) {
  const {
    data: matches,
    error:
      matchesError
  } = await supabase
    .from('matches')
    .select('*')
    .eq(
      'tournament_id',
      tournament.id
    )
    .eq(
      'stage',
      'league'
    )


  if (matchesError) {
    throw matchesError
  }


  if (
    !matches?.length
    ||
    matches.some(
      (match) =>
        match.status !==
        'completed'
    )
  ) {
    return {
      generated:
        false,

      reason:
        'league_in_progress'
    }
  }


  const participants =
    await loadParticipants(
      supabase,
      tournament
    )


  const standings =
    calculateStandings({
      participants,

      matches,

      participantType:
        tournament
          .participant_type
    })


  let qualifierCount =
    0


  if (
    tournament.format ===
    'league_final'
  ) {
    qualifierCount = 2
  }


  if (
    tournament.format ===
    'league_knockout'
  ) {
    qualifierCount =
      Number(
        tournament
          .qualifiers_count
      )
  }


  if (
    !Number.isInteger(
      qualifierCount
    )
    ||
    qualifierCount < 2
    ||
    qualifierCount >
      participants.length
    ||
    qualifierCount > 32
  ) {
    throw new Error(
      'The configured number of league qualifiers is invalid.'
    )
  }


  const qualified =
    standings
      .slice(
        0,
        qualifierCount
      )
      .map(
        (row) => ({
          id:
            row.id,

          name:
            row.name
        })
      )


  const createdMatches =
    await createKnockout({
      supabase,
      tournament,
      participants:
        qualified
    })


  return {
    generated:
      true,

    source:
      'league',

    qualified:
      qualified.length,

    matches:
      createdMatches
  }
}


async function progressGroups({
  supabase,
  tournament
}) {
  const [
    groupResult,
    memberResult,
    matchResult
  ] =
    await Promise.all([

      supabase
        .from(
          'tournament_groups'
        )
        .select('*')
        .eq(
          'tournament_id',
          tournament.id
        )
        .order(
          'group_order',
          {
            ascending:
              true
          }
        ),

      supabase
        .from(
          'tournament_group_members'
        )
        .select('*')
        .eq(
          'tournament_id',
          tournament.id
        ),

      supabase
        .from('matches')
        .select('*')
        .eq(
          'tournament_id',
          tournament.id
        )
        .eq(
          'stage',
          'group'
        )
    ])


  if (groupResult.error) {
    throw groupResult.error
  }

  if (memberResult.error) {
    throw memberResult.error
  }

  if (matchResult.error) {
    throw matchResult.error
  }


  const groups =
    groupResult.data || []

  const members =
    memberResult.data || []

  const matches =
    matchResult.data || []


  if (
    groups.length === 0 ||
    matches.length === 0
  ) {
    return {
      generated:
        false,

      reason:
        'groups_not_ready'
    }
  }


  if (
    matches.some(
      (match) =>
        match.status !==
        'completed'
    )
  ) {
    return {
      generated:
        false,

      reason:
        'group_stage_in_progress'
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
    throw new Error(
      'Qualifiers per group is invalid.'
    )
  }


  const participants =
    await loadParticipants(
      supabase,
      tournament
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


  const qualified = []


  for (
    const group of groups
  ) {
    const groupMembers =
      members.filter(
        (member) =>
          member.group_id ===
          group.id
      )


    const groupParticipants =
      groupMembers
        .map(
          (member) => {
            const id =
              tournament
                .participant_type ===
              'team'
                ? member.team_id
                : member.player_id

            return (
              participantMap.get(
                id
              ) ||
              null
            )
          }
        )
        .filter(Boolean)


    if (
      qualifierCount >
      groupParticipants.length
    ) {
      throw new Error(
        `${group.name} does not contain enough participants for the configured qualification count.`
      )
    }


    const groupMatches =
      matches.filter(
        (match) =>
          match.group_id ===
          group.id
      )


    const standings =
      calculateStandings({
        participants:
          groupParticipants,

        matches:
          groupMatches,

        participantType:
          tournament
            .participant_type
      })


    standings
      .slice(
        0,
        qualifierCount
      )
      .forEach(
        (row) => {
          qualified.push({
            id:
              row.id,

            name:
              row.name,

            groupPosition:
              row.position,

            groupOrder:
              group.group_order,

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
   * Seeding priority:
   *
   * Group position.
   * Points.
   * Goal difference.
   * Goals for.
   *
   * This means group winners
   * receive stronger seeds than
   * second, third, fourth place.
   */
  qualified.sort(
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
    qualified.length < 2
    ||
    qualified.length > 32
  ) {
    throw new Error(
      'The total number of qualified participants must be between 2 and 32.'
    )
  }


  const seededParticipants =
    qualified.map(
      (participant) => ({
        id:
          participant.id,

        name:
          participant.name
      })
    )


  const createdMatches =
    await createKnockout({
      supabase,

      tournament,

      participants:
        seededParticipants
    })


  return {
    generated:
      true,

    source:
      'groups',

    qualified:
      seededParticipants.length,

    matches:
      createdMatches
  }
}


export async function maybeGenerateNextStage({
  supabase,
  tournamentId
}) {
  const {
    data: tournament,
    error:
      tournamentError
  } = await supabase
    .from('tournaments')
    .select('*')
    .eq(
      'id',
      tournamentId
    )
    .single()


  if (
    tournamentError ||
    !tournament
  ) {
    throw (
      tournamentError ||
      new Error(
        'Tournament not found.'
      )
    )
  }


  if (
    ![
      'league_final',
      'league_knockout',
      'multi_group_tournament'
    ].includes(
      tournament.format
    )
  ) {
    return {
      generated:
        false,

      reason:
        'format_has_no_next_stage'
    }
  }


  if (
    await knockoutAlreadyExists(
      supabase,
      tournament.id
    )
  ) {
    return {
      generated:
        false,

      reason:
        'knockout_already_generated'
    }
  }


  if (
    tournament.format ===
      'league_final'
    ||
    tournament.format ===
      'league_knockout'
  ) {
    return progressLeague({
      supabase,
      tournament
    })
  }


  return progressGroups({
    supabase,
    tournament
  })
}
