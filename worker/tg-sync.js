/**
 * Monshi TG Chat Bridge
 * ----------------------
 * Mirrors messages between the Monshi web chat (Supabase chat_messages table)
 * and your Telegram group, in BOTH directions.
 *
 * USAGE — TWO MODES:
 *
 * ┌─ MODE A: Standalone PM2 process ─────────────────────────────────────┐
 * │   1. Drop this file + package.json on droplet                         │
 * │   2. cd /path/to/worker && npm install                                │
 * │   3. Set env vars (see .env.example)                                  │
 * │   4. pm2 start tg-sync.js --name monshi-chat-bridge                   │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ MODE B: Import into existing bot ───────────────────────────────────┐
 * │   const bridge = require('./tg-sync');                                │
 * │   bridge.start({                                                       │
 * │     botToken: process.env.TG_BOT_TOKEN,                                │
 * │     chatId:   process.env.TG_CHAT_ID,                                  │
 * │     supabaseUrl: process.env.SUPABASE_URL,                             │
 * │     supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY               │
 * │   });                                                                  │
 * │   // Your existing bot keeps doing whatever it does;                   │
 * │   // bridge runs alongside on its own polling loop.                    │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * REQUIREMENTS:
 *   - Bot must be added to your TG group as ADMIN with "Read Messages" enabled
 *   - Bot must have privacy mode OFF (talk to @BotFather → /setprivacy → Disable)
 *     otherwise it only sees commands, not regular chat messages
 *   - SUPABASE_SERVICE_KEY (not the anon key) — for writing source='tg' rows
 *
 * SAFETY:
 *   - Dedupes by tg_message_id (TG side) and by id (web side) so messages
 *     never echo back into the chat they came from.
 *   - Truncates anything over 280 chars to match web cap.
 *   - Skips bot's own messages so its mirror posts don't loop.
 */

'use strict';

const DEFAULTS = {
  pollIntervalMs: 1500,        // how often to check Supabase for new web msgs
  tgLongPollSeconds: 30,        // long-poll seconds for TG getUpdates
  maxMessageLen: 280,
  webPrefix: '🌐',              // emoji shown in TG when message originated on web
};

