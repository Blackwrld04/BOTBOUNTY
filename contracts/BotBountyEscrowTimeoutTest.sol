// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BotBountyEscrow.sol";

/**
 * @title BotBountyEscrowTimeoutTest
 * @notice Testnet helper contract deploying identical escrow logic with configurable test review periods
 *         to demonstrate real-time on-chain timeout claims on Bohr Testnet without waiting 24 hours.
 */
contract BotBountyEscrowTimeoutTest is BotBountyEscrow {
    function createFastBounty(
        bytes32 bountyId,
        uint256 deadline,
        uint256 reviewPeriod,
        string calldata issueUrl
    ) external payable nonReentrant {
        require(msg.value > 0, "Reward must be > 0");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bounties[bountyId].createdAt == 0, "Bounty already exists");

        bounties[bountyId] = Bounty({
            bountyId: bountyId,
            maintainer: msg.sender,
            solver: address(0),
            settlementToken: address(0),
            amount: msg.value,
            createdAt: block.timestamp,
            deadline: deadline,
            submittedAt: 0,
            reviewPeriod: reviewPeriod,
            status: BountyStatus.Open,
            issueUrl: issueUrl,
            prUrl: "",
            solutionCommitment: bytes32(0)
        });

        allBountyIds.push(bountyId);

        emit BountyCreated(
            bountyId,
            msg.sender,
            address(0),
            msg.value,
            issueUrl,
            deadline,
            reviewPeriod
        );
    }
}
