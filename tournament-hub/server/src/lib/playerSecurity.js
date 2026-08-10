import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual
} from 'node:crypto'

import {
  promisify
} from 'node:util'


const scryptAsync =
  promisify(
    scrypt
  )


export async function hashPassword(
  password
) {
  const salt =
    randomBytes(
      32
    ).toString(
      'hex'
    )

  const derivedKey =
    await scryptAsync(
      password,
      salt,
      64
    )

  return {
    salt,

    hash:
      Buffer
        .from(
          derivedKey
        )
        .toString(
          'hex'
        )
  }
}


export async function verifyPassword(
  password,
  salt,
  storedHash
) {
  const derivedKey =
    await scryptAsync(
      password,
      salt,
      64
    )

  const supplied =
    Buffer.from(
      derivedKey
    )

  const expected =
    Buffer.from(
      storedHash,
      'hex'
    )


  if (
    supplied.length !==
    expected.length
  ) {
    return false
  }


  return timingSafeEqual(
    supplied,
    expected
  )
}


export function createSessionToken() {
  return randomBytes(
    48
  ).toString(
    'base64url'
  )
}


export function hashSessionToken(
  token
) {
  return createHash(
    'sha256'
  )
    .update(
      token
    )
    .digest(
      'hex'
    )
}


export function parseCookies(
  header = ''
) {
  return Object.fromEntries(
    header
      .split(';')
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean)
      .map(
        (part) => {
          const index =
            part.indexOf('=')

          if (
            index === -1
          ) {
            return [
              part,
              ''
            ]
          }

          return [
            decodeURIComponent(
              part.slice(
                0,
                index
              )
            ),

            decodeURIComponent(
              part.slice(
                index + 1
              )
            )
          ]
        }
      )
  )
}
