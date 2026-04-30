# Monshi Profiler — Goldsky Subgraph

Indexes ALL ERC20 Transfer events on Monad mainnet. Powers the Wallet Profiler tool.

## Deploy steps

### One-time setup (local machine, your terminal — NOT droplet)

```bash
# Install Goldsky CLI
curl https://goldsky.com/install.sh | sh

# Login (uses your Goldsky API token from goldsky.com Settings)
goldsky login
# Paste your token when prompted
```

### Deploy this subgraph

```bash
# From repo root
cd subgraph

# Generate the AssemblyScript types from the schema
goldsky subgraph generate

# Deploy to Goldsky
goldsky subgraph deploy monshi-profiler/v1.0 --path .
```

After deploy, Goldsky returns a query URL like:
```
https://api.goldsky.com/api/public/{your-project-id}/subgraphs/monshi-profiler/v1.0/gn
```

That URL needs to go into Vercel as `GOLDSKY_QUERY_URL`.

### Indexing time

Subgraph backfills from block 1 of Monad mainnet. With Goldsky's infrastructure this typically completes in **6-12 hours** for a chain Monad's age. You can query while it backfills — it'll just be partially complete until "Synced" status.

Check progress on Goldsky dashboard.

### Query test (once deployed)

```graphql
query {
  wallets(first: 10, orderBy: txCount, orderDirection: desc) {
    id
    txCount
    firstSeenAt
    holdings(first: 5, orderBy: balance, orderDirection: desc) {
      token { symbol }
      balance
    }
  }
}
```

Should return the top 10 most-active wallets on Monad and their top holdings.

## Files

- `schema.graphql` — entity definitions (Wallet, Token, Holding, Transfer, etc)
- `subgraph.yaml` — Goldsky manifest (what to index)
- `mappings/transfer.ts` — handler that runs on every Transfer event
- `abis/ERC20.json` — standard ERC20 ABI

## Schema overview

- **Wallet** — every address that ever sent or received any token
- **Token** — every ERC20 contract (auto-detected on first Transfer)
- **Holding** — per-wallet, per-token current balance
- **Transfer** — every ERC20 transfer (immutable log)
- **WalletDay** — daily aggregates per wallet (for activity heatmaps)
- **Connection** — wallet-to-wallet relationships (for cluster graph)

## Cost

Free on Goldsky's free tier as of 2026. If we ever exceed limits, the contract is portable — same subgraph code can deploy to The Graph, Envio, Ponder, etc.

## Re-deploying (if you change the schema)

Bump the version: `monshi-profiler/v1.1`. Old version stays running; you can drain it once the new one is synced.
