// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../BotBountyEscrow.sol";

interface Vm {
    function warp(uint256 newTimestamp) external;
    function deal(address who, uint256 newBalance) external;
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function expectRevert(bytes calldata revertData) external;
}

contract MockUSDT is IERC20 {
    string public name = "Tether USD";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "USDT: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "USDT: insufficient balance");
        if (allowance[from][msg.sender] != type(uint256).max) {
            require(allowance[from][msg.sender] >= amount, "USDT: insufficient allowance");
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockFeeOnTransferToken is IERC20 {
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "FOT: insufficient balance");
        balanceOf[msg.sender] -= amount;
        uint256 fee = (amount * 5) / 100; // 5% fee
        balanceOf[to] += (amount - fee);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "FOT: insufficient balance");
        if (allowance[from][msg.sender] != type(uint256).max) {
            require(allowance[from][msg.sender] >= amount, "FOT: insufficient allowance");
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        uint256 fee = (amount * 5) / 100;
        balanceOf[to] += (amount - fee);
        return true;
    }
}

contract BotBountyEscrowTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    BotBountyEscrow public escrow;
    MockUSDT public usdt;
    MockFeeOnTransferToken public fotToken;

    address public maintainer = address(0x1111);
    address public solver1 = address(0x2222);
    address public solver2 = address(0x3333);
    address public attacker = address(0x9999);

    receive() external payable {}

    function setUp() public {
        escrow = new BotBountyEscrow();
        usdt = new MockUSDT();
        fotToken = new MockFeeOnTransferToken();

        vm.deal(maintainer, 100 ether);
        vm.deal(solver1, 10 ether);
        vm.deal(solver2, 10 ether);

        usdt.mint(maintainer, 50_000 * 1e6); // 50,000 USDT
        fotToken.mint(maintainer, 50_000 * 1e6);
    }

    function testNativeBotBountyFlow() public {
        bytes32 bountyId = keccak256("native-bounty-1");
        uint256 amount = 5 ether;
        uint256 deadline = block.timestamp + 10 days;
        uint256 reviewPeriod = 3 days;

        // 1. Maintainer creates bounty with native BOT
        vm.prank(maintainer);
        escrow.createBounty{value: amount}(
            bountyId,
            address(0),
            amount,
            deadline,
            reviewPeriod,
            "https://github.com/botchain/bounties/issues/1"
        );

        assertEq(address(escrow).balance, amount);
        BotBountyEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(b.maintainer, maintainer);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Open));
        assertEq(b.amount, amount);
        assertEq(b.settlementToken, address(0));

        // 2. Solver1 submits solution
        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/1");

        b = escrow.getBounty(bountyId);
        assertEq(b.solver, solver1);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.InReview));
        assertEq(b.prUrl, "https://github.com/botchain/bounties/pull/1");

        // 3. Maintainer releases bounty
        uint256 solverBefore = solver1.balance;
        vm.prank(maintainer);
        escrow.releaseBounty(bountyId);

        assertEq(solver1.balance - solverBefore, amount);
        b = escrow.getBounty(bountyId);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Settled));
    }

    function testUSDTBountyFlowWithApproval() public {
        bytes32 bountyId = keccak256("usdt-bounty-1");
        uint256 amount = 1_500 * 1e6; // 1,500 USDT
        uint256 deadline = block.timestamp + 14 days;
        uint256 reviewPeriod = 5 days;

        vm.startPrank(maintainer);
        usdt.approve(address(escrow), amount);
        escrow.createBounty(
            bountyId,
            address(usdt),
            amount,
            deadline,
            reviewPeriod,
            "https://github.com/botchain/bounties/issues/2"
        );
        vm.stopPrank();

        assertEq(usdt.balanceOf(address(escrow)), amount);

        // Solver1 submits
        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/2");

        // Maintainer releases
        uint256 solverUsdtBefore = usdt.balanceOf(solver1);
        vm.prank(maintainer);
        escrow.releaseBounty(bountyId);

        assertEq(usdt.balanceOf(solver1) - solverUsdtBefore, amount);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function testRejectionFlowAndResubmission() public {
        bytes32 bountyId = keccak256("rejection-test-1");
        uint256 amount = 500 * 1e6;
        uint256 deadline = block.timestamp + 7 days;

        vm.startPrank(maintainer);
        usdt.approve(address(escrow), amount);
        escrow.createBounty(
            bountyId,
            address(usdt),
            amount,
            deadline,
            0, // uses DEFAULT_REVIEW_PERIOD (7 days)
            "https://github.com/botchain/bounties/issues/3"
        );
        vm.stopPrank();

        // Solver1 submits a substandard PR
        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/bad");

        // Maintainer rejects the PR
        vm.prank(maintainer);
        escrow.rejectSolution(bountyId, "Tests are failing and code does not meet spec");

        BotBountyEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Open));
        assertEq(b.solver, address(0));
        assertEq(b.prUrl, "");

        // Solver2 submits the correct PR
        vm.prank(solver2);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/good");

        // Maintainer approves
        vm.prank(maintainer);
        escrow.releaseBounty(bountyId);

        assertEq(usdt.balanceOf(solver2), amount);
    }

    function testReviewTimeoutClaim() public {
        bytes32 bountyId = keccak256("timeout-test-1");
        uint256 amount = 1_000 * 1e6;
        uint256 deadline = block.timestamp + 30 days;
        uint256 reviewPeriod = 3 days;

        vm.startPrank(maintainer);
        usdt.approve(address(escrow), amount);
        escrow.createBounty(
            bountyId,
            address(usdt),
            amount,
            deadline,
            reviewPeriod,
            "https://github.com/botchain/bounties/issues/4"
        );
        vm.stopPrank();

        // Solver1 submits
        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/valid");

        // Fast forward 2 days (less than reviewPeriod) -> should revert
        vm.warp(block.timestamp + 2 days);
        vm.prank(solver1);
        vm.expectRevert("Review period has not expired");
        escrow.claimTimeoutRelease(bountyId);

        // Fast forward another 2 days (4 days total > 3 days reviewPeriod)
        vm.warp(block.timestamp + 2 days);

        // Solver claims timeout release
        uint256 solverBefore = usdt.balanceOf(solver1);
        vm.prank(solver1);
        escrow.claimTimeoutRelease(bountyId);

        assertEq(usdt.balanceOf(solver1) - solverBefore, amount);
        BotBountyEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Settled));
    }

    function testMaintainerRefundAfterDeadline() public {
        bytes32 bountyId = keccak256("refund-test-1");
        uint256 amount = 2 ether;
        uint256 deadline = block.timestamp + 5 days;

        vm.prank(maintainer);
        escrow.createBounty{value: amount}(
            bountyId,
            address(0),
            amount,
            deadline,
            3 days,
            "https://github.com/botchain/bounties/issues/5"
        );

        // Before deadline -> should revert
        vm.prank(maintainer);
        vm.expectRevert("Deadline has not passed");
        escrow.refundBounty(bountyId);

        // Fast forward past deadline
        vm.warp(deadline + 1);

        uint256 balBefore = maintainer.balance;
        vm.prank(maintainer);
        escrow.refundBounty(bountyId);

        assertEq(maintainer.balance - balBefore, amount);
        BotBountyEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Refunded));
    }

    function testPaginationAndViewsWithoutGetLogs() public {
        bytes32 id1 = keccak256("p-1");
        bytes32 id2 = keccak256("p-2");
        bytes32 id3 = keccak256("p-3");

        vm.startPrank(maintainer);
        escrow.createBounty{value: 1 ether}(id1, address(0), 1 ether, block.timestamp + 5 days, 0, "url1");
        escrow.createBounty{value: 1 ether}(id2, address(0), 1 ether, block.timestamp + 5 days, 0, "url2");
        escrow.createBounty{value: 1 ether}(id3, address(0), 1 ether, block.timestamp + 5 days, 0, "url3");
        vm.stopPrank();

        assertEq(escrow.getBountyCount(), 3);

        (BotBountyEscrow.Bounty[] memory page1, uint256 total) = escrow.getBounties(0, 2);
        assertEq(total, 3);
        assertEq(page1.length, 2);
        assertEq(page1[0].bountyId, id1);
        assertEq(page1[1].bountyId, id2);

        (BotBountyEscrow.Bounty[] memory page2, ) = escrow.getBounties(2, 2);
        assertEq(page2.length, 1);
        assertEq(page2[0].bountyId, id3);

        bytes32[] memory mBounties = escrow.getMaintainerBounties(maintainer);
        assertEq(mBounties.length, 3);
    }

    function testCannotReleaseIfNotMaintainer() public {
        bytes32 bountyId = keccak256("security-1");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/100"
        );

        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/100");

        vm.prank(attacker);
        vm.expectRevert("Only maintainer can release");
        escrow.releaseBounty(bountyId);
    }

    function testCannotRejectIfNotMaintainer() public {
        bytes32 bountyId = keccak256("security-2");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/101"
        );

        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/101");

        vm.prank(attacker);
        vm.expectRevert("Only maintainer can reject");
        escrow.rejectSolution(bountyId, "spam");
    }

    function testCannotSubmitIfExpired() public {
        bytes32 bountyId = keccak256("security-3");
        uint256 deadline = block.timestamp + 1 days;
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            deadline,
            0,
            "https://github.com/botchain/bounties/issues/102"
        );

        vm.warp(deadline + 1);

        vm.prank(solver1);
        vm.expectRevert("Bounty expired");
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/102");
    }

    function testCannotSubmitIfNotOpen() public {
        bytes32 bountyId = keccak256("security-4");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/103"
        );

        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/103");

        // Now InReview, solver2 cannot hijack or overwrite
        vm.prank(solver2);
        vm.expectRevert("Bounty not open for submissions");
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/103-hacked");
    }

    function testRevertOnFeeOnTransferTokenActualAmountMismatch() public {
        bytes32 bountyId = keccak256("fot-revert-test");
        uint256 amount = 1_000 * 1e6;

        vm.startPrank(maintainer);
        fotToken.approve(address(escrow), amount);
        vm.expectRevert("Actual received amount mismatch");
        escrow.createBounty(
            bountyId,
            address(fotToken),
            amount,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/fot"
        );
        vm.stopPrank();
    }

    function testRevertOnInvalidTokenAddressNoCode() public {
        bytes32 bountyId = keccak256("no-code-token-test");
        uint256 amount = 500 * 1e6;

        vm.startPrank(maintainer);
        vm.expectRevert("Invalid token contract address");
        escrow.createBounty(
            bountyId,
            attacker, // EOA without contract code
            amount,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/bad-token"
        );
        vm.stopPrank();
    }

    function testRevertOnJunkOrEmptySubmission() public {
        bytes32 bountyId = keccak256("junk-sub-test");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/junk"
        );

        vm.prank(solver1);
        vm.expectRevert("Invalid or junk submission URL");
        escrow.submitSolution(bountyId, "pr"); // too short (< 10 chars)
    }

    function testRevertOnMaintainerSolvingOwnBounty() public {
        bytes32 bountyId = keccak256("self-solve-test");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/self"
        );

        vm.prank(maintainer);
        vm.expectRevert("Maintainer cannot solve own bounty");
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/self");
    }

    function testBlindCommitmentAndReleaseWithProof() public {
        bytes32 bountyId = keccak256("blind-commitment-test");
        uint256 amount = 1 ether;
        vm.prank(maintainer);
        escrow.createBounty{value: amount}(
            bountyId,
            address(0),
            amount,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/blind"
        );

        string memory prUrl = "https://github.com/botchain/bounties/pull/secret-agent-pr";
        bytes32 salt = keccak256("super-secret-salt-2026");
        bytes32 commitment = keccak256(abi.encodePacked(solver1, prUrl, salt));

        // Solver commits hash (URL is hidden on-chain)
        vm.prank(solver1);
        escrow.submitSolutionCommitment(bountyId, commitment);

        BotBountyEscrow.Bounty memory b = escrow.getBounty(bountyId);
        assertEq(b.solver, solver1);
        assertEq(b.prUrl, "");
        assertEq(b.solutionCommitment, commitment);

        // Maintainer releases with verified preimage
        uint256 balBefore = solver1.balance;
        vm.prank(maintainer);
        escrow.releaseBountyWithProof(bountyId, prUrl, salt);

        assertEq(solver1.balance - balBefore, amount);
        b = escrow.getBounty(bountyId);
        assertEq(uint(b.status), uint(BotBountyEscrow.BountyStatus.Settled));
        assertEq(b.prUrl, prUrl);
    }

    function testRevertOnInvalidBlindCommitmentProof() public {
        bytes32 bountyId = keccak256("blind-proof-fail-test");
        uint256 amount = 1 ether;
        vm.prank(maintainer);
        escrow.createBounty{value: amount}(
            bountyId,
            address(0),
            amount,
            block.timestamp + 5 days,
            0,
            "https://github.com/botchain/bounties/issues/blind-fail"
        );

        string memory prUrl = "https://github.com/botchain/bounties/pull/secret-agent-pr";
        bytes32 salt = keccak256("real-salt");
        bytes32 commitment = keccak256(abi.encodePacked(solver1, prUrl, salt));

        vm.prank(solver1);
        escrow.submitSolutionCommitment(bountyId, commitment);

        // Attempting to release with forged/wrong salt must revert
        vm.prank(maintainer);
        vm.expectRevert("Solution commitment verification failed");
        escrow.releaseBountyWithProof(bountyId, prUrl, keccak256("wrong-salt"));
    }

    function testRevertOnUnauthorisedTimeoutClaim() public {
        bytes32 bountyId = keccak256("unauth-timeout-test");
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 10 days,
            1 days,
            "https://github.com/botchain/bounties/issues/timeout"
        );

        vm.prank(solver1);
        escrow.submitSolution(bountyId, "https://github.com/botchain/bounties/pull/timeout");

        vm.warp(block.timestamp + 2 days);

        // Attacker attempts timeout claim
        vm.prank(attacker);
        vm.expectRevert("Only solver can claim timeout");
        escrow.claimTimeoutRelease(bountyId);
    }

    function testRevertOnUnauthorisedRefund() public {
        bytes32 bountyId = keccak256("unauth-refund-test");
        uint256 deadline = block.timestamp + 5 days;
        vm.prank(maintainer);
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            deadline,
            1 days,
            "https://github.com/botchain/bounties/issues/refund"
        );

        vm.warp(deadline + 1);

        // Attacker attempts refund
        vm.prank(attacker);
        vm.expectRevert("Only maintainer can refund");
        escrow.refundBounty(bountyId);
    }

    function testRevertOnZeroReward() public {
        bytes32 bountyId = keccak256("zero-reward-test");
        vm.prank(maintainer);
        vm.expectRevert("Reward must be > 0");
        escrow.createBounty{value: 0}(
            bountyId,
            address(0),
            0,
            block.timestamp + 5 days,
            1 days,
            "https://github.com/botchain/bounties/issues/zero"
        );
    }

    function testRevertOnPastDeadline() public {
        bytes32 bountyId = keccak256("past-deadline-test");
        vm.prank(maintainer);
        vm.expectRevert("Deadline must be in future");
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp - 1,
            1 days,
            "https://github.com/botchain/bounties/issues/past"
        );
    }

    function testRevertOnInvalidReviewPeriod() public {
        bytes32 bountyId = keccak256("invalid-review-test");
        vm.prank(maintainer);
        // Review period < 1 days (e.g. 10 seconds)
        vm.expectRevert("Invalid review period");
        escrow.createBounty{value: 1 ether}(
            bountyId,
            address(0),
            1 ether,
            block.timestamp + 5 days,
            10,
            "https://github.com/botchain/bounties/issues/invalid-review"
        );
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assertEq uint failed");
    }

    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "assertEq bytes32 failed");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "assertEq address failed");
    }

    function assertEq(string memory a, string memory b) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq string failed");
    }
}
