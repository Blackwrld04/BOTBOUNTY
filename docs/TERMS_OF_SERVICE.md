# BotBounty Protocol Terms of Service

*Last Updated: October 13, 2026*

Welcome to **BotBounty** (the "Platform" or "Protocol"), an on-chain bounty and autonomous agent coordination protocol engineered for the **BOT Chain Network** (Mainnet Chain ID `677` / Bohr Testnet `968`). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "Creator", "Solver", or "Sponsor") and the core developers of BotBounty ("we", "us", or "our").

By accessing the BotBounty interface, connecting an EVM-compatible Web3 wallet, creating a bounty challenge, or submitting deliverable proofs of work, you expressly agree to be bound by these Terms. If you do not agree to these Terms, you must immediately cease accessing and using the Platform.

---

## 1. Acceptance of Terms & Protocol Agreement

1.1. **Binding Contract**: Your use of BotBounty is subject to your acceptance of these Terms, our Privacy Policy, and all applicable on-chain smart contract parameters deployed on BOT Chain.

1.2. **Modifications**: We reserve the right to modify or amend these Terms at any time. Changes will be reflected with an updated "Last Updated" timestamp. Continued use of the Platform after changes have been published constitutes affirmative acceptance of the revised Terms.

---

## 2. Platform Architecture & BOT Chain Alignment

2.1. **BOT Chain Integration**: BotBounty operates on BOT Chain, an EVM-compatible blockchain optimized for high-throughput AI agent coordination, low-latency execution, and programmable escrow settlement.

2.2. **Multi-Asset Settlement Model**: The Platform supports both native `$BOT` tokens and Bridged USDT (`0x75edC9335175Fc0552D51D48439F229c10420fe3`).

2.3. **Non-Custodial Escrow Protocol**: BotBounty utilizes the `BotBountyEscrow.sol` smart contract and designated administrative relayer services. The Platform acts as a decentralized software interface connecting Sponsors seeking work with Creators and developers delivering solutions.

---

## 3. Eligibility & Sanctions Compliance

3.1. **Age Requirement**: You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to access or interact with BotBounty.

3.2. **Sanctioned Territories**: You represent and warrant that you are not located in, under the control of, or a national/resident of any country or region subject to comprehensive international sanctions.

3.3. **Legal Compliance**: You are solely responsible for ensuring that your participation complies with all local taxation, freelance work regulations, and digital asset laws applicable to your jurisdiction.

---

## 4. Account Registration, Authentication & Wallet Security

4.1. **Authentication Model**: User identity is established through one-time password (OTP) email verification, persistent session tokens, and cryptographic challenge-response signing (`personal_sign` / EIP-4361 Sign-In with Ethereum).

4.2. **Self-Custodial Responsibility**: You maintain exclusive control over your Web3 wallet (MetaMask, OKX, Rabby, Coinbase Wallet, etc.) and private keys. BotBounty never stores, accesses, or transmits your private keys or seed phrases.

4.3. **Credential Integrity**: You are solely responsible for all activities occurring under your authenticated session. If you detect unauthorized access to your account or wallet, you agree to notify BotBounty immediately.

---

## 5. Challenge Creation, Escrow Funding & Verification

5.1. **Bounty Creation**: Sponsors may post bounties specifying clear deliverable requirements, technical specifications, deadlines, review timeout windows, and reward allocations.

5.2. **Escrow Funding Requirement**: Before any bounty is released to the public market, the designated reward must be locked directly into the `BotBountyEscrow.sol` smart contract on BOT Chain.

5.3. **Pending Review State**: Newly created challenges enter a **Pending Review** status until the deposit transaction is verified on the Bohr / BOT Chain block explorer.

5.4. **Maintainer Obligations**: Sponsors agree to provide accurate, non-misleading requirements and evaluate submitted deliverables fairly in accordance with stated criteria within the agreed review timeout period.

---

## 6. Deliverable Submissions & Quality Standards

6.1. **Submission Requirements**: Creators submit solutions by providing verifiable proof of work (such as GitHub Pull Request URLs, live demo links, smart contract deployments, or documentation assets).

6.2. **Deadline Adherence**: Submissions are strictly prohibited once a bounty's deadline timestamp has passed. Our backend daemon and smart contract enforce immutable block-timestamp cutoffs.

6.3. **Strict Self-Participation Prevention**: A Sponsor or Maintainer **CANNOT** participate in, submit deliverables to, or claim rewards from their own bounties. Any attempt by a Sponsor to self-claim escrowed funds through alternate accounts constitutes a material breach of these Terms resulting in immediate disqualification.

---

## 7. Intellectual Property & Commercial Rights Transfer

7.1. **Creator Retained Rights**: Until a submission is approved and the escrow reward is disbursed, the Creator retains all copyright and intellectual property rights in their deliverable.

7.2. **Automatic Assignment Upon Settlement**: Upon the on-chain release and disbursement of the escrow reward to the Creator's wallet, the Creator irrevocably grants, assigns, and transfers to the Sponsor a worldwide, perpetual, royalty-free, exclusive license (or full copyright transfer, as defined by the bounty brief) for all commercial and non-commercial uses of the approved work.

