-- Permite ver los pronósticos de todos los jugadores en partidos terminados
-- Ejecutar en Supabase → SQL Editor → Run

drop policy if exists "Read own predictions" on predictions;
drop policy if exists "Read predictions for finished matches" on predictions;

-- Cada usuario puede leer sus propios pronósticos en cualquier momento
create policy "Read own predictions" on predictions
  for select using (auth.uid() = user_id);

-- Cualquier usuario autenticado puede leer pronósticos de partidos ya terminados
create policy "Read predictions for finished matches" on predictions
  for select using (
    exists (
      select 1 from matches
      where matches.id = predictions.match_id
      and matches.is_finished = true
    )
  );
