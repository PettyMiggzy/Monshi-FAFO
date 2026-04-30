-- ─────────────────────────────────────────────────────────────────
-- MONSHI SNIFF TEST — Daily Usage Tracker
-- Run this in Supabase SQL Editor
--
-- Tracks how many sniffs each wallet has used today.
-- Resets automatically at UTC midnight (we filter by date in queries).
-- ─────────────────────────────────────────────────────────────────

create table if not exists sniff_usage (
  id bigint generated always as identity primary key,
  wallet text not null,
  used_at timestamptz default now(),
  token_address text,
  mode text,
  result_status text  -- 'safe' | 'honeypot' | 'tax_high' | 'error'
);

create index if not exists sniff_usage_wallet_idx on sniff_usage(wallet);
create index if not exists sniff_usage_used_at_idx on sniff_usage(used_at);

alter table sniff_usage enable row level security;

-- Drop any old policies first so re-runs don't fail
do $$
declare p record;
begin
  for p in select policyname from pg_policies where tablename = 'sniff_usage' loop
    execute format('drop policy if exists %I on sniff_usage', p.policyname);
  end loop;
end $$;

-- Open SELECT + INSERT for anon (matches the lockdown pattern from earlier)
-- API route is what enforces the daily caps via app logic
create policy "su_select" on sniff_usage for select using (true);
create policy "su_insert" on sniff_usage for insert with check (true);

-- ─────────────────────────────────────────────────────────────
-- Verify (run this after migration):
-- ─────────────────────────────────────────────────────────────
select count(*) as existing_rows from sniff_usage;
-- expected: 0
