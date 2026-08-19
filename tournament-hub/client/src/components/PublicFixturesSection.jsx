import {
  useMemo,
  useState
} from 'react'

import ParticipantAvatar from './ParticipantAvatar'
import PublicMatchDetailsModal from './PublicMatchDetailsModal'

import './PublicFixturesSection.css'


const STAGE_NAMES = {
  league:
    'League',

  group:
    'Group Stage',

  round_of_32:
    'Round of 32',

  round_of_16:
    'Round of 16',

  quarter_final:
    'Quarter-Final',

  semi_final:
    'Semi-Final',

  third_place:
    'Bronze Final',

  final:
    'Final'
}


function PublicFixturesSection({
  tournament,
  players,
  teams,
  groups,
  matches
}) {

const participantType =
    tournament
      .participant_type

  const [
    selectedMatch,
    setSelectedMatch
  ] = useState(null)


  const playerMap =
    useMemo(
      () =>
        new Map(
          players.map(
            (player) => [
              player.id,
              player
            ]
          )
        ),
      [players]
    )


  const teamMap =
    useMemo(
      () =>
        new Map(
          teams.map(
            (team) => [
              team.id,
              team
            ]
          )
        ),
      [teams]
    )


  const groupMap =
    useMemo(
      () =>
        new Map(
          groups.map(
            (group) => [
              group.id,
              group.name
            ]
          )
        ),
      [groups]
    )


  function participantId(
    match,
    side
  ) {
    if (
      participantType ===
      'team'
    ) {
      return side === 1
        ? match.team1_id
        : match.team2_id
    }


    return side === 1
      ? match.player1_id
      : match.player2_id
  }


  function participantName(
    match,
    side
  ) {
    const id =
      participantId(
        match,
        side
      )


    if (!id) {
      return 'TBD'
    }


    if (
      participantType ===
      'team'
    ) {
      return (
        teamMap.get(id)
          ?.name
        ||
        'TBD'
      )
    }


    return (
      playerMap.get(id)
        ?.name
      ||
      'TBD'
    )
  }


  function participantImages(
    match,
    side
  ) {
    const id =
      participantId(
        match,
        side
      )


    if (!id) {
      return []
    }


    if (
      participantType ===
      'team'
    ) {
      return players
        .filter(
          (player) =>
            player.team_id ===
              id
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
        .slice(0, 2)
    }


    const player =
      playerMap.get(id)


    return player?.image_url
      ? [
          player.image_url
        ]
      : []
  }


  const sections =
    useMemo(
      () => {
        const map =
          new Map()


        matches.forEach(
          (match) => {
            let key
            let title


            if (
              match.stage ===
              'group'
            ) {
              const groupName =
                groupMap.get(
                  match.group_id
                )
                ||
                'Group'


              key =
                `group-${match.group_id}-round-${match.round_number}`

              title =
                `${groupName} · Round ${match.round_number}`
            }

            else if (
              match.stage ===
              'league'
            ) {
              key =
                `league-${match.round_number}`

              title =
                `League · Round ${match.round_number}`
            }

            else {
              key =
                `${match.stage}-${match.round_number}`

              title =
                STAGE_NAMES[
                  match.stage
                ]
                ||
                match.stage
            }


            if (
              !map.has(key)
            ) {
              map.set(
                key,
                {
                  key,
                  title,
                  matches: []
                }
              )
            }


            map
              .get(key)
              .matches
              .push(match)
          }
        )


        return [
          ...map.values()
        ]
      },
      [
        matches,
        groupMap
      ]
    )


  return (
    <section className="public-fixtures-section">

      <div className="public-section-heading">

        <div>
          <p className="eyebrow">
            MATCH CENTER
          </p>

          <h2>
            Fixtures & Results
          </h2>

          <p>
            Follow scheduled and completed tournament matches.
          </p>
        </div>


        <div className="public-fixture-total">
          <strong>
            {matches.length}
          </strong>

          <span>
            Matches
          </span>
        </div>

      </div>


      {matches.length === 0 ? (
        <div className="public-fixtures-empty">
          Fixtures have not been generated yet.
        </div>
      ) : (
        <div className="public-fixture-sections">

          {sections.map(
            (section) => (
              <div
                key={
                  section.key
                }
                className="public-fixture-round"
              >

                <div className="public-fixture-round-title">

                  <h3>
                    {section.title}
                  </h3>

                  <span>
                    {
                      section.matches.length
                    }
                    {' '}
                    Match
                    {
                      section.matches.length ===
                      1
                        ? ''
                        : 'es'
                    }
                  </span>

                </div>


                <div className="public-match-grid">

                  {section.matches.map(
                    (match) => (
                      <article
                        key={
                          match.id
                        }
                        className={
                          match.status ===
                          'completed'
                            ? 'public-match-card completed'
                            : 'public-match-card'
                        }
                      >

                        <div className="public-match-status">

                          <span>
                            {
                              STAGE_NAMES[
                                match.stage
                              ]
                              ||
                              match.stage
                            }
                          </span>

                          <strong>
                            {
                              match.status ===
                              'completed'
                                ? 'FT'
                                : 'Upcoming'
                            }
                          </strong>

                        </div>


                        <PublicParticipant
                          name={
                            participantName(
                              match,
                              1
                            )
                          }
                          images={
                            participantImages(
                              match,
                              1
                            )
                          }
                          score={
                            match.status ===
                            'completed'
                              ? match
                                  .player1_score
                              : null
                          }
                        />


                        <div className="public-match-divider">
                          <span>
                            {
                              match.status ===
                              'completed'
                                ? 'FINAL'
                                : 'VS'
                            }
                          </span>
                        </div>


                        <PublicParticipant
                          name={
                            participantName(
                              match,
                              2
                            )
                          }
                          images={
                            participantImages(
                              match,
                              2
                            )
                          }
                          score={
                            match.status ===
                            'completed'
                              ? match
                                  .player2_score
                              : null
                          }
                        />


                        {match.group_id && (
                          <div className="public-match-group">
                            {
                              groupMap.get(
                                match.group_id
                              )
                            }
                          </div>
                        )}

                        <button
                          type="button"
                          className="public-match-details-button"
                          onClick={() =>
                            setSelectedMatch(
                              match
                            )
                          }
                        >
                          Match Details
                        </button>


                      </article>
                    )
                  )}

                </div>

              </div>
            )
          )}

        </div>
      )}
      {selectedMatch && (
        <PublicMatchDetailsModal
          match={selectedMatch}
          tournament={tournament}
          players={players}
          teams={teams}
          groups={groups}
          onClose={() =>
            setSelectedMatch(null)
          }
        />
      )}


    </section>
  )
}


function PublicParticipant({
  name,
  images,
  score
}) {
  return (
    <div className="public-match-participant">

      <ParticipantAvatar
        name={name}
        imageUrls={images}
        size="sm"
      />


      <strong>
        {name}
      </strong>


      <span>
        {
          score === null
            ? '–'
            : score
        }
      </span>

    </div>
  )
}


export default PublicFixturesSection
