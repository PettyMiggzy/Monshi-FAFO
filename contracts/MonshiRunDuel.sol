// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────
//  MonshiRunDuel — async skill-wager PvP for Monshi Run
//  SKETCH / not audited. Review + audit before touching real funds.
//
//  Model: two players stake equal MONSHI on the SAME seeded track.
//  Higher score wins the pot minus a transparent rake. The rake is the
//  ONLY house cut — the contract is never a betting counterparty, so it
//  cannot lose. Payout requires a score signed by the trusted backend
//  (anti-cheat), because the browser can't be trusted to report scores.
// ─────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amt) external returns (bool);
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
}

contract MonshiRunDuel {
    // ---- config (set at deploy, immutable = trustless & cheap) ----
    IERC20  public immutable MONSHI;      // $MONSHI token
    address public immutable treasury;    // 0xece5...63aa
    address public immutable burnAddr;    // 0x...dead (set to treasury to disable burn)
    address public immutable signer;      // your backend's score-signing key
    uint16  public immutable rakeBps;     // e.g. 600 = 6.00%
    uint16  public immutable burnBps;     // portion of rake that burns, e.g. 200 = 2.00%

    enum State { Open, Locked, Settled, Refunded }

    struct Duel {
        address challenger;
        address opponent;
        uint256 stake;      // per player; pot = 2 * stake
        bytes32 seed;       // deterministic track layout — same for both
        uint64  expiry;     // if not accepted/settled by then -> refundable
        State   state;
    }

    mapping(uint256 => Duel) public duels;
    uint256 public nextId;

    event Created(uint256 id, address challenger, uint256 stake, bytes32 seed);
    event Accepted(uint256 id, address opponent);
    event Settled(uint256 id, address winner, uint256 payout, uint256 rake);
    event Refunded(uint256 id);

    error BadState(); error NotParty(); error TooLate(); error BadSig(); error Tie();

    constructor(
        IERC20 monshi, address _treasury, address _burnAddr,
        address _signer, uint16 _rakeBps, uint16 _burnBps
    ) {
        require(_rakeBps <= 2000 && _burnBps <= _rakeBps, "rake");
        MONSHI = monshi; treasury = _treasury; burnAddr = _burnAddr;
        signer = _signer; rakeBps = _rakeBps; burnBps = _burnBps;
    }

    // 1) Challenger opens a duel and locks their stake.
    function createChallenge(uint256 stake, bytes32 seed, uint64 expiry)
        external returns (uint256 id)
    {
        require(stake > 0 && expiry > block.timestamp, "args");
        MONSHI.transferFrom(msg.sender, address(this), stake);
        id = nextId++;
        duels[id] = Duel(msg.sender, address(0), stake, seed, expiry, State.Open);
        emit Created(id, msg.sender, stake, seed);
    }

    // 2) Opponent accepts and matches the stake.
    function acceptChallenge(uint256 id) external {
        Duel storage d = duels[id];
        if (d.state != State.Open) revert BadState();
        if (block.timestamp > d.expiry) revert TooLate();
        MONSHI.transferFrom(msg.sender, address(this), d.stake);
        d.opponent = msg.sender;
        d.state = State.Locked;
        emit Accepted(id, msg.sender);
    }

    // 6) Anyone can submit the backend-signed result; contract verifies + pays.
    //    sig = signer's signature over (address(this), id, scoreChallenger, scoreOpponent).
    //    Binding address(this) + id prevents replay across duels/contracts.
    function submitResult(
        uint256 id, uint256 scoreChallenger, uint256 scoreOpponent, bytes calldata sig
    ) external {
        Duel storage d = duels[id];
        if (d.state != State.Locked) revert BadState();
        if (scoreChallenger == scoreOpponent) revert Tie(); // handle ties off-chain (rematch/split)

        bytes32 h = keccak256(abi.encodePacked(address(this), id, scoreChallenger, scoreOpponent));
        bytes32 ethMsg = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
        if (_recover(ethMsg, sig) != signer) revert BadSig();

        address winner = scoreChallenger > scoreOpponent ? d.challenger : d.opponent;
        uint256 pot = d.stake * 2;
        uint256 rake = pot * rakeBps / 10_000;
        uint256 burn = pot * burnBps / 10_000;      // burn is carved out of the rake
        uint256 payout = pot - rake;                 // winner take-home
        d.state = State.Settled;

        MONSHI.transfer(winner, payout);
        if (burn > 0) MONSHI.transfer(burnAddr, burn);
        MONSHI.transfer(treasury, rake - burn);      // remaining rake to treasury
        emit Settled(id, winner, payout, rake);
    }

    // Refund an unaccepted (or stale-locked) duel after expiry.
    function refund(uint256 id) external {
        Duel storage d = duels[id];
        if (block.timestamp <= d.expiry) revert TooLate();
        if (d.state == State.Open) {
            d.state = State.Refunded;
            MONSHI.transfer(d.challenger, d.stake);
        } else if (d.state == State.Locked) {
            d.state = State.Refunded;                // signer went down: return both stakes
            MONSHI.transfer(d.challenger, d.stake);
            MONSHI.transfer(d.opponent, d.stake);
        } else revert BadState();
        emit Refunded(id);
    }

    function _recover(bytes32 h, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := calldataload(sig.offset); s := calldataload(add(sig.offset, 32));
                   v := byte(0, calldataload(add(sig.offset, 64))) }
        return ecrecover(h, v, r, s);
    }
}
