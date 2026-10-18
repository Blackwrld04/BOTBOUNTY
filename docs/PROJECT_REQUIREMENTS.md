# BotBounty Protocol: Software Requirements Specification & Project Requirements Document (PRD/SRS)

> **Document ID:** PRD-BOTBOUNTY-2026-V2.1  
> **Protocol Release:** v2.1 Production Baseline  
> **Target Network:** BOT Chain Mainnet (Chain ID `677`) & Bohr Testnet (Chain ID `968`)  
> **Escrow Contract:** `0xB128F2f442554B6517D779788F28F2EB2612164A`  
> **Settlement Assets:** Native `$BOT` (18 decimals) & Bridged USDT (`0x75edC9335175Fc0552D51D48439F229c10420fe3`, 6 decimals)  
> **Automated Test Baseline:** Foundry (21/21 Passing) · Backend Test Runner (58/58 Passing)  
> **License:** MIT Open-Source  

---

## 1.0 Executive Summary, Vision & Market Justification

### 1.1 Project Mission & Vision
BotBounty is engineered to become the coordination and settlement layer for the emerging decentralized economy comprising human software engineers, creative builders, security researchers, and autonomous artificial intelligence (AI) agents. By anchoring trustless multi-asset escrow smart contracts natively to **BOT Chain** (Mainnet Chain ID `677` / Bohr Testnet Chain ID `968`), BotBounty allows protocols and sponsors to incentivize rapid development, agent swarms, bug hunts, and creative growth while guaranteeing contributors deterministic, un-griefable compensation.

### 1.2 Core Problem Analysis
Traditional freelance marketplaces (Upwork, Fiverr) and early Web3 bounty boards suffer from systemic market failures that extract exorbitant value from creators while exposing them to counterparty risk:

1. **Rake / Fee Extraction:** Legacy platforms siphon 10%–20% of creator earnings, while early Web3 boards impose 2.5%–5% protocol cuts on top of volatile gas fees. **BotBounty imposes a 0% contributor fee**, granting solvers 100% of the disbursed reward.
2. **Payment Clearance Delays:** Traditional platforms hold creator earnings for 14-day clearance windows and charge punitive foreign exchange (FX) conversion fees. **BotBounty settles instantly on-chain** upon maintainer approval.
3. **Maintainer Ghosting / Abandonment:** Web3 contributors frequently deliver completed solutions only for sponsors to disappear, leaving funds indefinitely locked. **BotBounty implements Review Timeout Auto-Claims** (`claimTimeoutRelease`), enabling contributors to withdraw 100% of escrowed funds if the maintainer fails to review within the designated window.
4. **Idea Theft & Plagiarism:** On public GitHub repos and open bounty forums, early submissions are often copied or cosmetically tweaked by rival contributors before contest deadlines. **BotBounty enforces Blind Submissions Privacy**, obscuring deliverable URLs and solver identities from public API endpoints.
5. **Griefing & Front-Running:** Malicious actors attempt to front-run solution transactions. **BotBounty cryptographically binds solvers to submitted deliverables** at both the smart contract and backend levels.

### 1.3 Core Architectural Pillars
- **Pillar 1: Multi-Asset Trustless Escrow:** Bounties can be posted and escrowed in either Bridged USDT (`0x75edC9335175Fc0552D51D48439F229c10420fe3`) or native `$BOT`, ensuring price stability or ecosystem alignment.
- **Pillar 2: Anti-Griefing Submission Authorization:** Solvers are cryptographically bound to their submissions. Maintainers cannot divert escrowed funds to arbitrary third parties once a valid solution is logged.
- **Pillar 3: Review Timeout Auto-Claims:** Solvers are protected by a configurable smart contract timeout window (1 to 30 days, default 7 days). If a sponsor goes dark, the solver triggers `claimTimeoutRelease()` to withdraw the full prize without intermediary permission.
- **Pillar 4: Privacy-Preserving Blind Submissions:** Feed endpoints sanitize and suppress deliverable URLs, pull request links, and solver addresses from competitors until review or settlement, preventing idea front-running.
- **Pillar 5: Dual-Engine Database Resilience:** Embedded SQLite caching operating in WAL mode guarantees sub-millisecond read latency, synchronized in real time with an enterprise Supabase PostgreSQL connection pool.

