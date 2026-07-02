// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MonshiFireworks — 4th of July drop (50 pieces)
 * @notice Fixed-supply ERC-721. Two ways to mint, both forward ALL proceeds
 *         straight to the treasury (no custody):
 *           1. buy(id)  — pick a specific piece at its tier price
 *           2. spin()   — 250 MON gacha: weighted-random rarity, random
 *                         unminted piece of that rarity (the Fortune Wheel)
 *         Standard ERC-721 + ERC-2981 royalties (5% -> treasury), so pieces
 *         are immediately tradeable on OpenSea / any Monad marketplace.
 *
 * Token ID -> rarity (matches the published collection manifest):
 *   1-28  Common     400 MON
 *   29-40 Uncommon   750 MON
 *   41-47 Rare     1,250 MON
 *   48-49 Epic     2,000 MON
 *   50    Legendary 3,000 MON
 *
 * Sale window: [saleStart, saleEnd). After saleEnd nothing more can ever be
 * minted — unminted pieces are gone forever (that's the point of the drop).
 *
 * Randomness note: spin() uses prevrandao/blockhash entropy. That is fine for
 * a 250-MON gacha but is NOT security-grade randomness — a colluding
 * validator could bias it. Do not reuse this pattern for high-value draws.
 *
 * NOT AUDITED. Review before mainnet. Deploy via Remix (OZ imports resolve
 * automatically) with compiler 0.8.24+.
 */
contract MonshiFireworks is ERC721, ERC2981, Ownable, ReentrancyGuard {
    uint256 public constant MAX_ID = 50;

    address payable public immutable TREASURY;
    uint64 public saleStart;
    uint64 public saleEnd;
    string private _base;

    uint256 public constant SPIN_PRICE = 250 ether; // MON has 18 decimals

    // rarity tiers, cheapest first
    uint256 private constant T_COMMON = 0;
    uint256 private constant T_UNCOMMON = 1;
    uint256 private constant T_RARE = 2;
    uint256 private constant T_EPIC = 3;
    uint256 private constant T_LEGENDARY = 4;

    // remaining unminted ids per tier (populated in constructor)
    mapping(uint256 => uint16[]) private _pool;
    uint256 private _nonce;

    event Minted(address indexed to, uint256 indexed id, bool viaSpin, uint256 paid);

    error SaleClosed();
    error WrongPayment();
    error AlreadyMinted();
    error SoldOut();
    error ForwardFailed();

    constructor(address payable treasury, uint64 start, uint64 end)
        ERC721("Monshi Fireworks - 4th of July", "MFW4")
        Ownable(msg.sender)
    {
        require(treasury != address(0) && end > start, "bad args");
        TREASURY = treasury;
        saleStart = start;
        saleEnd = end;
        _setDefaultRoyalty(treasury, 500); // 5% royalties -> treasury
        for (uint16 id = 1; id <= MAX_ID; id++) {
            _pool[_tierOf(id)].push(id);
        }
    }

    // ── tier / price ──────────────────────────────────────────────
    function _tierOf(uint256 id) internal pure returns (uint256) {
        if (id <= 28) return T_COMMON;
        if (id <= 40) return T_UNCOMMON;
        if (id <= 47) return T_RARE;
        if (id <= 49) return T_EPIC;
        return T_LEGENDARY;
    }

    function priceOf(uint256 id) public pure returns (uint256) {
        uint256 t = _tierOf(id);
        if (t == T_COMMON) return 400 ether;
        if (t == T_UNCOMMON) return 750 ether;
        if (t == T_RARE) return 1250 ether;
        if (t == T_EPIC) return 2000 ether;
        return 3000 ether;
    }

    function saleLive() public view returns (bool) {
        return block.timestamp >= saleStart && block.timestamp < saleEnd;
    }

    function remainingOfTier(uint256 tier) external view returns (uint256) {
        return _pool[tier].length;
    }

    // ── mint paths ────────────────────────────────────────────────
    /// Buy a specific piece at its tier price.
    function buy(uint256 id) external payable nonReentrant {
        if (!saleLive()) revert SaleClosed();
        if (id == 0 || id > MAX_ID) revert AlreadyMinted();
        if (_ownerOfSafe(id) != address(0)) revert AlreadyMinted();
        if (msg.value != priceOf(id)) revert WrongPayment();
        _removeFromPool(_tierOf(id), uint16(id));
        _forward();
        _safeMint(msg.sender, id);
        emit Minted(msg.sender, id, false, msg.value);
    }

    /// Fortune Wheel: 250 MON, weighted-random rarity, random piece of it.
    /// Weights per 1000: Common 700 / Uncommon 200 / Rare 72 / Epic 23 / Legendary 5.
    function spin() external payable nonReentrant returns (uint256 id) {
        if (!saleLive()) revert SaleClosed();
        if (msg.value != SPIN_PRICE) revert WrongPayment();

        uint256 rnd = uint256(keccak256(abi.encodePacked(
            block.prevrandao, blockhash(block.number - 1), msg.sender, _nonce++
        )));

        uint256 roll = rnd % 1000;
        uint256 tier = roll < 700 ? T_COMMON
                     : roll < 900 ? T_UNCOMMON
                     : roll < 972 ? T_RARE
                     : roll < 995 ? T_EPIC
                     : T_LEGENDARY;

        // cascade: if the drawn tier is sold out, fall to cheaper tiers,
        // then climb upward; fully sold out -> revert (payment returned).
        uint256 t = tier;
        while (_pool[t].length == 0) {
            if (t > 0) { t--; continue; }
            // t == 0 empty: climb up from original tier
            uint256 u = tier + 1;
            while (u <= T_LEGENDARY && _pool[u].length == 0) u++;
            if (u > T_LEGENDARY) revert SoldOut();
            t = u; break;
        }

        uint16[] storage pool = _pool[t];
        uint256 idx = (rnd >> 16) % pool.length;
        id = pool[idx];
        pool[idx] = pool[pool.length - 1];
        pool.pop();

        _forward();
        _safeMint(msg.sender, id);
        emit Minted(msg.sender, id, true, msg.value);
    }

    // ── internals ─────────────────────────────────────────────────
    function _forward() internal {
        (bool ok, ) = TREASURY.call{value: msg.value}("");
        if (!ok) revert ForwardFailed();
    }

    function _removeFromPool(uint256 tier, uint16 id) internal {
        uint16[] storage pool = _pool[tier];
        uint256 n = pool.length;
        for (uint256 i = 0; i < n; i++) {
            if (pool[i] == id) {
                pool[i] = pool[n - 1];
                pool.pop();
                return;
            }
        }
        revert AlreadyMinted();
    }

    function _ownerOfSafe(uint256 id) internal view returns (address) {
        return _ownerOf(id);
    }

    // ── metadata / admin ──────────────────────────────────────────
    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    /// e.g. "https://monshi-fafo.vercel.app/public/fireworks-nft/meta/"
    /// tokenURI(id) = base + id + ".json" via override below.
    function setBaseURI(string calldata b) external onlyOwner {
        _base = b;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string(abi.encodePacked(_base, _toString(id), ".json"));
    }

    function setSaleWindow(uint64 start, uint64 end) external onlyOwner {
        require(end > start, "bad window");
        saleStart = start;
        saleEnd = end;
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t2 = v;
        while (t2 != 0) { d++; t2 /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }

    function supportsInterface(bytes4 iid) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(iid);
    }
}
