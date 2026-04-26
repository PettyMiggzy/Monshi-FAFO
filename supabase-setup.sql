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
