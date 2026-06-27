-- ============================================
-- MIGRACIÓN: Reglas de predicción para fase eliminatoria
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

-- Agregar columna winner a matches (quién avanzó, para fases eliminatorias)
alter table matches add column if not exists winner text; -- 'home' | 'away'

-- Hacer nullable home_score/away_score en predictions (las predicciones
-- eliminatorias usan result_prediction en lugar de marcadores)
alter table predictions alter column home_score drop not null;
alter table predictions alter column away_score drop not null;

-- Agregar columnas de predicción eliminatoria
alter table predictions add column if not exists result_prediction text;     -- '1' | 'X' | '2'
alter table predictions add column if not exists advances_prediction text;   -- 'home' | 'away' (solo si result_prediction = 'X')
