export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
}

export type Team = {
  id: number
  name: string
  flag: string
  group_name: string
}

export type Match = {
  id: number
  home_team_id: number
  away_team_id: number
  stage: string
  match_date: string | null
  home_score: number | null
  away_score: number | null
  is_finished: boolean
  home_team?: Team
  away_team?: Team
}

export type Prediction = {
  id: number
  user_id: string
  match_id: number
  home_score: number
  away_score: number
  points: number
}

export type LeaderboardEntry = {
  id: string
  display_name: string
  total_points: number
  exact_scores: number
}
