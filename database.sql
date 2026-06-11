-- ============================================
-- PRODE MUNDIAL 2026 — Schema completo
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

-- Profiles (se crea automáticamente al registrarse)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Teams
create table teams (
  id serial primary key,
  name text not null,
  flag text not null,
  group_name text not null
);

-- Matches
create table matches (
  id serial primary key,
  home_team_id int references teams(id),
  away_team_id int references teams(id),
  stage text not null default 'group', -- group | round_of_32 | round_of_16 | quarter | semi | final
  match_date timestamptz,
  home_score int,
  away_score int,
  is_finished boolean default false
);

-- Predictions
create table predictions (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  match_id int references matches(id) on delete cascade,
  home_score int not null,
  away_score int not null,
  points int default 0,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Special predictions (campeón + goleador)
create table special_predictions (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  champion_team_id int references teams(id),
  top_scorer text,
  champion_points int default 0,
  scorer_points int default 0,
  updated_at timestamptz default now()
);

-- Auto-crear profile al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Vista de tabla de posiciones
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
group by p.id, p.display_name, sp.champion_points, sp.scorer_points
order by total_points desc;

-- RLS
alter table profiles enable row level security;
alter table predictions enable row level security;
alter table special_predictions enable row level security;
alter table matches enable row level security;
alter table teams enable row level security;

-- Policies
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile" on profiles for update using (auth.uid() = id);

create policy "Public teams" on teams for select using (true);
create policy "Public matches" on matches for select using (true);
create policy "Admin update matches" on matches for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Todos los usuarios autenticados pueden ver todas las predicciones (necesario para el leaderboard)
create policy "Authenticated see all predictions" on predictions for select using (auth.uid() is not null);
create policy "Own predictions insert" on predictions for insert with check (auth.uid() = user_id);
-- Los usuarios NO pueden modificar un pronóstico ya guardado: solo el admin
create policy "Admin update predictions" on predictions for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Own special select" on special_predictions for select using (auth.uid() = user_id);
create policy "Own special insert" on special_predictions for insert with check (auth.uid() = user_id);
create policy "Own special update" on special_predictions for update using (auth.uid() = user_id);

-- ============================================
-- DATOS: 48 equipos
-- ============================================
insert into teams (name, flag, group_name) values
('USA', '🇺🇸', 'A'), ('México', '🇲🇽', 'A'), ('Canadá', '🇨🇦', 'A'), ('Honduras', '🇭🇳', 'A'),
('Argentina', '🇦🇷', 'B'), ('Chile', '🇨🇱', 'B'), ('Perú', '🇵🇪', 'B'), ('Australia', '🇦🇺', 'B'),
('Brasil', '🇧🇷', 'C'), ('Colombia', '🇨🇴', 'C'), ('Paraguay', '🇵🇾', 'C'), ('Japón', '🇯🇵', 'C'),
('Uruguay', '🇺🇾', 'D'), ('Ecuador', '🇪🇨', 'D'), ('Venezuela', '🇻🇪', 'D'), ('Senegal', '🇸🇳', 'D'),
('Francia', '🇫🇷', 'E'), ('Bélgica', '🇧🇪', 'E'), ('Marruecos', '🇲🇦', 'E'), ('Ucrania', '🇺🇦', 'E'),
('España', '🇪🇸', 'F'), ('Portugal', '🇵🇹', 'F'), ('Turquía', '🇹🇷', 'F'), ('Georgia', '🇬🇪', 'F'),
('Alemania', '🇩🇪', 'G'), ('Países Bajos', '🇳🇱', 'G'), ('Hungría', '🇭🇺', 'G'), ('Escocia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'G'),
('Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'H'), ('Dinamarca', '🇩🇰', 'H'), ('Serbia', '🇷🇸', 'H'), ('Eslovenia', '🇸🇮', 'H'),
('Italia', '🇮🇹', 'I'), ('Croacia', '🇭🇷', 'I'), ('Albania', '🇦🇱', 'I'), ('Nigeria', '🇳🇬', 'I'),
('Suiza', '🇨🇭', 'J'), ('Austria', '🇦🇹', 'J'), ('Eslovaquia', '🇸🇰', 'J'), ('Costa de Marfil', '🇨🇮', 'J'),
('Corea del Sur', '🇰🇷', 'K'), ('Arabia Saudita', '🇸🇦', 'K'), ('Irán', '🇮🇷', 'K'), ('Nueva Zelanda', '🇳🇿', 'K'),
('Ghana', '🇬🇭', 'L'), ('Egipto', '🇪🇬', 'L'), ('Argelia', '🇩🇿', 'L'), ('Nueva Caledonia', '🇳🇨', 'L');

-- ============================================
-- DATOS: partidos de fase de grupos (todos contra todos por grupo)
-- ============================================
insert into matches (home_team_id, away_team_id, stage) values
(1,2,'group'),(1,3,'group'),(1,4,'group'),(2,3,'group'),(2,4,'group'),(3,4,'group'),
(5,6,'group'),(5,7,'group'),(5,8,'group'),(6,7,'group'),(6,8,'group'),(7,8,'group'),
(9,10,'group'),(9,11,'group'),(9,12,'group'),(10,11,'group'),(10,12,'group'),(11,12,'group'),
(13,14,'group'),(13,15,'group'),(13,16,'group'),(14,15,'group'),(14,16,'group'),(15,16,'group'),
(17,18,'group'),(17,19,'group'),(17,20,'group'),(18,19,'group'),(18,20,'group'),(19,20,'group'),
(21,22,'group'),(21,23,'group'),(21,24,'group'),(22,23,'group'),(22,24,'group'),(23,24,'group'),
(25,26,'group'),(25,27,'group'),(25,28,'group'),(26,27,'group'),(26,28,'group'),(27,28,'group'),
(29,30,'group'),(29,31,'group'),(29,32,'group'),(30,31,'group'),(30,32,'group'),(31,32,'group'),
(33,34,'group'),(33,35,'group'),(33,36,'group'),(34,35,'group'),(34,36,'group'),(35,36,'group'),
(37,38,'group'),(37,39,'group'),(37,40,'group'),(38,39,'group'),(38,40,'group'),(39,40,'group'),
(41,42,'group'),(41,43,'group'),(41,44,'group'),(42,43,'group'),(42,44,'group'),(43,44,'group'),
(45,46,'group'),(45,47,'group'),(45,48,'group'),(46,47,'group'),(46,48,'group'),(47,48,'group');

-- ============================================
-- Para hacerte admin (después de registrarte):
-- update profiles set is_admin = true where id = 'TU_USER_ID';
-- (el user_id está en Supabase → Authentication → Users)
-- ============================================