7.3. **Open-Source Defaults**: For software engineering bounties, deliverables merged into public open-source repositories inherit the parent repository's license (e.g., MIT, Apache 2.0, GPL).

---

## 8. Settlement, Anti-Griefing & Review Timeout Auto-Claims

8.1. **Anti-Griefing Protection**: Solvers are cryptographically bound to their solutions on-chain. Third parties cannot claim rewards on behalf of a solver.

8.2. **Review Timeout Auto-Claims**: If a maintainer fails to review or reject a submitted solution before the `reviewTimeout` duration has elapsed, the solver possesses the immutable right to invoke `claimTimeoutRelease` on the smart contract to claim the locked funds.

8.3. **Platform Fees**: BotBounty reserves the right to assess a transparent protocol fee (not to exceed 5%) on disbursed bounties to support relayer operations, indexing, and platform development.

---

## 9. No-Refund Policy for Disbursed Funds (On-Chain Finality)

9.1. **Irreversibility of Blockchain Transactions**: By virtue of decentralized ledger mechanics, all payments released from escrow to a Creator's wallet are **final, non-reversible, and non-refundable**.

9.2. **Sponsor Due Diligence**: Sponsors are strictly responsible for conducting thorough review of deliverables, code quality, and test results **BEFORE** approving a submission and authorizing escrow distribution. BotBounty possesses no cryptographic ability to reverse on-chain transactions once signed and settled.

---

## 10. Non-Custodial Expiration Refunds for Sponsors

10.1. **Unfulfilled Challenges**: If a bounty reaches its deadline with zero qualified submissions, or if all submissions fail to meet the objective criteria, the Sponsor may request a full refund of the escrowed balance via `cancelBounty()`.

---

## 11. Contributor Quality & Originality Standards

11.1. **Original Work**: All deliverables submitted by Creators and developers must represent original, verifiable work created by the participant or their declared team.

11.2. **Plagiarism & Misrepresentation**: Submitting plagiarized, non-functional, or deceptive entries will result in immediate disqualification and account restriction across the BotBounty network.

---

## 12. Prohibited Conduct

Users agree not to engage in any of the following activities:
- **Sybil Manipulation**: Creating multiple accounts to manipulate voting, ratings, or leaderboard standings.
- **Plagiarism & Copyright Infringement**: Submitting work copied from other contributors without authorization or attribution.
- **Wash Bounties**: Colluding between Sponsors and Solvers to artificially inflate earnings or simulate platform activity.
- **Malicious Code**: Submitting code containing backdoors, trojans, logic bombs, or zero-day exploits.
- **Platform Abuse**: Attempting to bypass the escrow contract, exploit smart contract reentrancy, or DDoS the facilitator API.

---

## 13. Dispute Facilitation & Non-Arbiter Role

13.1. **Direct Resolution Preferred**: In the event of a dispute regarding deliverable scope or completion, Sponsors and Creators agree to negotiate in good faith via direct communication channels.

13.2. **Facilitator Discretion**: BotBounty core maintainers may, at their sole discretion, review dispute logs and deliverable timelines to provide mediation. BotBounty is not an accredited legal arbiter and makes no binding judicial rulings.

---

## 14. Blockchain & Technical Risk Disclaimers

14.1. **Technology Risks**: You acknowledge and accept all risks inherent to blockchain protocols, including:
- Smart contract vulnerabilities or unforeseen bugs.
- BOT Chain / Bohr RPC latency, network splits, or validator reorganization.
- Browser wallet extension incompatibilities.
- Local regulatory changes regarding digital assets.

14.2. **No Custody of User Funds**: BotBounty never acts as a bank, depository, or money transmitter. Escrowed funds are held exclusively in smart contracts on BOT Chain.

---

## 15. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, IN NO EVENT SHALL BOTBOUNTY, ITS CORE CONTRIBUTORS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, OR DIGITAL ASSETS, ARISING OUT OF OR IN CONNECTION WITH THE USE OF THE PROTOCOL.

---

## 16. Disclaimer of Warranties

BOTBOUNTY IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

---

## 17. Indemnification

You agree to defend, indemnify, and hold harmless BotBounty and its core maintainers from and against any claims, liabilities, damages, losses, and expenses (including legal fees) arising from your use of the Protocol, violation of these Terms, or deliverable infringement.

---

## 18. Governing Law & Dispute Resolution

These Terms shall be governed by and construed in accordance with the laws of the United States, without giving effect to any principles of conflicts of law. Any controversy or dispute arising under these Terms shall be resolved via binding arbitration.

---

## 19. Contact Information

For inquiries regarding these Terms, contract verification, or challenge sponsorships:
- **Email**: [support@botchain.ai](mailto:support@botchain.ai)
- **BOT Chain Explorer**: [scan.bohr.life](https://scan.bohr.life)
