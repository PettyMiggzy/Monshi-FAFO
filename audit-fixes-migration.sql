-- ─────────────────────────────────────────────────────────────────
-- MONSHI ARCADE — AUDIT FIXES SQL MIGRATION
-- Run this in Supabase SQL Editor (one-shot, idempotent)
--
-- What this does:
--   1. Creates missing scores_pong and scores_coin tables
--   2. Adds wallet column to scores_rene_* and scores_rugscan
--   3. Locks down RLS — keeps INSERT open, blocks DELETE/UPDATE
--      so randos can't wipe the leaderboard
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ─────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────
-- PHASE A: Create missing tables
-- ──────────────────────────────────────────────────

create table if not exists scores_pong (
  id bigint generated always as identity primary key,
  name text not null,
  wallet text,
  score integer not null,
  created_at timestamptz default now()
);
create index if not exists scores_pong_score_idx on scores_pong(score desc);
create index if not exists scores_pong_wallet_idx on scores_pong(wallet);
alter table scores_pong enable row level security;

create table if not exists scores_coin (
  id bigint generated always as identity primary key,
  name text not null,
  wallet text,
  score integer not null,
  created_at timestamptz default now()
);
create index if not exists scores_coin_score_idx on scores_coin(score desc);
create index if not exists scores_coin_wallet_idx on scores_coin(wallet);
alter table scores_coin enable row level security;

-- ──────────────────────────────────────────────────
-- PHASE B: Add wallet column to tables missing it
-- ──────────────────────────────────────────────────

alter table scores_rene_run    add column if not exists wallet text;
alter table scores_rene_pump   add column if not exists wallet text;
alter table scores_rene_gym    add column if not exists wallet text;
alter table scores_rugscan     add column if not exists wallet text;

create index if not exists scores_rene_run_wallet_idx    on scores_rene_run(wallet);
create index if not exists scores_rene_pump_wallet_idx   on scores_rene_pump(wallet);
create index if not exists scores_rene_gym_wallet_idx    on scores_rene_gym(wallet);
create index if not exists scores_rugscan_wallet_idx     on scores_rugscan(wallet);

-- ──────────────────────────────────────────────────
-- PHASE C: RLS lockdown — block DELETE/UPDATE for anon role
-- Anyone can still INSERT (players need to write scores).
-- Anyone can still SELECT (leaderboards need to read).
-- Nobody anon can DELETE or UPDATE existing rows.
-- ──────────────────────────────────────────────────

-- Helper: drop any existing overly-permissive policies first
do $$
declare t text;
begin
  for t in select unnest(array[
    'scores','scores_shooter','scores_racer','scores_flappy','scores_snake',
    'scores_breaker','scores_pump','scores_flip','scores_whack','scores_2048',
    'scores_slots','scores_memory','scores_plinko','scores_rug','scores_wordle',
    'scores_tetris','scores_c4','scores_trivia','scores_mine','scores_bj',
    'scores_whale','scores_trade','scores_pong','scores_heist','scores_coin',
    'scores_rugscan','scores_rene_run','scores_rene_pump','scores_rene_gym',
    'referrals'
  ]) loop
    -- drop ALL existing policies on this table (we'll rebuild fresh)
    execute format('
      do $inner$
      declare p record;
      begin
        for p in select policyname from pg_policies where tablename = %L loop
          execute format(''drop policy if exists %%I on %I'', p.policyname, %L);
        end loop;
      end $inner$;
    ', t, t, t);

    -- Re-create: allow SELECT + INSERT only, no UPDATE/DELETE
    execute format('alter table %I enable row level security', t);
    execute format('create policy "anon_select" on %I for select using (true)', t);
    execute format('create policy "anon_insert" on %I for insert with check (true)', t);
    -- (notably absent: no UPDATE policy, no DELETE policy → both denied)
  end loop;
end $$;

-- ──────────────────────────────────────────────────
-- PHASE D: Verify
-- ──────────────────────────────────────────────────

-- Run this to confirm all tables exist and policies are correct:
select tablename,
       (select count(*) from pg_policies p where p.tablename = t.tablename and cmd = 'SELECT')   as can_select,
       (select count(*) from pg_policies p where p.tablename = t.tablename and cmd = 'INSERT')   as can_insert,
       (select count(*) from pg_policies p where p.tablename = t.tablename and cmd = 'UPDATE')   as can_update,
       (select count(*) from pg_policies p where p.tablename = t.tablename and cmd = 'DELETE')   as can_delete
from pg_tables t
where schemaname = 'public'
  and (tablename like 'scores%' or tablename = 'referrals')
order by tablename;
-- Expected output: can_select=1, can_insert=1, can_update=0, can_delete=0 for every row.