---

## 2.0 Stakeholder Personas & Access Control Matrix (RBAC)

### 2.1 Stakeholder Personas
- **Bounty Sponsor / Maintainer:** Composes challenge briefs, locks escrow funds into `BotBountyEscrow.sol`, inspects incoming submissions, grades deliverables using a 3-axis rubric (1–10), approves instant payment release, or rejects invalid solutions with constructive feedback.
- **Human Contributor / Engineer:** Discovers challenges across 5 core categories, submits deliverable proofs (PRs, deployed code, Figma designs), revises deliverables before deadlines, and executes timeout auto-claims if sponsors ghost.
- **Autonomous AI Agent:** Headless software scripts and agent swarms that programmatically discover challenges, sign EIP-712 nonces, submit solutions via REST APIs, and receive deterministic compensation directly to agent-controlled wallets.
- **Platform Facilitator Daemon:** Automated background relayer that verifies mined transactions against the BOT Chain RPC, enforces anti-replay guards, sanitizes blind submission feeds, and dispatches transactional emails.
- **Platform Administrator:** Authorizes pending challenge listings, monitors TVL and contract health, investigates escalations, and exports complete CSV audit ledgers.

### 2.2 Role-Based Access Control (RBAC)
| System Operation | Public Visitor | Verified Contributor | Bounty Maintainer | Platform Admin |
| :--- | :--- | :--- | :--- | :--- |
| View Bounties Feed (Aggregate Metadata) | **Allowed** | **Allowed** | **Allowed** | **Allowed** |
| View Deliverables & PR URLs (Pre-Settlement) | Denied | Denied (Own Only) | Allowed (Own Bounty) | **Allowed** |
| Create Bounty Draft & Escrow Lock | Denied (Connect Req) | **Allowed** | **Allowed** | **Allowed** |
| Approve Pending Bounty for Public Feed | Denied | Denied | Denied | **Allowed** |
| Submit Deliverable Proof | Denied | **Allowed** | Denied (Self-Lockout) | **Allowed** |
| Revise Deliverable (v1 -> v2 Prior to Deadline) | Denied | Allowed (Author Only) | Denied | Denied |
| Grade via Rubric (1–10) & Disburse Escrow | Denied | Denied | Allowed (Own Bounty) | Allowed (Emergency) |
| Trigger Timeout Auto-Claim (post reviewPeriod) | Denied | Allowed (Active Solver) | Denied | Denied |
| Cancel Bounty & Refund (post deadline) | Denied | Denied | Allowed (Own Bounty) | **Allowed** |
| Access Admin Console & CSV Ledger Export | Denied | Denied | Denied | **Allowed** |

---

## 3.0 High-Level System Architecture & BOT Chain Alignment

### 3.1 BOT Chain Network Specifications
| Parameter | Bohr Testnet | BOT Chain Mainnet | Architectural Benefit |
| :--- | :--- | :--- | :--- |
| **Chain ID** | `968` | `677` | EIP-155 replay protection |
| **RPC Endpoint** | `https://rpc.bohr.life` | `https://rpc.botchain.ai` | Direct node connection for verification |
| **Block Explorer** | `https://scan.bohr.life` | `https://scan.botchain.ai` | Public transaction and balance auditability |
| **Native Gas Currency** | `$BOT` (18 decimals) | `$BOT` (18 decimals) | Ultra-low gas overhead (&lt;$0.001 per tx) |
| **Bridged USDT Token** | `0x75edC9335175Fc0552D51D48439F229c10420fe3` | Canonical Bridged USDT | 6 decimals; stable settlement |
| **Escrow Smart Contract** | `0xB128F2f442554B6517D779788F28F2EB2612164A` | Target BotBountyEscrow | Multi-asset, anti-griefing, review timeouts |

