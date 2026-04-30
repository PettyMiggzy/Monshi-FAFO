import { BigInt, Bytes, Address, log } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/ERC20/ERC20";
import { ERC20 } from "../generated/ERC20/ERC20";
import {
  Wallet,
  Token,
  Holding,
  Transfer,
  WalletDay,
  Connection
} from "../generated/schema";

// ─── Helpers ───
function getOrCreateWallet(addr: Address, ts: BigInt, blockNum: BigInt): Wallet {
  let id = addr.toHexString();
  let w = Wallet.load(id);
  if (w == null) {
    w = new Wallet(id);
    w.firstSeenAt = ts;
    w.firstSeenBlock = blockNum;
    w.lastActiveAt = ts;
    w.txCount = BigInt.zero();
    w.sentCount = BigInt.zero();
    w.receivedCount = BigInt.zero();
    w.uniqueTokensTouched = BigInt.zero();
    w.uniqueCounterparties = BigInt.zero();
    w.totalNativeIn = BigInt.zero();
    w.totalNativeOut = BigInt.zero();
  }
  if (ts.gt(w.lastActiveAt)) w.lastActiveAt = ts;
  return w;
}

function getOrCreateToken(addr: Address, blockNum: BigInt): Token {
  let id = addr.toHexString();
  let t = Token.load(id);
  if (t == null) {
    t = new Token(id);
    t.firstSeenBlock = blockNum;
    t.uniqueHolders = BigInt.zero();
    t.totalTransfers = BigInt.zero();

    // Try to read metadata. These can fail on weird contracts — that's OK.
    let contract = ERC20.bind(addr);
    let nameTry = contract.try_name();
    if (!nameTry.reverted) t.name = nameTry.value;
    let symTry = contract.try_symbol();
    if (!symTry.reverted) t.symbol = symTry.value;
    let decTry = contract.try_decimals();
    if (!decTry.reverted) t.decimals = decTry.value;
    let supplyTry = contract.try_totalSupply();
    if (!supplyTry.reverted) t.totalSupply = supplyTry.value;
  }
  return t;
}

function getOrCreateHolding(walletId: string, tokenId: string, ts: BigInt, blockNum: BigInt): Holding {
  let id = walletId + "-" + tokenId;
  let h = Holding.load(id);
  if (h == null) {
    h = new Holding(id);
    h.wallet = walletId;
    h.token = tokenId;
    h.balance = BigInt.zero();
    h.firstAcquiredAt = ts;
    h.firstAcquiredBlock = blockNum;
    h.totalIn = BigInt.zero();
    h.totalOut = BigInt.zero();
    h.txCount = BigInt.zero();
  }
  return h;
}

function dayId(ts: BigInt): BigInt {
  // Round timestamp down to start of UTC day
  return ts.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
}

function getOrCreateWalletDay(walletId: string, ts: BigInt): WalletDay {
  let day = dayId(ts);
  let id = walletId + "-" + day.toString();
  let wd = WalletDay.load(id);
  if (wd == null) {
    wd = new WalletDay(id);
    wd.wallet = walletId;
    wd.date = day;
    wd.txCount = BigInt.zero();
    wd.uniqueTokensTouched = BigInt.zero();
    wd.uniqueCounterparties = BigInt.zero();
    wd.volumeIn = BigInt.zero();
    wd.volumeOut = BigInt.zero();
  }
  return wd;
}

function getOrCreateConnection(addrA: string, addrB: string, ts: BigInt): Connection {
  // Sort lexicographically so connections are de-duplicated regardless of direction
  let lo = addrA < addrB ? addrA : addrB;
  let hi = addrA < addrB ? addrB : addrA;
  let id = lo + "-" + hi;
  let c = Connection.load(id);
  if (c == null) {
    c = new Connection(id);
    c.walletA = lo;
    c.walletB = hi;
    c.totalTransfers = BigInt.zero();
    c.totalAmountAB = BigInt.zero();
    c.totalAmountBA = BigInt.zero();
    c.firstSeenAt = ts;
    c.lastSeenAt = ts;
  }
  c.lastSeenAt = ts;
  return c;
}

