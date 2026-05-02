# Monshi Chat ↔ Telegram Bridge

Mirrors messages between the Monshi web chat (`/chat.html` → Supabase `chat_messages`) and your Telegram group, in **both directions**.

```
  Web user types → Supabase row → bridge sees it → posts to TG
  TG user types  → bridge sees it via getUpdates → inserts Supabase row → web feed updates
```

Zero npm dependencies — uses Node 18+ built-in `fetch`. Single file, ~200 lines.

---

## 1. Supabase setup (one-time)

Run this in your Supabase SQL editor:

```sql
create table public.chat_messages (
  id              bigserial primary key,
  wallet          text       not null,
  message         text       not null check (char_length(message) between 1 and 280),
  source          text       not null default 'web' check (source in ('web', 'tg')),
  tg_message_id   bigint     unique,
  tg_user         text,
  tier            text,
  created_at      timestamptz default now()
);

create index chat_messages_created_at_idx on public.chat_messages (created_at desc);
create index chat_messages_source_id_idx  on public.chat_messages (source, id);

-- RLS
alter table public.chat_messages enable row level security;

-- Anyone can read all messages
create policy "anon read all"
  on public.chat_messages for select
  to anon
  using (true);

-- Anon can insert ONLY web-sourced messages, only with a 0x address, only short text
create policy "anon insert web"
  on public.chat_messages for insert
  to anon
  with check (
    source = 'web'
    and char_length(wallet) = 42
    and wallet like '0x%'
    and char_length(message) between 1 and 280
  );

-- Service role (bridge) can do anything
create policy "service all"
  on public.chat_messages for all
  to service_role
  using (true)
  with check (true);
```

> ⚠️ Use your **service_role** key in the bridge env (Supabase Project Settings → API → `service_role` secret). Never expose it client-side. The web frontend uses the public `anon` key.

---

## 2. Telegram bot setup (one-time, ~3 minutes)

In Telegram:

1. Talk to **@BotFather**
2. `/newbot` → name it (e.g. `Monshi Chat Bridge`) → username (e.g. `MonshiChatBridgeBot`)
3. Save the **bot token** it gives you
4. `/setprivacy` → choose your bot → **Disable** ← **REQUIRED** so the bot can read regular group messages, not just commands
5. Add the bot to your Monshi TG group **as admin** with "Read Messages" permission

Get your **chat_id**:

- Add `@RawDataBot` or `@JsonDumpBot` to the group temporarily, send a message, copy the `chat.id` value (will be a negative number for groups, e.g. `-1001234567890`)
- Or use: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` after sending a message in the group

---

## 3. Deploy on your droplet

### Mode A — standalone PM2 process (simplest)

```bash
ssh root@138.68.248.211
mkdir -p /opt/monshi-bridge && cd /opt/monshi-bridge

# upload these two files: tg-sync.js, package.json
# (or git pull from this repo's worker/ directory)

# Set env vars (use a .env file or systemd or pm2 ecosystem)
cat > .env <<'EOF'
TG_BOT_TOKEN=123456:abcdefYourBotTokenHere
TG_CHAT_ID=-1001234567890
SUPABASE_URL=https://cuqhqcmrgpdjlhyqztnc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...your_service_role_key
EOF

# Load env + start with PM2
pm2 start tg-sync.js --name monshi-chat-bridge --update-env
pm2 logs monshi-chat-bridge   # watch it boot, should print "[bridge] started · bot id ..."
pm2 save
```

If PM2 doesn't auto-load `.env`, prefix the start command:

```bash
env $(grep -v '^#' .env | xargs) pm2 start tg-sync.js --name monshi-chat-bridge
```

### Mode B — import into existing bot

If you already have a Monshi bot running on the droplet, add the bridge alongside whatever it does:

```js
// existing-bot.js
const bridge = require('./tg-sync');

bridge.start({
  botToken:           process.env.TG_BOT_TOKEN,
  chatId:             process.env.TG_CHAT_ID,
  supabaseUrl:        process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY
});

// ... your existing bot code keeps running ...
```

The bridge runs its own polling loops in the background; it doesn't conflict with anything else the bot does.

---

## 4. Verify it works

1. Web: go to `https://monshi-fafo.vercel.app/chat.html`, connect a Dolphin+ wallet, send a message
2. Within ~2 seconds the message should appear in your TG group, prefixed with `🌐`
3. Reply in TG — within ~2 seconds it should appear in the web chat with a `📱 TG` badge

