import { Router } from 'express'

import {
  distributeGroups,
  generateKnockoutRound,
  generateRoundRobin,
  getGroupName,
  isPowerOfTwo
} from '../utils/fixtures.js'

const router = Router()


function participantFields(
  participantType,
  home,
  away
) {
  if (
    participantType === 'team'
  ) {
    return {
      player1_id: null,
      player2_id: null,

      team1_id: home.id,
      team2_id: away.id
    }
  }

  return {
    player1_id: home.id,
    player2_id: away.id,

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
      .from('tournament_teams')
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
    .from('tournament_players')
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
  async (req, res, next) => {
    try {
      const {
        supabase,
        user
      } = req

      const {
        data: tournament,
        error: tournamentError
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
        count: existingMatchCount,
        error: matchCountError
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

      let groupCount = 0

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


      if (
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


      if (
        tournament.format ===
        'knockout'
      ) {
        const fixtures =
          generateKnockoutRound(
            participants,
            tournament.two_legged_knockout
          )

        fixtures.forEach(
          (fixture) => {
            addMatch(
              fixture
            )
          }
        )
      }


      if (
        tournament.format ===
        'multi_group_league'
        ||
        tournament.format ===
        'multi_group_tournament'
      ) {
        const requestedGroups =
          Number(
            tournament.number_of_groups
          )

        if (
          !requestedGroups
          ||
          requestedGroups < 2
          ||
          requestedGroups >
            participants.length
        ) {
          return res
            .status(400)
            .json({
              message:
                'Invalid number of groups.'
            })
        }

        const distributed =
          distributeGroups(
            participants,
            requestedGroups
          )

        if (
          tournament.format ===
          'multi_group_tournament'
        ) {
          const qualifiersPerGroup =
            Number(
              tournament.qualifiers_per_group
            )

          const smallestGroup =
            Math.min(
              ...distributed.map(
                (group) =>
                  group.length
              )
            )

          const totalQualifiers =
            qualifiersPerGroup *
            requestedGroups

          if (
            qualifiersPerGroup < 1
            ||
            qualifiersPerGroup >
              smallestGroup
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Qualifiers per group cannot exceed the smallest group size.'
              })
          }

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
                  'Total knockout qualifiers must equal 2, 4, 8, 16, or 32.'
              })
          }
        }

        const groupRows =
          distributed.map(
            (
              group,
              index
            ) => ({
              tournament_id:
                tournament.id,

              name:
                getGroupName(
                  index
                ),

              group_order:
                index + 1
            })
          )

        const {
          data: createdGroups,
          error: groupError
        } = await supabase
          .from(
            'tournament_groups'
          )
          .insert(
            groupRows
          )
          .select()

        if (groupError) {
          throw groupError
        }

        groupCount =
          createdGroups.length

        const memberRows = []

        createdGroups.forEach(
          (
            group,
            groupIndex
          ) => {
            distributed[
              groupIndex
            ].forEach(
              (
                participant,
                participantIndex
              ) => {
                memberRows.push({
                  tournament_id:
                    tournament.id,

                  group_id:
                    group.id,

                  player_id:
                    tournament.participant_type ===
                    'individual'
                      ? participant.id
                      : null,

                  team_id:
                    tournament.participant_type ===
                    'team'
                      ? participant.id
                      : null,

                  seed_order:
                    participantIndex +
                    1
                })
              }
            )
          }
        )

        const {
          error: memberError
        } = await supabase
          .from(
            'tournament_group_members'
          )
          .insert(
            memberRows
          )

        if (memberError) {
          throw memberError
        }

        createdGroups.forEach(
          (
            group,
            groupIndex
          ) => {
            const fixtures =
              generateRoundRobin(
                distributed[
                  groupIndex
                ],
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
                    'group',

                  groupId:
                    group.id,

                  matchOrder:
                    index + 1
                })
              }
            )
          }
        )
      }


      if (
        matchRows.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              'No fixtures were generated.'
          })
      }


      const {
        data: createdMatches,
        error: matchError
      } = await supabase
        .from('matches')
        .insert(matchRows)
        .select()

      if (matchError) {
        throw matchError
      }


      const {
        error: statusError
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

      if (statusError) {
        throw statusError
      }


      return res.json({
        message:
          'Fixtures generated successfully.',

        format:
          tournament.format,

        participants:
          participants.length,

        groups:
          groupCount,

        matches:
          createdMatches.length
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
