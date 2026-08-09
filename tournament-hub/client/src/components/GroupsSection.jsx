import {
  useMemo,
  useState
} from 'react'

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'

import {
  calculateStandings
} from '../lib/standings'

import {
  apiRequest
} from '../lib/api'

import ParticipantAvatar from './ParticipantAvatar'

import './GroupsSection.css'


function GroupsSection({
  tournament,
  players,
  teams,
  groups,
  groupMembers,
  matches,
  onChanged
}) {
  const [
    editing,
    setEditing
  ] = useState(false)

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')

  const [
    success,
    setSuccess
  ] = useState('')


  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint: {
            distance: 6
          }
        }
      )
    )


  const participantType =
    tournament
      .participant_type


  const isGroupTournament =
    [
      'multi_group_league',
      'multi_group_tournament'
    ].includes(
      tournament.format
    )


  const knockoutExists =
    matches.some(
      (match) =>
        [
          'round_of_32',
          'round_of_16',
          'quarter_final',
          'semi_final',
          'third_place',
          'final'
        ].includes(
          match.stage
        )
    )


  const hasCompletedResults =
    matches.some(
      (match) =>
        match.status ===
        'completed'
    )


  const canEditGroups =
    isGroupTournament &&
    groups.length > 0 &&
    !hasCompletedResults &&
    !knockoutExists


  const participants =
    useMemo(
      () => {
        if (
          participantType ===
          'team'
        ) {
          return teams.map(
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
          )
        }


        return players.filter(
          (player) =>
            !player.team_id
        )
      },
      [
        participantType,
        teams,
        players
      ]
    )


  const participantMap =
    useMemo(
      () =>
        new Map(
          participants.map(
            (participant) => [
              participant.id,
              participant
            ]
          )
        ),
      [participants]
    )


  const membershipByParticipant =
    useMemo(
      () => {
        const map =
          new Map()


        groupMembers.forEach(
          (member) => {
            const id =
              participantType ===
              'team'
                ? member.team_id
                : member.player_id


            if (id) {
              map.set(
                id,
                member
              )
            }
          }
        )


        return map
      },
      [
        groupMembers,
        participantType
      ]
    )


  const qualificationCutoff =
    tournament.format ===
    'multi_group_tournament'
      ? Number(
          tournament
            .qualifiers_per_group
        ) || null
      : null


  const groupData =
    useMemo(
      () =>
        groups.map(
          (group) => {
            const members =
              groupMembers
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


            const groupParticipants =
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


            const standings =
              calculateStandings({
                participants:
                  groupParticipants,

                matches:
                  groupMatches,

                participantType
              })


            const completed =
              groupMatches.filter(
                (match) =>
                  match.status ===
                  'completed'
              ).length


            return {
              group,
              standings,
              completed,
              total:
                groupMatches.length
            }
          }
        ),
      [
        groups,
        groupMembers,
        participantType,
        participantMap,
        matches
      ]
    )


  async function handleDragEnd(
    event
  ) {
    if (
      !editing ||
      !canEditGroups
    ) {
      return
    }


    const source =
      event.active
        ?.data
        ?.current

    const target =
      event.over
        ?.data
        ?.current


    if (
      !source ||
      !target
    ) {
      return
    }


    if (
      source.memberId ===
      target.memberId
    ) {
      return
    }


    if (
      source.groupId ===
      target.groupId
    ) {
      return
    }


    setSaving(true)
    setError('')
    setSuccess('')


    try {
      await apiRequest(
        `/api/tournaments/${tournament.id}/groups/swap-members`,
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              sourceMemberId:
                source.memberId,

              targetMemberId:
                target.memberId
            })
        }
      )


      setSuccess(
        'Players swapped and group fixtures regenerated.'
      )


      if (onChanged) {
        await onChanged()
      }
    } catch (swapError) {
      setError(
        swapError.message ||
        'Unable to update group assignments.'
      )
    } finally {
      setSaving(false)
    }
  }


  if (!isGroupTournament) {
    return (
      <section className="groups-section">

        <div className="groups-heading">

          <div>
            <p className="eyebrow">
              GROUPS
            </p>

            <h2>
              Tournament Groups
            </h2>
          </div>

        </div>


        <div className="groups-empty">
          This tournament format does not use a group stage.
        </div>

      </section>
    )
  }


  return (
    <section className="groups-section">

      <div className="groups-heading">

        <div>
          <p className="eyebrow">
            GROUP STAGE
          </p>

          <h2>
            Tournament Groups
          </h2>

          <p>
            Group positions update automatically from match results.
          </p>
        </div>


        <div className="groups-header-actions">

          <div className="groups-count">
            <strong>
              {groups.length}
            </strong>

            <span>
              Groups
            </span>
          </div>


          {canEditGroups && (
            <button
              type="button"
              className={
                editing
                  ? 'edit-groups-button active'
                  : 'edit-groups-button'
              }
              onClick={() =>
                setEditing(
                  (current) =>
                    !current
                )
              }
            >
              {
                editing
                  ? 'Done Editing'
                  : 'Edit Groups'
              }
            </button>
          )}

        </div>

      </div>


      {editing && (
        <div className="group-edit-notice">
          Drag a participant onto a participant in another group to swap their positions. Fixtures are regenerated automatically.
        </div>
      )}


      {!canEditGroups &&
        groups.length > 0 && (
        <div className="group-locked-notice">
          Group assignments are locked because tournament results or knockout progression already exist.
        </div>
      )}


      {error && (
        <div className="group-action-error">
          {error}
        </div>
      )}


      {success && (
        <div className="group-action-success">
          {success}
        </div>
      )}


      {saving && (
        <div className="group-saving">
          Updating Groups...
        </div>
      )}


      <DndContext
        sensors={sensors}
        onDragEnd={
          handleDragEnd
        }
      >

        <div className="groups-grid">

          {groupData.map(
            ({
              group,
              standings,
              completed,
              total
            }) => (
              <article
                key={
                  group.id
                }
                className="group-card"
              >

                <header className="group-card-header">

                  <div>
                    <h3>
                      {group.name}
                    </h3>

                    <span>
                      {
                        completed
                      }
                      {' / '}
                      {
                        total
                      }
                      {' '}
                      Matches
                    </span>
                  </div>


                  {qualificationCutoff && (
                    <div className="group-top-count">
                      Top {
                        qualificationCutoff
                      }
                    </div>
                  )}

                </header>


                <div className="group-player-list">

                  {standings.map(
                    (row) => {
                      const member =
                        membershipByParticipant.get(
                          row.id
                        )


                      const insideCutoff =
                        qualificationCutoff
                        &&
                        row.position <=
                          qualificationCutoff


                      return (
                        <GroupPlayerRow
                          key={
                            row.id
                          }
                          row={row}
                          member={
                            member
                          }
                          groupId={
                            group.id
                          }
                          insideCutoff={
                            insideCutoff
                          }
                          qualificationCutoff={
                            qualificationCutoff
                          }
                          editing={
                            editing &&
                            canEditGroups
                          }
                        />
                      )
                    }
                  )}

                </div>

              </article>
            )
          )}

        </div>

      </DndContext>

    </section>
  )
}


