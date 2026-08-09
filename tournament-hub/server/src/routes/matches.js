import { Router } from 'express'

const router = Router()


router.patch(
  '/:id/result',
  async (req, res, next) => {
    try {
      const {
        supabase,
        user
      } = req

      const player1Score =
        Number(
          req.body.player1_score
        )

      const player2Score =
        Number(
          req.body.player2_score
        )


      if (
        !Number.isInteger(
          player1Score
        )
        ||
        !Number.isInteger(
          player2Score
        )
        ||
        player1Score < 0
        ||
        player2Score < 0
      ) {
        return res
          .status(400)
          .json({
            message:
              'Scores must be non-negative whole numbers.'
          })
      }


      const {
        data: match,
        error: matchError
      } = await supabase
        .from('matches')
        .select(`
          id,
          tournament_id,
          status
        `)
        .eq(
          'id',
          req.params.id
        )
        .single()


      if (
        matchError ||
        !match
      ) {
        return res
          .status(404)
          .json({
            message:
              'Match not found.'
          })
      }


      const {
        data: tournament,
        error: tournamentError
      } = await supabase
        .from('tournaments')
        .select(`
          id,
          owner_id
        `)
        .eq(
          'id',
          match.tournament_id
        )
        .eq(
          'owner_id',
          user.id
        )
        .single()


      if (
        tournamentError ||
        !tournament
      ) {
        return res
          .status(403)
          .json({
            message:
              'You do not have permission to update this match.'
          })
      }


      const {
        data: updatedMatch,
        error: updateError
      } = await supabase
        .from('matches')
        .update({
          player1_score:
            player1Score,

          player2_score:
            player2Score,

          status:
            'completed'
        })
        .eq(
          'id',
          match.id
        )
        .select()
        .single()


      if (updateError) {
        throw updateError
      }


      return res.json({
        message:
          'Match result saved successfully.',

        match:
          updatedMatch
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
