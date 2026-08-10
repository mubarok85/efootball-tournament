import {
  supabaseAdmin
} from '../lib/supabaseAdmin.js'


function getBearerToken(req) {
  const header =
    String(
      req.headers.authorization ||
      ''
    )

  if (
    !header.startsWith(
      'Bearer '
    )
  ) {
    return null
  }

  return header
    .slice(7)
    .trim()
}


export async function requirePlatformAdmin(
  req,
  res,
  next
) {
  try {
    const token =
      getBearerToken(req)


    if (!token) {
      return res
        .status(401)
        .json({
          message:
            'Administrator authentication required.'
        })
    }


    const {
      data: {
        user
      },
      error:
        authError
    } =
      await supabaseAdmin
        .auth
        .getUser(token)


    if (
      authError ||
      !user
    ) {
      return res
        .status(401)
        .json({
          message:
            'Invalid administrator session.'
        })
    }


    const {
      data:
        profile,
      error:
        profileError
    } =
      await supabaseAdmin
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          approval_status
        `)
        .eq(
          'id',
          user.id
        )
        .maybeSingle()


    if (
      profileError ||
      !profile
    ) {
      return res
        .status(403)
        .json({
          message:
            'Administrator profile not found.'
        })
    }


    const allowedRoles =
      new Set([
        'super_admin',
        'admin',
        'organizer'
      ])


    if (
      profile.approval_status !==
      'approved'
      ||
      !allowedRoles.has(
        profile.role
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            'Approved administrator access required.'
        })
    }


    req.platformAdmin = {
      user,
      profile
    }


    next()

  } catch (error) {
    next(error)
  }
}
