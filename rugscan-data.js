// Rug Scanner — glossary + contract snippet data
window.RUGSCAN = window.RUGSCAN || {};

// ────────────────────────────────────────────────────────────────────
// GLOSSARY (40+ terms, plain English, mobile-readable)
// cat: redflag | function | data | security | token
// sev: '🚩🚩🚩' = rug | '🚩🚩' = sus | '🚩' = watch | '⚠️' = depends | '✅' = safe
// ────────────────────────────────────────────────────────────────────
window.RUGSCAN.GLOSSARY = {
  // 🚨 RED FLAGS
  mint: {term:'mint', cat:'redflag', short:'Prints new tokens out of thin air.', why:'If this exists and isn\'t locked, dev can dump infinite supply on you. Price → 0.', looks:'function mint(address to, uint amount) public onlyOwner', sev:'🚩🚩🚩'},
  blacklist: {term:'blacklist', cat:'redflag', short:'Owner can ban wallets from selling.', why:'You buy, then they flip you to blacklisted, and you can\'t sell. Honeypot tactic.', looks:'mapping(address => bool) public _blacklist', sev:'🚩🚩🚩'},
  setFee: {term:'setFee', cat:'redflag', short:'Owner can change tax/fee at any time.', why:'They set fee to 99% right before you sell. You get rugged in slow motion.', looks:'function setFee(uint256 newFee) external onlyOwner', sev:'🚩🚩🚩'},
  setMaxTx: {term:'setMaxTx', cat:'redflag', short:'Owner can limit max transaction size.', why:'They set max transfer to 0 → nobody can sell, only they can dump.', looks:'function setMaxTxAmount(uint256 amount) external onlyOwner', sev:'🚩🚩🚩'},
  excludeFromFees: {term:'excludeFromFees', cat:'redflag', short:'Owner can give wallets tax-free passes.', why:'They exclude themselves and dump with no tax while you pay 10%.', looks:'function excludeFromFees(address account, bool excluded)', sev:'🚩🚩'},
  pause: {term:'pause', cat:'redflag', short:'Owner can freeze ALL transfers.', why:'Trading stops the moment they want it to. You can\'t exit.', looks:'function pause() external onlyOwner', sev:'🚩🚩🚩'},
  upgradeable: {term:'upgradeable', cat:'redflag', short:'Contract logic can be replaced later.', why:'Looks safe today, swaps to malicious code tomorrow. Common with proxies.', looks:'function upgradeTo(address newImplementation)', sev:'🚩🚩🚩'},
  hiddenTax: {term:'hiddenTax', cat:'redflag', short:'Tax logic buried in transfer functions.', why:'Says "0% tax" in marketing, takes 25% in code. Always read _transfer.', looks:'amount = amount - (amount * 25 / 100);', sev:'🚩🚩🚩'},
  ownerSells: {term:'ownerSells', cat:'redflag', short:'Function only owner can call to sell.', why:'They can dump treasury anytime. Watch for restricted sell methods.', looks:'function withdrawTokens() external onlyOwner', sev:'🚩🚩'},
  honeypot: {term:'honeypot', cat:'redflag', short:'You can buy but can\'t sell.', why:'Transfer logic blocks sells silently. Money in, money never out.', looks:'require(from == owner, "Cannot sell");', sev:'🚩🚩🚩'},

  // ⚙️ FUNCTIONS — what these mean
  function: {term:'function', cat:'function', short:'A piece of code that runs when called.', why:'Like a button. Read what each one does — that\'s the whole contract.', looks:'function transfer(address to, uint256 amount)', sev:'⚪'},
  modifier: {term:'modifier', cat:'function', short:'A rule attached to a function.', why:'"onlyOwner" means only owner can run it. Modifiers gate access.', looks:'modifier onlyOwner() { require(msg.sender == owner); _; }', sev:'⚪'},
  constructor: {term:'constructor', cat:'function', short:'Runs ONCE when contract is deployed.', why:'Sets initial state — supply, owner, etc. Can\'t be re-run.', looks:'constructor() { totalSupply = 1000000; }', sev:'⚪'},
  view: {term:'view', cat:'function', short:'Reads data, doesn\'t change anything. Free to call.', why:'Safe — view functions can\'t move money or modify state.', looks:'function balanceOf(address) public view returns (uint)', sev:'✅'},
  payable: {term:'payable', cat:'function', short:'Function can receive ETH/native token.', why:'Means money can flow IN. Look at what happens to it after.', looks:'function buy() external payable', sev:'⚠️'},
  external: {term:'external', cat:'function', short:'Function callable from outside the contract.', why:'Public-facing. Anyone can call it (unless modifier blocks them).', looks:'function transfer(address to, uint amount) external', sev:'⚪'},
  internal: {term:'internal', cat:'function', short:'Only callable from inside the contract.', why:'Helper logic. Can\'t be called directly by users.', looks:'function _transfer(address from, address to)', sev:'⚪'},

  // 📦 DATA TYPES
  array: {term:'array', cat:'data', short:'A list of things, like a Pokémon team.', why:'Multiple slots holding values. Often used for blacklists, holders, tiers.', looks:'address[] public holders;', sev:'⚪'},
  mapping: {term:'mapping', cat:'data', short:'A lookup table — give it a key, get a value.', why:'Like a dictionary. Most balances/blacklists use this.', looks:'mapping(address => uint256) public balances;', sev:'⚪'},
  struct: {term:'struct', cat:'data', short:'A grouped bundle of related data.', why:'Like a row in a spreadsheet — name, age, score together.', looks:'struct Holder { address wallet; uint amount; }', sev:'⚪'},
  uint: {term:'uint', cat:'data', short:'A whole number that can\'t be negative.', why:'Used for amounts, balances, IDs. uint256 is the default size.', looks:'uint256 public totalSupply;', sev:'⚪'},
  address: {term:'address', cat:'data', short:'A wallet or contract address (0x...).', why:'Where money goes / comes from. Always check WHICH address.', looks:'address public owner;', sev:'⚪'},
  bool: {term:'bool', cat:'data', short:'True or false. Yes or no.', why:'On/off switches. "isPaused", "isBlacklisted", "tradingEnabled".', looks:'bool public tradingEnabled = false;', sev:'⚪'},

  // 🔐 SECURITY
  onlyOwner: {term:'onlyOwner', cat:'security', short:'This function can ONLY be run by contract creator.', why:'Not always bad. Pay attention to WHAT they can do alone.', looks:'function setFee(uint x) external onlyOwner', sev:'⚠️'},
  require: {term:'require', cat:'security', short:'Stops execution if a condition fails.', why:'Safety guard. "require(amount > 0)" rejects zero transfers.', looks:'require(balance >= amount, "Not enough balance");', sev:'✅'},
  revert: {term:'revert', cat:'security', short:'Aborts the transaction, undoes everything.', why:'Used to cancel bad operations. Money goes back to sender.', looks:'if (paused) revert("Trading paused");', sev:'✅'},
  reentrancy: {term:'reentrancy', cat:'security', short:'A hack where a contract calls itself before finishing.', why:'Famous DAO hack. Modern contracts use ReentrancyGuard to block it.', looks:'modifier nonReentrant { ... }', sev:'⚠️'},
  renounceOwnership: {term:'renounceOwnership', cat:'security', short:'Owner gives up admin keys forever.', why:'After this is called, NOBODY can change settings. Often a green flag.', looks:'function renounceOwnership() public onlyOwner', sev:'✅'},
  multisig: {term:'multisig', cat:'security', short:'Wallet that needs multiple people to sign.', why:'No single person can rug. Safer than one-owner control.', looks:'address public multisig = 0x...;', sev:'✅'},
  timelock: {term:'timelock', cat:'security', short:'Owner changes don\'t take effect for X hours/days.', why:'Gives you time to exit if dev tries something shady.', looks:'require(block.timestamp >= unlockTime);', sev:'✅'},
  liquidityLock: {term:'liquidityLock', cat:'security', short:'LP tokens locked so dev can\'t pull liquidity.', why:'Without this, dev can drain the pool whenever they want. Always check.', looks:'lockedUntil[lpToken] = block.timestamp + 365 days;', sev:'✅'},

  // 💸 TOKEN BASICS
  ERC20: {term:'ERC20', cat:'token', short:'Standard token type (like $MONSHI, $RENE, $USDC).', why:'Has standard functions: transfer, balanceOf, approve. Predictable.', looks:'contract MyToken is ERC20', sev:'⚪'},
  ERC721: {term:'ERC721', cat:'token', short:'NFT standard — each token is unique.', why:'Different from ERC20 because each has its own ID and metadata.', looks:'contract MyNFT is ERC721', sev:'⚪'},
  totalSupply: {term:'totalSupply', cat:'token', short:'How many tokens exist in total.', why:'Compare to circulating supply. If owner holds 80%, that\'s sus.', looks:'uint256 public totalSupply = 1_000_000_000 ether;', sev:'⚪'},
  balanceOf: {term:'balanceOf', cat:'token', short:'How many tokens a wallet has.', why:'Read-only. Safe to call. Returns the number.', looks:'function balanceOf(address account) returns (uint256)', sev:'✅'},
  transfer: {term:'transfer', cat:'token', short:'Move tokens from your wallet to another.', why:'The basic function. Read its body — that\'s where rugs hide.', looks:'function transfer(address to, uint amount) returns (bool)', sev:'⚪'},
  approve: {term:'approve', cat:'token', short:'Lets another contract spend your tokens.', why:'Required for swaps. Only approve trusted contracts.', looks:'function approve(address spender, uint amount)', sev:'⚠️'},
  allowance: {term:'allowance', cat:'token', short:'How much a contract is allowed to spend.', why:'Check this — unlimited approvals are how you get drained.', looks:'function allowance(address owner, address spender)', sev:'⚠️'},
  decimals: {term:'decimals', cat:'token', short:'How many zeros after the dot. Usually 18.', why:'1 token = 10^18 wei. Affects how amounts are written in code.', looks:'function decimals() returns (uint8) { return 18; }', sev:'⚪'}
};

