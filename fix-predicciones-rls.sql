-- Políticas RLS para pronósticos de usuarios
-- Ejecutar en Supabase → SQL Editor → Run

drop policy if exists "Own predictions insert" on predictions;
drop policy if exists "Own predictions update before kickoff" on predictions;
drop policy if exists "Admin update predictions" on predictions;

create policy "Own predictions insert" on predictions
  for insert with check (auth.uid() = user_id);

create policy "Own predictions update before kickoff" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from matches
      where matches.id = predictions.match_id
      and matches.is_finished = false
      and (matches.match_date is null or matches.match_date > now() + interval '1 hour')
    )
  );

create policy "Admin update predictions" on predictions
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
