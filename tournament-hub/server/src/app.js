import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import { requireAuth } from './middleware/auth.js'
import tournamentRoutes from './routes/tournaments.js'
import tournamentAdminRoutes from './routes/tournamentAdmin.js'
import matchRoutes from './routes/matches.js'
import playerAccountsRouter from './routes/playerAccounts.js'

const app = express()

app.use(
  cors({
    origin: true,
    credentials: true
  })
)

app.use(
  express.json({
    limit: '4mb'
  })
)

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'eFootball Tournament API is running.'
  })
})

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      ok: true,
      service:
        'efootball-tournament-api'
    })
  }
)

app.use(
  '/api/tournaments',
  requireAuth,
  tournamentRoutes
)

app.use(
  '/api/tournaments',
  requireAuth,
  tournamentAdminRoutes
)

app.use(
  '/api/matches',
  requireAuth,
  matchRoutes
)

app.use(
  '/api/player-accounts',
  playerAccountsRouter
)

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(error)

    res
      .status(500)
      .json({
        message:
          error.message ||
          'Internal server error.'
      })
  }
)

export default app
