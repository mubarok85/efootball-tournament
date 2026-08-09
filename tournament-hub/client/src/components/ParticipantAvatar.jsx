import './ParticipantAvatar.css'


function PlayerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="participant-default-icon"
    >
      <path
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Z"
        fill="currentColor"
      />
    </svg>
  )
}


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
          <PlayerIcon />
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
