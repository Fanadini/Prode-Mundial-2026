import type { Match, Prediction } from './types'

export function calculatePoints(match: Match, prediction: Prediction): number {
  if (!match.is_finished || match.home_score === null || match.away_score === null) return 0

  const exactScore =
    prediction.home_score === match.home_score &&
    prediction.away_score === match.away_score

  const correctResult = getResult(prediction.home_score, prediction.away_score) ===
    getResult(match.home_score, match.away_score)

  const pointsMap: Record<string, { correct: number; exact: number }> = {
    group:        { correct: 1, exact: 3 },
    round_of_32:  { correct: 2, exact: 5 },
    round_of_16:  { correct: 2, exact: 5 },
    quarter:      { correct: 3, exact: 6 },
    semi:         { correct: 3, exact: 6 },
    final:        { correct: 4, exact: 8 },
  }

  const stage = pointsMap[match.stage] ?? { correct: 1, exact: 3 }

  if (exactScore) return stage.exact
  if (correctResult) return stage.correct
  return 0
}

function getResult(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}
