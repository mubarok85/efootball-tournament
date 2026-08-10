import {
  Router
} from 'express'

import {
  generateRoundRobin
} from '../utils/fixtures.js'

import {
  generateKnockoutBracket
} from '../utils/knockout.js'



import {
  requirePlatformAdmin
} from '../middleware/platformAdmin.js'

import {
  supabaseAdmin
} from '../lib/supabaseAdmin.js'

const router = Router()


/*
 * PESLOVER TOURNAMENT ADMIN MIDDLEWARE
 *
 * Approved:
 * - super_admin
 * - admin
 * - organizer
 *
 * platformAdmin middleware verifies the bearer token
 * and approved administrator profile.
 */
router.use(
  requirePlatformAdmin
)


router.use(
  (
    req,
    _res,
    next
  ) => {
    /*
     * Administrative database work is executed with
     * the server-only service-role client.
     *
     * Authorization is still explicitly enforced
     * below before tournament access is granted.
     */
    req.supabase =
      supabaseAdmin

    req.user =
      req.platformAdmin.user

    next()
  }
)


const KNOCKOUT_STAGES = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
]


/*
 * PESLOVER TOURNAMENT ACCESS POLICY
 */

function hasPlatformTournamentAccess(
  role
) {
  return (
    role === 'super_admin'
    ||
    role === 'admin'
  )
}


async function loadTournament(
  supabase,
  tournamentId,
  userId,
  role = null
) {
  let query =
    supabase
      .from('tournaments')
      .select('*')
      .eq(
        'id',
        tournamentId
      )


  /*
   * Admin and Super Admin:
   * any tournament.
   *
   * Organizer:
   * only their own tournament.
   */
  if (
    !hasPlatformTournamentAccess(
      role
    )
  ) {
    query =
      query.eq(
        'owner_id',
        userId
      )
  }


  const {
    data,
    error
  } =
    await query
      .maybeSingle()


  if (
    error ||
    !data
  ) {
    return null
  }


  return data
}


/*
 * =====================================================
 * ADMINISTRATIVE TOURNAMENT VIEW
 * =====================================================
 */

router.get(
  '/:id/manage',
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

      const role =
        req
          .platformAdmin
          .profile
          .role


      const tournament =
        await loadTournament(
          supabase,
          req.params.id,
          user.id,
          role
        )


      if (!tournament) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found or you do not have permission to manage it.'
          })
      }


      const [
        playerResult,
        teamResult,
        groupResult,
        memberResult,
        matchResult
      ] =
        await Promise.all([

          supabase
            .from(
              'tournament_players'
            )
            .select('*')
            .eq(
              'tournament_id',
              tournament.id
            )
            .order(
              'created_at',
              {
                ascending: true
              }
            ),

          supabase
            .from(
              'tournament_teams'
            )
            .select('*')
            .eq(
              'tournament_id',
              tournament.id
            )
            .order(
              'created_at',
              {
                ascending: true
              }
            ),

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
                ascending: true
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
            )
            .order(
              'seed_order',
              {
                ascending: true
              }
            ),

          supabase
            .from('matches')
            .select('*')
            .eq(
              'tournament_id',
              tournament.id
            )
            .order(
              'round_number',
              {
                ascending: true
              }
            )
            .order(
              'match_order',
              {
                ascending: true
              }
            )
            .order(
              'leg_number',
              {
                ascending: true
              }
            )
        ])


      for (
        const result
        of [
          playerResult,
          teamResult,
          groupResult,
          memberResult,
          matchResult
        ]
      ) {
        if (result.error) {
          throw result.error
        }
      }


      return res.json({
        tournament,

        players:
          playerResult.data ||
          [],

        teams:
          teamResult.data ||
          [],

        groups:
          groupResult.data ||
          [],

        groupMembers:
          memberResult.data ||
          [],

        matches:
          matchResult.data ||
          [],

        viewer: {
          role,

          canDeleteTournament:
            hasPlatformTournamentAccess(
              role
            )
        }
      })
    } catch (error) {
      next(error)
    }
  }
)


