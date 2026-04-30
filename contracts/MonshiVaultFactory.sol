// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MonshiVault.sol";

/**
 * @title MonshiVaultFactory
 * @notice Deploys unique MonshiVault contracts for each user.
 *         Each user gets ONE vault, owned only by them. No fees, no admin.
 *
 * Tier gating is enforced at the FRONTEND level via $MONSHI balance check.
 * The factory itself is open — anyone can call createMyVault() since the
 * cost is gas only and no funds are held by the factory.
 *
 * Why frontend gating instead of on-chain:
 *  - $MONSHI balance check on-chain costs gas + adds an external call
 *  - Frontend gating is gentler and can adjust thresholds without
 *    redeploying the contract
 *  - If someone bypasses the frontend, they just deploy a vault that
 *    looks legit — same behavior, no harm done
 */

contract MonshiVaultFactory {
    /// @notice Each user can have ONE vault. Mapping of owner -> vault address.
    mapping(address => address) public userVault;

    /// @notice List of all vaults ever created (for stats / discovery).
    address[] public allVaults;

    event VaultCreated(address indexed owner, address indexed vault, uint256 totalVaultsAtCreation);

    error VaultAlreadyExists();

    /// @notice Deploy a new MonshiVault owned by msg.sender.
    /// @return vault The address of the newly deployed vault contract.
    function createMyVault() external returns (address vault) {
        if (userVault[msg.sender] != address(0)) revert VaultAlreadyExists();

        vault = address(new MonshiVault(msg.sender));
        userVault[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, allVaults.length);
    }

    /// @notice Get the count of vaults created.
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Read-helper: does this user already have a vault?
    function hasVault(address user) external view returns (bool) {
        return userVault[user] != address(0);
    }

    /// @notice Get a user's vault address (returns 0x0 if none).
    function getVault(address user) external view returns (address) {
        return userVault[user];
    }
}
