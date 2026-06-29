-- ============================================
-- MIGRACIÓN: Ocultar usuarios por inactividad
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

-- Agregar columna is_hidden a profiles
alter table profiles add column if not exists is_hidden boolean default false;

-- Actualizar la vista leaderboard para excluir usuarios ocultos
create or replace view leaderboard as
select
  p.id,
  p.display_name,
  coalesce(sum(pr.points), 0) +
    coalesce(sp.champion_points, 0) +
    coalesce(sp.scorer_points, 0) as total_points,
  count(case when pr.points >= 3 then 1 end) as exact_scores
from profiles p
left join predictions pr on pr.user_id = p.id
left join special_predictions sp on sp.user_id = p.id
where p.is_hidden is not true
group by p.id, p.display_name, sp.champion_points, sp.scorer_points
order by total_points desc;
