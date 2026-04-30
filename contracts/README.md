# Monshi Multisender — Deployment

## Contract

`MonshiMultisender.sol` — gas-efficient batch ERC20 + native sender. No owner, no upgrade, no custody.

## Deploy steps (Remix — easiest, no install needed)

1. Open https://remix.ethereum.org
2. New file → paste `MonshiMultisender.sol`
3. Solidity Compiler tab → Compiler `0.8.24` → Compile
4. Deploy & Run tab:
   - Environment: **Injected Provider - MetaMask** (with Monad mainnet selected in MetaMask)
   - Account: deployer wallet (King Petty wallet `0xB9d4B73bE18914c6d64Bee65a806648370be467f`)
   - Contract: `MonshiMultisender`
   - Click **Deploy**
   - Confirm in MetaMask
5. Copy the deployed address.
6. Paste it into `multisender.html` constant `MULTISENDER_ADDRESS`.
7. Optional: verify contract on monadexplorer.com / monadvision.com — paste source, set compiler 0.8.24, no constructor args, no optimization runs (or 200, doesn't matter for verification).

## Deploy via Foundry (alternative)

```bash
# In contracts/ directory
forge create --rpc-url https://rpc.monad.xyz \
  --private-key $DEPLOYER_PK \
  src/MonshiMultisender.sol:MonshiMultisender
```

## ABI (for frontend)

See `MultisenderABI.json` or copy from compiled contract artifact.

## Gas estimates (mainnet rough)

| Action | Gas |
|---|---|
| Deploy | ~500k |
| sendERC20 (100 recipients) | ~3M |
| sendERC20Equal (100 recipients) | ~2.8M |
| sendNative (100 recipients) | ~2.5M |

**500-recipient ceiling per tx** is a soft frontend limit — Monad block gas limit may handle more, but batch larger sends into multiple txs for safety.

## Audit

Not audited. Custom contract. Use at your own risk.

Recommended audit firms (if/when):
- Halborn — fast turnaround for small contracts
- ConsenSys Diligence — deep
- Code4rena — public contest, ~$5-10k
