# Monshi Run 3D

3D endless runner for the Monshi Arcade. Ride the purple Monad energy wave, grab
Monad-logo coins, dodge red "congestion blocks." Built with Three.js in a single
self-contained file (`/monshi-run.html`), same pattern as the other arcade games.

Lore fit: Monshi = Toshi's curiosity fused with Monad's ultra-fast purple energy —
so the game is about *momentum*. You accelerate as your combo builds (Monad
throughput made playable), a **Curiosity** meter (Toshi's trait) fills as you grab
coins and unlocks **Overdrive**, and cat-nine-lives = you can take several hits.

## Status: playable prototype
- ✅ Core loop: 3 lanes, lane-switch, jump, coins, obstacles, collision, scoring
- ✅ Combo multiplier → speed ramp, Curiosity → Overdrive (invincible + 2x)
- ✅ Lives (base 3 + holder-tier bonus lives via `monshi-shared.js` if present)
- ✅ Start / Game-over screens, local best score, share-ready stats
- ⏳ Leaderboard: submits to Supabase `scores_monshi3d` (graceful if missing)
- ⏳ Not yet linked from the hub (`index.html`)
- ⏳ PvP wager mode (see `contracts/MonshiRunDuel.sol`) — design sketch only

## Controls
- ◀ ▶ / A D / swipe — change lane
- SPACE / ▲ / W / swipe up — jump
- SHIFT / E / swipe down — Overdrive (when Curiosity is full)

## Assets
- `monshi.png` — character billboard sprite (transparent), derived from the
  official Monshi art
- `monad-coin.png` — Monad-logo coin face (transparent white squircle)
- `monad-coin-glow.png` — Monad coin with neon-purple glow (UI / share use)
- `keyart.jpg` — in-game key art (marketing / OG image)
- `monshi-hero.jpg` — clean hero render of Monshi

## Wiring the leaderboard (when ready)
Create the score table in Supabase (mirrors the other `scores_*` tables):

```sql
create table public.scores_monshi3d (
  id         bigserial primary key,
  name       text not null check (char_length(name) between 1 and 16),
  score      integer not null check (score >= 0),
  created_at timestamptz default now()
);
create index scores_monshi3d_score_idx on public.scores_monshi3d (score desc);
alter table public.scores_monshi3d enable row level security;
create policy "anon read"   on public.scores_monshi3d for select to anon using (true);
create policy "anon insert" on public.scores_monshi3d for insert to anon
  with check (char_length(name) between 1 and 16 and score >= 0);
```

Then add `'scores_monshi3d'` to `ALL_SCORE_TABLES` in `/games-config.js` so it
counts toward tournaments / prize / leaderboard aggregation.

## PvP (design, not shipped)
`contracts/MonshiRunDuel.sol` is an **unaudited sketch** of an async skill-wager:
two players stake equal $MONSHI on the **same seeded track**, higher score wins
the pot minus a transparent rake (→ treasury, optional burn split). Payout
requires a **backend-signed score** (anti-cheat) — the browser can't be trusted
to self-report. Do not deploy without an audit, a secured signer key, and a
review of skill-wager regulations for your jurisdiction.
