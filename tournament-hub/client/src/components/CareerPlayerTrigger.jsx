import {
  useState
} from 'react'

import {
  createPortal
} from 'react-dom'

import GlobalPlayerProfileModal from './GlobalPlayerProfileModal'

import './CareerPlayerTrigger.css'


function CareerPlayerTrigger({
  globalPlayerId,
  children,
  className = '',
  as = 'div',
  title = '',
  stopPointerDown = false
}) {
  const [
    open,
    setOpen
  ] = useState(false)


  const Tag = as


  if (!globalPlayerId) {
    return (
      <Tag className={className}>
        {children}
      </Tag>
    )
  }


  function openCareer(
    event
  ) {
    event?.stopPropagation()

    setOpen(true)
  }


  function handleKeyDown(
    event
  ) {
    if (
      event.key === 'Enter'
      ||
      event.key === ' '
    ) {
      event.preventDefault()
      event.stopPropagation()

      setOpen(true)
    }
  }


  function handlePointerDown(
    event
  ) {
    if (
      stopPointerDown
    ) {
      event.stopPropagation()
    }
  }


  return (
    <>
      <Tag
        className={
          [
            className,
            'career-player-trigger'
          ]
            .filter(Boolean)
            .join(' ')
        }
        role="button"
        tabIndex={0}
        title={
          title ||
          'View player career'
        }
        onClick={
          openCareer
        }
        onKeyDown={
          handleKeyDown
        }
        onPointerDown={
          handlePointerDown
        }
      >
        {children}
      </Tag>


      {open &&
        createPortal(
          <GlobalPlayerProfileModal
            playerId={
              globalPlayerId
            }
            onClose={() =>
              setOpen(false)
            }
          />,
          document.body
        )}
    </>
  )
}


export default CareerPlayerTrigger