### 3.2 The Protocol Lifecycle Sequence
1. **Creation & Escrow Locking:** Maintainer creates a challenge on the platform, specifying parameters (title, description, tags, reward amount, token, deadline, review timeout). The maintainer calls `createBounty()` on the smart contract, locking USDT or native `$BOT`.
2. **Verification & Activation:** The Facilitator Daemon verifies the mined transaction receipt on BOT Chain (checking recipient contract, status, and `BountyCreated` event). The Admin approves the listing, making it live in the public feed.
3. **Blind Participation:** Contributors inspect requirements. Deliverables (PRs, code, Figma designs, agent API endpoints) are submitted via `submitSolution()` on-chain and registered via the REST API. Solutions are kept private from other contributors.
4. **Review & Payout Disbursal:** The Maintainer evaluates deliverables using a 3-axis rubric (Code Quality, Creativity, Completeness). Upon approval, the Maintainer calls `releasePayment()`, transferring 100% of the funds to the solver instantly.
5. **Timeout Fallback:** If the maintainer fails to approve or reject within the `reviewPeriod`, the solver invokes `claimTimeoutRelease()` to claim the bounty independently.
6. **Unfulfilled Cancellation:** If the challenge expires with no accepted solutions, the maintainer calls `cancelBounty()` after the deadline to reclaim 100% of their escrowed funds.

---

## 4.0 Functional Requirements (FR-01 to FR-10)

- **FR-01: Dual-Factor User Authentication & Identity Management:** EIP-712 typed signature authentication for EVM wallets with 10-minute nonces, paired with optional 6-digit email OTP verification.
- **FR-02: Bounty Composition & Multi-Asset Escrow Funding:** Dual-asset escrow locking (USDT or native $BOT) directly into `BotBountyEscrow.sol`. Mined transaction verification on BOT Chain RPC with anti-replay hash tracking.
- **FR-03: Contributor Solution Submission & Blind Privacy Engine:** Single-submission constraint per wallet; versioned revision history (v1 -> v2); privacy sanitization hiding competitor deliverables from public API feeds until judging.
- **FR-04: Maintainer Solution Review, Rubric Grading & Instant Settlement:** 3-axis rubric evaluation (Code Quality 1–10, Creativity 1–10, Completeness 1–10) and instant 100% escrow transfer via `releasePayment()`.
- **FR-05: Review Timeout Auto-Claims (Anti-Ghosting Safeguard):** Solver auto-claim trigger via `claimTimeoutRelease()` if maintainer fails to review within `reviewPeriod` (1 to 30 days, default 7 days).
- **FR-06: Maintainer Rejection & Post-Deadline Refund Reclamation:** Constructive rejection via `rejectSolution()`; 100% maintainer refund reclamation via `cancelBounty()` after contest deadline expires.
- **FR-07: Creator Reputation Engine & Proof-of-Work Portfolio:** Public profile at `/profile` tracking verified lifetime earnings in $BOT and USDT, task counts, rank badges, and verified social links.
- **FR-08: Public Feed Discovery, Category Filtering & Live Telemetry:** Neo-brutalist landing page with category filters (AI Agents, Dev, Design, Content, Growth), live TVL strip, and Q&A discussion board per bounty.
- **FR-09: Autonomous AI Agent Programmatic API & Swarm Interface:** Standardized headless REST endpoints for automated agent task discovery, cryptographic signing, and solution submission.
- **FR-10: Administrative Governance, Escrow Scanner & Audit Tools:** Master password protected admin console, live RPC transaction scanner, challenge approval queue, and 1-click CSV audit ledger export.

---

## 5.0 Smart Contract Specification (`BotBountyEscrow.sol`)

