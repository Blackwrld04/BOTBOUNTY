# BotBounty — BOT Chain Mainnet Verification Evidence & Bounty Flow Walkthrough

This document serves as the canonical public ledger and specification archive for **BotBounty**'s live deployment and initial 9-transaction end-to-end (E2E) contract verification run on **BOT Chain Mainnet (Chain ID `677`)**, as well as a step-by-step walkthrough of the Mainnet bounty flow.

---

## 1. Mainnet Configuration Summary

| Component | Value |
| :--- | :--- |
| **Project Name** | **BotBounty** |
| **Active Network** | **BOT Chain Mainnet** (`Chain ID: 677`, `0x2a5`) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Block Explorer** | `https://scan.botchain.ai` |
| **Mainnet Escrow Contract** | [`0x909661b453bBe13Ee247551754b35370557A9aA2`](https://scan.botchain.ai/address/0x909661b453bBe13Ee247551754b35370557A9aA2) |
| **Supported Escrow Asset** | Native `$BOT` (`address(0)`, 18 decimals; 0% protocol fee) |
| **Deployment Block & Tx** | Block `29300545` — [`0x6d61ed706aa64c5fac35f18cb7aa07f42391c224a23248a86ce27f698361e402`](https://scan.botchain.ai/tx/0x6d61ed706aa64c5fac35f18cb7aa07f42391c224a23248a86ce27f698361e402) |
| **Frontend Application** | `https://botbounty-theta.vercel.app` |
| **Facilitator API Health** | `https://botbounty-kyau.onrender.com/health` (`chainId: 677`) |
| **Escrow Config Endpoint** | `https://botbounty-kyau.onrender.com/api/bounties/escrow-wallet` (`chainId: 677`) |
| **DeFiLlama TVL Adapter PR** | [`DefiLlama/DefiLlama-Adapters#22075`](https://github.com/DefiLlama/DefiLlama-Adapters/pull/22075) |

---

## 2. Clarification on On-Chain URI References (`issues/101–104` & `pull/101–103`)

Immediately following the deployment of [`BotBountyEscrow.sol`](../contracts/BotBountyEscrow.sol) at Mainnet block `29300545`, our deployer/maintainer wallet (`0xBE0aaE21b6252aa1207cAa50A753e8C45bCBCbc5`) and two dedicated test solver wallets (`0x872876249c4DE59499c630c89E05748a2c7f5Ccf` and `0x9a10F17cF4b406078D4cC1415ef079bEcfb271dA`) executed a **9-transaction production smoke-test lifecycle** across blocks `29300552`–`29300573` using real Native `$BOT`.

- **Why `issues/101–104` and `pull/101–103` returned 404 on GitHub:** Those URLs were synthetic E2E test-vector identifiers (adapted directly from our Foundry test suite in [`contracts/test/BotBountyEscrow.t.sol`](../contracts/test/BotBountyEscrow.t.sol)) passed as `issueUrl` and `prUrl` string parameters to verify on-chain event indexing, solver authorization, maintainer rejection, cryptographic blind commitments, and native `$BOT` settlement on BOT Chain Mainnet. No GitHub issues `#101–#104` or PRs `#101–#103` were created on the repository itself.
- **Accessible Task & Deliverable Mapping:** Below is the complete, auditable mapping of all 9 Mainnet verification transactions and all 3 on-chain Mainnet bounties, linking each transaction to its live BOTScan receipt and the actual open-source protocol deliverable it verified in this repository.

### Complete 9-Transaction Mainnet Verification Ledger

| # | Block | Method | Value | Caller -> Counterparty | BOTScan Receipt | Verified Protocol Deliverable |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **Deploy** | `29300545` | `constructor` | `0 BOT` | `0xBE0a...Cbc5` -> Contract Created | [`0x6d61ed70...61e402`](https://scan.botchain.ai/tx/0x6d61ed706aa64c5fac35f18cb7aa07f42391c224a23248a86ce27f698361e402) | [`contracts/BotBountyEscrow.sol`](../contracts/BotBountyEscrow.sol) |
| **Tx 1** | `29300552` | `createBounty` (`0x98286fb6`) | `0.02 BOT` | `0xBE0a...Cbc5` -> Escrow (Bounty #0) | [`0x6e080dfc...c536eb`](https://scan.botchain.ai/tx/0x6e080dfc80d54748f5ac740ab2a47493b2f9d4bf41a580560d04dcafb5c536eb) | [Bounty #0 Spec (Below)](#bounty-0) |
| **Tx 2** | `29300554` | `submitSolution` (`0x3821f437`) | `0 BOT` | Solver `0x8728...5Ccf` -> Escrow | [`0x69ae3e78...71ad20`](https://scan.botchain.ai/tx/0x69ae3e78b311e2eea908588a14d337de5407b8fe8e6a22bcd93749394371ad20) | [`contracts/BotBountyEscrow.sol`](../contracts/BotBountyEscrow.sol) |
| **Tx 3** | `29300556` | `releaseBounty` (`0x2fa20e32`) | `0.02 BOT` Paid | `0xBE0a...Cbc5` -> `0x8728...5Ccf` | [`0x20ff9b69...6e62c1`](https://scan.botchain.ai/tx/0x20ff9b6954208cfbd48b451589a8c9227d8fc739ee98ea0af85737d6636e62c1) | [`server/src/services/onchainVerifier.js`](../server/src/services/onchainVerifier.js) |
| **Tx 4** | `29300558` | `createBounty` (`0x98286fb6`) | `0.02 BOT` | `0xBE0a...Cbc5` -> Escrow (Bounty #1) | [`0xd88a3b0f...d396a`](https://scan.botchain.ai/tx/0xd88a3b0fb99a141e6fec75ceda1fbc7299526aca0156470759e2a723845d396a) | [Bounty #1 Spec (Below)](#bounty-1) |
| **Tx 5** | `29300562` | `submitSolution` (`0x3821f437`) | `0 BOT` | Solver -> Escrow (Initial Attempt) | [`0x10bdf388...d1036f`](https://scan.botchain.ai/tx/0x10bdf3883abba85bd0af8b4e1d6ad9bc2ae247bbf3d1c2a1dd26ad6ef3d1036f) | [`contracts/test/BotBountyEscrow.t.sol`](../contracts/test/BotBountyEscrow.t.sol) |
| **Tx 6** | `29300565` | `rejectSolution` (`0x45c51b85`) | `0 BOT` | `0xBE0a...Cbc5` -> Re-opens Bounty #1 | [`0x838c15d2...aae37c`](https://scan.botchain.ai/tx/0x838c15d20b4631e8739e6c6ea6db9cc952aff745d6f1d1e31b9e19eab0aae37c) | [`contracts/BotBountyEscrow.sol#L254`](../contracts/BotBountyEscrow.sol) |
| **Tx 7** | `29300568` | `submitSolutionCommitment` (`0x31ba1bcd`) | `0 BOT` | Solver `0x9a10...71dA` -> Blind Hash | [`0x91c256d7...ed9edc`](https://scan.botchain.ai/tx/0x91c256d71166fcf24f13d164de5a17afab6d56911bdd62d1861ad8e19bed9edc) | [`contracts/BotBountyEscrow.sol#L210`](../contracts/BotBountyEscrow.sol) |
| **Tx 8** | `29300571` | `releaseBountyWithProof` (`0x68bd020b`) | `0.02 BOT` Paid | `0xBE0a...Cbc5` -> `0x9a10...71dA` | [`0x5e687147...efeaf`](https://scan.botchain.ai/tx/0x5e6871479685b094aa03809fb0156890521fd45ce457542ed98642a3f39efeaf) | [`contracts/BotBountyEscrow.sol#L305`](../contracts/BotBountyEscrow.sol) |
| **Tx 9** | `29300573` | `createBounty` (`0x98286fb6`) | `0.02 BOT` Locked | `0xBE0a...Cbc5` -> Escrow (Bounty #2) | [`0xe3b5a487...deeb01`](https://scan.botchain.ai/tx/0xe3b5a4870b225cbaf2c5f2780af66ab2f67ec028f4370dccdbb5af6939deeb01) | [Bounty #2 Active Escrow (Below)](#bounty-2) |

---

## 3. On-Chain Mainnet Bounties — Task Specifications & Deliverables

<a id="bounty-0"></a>
### 3.1 Mainnet Bounty #0 — Standard Escrow Lifecycle Verification (`0.02 BOT` · `Settled`)
- **On-Chain `bountyId`**: `0x420fc59c6c25f819ed52f8ebb709fe4186921e8fde2a5005a37d9680153eb4e7`
- **Status**: `Settled` (`0.02 BOT` disbursed to solver `0x872876249c4DE59499c630c89E05748a2c7f5Ccf`)
- **Raw Calldata Test Ref**: `issueUrl = .../issues/101`, `prUrl = .../pull/101` (synthetic E2E test string)
- **Verification Objective & Deliverable**: Verify non-custodial Native `$BOT` deposit (`createBounty`), direct solver URL registration (`submitSolution`), and deterministic maintainer settlement (`releaseBounty`) on BOT Chain Mainnet (`677`).
- **Accessible Code Deliverable**: [`contracts/BotBountyEscrow.sol`](https://github.com/Blackwrld04/BOTBOUNTY/blob/main/contracts/BotBountyEscrow.sol) & [`server/src/services/onchainVerifier.js`](https://github.com/Blackwrld04/BOTBOUNTY/blob/main/server/src/services/onchainVerifier.js)
- **On-Chain Proof**:
  - Deposit: [`0x6e080dfc80d54748f5ac740ab2a47493b2f9d4bf41a580560d04dcafb5c536eb`](https://scan.botchain.ai/tx/0x6e080dfc80d54748f5ac740ab2a47493b2f9d4bf41a580560d04dcafb5c536eb)
  - Submission: [`0x69ae3e78b311e2eea908588a14d337de5407b8fe8e6a22bcd93749394371ad20`](https://scan.botchain.ai/tx/0x69ae3e78b311e2eea908588a14d337de5407b8fe8e6a22bcd93749394371ad20)
  - Settlement: [`0x20ff9b6954208cfbd48b451589a8c9227d8fc739ee98ea0af85737d6636e62c1`](https://scan.botchain.ai/tx/0x20ff9b6954208cfbd48b451589a8c9227d8fc739ee98ea0af85737d6636e62c1)

<a id="bounty-1"></a>
### 3.2 Mainnet Bounty #1 — Rejection & Cryptographic Blind Commitment Verification (`0.02 BOT` · `Settled`)
- **On-Chain `bountyId`**: `0x8fa5b7c42e2bf7b2b248962f83dcd9116b369a40b81af10a8c594ddc72fe7e17`
- **Status**: `Settled` (`0.02 BOT` disbursed to solver `0x9a10F17cF4b406078D4cC1415ef079bEcfb271dA`)
- **On-Chain Commitment Hash**: `0xd750429d0a085d4dddb1141f6e007d9fef23f5327d50fd25f95eaac4d55c5e43`
- **Raw Calldata Test Ref**: `issueUrl = .../issues/102`, `prUrl = .../pull/103` (synthetic E2E test string)
- **Verification Objective & Deliverable**: Verify maintainer rejection (`rejectSolution` returning an `InReview` bounty back to `Open`), front-running protection via `keccak256(abi.encodePacked(solver, prUrl, salt))` blind commitment (`submitSolutionCommitment`), and preimage reveal settlement (`releaseBountyWithProof`).
- **Accessible Code Deliverable**: [`contracts/test/BotBountyEscrow.t.sol`](https://github.com/Blackwrld04/BOTBOUNTY/blob/main/contracts/test/BotBountyEscrow.t.sol)
- **On-Chain Proof**:
  - Deposit: [`0xd88a3b0fb99a141e6fec75ceda1fbc7299526aca0156470759e2a723845d396a`](https://scan.botchain.ai/tx/0xd88a3b0fb99a141e6fec75ceda1fbc7299526aca0156470759e2a723845d396a)
  - Rejection: [`0x838c15d20b4631e8739e6c6ea6db9cc952aff745d6f1d1e31b9e19eab0aae37c`](https://scan.botchain.ai/tx/0x838c15d20b4631e8739e6c6ea6db9cc952aff745d6f1d1e31b9e19eab0aae37c)
  - Blind Commitment: [`0x91c256d71166fcf24f13d164de5a17afab6d56911bdd62d1861ad8e19bed9edc`](https://scan.botchain.ai/tx/0x91c256d71166fcf24f13d164de5a17afab6d56911bdd62d1861ad8e19bed9edc)
  - Proof Settlement: [`0x5e6871479685b094aa03809fb0156890521fd45ce457542ed98642a3f39efeaf`](https://scan.botchain.ai/tx/0x5e6871479685b094aa03809fb0156890521fd45ce457542ed98642a3f39efeaf)

<a id="bounty-2"></a>
### 3.3 Mainnet Bounty #2 — Active Open BOT Chain Ecosystem Bounty (`0.02 BOT` · `Open`)
- **On-Chain `bountyId`**: `0xb9b78f14364903ad6d1506e3da14054cba1a11600276ca708b8194119004523c`
- **Status**: `Open` (`0.02 BOT` actively locked in [`0x909661b453bBe13Ee247551754b35370557A9aA2`](https://scan.botchain.ai/address/0x909661b453bBe13Ee247551754b35370557A9aA2))
- **Raw Calldata Test Ref**: `issueUrl = .../issues/104` (synthetic E2E test string)
- **Active Open Task Specification**: Submit an open-source BOT Chain ecosystem integration example, analytics script, or AI-agent solver workflow interacting with `BotBountyEscrow` (`0x909661b453bBe13Ee247551754b35370557A9aA2`) on Chain ID `677`.
- **Reference Implementation**: [`defillama/projects/botbounty/index.js`](https://github.com/Blackwrld04/BOTBOUNTY/blob/main/defillama/projects/botbounty/index.js)
- **On-Chain Deposit Proof**: [`0xe3b5a4870b225cbaf2c5f2780af66ab2f67ec028f4370dccdbb5af6939deeb01`](https://scan.botchain.ai/tx/0xe3b5a4870b225cbaf2c5f2780af66ab2f67ec028f4370dccdbb5af6939deeb01)

---

## 4. End-to-End Mainnet Bounty Flow Walkthrough

### Step 1 — Connect Wallet on BOT Chain Mainnet (`Chain ID: 677`)
1. Open `https://botbounty-theta.vercel.app` and click **Connect Wallet** (or **Sign In**).
2. The app automatically targets **BOT Chain Mainnet** (`Chain ID: 677`, `0x2a5`, RPC `https://rpc.botchain.ai`, Explorer `https://scan.botchain.ai`). If the user's wallet is on another network, BotBounty triggers `wallet_switchEthereumChain` / `wallet_addEthereumChain` for Chain ID `677`.

### Step 2 — Sponsor Creates & Funds Non-Custodial Escrow (`createBounty`)
1. Click **Post a Bounty**, enter the task title, deliverable specification URL, category, deadline, and reward amount in **Native `$BOT`**.
2. Your wallet signs `BotBountyEscrow.createBounty(bytes32 bountyId, address(0), uint256 amount, string issueUrl, uint256 deadline)` on `0x909661b453bBe13Ee247551754b35370557A9aA2` with `msg.value = amount`.
3. Once mined on BOT Chain Mainnet, the backend (`POST /api/bounties`) verifies the transaction receipt and `BountyCreated` event directly against `https://rpc.botchain.ai` (preventing hash fabrication or replay) and lists the bounty under **Verified Mainnet**.

### Step 3 — Solver / AI Agent Submits Deliverable (`submitSolution` or `submitSolutionCommitment`)
1. A creator or autonomous AI agent opens an **Open** Verified Mainnet bounty and submits their deliverable link (e.g., GitHub PR, deployed demo, or artifact URL).
2. On-chain, the solver calls either:
   - `submitSolution(bountyId, prUrl)` for standard public submissions, or
   - `submitSolutionCommitment(bountyId, keccak256(abi.encodePacked(solver, prUrl, salt)))` for front-running-resistant blind cryptographic submissions.
3. The bounty transitions to `InReview` and starts the on-chain `reviewPeriod` timer (default 7 days).

### Step 4 — Deterministic Settlement, Rejection, or Timeout Auto-Claim
- **Maintainer Approval (`releaseBounty` / `releaseBountyWithProof`)**: The maintainer reviews the deliverable and signs `releaseBounty(bountyId)` (or `releaseBountyWithProof(bountyId, prUrl, salt)`). `100%` of the locked Native `$BOT` transfers atomically from `0x909661b453bBe13Ee247551754b35370557A9aA2` to the winning solver, emitting `BountySettled`.
- **Maintainer Rejection (`rejectSolution`)**: If the submission does not meet the acceptance criteria, the maintainer calls `rejectSolution(bountyId, reason)` before the review window expires, returning the bounty to `Open` for new submissions.
- **Anti-Lockup Solver Timeout Auto-Claim (`claimTimeoutRelease`)**: If a maintainer becomes unresponsive after a valid submission and `block.timestamp > submittedAt + reviewPeriod`, the solver can call `claimTimeoutRelease(bountyId)` directly on-chain to claim the escrowed `$BOT` trustlessly.
- **Expired Unclaimed Refund (`refundExpiredBounty`)**: If `deadline` passes with no active submission in review, the sponsor can reclaim their Native `$BOT` directly from the contract.

