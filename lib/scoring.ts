import type { Match, Prediction } from './types'
import { isEliminationStage } from './stages'

export function calculatePoints(match: Match, prediction: Prediction): number {
  if (!match.is_finished) return 0

  if (isEliminationStage(match.stage)) {
    if (!prediction.result_prediction || match.home_score === null || match.away_score === null) return 0
    const actual = match.home_score > match.away_score ? '1' : match.away_score > match.home_score ? '2' : 'X'
    if (prediction.result_prediction !== actual) return 0
    let pts = 2
    if (actual === 'X' && prediction.advances_prediction && match.winner) {
      if (prediction.advances_prediction === match.winner) pts += 1
    }
    return pts
  }

  // Group stage
  if (match.home_score === null || match.away_score === null) return 0
  if (prediction.home_score === null || prediction.away_score === null) return 0

  const exactScore =
    prediction.home_score === match.home_score &&
    prediction.away_score === match.away_score

  const correctResult = getResult(prediction.home_score, prediction.away_score) ===
    getResult(match.home_score, match.away_score)

  if (exactScore) return 3
  if (correctResult) return 1
  return 0
}

function getResult(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}
