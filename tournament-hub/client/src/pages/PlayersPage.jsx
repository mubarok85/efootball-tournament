import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './PlayersPage.css'


function PlayersPage({
  user
}) {
  const [
    players,
    setPlayers
  ] = useState([])

  const [
    name,
    setName
  ] = useState('')

  const [
    image,
    setImage
  ] = useState(null)

  const [
    preview,
    setPreview
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(true)

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


  const loadPlayers =
    useCallback(
      async () => {
        setLoading(true)

        const {
          data,
          error:
            loadError
        } = await supabase
          .from('players')
          .select(`
            id,
            owner_id,
            name,
            image_url,
            image_path,
            created_at
          `)
          .eq(
            'owner_id',
            user.id
          )
          .order(
            'name',
            {
              ascending: true
            }
          )


        if (loadError) {
          setError(
            loadError.message
          )
        } else {
          setPlayers(
            data || []
          )
        }

        setLoading(false)
      },
      [user.id]
    )


  useEffect(
    () => {
      loadPlayers()
    },
    [loadPlayers]
  )


  function selectImage(
    event
  ) {
    const file =
      event.target
        .files?.[0]


    if (!file) {
      return
    }


    if (
      !file.type
        .startsWith(
          'image/'
        )
    ) {
      setError(
        'Please select an image file.'
      )

      return
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'Player image must be smaller than 5 MB.'
      )

      return
    }


    setImage(file)

    setPreview(
      URL.createObjectURL(
        file
      )
    )

    setError('')
  }


  async function createPlayer(
    event
  ) {
    event.preventDefault()

    const cleanName =
      name.trim()


    if (!cleanName) {
      setError(
        'Player name is required.'
      )

      return
    }


    setSaving(true)
    setError('')
    setSuccess('')


    let uploadedPath = null
    let imageUrl = null


    try {
      if (image) {
        const extension =
          image.name
            .split('.')
            .pop()
            ?.toLowerCase()
            || 'jpg'


        uploadedPath =
          `${user.id}/${crypto.randomUUID()}.${extension}`


        const {
          error:
            uploadError
        } = await supabase
          .storage
          .from(
            'player-images'
          )
          .upload(
            uploadedPath,
            image,
            {
              upsert: false
            }
          )


        if (uploadError) {
          throw uploadError
        }


        const {
          data:
            publicUrlData
        } = supabase
          .storage
          .from(
            'player-images'
          )
          .getPublicUrl(
            uploadedPath
          )


        imageUrl =
          publicUrlData
            .publicUrl
      }


      const {
        error:
          insertError
      } = await supabase
        .from('players')
        .insert({
          owner_id:
            user.id,

          name:
            cleanName,

          image_url:
            imageUrl,

          image_path:
            uploadedPath
        })


      if (insertError) {
        throw insertError
      }


      setName('')
      setImage(null)
      setPreview('')

      setSuccess(
        `${cleanName} added to your player library.`
      )


      await loadPlayers()
    } catch (createError) {
      if (uploadedPath) {
        await supabase
          .storage
          .from(
            'player-images'
          )
          .remove([
            uploadedPath
          ])
      }


      if (
        createError.code ===
        '23505'
      ) {
        setError(
          'A player with this name already exists.'
        )
      } else {
        setError(
          createError.message ||
          'Unable to create player.'
        )
      }
    } finally {
      setSaving(false)
    }
  }


  async function deletePlayer(
    player
  ) {
    const confirmed =
      window.confirm(
        `Delete ${player.name} from your player library? Historical tournament records will remain unchanged.`
      )


    if (!confirmed) {
      return
    }


    setError('')
    setSuccess('')


    const {
      error:
        deleteError
    } = await supabase
      .from('players')
      .delete()
      .eq(
        'id',
        player.id
      )


    if (deleteError) {
      setError(
        deleteError.message
      )

      return
    }


    if (
      player.image_path
    ) {
      await supabase
        .storage
        .from(
          'player-images'
        )
        .remove([
          player.image_path
        ])
    }


    setSuccess(
      `${player.name} removed from your player library.`
    )


    await loadPlayers()
  }


  return (
    <main className="players-page">

      <div className="players-container">

        <header className="players-header">

          <div>
            <p className="eyebrow">
              PLAYER LIBRARY
            </p>

            <h1>
              Players
            </h1>

            <p>
              Create players once and reuse them across future tournaments.
            </p>
          </div>

          <div className="players-total">
            <strong>
              {players.length}
            </strong>

            <span>
              Total Players
            </span>
          </div>

        </header>


        {error && (
          <div className="players-error">
            {error}
          </div>
        )}


        {success && (
          <div className="players-success">
            {success}
          </div>
        )}


        <section className="create-player-card">

          <div className="create-player-heading">
            <h2>
              Add Player
            </h2>

            <p>
              Player images are optional.
            </p>
          </div>


          <form
            className="create-player-form"
            onSubmit={
              createPlayer
            }
          >

            <label
              className="player-image-upload"
            >

              {preview ? (
                <img
                  src={preview}
                  alt=""
                />
              ) : (
                <div className="player-image-placeholder">
                  <span>
                    +
                  </span>

                  <small>
                    Photo
                  </small>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={
                  selectImage
                }
              />

            </label>


            <div className="player-name-field">

              <label>
                Player Name
              </label>

              <input
                type="text"
                value={name}
                placeholder="Enter player name"
                onChange={
                  (event) =>
                    setName(
                      event
                        .target
                        .value
                    )
                }
              />

            </div>


            <button
              type="submit"
              className="create-player-button"
              disabled={saving}
            >
              {
                saving
                  ? 'Adding...'
                  : '+ Add Player'
              }
            </button>

          </form>

        </section>


        <section className="player-library-section">

          <div className="player-library-heading">

            <div>
              <p className="eyebrow">
                SAVED PLAYERS
              </p>

              <h2>
                Player Library
              </h2>
            </div>

          </div>


          {loading ? (
            <div className="players-empty">
              Loading Players...
            </div>
          ) : players.length === 0 ? (
            <div className="players-empty">

              <strong>
                No Players Yet.
              </strong>

              <p>
                Add your first reusable player above.
              </p>

            </div>
          ) : (
            <div className="player-library-grid">

              {players.map(
                (player) => (
                  <article
                    key={
                      player.id
                    }
                    className="global-player-card"
                  >

                    <div className="global-player-avatar">

                      {player.image_url ? (
                        <img
                          src={
                            player
                              .image_url
                          }
                          alt={
                            player.name
                          }
                        />
                      ) : (
                        <span>
                          {
                            player.name
                              .charAt(0)
                              .toUpperCase()
                          }
                        </span>
                      )}

                    </div>


                    <div className="global-player-info">

                      <strong>
                        {player.name}
                      </strong>

                      <span>
                        Universal Player
                      </span>

                    </div>


                    <button
                      type="button"
                      className="delete-global-player"
                      onClick={() =>
                        deletePlayer(
                          player
                        )
                      }
                    >
                      Delete
                    </button>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>

    </main>
  )
}


export default PlayersPage
