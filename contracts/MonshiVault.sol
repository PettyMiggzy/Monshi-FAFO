// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MonshiVault
 * @notice Personal privacy vault deployed via the MonshiVaultFactory.
 *         Holds tokens (ERC-20 + native MON) for ONE owner only.
 *         Only the owner can deposit/withdraw. No admin, no upgrade, no fees.
 *
 * Privacy model:
 *  - Each user gets a UNIQUE contract deployed at their request.
 *  - Their tokens live in this contract address, not their wallet.
 *  - Wallet bag-checks (top holders, bubble maps) see the vault as a
 *    contract holder, not the underlying user.
 *  - This is privacy from CASUAL inspection, not anonymity. Forensic
 *    analysis can still trace ownership via the deploy tx.
 *
 * Owner is set immutably at deploy time by the factory.
 *
 * Custom errors used for gas savings.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MonshiVault {
    address public immutable owner;
    address public immutable factory;
    uint256 public immutable createdAt;

    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event NativeDeposited(uint256 amount);
    event NativeWithdrawn(uint256 amount);

    error NotOwner();
    error TransferFailed();
    error ZeroAmount();
    error InsufficientBalance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        factory = msg.sender;
        createdAt = block.timestamp;
    }

    /// @notice Deposit ERC-20 tokens into the vault.
    /// User must approve this contract for `amount` first.
    function deposit(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        bool ok = IERC20(token).transferFrom(owner, address(this), amount);
        if (!ok) revert TransferFailed();
        emit Deposited(token, amount);
    }

    /// @notice Withdraw ERC-20 tokens to the owner wallet.
    function withdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (IERC20(token).balanceOf(address(this)) < amount) revert InsufficientBalance();
        bool ok = IERC20(token).transfer(owner, amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(token, amount);
    }

    /// @notice Deposit native MON (just send it via this function, msg.value goes to vault)
    function depositNative() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();
        emit NativeDeposited(msg.value);
    }

    /// @notice Withdraw native MON to the owner wallet.
    function withdrawNative(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit NativeWithdrawn(amount);
    }

    /// @notice Read-helper: get vault's balance of a token.
    function balanceOf(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @notice Read-helper: get vault's native MON balance.
    function nativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Allow native MON to be sent to the vault directly.
    /// Anyone can send (it goes to owner anyway), but only owner can withdraw.
    receive() external payable {
        emit NativeDeposited(msg.value);
    }
}