function start(opts) {
  const cfg = Object.assign({}, DEFAULTS, opts);
  if (!cfg.botToken)            throw new Error('botToken required');
  if (!cfg.chatId)              throw new Error('chatId required');
  if (!cfg.supabaseUrl)         throw new Error('supabaseUrl required');
  if (!cfg.supabaseServiceKey)  throw new Error('supabaseServiceKey required');

  const TG_API = `https://api.telegram.org/bot${cfg.botToken}`;
  const SB_REST = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const sbHeaders = {
    'apikey': cfg.supabaseServiceKey,
    'Authorization': `Bearer ${cfg.supabaseServiceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  let lastTgUpdateId = 0;
  let lastWebSeenId = 0;
  let myBotId = null;

  // ─── Helpers ─────────────────────────────────────────────────────────
  async function fetchJson(url, init) {
    const r = await fetch(url, init);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const txt = await r.text();
      throw new Error(`non-JSON response ${r.status}: ${txt.slice(0, 200)}`);
    }
    return r.json();
  }

  function shortAddr(a) {
    if (!a || a.length < 10) return a || '';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }

  function tierLabel(t) {
    return ({
      royalty: '👑 ROYALTY',
      whale:   '🐋 WHALE',
      dolphin: '🐬 DOLPHIN',
      crab:    '🦀 CRAB',
      shrimp:  '🦐 SHRIMP'
    })[t] || '🦐';
  }

  function truncate(s) {
    s = String(s || '');
    return s.length > cfg.maxMessageLen ? s.slice(0, cfg.maxMessageLen - 1) + '…' : s;
  }

  // ─── Init: discover bot ID and seed cursors ─────────────────────────
  async function init() {
    try {
      const me = await fetchJson(`${TG_API}/getMe`);
      if (me.ok) myBotId = me.result.id;
    } catch (e) { console.error('[bridge] getMe failed:', e.message); }

    // Seed lastWebSeenId from highest current id (so we don't re-mirror history)
    try {
      const r = await fetch(`${SB_REST}/chat_messages?select=id&source=eq.web&order=id.desc&limit=1`, { headers: sbHeaders });
      const rows = await r.json();
      lastWebSeenId = (Array.isArray(rows) && rows[0]) ? rows[0].id : 0;
    } catch (e) {
      console.error('[bridge] seed web cursor failed:', e.message);
    }

    console.log(`[bridge] started · bot id ${myBotId} · web cursor ${lastWebSeenId}`);
  }

  // ─── TG → Supabase (incoming TG messages mirror to web) ─────────────
  async function pollTg() {
    try {
      const url = `${TG_API}/getUpdates?offset=${lastTgUpdateId + 1}&timeout=${cfg.tgLongPollSeconds}&allowed_updates=["message"]`;
      const data = await fetchJson(url);
      if (!data.ok) return;

      for (const update of data.result || []) {
        lastTgUpdateId = update.update_id;
        const msg = update.message;
        if (!msg || !msg.text) continue;
        if (String(msg.chat.id) !== String(cfg.chatId)) continue;
        // Skip messages from the bot itself (would create loops)
        if (myBotId && msg.from && msg.from.id === myBotId) continue;
        // Skip bot-sourced messages (the mirror tag we add to web→tg posts)
        if (msg.text.startsWith(cfg.webPrefix)) continue;

        const tgUser = msg.from
          ? '@' + (msg.from.username || (msg.from.first_name || 'user').replace(/\s+/g, '_'))
          : 'tg-user';

        const payload = {
          wallet:          'tg:' + (msg.from && msg.from.id),
          message:         truncate(msg.text),
          source:          'tg',
          tg_message_id:   msg.message_id,
          tg_user:         tgUser,
          tier:            null,
          created_at:      new Date(msg.date * 1000).toISOString()
        };

        const r = await fetch(`${SB_REST}/chat_messages`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          // tg_message_id has UNIQUE constraint → 409 if already mirrored, ignore
          if (r.status !== 409) {
            console.error('[bridge] tg→web insert failed:', r.status, await r.text());
          }
        }
      }
    } catch (e) {
      console.error('[bridge] tg poll error:', e.message);
    }
  }

  // ─── Supabase → TG (outgoing web messages mirror to TG) ─────────────
  async function pollWeb() {
    try {
      const r = await fetch(
        `${SB_REST}/chat_messages?select=*&source=eq.web&id=gt.${lastWebSeenId}&order=id.asc&limit=20`,
        { headers: sbHeaders }
      );
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) return;

      for (const row of rows) {
        lastWebSeenId = Math.max(lastWebSeenId, row.id);
        const tag    = `${cfg.webPrefix} ${tierLabel(row.tier)} ${shortAddr(row.wallet)}`;
        const text   = `${tag}\n${truncate(row.message)}`;

        try {
          const send = await fetch(`${TG_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cfg.chatId,
              text: text,
              disable_web_page_preview: true
            })
          });
          if (!send.ok) console.error('[bridge] sendMessage failed:', send.status, await send.text());
        } catch (e) {
          console.error('[bridge] sendMessage error:', e.message);
        }
      }
    } catch (e) {
      console.error('[bridge] web poll error:', e.message);
    }
  }

  // ─── Main loop ──────────────────────────────────────────────────────
  async function loop() {
    // run TG long-poll and web short-poll in parallel forever
    (async () => { while (true) { await pollTg(); } })();
    (async () => {
      while (true) {
        await pollWeb();
        await new Promise(r => setTimeout(r, cfg.pollIntervalMs));
      }
    })();
  }

  init().then(loop).catch(e => {
    console.error('[bridge] fatal:', e);
    process.exit(1);
  });

  return {
    // exposed in case you want to query state from your existing bot
    getStatus: () => ({ lastTgUpdateId, lastWebSeenId, myBotId })
  };
}

module.exports = { start };

// ─── Auto-run if called directly (`node tg-sync.js`) ───────────────────
if (require.main === module) {
  const need = (k) => {
    const v = process.env[k];
    if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
    return v;
  };
  start({
    botToken:           need('TG_BOT_TOKEN'),
    chatId:             need('TG_CHAT_ID'),
    supabaseUrl:        need('SUPABASE_URL'),
    supabaseServiceKey: need('SUPABASE_SERVICE_KEY')
  });
}
