import {
  Router
} from 'express'

import {
  maybeGenerateNextStage
} from '../utils/progression.js'


const router = Router()


const KNOCKOUT_STAGES =
  new Set([
    'round_of_32',
    'round_of_16',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
  ])


function parseScore(
  value,
  required = true
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    if (required) {
      return {
        valid: false,
        value: null
      }
    }

    return {
      valid: true,
      value: null
    }
  }


  const number =
    Number(value)


  return {
    valid:
      Number.isInteger(number) &&
      number >= 0,

    value:
      number
  }
}


function participantId(
  match,
  participantType,
  physicalSlot
) {
  if (
    participantType ===
    'team'
  ) {
    return physicalSlot === 1
      ? match.team1_id
      : match.team2_id
  }


  return physicalSlot === 1
    ? match.player1_id
    : match.player2_id
}


function winnerFields(
  participantType,
  winnerId
) {
  if (
    participantType ===
    'team'
  ) {
    return {
      winner_team_id:
        winnerId,

      winner_player_id:
        null
    }
  }


  return {
    winner_player_id:
      winnerId,

    winner_team_id:
      null
  }
}


function logicalSlotColumn(
  participantType,
  legNumber,
  logicalSlot
) {
  let physicalSlot =
    logicalSlot


  /*
   * Leg two reverses home
   * and away positions.
   */
  if (legNumber === 2) {
    physicalSlot =
      logicalSlot === 1
        ? 2
        : 1
  }


  if (
    participantType ===
    'team'
  ) {
    return physicalSlot === 1
      ? 'team1_id'
      : 'team2_id'
  }


  return physicalSlot === 1
    ? 'player1_id'
    : 'player2_id'
}


async function loadTieRows(
  supabase,
  match
) {
  let query =
    supabase
      .from('matches')
      .select('*')


  if (match.tie_id) {
    query =
      query.eq(
        'tie_id',
        match.tie_id
      )
  } else {
    query =
      query.eq(
        'id',
        match.id
      )
  }


  const {
    data,
    error
  } = await query
    .order(
      'leg_number',
      {
        ascending: true
      }
    )


  if (error) {
    throw error
  }


  return data || []
}


async function setLogicalTieSlot({
  supabase,
  tieId,
  logicalSlot,
  participantType,
  participantIdValue,
  manual = false,
  respectManual = false
}) {
  const {
    data: rows,
    error
  } = await supabase
    .from('matches')
    .select(`
      id,
      leg_number,
      manual_slot1,
      manual_slot2
    `)
    .eq(
      'tie_id',
      tieId
    )
    .order(
      'leg_number',
      {
        ascending: true
      }
    )


  if (error) {
    throw error
  }


  if (
    !rows ||
    rows.length === 0
  ) {
    throw new Error(
      'Destination bracket tie was not found.'
    )
  }


  const manualField =
    logicalSlot === 1
      ? 'manual_slot1'
      : 'manual_slot2'


  const canonical =
    rows.find(
      (row) =>
        row.leg_number === 1
    ) ||
    rows[0]


  if (
    respectManual &&
    canonical[
      manualField
    ]
  ) {
    return {
      skipped:
        true
    }
  }


  for (
    const row of rows
  ) {
    const column =
      logicalSlotColumn(
        participantType,
        row.leg_number,
        logicalSlot
      )


    const {
      error:
        updateError
    } = await supabase
      .from('matches')
      .update({
        [column]:
          participantIdValue,

        [manualField]:
          manual
      })
      .eq(
        'id',
        row.id
      )


    if (updateError) {
      throw updateError
    }
  }


  return {
    skipped:
      false
  }
}


function calculateAggregate({
  rows,
  participantType
}) {
  const totals =
    new Map()


  rows.forEach(
    (row) => {
      if (
        row.status !==
        'completed'
      ) {
        return
      }


      const first =
        participantId(
          row,
          participantType,
          1
        )

      const second =
        participantId(
          row,
          participantType,
          2
        )


      if (first) {
        totals.set(
          first,
          (
            totals.get(first) ||
            0
          ) +
          Number(
            row.player1_score ||
            0
          )
        )
      }


      if (second) {
        totals.set(
          second,
          (
            totals.get(second) ||
            0
          ) +
          Number(
            row.player2_score ||
            0
          )
        )
      }
    }
  )


  return totals
}


