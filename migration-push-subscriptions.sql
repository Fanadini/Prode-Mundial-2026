-- ============================================
-- MIGRACIÓN: Tabla de suscripciones push
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

create table if not exists push_subscriptions (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  subscription jsonb not null,
  updated_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Own push subscription" on push_subscriptions
  for all using (auth.uid() = user_id);
