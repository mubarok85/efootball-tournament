import { createSupabaseClient } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  try {
    const authorization =
      req.headers.authorization || ''

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required.'
      })
    }

    const token =
      authorization.slice(7)

    const supabase =
      createSupabaseClient(token)

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        message: 'Invalid or expired session.'
      })
    }

    req.user = user
    req.supabase = supabase

    next()
  } catch (error) {
    next(error)
  }
}
