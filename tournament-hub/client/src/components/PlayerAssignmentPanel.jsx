import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import GlobalPlayerProfileModal from './GlobalPlayerProfileModal'

import './PlayerAssignmentPanel.css'


function getTier(
  rating
) {
  const value =
    Number(
      rating ||
      1000
    )

  if (value >= 1400) {
    return 'Legend'
  }

  if (value >= 1300) {
    return 'Master'
  }

  if (value >= 1200) {
    return 'Elite'
  }

  if (value >= 1100) {
    return 'Platinum'
  }

  if (value >= 1000) {
    return 'Gold'
  }

  if (value >= 900) {
    return 'Silver'
  }

  return 'Bronze'
}


function filterPlayers(
  players,
  search
) {
  const query =
    String(
      search ||
      ''
    )
      .trim()
      .toLowerCase()


  if (!query) {
    return players
  }


  return players.filter(
    (player) => {
      const name =
        String(
          player.name ||
          ''
        )
          .toLowerCase()

      const tier =
        getTier(
          player.current_rating
        )
          .toLowerCase()

      const rating =
        String(
          player.current_rating ||
          1000
        )


      return (
        name.includes(query) ||
        tier.includes(query) ||
        rating.includes(query)
      )
    }
  )
}


function PlayerAvatar({
  player
}) {
  if (
    player.image_url
  ) {
    return (
      <img
        className="assignment-player-image"
        src={
          player.image_url
        }
        alt={
          player.name
        }
      />
    )
  }


  return (
    <span className="assignment-player-fallback">
      {
        String(
          player.name ||
          '?'
        )
          .charAt(0)
          .toUpperCase()
      }
    </span>
  )
}


function PlayerIdentity({
  player
}) {
  return (
    <div className="assignment-player-identity">

      <PlayerAvatar
        player={player}
      />


      <div className="assignment-player-info">

        <strong>
          {player.name}
        </strong>


        <div className="assignment-player-stats">

          <span className="assignment-elo">
            ELO
            {' '}
            {
              player.current_rating ||
              1000
            }
          </span>


          <span className="assignment-tier">
            {
              getTier(
                player.current_rating
              )
            }
          </span>

        </div>

      </div>

    </div>
  )
}


