import {
  Router
} from 'express'

import {
  playerDb
} from '../lib/playerDb.js'

import {
  supabaseAdmin
} from '../lib/supabaseAdmin.js'

import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from '../lib/playerSecurity.js'

import {
  getPlayerSessionToken,
  requirePlayerSession
} from '../middleware/playerSession.js'

import {
  requirePlatformAdmin
} from '../middleware/platformAdmin.js'


const router =
  Router()


function cleanName(
  value
) {
  return String(
    value ||
    ''
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
}


function cleanUsername(
  value
) {
  return String(
    value ||
    ''
  ).trim()
}


function cleanEmail(
  value
) {
  return String(
    value ||
    ''
  )
    .trim()
    .toLowerCase()
}


function apiBase(
  req
) {
  const configured =
    String(
      process.env.PUBLIC_API_BASE_URL ||
      ''
    )
      .trim()
      .replace(
        /\/+$/,
        ''
      )


  if (configured) {
    return configured
  }


  const protocol =
    String(
      req.headers[
        'x-forwarded-proto'
      ] ||
      req.protocol ||
      'http'
    )
      .split(',')[0]
      .trim()


  return (
    `${protocol}://${req.get('host')}`
  )
}


function avatarUrl(
  req,
  accountId,
  version
) {
  return (
    `${apiBase(req)}/api/player-accounts/avatar/${accountId}?v=${version || Date.now()}`
  )
}


function accountJson(
  req,
  account
) {
  return {
    id:
      account.id,

    global_player_id:
      account.global_player_id,

    full_name:
      account.full_name,

    username:
      account.username,

    email:
      account.email,

    approval_status:
      account.approval_status,

    has_profile_photo:
      Boolean(
        account.profile_photo_mime
      ),

    avatar_url:
      account.profile_photo_mime
        ? avatarUrl(
            req,
            account.id,
            account.updated_at
              ? new Date(
                  account.updated_at
                ).getTime()
              : Date.now()
          )
        : null,

    created_at:
      account.created_at,

    updated_at:
      account.updated_at
  }
}


function setSessionCookie(
  res,
  token
) {
  const secure =
    process.env.NODE_ENV ===
    'production'


  const cookie = [
    `peslover_player_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    secure
      ? 'SameSite=None'
      : 'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 30}`
  ]


  if (secure) {
    cookie.push(
      'Secure'
    )
  }


  res.setHeader(
    'Set-Cookie',
    cookie.join('; ')
  )
}


function clearSessionCookie(
  res
) {
  const secure =
    process.env.NODE_ENV ===
    'production'


  const cookie = [
    'peslover_player_session=',
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    secure
      ? 'SameSite=None'
      : 'SameSite=Lax'
  ]


  if (secure) {
    cookie.push(
      'Secure'
    )
  }


  res.setHeader(
    'Set-Cookie',
    cookie.join('; ')
  )
}


async function synchronizePlayer(
  req,
  account
) {
  if (
    !account.global_player_id
  ) {
    return
  }


  const imageUrl =
    account.profile_photo_mime
      ? avatarUrl(
          req,
          account.id,
          Date.now()
        )
      : null


  const {
    error:
      playerError
  } =
    await supabaseAdmin
      .from('players')
      .update({
        name:
          account.full_name,

        image_url:
          imageUrl
      })
      .eq(
        'id',
        account.global_player_id
      )


  if (playerError) {
    throw playerError
  }


  /*
   * The user wants the latest player
   * name/photo shown everywhere.
   *
   * Update every tournament assignment
   * attached to the same global player.
   */
  const {
    error:
      participantError
  } =
    await supabaseAdmin
      .from('tournament_players')
      .update({
        name:
          account.full_name,

        image_url:
          imageUrl
      })
      .eq(
        'master_player_id',
        account.global_player_id
      )


  if (participantError) {
    throw participantError
  }
}


async function ensurePlayerRating(
  playerId
) {
  const {
    data
  } =
    await supabaseAdmin
      .from('player_ratings')
      .select(
        'player_id'
      )
      .eq(
        'player_id',
        playerId
      )
      .maybeSingle()


  if (data) {
    return
  }


  const {
    error
  } =
    await supabaseAdmin
      .from('player_ratings')
      .insert({
        player_id:
          playerId,

        current_rating:
          1000,

        peak_rating:
          1000,

        lowest_rating:
          1000,

        matches_played:
          0,

        wins:
          0,

        draws:
          0,

        losses:
          0,

        goals_for:
          0,

        goals_against:
          0,

        last_change:
          0
      })


  if (error) {
    throw error
  }
}


/* ============================================================
   REGISTER
   ============================================================ */

router.post(
  '/register',
  async (
    req,
    res,
    next
  ) => {
    try {
      const fullName =
        cleanName(
          req.body.full_name
        )

      const username =
        cleanUsername(
          req.body.username
        )

      const email =
        cleanEmail(
          req.body.email
        )

      const password =
        String(
          req.body.password ||
          ''
        )


      if (
        fullName.length <
        2
        ||
        fullName.length >
        80
      ) {
        return res
          .status(400)
          .json({
            message:
              'Player name must contain 2 to 80 characters.'
          })
      }


      if (
        !/^[a-zA-Z0-9_.-]{3,30}$/
          .test(
            username
          )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Username must contain 3 to 30 letters, numbers, dots, underscores or hyphens.'
          })
      }


      if (
        !email.includes('@')
        ||
        email.length >
        160
      ) {
        return res
          .status(400)
          .json({
            message:
              'Enter a valid email address.'
          })
      }


      if (
        password.length <
        8
        ||
        password.length >
        128
      ) {
        return res
          .status(400)
          .json({
            message:
              'Password must contain at least 8 characters.'
          })
      }


      const {
        salt,
        hash
      } =
        await hashPassword(
          password
        )


      const {
        rows
      } =
        await playerDb.query(
          `
            insert into player_accounts (
              full_name,
              username,
              email,
              password_salt,
              password_hash,
              approval_status
            )

            values (
              $1,
              $2,
              $3,
              $4,
              $5,
              'pending'
            )

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            fullName,
            username,
            email,
            salt,
            hash
          ]
        )


      return res
        .status(201)
        .json({
          message:
            'Registration submitted. A PESLOVER administrator must approve your account before you can log in.',

          account:
            accountJson(
              req,
              rows[0]
            )
        })

    } catch (error) {
      if (
        error.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            message:
              'That username or email address is already registered.'
          })
      }


      next(error)
    }
  }
)


/* ============================================================
   LOGIN
   ============================================================ */

router.post(
  '/login',
  async (
    req,
    res,
    next
  ) => {
    try {
      const login =
        String(
          req.body.login ||
          ''
        )
          .trim()
          .toLowerCase()

      const password =
        String(
          req.body.password ||
          ''
        )


      const {
        rows
      } =
        await playerDb.query(
          `
            select *

            from player_accounts

            where
              lower(email) =
                $1

              or

              lower(username) =
                $1

            limit 1
          `,
          [
            login
          ]
        )


      const account =
        rows[0]


      if (!account) {
        return res
          .status(401)
          .json({
            message:
              'Incorrect username/email or password.'
          })
      }


      const validPassword =
        await verifyPassword(
          password,
          account.password_salt,
          account.password_hash
        )


      if (!validPassword) {
        return res
          .status(401)
          .json({
            message:
              'Incorrect username/email or password.'
          })
      }


      if (
        account.approval_status !==
        'approved'
      ) {
        const messages = {
          pending:
            'Your account is waiting for administrator approval.',

          rejected:
            'Your registration was rejected.',

          suspended:
            'Your player account is suspended.'
        }


        return res
          .status(403)
          .json({
            code:
              account
                .approval_status
                .toUpperCase(),

            message:
              messages[
                account
                  .approval_status
              ]
              ||
              'Your account cannot log in.'
          })
      }


      const token =
        createSessionToken()


      await playerDb.query(
        `
          delete from player_sessions

          where
            expires_at <=
              now()
        `
      )


      await playerDb.query(
        `
          insert into player_sessions (
            account_id,
            token_hash,
            expires_at
          )

          values (
            $1,
            $2,
            now() +
              interval '30 days'
          )
        `,
        [
          account.id,
          hashSessionToken(
            token
          )
        ]
      )


      await playerDb.query(
        `
          update player_accounts

          set
            last_login_at =
              now(),

            updated_at =
              now()

          where
            id =
              $1
        `,
        [
          account.id
        ]
      )


      setSessionCookie(
        res,
        token
      )


      return res.json({
        message:
          'Login successful.',

        session_token:
          token,

        account:
          accountJson(
            req,
            account
          )
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   CURRENT PLAYER
   ============================================================ */

router.get(
  '/me',
  requirePlayerSession,
  (
    req,
    res
  ) => {
    return res.json({
      account:
        accountJson(
          req,
          req.playerAccount
        )
    })
  }
)


/* ============================================================
   LOGOUT
   ============================================================ */

router.post(
  '/logout',
  async (
    req,
    res,
    next
  ) => {
    try {
      const token =
        getPlayerSessionToken(
          req
        )


      if (token) {
        await playerDb.query(
          `
            delete from player_sessions

            where
              token_hash =
                $1
          `,
          [
            hashSessionToken(
              token
            )
          ]
        )
      }


      clearSessionCookie(
        res
      )


      return res.json({
        message:
          'Logged out successfully.'
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   EDIT PROFILE
   ============================================================ */

router.patch(
  '/profile',
  requirePlayerSession,
  async (
    req,
    res,
    next
  ) => {
    try {
      const fullName =
        cleanName(
          req.body.full_name
        )

      const username =
        cleanUsername(
          req.body.username
        )


      if (
        fullName.length <
        2
        ||
        fullName.length >
        80
      ) {
        return res
          .status(400)
          .json({
            message:
              'Player name must contain 2 to 80 characters.'
          })
      }


      if (
        !/^[a-zA-Z0-9_.-]{3,30}$/
          .test(
            username
          )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Username is invalid.'
          })
      }


      const {
        rows
      } =
        await playerDb.query(
          `
            update player_accounts

            set
              full_name =
                $1,

              username =
                $2,

              updated_at =
                now()

            where
              id =
                $3

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            fullName,
            username,
            req.playerAccount.id
          ]
        )


      const account =
        rows[0]


      await synchronizePlayer(
        req,
        account
      )


      return res.json({
        message:
          'Profile updated across PESLOVER.',

        account:
          accountJson(
            req,
            account
          )
      })

    } catch (error) {
      if (
        error.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            message:
              'That username is already being used.'
          })
      }


      next(error)
    }
  }
)


