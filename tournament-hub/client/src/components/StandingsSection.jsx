import {
  useMemo
} from 'react'

import {
  calculateStandings
} from '../lib/standings'

import ParticipantAvatar from './ParticipantAvatar'

import './StandingsSection.css'


function StandingsSection({
  tournament,
  players,
  teams,
  groups,
  groupMembers,
  matches
}) {
  const participantType =
    tournament.participant_type


  const isGroupFormat =
    [
      'multi_group_league',
      'multi_group_tournament'
    ].includes(
      tournament.format
    )


  const isLeagueFormat =
    [
      'league',
      'league_final',
      'league_knockout'
    ].includes(
      tournament.format
    )


  const individualParticipants =
    useMemo(
      () =>
        players.filter(
          (player) =>
            !player.team_id
        ),
      [players]
    )


  const teamParticipants =
    useMemo(
      () =>
        teams.map(
          (team) => ({
            ...team,

            imageUrls:
              players
                .filter(
                  (player) =>
                    player.team_id ===
                      team.id
                    &&
                    player.image_url
                )
                .sort(
                  (a, b) =>
                    (
                      a.team_position ||
                      0
                    )
                    -
                    (
                      b.team_position ||
                      0
                    )
                )
                .map(
                  (player) =>
                    player.image_url
                )
          })
        ),
      [
        teams,
        players
      ]
    )


  const allParticipants =
    participantType ===
    'team'
      ? teamParticipants
      : individualParticipants


  const participantMap =
    useMemo(
      () =>
        new Map(
          allParticipants.map(
            (participant) => [
              participant.id,
              participant
            ]
          )
        ),
      [allParticipants]
    )


  const leagueStandings =
    useMemo(
      () => {
        if (
          !isLeagueFormat
        ) {
          return []
        }


        return calculateStandings({
          participants:
            allParticipants,

          matches:
            matches.filter(
              (match) =>
                match.stage ===
                'league'
            ),

          participantType
        })
      },
      [
        isLeagueFormat,
        allParticipants,
        matches,
        participantType
      ]
    )


  const groupTables =
    useMemo(
      () => {
        if (
          !isGroupFormat
        ) {
          return []
        }


        return groups.map(
          (group) => {
            const members =
              groupMembers.filter(
                (member) =>
                  member.group_id ===
                  group.id
              )


            const participants =
              members
                .map(
                  (member) => {
                    const id =
                      participantType ===
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


            const groupMatches =
              matches.filter(
                (match) =>
                  match.stage ===
                    'group'
                  &&
                  match.group_id ===
                    group.id
              )


            return {
              group,

              standings:
                calculateStandings({
                  participants,

                  matches:
                    groupMatches,

                  participantType
                })
            }
          }
        )
      },
      [
        isGroupFormat,
        groups,
        groupMembers,
        participantType,
        participantMap,
        matches
      ]
    )


  if (
    tournament.format ===
    'knockout'
  ) {
    return (
      <section className="standings-section">

        <div className="standings-heading">

          <p className="eyebrow">
            STANDINGS
          </p>

          <h2>
            Tournament Standings
          </h2>

        </div>


        <div className="standings-empty">
          Knockout tournaments use the live bracket instead of a league table.
        </div>

      </section>
    )
  }


  return (
    <section className="standings-section">

      <div className="standings-heading">

        <div>
          <p className="eyebrow">
            STANDINGS
          </p>

          <h2>
            {
              isGroupFormat
                ? 'Group Standings'
                : 'League Standings'
            }
          </h2>

          <p>
            Standings update automatically whenever match results are saved.
          </p>
        </div>

      </div>


      {isLeagueFormat && (
        <StandingsTable
          standings={
            leagueStandings
          }
        />
      )}


      {isGroupFormat && (
        <div className="group-standings-grid">

          {groupTables.map(
            ({
              group,
              standings
            }) => (
              <div
                key={
                  group.id
                }
                className="group-standing-card"
              >

                <h3>
                  {group.name}
                </h3>

                <StandingsTable
                  standings={
                    standings
                  }
                />

              </div>
            )
          )}

        </div>
      )}

    </section>
  )
}


function StandingsTable({
  standings
}) {
  return (
    <div className="standings-table-wrap">

      <table className="standings-table">

        <thead>
          <tr>
            <th>
              #
            </th>

            <th>
              Participant
            </th>

            <th>
              P
            </th>

            <th>
              W
            </th>

            <th>
              D
            </th>

            <th>
              L
            </th>

            <th>
              GF
            </th>

            <th>
              GA
            </th>

            <th>
              GD
            </th>

            <th>
              PTS
            </th>
          </tr>
        </thead>


        <tbody>

          {standings.map(
            (row) => (
              <tr key={row.id}>

                <td>
                  <span
                    className={
                      row.position <= 2
                        ? 'standing-position top'
                        : 'standing-position'
                    }
                  >
                    {
                      row.position
                    }
                  </span>
                </td>


                <td>
                  <div className="standing-participant">

                    <ParticipantAvatar
                      name={
                        row.name
                      }
                      imageUrl={
                        row.imageUrl
                      }
                      imageUrls={
                        row.imageUrls
                      }
                      size="sm"
                    />

                    <strong>
                      {row.name}
                    </strong>

                  </div>
                </td>


                <td>
                  {row.played}
                </td>

                <td>
                  {row.won}
                </td>

                <td>
                  {row.drawn}
                </td>

                <td>
                  {row.lost}
                </td>

                <td>
                  {row.goalsFor}
                </td>

                <td>
                  {row.goalsAgainst}
                </td>

                <td>
                  {
                    row.goalDifference >
                    0
                      ? `+${row.goalDifference}`
                      : row.goalDifference
                  }
                </td>

                <td>
                  <strong className="standing-points">
                    {row.points}
                  </strong>
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  )
}


export default StandingsSection