function TeamPlayerPicker({
  title,
  players,
  assignedIds,
  selectedId,
  otherSelectedId,
  search,
  onSearch,
  onSelect,
  locked
}) {
  const filtered =
    useMemo(
      () =>
        filterPlayers(
          players,
          search
        )
          .slice(
            0,
            20
          ),
      [
        players,
        search
      ]
    )


  const selectedPlayer =
    players.find(
      (player) =>
        player.id ===
        selectedId
    )


  return (
    <div className="team-player-picker">

      <div className="team-picker-heading">

        <div>
          <span>
            {title}
          </span>

          <strong>
            {selectedPlayer
              ? selectedPlayer.name
              : 'Select Player'}
          </strong>
        </div>


        {selectedPlayer && (
          <button
            type="button"
            className="clear-team-player"
            disabled={locked}
            onClick={() =>
              onSelect('')
            }
          >
            Clear
          </button>
        )}

      </div>


      <div className="assignment-search">

        <span>
          ⌕
        </span>

        <input
          type="search"
          value={search}
          placeholder="Search global players..."
          disabled={locked}
          onChange={
            (event) =>
              onSearch(
                event.target.value
              )
          }
        />

      </div>


      <div className="team-player-results">

        {filtered.length ===
          0 ? (
          <div className="assignment-no-results">
            No global players found.
          </div>
        ) : (
          filtered.map(
            (player) => {
              const assigned =
                assignedIds.has(
                  player.id
                )

              const usedByOther =
                otherSelectedId ===
                player.id

              const selected =
                selectedId ===
                player.id

              const disabled =
                locked ||
                assigned ||
                usedByOther


              return (
                <button
                  key={
                    player.id
                  }
                  type="button"
                  className={
                    [
                      'team-player-option',

                      selected
                        ? 'is-selected'
                        : '',

                      disabled &&
                      !selected
                        ? 'is-disabled'
                        : ''
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  disabled={
                    disabled &&
                    !selected
                  }
                  onClick={() =>
                    onSelect(
                      player.id
                    )
                  }
                >

                  <PlayerIdentity
                    player={player}
                  />


                  <span className="team-player-option-status">
                    {assigned
                      ? 'Already Assigned'
                      : usedByOther
                        ? 'Selected as Other Player'
                        : selected
                          ? 'Selected'
                          : 'Select'}
                  </span>

                </button>
              )
            }
          )
        )}

      </div>

    </div>
  )
}


function PlayerAssignmentPanel({
  tournament,
  tournamentId,
  matches = [],
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
    search,
    setSearch
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
    playerOneSearch,
    setPlayerOneSearch
  ] = useState('')

  const [
    playerTwoSearch,
    setPlayerTwoSearch
  ] = useState('')

  const [
    savingKey,
    setSavingKey
  ] = useState('')

  const [
    selectedPlayerIds,
    setSelectedPlayerIds
  ] = useState(
    new Set()
  )

  const [
    error,
    setError
  ] = useState('')

  const [
    success,
    setSuccess
  ] = useState('')

  const [
    careerPlayerId,
    setCareerPlayerId
  ] = useState(null)


  const locked =
    matches.length >
    0


  const loadLibrary =
    useCallback(
      async () => {
        setError('')


        const [
          playerResult,
          ratingResult,
          assignedResult
        ] =
          await Promise.all([

            supabase
              .from('players')
              .select(`
                id,
                name,
                image_url
              `)
              .order(
                'name',
                {
                  ascending: true
                }
              ),

            supabase
              .from(
                'player_ratings'
              )
              .select(`
                player_id,
                current_rating
              `),

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
          playerResult.error
        ) {
          setError(
            playerResult
              .error
              .message
          )

          return
        }


        if (
          ratingResult.error
        ) {
          setError(
            ratingResult
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


        const ratings =
          new Map(
            (
              ratingResult.data ||
              []
            )
              .map(
                (row) => [
                  row.player_id,
                  Number(
                    row.current_rating ||
                    1000
                  )
                ]
              )
          )


        const players =
          (
            playerResult.data ||
            []
          )
            .map(
              (player) => ({
                ...player,

                current_rating:
                  ratings.get(
                    player.id
                  )
                  ??
                  1000
              })
            )


        setLibrary(
          players
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


  const individualResults =
    useMemo(
      () =>
        filterPlayers(
          availablePlayers,
          search
        )
          .slice(
            0,
            30
          ),
      [
        availablePlayers,
        search
      ]
    )


  function togglePlayerSelection(
    playerId
  ) {
    if (
      locked ||
      assignedIds.has(
        playerId
      )
    ) {
      return
    }

    setSelectedPlayerIds(
      (current) => {
        const next =
          new Set(
            current
          )

        if (
          next.has(
            playerId
          )
        ) {
          next.delete(
            playerId
          )
        } else {
          next.add(
            playerId
          )
        }

        return next
      }
    )
  }


  function selectAllAvailable() {
    if (
      locked ||
      savingKey
    ) {
      return
    }

    setSelectedPlayerIds(
      new Set(
        availablePlayers.map(
          (player) =>
            player.id
        )
      )
    )
  }


  function clearPlayerSelection() {
    if (savingKey) {
      return
    }

    setSelectedPlayerIds(
      new Set()
    )
  }


  function findPlayer(
    id
  ) {
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


  async function assignIndividual(
    playerId
  ) {
    if (locked) {
      setError(
        'Participants are locked because fixtures have already been generated.'
      )

      return
    }


    if (
      assignedIds.has(
        playerId
      )
    ) {
      setError(
        'This player is already assigned to this tournament.'
      )

      return
    }


    const player =
      findPlayer(
        playerId
      )


    if (!player) {
      setError(
        'Player could not be found.'
      )

      return
    }


    setSavingKey(
      player.id
    )

    setError('')
    setSuccess('')


    const {
      error:
        insertError
    } =
      await supabase
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
      if (
        insertError.code ===
        '23505'
      ) {
        setError(
          'This global player is already assigned to this tournament.'
        )
      } else {
        setError(
          insertError.message
        )
      }
    } else {
      setSuccess(
        `${player.name} has been assigned to this tournament.`
      )

      setSelectedPlayerIds(
        (current) => {
          const next =
            new Set(
              current
            )

          next.delete(
            player.id
          )

          return next
        }
      )

      await refreshAll()
    }


    setSavingKey('')
  }


  async function assignSelectedPlayers() {
    if (locked) {
      setError(
        'Participants are locked because fixtures have already been generated.'
      )

      return
    }


    const playersToAssign =
      availablePlayers.filter(
        (player) =>
          selectedPlayerIds.has(
            player.id
          )
      )


    if (
      playersToAssign.length ===
      0
    ) {
      setError(
        'Select at least one available player.'
      )

      return
    }


    setSavingKey(
      'bulk'
    )

    setError('')
    setSuccess('')


    const rows =
      playersToAssign.map(
        (player) => ({
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
      )


    const {
      error:
        insertError
    } =
      await supabase
        .from(
          'tournament_players'
        )
        .insert(
          rows
        )


    if (insertError) {
      if (
        insertError.code ===
        '23505'
      ) {
        setError(
          'One or more selected players are already assigned to this tournament.'
        )
      } else {
        setError(
          insertError.message
        )
      }
    } else {
      setSuccess(
        `${playersToAssign.length} players have been assigned successfully.`
      )

      setSelectedPlayerIds(
        new Set()
      )

      await refreshAll()
    }


    setSavingKey('')
  }


  async function assignTeam() {
    if (locked) {
      setError(
        'Participants are locked because fixtures have already been generated.'
      )

      return
    }


    const cleanTeamName =
      teamName.trim()


    if (!cleanTeamName) {
      setError(
        'Enter the team name.'
      )

      return
    }


    const playerOne =
      findPlayer(
        playerOneId
      )

    const playerTwo =
      findPlayer(
        playerTwoId
      )


    if (
      !playerOne ||
      !playerTwo
    ) {
      setError(
        'Select both team players.'
      )

      return
    }


    if (
      playerOne.id ===
      playerTwo.id
    ) {
      setError(
        'A team requires two different global players.'
      )

      return
    }


    if (
      assignedIds.has(
        playerOne.id
      )
      ||
      assignedIds.has(
        playerTwo.id
      )
    ) {
      setError(
        'One of these players is already assigned to this tournament.'
      )

      return
    }


    setSavingKey(
      'team'
    )

    setError('')
    setSuccess('')


    let createdTeamId =
      null


    try {
      const {
        data:
          team,
        error:
          teamError
      } =
        await supabase
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
      } =
        await supabase
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
        `${cleanTeamName} has been assigned successfully.`
      )


      setTeamName('')
      setPlayerOneId('')
      setPlayerTwoId('')
      setPlayerOneSearch('')
      setPlayerTwoSearch('')


      await refreshAll()

    } catch (
      assignError
    ) {
      if (
        createdTeamId
      ) {
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


      if (
        assignError.code ===
        '23505'
      ) {
        setError(
          'A selected player or team is already assigned to this tournament.'
        )
      } else {
        setError(
          assignError.message ||
          'Unable to assign team.'
        )
      }
    } finally {
      setSavingKey('')
    }
  }


  return (
    <div className="player-assignment-panel">

      <div className="assignment-heading">

        <div>
          <span>
            GLOBAL PLAYER LIBRARY
          </span>

          <h3>
            Assign Players
          </h3>

          <p>
            Search the PESLOVER player database and assign existing global identities to this tournament.
          </p>
        </div>


        <div className="assignment-counts">

          <span>
            <strong>
              {library.length}
            </strong>
            {' '}
            Global
          </span>

          <span>
            <strong>
              {
                availablePlayers
                  .length
              }
            </strong>
            {' '}
            Available
          </span>

        </div>

      </div>


      {locked && (
        <div className="assignment-lock-notice">

          <span>
            🔒
          </span>

          <div>
            <strong>
              Participant assignments are locked.
            </strong>

            <p>
              Fixtures have already been generated for this tournament.
            </p>
          </div>

        </div>
      )}


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


      {library.length ===
        0 ? (
        <div className="assignment-empty">

          <strong>
            No global players available.
          </strong>

          <p>
            Add a player to the global Player Library or approve a registered player account first.
          </p>

        </div>
      ) : tournament.participant_type ===
        'team' ? (

        <div className="team-assignment-area">

          <div className="team-name-field">

            <label>
              Team Name
            </label>

            <input
              type="text"
              value={
                teamName
              }
              placeholder="Example: Argentina Duo"
              disabled={
                locked ||
                savingKey ===
                'team'
              }
              onChange={
                (event) =>
                  setTeamName(
                    event.target.value
                  )
              }
            />

          </div>


          <div className="team-player-picker-grid">

            <TeamPlayerPicker
              title="PLAYER 1"
              players={library}
              assignedIds={
                assignedIds
              }
              selectedId={
                playerOneId
              }
              otherSelectedId={
                playerTwoId
              }
              search={
                playerOneSearch
              }
              onSearch={
                setPlayerOneSearch
              }
              onSelect={
                setPlayerOneId
              }
              locked={
                locked ||
                savingKey ===
                'team'
              }
            />


            <TeamPlayerPicker
              title="PLAYER 2"
              players={library}
              assignedIds={
                assignedIds
              }
              selectedId={
                playerTwoId
              }
              otherSelectedId={
                playerOneId
              }
              search={
                playerTwoSearch
              }
              onSearch={
                setPlayerTwoSearch
              }
              onSelect={
                setPlayerTwoId
              }
              locked={
                locked ||
                savingKey ===
                'team'
              }
            />

          </div>


          <button
            type="button"
            className="assign-team-button"
            disabled={
              locked ||
              savingKey ===
              'team' ||
              !teamName.trim() ||
              !playerOneId ||
              !playerTwoId
            }
            onClick={
              assignTeam
            }
          >
            {savingKey ===
              'team'
              ? 'Assigning Team...'
              : '+ Assign Team'}
          </button>

        </div>

      ) : (

        <div className="individual-assignment-area">

          <div className="assignment-search assignment-main-search">

            <span>
              ⌕
            </span>

            <input
              type="search"
              value={search}
              placeholder="Search player name, ELO or tier..."
              onChange={
                (event) =>
                  setSearch(
                    event.target.value
                  )
              }
            />

          </div>


          <div className="assignment-selection-toolbar">

            <div className="assignment-selection-buttons">

              <button
                type="button"
                className="assignment-select-all"
                disabled={
                  locked ||
                  Boolean(
                    savingKey
                  ) ||
                  availablePlayers.length ===
                  0
                }
                onClick={
                  selectAllAvailable
                }
              >
                Select All Available
              </button>


              <button
                type="button"
                className="assignment-clear-selection"
                disabled={
                  Boolean(
                    savingKey
                  ) ||
                  selectedPlayerIds.size ===
                  0
                }
                onClick={
                  clearPlayerSelection
                }
              >
                Clear Selection
              </button>

            </div>


            <div className="assignment-selection-summary">

              <strong>
                {
                  selectedPlayerIds.size
                }
              </strong>

              <span>
                {
                  selectedPlayerIds.size ===
                  1
                    ? 'Player Selected'
                    : 'Players Selected'
                }
              </span>

            </div>


            <button
              type="button"
              className="assignment-bulk-button"
              disabled={
                locked ||
                Boolean(
                  savingKey
                ) ||
                selectedPlayerIds.size ===
                0
              }
              onClick={
                assignSelectedPlayers
              }
            >
              {
                savingKey ===
                'bulk'
                  ? 'Assigning Players...'
                  : `Assign Selected (${selectedPlayerIds.size})`
              }
            </button>

          </div>


          <div className="global-player-results">

            {individualResults.length ===
              0 ? (
              <div className="assignment-no-results">
                {
                  availablePlayers.length ===
                  0
                    ? 'All global players are already assigned to this tournament.'
                    : 'No available players match your search.'
                }
              </div>
            ) : (
              individualResults.map(
                (player) => {
                  const assigned =
                    assignedIds.has(
                      player.id
                    )

                  const isSaving =
                    savingKey ===
                    player.id

                  const selected =
                    selectedPlayerIds.has(
                      player.id
                    )


                  return (
                    <article
                      key={
                        player.id
                      }
                      className={
                        [
                          'assignment-player-card',

                          assigned
                            ? 'is-assigned'
                            : '',

                          selected
                            ? 'is-selected'
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                    >

                      <label
                        className={
                          `assignment-player-checkbox ${
                            assigned
                              ? 'is-disabled'
                              : ''
                          }`
                        }
                        title={
                          assigned
                            ? 'Already assigned'
                            : 'Select player'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            selected
                          }
                          disabled={
                            locked ||
                            assigned ||
                            Boolean(
                              savingKey
                            )
                          }
                          onChange={() =>
                            togglePlayerSelection(
                              player.id
                            )
                          }
                        />

                        <span
                          aria-hidden="true"
                        />
                      </label>


                      <PlayerIdentity
                        player={player}
                      />


                      <div className="assignment-player-action">

                        {assigned && (
                          <span className="assigned-player-badge">
                            ✓ In Tournament
                          </span>
                        )}


                        <button
                          type="button"
                          className="assignment-view-career"
                          onClick={() =>
                            setCareerPlayerId(
                              player.id
                            )
                          }
                        >
                          View Career
                        </button>


                        <button
                          type="button"
                          disabled={
                            locked ||
                            assigned ||
                            Boolean(
                              savingKey
                            )
                          }
                          onClick={() =>
                            assignIndividual(
                              player.id
                            )
                          }
                        >
                          {assigned
                            ? 'Assigned'
                            : isSaving
                              ? 'Assigning...'
                              : 'Assign'}
                        </button>

                      </div>

                    </article>
                  )
                }
              )
            )}

          </div>


          {individualResults.length ===
            30 && (
            <p className="assignment-search-hint">
              Showing the first 30 results. Use search to find another player.
            </p>
          )}

        </div>
      )}

      {careerPlayerId && (
        <GlobalPlayerProfileModal
          playerId={careerPlayerId}
          onClose={() =>
            setCareerPlayerId(
              null
            )
          }
        />
      )}

    </div>
  )
}


export default PlayerAssignmentPanel