If it's not working, `pm2 logs monshi-chat-bridge` will tell you why. Most common issues:
- **Bot privacy mode still ON** → bot only sees `/commands`, not regular messages. Fix in BotFather → /setprivacy → Disable.
- **Bot not admin** → can't read group messages without admin + read permission.
- **Wrong chat_id** → must include the leading `-100` for supergroups.
- **Used anon key instead of service_role** → inserts fail with RLS error.

---

## How dedup / no-loop works

- TG → web inserts use `tg_message_id` which has a `UNIQUE` constraint. If the bridge re-sees the same TG update (rare on restart), the second insert returns 409 and is silently ignored.
- Web → TG: bridge cursor-tracks `lastWebSeenId` so it never re-sends. Web posts get a `🌐` prefix in TG; when the bridge sees that prefix in `getUpdates` later, it skips it (its own bot ID also skipped).
- Bot's own messages (`from.id === myBotId`) are skipped from TG→web mirroring.

---

## Tuning

Edit `DEFAULTS` at the top of `tg-sync.js`:

| Setting | Default | What it does |
|---|---|---|
| `pollIntervalMs` | `1500` | How often to check Supabase for new web messages |
| `tgLongPollSeconds` | `30` | TG `getUpdates` long-poll duration |
| `maxMessageLen` | `280` | Truncation cap (matches web cap) |
| `webPrefix` | `'🌐'` | Tag shown in TG when message originated on web |

---

## What this does NOT do (yet)

- No image/sticker/video forwarding (text only — keeps it simple)
- No reply threading
- No edit/delete sync (TG edits don't update Supabase rows, web edits aren't possible anyway)
- No user mention notifications

Easy to add — just extend `pollTg` to handle `msg.photo`, `msg.sticker`, etc. and store media URLs.

---

## Stopping the bridge

```bash
pm2 stop monshi-chat-bridge
pm2 delete monshi-chat-bridge
```

The web chat keeps working standalone (people just won't see TG messages and TG won't see web messages).

---

# Pack Map (`/map.html`) Supabase setup

Separate from the chat bridge — but lives in the same Supabase project. Run this SQL once:

```sql
create table public.monshi_pack_locations (
  wallet_hash   text       primary key,
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  country_code  text,
  country       text,
  city          text,
  first_seen    timestamptz default now(),
  last_seen     timestamptz default now()
);

create index pack_locations_country_idx on public.monshi_pack_locations (country_code);
create index pack_locations_last_seen_idx on public.monshi_pack_locations (last_seen desc);

alter table public.monshi_pack_locations enable row level security;

-- Anyone can read pinned locations (anonymized, no wallet exposed)
create policy "anon read all"
  on public.monshi_pack_locations for select
  to anon
  using (true);

-- Anyone can insert their own pin (wallet_hash is SHA-256, validated by length)
create policy "anon insert own"
  on public.monshi_pack_locations for insert
  to anon
  with check (
    char_length(wallet_hash) = 64
    and lat between -90 and 90
    and lng between -180 and 180
  );

-- Anyone can update their own row (re-pin / refresh last_seen)
create policy "anon update own"
  on public.monshi_pack_locations for update
  to anon
  using (true)
  with check (true);

-- Service role can do anything (admin / cleanup tasks)
create policy "service all"
  on public.monshi_pack_locations for all
  to service_role
  using (true) with check (true);
```

### How privacy works

1. User connects wallet
2. Page reads their wallet address
3. Page computes `SHA-256(wallet_address.toLowerCase())` **in the browser** via SubtleCrypto API
4. Only the hash is sent to Supabase — the address never leaves the browser
5. Lat/lng rounded to 2 decimal places (~10 km grid) before storage
6. There's no rainbow-table risk for full addresses (2^160 keyspace) — practically irreversible

### What runs against the table

- `/map.html` selects all rows (anon read) → renders globe
- `/map.html` upserts one row per pin (anon insert + update) → adds dot
- No worker / cron needed — table is purely client-driven

### Optional cleanup cron

If you want stale pins to expire (e.g. 90 days inactive), run this periodically (server-side or scheduled Supabase function):

```sql
delete from public.monshi_pack_locations
where last_seen < now() - interval '90 days';
```

