import './ParticipantAvatar.css'


function ParticipantAvatar({
  name = '',
  imageUrl = null,
  imageUrls = [],
  size = 'md'
}) {
  const images = [
    imageUrl,
    ...imageUrls
  ]
    .filter(Boolean)
    .filter(
      (
        value,
        index,
        array
      ) =>
        array.indexOf(
          value
        ) === index
    )
    .slice(0, 2)


  const initial =
    name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    '?'


  if (
    images.length === 0
  ) {
    return (
      <div
        className={
          `participant-avatar-root participant-avatar-${size}`
        }
        title={name}
      >
        <div className="participant-avatar-fallback">
          {initial}
        </div>
      </div>
    )
  }


  if (
    images.length === 1
  ) {
    return (
      <div
        className={
          `participant-avatar-root participant-avatar-${size}`
        }
        title={name}
      >
        <img
          className="participant-avatar-image"
          src={images[0]}
          alt=""
        />
      </div>
    )
  }


  return (
    <div
      className={
        `participant-avatar-root participant-avatar-${size} participant-avatar-stack`
      }
      title={name}
    >
      <img
        className="participant-avatar-image participant-avatar-stack-first"
        src={images[0]}
        alt=""
      />

      <img
        className="participant-avatar-image participant-avatar-stack-second"
        src={images[1]}
        alt=""
      />
    </div>
  )
}


export default ParticipantAvatar
