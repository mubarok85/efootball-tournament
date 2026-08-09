import {
  randomUUID
} from 'node:crypto'

import {
  Router
} from 'express'

import {
  distributeGroups,
  generateRoundRobin,
  getGroupName,
  isPowerOfTwo
} from '../utils/fixtures.js'

import {
  generateKnockoutBracket
} from '../utils/knockout.js'


const router = Router()


function participantFields(
  participantType,
  home,
  away
) {
  if (
    participantType ===
    'team'
  ) {
    return {
      player1_id: null,
      player2_id: null,

      team1_id:
        home.id,

      team2_id:
        away.id
    }
  }


  return {
    player1_id:
      home.id,

    player2_id:
      away.id,

    team1_id: null,
    team2_id: null
  }
}


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
        'id, name, created_at'
      )
      .eq(
        'tournament_id',
        tournament.id
      )
      .order(
        'created_at',
        {
          ascending: true
        }
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
      'id, name, created_at'
    )
    .eq(
      'tournament_id',
      tournament.id
    )
    .is(
      'team_id',
      null
    )
    .order(
      'created_at',
      {
        ascending: true
      }
    )


  if (error) {
    throw error
  }


  return data || []
}


router.post(
  '/:id/generate-fixtures',
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        supabase,
        user
      } = req


      const {
        data: tournament,
        error:
          tournamentError
      } = await supabase
        .from('tournaments')
        .select('*')
        .eq(
          'id',
          req.params.id
        )
        .eq(
          'owner_id',
          user.id
        )
        .single()


      if (
        tournamentError ||
        !tournament
      ) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found.'
          })
      }


      const {
        count:
          existingMatchCount,
        error:
          matchCountError
      } = await supabase
        .from('matches')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'tournament_id',
          tournament.id
        )


      if (matchCountError) {
        throw matchCountError
      }


      if (
        existingMatchCount > 0
      ) {
        return res
          .status(409)
          .json({
            message:
              'Fixtures have already been generated for this tournament.'
          })
      }


      const participants =
        await loadParticipants(
          supabase,
          tournament
        )


      if (
        participants.length < 2
      ) {
        return res
          .status(400)
          .json({
            message:
              'At least two participants are required.'
          })
      }


      const matchRows = []
      const groupRows = []
      const memberRows = []


      const addMatch = ({
        home,
        away,
        roundNumber,
        stage,
        groupId = null,
        legNumber = 1,
        tieId = null,
        matchOrder = null
      }) => {
        matchRows.push({
          tournament_id:
            tournament.id,

          group_id:
            groupId,

          round_number:
            roundNumber,

          stage,

          leg_number:
            legNumber,

          tie_id:
            tieId,

          match_order:
            matchOrder,

          ...participantFields(
            tournament.participant_type,
            home,
            away
          ),

          status:
            'scheduled'
        })
      }


      if (
        tournament.format ===
        'league'
      ) {
        const fixtures =
          generateRoundRobin(
            participants,
            tournament.double_round_robin
          )


        fixtures.forEach(
          (
            fixture,
            index
          ) => {
            addMatch({
              ...fixture,

              stage:
                'league',

              matchOrder:
                index + 1
            })
          }
        )
      }


      else if (
        tournament.format ===
          'league_final'
        ||
        tournament.format ===
          'league_knockout'
      ) {
        if (
          tournament.format ===
          'league_knockout'
        ) {
          const qualifiers =
            Number(
              tournament.qualifiers_count
            )


          if (
            !isPowerOfTwo(
              qualifiers
            )
            ||
            qualifiers >
              participants.length
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Knockout qualifiers must be a power of two and cannot exceed the number of participants.'
              })
          }
        }


        const fixtures =
          generateRoundRobin(
            participants,
            tournament.double_round_robin
          )


        fixtures.forEach(
          (
            fixture,
            index
          ) => {
            addMatch({
              ...fixture,

              stage:
                'league',

              matchOrder:
                index + 1
            })
          }
        )
      }


      else if (
        tournament.format ===
        'knockout'
      ) {
        if (
          !isPowerOfTwo(
            participants.length
          )
          ||
          participants.length >
            32
        ) {
          return res
            .status(400)
            .json({
              message:
                'Knockout tournaments require 2, 4, 8, 16, or 32 participants.'
            })
        }


        matchRows.push(
          ...generateKnockoutBracket({
            tournamentId:
              tournament.id,

            participants,

            participantType:
              tournament
                .participant_type,

            twoLegged:
              tournament
                .two_legged_knockout
          })
        )
      }


      else if (
        tournament.format ===
          'multi_group_league'
        ||
        tournament.format ===
          'multi_group_tournament'
      ) {
        const groupCount =
          Number(
            tournament
              .number_of_groups
          )


        if (
          !Number.isInteger(
            groupCount
          )
          ||
          groupCount < 2
        ) {
          return res
            .status(400)
            .json({
              message:
                'A valid number of groups is required.'
            })
        }


        if (
          participants.length <
          groupCount * 2
        ) {
          return res
            .status(400)
            .json({
              message:
                'Each group must contain at least two participants.'
            })
        }


        const grouped =
          distributeGroups(
            participants,
            groupCount
          )


        if (
          tournament.format ===
          'multi_group_tournament'
        ) {
          const qualifiersPerGroup =
            Number(
              tournament
                .qualifiers_per_group
            )


          if (
            !Number.isInteger(
              qualifiersPerGroup
            )
            ||
            qualifiersPerGroup < 1
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Qualifiers per group must be at least one.'
              })
          }


          const totalQualifiers =
            groupCount *
            qualifiersPerGroup


          if (
            !isPowerOfTwo(
              totalQualifiers
            )
            ||
            totalQualifiers > 32
          ) {
            return res
              .status(400)
              .json({
                message:
                  'The total number of knockout qualifiers must be 2, 4, 8, 16, or 32.'
              })
          }


          if (
            grouped.some(
              (group) =>
                qualifiersPerGroup >
                group.length
            )
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Qualifiers per group cannot exceed the participants in a group.'
              })
          }
        }


        grouped.forEach(
          (
            groupParticipants,
            groupIndex
          ) => {
            const groupId =
              randomUUID()


            groupRows.push({
              id:
                groupId,

              tournament_id:
                tournament.id,

              name:
                getGroupName(
                  groupIndex
                ),

              group_order:
                groupIndex + 1
            })


            groupParticipants.forEach(
              (
                participant,
                participantIndex
              ) => {
                memberRows.push({
                  tournament_id:
                    tournament.id,

                  group_id:
                    groupId,

                  player_id:
                    tournament
                      .participant_type ===
                    'individual'
                      ? participant.id
                      : null,

                  team_id:
                    tournament
                      .participant_type ===
                    'team'
                      ? participant.id
                      : null,

                  seed_order:
                    participantIndex + 1
                })
              }
            )


            const fixtures =
              generateRoundRobin(
                groupParticipants,
                tournament
                  .double_round_robin
              )


            fixtures.forEach(
              (
                fixture,
                index
              ) => {
                addMatch({
                  ...fixture,

                  stage:
                    'group',

                  groupId,

                  matchOrder:
                    index + 1
                })
              }
            )
          }
        )
      }


      else {
        return res
          .status(400)
          .json({
            message:
              'Unsupported tournament format.'
          })
      }


      if (
        groupRows.length > 0
      ) {
        const {
          error
        } = await supabase
          .from(
            'tournament_groups'
          )
          .insert(
            groupRows
          )

        if (error) {
          throw error
        }
      }


      if (
        memberRows.length > 0
      ) {
        const {
          error
        } = await supabase
          .from(
            'tournament_group_members'
          )
          .insert(
            memberRows
          )

        if (error) {
          throw error
        }
      }


      if (
        matchRows.length > 0
      ) {
        const {
          error
        } = await supabase
          .from('matches')
          .insert(
            matchRows
          )

        if (error) {
          throw error
        }
      }


      const {
        error:
          tournamentUpdateError
      } = await supabase
        .from('tournaments')
        .update({
          status:
            'active'
        })
        .eq(
          'id',
          tournament.id
        )


      if (
        tournamentUpdateError
      ) {
        throw tournamentUpdateError
      }


      return res.json({
        message:
          'Fixtures generated successfully.',

        matches:
          matchRows.length,

        groups:
          groupRows.length
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