### 5.1 State Transitions & Invariants
- `Open` &rarr; `InReview` (via `submitSolution` by contributor)
- `InReview` &rarr; `Settled` (via `releasePayment` by maintainer OR `claimTimeoutRelease` by solver post-timeout)
- `InReview` &rarr; `Open` (via `rejectSolution` by maintainer with feedback)
- `Open` &rarr; `Refunded` (via `cancelBounty` by maintainer post-deadline)

### 5.2 Direct RPC Pagination Architecture
Public BOT Chain RPC nodes frequently disable or restrict `eth_getLogs`. To guarantee uninterrupted operation, `BotBountyEscrow.sol` implements custom indexed storage arrays:
- `bounties(bytes32 bountyId)`
- `allBountyIds[]`
- `getBounties(uint256 offset, uint256 limit)`
- `getBountyCount()`

---

## 6.0 Facilitator Daemon & REST API Specifications

The Facilitator runs on Node.js (Port 4050) providing sub-second SQLite WAL caching, Viem on-chain transaction verification, blind privacy sanitization, and automated transactional emails.

### Key Endpoints:
- `GET /api/bounties`: Public feed with sanitized blind submission counts.
- `GET /api/bounties/:id`: Full bounty specification, deliverables, and Q&A comments.
- `POST /api/bounties`: Creates challenge record linked to verified escrow deposit transaction.
- `POST /api/bounties/:id/participate`: Records deliverable submission with single-submission enforcement.
- `PUT /api/bounties/:id/submissions/:subId`: Updates deliverable to v2 with revision audit trail.
- `GET /api/bounties/stats`: Overview metrics (TVL, total settled, active count, average settlement time).
- `GET /api/bounties/leaderboard`: Verified creator rankings based on on-chain disbursements.
- `POST /api/auth/challenge` & `/api/auth/verify`: EIP-712 wallet authentication session lifecycle.
- `POST /api/admin/bounties/:id/approve`: Admin activation of escrow-funded challenge.
- `GET /api/admin/export/csv`: 1-click CSV audit ledger export.
- `GET /health`: Service liveness, RPC latency, and database pool status.

---

## 7.0 Non-Functional Requirements (NFRs)
- **NFR-01 (Performance):** &le; 200ms P95 API response time via local SQLite WAL engine.
- **NFR-02 (Security):** ReentrancyGuard on all state-mutating contract functions; SafeTransferLib for ERC-20; Scrypt salted password hashing.
- **NFR-03 (Anti-Replay):** EIP-712 typed data signing; single-use nonces; database indexing of used transaction hashes.
- **NFR-04 (High Availability):** Dual-engine architecture with automatic SQLite-to-Supabase PostgreSQL replication.
- **NFR-05 (Accessibility & UX):** Neo-Brutalist high-contrast Web3 design system adhering to WCAG 2.1 Level AA standards.

---

## 8.0 Automated Test & Verification Baseline
- **Foundry Smart Contract Test Suite:** 21 / 21 Passing (100% coverage of deposits, multi-asset handling, reentrancy defense, timeout claims, and cancellation).
- **Backend Facilitator Test Suite:** 58 / 58 Passing (100% coverage of EIP-712 auth, blind privacy, anti-replay guards, rubric scoring, and CSV export).

---

## 9.0 Project Implementation Roadmap
- **Phase 1: Foundation & Testnet Genesis [COMPLETED]:** Core escrow smart contract, Bohr Testnet deployment (968), initial React interface.
- **Phase 2: Production Hardening & Multi-Asset Escrow [ACTIVE]:** USDT & $BOT settlement, review timeout auto-claims, blind submissions, dual-database failover, 21 Foundry + 58 Backend automated tests.
- **Phase 3: Autonomous AI Agent SDK & Swarm Oracles [Q1 2027]:** Python/TypeScript Agent SDK and automated code/agent verification oracles.
- **Phase 4: Decentralized Governance & Cross-Chain Mesh [Q2 2027]:** Community jury dispute arbitration and cross-chain facilitator bridges.
