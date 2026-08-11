import { Router } from 'express'

import {
  requirePlayerSession
} from '../middleware/playerSession.js'

import * as supabaseModule
  from '../lib/supabaseAdmin.js'


const router = Router()

const supabaseAdmin =
  supabaseModule.supabaseAdmin ||
  supabaseModule.default


function getAccount(req) {
  return (
    req.playerAccount ||
    req.account ||
    req.player ||
    req.playerSession?.account ||
    req.playerSession?.playerAccount ||
    req.playerSession?.player_account ||
    req.playerSession?.player ||
    null
  )
}


function getGlobalPlayerId(req) {
  const account =
    getAccount(req)

  return (
    account?.global_player_id ||
    req.playerAccount?.global_player_id ||
    req.account?.global_player_id ||
    req.player?.global_player_id ||
    req.playerSession?.global_player_id ||
    null
  )
}


function num(value) {
  const parsed =
    Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}


function participantId(
  match,
  participantType,
  side
) {
  if (participantType === 'team') {
    return side === 1
      ? match.team1_id
      : match.team2_id
  }

  return side === 1
    ? match.player1_id
    : match.player2_id
}


function calculateStandings({
  participants,
  matches,
  participantType
}) {
  const rows =
    new Map()


  participants.forEach(
    (participant) => {
      rows.set(
        participant.id,
        {
          id: participant.id,
          name: participant.name,

          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,

          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,

          points: 0
        }
      )
    }
  )


  matches
    .filter(
      (match) =>
        match.status ===
        'completed'
    )
    .forEach(
      (match) => {
        const homeId =
          participantId(
            match,
            participantType,
            1
          )

        const awayId =
          participantId(
            match,
            participantType,
            2
          )

        const home =
          rows.get(homeId)

        const away =
          rows.get(awayId)

        if (!home || !away) {
          return
        }


        const homeScore =
          num(
            match.player1_score
          )

        const awayScore =
          num(
            match.player2_score
          )


        home.played += 1
        away.played += 1

        home.goals_for +=
          homeScore

        home.goals_against +=
          awayScore

        away.goals_for +=
          awayScore

        away.goals_against +=
          homeScore


        if (
          homeScore >
          awayScore
        ) {
          home.won += 1
          away.lost += 1

          home.points += 3
        }

        else if (
          awayScore >
          homeScore
        ) {
          away.won += 1
          home.lost += 1

          away.points += 3
        }

        else {
          home.drawn += 1
          away.drawn += 1

          home.points += 1
          away.points += 1
        }
      }
    )


  return [...rows.values()]
    .map(
      (row) => ({
        ...row,

        goal_difference:
          row.goals_for -
          row.goals_against
      })
    )
    .sort(
      (a, b) =>
        b.points -
          a.points
        ||
        b.goal_difference -
          a.goal_difference
        ||
        b.goals_for -
          a.goals_for
        ||
        String(
          a.name || ''
        ).localeCompare(
          String(
            b.name || ''
          )
        )
    )
    .map(
      (row, index) => ({
        ...row,

        position:
          index + 1
      })
    )
}


function buildMatch({
  match,
  tournament,
  participantType,
  ownParticipantId,
  names
}) {
  const homeId =
    participantId(
      match,
      participantType,
      1
    )

  const awayId =
    participantId(
      match,
      participantType,
      2
    )

  const isHome =
    homeId ===
    ownParticipantId


  let result = null


  if (
    match.status ===
    'completed'
  ) {
    const ownScore =
      num(
        isHome
          ? match.player1_score
          : match.player2_score
      )

    const opponentScore =
      num(
        isHome
          ? match.player2_score
          : match.player1_score
      )


    if (
      ownScore >
      opponentScore
    ) {
      result = 'W'
    }

    else if (
      ownScore <
      opponentScore
    ) {
      result = 'L'
    }

    else {
      result = 'D'
    }
  }


  return {
    id:
      match.id,

    tournament_id:
      tournament.id,

    tournament_name:
      tournament.name,

    tournament_status:
      tournament.status,

    status:
      match.status,

    stage:
      match.stage,

    round_number:
      match.round_number,

    leg_number:
      match.leg_number,

    match_order:
      match.match_order,

    home_name:
      names.get(
        homeId
      ) || 'TBD',

    away_name:
      names.get(
        awayId
      ) || 'TBD',

    home_score:
      match.status ===
      'completed'
        ? num(
            match.player1_score
          )
        : null,

    away_score:
      match.status ===
      'completed'
        ? num(
            match.player2_score
          )
        : null,

    is_home:
      isHome,

    result,

    completed_at:
      match.completed_at,

    created_at:
      match.created_at
  }
}