/*
 * =====================================================
 * PERMANENT TOURNAMENT DELETION
 *
 * Only Admin / Super Admin.
 * Database deletion itself is atomic through
 * admin_delete_unplayed_tournament().
 * =====================================================
 */

router.delete(
  '/:id',
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

      const role =
        req
          .platformAdmin
          .profile
          .role


      if (
        !hasPlatformTournamentAccess(
          role
        )
      ) {
        return res
          .status(403)
          .json({
            message:
              'Only an Admin or Super Admin can delete a tournament.'
          })
      }


      if (
        req.body?.confirmation !==
        'DELETE'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Type DELETE to confirm permanent tournament deletion.'
          })
      }


      const tournament =
        await loadTournament(
          supabase,
          req.params.id,
          user.id,
          role
        )


      if (!tournament) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found.'
          })
      }


      const {
        data:
          deletedTournamentName,
        error:
          deleteError
      } =
        await supabase
          .rpc(
            'admin_delete_unplayed_tournament',
            {
              p_tournament_id:
                tournament.id
            }
          )


      if (deleteError) {
        return res
          .status(409)
          .json({
            message:
              deleteError.message ||
              'Unable to delete tournament.'
          })
      }


      return res.json({
        message:
          `${deletedTournamentName || tournament.name} was permanently deleted.`
      })
    } catch (error) {
      next(error)
    }
  }
)


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
        first.id,

      team2_id:
        second.id
    }
  }


  return {
    player1_id:
      first.id,

    player2_id:
      second.id,

    team1_id: null,
    team2_id: null
  }
}


async function regenerateGroupFixtures({
  supabase,
  tournament
}) {
  const [
    groupsResult,
    membersResult,
    participants
  ] =
    await Promise.all([
      supabase
        .from('tournament_groups')
        .select('*')
        .eq(
          'tournament_id',
          tournament.id
        )
        .order(
          'group_order',
          {
            ascending: true
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

      loadParticipants(
        supabase,
        tournament
      )
    ])


  if (groupsResult.error) {
    throw groupsResult.error
  }


  if (membersResult.error) {
    throw membersResult.error
  }


  const groups =
    groupsResult.data || []

  const members =
    membersResult.data || []


  if (
    groups.length === 0
  ) {
    throw new Error(
      'Tournament groups have not been created yet.'
    )
  }


  const participantMap =
    new Map(
      participants.map(
        (participant) => [
          participant.id,
          participant
        ]
      )
    )


  const rows = []


  for (
    const group of groups
  ) {
    const groupParticipants =
      members
        .filter(
          (member) =>
            member.group_id ===
            group.id
        )
        .sort(
          (a, b) =>
            (
              a.seed_order ||
              0
            )
            -
            (
              b.seed_order ||
              0
            )
        )
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
      groupParticipants.length < 2
    ) {
      throw new Error(
        `${group.name} must contain at least two participants.`
      )
    }


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
        rows.push({
          tournament_id:
            tournament.id,

          group_id:
            group.id,

          round_number:
            fixture
              .roundNumber,

          stage:
            'group',

          leg_number:
            1,

          tie_id:
            null,

          match_order:
            index + 1,

          ...participantFields(
            tournament
              .participant_type,

            fixture.home,
            fixture.away
          ),

          status:
            'scheduled'
        })
      }
    )
  }


  const {
    error:
      deleteError
  } = await supabase
    .from('matches')
    .delete()
    .eq(
      'tournament_id',
      tournament.id
    )
    .eq(
      'stage',
      'group'
    )


  if (deleteError) {
    throw deleteError
  }


  if (
    rows.length > 0
  ) {
    const {
      error:
        insertError
    } = await supabase
      .from('matches')
      .insert(rows)


    if (insertError) {
      throw insertError
    }
  }


  return rows.length
}


async function ensureNoCompletedMatches(
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
        count: 'exact',
        head: true
      }
    )
    .eq(
      'tournament_id',
      tournamentId
    )
    .eq(
      'status',
      'completed'
    )


  if (error) {
    throw error
  }


  return count === 0
}


