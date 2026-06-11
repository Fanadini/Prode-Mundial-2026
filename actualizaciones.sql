-- ============================================
-- ACTUALIZACIONES — Ejecutar en Supabase → SQL Editor → New query → Run
-- 1) El nombre del registro se usa en la tabla de posiciones
-- 2) Permiso para que el admin cree partidos de eliminatorias
-- 3) Fechas y horarios de los 72 partidos de fase de grupos
-- 4) Tu usuario: nombre "Facu" y permisos de admin
-- ============================================

-- 1) Trigger: usa el nombre elegido en el registro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) El admin puede crear partidos (cruces de eliminatorias)
drop policy if exists "Admin insert matches" on matches;
create policy "Admin insert matches" on matches for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- 3) Fechas de fase de grupos (hora Argentina, UTC-3)
update matches set match_date = '2026-06-11 13:00:00-03' where id = 1;
update matches set match_date = '2026-06-11 16:00:00-03' where id = 6;
update matches set match_date = '2026-06-11 19:00:00-03' where id = 7;
update matches set match_date = '2026-06-11 22:00:00-03' where id = 12;
update matches set match_date = '2026-06-12 13:00:00-03' where id = 13;
update matches set match_date = '2026-06-12 16:00:00-03' where id = 18;
update matches set match_date = '2026-06-12 19:00:00-03' where id = 19;
update matches set match_date = '2026-06-12 22:00:00-03' where id = 24;
update matches set match_date = '2026-06-13 13:00:00-03' where id = 25;
update matches set match_date = '2026-06-13 16:00:00-03' where id = 30;
update matches set match_date = '2026-06-13 19:00:00-03' where id = 31;
update matches set match_date = '2026-06-13 22:00:00-03' where id = 36;
update matches set match_date = '2026-06-14 13:00:00-03' where id = 37;
update matches set match_date = '2026-06-14 16:00:00-03' where id = 42;
update matches set match_date = '2026-06-14 19:00:00-03' where id = 43;
update matches set match_date = '2026-06-14 22:00:00-03' where id = 48;
update matches set match_date = '2026-06-15 13:00:00-03' where id = 49;
update matches set match_date = '2026-06-15 16:00:00-03' where id = 54;
update matches set match_date = '2026-06-15 19:00:00-03' where id = 55;
update matches set match_date = '2026-06-15 22:00:00-03' where id = 60;
update matches set match_date = '2026-06-16 13:00:00-03' where id = 61;
update matches set match_date = '2026-06-16 16:00:00-03' where id = 66;
update matches set match_date = '2026-06-16 19:00:00-03' where id = 67;
update matches set match_date = '2026-06-16 22:00:00-03' where id = 72;

update matches set match_date = '2026-06-17 13:00:00-03' where id = 2;
update matches set match_date = '2026-06-17 16:00:00-03' where id = 5;
update matches set match_date = '2026-06-17 19:00:00-03' where id = 8;
update matches set match_date = '2026-06-17 22:00:00-03' where id = 11;
update matches set match_date = '2026-06-18 13:00:00-03' where id = 14;
update matches set match_date = '2026-06-18 16:00:00-03' where id = 17;
update matches set match_date = '2026-06-18 19:00:00-03' where id = 20;
update matches set match_date = '2026-06-18 22:00:00-03' where id = 23;
update matches set match_date = '2026-06-19 13:00:00-03' where id = 26;
update matches set match_date = '2026-06-19 16:00:00-03' where id = 29;
update matches set match_date = '2026-06-19 19:00:00-03' where id = 32;
update matches set match_date = '2026-06-19 22:00:00-03' where id = 35;
update matches set match_date = '2026-06-20 13:00:00-03' where id = 38;
update matches set match_date = '2026-06-20 16:00:00-03' where id = 41;
update matches set match_date = '2026-06-20 19:00:00-03' where id = 44;
update matches set match_date = '2026-06-20 22:00:00-03' where id = 47;
update matches set match_date = '2026-06-21 13:00:00-03' where id = 50;
update matches set match_date = '2026-06-21 16:00:00-03' where id = 53;
update matches set match_date = '2026-06-21 19:00:00-03' where id = 56;
update matches set match_date = '2026-06-21 22:00:00-03' where id = 59;
update matches set match_date = '2026-06-22 13:00:00-03' where id = 62;
update matches set match_date = '2026-06-22 16:00:00-03' where id = 65;
update matches set match_date = '2026-06-22 19:00:00-03' where id = 68;
update matches set match_date = '2026-06-22 22:00:00-03' where id = 71;

update matches set match_date = '2026-06-23 13:00:00-03' where id in (3, 4);
update matches set match_date = '2026-06-23 16:00:00-03' where id in (9, 10);
update matches set match_date = '2026-06-23 19:00:00-03' where id in (15, 16);
update matches set match_date = '2026-06-23 22:00:00-03' where id in (21, 22);
update matches set match_date = '2026-06-24 13:00:00-03' where id in (27, 28);
update matches set match_date = '2026-06-24 16:00:00-03' where id in (33, 34);
update matches set match_date = '2026-06-24 19:00:00-03' where id in (39, 40);
update matches set match_date = '2026-06-24 22:00:00-03' where id in (45, 46);
update matches set match_date = '2026-06-25 13:00:00-03' where id in (51, 52);
update matches set match_date = '2026-06-25 16:00:00-03' where id in (57, 58);
update matches set match_date = '2026-06-25 19:00:00-03' where id in (63, 64);
update matches set match_date = '2026-06-25 22:00:00-03' where id in (69, 70);

-- 4) Tu usuario: nombre y admin
update profiles
set display_name = 'Facu', is_admin = true
where id = (select id from auth.users where email = 'fanadini@gmail.com');
