// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// contracts/BotBountyEscrow.sol

/**
 * @title BotBountyEscrow
 * @notice Multi-Asset Developer & AI Agent Bounty Escrow for BOT Chain (EVM 677 / Bohr Testnet 968) and EVM networks.
 * @dev Supports native $BOT (address(0)) and arbitrary ERC-20 tokens (e.g. bridged USDT).
 *      Includes anti-griefing submission authorization, maintainer rejection workflows,
 *      review timeout auto-claims to prevent escrow lockups, and rich on-chain pagination
 *      to accommodate RPCs where eth_getLogs is restricted.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library SafeTransferLib {
    function safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer: transfer failed");
    }

    function safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer: transferFrom failed");
    }

    function safeTransferNative(address to, uint256 value) internal {
        (bool success, ) = payable(to).call{value: value}("");
        require(success, "SafeTransfer: native transfer failed");
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract BotBountyEscrow is ReentrancyGuard {
    using SafeTransferLib for address;

    enum BountyStatus {
        Open,       // Escrow funded, awaiting solutions
        InReview,   // Solution / PR submitted for maintainer review
        Settled,    // Solution approved & bounty disbursed to solver
        Refunded    // Expired or reclaimed and returned to maintainer
    }

    struct Bounty {
        bytes32 bountyId;
        address maintainer;
        address solver;
        address settlementToken; // address(0) for native $BOT, or ERC-20 contract (USDT)
        uint256 amount;
        uint256 createdAt;
        uint256 deadline;
        uint256 submittedAt;
        uint256 reviewPeriod;    // Time allowed for review before solver timeout claim (seconds)
        BountyStatus status;
        string issueUrl;
        string prUrl;
    }

    // Default review duration: 7 days (604800 seconds)
    uint256 public constant DEFAULT_REVIEW_PERIOD = 7 days;
    uint256 public constant MIN_REVIEW_PERIOD = 1 days;
    uint256 public constant MAX_REVIEW_PERIOD = 30 days;

    mapping(bytes32 => Bounty) public bounties;
    bytes32[] public allBountyIds;

    // Index mappings to support querying without eth_getLogs
    mapping(address => bytes32[]) private _maintainerBounties;
    mapping(address => bytes32[]) private _solverBounties;

    // Events
    event BountyCreated(
        bytes32 indexed bountyId,
        address indexed maintainer,
        address settlementToken,
        uint256 amount,
        string issueUrl,
        uint256 deadline,
        uint256 reviewPeriod
    );

    event SolutionSubmitted(
        bytes32 indexed bountyId,
        address indexed solver,
        string prUrl,
        uint256 submittedAt
    );

    event SolutionRejected(
        bytes32 indexed bountyId,
        address indexed solver,
        string reason
    );

    event BountySettled(
        bytes32 indexed bountyId,
        address indexed solver,
        address settlementToken,
        uint256 amount,
        string prUrl,
        bool timedOut
    );

    event BountyRefunded(
        bytes32 indexed bountyId,
        address indexed maintainer,
        address settlementToken,
        uint256 amount
    );

    /**
     * @notice Create and fund a new developer / AI agent bounty.
     * @param bountyId Unique identifier hash (e.g. keccak256 hash of issue URL or UUID)
     * @param settlementToken Token address for reward (address(0) for native $BOT, or ERC-20 address)
     * @param amount Reward amount (in token base units)
     * @param deadline Unix timestamp for completion
     * @param reviewPeriod Seconds maintainer has to review submissions (0 defaults to DEFAULT_REVIEW_PERIOD)
     * @param issueUrl GitHub Issue or bounty specification reference
     */
    function createBounty(
        bytes32 bountyId,
        address settlementToken,
        uint256 amount,
        uint256 deadline,
        uint256 reviewPeriod,
        string calldata issueUrl
    ) external payable nonReentrant {
        require(amount > 0, "Reward must be > 0");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bounties[bountyId].createdAt == 0, "Bounty already exists");

        uint256 effectiveReviewPeriod = reviewPeriod == 0 ? DEFAULT_REVIEW_PERIOD : reviewPeriod;
        require(
            effectiveReviewPeriod >= MIN_REVIEW_PERIOD && effectiveReviewPeriod <= MAX_REVIEW_PERIOD,
            "Invalid review period"
        );

        // Handle funding
        if (settlementToken == address(0)) {
            require(msg.value == amount, "Incorrect native BOT value sent");
        } else {
            require(msg.value == 0, "Native value sent for ERC20 bounty");
            settlementToken.safeTransferFrom(msg.sender, address(this), amount);
        }

        bounties[bountyId] = Bounty({
            bountyId: bountyId,
            maintainer: msg.sender,
            solver: address(0),
            settlementToken: settlementToken,
            amount: amount,
            createdAt: block.timestamp,
            deadline: deadline,
            submittedAt: 0,
            reviewPeriod: effectiveReviewPeriod,
            status: BountyStatus.Open,
            issueUrl: issueUrl,
            prUrl: ""
        });

        allBountyIds.push(bountyId);
        _maintainerBounties[msg.sender].push(bountyId);

        emit BountyCreated(
            bountyId,
            msg.sender,
            settlementToken,
            amount,
            issueUrl,
            deadline,
            effectiveReviewPeriod
        );
    }

    /**
     * @notice Submit a Pull Request solution for review.
     * @dev Caller is enforced as the solver (prevents unauthorized third-party submission griefing).
     * @param bountyId Unique identifier hash
     * @param prUrl Pull Request or verification reference
     */
    function submitSolution(
        bytes32 bountyId,
        string calldata prUrl
    ) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.createdAt != 0, "Bounty does not exist");
        require(b.status == BountyStatus.Open, "Bounty not open for submissions");
        require(block.timestamp <= b.deadline, "Bounty expired");
        require(bytes(prUrl).length > 0, "Empty PR URL");

        b.solver = msg.sender;
        b.prUrl = prUrl;
        b.submittedAt = block.timestamp;
        b.status = BountyStatus.InReview;

        _solverBounties[msg.sender].push(bountyId);

        emit SolutionSubmitted(bountyId, msg.sender, prUrl, block.timestamp);
    }

    /**
     * @notice Maintainer approves the solution and disburses escrowed reward to solver.
     * @param bountyId Unique identifier hash
     */
    function releaseBounty(bytes32 bountyId) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.createdAt != 0, "Bounty does not exist");
        require(msg.sender == b.maintainer, "Only maintainer can release");
        require(b.status == BountyStatus.InReview, "Bounty not in review");
        require(b.solver != address(0), "No solver assigned");

        address solver = b.solver;
        address token = b.settlementToken;
        uint256 amount = b.amount;
        string memory prUrl = b.prUrl;

        b.status = BountyStatus.Settled;

        emit BountySettled(bountyId, solver, token, amount, prUrl, false);

        _payout(token, solver, amount);
    }

    /**
     * @notice Maintainer rejects a submitted solution, returning the bounty to Open status.
     * @dev Prevents lockups caused by junk or substandard PRs.
     * @param bountyId Unique identifier hash
     * @param reason Explanation for rejection
     */
    function rejectSolution(
        bytes32 bountyId,
        string calldata reason
    ) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.createdAt != 0, "Bounty does not exist");
        require(msg.sender == b.maintainer, "Only maintainer can reject");
        require(b.status == BountyStatus.InReview, "Bounty not in review");

        address previousSolver = b.solver;

        // Reset state so others (or original solver after fixes) can submit
        b.solver = address(0);
        b.prUrl = "";
        b.submittedAt = 0;
        b.status = BountyStatus.Open;

        emit SolutionRejected(bountyId, previousSolver, reason);
    }

    /**
     * @notice Solver can claim payout if maintainer becomes unresponsive and review period expires.
     * @dev Protects contributors and autonomous agents from maintainer ghosting.
     * @param bountyId Unique identifier hash
     */
    function claimTimeoutRelease(bytes32 bountyId) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.createdAt != 0, "Bounty does not exist");
        require(b.status == BountyStatus.InReview, "Bounty not in review");
        require(msg.sender == b.solver, "Only solver can claim timeout");
        require(
            block.timestamp > b.submittedAt + b.reviewPeriod,
            "Review period has not expired"
        );

        address solver = b.solver;
        address token = b.settlementToken;
        uint256 amount = b.amount;
        string memory prUrl = b.prUrl;

        b.status = BountyStatus.Settled;

        emit BountySettled(bountyId, solver, token, amount, prUrl, true);

        _payout(token, solver, amount);
    }

    /**
     * @notice Maintainer reclaims funds if deadline passed and bounty remains unfulfilled.
     * @param bountyId Unique identifier hash
     */
    function refundBounty(bytes32 bountyId) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.createdAt != 0, "Bounty does not exist");
        require(msg.sender == b.maintainer, "Only maintainer can refund");
        require(b.status == BountyStatus.Open, "Bounty not in open status");
        require(block.timestamp > b.deadline, "Deadline has not passed");

        address maintainer = b.maintainer;
        address token = b.settlementToken;
        uint256 amount = b.amount;

        b.status = BountyStatus.Refunded;

        emit BountyRefunded(bountyId, maintainer, token, amount);

        _payout(token, maintainer, amount);
    }

    /**
     * @dev Internal payout dispatcher for native and ERC-20 assets.
     */
    function _payout(address token, address recipient, uint256 amount) internal {
        if (token == address(0)) {
            SafeTransferLib.safeTransferNative(recipient, amount);
        } else {
            token.safeTransfer(recipient, amount);
        }
    }

    // =========================================================================
    // ON-CHAIN VIEW & PAGINATION HELPERS (Compatible with RPCs without eth_getLogs)
    // =========================================================================

    function getBountyCount() external view returns (uint256) {
        return allBountyIds.length;
    }

    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    /**
     * @notice Retrieve paginated list of bounties directly via eth_call.
     * @param offset Starting index
     * @param limit Maximum number of bounties to return
     */
    function getBounties(uint256 offset, uint256 limit)
        external
        view
        returns (Bounty[] memory items, uint256 total)
    {
        total = allBountyIds.length;
        if (offset >= total || limit == 0) {
            return (new Bounty[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultSize = end - offset;
        items = new Bounty[](resultSize);

        for (uint256 i = 0; i < resultSize; i++) {
            items[i] = bounties[allBountyIds[offset + i]];
        }
    }

    /**
     * @notice Retrieve bounty IDs created by a specific maintainer.
     */
    function getMaintainerBounties(address maintainer)
        external
        view
        returns (bytes32[] memory)
    {
        return _maintainerBounties[maintainer];
    }

    /**
     * @notice Retrieve bounty IDs submitted to by a specific solver.
     */
    function getSolverBounties(address solver)
        external
        view
        returns (bytes32[] memory)
    {
        return _solverBounties[solver];
    }
}