/*
 * =====================================================
 * MANUAL GROUP SWAP.
 * =====================================================
 */

router.patch(
  '/:id/groups/swap-members',
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
        sourceMemberId,
        targetMemberId
      } = req.body


      if (
        !sourceMemberId ||
        !targetMemberId
      ) {
        return res
          .status(400)
          .json({
            message:
              'Both group participants are required.'
          })
      }


      if (
        sourceMemberId ===
        targetMemberId
      ) {
        return res
          .status(400)
          .json({
            message:
              'Choose a participant from another group.'
          })
      }


      const tournament =
        await loadTournament(
          supabase,
          req.params.id,
          user.id,
          req.platformAdmin.profile.role
        )


      if (!tournament) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found.'
          })
      }


      if (
        ![
          'multi_group_league',
          'multi_group_tournament'
        ].includes(
          tournament.format
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'This tournament does not use groups.'
          })
      }


      const safeToEdit =
        await ensureNoCompletedMatches(
          supabase,
          tournament.id
        )


      if (!safeToEdit) {
        return res
          .status(409)
          .json({
            message:
              'Group assignments are locked because tournament results have already been entered.'
          })
      }


      const {
        count:
          knockoutCount,
        error:
          knockoutError
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
        .in(
          'stage',
          KNOCKOUT_STAGES
        )


      if (knockoutError) {
        throw knockoutError
      }


      if (
        knockoutCount > 0
      ) {
        return res
          .status(409)
          .json({
            message:
              'Groups cannot be changed after the knockout stage has been created.'
          })
      }


      const {
        data: memberRows,
        error:
          membersError
      } = await supabase
        .from(
          'tournament_group_members'
        )
        .select('*')
        .eq(
          'tournament_id',
          tournament.id
        )
        .in(
          'id',
          [
            sourceMemberId,
            targetMemberId
          ]
        )


      if (membersError) {
        throw membersError
      }


      if (
        memberRows.length !== 2
      ) {
        return res
          .status(404)
          .json({
            message:
              'One or both group participants were not found.'
          })
      }


      const source =
        memberRows.find(
          (member) =>
            member.id ===
            sourceMemberId
        )

      const target =
        memberRows.find(
          (member) =>
            member.id ===
            targetMemberId
        )


      if (
        source.group_id ===
        target.group_id
      ) {
        return res
          .status(400)
          .json({
            message:
              'The participants are already in the same group.'
          })
      }


      const sourceGroup =
        source.group_id

      const sourceSeed =
        source.seed_order

      const targetGroup =
        target.group_id

      const targetSeed =
        target.seed_order


      const {
        error:
          firstUpdateError
      } = await supabase
        .from(
          'tournament_group_members'
        )
        .update({
          group_id:
            targetGroup,

          seed_order:
            targetSeed
        })
        .eq(
          'id',
          source.id
        )


      if (firstUpdateError) {
        throw firstUpdateError
      }


      const {
        error:
          secondUpdateError
      } = await supabase
        .from(
          'tournament_group_members'
        )
        .update({
          group_id:
            sourceGroup,

          seed_order:
            sourceSeed
        })
        .eq(
          'id',
          target.id
        )


      if (secondUpdateError) {
        /*
         * Roll the first update back.
         */
        await supabase
          .from(
            'tournament_group_members'
          )
          .update({
            group_id:
              sourceGroup,

            seed_order:
              sourceSeed
          })
          .eq(
            'id',
            source.id
          )


        throw secondUpdateError
      }


      const fixtures =
        await regenerateGroupFixtures({
          supabase,
          tournament
        })


      return res.json({
        message:
          'Group participants swapped successfully.',

        fixtures
      })
    } catch (error) {
      next(error)
    }
  }
)


/*
 * =====================================================
 * SAFE FIXTURE REGENERATION.
 * =====================================================
 */

