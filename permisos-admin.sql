-- ============================================
-- ACTUALIZACIÓN: permisos admin y predicciones editables
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- ============================================

-- 1) Admin puede editar cualquier perfil (nombre, is_admin)
drop policy if exists "Admin update any profile" on profiles;
create policy "Admin update any profile" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- 2) Admin puede borrar perfiles (cascadea predicciones)
drop policy if exists "Admin delete profiles" on profiles;
create policy "Admin delete profiles" on profiles for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- 3) Usuarios pueden editar SUS predicciones hasta 1h antes del partido
drop policy if exists "Admin update predictions" on predictions;
create policy "Own predictions update before kickoff" on predictions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
      and m.is_finished = false
      and (m.match_date is null or m.match_date > now() + interval '1 hour')
    )
  );

-- 4) Admin puede actualizar cualquier predicción (para cargar resultados)
create policy "Admin update predictions" on predictions for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
