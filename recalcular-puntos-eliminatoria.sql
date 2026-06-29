-- ============================================================
-- Recalcular puntos para TODOS los partidos de fase eliminatoria
-- ya finalizados, con la lógica nueva: 5pt exacto / 2pt ganador
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

WITH match_results AS (
  SELECT
    m.id             AS match_id,
    m.home_score,
    m.away_score,
    m.winner,
    m.stage,
    CASE
      WHEN m.home_score > m.away_score THEN 'home'
      WHEN m.away_score > m.home_score THEN 'away'
      ELSE 'draw'
    END AS actual90
  FROM matches m
  WHERE m.is_finished = true
    AND m.home_score IS NOT NULL
    AND m.away_score IS NOT NULL
    AND m.stage IN ('round_of_32', 'round_of_16', 'quarter', 'semi', 'final')
),
recalculated AS (
  SELECT
    p.id,
    CASE
      -- marcador exacto → 5 pts
      WHEN p.home_score = mr.home_score AND p.away_score = mr.away_score THEN
        5 + CASE
              WHEN mr.actual90 = 'draw'
                AND p.advances_prediction IS NOT NULL
                AND p.advances_prediction = mr.winner
              THEN 1
              ELSE 0
            END
      -- resultado 90' correcto (no exacto) → 2 pts
      WHEN p.home_score IS NOT NULL AND p.away_score IS NOT NULL AND
           CASE
             WHEN p.home_score > p.away_score THEN 'home'
             WHEN p.away_score > p.home_score THEN 'away'
             ELSE 'draw'
           END = mr.actual90
      THEN
        2 + CASE
              WHEN mr.actual90 = 'draw'
                AND p.advances_prediction IS NOT NULL
                AND p.advances_prediction = mr.winner
              THEN 1
              ELSE 0
            END
      -- resultado incorrecto → 0 pts
      ELSE 0
    END AS new_points
  FROM predictions p
  JOIN match_results mr ON mr.match_id = p.match_id
)
UPDATE predictions
SET points = recalculated.new_points
FROM recalculated
WHERE predictions.id = recalculated.id;