router.get(
  '/competition-home',

  requirePlayerSession,

  async (
    req,
    res,
    next
  ) => {
    try {
      const account =
        getAccount(req)

      const globalPlayerId =
        getGlobalPlayerId(req)


      if (!globalPlayerId) {
        return res.json({
          linked: false,

          player: {
            display_name:
              account?.display_name ||
              account?.name ||
              'Player',

            avatar_url:
              account?.avatar_url ||
              null
          },

          tournaments: [],
          upcoming_matches: [],
          completed_matches: [],
          next_match: null
        })
      }


      const [
        profileResult,
        assignmentResult
      ] =
        await Promise.all([
          supabaseAdmin
            .from('players')
            .select(
              'id, name, image_url'
            )
            .eq(
              'id',
              globalPlayerId
            )
            .maybeSingle(),

          supabaseAdmin
            .from(
              'tournament_players'
            )
            .select(`
              id,
              tournament_id,
              master_player_id,
              name,
              image_url,
              team_id,
              team_position
            `)
            .eq(
              'master_player_id',
              globalPlayerId
            )
        ])


      if (profileResult.error) {
        throw profileResult.error
      }

      if (assignmentResult.error) {
        throw assignmentResult.error
      }


      const assignments =
        assignmentResult.data ||
        []


      const tournamentIds =
        [
          ...new Set(
            assignments
              .map(
                (item) =>
                  item.tournament_id
              )
              .filter(Boolean)
          )
        ]


      const player = {
        id:
          globalPlayerId,

        display_name:
          profileResult.data?.name ||
          account?.display_name ||
          account?.name ||
          'Player',

        avatar_url:
          profileResult.data
            ?.image_url ||
          account?.avatar_url ||
          null
      }


      if (
        tournamentIds.length ===
        0
      ) {
        return res.json({
          linked: true,
          player,

          tournaments: [],
          upcoming_matches: [],
          completed_matches: [],
          next_match: null
        })
      }


      const [
        tournamentResult,
        playerResult,
        teamResult,
        groupResult,
        memberResult,
        matchResult
      ] =
        await Promise.all([
          supabaseAdmin
            .from('tournaments')
            .select(`
              id,
              name,
              slug,
              format,
              status,
              logo_url,
              season,
              participant_type
            `)
            .in(
              'id',
              tournamentIds
            ),

          supabaseAdmin
            .from(
              'tournament_players'
            )
            .select(`
              id,
              tournament_id,
              master_player_id,
              name,
              image_url,
              team_id,
              team_position
            `)
            .in(
              'tournament_id',
              tournamentIds
            ),

          supabaseAdmin
            .from(
              'tournament_teams'
            )
            .select(
              'id, tournament_id, name'
            )
            .in(
              'tournament_id',
              tournamentIds
            ),

          supabaseAdmin
            .from(
              'tournament_groups'
            )
            .select(
              'id, tournament_id, name, group_order'
            )
            .in(
              'tournament_id',
              tournamentIds
            ),

          supabaseAdmin
            .from(
              'tournament_group_members'
            )
            .select(`
              id,
              tournament_id,
              group_id,
              player_id,
              team_id,
              seed_order
            `)
            .in(
              'tournament_id',
              tournamentIds
            ),

          supabaseAdmin
            .from('matches')
            .select(`
              id,
              tournament_id,
              group_id,

              player1_id,
              player2_id,

              team1_id,
              team2_id,

              player1_score,
              player2_score,

              round_number,
              stage,
              leg_number,
              match_order,

              completed_at,
              status,
              created_at
            `)
            .in(
              'tournament_id',
              tournamentIds
            )
        ])


      const results = [
        tournamentResult,
        playerResult,
        teamResult,
        groupResult,
        memberResult,
        matchResult
      ]


      for (
        const result
        of results
      ) {
        if (result.error) {
          throw result.error
        }
      }


      const tournaments =
        tournamentResult.data ||
        []

      const allPlayers =
        playerResult.data ||
        []

      const allTeams =
        teamResult.data ||
        []

      const allGroups =
        groupResult.data ||
        []

      const allMembers =
        memberResult.data ||
        []

      const allMatches =
        matchResult.data ||
        []


      const upcomingMatches =
        []

      const completedMatches =
        []

      const tournamentSummaries =
        []


      for (
        const tournament
        of tournaments
      ) {
        const assignment =
          assignments.find(
            (item) =>
              item.tournament_id ===
              tournament.id
          )


        if (!assignment) {
          continue
        }


        const participantType =
          tournament
            .participant_type ||
          'individual'


        const ownParticipantId =
          participantType ===
          'team'
            ? assignment.team_id
            : assignment.id


        const tournamentPlayers =
          allPlayers.filter(
            (item) =>
              item.tournament_id ===
              tournament.id
          )


        const tournamentTeams =
          allTeams.filter(
            (item) =>
              item.tournament_id ===
              tournament.id
          )


        const participants =
          participantType ===
          'team'
            ? tournamentTeams
            : tournamentPlayers
                .filter(
                  (item) =>
                    !item.team_id
                )


        const names =
          new Map(
            participants.map(
              (item) => [
                item.id,
                item.name
              ]
            )
          )


        const tournamentMatches =
          allMatches.filter(
            (match) =>
              match.tournament_id ===
              tournament.id
          )


        const ownMatches =
          tournamentMatches.filter(
            (match) =>
              participantId(
                match,
                participantType,
                1
              ) ===
                ownParticipantId
              ||
              participantId(
                match,
                participantType,
                2
              ) ===
                ownParticipantId
          )


        ownMatches.forEach(
          (match) => {
            const item =
              buildMatch({
                match,
                tournament,
                participantType,
                ownParticipantId,
                names
              })


            if (
              match.status ===
              'completed'
            ) {
              completedMatches.push(
                item
              )
            } else {
              upcomingMatches.push(
                item
              )
            }
          }
        )


        let standings =
          []

        let groupName =
          null

        let standingsLabel =
          null


        const leagueFormat =
          [
            'league',
            'league_final',
            'league_knockout'
          ].includes(
            tournament.format
          )


        const groupFormat =
          [
            'multi_group_league',
            'multi_group_tournament'
          ].includes(
            tournament.format
          )


        if (leagueFormat) {
          standingsLabel =
            'League Table'

          standings =
            calculateStandings({
              participants,

              matches:
                tournamentMatches
                  .filter(
                    (match) =>
                      match.stage ===
                      'league'
                  ),

              participantType
            })
        }


        if (groupFormat) {
          const membership =
            allMembers.find(
              (member) =>
                member.tournament_id ===
                  tournament.id
                &&
                (
                  participantType ===
                  'team'
                    ? member.team_id ===
                        ownParticipantId
                    : member.player_id ===
                        ownParticipantId
                )
            )


          const group =
            membership
              ? allGroups.find(
                  (item) =>
                    item.id ===
                    membership.group_id
                )
              : null


          if (group) {
            groupName =
              group.name

            standingsLabel =
              group.name


            const memberIds =
              new Set(
                allMembers
                  .filter(
                    (member) =>
                      member.tournament_id ===
                        tournament.id
                      &&
                      member.group_id ===
                        group.id
                  )
                  .map(
                    (member) =>
                      participantType ===
                      'team'
                        ? member.team_id
                        : member.player_id
                  )
                  .filter(Boolean)
              )


            const groupParticipants =
              participants.filter(
                (item) =>
                  memberIds.has(
                    item.id
                  )
              )


            const groupMatches =
              tournamentMatches.filter(
                (match) =>
                  match.group_id ===
                  group.id
              )


            standings =
              calculateStandings({
                participants:
                  groupParticipants,

                matches:
                  groupMatches,

                participantType
              })
          }
        }


        const ownStanding =
          standings.find(
            (row) =>
              row.id ===
              ownParticipantId
          )


        tournamentSummaries.push({
          id:
            tournament.id,

          name:
            tournament.name,

          slug:
            tournament.slug,

          logo_url:
            tournament.logo_url,

          season:
            tournament.season,

          format:
            tournament.format,

          status:
            tournament.status,

          participant_type:
            participantType,

          participant_id:
            ownParticipantId,

          participant_name:
            names.get(
              ownParticipantId
            ) ||
            assignment.name,

          group_name:
            groupName,

          standings_label:
            standingsLabel,

          position:
            ownStanding?.position ??
            null,

          points:
            ownStanding?.points ??
            null,

          standings
        })
      }


      upcomingMatches.sort(
        (a, b) =>
          num(a.round_number) -
            num(b.round_number)
          ||
          num(a.match_order) -
            num(b.match_order)
      )


      completedMatches.sort(
        (a, b) =>
          new Date(
            b.completed_at ||
            b.created_at ||
            0
          ).getTime()
          -
          new Date(
            a.completed_at ||
            a.created_at ||
            0
          ).getTime()
      )


      return res.json({
        linked: true,

        player,

        tournaments:
          tournamentSummaries,

        upcoming_matches:
          upcomingMatches,

        completed_matches:
          completedMatches,

        next_match:
          upcomingMatches[0] ||
          null
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
