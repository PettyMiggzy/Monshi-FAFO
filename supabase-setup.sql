-- Run this in your Supabase SQL editor
-- supabase.com → your project → SQL Editor

create table scores (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  level integer default 1,
  created_at timestamptz default now()
);

-- Index for fast leaderboard queries
create index scores_score_idx on scores(score desc);

-- Allow anyone to read and insert (public leaderboard)
alter table scores enable row level security;
create policy "Anyone can read scores" on scores for select using (true);
create policy "Anyone can insert scores" on scores for insert with check (true);

-- ─────────────────────────────────────────────────────────────────
-- $RENE CTO ARCADE — score tables (one per game, matches arcade pattern)
-- ─────────────────────────────────────────────────────────────────

create table if not exists scores_rene_run (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now()
);
create index if not exists scores_rene_run_score_idx on scores_rene_run(score desc);
alter table scores_rene_run enable row level security;
create policy "r" on scores_rene_run for select using (true);
create policy "i" on scores_rene_run for insert with check (true);

create table if not exists scores_rene_pump (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now()
);
create index if not exists scores_rene_pump_score_idx on scores_rene_pump(score desc);
alter table scores_rene_pump enable row level security;
create policy "r" on scores_rene_pump for select using (true);
create policy "i" on scores_rene_pump for insert with check (true);

create table if not exists scores_rene_gym (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now()
);
create index if not exists scores_rene_gym_score_idx on scores_rene_gym(score desc);
alter table scores_rene_gym enable row level security;
create policy "r" on scores_rene_gym for select using (true);
create policy "i" on scores_rene_gym for insert with check (true);
