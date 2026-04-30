// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MonshiMultisender
 * @notice Gas-efficient batch ERC20 + native token sender.
 *         Holds zero funds — all transfers forward in one tx.
 *
 * Usage:
 *   1. Approve this contract for total amount on the ERC20 token.
 *   2. Call sendERC20() with recipients[] and amounts[] — same length.
 *   3. Or sendERC20Equal() with recipients[] and a single amount per wallet.
 *
 * Native MON sends use sendNative() / sendNativeEqual(). msg.value must
 * equal sum of amounts.
 *
 * No owner. No upgrade. No fees. No custody. Pure stateless utility.
 *
 * Audit notes (when commissioning):
 *  - Reentrancy: ERC20 transfers use SafeERC20-pattern; native uses .call.
 *    No external state mutation between calls beyond the transfers themselves.
 *  - DoS: caller-supplied arrays — gas grows linearly with recipients.
 *    Frontend should batch >500 recipients into multiple txs.
 *  - Approval: contract is approval-target; users approve only the
 *    amount they want sent.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MonshiMultisender {
    event BatchSent(address indexed sender, address indexed token, uint256 totalAmount, uint256 recipientCount);
    event NativeBatchSent(address indexed sender, uint256 totalAmount, uint256 recipientCount);

    error LengthMismatch();
    error NoRecipients();
    error TransferFailed();
    error InsufficientNativeValue();
    error ExcessNativeValue();
    error NativeRefundFailed();
    error ZeroAmount();

    /// @notice Send custom amounts of an ERC20 to many recipients in one tx.
    /// @param token       ERC20 contract
    /// @param recipients  destination addresses (length N)
    /// @param amounts     amount each recipient receives (length N, same order)
    /// Caller must have pre-approved this contract for at least sum(amounts).
    function sendERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        uint256 n = recipients.length;
        if (n == 0) revert NoRecipients();
        if (n != amounts.length) revert LengthMismatch();

        uint256 total;
        unchecked {
            for (uint256 i = 0; i < n; ++i) {
                total += amounts[i];
            }
        }
        if (total == 0) revert ZeroAmount();

        IERC20 t = IERC20(token);
        for (uint256 i = 0; i < n; ) {
            if (!t.transferFrom(msg.sender, recipients[i], amounts[i])) {
                revert TransferFailed();
            }
            unchecked { ++i; }
        }

        emit BatchSent(msg.sender, token, total, n);
    }

    /// @notice Send the SAME amount of an ERC20 to many recipients (cheaper than sendERC20).
    function sendERC20Equal(
        address token,
        address[] calldata recipients,
        uint256 amountEach
    ) external {
        uint256 n = recipients.length;
        if (n == 0) revert NoRecipients();
        if (amountEach == 0) revert ZeroAmount();

        IERC20 t = IERC20(token);
        for (uint256 i = 0; i < n; ) {
            if (!t.transferFrom(msg.sender, recipients[i], amountEach)) {
                revert TransferFailed();
            }
            unchecked { ++i; }
        }

        emit BatchSent(msg.sender, token, amountEach * n, n);
    }

    /// @notice Send custom amounts of native MON to many recipients.
    /// msg.value must equal sum(amounts). Excess is refunded.
    function sendNative(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable {
        uint256 n = recipients.length;
        if (n == 0) revert NoRecipients();
        if (n != amounts.length) revert LengthMismatch();

        uint256 total;
        unchecked {
            for (uint256 i = 0; i < n; ++i) {
                total += amounts[i];
            }
        }
        if (total == 0) revert ZeroAmount();
        if (msg.value < total) revert InsufficientNativeValue();

        for (uint256 i = 0; i < n; ) {
            (bool ok, ) = recipients[i].call{value: amounts[i]}("");
            if (!ok) revert TransferFailed();
            unchecked { ++i; }
        }

        // Refund any overpayment
        uint256 refund = msg.value - total;
        if (refund > 0) {
            (bool ok, ) = msg.sender.call{value: refund}("");
            if (!ok) revert NativeRefundFailed();
        }

        emit NativeBatchSent(msg.sender, total, n);
    }

    /// @notice Send the SAME amount of native MON to many recipients.
    /// msg.value must equal amountEach * recipients.length. Excess refunded.
    function sendNativeEqual(
        address[] calldata recipients,
        uint256 amountEach
    ) external payable {
        uint256 n = recipients.length;
        if (n == 0) revert NoRecipients();
        if (amountEach == 0) revert ZeroAmount();

        uint256 total = amountEach * n;
        if (msg.value < total) revert InsufficientNativeValue();

        for (uint256 i = 0; i < n; ) {
            (bool ok, ) = recipients[i].call{value: amountEach}("");
            if (!ok) revert TransferFailed();
            unchecked { ++i; }
        }

        uint256 refund = msg.value - total;
        if (refund > 0) {
            (bool ok, ) = msg.sender.call{value: refund}("");
            if (!ok) revert NativeRefundFailed();
        }

        emit NativeBatchSent(msg.sender, total, n);
    }

    /// @notice Reject any plain native transfers (no funds custody).
    receive() external payable {
        revert("Use send functions");
    }
}