router.patch(
  '/:id/result',
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        supabase,
        user
      } = req


      const firstScore =
        parseScore(
          req.body
            .player1_score
        )

      const secondScore =
        parseScore(
          req.body
            .player2_score
        )

      const firstPenalty =
        parseScore(
          req.body
            .player1_penalty_score,
          false
        )

      const secondPenalty =
        parseScore(
          req.body
            .player2_penalty_score,
          false
        )


      if (
        !firstScore.valid ||
        !secondScore.valid ||
        !firstPenalty.valid ||
        !secondPenalty.valid
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
        error:
          matchError
      } = await supabase
        .from('matches')
        .select('*')
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
        error:
          tournamentError
      } = await supabase
        .from('tournaments')
        .select('*')
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


      const participantType =
        tournament
          .participant_type


      const firstParticipant =
        participantId(
          match,
          participantType,
          1
        )

      const secondParticipant =
        participantId(
          match,
          participantType,
          2
        )


      if (
        !firstParticipant ||
        !secondParticipant
      ) {
        return res
          .status(400)
          .json({
            message:
              'Both participants must be known before entering a result.'
          })
      }


      const isKnockout =
        KNOCKOUT_STAGES.has(
          match.stage
        )


      /*
       * Normal League or Group result.
       */
      if (!isKnockout) {
        const {
          data:
            updatedMatch,
          error:
            updateError
        } = await supabase
          .from('matches')
          .update({
            player1_score:
              firstScore.value,

            player2_score:
              secondScore.value,

            status:
              'completed',

            completed_at:
              new Date()
                .toISOString()
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


        let progression = {
          generated:
            false
        }

        let progressionError =
          null


        try {
          progression =
            await maybeGenerateNextStage({
              supabase,

              tournamentId:
                match.tournament_id
            })
        } catch (error) {
          progressionError =
            error.message ||
            'Unable to generate the next tournament stage.'
        }


        return res.json({
          message:
            progression.generated
              ? 'Match result saved. Qualification is complete and the knockout bracket has been generated.'
              : 'Match result saved successfully.',

          advanced:
            false,

          stage_generated:
            progression.generated,

          progression,

          progression_error:
            progressionError,

          match:
            updatedMatch
        })
      }


      const tieRows =
        await loadTieRows(
          supabase,
          match
        )


      const candidateRows =
        tieRows.map(
          (row) =>
            row.id ===
            match.id
              ? {
                  ...row,

                  player1_score:
                    firstScore.value,

                  player2_score:
                    secondScore.value,

                  player1_penalty_score:
                    firstPenalty.value,

                  player2_penalty_score:
                    secondPenalty.value,

                  status:
                    'completed'
                }
              : row
        )


      const allLegsCompleted =
        candidateRows.every(
          (row) =>
            row.status ===
            'completed'
        )


      let winnerId = null


      if (
        allLegsCompleted
      ) {
        const totals =
          calculateAggregate({
            rows:
              candidateRows,

            participantType
          })


        const entries =
          [...totals.entries()]


        if (
          entries.length !== 2
        ) {
          return res
            .status(400)
            .json({
              message:
                'Unable to determine the participants in this knockout tie.'
            })
        }


        const [
          firstEntry,
          secondEntry
        ] = entries


        if (
          firstEntry[1] >
          secondEntry[1]
        ) {
          winnerId =
            firstEntry[0]
        }

        else if (
          secondEntry[1] >
          firstEntry[1]
        ) {
          winnerId =
            secondEntry[0]
        }

        else {
          const penaltyRow =
            candidateRows.find(
              (row) =>
                row
                  .player1_penalty_score !==
                null
                &&
                row
                  .player2_penalty_score !==
                null
            )


          if (
            !penaltyRow
            ||
            penaltyRow
              .player1_penalty_score ===
            penaltyRow
              .player2_penalty_score
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Penalty scores are required because the knockout tie is level.'
              })
          }


          winnerId =
            penaltyRow
              .player1_penalty_score >
            penaltyRow
              .player2_penalty_score
              ? participantId(
                  penaltyRow,
                  participantType,
                  1
                )
              : participantId(
                  penaltyRow,
                  participantType,
                  2
                )
        }
      }


      /*
       * If an edited result would
       * change a winner, prevent
       * corruption of a downstream
       * match that has already
       * been completed.
       */
      if (
        allLegsCompleted &&
        winnerId &&
        match.next_tie_id
      ) {
        const canonical =
          tieRows.find(
            (row) =>
              row.leg_number ===
              1
          ) ||
          tieRows[0]


        const oldWinner =
          participantType ===
          'team'
            ? canonical
                .winner_team_id
            : canonical
                .winner_player_id


        if (
          oldWinner &&
          oldWinner !==
          winnerId
        ) {
          const {
            data:
              downstreamRows,
            error:
              downstreamError
          } = await supabase
            .from('matches')
            .select(
              'id, status'
            )
            .eq(
              'tie_id',
              match
                .next_tie_id
            )


          if (
            downstreamError
          ) {
            throw downstreamError
          }


          if (
            downstreamRows.some(
              (row) =>
                row.status ===
                'completed'
            )
          ) {
            return res
              .status(409)
              .json({
                message:
                  'This result cannot change because the next knockout match has already been completed.'
              })
          }
        }
      }


      const {
        data:
          updatedMatch,
        error:
          updateError
      } = await supabase
        .from('matches')
        .update({
          player1_score:
            firstScore.value,

          player2_score:
            secondScore.value,

          player1_penalty_score:
            firstPenalty.value,

          player2_penalty_score:
            secondPenalty.value,

          status:
            'completed',

          completed_at:
            new Date()
              .toISOString()
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


      if (
        !allLegsCompleted ||
        !winnerId
      ) {
        return res.json({
          message:
            'Match result saved. The knockout tie is still in progress.',

          advanced:
            false,

          match:
            updatedMatch
        })
      }


      const winFields =
        winnerFields(
          participantType,
          winnerId
        )


      let winnerQuery =
        supabase
          .from('matches')
          .update(
            winFields
          )


      if (match.tie_id) {
        winnerQuery =
          winnerQuery.eq(
            'tie_id',
            match.tie_id
          )
      } else {
        winnerQuery =
          winnerQuery.eq(
            'id',
            match.id
          )
      }


      const {
        error:
          winnerUpdateError
      } = await winnerQuery


      if (
        winnerUpdateError
      ) {
        throw winnerUpdateError
      }


      let advanced = false
      let manualOverridePreserved =
        false


      if (
        match.next_tie_id &&
        match.next_slot
      ) {
        const result =
          await setLogicalTieSlot({
            supabase,

            tieId:
              match.next_tie_id,

            logicalSlot:
              match.next_slot,

            participantType,

            participantIdValue:
              winnerId,

            manual:
              false,

            respectManual:
              true
          })


        manualOverridePreserved =
          result.skipped

        advanced =
          !result.skipped
      }


      /*
       * Final winner becomes
       * tournament champion.
       */
      if (
        match.stage ===
        'final'
      ) {
        const championFields =
          participantType ===
          'team'
            ? {
                champion_team_id:
                  winnerId,

                champion_player_id:
                  null
              }
            : {
                champion_player_id:
                  winnerId,

                champion_team_id:
                  null
              }


        const {
          error:
            championError
        } = await supabase
          .from(
            'tournaments'
          )
          .update({
            ...championFields,

            champion_decided_at:
              new Date()
                .toISOString(),

            status:
              'completed'
          })
          .eq(
            'id',
            tournament.id
          )


        if (
          championError
        ) {
          throw championError
        }
      }


      return res.json({
        message:
          match.stage ===
          'final'
            ? 'Final result saved. Tournament champion decided.'
            : advanced
              ? 'Result saved. Winner advanced to the next round.'
              : manualOverridePreserved
                ? 'Result saved. The manually adjusted next-round slot was preserved.'
                : 'Result saved.',

        advanced,

        manual_override_preserved:
          manualOverridePreserved,

        winner_id:
          winnerId,

        match:
          updatedMatch
      })
    } catch (error) {
      next(error)
    }
  }
)