/* ============================================================
   PROFILE PHOTO
   ============================================================ */

router.put(
  '/profile-photo',
  requirePlayerSession,
  async (
    req,
    res,
    next
  ) => {
    try {
      const imageData =
        String(
          req.body.image_data_url ||
          ''
        )


      const match =
        imageData.match(
          /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i
        )


      if (!match) {
        return res
          .status(400)
          .json({
            message:
              'Upload a JPG, PNG or WEBP image.'
          })
      }


      const image =
        Buffer.from(
          match[2],
          'base64'
        )


      if (
        image.length >
        2 * 1024 * 1024
      ) {
        return res
          .status(400)
          .json({
            message:
              'Profile photo must be 2 MB or smaller.'
          })
      }


      const {
        rows
      } =
        await playerDb.query(
          `
            update player_accounts

            set
              profile_photo =
                $1,

              profile_photo_mime =
                $2,

              updated_at =
                now()

            where
              id =
                $3

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            image,
            match[1].toLowerCase(),
            req.playerAccount.id
          ]
        )


      const account =
        rows[0]


      await synchronizePlayer(
        req,
        account
      )


      return res.json({
        message:
          'Profile photo updated across PESLOVER.',

        account:
          accountJson(
            req,
            account
          )
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   PUBLIC PLAYER AVATAR
   ============================================================ */

router.get(
  '/avatar/:accountId',
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        rows
      } =
        await playerDb.query(
          `
            select
              profile_photo,
              profile_photo_mime

            from player_accounts

            where
              id =
                $1

              and
              approval_status =
                'approved'

            limit 1
          `,
          [
            req.params
              .accountId
          ]
        )


      const account =
        rows[0]


      if (
        !account
        ||
        !account.profile_photo
      ) {
        return res
          .status(404)
          .end()
      }


      res.setHeader(
        'Content-Type',
        account
          .profile_photo_mime
      )


      res.setHeader(
        'Cache-Control',
        'public, max-age=300'
      )


      return res.send(
        account.profile_photo
      )

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   ADMIN - GET PLAYER ACCOUNTS
   ============================================================ */

router.get(
  '/admin/requests',
  requirePlatformAdmin,
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        rows:
          accounts
      } =
        await playerDb.query(
          `
            select
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              approved_at,
              created_at,
              updated_at

            from player_accounts

            order by
              case
                when approval_status =
                  'pending'
                then 0
                else 1
              end,

              created_at desc
          `
        )


      const {
        data:
          globalPlayers,
        error
      } =
        await supabaseAdmin
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
          )


      if (error) {
        throw error
      }


      return res.json({
        accounts:
          accounts.map(
            (account) =>
              accountJson(
                req,
                account
              )
          ),

        global_players:
          globalPlayers ||
          []
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   ADMIN - APPROVE
   ============================================================ */

router.post(
  '/admin/:accountId/approve',
  requirePlatformAdmin,
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        rows
      } =
        await playerDb.query(
          `
            select *

            from player_accounts

            where
              id =
                $1

            limit 1
          `,
          [
            req.params
              .accountId
          ]
        )


      const account =
        rows[0]


      if (!account) {
        return res
          .status(404)
          .json({
            message:
              'Player registration not found.'
          })
      }


      let globalPlayerId =
        account.global_player_id


      const requestedPlayerId =
        String(
          req.body
            .global_player_id ||
          ''
        )
          .trim()


      /*
       * Existing Player Library entry selected.
       */
      if (
        !globalPlayerId
        &&
        requestedPlayerId
      ) {
        const {
          data:
            selectedPlayer,
          error
        } =
          await supabaseAdmin
            .from('players')
            .select(
              'id, name'
            )
            .eq(
              'id',
              requestedPlayerId
            )
            .maybeSingle()


        if (
          error ||
          !selectedPlayer
        ) {
          return res
            .status(400)
            .json({
              message:
                'Selected global player could not be found.'
            })
        }


        const {
          rows:
            alreadyLinked
        } =
          await playerDb.query(
            `
              select id

              from player_accounts

              where
                global_player_id =
                  $1

                and
                id <>
                  $2

              limit 1
            `,
            [
              selectedPlayer.id,
              account.id
            ]
          )


        if (
          alreadyLinked.length >
          0
        ) {
          return res
            .status(409)
            .json({
              message:
                'That global player already belongs to another registered account.'
            })
        }


        globalPlayerId =
          selectedPlayer.id
      }


      /*
       * No existing player selected.
       *
       * Check for an exact-name duplicate
       * before creating another identity.
       */
      if (!globalPlayerId) {
        const {
          data:
            possibleDuplicates,
          error:
            duplicateError
        } =
          await supabaseAdmin
            .from('players')
            .select(
              'id, name'
            )
            .ilike(
              'name',
              account.full_name
            )


        if (duplicateError) {
          throw duplicateError
        }


        if (
          possibleDuplicates &&
          possibleDuplicates.length >
          0
          &&
          req.body
            .confirm_new_player !==
            true
        ) {
          return res
            .status(409)
            .json({
              code:
                'POSSIBLE_DUPLICATE_PLAYER',

              message:
                'A player with this name already exists. Link the registration to that player, or explicitly confirm that this is a different person.',

              possible_players:
                possibleDuplicates
            })
        }


        const imageUrl =
          account
            .profile_photo_mime
            ? avatarUrl(
                req,
                account.id,
                Date.now()
              )
            : null


        const {
          data:
            newPlayer,
          error:
            playerError
        } =
          await supabaseAdmin
            .from('players')
            .insert({
              owner_id:
                req
                  .platformAdmin
                  .user
                  .id,

              name:
                account.full_name,

              image_url:
                imageUrl,

              image_path:
                null
            })
            .select(
              'id, name'
            )
            .single()


        if (playerError) {
          throw playerError
        }


        globalPlayerId =
          newPlayer.id
      }


      const {
        rows:
          approvedRows
      } =
        await playerDb.query(
          `
            update player_accounts

            set
              global_player_id =
                $1,

              approval_status =
                'approved',

              approved_by =
                $2,

              approved_at =
                now(),

              updated_at =
                now()

            where
              id =
                $3

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            globalPlayerId,

            req
              .platformAdmin
              .user
              .email
              ||
              req
                .platformAdmin
                .user
                .id,

            account.id
          ]
        )


      const approved =
        approvedRows[0]


      await ensurePlayerRating(
        globalPlayerId
      )


      await synchronizePlayer(
        req,
        approved
      )


      return res.json({
        message:
          'Player approved successfully.',

        account:
          accountJson(
            req,
            approved
          )
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   ADMIN - REJECT
   ============================================================ */

router.post(
  '/admin/:accountId/reject',
  requirePlatformAdmin,
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        rows
      } =
        await playerDb.query(
          `
            update player_accounts

            set
              approval_status =
                'rejected',

              updated_at =
                now()

            where
              id =
                $1

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            req.params
              .accountId
          ]
        )


      if (
        rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            message:
              'Player account not found.'
          })
      }


      return res.json({
        message:
          'Player registration rejected.',

        account:
          accountJson(
            req,
            rows[0]
          )
      })

    } catch (error) {
      next(error)
    }
  }
)


/* ============================================================
   ADMIN - SUSPEND
   ============================================================ */

router.post(
  '/admin/:accountId/suspend',
  requirePlatformAdmin,
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        rows
      } =
        await playerDb.query(
          `
            update player_accounts

            set
              approval_status =
                'suspended',

              updated_at =
                now()

            where
              id =
                $1

            returning
              id,
              global_player_id,
              full_name,
              username,
              email,
              approval_status,
              profile_photo_mime,
              created_at,
              updated_at
          `,
          [
            req.params
              .accountId
          ]
        )


      await playerDb.query(
        `
          delete from player_sessions

          where
            account_id =
              $1
        `,
        [
          req.params
            .accountId
        ]
      )


      if (
        rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            message:
              'Player account not found.'
          })
      }


      return res.json({
        message:
          'Player account suspended.',

        account:
          accountJson(
            req,
            rows[0]
          )
      })

    } catch (error) {
      next(error)
    }
  }
)



/*
 * =====================================================
 * PERMANENT GLOBAL PLAYER DELETION
 *
 * Admin / Super Admin only.
 *
 * Database cleanup is performed atomically by
 * admin_permanently_delete_player().
 * =====================================================
 */
router.delete(
  '/admin/global-players/:id',
  requirePlatformAdmin,
  async (
    req,
    res,
    next
  ) => {
    try {
      const role =
        req
          .platformAdmin
          ?.profile
          ?.role

      if (
        ![
          'admin',
          'super_admin'
        ].includes(
          role
        )
      ) {
        return res
          .status(403)
          .json({
            message:
              'Only an Admin or Super Admin can permanently delete a player.'
          })
      }

      if (
        req.body
          ?.confirmation !==
        'DELETE'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Type DELETE to confirm permanent player deletion.'
          })
      }

      const playerId =
        String(
          req.params.id ||
          ''
        ).trim()

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (
        !uuidPattern.test(
          playerId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid player ID.'
          })
      }

      const {
        supabase
      } = req

      if (!supabase) {
        throw new Error(
          'Admin database client is unavailable.'
        )
      }

      const {
        data,
        error:
          deleteError
      } =
        await supabase
          .rpc(
            'admin_permanently_delete_player',
            {
              p_player_id:
                playerId
            }
          )

      if (deleteError) {
        const message =
          deleteError.message ||
          'Unable to permanently delete player.'

        const status =
          message.includes(
            'Player not found'
          )
            ? 404
            : 409

        return res
          .status(status)
          .json({
            message
          })
      }

      /*
       * Database deletion is already committed.
       * Remove the optional Storage image afterwards.
       * Storage cleanup does not affect DB integrity.
       */
      let imageCleanupFailed =
        false

      if (
        data?.image_path
      ) {
        const {
          error:
            imageError
        } =
          await supabase
            .storage
            .from(
              'player-images'
            )
            .remove([
              data.image_path
            ])

        if (imageError) {
          imageCleanupFailed =
            true

          console.error(
            'Unable to remove deleted player image:',
            imageError
          )
        }
      }

      return res.json({
        message:
          `${data?.player_name || 'Player'} was permanently deleted.`,

        deletion:
          data,

        image_cleanup_failed:
          imageCleanupFailed
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
