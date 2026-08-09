import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './TournamentPublicAccessCard.css'


function TournamentPublicAccessCard({
  tournament,
  onChanged
}) {
  const [
    isPublic,
    setIsPublic
  ] = useState(
    Boolean(
      tournament.is_public
    )
  )

  const [
    working,
    setWorking
  ] = useState(false)

  const [
    message,
    setMessage
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')


  useEffect(
    () => {
      setIsPublic(
        Boolean(
          tournament.is_public
        )
      )
    },
    [
      tournament.is_public
    ]
  )


  const publicUrl =
    useMemo(
      () =>
        window.location.origin,
      []
    )


  async function togglePublic() {
    setWorking(true)
    setMessage('')
    setError('')


    const nextState =
      !isPublic


    try {
      const {
        error:
          updateError
      } = await supabase
        .from(
          'tournaments'
        )
        .update({
          is_public:
            nextState,

          published_at:
            nextState
              ? new Date()
                  .toISOString()
              : null
        })
        .eq(
          'id',
          tournament.id
        )


      if (updateError) {
        throw updateError
      }


      setIsPublic(
        nextState
      )


      setMessage(
        nextState
          ? 'Public tournament page is now live.'
          : 'Tournament is now private.'
      )


      if (onChanged) {
        await onChanged()
      }
    } catch (updateError) {
      setError(
        updateError.message ||
        'Unable to update public access.'
      )
    } finally {
      setWorking(false)
    }
  }


  async function copyLink() {
    try {
      await navigator
        .clipboard
        .writeText(
          publicUrl
        )


      setMessage(
        'Public tournament link copied.'
      )
    } catch {
      window.prompt(
        'Copy this public tournament link:',
        publicUrl
      )
    }
  }


  function openPublicPage() {
    window.open(
      publicUrl,
      '_blank',
      'noopener,noreferrer'
    )
  }


  return (
    <div className="public-access-card">

      <div className="public-access-main">

        <div
          className={
            isPublic
              ? 'public-access-icon active'
              : 'public-access-icon'
          }
        >
          ◉
        </div>


        <div>

          <span className="public-access-label">
            PUBLIC TOURNAMENT PAGE
          </span>

          <h3>
            {
              isPublic
                ? 'Tournament Published.'
                : 'Tournament Private.'
            }
          </h3>

          <p>
            {
              isPublic
                ? 'The tournament is now visible on the public PESLOVER website.'
                : 'Publish this tournament when you are ready for it to appear on the public PESLOVER website.'
            }
          </p>

        </div>

      </div>


      {isPublic && (
        <div className="public-url-row">

          <input
            type="text"
            readOnly
            value={
              publicUrl
            }
          />


          <button
            type="button"
            onClick={
              copyLink
            }
          >
            Copy Link
          </button>


          <button
            type="button"
            className="open-public-page"
            onClick={
              openPublicPage
            }
          >
            Open
          </button>

        </div>
      )}


      {message && (
        <div className="public-access-message">
          {message}
        </div>
      )}


      {error && (
        <div className="public-access-error">
          {error}
        </div>
      )}


      <button
        type="button"
        className={
          isPublic
            ? 'public-toggle-button unpublish'
            : 'public-toggle-button'
        }
        disabled={working}
        onClick={
          togglePublic
        }
      >
        {
          working
            ? 'Updating...'
            : isPublic
              ? 'Make Private'
              : 'Publish Tournament'
        }
      </button>

    </div>
  )
}


export default TournamentPublicAccessCard
