import type { Match, Prediction } from './types'
import { isEliminationStage } from './stages'

export function calculatePoints(match: Match, prediction: Prediction): number {
  if (!match.is_finished) return 0
  if (match.home_score === null || match.away_score === null) return 0
  if (prediction.home_score === null || prediction.away_score === null) return 0

  if (isEliminationStage(match.stage)) {
    const actual90 = getResult(match.home_score, match.away_score)
    const pred90 = getResult(prediction.home_score, prediction.away_score)
    if (actual90 !== pred90) return 0
    const exactScore =
      prediction.home_score === match.home_score &&
      prediction.away_score === match.away_score
    let pts = exactScore ? 5 : 2
    if (actual90 === 'draw' && prediction.advances_prediction && match.winner) {
      if (prediction.advances_prediction === match.winner) pts += 1
    }
    return pts
  }

  // Group stage
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
