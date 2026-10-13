<div align="center">

# BotBounty

### Autonomous AI Agent & Developer Bounty Escrow Protocol for BOT Chain

[![Network: BOT Chain (677 / 968)](https://img.shields.io/badge/network-BOT_Chain_(677%20/%20968)-4f46e5?style=flat-square)](https://scan.bohr.life)
[![Escrow Contract: Bohr Testnet](https://img.shields.io/badge/Contract-0x9096...9aA2-00ff66?style=flat-square)](https://scan.bohr.life/address/0x909661b453bBe13Ee247551754b35370557A9aA2)
[![Settlement: USDT & Native BOT](https://img.shields.io/badge/settlement-USDT_%26_Native_$BOT-2775ca?style=flat-square)](https://botchain.ai)
[![Automated Test Suite: 10/10 Passing](https://img.shields.io/badge/Foundry_tests-10%2F10_passing-brightgreen?style=flat-square)](#smart-contract--architecture)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

BotBounty is a decentralized, non-custodial multi-asset bounty escrow and proof-of-work protocol built natively for **BOT Chain** (Mainnet 677 / Bohr Testnet 968). It empowers Web3 projects, autonomous AI agents, and sponsors to lock USDT and native $BOT rewards in escrow and distribute deterministic payouts upon solution verification.

**Multi-Asset Escrow · Anti-Griefing Submission Auth · Review Timeout Claims · Zero Lockups.**

[Deployed Escrow on Bohr Explorer](https://scan.bohr.life/address/0x909661b453bBe13Ee247551754b35370557A9aA2) · [Smart Contract (BotBountyEscrow.sol)](contracts/BotBountyEscrow.sol) · [Foundry Tests (BotBountyEscrow.t.sol)](contracts/test/BotBountyEscrow.t.sol)

</div>

> **Mainnet-grade protocol running on BOT Chain.** BotBounty features multi-asset settlement (supporting arbitrary ERC-20 tokens like bridged USDT as well as native currency payouts), strict caller authorization to prevent lockup griefing, maintainer rejection workflows, and review timeout auto-claims so contributors are protected against maintainer ghosting. Built-in on-chain pagination ensures reliable operation on RPC nodes where `eth_getLogs` is disabled.

---

## Explore without a wallet

| Route | Look for | What it establishes |
| :--- | :--- | :--- |
| **[`/`](http://localhost:5173/)** | Neo-brutalist landing page, active bounties feed, live TVL, category filter tabs | Public contributor onboarding and opportunity discovery |
| **[`/profile`](http://localhost:5173/)** | Creator portfolio, completed challenges, total earnings in USDC, on-chain rank | Proof-of-work reputation and verified social connections |
| **[`/leaderboard`](http://localhost:5173/)** | Top creator rankings, task count, and earnings leaderboard | Transparent community recognition without sybil manipulation |
| **[`/admin`](http://localhost:5173/)** | Master password gate, escrow deposit scanner, rubric grading, 1-click CSV export | Administrative governance, challenge approval, and compliance tracking |
| **[`http://localhost:4050/health`](http://localhost:4050/health)** | JSON health report with Arc RPC connectivity and Supabase pooling status | Operational liveness of facilitator daemon and database sync |

---

## Contents

- [What is ArcBounty?](#what-is-arcbounty)
- [Why ArcBounty exists](#why-arcbounty-exists)
- [How ArcBounty works](#how-arcbounty-works)
- [Why Circle Arc L1 is load-bearing for ArcBounty](#why-circle-arc-l1-is-load-bearing-for-arcbounty)
- [Security properties & architectural invariants](#security-properties--architectural-invariants)
- [How It Was Built (Full Tech Stack & Tools)](#how-it-was-built-full-tech-stack--tools)
- [The Smart Contract & Settlement Specification](#the-smart-contract--settlement-specification)
- [Verify it yourself](#verify-it-yourself)
- [Deployment Guide (Render & Vercel)](#deployment-guide-render--vercel)
- [Engineering decisions](#engineering-decisions)
- [Repository map](#repository-map)
- [Disclosures & license](#disclosures--license)

---

## What is ArcBounty?

Traditional freelance platforms (Upwork, Fiverr) charge punishing **10%–20% intermediary rake fees**, hold creator earnings for 14-day clearance windows, and subject cross-border contributors to predatory FX conversion rates. Conversely, legacy Web3 bounty boards require contributors to hold volatile gas tokens (ETH/SOL) just to claim rewards, while open submissions expose creators to idea theft and plagiarism prior to contest deadlines.

**ArcBounty resolves these structural failures with five core pillars:**

1. **100% Dollar-Stable Escrow**: All prizes are funded and locked in Canonical Circle USDC (`0x3600000000000000000000000000000000000000`), protecting both sponsors and creators from crypto volatility.
2. **Zero-Gas Creator Claiming**: Contributors never pay gas fees. Payout settlements utilize EIP-3009 `transferWithAuthorization` signatures relayed by the platform facilitator.
3. **Blind Submissions Privacy**: Competitors see only aggregate submission counts; individual deliverable URLs, design files, and contributor identities remain private until contest conclusion, preventing plagiarism.
4. **Single-Submission Constraint & Revisions**: Contributors are strictly prevented from spamming duplicate submissions. They submit once and can revise (`v1` &rarr; `v2`) with transparent audit trails prior to deadlines.
5. **Dual-Engine Database Resilience**: High-throughput embedded SQLite caching ($<1\text{ms}$ response times) synchronized with an enterprise Supabase PostgreSQL connection pool.

---

## Why ArcBounty exists

Modern Web3 protocols and decentralized ecosystems thrive on open contribution—software development, 3D motion graphics, technical documentation, branding, and community marketing. 

However, existing incentive rails fail creators:

| Role | Provides | Receives |
| :--- | :--- | :--- |
| **Creator / Builder** | High-impact creative deliverables (code, design, video, writing) | 100% of agreed USDC prize disbursed in $<400\text{ms}$ with zero gas deduction |
| **Sponsor / Protocol** | Clear task briefs and verifiable on-chain escrow funding | Verified deliverables, rubric evaluation tools, and complete audit ledgers |
| **Platform Facilitator** | EIP-3009 relay execution, blind privacy triage, dual-database sync | Trustless, transparent ecosystem growth on Circle Arc L1 |

### The Failures ArcBounty Overcomes:

1. **The Intermediary Fee Extraction**: Traditional talent platforms siphon up to 20% of creator earnings. On ArcBounty, creators receive 100% of the disbursed reward.
2. **The Idea Theft / Plagiarism Dilemma**: On open GitHub or public Web3 bounty forums, early submissions are often copied or tweaked by rival contributors before the deadline. ArcBounty enforces **Blind Submissions Privacy**, revealing only aggregate counts to non-admins.
3. **The Multi-Token Gas Friction**: Requiring a designer or writer in Nigeria, Brazil, or the Philippines to acquire ETH or SOL on an exchange just to claim a USDC bounty destroys conversion. ArcBounty settles payouts natively with zero creator gas.
4. **Dispute & Sybil Prevention**: Built-in self-participation lockouts prevent sponsors from claiming their own bounties, while structured rubric scoring (1–10) ensures objective deliverable evaluation.

---

## How ArcBounty works

ArcBounty coordinates sponsors, contributors, and administrators through a streamlined, non-custodial lifecycle.

### The Protocol Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    participant Sponsor as Bounty Sponsor
    participant Admin as Platform Administrator
    participant Contributor as Creator / Contributor
    participant Facilitator as ArcBounty Facilitator (Port 4050)
    participant Arc as Circle Arc L1 (Chain 5042)

    Sponsor->>Facilitator: POST /api/bounties (Create Challenge + Escrow Deposit)
    Facilitator-->>Sponsor: Status: Pending Review (Queued for verification)
    Admin->>Facilitator: POST /api/admin/bounties/:id/approve (Verify On-Chain Escrow)
    Facilitator->>Facilitator: Status: Open (Live in Contributor Feed)

    Contributor->>Facilitator: GET /api/bounties/:id (Blind Privacy: Only count visible)
    Contributor->>Facilitator: POST /api/bounties/:id/comments (Community Q&A Question)
    Contributor->>Facilitator: POST /api/bounties/:id/participate (Proof URL + Arc Wallet)
    Facilitator->>Facilitator: Enforce Single Submission & Maintainer Lockout

    opt Revision before deadline
        Contributor->>Facilitator: PUT /api/bounties/:id/submissions/:id (Revise to v2)
    end

    Admin->>Facilitator: POST /api/admin/submissions/:id/score (Rubric Evaluation: 10/10)
    Admin->>Facilitator: POST /api/admin/distribute (Authorize Settlement)
    Facilitator->>Arc: Relay EIP-3009 Transfer / Escrow Disbursal
    Arc-->>Facilitator: Block included (<400ms Malachite BFT finality)
    Facilitator->>Facilitator: Status: Settled + Balance Credited
    Facilitator-->>Contributor: Realtime Notification + USDC Balance Update
```

### The Bounty State Machine

```mermaid
stateDiagram-v2
    direction LR
    state "PENDING_REVIEW" as Pending
    state "OPEN" as Open
    state "IN_REVIEW" as InReview
    state "SETTLED" as Settled
    state "REFUNDED" as Refunded

    [*] --> Pending: Sponsor Creates Bounty
    Pending --> Open: Admin Confirms Escrow Deposit
    Pending --> Refunded: Deposit Rejected / Invalid
    Open --> InReview: Deadline Elapses or Cap Met
    InReview --> Settled: Admin Scores & Disburses Escrow
    InReview --> Refunded: Expired with Zero Valid Submissions
    Settled --> [*]: USDC Transferred & Recorded in Ledger
    Refunded --> [*]: Escrow Reclaimed by Sponsor
```

---

## Why Circle Arc L1 is load-bearing for ArcBounty

ArcBounty cannot deliver its zero-gas, sub-second user experience on legacy EVM chains. Circle's Arc Layer-1 network (`eip155:5042`) provides foundational architectural capabilities purpose-built for stablecoin-denominated platforms:

| Arc Native Capability | How ArcBounty Leverages It | What Breaks Without It |
| :--- | :--- | :--- |
| **Native USDC Gas Accounting** | Gas fees are natively paid and accounted in USDC. | On Ethereum or Base, users must acquire and balance volatile ETH just to pay gas. |
| **Canonical EIP-3009 Support** | Canonical Arc USDC (`0x3600...0000`) natively supports `transferWithAuthorization`. | Legacy tokens require a 2-step `approve()` + `transferFrom()` transaction model. |
| **Sub-Second Malachite BFT Finality** | Sub-second deterministic block inclusion. | 15–30s confirmation delays cause sluggish UI updates and race conditions during submissions. |
| **Predictable Sequencer Gas Floor** | Arc enforces a predictable $\ge 20\text{ Gwei}$ sequencer fee floor. | Wild gas spikes make platform-subsidized creator settlements economically unsustainable. |

---

## Security properties & architectural invariants

### 1. Blind Submissions Privacy
To protect intellectual property, prevent plagiarism, and ensure impartial evaluation:
- Unauthenticated visitors and rival contributors querying `GET /api/bounties/:id` receive only the aggregate `submissionsCount`.
- Deliverable URLs, notes, collaborator lists, and contributor names are stripped from the payload.
- Only the **submitting creator** (via their authenticated session token) can view and revise their own submission.
- Full submission details are accessible exclusively by the **Master Administrator** for scoring.

### 2. Anti-Race-Condition Single Submission Rule
```text
CONSTRAINT unique_submission_per_creator:
  WHERE bounty_id = :bountyId AND (
    creator_id = :userId OR 
    LOWER(wallet_address) = LOWER(:walletAddress) OR 
    LOWER(creator_email) = LOWER(:email)
  )
```
Contributors cannot submit multiple entries to the same challenge. Attempting a duplicate submission returns `HTTP 400 Bad Request`. Contributors must use `PUT /api/bounties/:id/submissions/:submissionId` to revise their existing entry prior to the deadline, preserving version history (`revisionCount`).

### 3. Sponsor Self-Participation Prevention
Sponsors are strictly prohibited from participating in or claiming prizes from bounties they authored:
```javascript
if (
  (bounty.maintainerEmail && submitterEmail === bounty.maintainerEmail) ||
  (bounty.maintainer && submitterWallet === bounty.maintainer)
) {
  return res.status(403).json({ error: 'Bounty creators cannot participate in their own bounties.' });
}
```

### 4. Single Master Administrator Policy
Administrative authority (bounty approval, rubric scoring, and escrow settlement) is strictly gated to `olajideabdulquadri22@gmail.com`:
- Non-admin sessions attempting administrative actions receive an immediate `403 Forbidden`.
- The Admin Portal is fortified behind a secondary master password gate (`ADMIN_PASSWORD`).
- Session tokens expire automatically after 24 hours.

### 5. Dual-Engine Database Consistency
```text
┌─────────────────────────────────┐
│     Client Request (Port 5173)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Express Facilitator API      │
└────────┬───────────────┬────────┘
         │               │
         ▼ (<1ms)        ▼ (Pooled AWS)
┌─────────────────┐   ┌───────────────────────────┐
│ Embedded SQLite │   │ Supabase PostgreSQL Pool  │
│  (WAL Mode)     │   │   (Max 25 Connections)    │
└─────────────────┘   └───────────────────────────┘
```
- **Local Engine**: Embedded SQLite in Write-Ahead Log (WAL) mode provides sub-millisecond local reads and transactional safety.
- **Production Engine**: Supabase PostgreSQL with AWS connection pooling handles horizontal scaling and multi-region resilience.

---

## How It Was Built (Full Tech Stack & Tools)

### 1. Blockchain & Smart Contracts Layer
* **Circle Arc Mainnet (Chain ID: 5042)**: EVM-compatible Layer-1 optimized for institutional stablecoin finance and deterministic finality.
* **Canonical Circle USDC (`0x3600000000000000000000000000000000000000`)**: Native gas and payment token.
* **ArcBountyEscrow.sol**: Non-custodial escrow smart contract facilitating multi-challenge deposits, EIP-3009 disbursements, and sponsor refund locks.
* **EIP-712 & EIP-3009**: Off-chain typed data authorization signatures for secure, gasless settlement.
* **Arc Foundry (arc-forge, arc-cast)**: Contract compilation, fuzz testing, and deployment.

### 2. Backend & Facilitator Relayer Engine
* **Node.js (ESM) & Express**: High-concurrency REST API serving protocol telemetry, bounty lifecycles, and admin governance.
* **Viem**: High-performance, lightweight Web3 library for cryptographic signature verification, address recovery, and RPC communication with Arc L1.
* **Dual Database Architecture**:
  * **Embedded SQLite**: High-speed local cache with WAL mode and foreign key constraints.
  * **Supabase PostgreSQL**: Production connection pooling (AWS eu-west-2) for high concurrency.
* **Nodemailer with Gmail SMTP**: Cryptographic 6-digit OTP delivery with 10-minute expiry and single-use invalidation.
* **Scrypt Password Hashing**: Salted, memory-hard credential storage for standard email authentication.

### 3. Frontend & Mobile Client
* **React 19 & Vite 8**: Ultra-fast component rendering and production bundle compilation in $<450\text{ms}$.
* **Neo-Brutalist Design System**: High-contrast, accessibility-tested visual hierarchy featuring bold borders (`2.5px solid #000000`), tactile drop-shadows (`4px 4px 0px #000000`), and curated color palettes.
* **Responsive Mobile Dock**: Thumb-accessible bottom navigation bar (`Explore`, `Profile`, `+ Create`, `Ranks`, `Wallet`) optimized for mobile viewports.
* **Lucide React & Canvas Confetti**: Lightweight vector iconography and celebratory micro-animations on successful disbursements.

---

## The Smart Contract & Settlement Specification

### Escrow Contract Interface (`ArcBountyEscrow.sol`)

```solidity
interface IArcBountyEscrow {
    event BountyCreated(bytes32 indexed bountyId, address indexed sponsor, uint256 amount);
    event BountyDisbursed(bytes32 indexed bountyId, address indexed recipient, uint256 amount, bytes32 txHash);
    event BountyRefunded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount);

    function createBounty(bytes32 bountyId, uint256 amount, uint256 deadlineDays) external;
    function disburseReward(bytes32 bountyId, address payable recipient, uint256 amount) external;
    function disburseMultiWinner(bytes32 bountyId, address[] calldata recipients, uint256[] calldata amounts) external;
    function refundBounty(bytes32 bountyId) external;
}
```

---

## Verify it yourself

You can independently verify the entire ArcBounty system locally using the automated test suites and agent verification runner:

### 1. Run Backend Unit & Integration Tests (35 Tests)
```bash
cd server
npm test
```
*Executes all 35 tests covering escrow disbursements, single-submission constraints, deadline expiration, admin passwords, rubric scoring, and SQLite auth.*

### 2. Run Autonomous End-to-End Audit Runner
```bash
cd server
node test/agent_e2e_verification.js
```
*Simulates a complete real-world flow: User Registration &rarr; Sponsor Bounty Creation &rarr; Admin Review &rarr; Contributor Blind Submission &rarr; Revision &rarr; Rubric Scoring &rarr; Arc L1 USDC Disbursement &rarr; CSV Ledger Export.*

### 3. Verify Client Production Build & Linting
```bash
cd client
npm run lint
npm run build
```
*Runs `oxlint` across all 29 client files and builds the production bundle with Vite in $<450\text{ms}$.*

---

## Deployment Guide (Render & Vercel)

### 1. Deploy the Backend on Render

The repository includes a ready-to-use [`render.yaml`](render.yaml) blueprint:

1. In the **Render Dashboard**, click **New +** &rarr; **Blueprint**.
2. Select your repository: `Blackwrld04/ArcBounty`.
3. Configure the following environment variables:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `PORT` | Facilitator listening port | `4050` |
| `NODE_ENV` | Environment mode | `production` |
| `ARC_RPC_URL` | Circle Arc Mainnet RPC | `https://rpc.mainnet.arc.io` |
| `ARC_CHAIN_ID` | Circle Arc Chain ID | `5042` |
| `DATABASE_URL` | Supabase PostgreSQL Connection URI | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `GMAIL_USER` | Gmail address for OTP delivery | `your_email@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password | `xxxx xxxx xxxx xxxx` |
| `ADMIN_EMAILS` | Authorized platform admin | `xxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `ADMIN_PASSWORD` | Master password for admin portal | `[Your_Secure_Password]` |
| `ESCROW_CONTRACT_ADDRESS` | Deployed ArcBountyEscrow contract | `0x7Cd0F0db26f47dFa757014a8f756506B9F32F823` |
| `FACILITATOR_PRIVATE_KEY` | Relayer private key on Arc L1 | `0x[64_hex_characters]` |

### 2. Deploy the Frontend on Vercel

The repository includes pre-configured [`client/vercel.json`](client/vercel.json) and [`vercel.json`](vercel.json) for instant SPA routing:

1. In the **Vercel Dashboard**, click **Add New...** &rarr; **Project**.
2. Choose **GitHub** and import `Blackwrld04/ArcBounty`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://arcbounty.onrender.com`).
5. Click **Deploy**.

---

## Engineering decisions

1. **Why Blind Submissions instead of Open PRs?**  
   In competitive contests, open submissions lead to "last-minute copycat" behavior where participants duplicate earlier submissions with minor tweaks. Blind submissions ensure every participant is rewarded strictly on the originality and merit of their work.
2. **Why SQLite + Supabase Dual-Engine?**  
   Local SQLite WAL mode guarantees sub-millisecond response times for local testing, offline development, and lightning-fast reads. Connecting Supabase PostgreSQL through connection pooling ensures that production traffic spikes and multi-region read replicas scale horizontally without deadlocks.
3. **Why EIP-3009 instead of standard ERC-20 `approve()`?**  
   Standard `approve` + `transferFrom` requires two separate transactions and forces creators to spend gas. EIP-3009 enables off-chain authorization signatures, allowing the platform to settle payouts gaslessly for contributors.
4. **Why Neo-Brutalist UI?**  
   Clean neo-brutalism provides unmistakable tactile feedback, high visual contrast, and immediate clarity. Buttons, cards, and modal windows have distinct interactive boundaries that function identically on 4K desktop displays and small mobile screens.

---

## Repository map

```text
arcbounty/
├── .gitignore                     # Strict exclusion of .env, database files, and build outputs
├── package.json                   # Root workspace scripts (dev, build, server, test)
├── vercel.json                    # Vercel Edge CDN configuration, security headers & SPA rewrites
├── render.yaml                    # Render Web Service Blueprint for the Facilitator API
├── README.md                      # Complete system documentation & architectural reference
│
├── client/                        # React 19 Frontend Application
│   ├── index.html                 # HTML5 shell with Google Fonts typography
│   ├── vercel.json                # Client-scoped SPA rewrites and immutable asset caching
│   ├── vite.config.js             # Vite 8 bundler configuration
│   └── src/
│       ├── App.jsx                # Main application state, navigation, and modal coordinator
│       ├── index.css              # Neo-brutalist design system & mobile media queries
│       ├── components/
│       │   ├── Navbar.jsx         # Header navigation, search, and wallet drawer trigger
│       │   ├── Hero.jsx           # Value proposition banner & live settlement metrics
│       │   ├── BountyList.jsx     # Filterable opportunity explorer (Content, Design, Dev, Social)
│       │   ├── BountyCard.jsx     # Individual bounty card with prize pills & deadline timers
│       │   ├── BountyDetailModal.jsx # Full challenge details, blind submission, & discussion Q&A
│       │   ├── CreateBountyModal.jsx # Sponsor creation flow with prize breakdown
│       │   ├── UserProfile.jsx    # Creator profile, proof-of-work portfolio, & rank stats
│       │   ├── AccountSettings.jsx# Profile settings, bio, avatar presets, & social linkers
│       │   ├── AdminDashboard.jsx # Protected governance console, rubric grading, & CSV export
│       │   ├── AuthModal.jsx      # Multi-step signup, email OTP, & password authentication
│       │   ├── ConnectWalletModal.jsx # Web3 wallet connector (MetaMask, Phantom, Rabby, Coinbase)
│       │   ├── WalletDrawer.jsx   # Slide-out balance inspection & payout transaction ledger
│       │   ├── Leaderboard.jsx    # Verified community rankings & earnings leaderboard
│       │   └── LegalModal.jsx     # Terms of service, protocol rules, & developer API docs
│       └── utils/
│           ├── api.js             # Centralized API base URL resolver (VITE_API_URL)
│           ├── arc.js             # Arc Mainnet & Testnet chain definitions (EIP-155: 5042)
│           ├── sync.js            # Universal intra-app and cross-tab sync listener
│           └── time.js            # Relative timestamp and deadline countdown utilities
│
├── server/                        # Express Backend & Settlement Relayer Engine
│   ├── schema.sql                 # Canonical PostgreSQL DDL schema with relational tables
│   ├── src/
│   │   ├── index.js               # Server entrypoint and route mounting
│   │   ├── config.js              # Network constants, chain IDs, and environment loader
│   │   ├── db.js                  # Embedded SQLite engine with WAL mode and atomic triggers
│   │   ├── supabase.js            # Supabase PostgreSQL connection pooler (25 pooled clients)
│   │   ├── email.js               # Gmail SMTP transporter for 6-digit OTP delivery
│   │   ├── facilitator.js         # Viem settlement relayer and EIP-712 domain hasher
│   │   └── routes/
│   │       ├── auth.js            # Signup, login, email OTP, SIWE wallet challenge, profile update
│   │       ├── bounties.js        # Bounty CRUD, blind submission, revisions, community Q&A
│   │       ├── admin.js           # Admin password login, rubric scoring, disbursement, CSV export
│   │       └── stats.js           # Protocol volume, escrow totals, and platform telemetry
│   └── test/
│       ├── admin_bounties.test.js # Core escrow disbursement & single-submission test suite
│       ├── auth.test.js           # SQLite authentication & OTP verification tests
│       ├── gap_features.test.js   # Revisions, Q&A discussions, and rubric scoring tests
│       └── agent_e2e_verification.js # Autonomous end-to-end full system verification suite
│
├── contracts/                     # Smart Contracts Layer
│   ├── ArcBountyEscrow.sol        # Core escrow smart contract with EIP-3009 integration
│   ├── ArcBountyEscrow_flat.sol   # Flattened Solidity file for 1-click explorer verification
│   ├── abi.js                     # Exported contract ABI definitions for Viem
│   ├── foundry.toml               # Arc Foundry build and test configurations
│   └── deploy.sh                  # Shell deployment script using arc-forge and arc-cast
│
└── docs/                          # Protocol Specifications & Legal Standards
    ├── DOCUMENTATION.md           # Architecture deep-dive & developer integration manual
    └── TERMS_OF_SERVICE.md        # Terms of service, escrow rules, and originality standards
```

---

## Disclosures & license

* **Protocol Status**: ArcBounty is production software deployed on Circle Arc Mainnet (Chain ID 5042).
* **Non-Custodial Guarantee**: At no point does ArcBounty hold creator private keys. Funds are locked exclusively within the escrow contract until conditions are satisfied.
* **License**: Open-source software released under the [MIT License](LICENSE).
