import pg from 'pg'

const {
  Pool
} = pg


if (
  !process.env.PLAYER_DATABASE_URL
) {
  throw new Error(
    'PLAYER_DATABASE_URL is required.'
  )
}


export const playerDb =
  new Pool({
    connectionString:
      process.env.PLAYER_DATABASE_URL,

    ssl:
      process.env.PLAYER_DATABASE_SSL ===
      'true'
        ? {
            rejectUnauthorized:
              false
          }
        : undefined
  })


playerDb.on(
  'error',
  (error) => {
    console.error(
      'Unexpected player database error:',
      error
    )
  }
)


export async function withPlayerTransaction(
  callback
) {
  const client =
    await playerDb.connect()

  try {
    await client.query(
      'begin'
    )

    const result =
      await callback(
        client
      )

    await client.query(
      'commit'
    )

    return result
  } catch (error) {
    await client.query(
      'rollback'
    )

    throw error
  } finally {
    client.release()
  }
}