// ─── Main handler ───
export function handleTransfer(event: TransferEvent): void {
  let ts = event.block.timestamp;
  let blockNum = event.block.number;
  let amount = event.params.value;
  let fromAddr = event.params.from;
  let toAddr = event.params.to;
  let tokenAddr = event.address;

  // Skip mints (from = 0x0) and burns (to = 0x0) wallet-side accounting.
  // We still record the Transfer log though — useful for token total-supply tracking.
  let zeroAddr = Address.zero().toHexString();

  // Token entity
  let token = getOrCreateToken(tokenAddr, blockNum);
  token.totalTransfers = token.totalTransfers.plus(BigInt.fromI32(1));
  token.save();

  // Transfer log (always)
  let transferId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let transfer = new Transfer(transferId);
  transfer.txHash = event.transaction.hash;
  transfer.blockNumber = blockNum;
  transfer.blockTimestamp = ts;
  transfer.token = tokenAddr.toHexString();
  transfer.from = fromAddr.toHexString();
  transfer.to = toAddr.toHexString();
  transfer.amount = amount;
  transfer.isNative = false;

  // Wallet entities (only if not zero address)
  let isMint = fromAddr.toHexString() == zeroAddr;
  let isBurn = toAddr.toHexString() == zeroAddr;

  if (!isMint) {
    let fromWallet = getOrCreateWallet(fromAddr, ts, blockNum);
    fromWallet.txCount = fromWallet.txCount.plus(BigInt.fromI32(1));
    fromWallet.sentCount = fromWallet.sentCount.plus(BigInt.fromI32(1));
    fromWallet.save();

    // Holding
    let fromHolding = getOrCreateHolding(fromAddr.toHexString(), tokenAddr.toHexString(), ts, blockNum);
    fromHolding.balance = fromHolding.balance.minus(amount);
    fromHolding.totalOut = fromHolding.totalOut.plus(amount);
    fromHolding.txCount = fromHolding.txCount.plus(BigInt.fromI32(1));
    fromHolding.save();

    // Day
    let fromDay = getOrCreateWalletDay(fromAddr.toHexString(), ts);
    fromDay.txCount = fromDay.txCount.plus(BigInt.fromI32(1));
    fromDay.save();
  }

  if (!isBurn) {
    let toWallet = getOrCreateWallet(toAddr, ts, blockNum);
    toWallet.txCount = toWallet.txCount.plus(BigInt.fromI32(1));
    toWallet.receivedCount = toWallet.receivedCount.plus(BigInt.fromI32(1));
    toWallet.save();

    let toHolding = getOrCreateHolding(toAddr.toHexString(), tokenAddr.toHexString(), ts, blockNum);
    toHolding.balance = toHolding.balance.plus(amount);
    toHolding.totalIn = toHolding.totalIn.plus(amount);
    toHolding.txCount = toHolding.txCount.plus(BigInt.fromI32(1));
    toHolding.save();

    let toDay = getOrCreateWalletDay(toAddr.toHexString(), ts);
    toDay.txCount = toDay.txCount.plus(BigInt.fromI32(1));
    toDay.save();
  }

  // Connection (only when both sides are real wallets)
  if (!isMint && !isBurn) {
    let conn = getOrCreateConnection(fromAddr.toHexString(), toAddr.toHexString(), ts);
    conn.totalTransfers = conn.totalTransfers.plus(BigInt.fromI32(1));
    if (fromAddr.toHexString() == conn.walletA) {
      conn.totalAmountAB = conn.totalAmountAB.plus(amount);
    } else {
      conn.totalAmountBA = conn.totalAmountBA.plus(amount);
    }
    conn.save();
  }

  transfer.save();
}