function GroupPlayerRow({
  row,
  member,
  groupId,
  insideCutoff,
  qualificationCutoff,
  editing
}) {
  const dragData = {
    memberId:
      member?.id,

    groupId,

    participantId:
      row.id
  }


  const {
    attributes,
    listeners,
    setNodeRef:
      setDragRef,
    transform,
    isDragging
  } =
    useDraggable({
      id:
        `group-drag-${member?.id || row.id}`,

      disabled:
        !editing ||
        !member,

      data:
        dragData
    })


  const {
    setNodeRef:
      setDropRef,
    isOver
  } =
    useDroppable({
      id:
        `group-drop-${member?.id || row.id}`,

      disabled:
        !editing ||
        !member,

      data:
        dragData
    })


  function setRefs(node) {
    setDragRef(node)
    setDropRef(node)
  }


  const style =
    transform
      ? {
          transform:
            `translate3d(${transform.x}px, ${transform.y}px, 0)`
        }
      : undefined


  return (
    <div
      ref={setRefs}
      style={style}
      className={[
        'group-player-row',

        editing
          ? 'editable'
          : '',

        isDragging
          ? 'dragging'
          : '',

        isOver
          ? 'drag-over'
          : ''
      ].join(' ')}
      {...attributes}
      {...listeners}
    >

      {qualificationCutoff && (
        <span
          className={
            insideCutoff
              ? 'group-player-status green'
              : 'group-player-status red'
          }
        />
      )}


      {!qualificationCutoff && (
        <span className="group-player-status neutral" />
      )}


      <span className="group-player-position">
        {
          editing
            ? '⋮⋮'
            : row.position
        }
      </span>


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


      <div className="group-player-name">

        <strong>
          {row.name}
        </strong>

        <span>
          P {
            row.played
          }
          {' · '}
          GD {
            row.goalDifference >
            0
              ? `+${row.goalDifference}`
              : row.goalDifference
          }
        </span>

      </div>


      <strong className="group-player-points">
        {
          row.points
        }
      </strong>

    </div>
  )
}


export default GroupsSection