router.post(
  '/:id/regenerate-fixtures',
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


      const tournament =
        await loadTournament(
          supabase,
          req.params.id,
          user.id,
          req.platformAdmin.profile.role
        )


      if (!tournament) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found.'
          })
      }


      const safeToEdit =
        await ensureNoCompletedMatches(
          supabase,
          tournament.id
        )


      if (!safeToEdit) {
        return res
          .status(409)
          .json({
            message:
              'Fixtures cannot be regenerated after results have been entered. Use Reset Competition instead.'
          })
      }


      /*
       * GROUP FORMATS.
       *
       * Keep current manual group
       * assignments.
       */
      if (
        [
          'multi_group_league',
          'multi_group_tournament'
        ].includes(
          tournament.format
        )
      ) {
        const fixtures =
          await regenerateGroupFixtures({
            supabase,
            tournament
          })


        return res.json({
          message:
            'Group fixtures regenerated successfully.',

          fixtures
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


      const {
        error:
          deleteError
      } = await supabase
        .from('matches')
        .delete()
        .eq(
          'tournament_id',
          tournament.id
        )


      if (deleteError) {
        throw deleteError
      }


      let rows = []


      if (
        [
          'league',
          'league_final',
          'league_knockout'
        ].includes(
          tournament.format
        )
      ) {
        const fixtures =
          generateRoundRobin(
            participants,
            tournament
              .double_round_robin
          )


        rows =
          fixtures.map(
            (
              fixture,
              index
            ) => ({
              tournament_id:
                tournament.id,

              group_id:
                null,

              round_number:
                fixture
                  .roundNumber,

              stage:
                'league',

              leg_number:
                1,

              tie_id:
                null,

              match_order:
                index + 1,

              ...participantFields(
                tournament
                  .participant_type,

                fixture.home,
                fixture.away
              ),

              status:
                'scheduled'
            })
          )
      }


      else if (
        tournament.format ===
        'knockout'
      ) {
        rows =
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

            shuffle:
              true
          })
      }


      else {
        return res
          .status(400)
          .json({
            message:
              'This tournament format cannot be regenerated.'
          })
      }


      if (
        rows.length > 0
      ) {
        const {
          error:
            insertError
        } = await supabase
          .from('matches')
          .insert(rows)


        if (insertError) {
          throw insertError
        }
      }


      return res.json({
        message:
          'Fixtures regenerated successfully.',

        fixtures:
          rows.length
      })
    } catch (error) {
      next(error)
    }
  }
)


/*
 * =====================================================
 * FULL COMPETITION RESET.
 *
 * Keeps:
 * Tournament.
 * Tournament players.
 * Tournament teams.
 *
 * Removes:
 * Matches.
 * Groups.
 * Group assignments.
 * Results.
 * Bracket.
 * Champion.
 * =====================================================
 */

router.post(
  '/:id/reset-competition',
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


      if (
        req.body.confirmation !==
        'RESET'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Reset confirmation is required.'
          })
      }


      const tournament =
        await loadTournament(
          supabase,
          req.params.id,
          user.id,
          req.platformAdmin.profile.role
        )


      if (!tournament) {
        return res
          .status(404)
          .json({
            message:
              'Tournament not found.'
          })
      }


      /*
       * Matches first because they
       * reference groups.
       */
      const {
        error:
          matchDeleteError
      } = await supabase
        .from('matches')
        .delete()
        .eq(
          'tournament_id',
          tournament.id
        )


      if (matchDeleteError) {
        throw matchDeleteError
      }


      const {
        error:
          memberDeleteError
      } = await supabase
        .from(
          'tournament_group_members'
        )
        .delete()
        .eq(
          'tournament_id',
          tournament.id
        )


      if (memberDeleteError) {
        throw memberDeleteError
      }


      const {
        error:
          groupDeleteError
      } = await supabase
        .from(
          'tournament_groups'
        )
        .delete()
        .eq(
          'tournament_id',
          tournament.id
        )


      if (groupDeleteError) {
        throw groupDeleteError
      }


      const {
        error:
          tournamentUpdateError
      } = await supabase
        .from('tournaments')
        .update({
          status:
            'draft',

          champion_player_id:
            null,

          champion_team_id:
            null,

          champion_decided_at:
            null
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
          'Competition reset successfully. Tournament participants were preserved.'
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