/*
 * Admin bracket correction.
 *
 * Drag participant A onto another
 * unplayed slot in the SAME ROUND.
 *
 * The two positions are swapped.
 */
router.patch(
  '/bracket/swap',
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        supabase,
        user
      } = req


      const {
        sourceTieId,
        sourceSlot,
        targetTieId,
        targetSlot
      } = req.body


      if (
        !sourceTieId ||
        !targetTieId ||
        ![1, 2].includes(
          Number(
            sourceSlot
          )
        ) ||
        ![1, 2].includes(
          Number(
            targetSlot
          )
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid bracket swap request.'
          })
      }


      if (
        sourceTieId ===
          targetTieId
        &&
        Number(
          sourceSlot
        ) ===
        Number(
          targetSlot
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Choose a different bracket position.'
          })
      }


      const [
        sourceResult,
        targetResult
      ] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .eq(
            'tie_id',
            sourceTieId
          )
          .order(
            'leg_number',
            {
              ascending: true
            }
          ),

        supabase
          .from('matches')
          .select('*')
          .eq(
            'tie_id',
            targetTieId
          )
          .order(
            'leg_number',
            {
              ascending: true
            }
          )
      ])


      if (
        sourceResult.error
      ) {
        throw sourceResult.error
      }


      if (
        targetResult.error
      ) {
        throw targetResult.error
      }


      const sourceRows =
        sourceResult.data ||
        []

      const targetRows =
        targetResult.data ||
        []


      if (
        sourceRows.length === 0 ||
        targetRows.length === 0
      ) {
        return res
          .status(404)
          .json({
            message:
              'Bracket position not found.'
          })
      }


      const sourceCanonical =
        sourceRows.find(
          (row) =>
            row.leg_number === 1
        ) ||
        sourceRows[0]

      const targetCanonical =
        targetRows.find(
          (row) =>
            row.leg_number === 1
        ) ||
        targetRows[0]


      if (
        sourceCanonical
          .tournament_id !==
        targetCanonical
          .tournament_id
      ) {
        return res
          .status(400)
          .json({
            message:
              'Participants cannot be moved between different tournaments.'
          })
      }


      if (
        sourceCanonical.stage !==
        targetCanonical.stage
      ) {
        return res
          .status(400)
          .json({
            message:
              'Participants can only be swapped within the same knockout round.'
          })
      }


      if (
        sourceRows.some(
          (row) =>
            row.status ===
            'completed'
        )
        ||
        targetRows.some(
          (row) =>
            row.status ===
            'completed'
        )
      ) {
        return res
          .status(409)
          .json({
            message:
              'A bracket position cannot be moved after that tie has started.'
          })
      }


      const {
        data: tournament,
        error:
          tournamentError
      } = await supabase
        .from('tournaments')
        .select(`
          id,
          owner_id,
          participant_type
        `)
        .eq(
          'id',
          sourceCanonical
            .tournament_id
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
              'You do not have permission to modify this bracket.'
          })
      }


      const participantType =
        tournament
          .participant_type


      const sourceParticipant =
        participantId(
          sourceCanonical,
          participantType,
          Number(
            sourceSlot
          )
        )

      const targetParticipant =
        participantId(
          targetCanonical,
          participantType,
          Number(
            targetSlot
          )
        )


      if (!sourceParticipant) {
        return res
          .status(400)
          .json({
            message:
              'The selected source position is empty.'
          })
      }


      await setLogicalTieSlot({
        supabase,

        tieId:
          sourceTieId,

        logicalSlot:
          Number(
            sourceSlot
          ),

        participantType,

        participantIdValue:
          targetParticipant,

        manual:
          true
      })


      await setLogicalTieSlot({
        supabase,

        tieId:
          targetTieId,

        logicalSlot:
          Number(
            targetSlot
          ),

        participantType,

        participantIdValue:
          sourceParticipant,

        manual:
          true
      })


      return res.json({
        message:
          'Bracket positions updated successfully.'
      })
    } catch (error) {
      next(error)
    }
  }
)


export default router
