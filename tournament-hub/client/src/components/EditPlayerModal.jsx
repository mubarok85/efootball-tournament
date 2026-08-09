import {
  useEffect,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './EditPlayerModal.css'


function EditPlayerModal({
  player,
  user,
  onClose,
  onUpdated
}) {
  const [
    name,
    setName
  ] = useState(
    player.name
  )

  const [
    newImage,
    setNewImage
  ] = useState(null)

  const [
    preview,
    setPreview
  ] = useState(
    player.image_url || ''
  )

  const [
    removeImage,
    setRemoveImage
  ] = useState(false)

  const [
    saving,
    setSaving
  ] = useState(false)

  const [
    error,
    setError
  ] = useState('')


  useEffect(
    () => {
      return () => {
        if (
          preview &&
          preview.startsWith(
            'blob:'
          )
        ) {
          URL.revokeObjectURL(
            preview
          )
        }
      }
    },
    [preview]
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


    if (
      preview &&
      preview.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        preview
      )
    }


    setNewImage(file)

    setPreview(
      URL.createObjectURL(
        file
      )
    )

    setRemoveImage(false)
    setError('')
  }


  function removeCurrentImage() {
    if (
      preview &&
      preview.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        preview
      )
    }


    setNewImage(null)
    setPreview('')
    setRemoveImage(true)
    setError('')
  }


  async function savePlayer(
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


    let uploadedPath = null
    let nextImageUrl =
      player.image_url

    let nextImagePath =
      player.image_path


    try {
      if (newImage) {
        const extension =
          newImage.name
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
            newImage,
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


        nextImageUrl =
          publicUrlData
            .publicUrl

        nextImagePath =
          uploadedPath
      }


      if (
        removeImage &&
        !newImage
      ) {
        nextImageUrl = null
        nextImagePath = null
      }


      const {
        error:
          updateError
      } = await supabase
        .from('players')
        .update({
          name:
            cleanName,

          image_url:
            nextImageUrl,

          image_path:
            nextImagePath,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          player.id
        )
        .eq(
          'owner_id',
          user.id
        )


      if (updateError) {
        throw updateError
      }


      /*
       * Only delete the old file after
       * the database update succeeds.
       */
      if (
        player.image_path &&
        (
          newImage ||
          removeImage
        )
        &&
        player.image_path !==
          nextImagePath
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


      if (onUpdated) {
        await onUpdated()
      }


      onClose()
    } catch (saveError) {
      /*
       * If a newly uploaded image
       * exists but the database update
       * failed, clean that file up.
       */
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
        saveError.code ===
        '23505'
      ) {
        setError(
          'A player with this name already exists.'
        )
      } else {
        setError(
          saveError.message ||
          'Unable to update player.'
        )
      }
    } finally {
      setSaving(false)
    }
  }


  return (
    <div
      className="edit-player-overlay"
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose()
          }
        }
      }
    >

      <div className="edit-player-modal">

        <div className="edit-player-header">

          <div>
            <p className="eyebrow">
              PLAYER PROFILE
            </p>

            <h2>
              Edit Player
            </h2>
          </div>


          <button
            type="button"
            className="edit-player-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {error && (
          <div className="edit-player-error">
            {error}
          </div>
        )}


        <form
          onSubmit={savePlayer}
          className="edit-player-form"
        >

          <div className="edit-player-photo-area">

            <div className="edit-player-photo">

              {preview ? (
                <img
                  src={preview}
                  alt=""
                />
              ) : (
                <span>
                  {
                    name
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                    ||
                    '?'
                  }
                </span>
              )}

            </div>


            <div className="edit-player-photo-actions">

              <label className="edit-photo-button">

                Change Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    selectImage
                  }
                />

              </label>


              {preview && (
                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={
                    removeCurrentImage
                  }
                >
                  Remove Photo
                </button>
              )}

            </div>

          </div>


          <div className="edit-player-field">

            <label>
              Player Name
            </label>

            <input
              type="text"
              value={name}
              placeholder="Player name"
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


          <div className="edit-player-note">
            Changes apply to this universal player profile. Existing tournament records keep their original participant snapshot.
          </div>


          <div className="edit-player-actions">

            <button
              type="button"
              className="edit-player-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>


            <button
              type="submit"
              className="edit-player-save"
              disabled={saving}
            >
              {
                saving
                  ? 'Saving...'
                  : 'Save Changes'
              }
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}


export default EditPlayerModal