// ────────────────────────────────────────────────────────────────────
// CONTRACT SNIPPETS — the actual game content
// Each snippet: code, verdict, explanation, terms (which glossary entries to highlight)
// difficulty: 1 = obvious, 2 = subtle, 3 = real-world tricky
// ────────────────────────────────────────────────────────────────────
window.RUGSCAN.SNIPPETS = [
  // ─── DIFFICULTY 1 — OBVIOUS ───
  {
    id: 1, difficulty: 1, verdict: 'RUG',
    code: `function mint(address to, uint256 amount) public onlyOwner {\n    _balances[to] += amount;\n    totalSupply += amount;\n    emit Transfer(address(0), to, amount);\n}`,
    explain: 'A public mint function the owner can call. They can print unlimited tokens whenever they want and dump on you. This is the #1 rug pattern.',
    terms: ['mint', 'onlyOwner', 'totalSupply']
  },
  {
    id: 2, difficulty: 1, verdict: 'RUG',
    code: `mapping(address => bool) public _blacklist;\n\nfunction _transfer(address from, address to, uint256 amount) internal {\n    require(!_blacklist[from], "Blacklisted");\n    _balances[from] -= amount;\n    _balances[to] += amount;\n}`,
    explain: 'Blacklist mapping that blocks transfers. Owner adds your wallet to it after you buy → you can never sell. Classic honeypot.',
    terms: ['mapping', 'blacklist', 'require', 'transfer']
  },
  {
    id: 3, difficulty: 1, verdict: 'SAFE',
    code: `function balanceOf(address account) public view returns (uint256) {\n    return _balances[account];\n}`,
    explain: 'Standard ERC20 read function. "view" means it can\'t change anything — just returns a number. 100% safe.',
    terms: ['balanceOf', 'view', 'address', 'uint']
  },
  {
    id: 4, difficulty: 1, verdict: 'RUG',
    code: `function setFee(uint256 _newFee) external onlyOwner {\n    fee = _newFee;\n}`,
    explain: 'No upper limit on the fee. Owner can set it to 99% right before you try to sell. Slow-motion rug.',
    terms: ['setFee', 'onlyOwner', 'external', 'uint']
  },
  {
    id: 5, difficulty: 1, verdict: 'SAFE',
    code: `function renounceOwnership() public virtual onlyOwner {\n    address oldOwner = _owner;\n    _owner = address(0);\n    emit OwnershipTransferred(oldOwner, address(0));\n}`,
    explain: 'Owner gives up control forever. After this runs, no one can change contract settings. Green flag if actually called.',
    terms: ['renounceOwnership', 'onlyOwner', 'address']
  },
  {
    id: 6, difficulty: 1, verdict: 'RUG',
    code: `function pause() external onlyOwner {\n    _paused = true;\n}\n\nfunction _transfer(address from, address to, uint256 amount) internal {\n    require(!_paused, "Paused");\n    // ...\n}`,
    explain: 'Pause function freezes ALL transfers. Owner pauses → market dies → only they can unpause and dump first.',
    terms: ['pause', 'onlyOwner', 'require', 'transfer', 'bool']
  },

  // ─── DIFFICULTY 2 — SUBTLE ───
  {
    id: 7, difficulty: 2, verdict: 'RUG',
    code: `function _transfer(address from, address to, uint256 amount) internal {\n    uint256 taxAmount = amount * 25 / 100;\n    _balances[from] -= amount;\n    _balances[to] += amount - taxAmount;\n    _balances[owner] += taxAmount;\n}`,
    explain: 'Hidden 25% tax buried in transfer function — going straight to owner. Marketing might say "0% tax". Always read _transfer.',
    terms: ['transfer', 'internal', 'hiddenTax', 'uint']
  },
  {
    id: 8, difficulty: 2, verdict: 'RUG',
    code: `function excludeFromFees(address account, bool excluded) external onlyOwner {\n    _isExcludedFromFees[account] = excluded;\n}`,
    explain: 'Owner can mark themselves (or buddies) as fee-exempt. They sell with 0% tax while you pay 10%. Unfair tilt.',
    terms: ['excludeFromFees', 'onlyOwner', 'external', 'address', 'bool']
  },
  {
    id: 9, difficulty: 2, verdict: 'RUG',
    code: `function setMaxTxAmount(uint256 amount) external onlyOwner {\n    maxTxAmount = amount;\n}`,
    explain: 'Owner sets max transfer to 1 wei → no one can sell. Only they can move tokens. Soft rug via sell limit.',
    terms: ['setMaxTx', 'onlyOwner', 'uint', 'external']
  },
  {
    id: 10, difficulty: 2, verdict: 'SAFE',
    code: `function approve(address spender, uint256 amount) public returns (bool) {\n    require(spender != address(0), "Approve to zero");\n    _allowances[msg.sender][spender] = amount;\n    emit Approval(msg.sender, spender, amount);\n    return true;\n}`,
    explain: 'Standard ERC20 approve. Lets a DEX spend your tokens for swaps. Has a safety check (no zero address). This one is fine.',
    terms: ['approve', 'address', 'require', 'allowance', 'uint']
  },
  {
    id: 11, difficulty: 2, verdict: 'RUG',
    code: `function _transfer(address from, address to, uint256 amount) internal {\n    if (to == uniswapPair) {\n        require(from == owner(), "Sells disabled");\n    }\n    _balances[from] -= amount;\n    _balances[to] += amount;\n}`,
    explain: 'Honeypot. If you try to sell (to == DEX pair), it blocks unless you\'re the owner. You can buy but never exit.',
    terms: ['honeypot', 'transfer', 'require', 'onlyOwner', 'address']
  },
  {
    id: 12, difficulty: 2, verdict: 'SAFE',
    code: `modifier nonReentrant() {\n    require(_status != _ENTERED, "Reentrant call");\n    _status = _ENTERED;\n    _;\n    _status = _NOT_ENTERED;\n}`,
    explain: 'Reentrancy guard. Blocks the famous DAO-style attack where a contract calls itself before the previous call finishes. Smart pattern.',
    terms: ['modifier', 'reentrancy', 'require', 'security']
  },
  {
    id: 13, difficulty: 2, verdict: 'RUG',
    code: `function setRouter(address newRouter) external onlyOwner {\n    uniswapV2Router = IUniswapV2Router02(newRouter);\n}`,
    explain: 'Owner can swap the DEX router to a malicious contract. New router could redirect all swaps to drain wallets. Very sus.',
    terms: ['onlyOwner', 'address', 'external']
  },
  {
    id: 14, difficulty: 2, verdict: 'SAFE',
    code: `constructor() ERC20("MyToken", "MTK") {\n    _mint(msg.sender, 1_000_000 * 10**18);\n    transferOwnership(address(0));\n}`,
    explain: 'Constructor mints fixed supply ONCE and immediately renounces ownership. No further minting possible, no admin keys. Clean.',
    terms: ['constructor', 'ERC20', 'mint', 'renounceOwnership', 'totalSupply']
  },
  {
    id: 15, difficulty: 2, verdict: 'RUG',
    code: `function withdrawTokens(address token) external onlyOwner {\n    uint256 balance = IERC20(token).balanceOf(address(this));\n    IERC20(token).transfer(owner(), balance);\n}`,
    explain: 'Owner can drain ANY token sitting in the contract — including LP tokens, treasury, anything held. Backdoor for theft.',
    terms: ['ownerSells', 'onlyOwner', 'transfer', 'balanceOf']
  },

  // ─── DIFFICULTY 3 — TRICKY ───
  {
    id: 16, difficulty: 3, verdict: 'RUG',
    code: `function upgradeTo(address newImplementation) external onlyOwner {\n    _setImplementation(newImplementation);\n}`,
    explain: 'Upgradeable proxy contract. The code you\'re reading today can be REPLACED tomorrow with anything. Audit means nothing.',
    terms: ['upgradeable', 'onlyOwner', 'address', 'external']
  },
  {
    id: 17, difficulty: 3, verdict: 'SAFE',
    code: `function transferOwnership(address newOwner) public onlyOwner {\n    require(newOwner != address(0));\n    require(timelock[newOwner] + 2 days < block.timestamp);\n    _owner = newOwner;\n}`,
    explain: 'Ownership transfer has a 2-day timelock. Gives holders time to react if a transfer is suspicious. Defensive, well-designed.',
    terms: ['onlyOwner', 'timelock', 'address', 'require']
  },
  {
    id: 18, difficulty: 3, verdict: 'RUG',
    code: `function _transfer(address from, address to, uint256 amount) internal {\n    if (block.number <= launchBlock + 2) {\n        _isBot[to] = true;\n    }\n    require(!_isBot[from], "Bot");\n    super._transfer(from, to, amount);\n}`,
    explain: 'Anti-bot logic that auto-blacklists ANYONE who buys in the first 2 blocks. Sounds reasonable but devs use this to mass-trap real buyers at launch.',
    terms: ['transfer', 'blacklist', 'require', 'internal']
  },
  {
    id: 19, difficulty: 3, verdict: 'SAFE',
    code: `function lockLiquidity(uint256 unlockTime) external onlyOwner {\n    require(unlockTime >= block.timestamp + 180 days);\n    lpUnlock = unlockTime;\n}\n\nfunction withdrawLP() external {\n    require(block.timestamp >= lpUnlock);\n    // withdraw\n}`,
    explain: 'LP locked for at least 180 days, can\'t be withdrawn until unlock time. Owner can\'t rug-pull liquidity early. Solid.',
    terms: ['liquidityLock', 'onlyOwner', 'require', 'timelock']
  },
  {
    id: 20, difficulty: 3, verdict: 'RUG',
    code: `function _transfer(address from, address to, uint256 amount) internal override {\n    if (from == uniswapPair) {\n        // buy: 5% tax\n        super._transfer(from, address(this), amount * 5 / 100);\n        super._transfer(from, to, amount * 95 / 100);\n    } else if (to == uniswapPair) {\n        // sell: 49% tax\n        super._transfer(from, address(this), amount * 49 / 100);\n        super._transfer(from, to, amount * 51 / 100);\n    }\n}`,
    explain: 'Asymmetric tax — 5% to buy, 49% to sell. Marketing says "5% tax" and shows the buy. The sell tax is 10x worse and they hope you don\'t notice.',
    terms: ['transfer', 'hiddenTax', 'internal']
  },
  {
    id: 21, difficulty: 3, verdict: 'SAFE',
    code: `mapping(address => uint256) public lockedUntil;\n\nfunction transfer(address to, uint256 amount) public override returns (bool) {\n    require(block.timestamp >= lockedUntil[msg.sender], "Vesting");\n    return super.transfer(to, amount);\n}`,
    explain: 'Vesting lock — team/investor wallets are time-locked from selling. Forces dev/VCs to hold long-term. Pro-holder design.',
    terms: ['mapping', 'transfer', 'require', 'timelock', 'address']
  },
  {
    id: 22, difficulty: 3, verdict: 'RUG',
    code: `function airdrop(address[] calldata recipients, uint256 amount) external onlyOwner {\n    for (uint i = 0; i < recipients.length; i++) {\n        _balances[recipients[i]] += amount;\n        totalSupply += amount;\n    }\n}`,
    explain: 'Airdrop function INCREASES totalSupply. It\'s a hidden mint disguised as a marketing tool. Dev "airdrops" billions to themselves.',
    terms: ['mint', 'array', 'onlyOwner', 'totalSupply', 'external']
  },
  {
    id: 23, difficulty: 3, verdict: 'SAFE',
    code: `function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {\n    super._beforeTokenTransfer(from, to, amount);\n    require(amount > 0, "Zero transfer");\n}`,
    explain: 'Hook that runs before every transfer. Just adds a safety check rejecting zero-amount transfers. Defensive, no rug here.',
    terms: ['transfer', 'internal', 'require', 'modifier']
  },
  {
    id: 24, difficulty: 3, verdict: 'RUG',
    code: `function executeArbitrary(address target, bytes calldata data) external onlyOwner {\n    (bool success, ) = target.call(data);\n    require(success);\n}`,
    explain: 'Owner can call ANY function on ANY contract from this contract\'s address. They can drain LP, transfer treasury, anything. Total backdoor.',
    terms: ['ownerSells', 'onlyOwner', 'address', 'require', 'external']
  },
  {
    id: 25, difficulty: 3, verdict: 'SAFE',
    code: `function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {\n    require(block.timestamp <= deadline, "Expired");\n    // EIP-2612 signature verification\n}`,
    explain: 'EIP-2612 permit — lets users approve token spending via signature instead of a tx. Standard, gas-saving, no rug pattern.',
    terms: ['approve', 'address', 'require', 'external', 'uint']
  },
  {
    id: 26, difficulty: 3, verdict: 'RUG',
    code: `function setMaxWallet(uint256 amount) external onlyOwner {\n    maxWalletAmount = amount;\n}\n\nfunction _transfer(address from, address to, uint256 amount) internal {\n    require(_balances[to] + amount <= maxWalletAmount, "Max wallet");\n    // ...\n}`,
    explain: 'Owner can set max wallet to 1 token, freezing everyone\'s ability to receive transfers. Combined with their fee-exemption, only they can move tokens.',
    terms: ['setMaxTx', 'onlyOwner', 'transfer', 'require', 'mapping']
  },
  {
    id: 27, difficulty: 3, verdict: 'SAFE',
    code: `// Multisig owner (3-of-5 required)\naddress public constant MULTISIG = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;\n\nmodifier onlyOwner() {\n    require(msg.sender == MULTISIG, "Not multisig");\n    _;\n}`,
    explain: 'Owner is a multisig (multiple people must sign). No single person can rug. Way safer than a single EOA owner.',
    terms: ['multisig', 'address', 'modifier', 'onlyOwner', 'require']
  },
  {
    id: 28, difficulty: 3, verdict: 'RUG',
    code: `function setSwapPair(address pair) external onlyOwner {\n    swapPair = pair;\n    _isExcludedFromFees[pair] = false;\n}\n\nfunction _transfer(address from, address to, uint256 amount) internal {\n    if (from == swapPair) require(_canBuy[to], "Not allowed to buy");\n}`,
    explain: 'Whitelist-only buying. Owner picks who can buy. Most "fair launch" tokens with this hidden code only let the dev\'s alts in early.',
    terms: ['onlyOwner', 'address', 'transfer', 'require', 'mapping']
  },
  {
    id: 29, difficulty: 3, verdict: 'SAFE',
    code: `function transfer(address to, uint256 amount) public override returns (bool) {\n    require(to != address(0), "Zero address");\n    require(amount <= balanceOf(msg.sender), "Insufficient balance");\n    _transfer(msg.sender, to, amount);\n    return true;\n}`,
    explain: 'Plain ERC20 transfer with two safety checks (no zero address, must have balance). Boring is good. No fees, no traps.',
    terms: ['transfer', 'address', 'require', 'balanceOf', 'ERC20']
  },
  {
    id: 30, difficulty: 3, verdict: 'RUG',
    code: `function snapshot() external onlyOwner returns (uint256) {\n    _snapshotId++;\n    for (uint i = 0; i < holders.length; i++) {\n        if (_balances[holders[i]] > maxAllowed) {\n            _balances[holders[i]] = maxAllowed;\n        }\n    }\n}`,
    explain: 'Owner-callable function that CONFISCATES tokens above a "max allowed" amount. Whales (you) get cut down to size. Disguised as a "snapshot".',
    terms: ['onlyOwner', 'array', 'mapping', 'external']
  }
];

// Helper: get glossary entry, or return a default if missing
window.RUGSCAN.lookup = function(term){
  return window.RUGSCAN.GLOSSARY[term] || null;
};

// Helper: render code with tappable highlighted terms
// Returns HTML string with <span class="rs-term" data-term="X">X</span> wrappers
window.RUGSCAN.highlightCode = function(code, terms){
  var html = code
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  // Sort by length DESC so longer terms (e.g. "renounceOwnership") match before shorter
  var sortedTerms = (terms||[]).slice().sort(function(a,b){return b.length-a.length;});
  sortedTerms.forEach(function(t){
    var entry = window.RUGSCAN.GLOSSARY[t];
    if(!entry)return;
    // Word boundary regex (case-sensitive — Solidity is)
    var re = new RegExp('\\b('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b', 'g');
    html = html.replace(re, '<span class="rs-term" data-term="'+t+'">$1</span>');
  });
  return html;
};
