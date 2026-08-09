import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './PlayerAssignmentPanel.css'


function PlayerAssignmentPanel({
  user,
  tournament,
  tournamentId,
  matches,
  onChanged
}) {
  const [
    library,
    setLibrary
  ] = useState([])

  const [
    assignedIds,
    setAssignedIds
  ] = useState(
    new Set()
  )

  const [
    selectedPlayerId,
    setSelectedPlayerId
  ] = useState('')

  const [
    teamName,
    setTeamName
  ] = useState('')

  const [
    playerOneId,
    setPlayerOneId
  ] = useState('')

  const [
    playerTwoId,
    setPlayerTwoId
  ] = useState('')

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


  const loadLibrary =
    useCallback(
      async () => {
        const [
          libraryResult,
          assignedResult
        ] = await Promise.all([

          supabase
            .from('players')
            .select(`
              id,
              name,
              image_url
            `)
            .eq(
              'owner_id',
              user.id
            )
            .order(
              'name',
              {
                ascending:
                  true
              }
            ),

          supabase
            .from(
              'tournament_players'
            )
            .select(
              'master_player_id'
            )
            .eq(
              'tournament_id',
              tournamentId
            )
            .not(
              'master_player_id',
              'is',
              null
            )
        ])


        if (
          libraryResult.error
        ) {
          setError(
            libraryResult
              .error
              .message
          )

          return
        }


        if (
          assignedResult.error
        ) {
          setError(
            assignedResult
              .error
              .message
          )

          return
        }


        setLibrary(
          libraryResult.data ||
          []
        )


        setAssignedIds(
          new Set(
            (
              assignedResult.data ||
              []
            )
              .map(
                (item) =>
                  item
                    .master_player_id
              )
              .filter(Boolean)
          )
        )
      },
      [
        user.id,
        tournamentId
      ]
    )


  useEffect(
    () => {
      loadLibrary()
    },
    [loadLibrary]
  )


  const availablePlayers =
    useMemo(
      () =>
        library.filter(
          (player) =>
            !assignedIds.has(
              player.id
            )
        ),
      [
        library,
        assignedIds
      ]
    )


  function findPlayer(id) {
    return library.find(
      (player) =>
        player.id === id
    )
  }


  async function refreshAll() {
    await loadLibrary()

    if (onChanged) {
      await onChanged()
    }
  }


  async function assignIndividual() {
    if (
      matches.length > 0
    ) {
      setError(
        'Participants are locked because fixtures have already been generated.'
      )

      return
    }


    const player =
      findPlayer(
        selectedPlayerId
      )


    if (!player) {
      setError(
        'Select a player first.'
      )

      return
    }


    setSaving(true)
    setError('')
    setSuccess('')


    const {
      error:
        insertError
    } = await supabase
      .from(
        'tournament_players'
      )
      .insert({
        tournament_id:
          tournamentId,

        master_player_id:
          player.id,

        name:
          player.name,

        image_url:
          player.image_url,

        team_id:
          null,

        team_position:
          null
      })


    if (insertError) {
      setError(
        insertError.message
      )
    } else {
      setSuccess(
        `${player.name} assigned to this tournament.`
      )

      setSelectedPlayerId('')

      await refreshAll()
    }


    setSaving(false)
  }


  async function assignTeam() {
    if (
      matches.length > 0
    ) {
      setError(
        'Participants are locked because fixtures have already been generated.'
      )

      return
    }


    const cleanTeamName =
      teamName.trim()

    const playerOne =
      findPlayer(
        playerOneId
      )

    const playerTwo =
      findPlayer(
        playerTwoId
      )


    if (!cleanTeamName) {
      setError(
        'Enter the team name.'
      )

      return
    }


    if (
      !playerOne ||
      !playerTwo
    ) {
      setError(
        'Select both players.'
      )

      return
    }


    if (
      playerOne.id ===
      playerTwo.id
    ) {
      setError(
        'A team requires two different players.'
      )

      return
    }


    setSaving(true)
    setError('')
    setSuccess('')


    let createdTeamId =
      null


    try {
      const {
        data: team,
        error:
          teamError
      } = await supabase
        .from(
          'tournament_teams'
        )
        .insert({
          tournament_id:
            tournamentId,

          name:
            cleanTeamName
        })
        .select()
        .single()


      if (teamError) {
        throw teamError
      }


      createdTeamId =
        team.id


      const {
        error:
          playersError
      } = await supabase
        .from(
          'tournament_players'
        )
        .insert([
          {
            tournament_id:
              tournamentId,

            master_player_id:
              playerOne.id,

            name:
              playerOne.name,

            image_url:
              playerOne
                .image_url,

            team_id:
              team.id,

            team_position:
              1
          },

          {
            tournament_id:
              tournamentId,

            master_player_id:
              playerTwo.id,

            name:
              playerTwo.name,

            image_url:
              playerTwo
                .image_url,

            team_id:
              team.id,

            team_position:
              2
          }
        ])


      if (playersError) {
        throw playersError
      }


      setSuccess(
        `${cleanTeamName} assigned successfully.`
      )

      setTeamName('')
      setPlayerOneId('')
      setPlayerTwoId('')


      await refreshAll()
    } catch (assignError) {
      if (createdTeamId) {
        await supabase
          .from(
            'tournament_teams'
          )
          .delete()
          .eq(
            'id',
            createdTeamId
          )
      }


      setError(
        assignError.message ||
        'Unable to assign team.'
      )
    } finally {
      setSaving(false)
    }
  }


  return (
    <div className="player-assignment-panel">

      <div className="assignment-heading">

        <div>
          <span>
            PLAYER LIBRARY
          </span>

          <h3>
            Assign Existing Players
          </h3>

          <p>
            Select reusable players from your global player library.
          </p>
        </div>

        <div className="available-player-count">
          {
            availablePlayers
              .length
          }
          {' '}
          Available
        </div>

      </div>


      {error && (
        <div className="assignment-error">
          {error}
        </div>
      )}


      {success && (
        <div className="assignment-success">
          {success}
        </div>
      )}


      {library.length === 0 ? (
        <div className="assignment-empty">
          Your player library is empty. Open the Players page and create players first.
        </div>
      ) : tournament.participant_type ===
        'team' ? (
        <div className="team-assignment-form">

          <div>
            <label>
              Team Name
            </label>

            <input
              type="text"
              value={teamName}
              placeholder="Enter team name"
              onChange={
                (event) =>
                  setTeamName(
                    event
                      .target
                      .value
                  )
              }
            />
          </div>


          <div>
            <label>
              Player 1
            </label>

            <select
              value={
                playerOneId
              }
              onChange={
                (event) =>
                  setPlayerOneId(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="">
                Select Player
              </option>

              {availablePlayers.map(
                (player) => (
                  <option
                    key={
                      player.id
                    }
                    value={
                      player.id
                    }
                  >
                    {
                      player.name
                    }
                  </option>
                )
              )}

            </select>
          </div>


          <div>
            <label>
              Player 2
            </label>

            <select
              value={
                playerTwoId
              }
              onChange={
                (event) =>
                  setPlayerTwoId(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="">
                Select Player
              </option>

              {availablePlayers.map(
                (player) => (
                  <option
                    key={
                      player.id
                    }
                    value={
                      player.id
                    }
                  >
                    {
                      player.name
                    }
                  </option>
                )
              )}

            </select>
          </div>


          <button
            type="button"
            disabled={
              saving ||
              matches.length > 0
            }
            onClick={
              assignTeam
            }
          >
            {
              saving
                ? 'Assigning...'
                : '+ Assign Team'
            }
          </button>

        </div>
      ) : (
        <div className="individual-assignment-form">

          <select
            value={
              selectedPlayerId
            }
            onChange={
              (event) =>
                setSelectedPlayerId(
                  event
                    .target
                    .value
                )
            }
          >

            <option value="">
              Select a Player
            </option>

            {availablePlayers.map(
              (player) => (
                <option
                  key={
                    player.id
                  }
                  value={
                    player.id
                  }
                >
                  {
                    player.name
                  }
                </option>
              )
            )}

          </select>


          <button
            type="button"
            disabled={
              saving ||
              matches.length > 0
            }
            onClick={
              assignIndividual
            }
          >
            {
              saving
                ? 'Assigning...'
                : '+ Assign Player'
            }
          </button>

        </div>
      )}

    </div>
  )
}


export default PlayerAssignmentPanel
