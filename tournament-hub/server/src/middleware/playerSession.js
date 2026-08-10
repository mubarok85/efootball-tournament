import {
  playerDb
} from '../lib/playerDb.js'

import {
  hashSessionToken,
  parseCookies
} from '../lib/playerSecurity.js'


export function getPlayerSessionToken(
  req
) {
  const authorization =
    String(
      req.headers.authorization ||
      ''
    )

  if (
    authorization.startsWith(
      'Bearer '
    )
  ) {
    return authorization
      .slice(7)
      .trim()
  }


  const cookies =
    parseCookies(
      req.headers.cookie ||
      ''
    )


  return (
    cookies
      .peslover_player_session
    ||
    null
  )
}


export async function requirePlayerSession(
  req,
  res,
  next
) {
  try {
    const token =
      getPlayerSessionToken(
        req
      )


    if (!token) {
      return res
        .status(401)
        .json({
          message:
            'Player login required.'
        })
    }


    const tokenHash =
      hashSessionToken(
        token
      )


    const {
      rows
    } =
      await playerDb.query(
        `
          select
            a.id,
            a.global_player_id,
            a.full_name,
            a.username,
            a.email,
            a.approval_status,
            a.profile_photo_mime,
            a.created_at,
            a.updated_at

          from player_sessions s

          join player_accounts a
            on a.id =
              s.account_id

          where
            s.token_hash =
              $1

            and
            s.expires_at >
              now()

          limit 1
        `,
        [
          tokenHash
        ]
      )


    const account =
      rows[0]


    if (!account) {
      return res
        .status(401)
        .json({
          message:
            'Your login session has expired.'
        })
    }


    if (
      account.approval_status !==
      'approved'
    ) {
      return res
        .status(403)
        .json({
          message:
            'Your player account is not approved.'
        })
    }


    req.playerAccount =
      account

    req.playerSessionToken =
      token


    next()

  } catch (error) {
    next(error)
  }
}
