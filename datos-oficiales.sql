-- ============================================
-- DATOS OFICIALES MUNDIAL 2026 — sorteo real y fixture completo
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- ⚠️ ATENCIÓN: borra los pronósticos ya cargados (los grupos cambiaron)
-- Horarios guardados en hora del Este de EE.UU. (ET); la app los muestra
-- en la zona horaria de cada usuario.
-- ============================================

-- 1) Trigger de registro: usa el nombre elegido al crear la cuenta
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

-- 3) Tu usuario: nombre y admin
update profiles
set display_name = 'Facu', is_admin = true
where id = (select id from auth.users where email = 'fanadini@gmail.com');

-- 4) Limpieza de datos viejos
delete from predictions;
delete from special_predictions;
delete from matches;
delete from teams;

-- 5) Los 48 equipos oficiales (sorteo del 5/12/2025)
insert into teams (id, name, flag, group_name) values
(1, 'México', '🇲🇽', 'A'),
(2, 'Sudáfrica', '🇿🇦', 'A'),
(3, 'Corea del Sur', '🇰🇷', 'A'),
(4, 'República Checa', '🇨🇿', 'A'),
(5, 'Canadá', '🇨🇦', 'B'),
(6, 'Bosnia y Herzegovina', '🇧🇦', 'B'),
(7, 'Qatar', '🇶🇦', 'B'),
(8, 'Suiza', '🇨🇭', 'B'),
(9, 'Brasil', '🇧🇷', 'C'),
(10, 'Marruecos', '🇲🇦', 'C'),
(11, 'Haití', '🇭🇹', 'C'),
(12, 'Escocia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),
(13, 'Estados Unidos', '🇺🇸', 'D'),
(14, 'Paraguay', '🇵🇾', 'D'),
(15, 'Australia', '🇦🇺', 'D'),
(16, 'Turquía', '🇹🇷', 'D'),
(17, 'Alemania', '🇩🇪', 'E'),
(18, 'Curazao', '🇨🇼', 'E'),
(19, 'Costa de Marfil', '🇨🇮', 'E'),
(20, 'Ecuador', '🇪🇨', 'E'),
(21, 'Países Bajos', '🇳🇱', 'F'),
(22, 'Japón', '🇯🇵', 'F'),
(23, 'Suecia', '🇸🇪', 'F'),
(24, 'Túnez', '🇹🇳', 'F'),
(25, 'Bélgica', '🇧🇪', 'G'),
(26, 'Egipto', '🇪🇬', 'G'),
(27, 'Irán', '🇮🇷', 'G'),
(28, 'Nueva Zelanda', '🇳🇿', 'G'),
(29, 'España', '🇪🇸', 'H'),
(30, 'Cabo Verde', '🇨🇻', 'H'),
(31, 'Arabia Saudita', '🇸🇦', 'H'),
(32, 'Uruguay', '🇺🇾', 'H'),
(33, 'Francia', '🇫🇷', 'I'),
(34, 'Senegal', '🇸🇳', 'I'),
(35, 'Irak', '🇮🇶', 'I'),
(36, 'Noruega', '🇳🇴', 'I'),
(37, 'Argentina', '🇦🇷', 'J'),
(38, 'Argelia', '🇩🇿', 'J'),
(39, 'Austria', '🇦🇹', 'J'),
(40, 'Jordania', '🇯🇴', 'J'),
(41, 'Portugal', '🇵🇹', 'K'),
(42, 'RD Congo', '🇨🇩', 'K'),
(43, 'Uzbekistán', '🇺🇿', 'K'),
(44, 'Colombia', '🇨🇴', 'K'),
(45, 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
(46, 'Croacia', '🇭🇷', 'L'),
(47, 'Ghana', '🇬🇭', 'L'),
(48, 'Panamá', '🇵🇦', 'L');
select setval('teams_id_seq', 48);

-- 6) Los 72 partidos oficiales de fase de grupos (hora ET, UTC-4)
insert into matches (home_team_id, away_team_id, stage, match_date) values
(1, 2, 'group', '2026-06-11 15:00:00-04'),
(3, 4, 'group', '2026-06-11 22:00:00-04'),
(5, 6, 'group', '2026-06-12 15:00:00-04'),
(13, 14, 'group', '2026-06-12 21:00:00-04'),
(7, 8, 'group', '2026-06-13 15:00:00-04'),
(9, 10, 'group', '2026-06-13 18:00:00-04'),
(11, 12, 'group', '2026-06-13 21:00:00-04'),
(15, 16, 'group', '2026-06-14 00:00:00-04'),
(17, 18, 'group', '2026-06-14 13:00:00-04'),
(21, 22, 'group', '2026-06-14 16:00:00-04'),
(19, 20, 'group', '2026-06-14 19:00:00-04'),
(23, 24, 'group', '2026-06-14 22:00:00-04'),
(29, 30, 'group', '2026-06-15 13:00:00-04'),
(25, 26, 'group', '2026-06-15 18:00:00-04'),
(31, 32, 'group', '2026-06-15 18:00:00-04'),
(27, 28, 'group', '2026-06-16 00:00:00-04'),
(33, 34, 'group', '2026-06-16 15:00:00-04'),
(35, 36, 'group', '2026-06-16 18:00:00-04'),
(37, 38, 'group', '2026-06-16 21:00:00-04'),
(39, 40, 'group', '2026-06-17 00:00:00-04'),
(41, 42, 'group', '2026-06-17 13:00:00-04'),
(45, 46, 'group', '2026-06-17 16:00:00-04'),
(47, 48, 'group', '2026-06-17 19:00:00-04'),
(43, 44, 'group', '2026-06-17 22:00:00-04'),
(4, 2, 'group', '2026-06-18 12:00:00-04'),
(8, 6, 'group', '2026-06-18 15:00:00-04'),
(5, 7, 'group', '2026-06-18 18:00:00-04'),
(1, 3, 'group', '2026-06-18 21:00:00-04'),
(13, 15, 'group', '2026-06-19 15:00:00-04'),
(12, 10, 'group', '2026-06-19 18:00:00-04'),
(9, 11, 'group', '2026-06-19 21:00:00-04'),
(16, 14, 'group', '2026-06-20 00:00:00-04'),
(21, 23, 'group', '2026-06-20 13:00:00-04'),
(17, 19, 'group', '2026-06-20 16:00:00-04'),
(20, 18, 'group', '2026-06-20 20:00:00-04'),
(24, 22, 'group', '2026-06-21 00:00:00-04'),
(29, 31, 'group', '2026-06-21 12:00:00-04'),
(25, 27, 'group', '2026-06-21 15:00:00-04'),
(32, 30, 'group', '2026-06-21 18:00:00-04'),
(28, 26, 'group', '2026-06-21 21:00:00-04'),
(37, 39, 'group', '2026-06-22 13:00:00-04'),
(33, 35, 'group', '2026-06-22 17:00:00-04'),
(36, 34, 'group', '2026-06-22 20:00:00-04'),
(40, 38, 'group', '2026-06-22 23:00:00-04'),
(41, 43, 'group', '2026-06-23 13:00:00-04'),
(45, 47, 'group', '2026-06-23 16:00:00-04'),
(48, 46, 'group', '2026-06-23 19:00:00-04'),
(44, 42, 'group', '2026-06-23 22:00:00-04'),
(8, 5, 'group', '2026-06-24 15:00:00-04'),
(6, 7, 'group', '2026-06-24 15:00:00-04'),
(12, 9, 'group', '2026-06-24 18:00:00-04'),
(10, 11, 'group', '2026-06-24 18:00:00-04'),
(4, 1, 'group', '2026-06-24 21:00:00-04'),
(2, 3, 'group', '2026-06-24 21:00:00-04'),
(20, 17, 'group', '2026-06-25 16:00:00-04'),
(18, 19, 'group', '2026-06-25 16:00:00-04'),
(22, 23, 'group', '2026-06-25 19:00:00-04'),
(24, 21, 'group', '2026-06-25 19:00:00-04'),
(16, 13, 'group', '2026-06-25 22:00:00-04'),
(14, 15, 'group', '2026-06-25 22:00:00-04'),
(36, 33, 'group', '2026-06-26 15:00:00-04'),
(34, 35, 'group', '2026-06-26 15:00:00-04'),
(30, 31, 'group', '2026-06-26 20:00:00-04'),
(32, 29, 'group', '2026-06-26 20:00:00-04'),
(26, 27, 'group', '2026-06-26 23:00:00-04'),
(28, 25, 'group', '2026-06-26 23:00:00-04'),
(48, 45, 'group', '2026-06-27 17:00:00-04'),
(46, 47, 'group', '2026-06-27 17:00:00-04'),
(44, 41, 'group', '2026-06-27 19:30:00-04'),
(42, 43, 'group', '2026-06-27 19:30:00-04'),
(38, 39, 'group', '2026-06-27 22:00:00-04'),
(40, 37, 'group', '2026-06-27 22:00:00-04');
select setval('matches_id_seq', (select max(id) from matches));

-- 7) Resultado del partido inaugural (ya jugado): México 2 - 0 Sudáfrica
update matches set home_score = 2, away_score = 0, is_finished = true
where home_team_id = 1 and away_team_id = 2 and stage = 'group';
