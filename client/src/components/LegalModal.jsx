import React, { useState } from 'react';
import { X, FileText, Shield, HelpCircle, Mail, MessageSquare, ExternalLink, BookOpen, CheckCircle, AlertTriangle, Coins, Zap, Terminal } from 'lucide-react';

export default function LegalModal({ type, onClose }) {
  const [activeDocsTab, setActiveDocsTab] = useState('overview');

  if (!type) return null;

  const contentMap = {
    terms: {
      title: 'Terms of Service',
      subtitle: 'BotBounty Protocol Rules, On-Chain Escrow & BOT Chain Alignment',
      icon: <FileText size={20} color="#1b3158" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.65 }}>
          <div style={{ background: '#f1f5f9', border: '1.5px solid #000000', borderRadius: '8px', padding: '10px 14px', fontSize: '0.78rem', color: '#1e293b' }}>
            <strong>Protocol Notice:</strong> BotBounty operates natively on <strong>BOT Chain</strong> (Chain ID 677 Mainnet / 968 Testnet) with smart contract escrow deposits in USDT and $BOT. All settled disbursements are permanent and governed by on-chain consensus.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>1. Acceptance of Terms</strong>
            By accessing BotBounty, authenticating via email OTP, connecting a Web3 wallet, creating a challenge, or submitting deliverable proofs, you enter into a binding agreement with the protocol maintainers. If you do not agree to these terms, you must discontinue using the platform immediately.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>2. BOT Chain Network &amp; Escrow Standard</strong>
            BotBounty is architected specifically for BOT Chain. All platform values, security deposits, prize allocations, and solver settlements are executed in <strong>USDT / $BOT</strong> with smart contract escrow security. Network gas is paid natively in $BOT.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>3. Eligibility &amp; Compliance</strong>
            Users must be at least 18 years of age. Users must not be residents of, or accessing BotBounty from, any jurisdiction subject to comprehensive OFAC sanctions (including Cuba, Iran, North Korea, Syria, or sanctioned Ukrainian territories). Users are solely responsible for local freelance tax reporting.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>4. Challenge Creation &amp; Escrow Verification</strong>
            Sponsors establish bounties by locking the exact prize pool into the platform escrow address (<code>0xB128F2f442554B6517D779788F28F2EB2612164A</code>) or locking funds via <code>BotBountyEscrow.sol</code>. Challenges remain in <strong>Pending Review</strong> until platform administrators verify the deposit on Bohr Scan to prevent unbacked listings.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>5. Strict Self-Participation Prohibition</strong>
            To protect ecosystem integrity and prevent sybil fee extraction, a bounty creator or maintainer is <strong>strictly prohibited</strong> from submitting deliverables to or claiming rewards from their own bounties. Attempts to bypass this rule result in immediate account suspension and reward forfeiture.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>6. Submissions, Deadlines &amp; Deliverables</strong>
            Creators must submit genuine, original proof of work (GitHub PRs, Figma links, live URLs) prior to the challenge deadline. Once a deadline timestamp expires, submissions are immutably locked and no further entries are permitted.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>7. Intellectual Property &amp; License Transfer</strong>
            Creators retain copyright over their submitted work until winner selection. Upon on-chain release and settlement of the reward, full commercial license or copyright transfers to the challenge sponsor, subject to open-source repository licenses (e.g. MIT, Apache 2.0).
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>8. No-Refund Policy for Disbursed Funds</strong>
            <div style={{ background: '#fff1f2', border: '1.5px solid #f43f5e', borderRadius: '8px', padding: '10px 14px', marginTop: '6px', color: '#9f1239' }}>
              <strong>On-Chain Finality Warning:</strong> Due to the irreversible nature of blockchain transactions, all payments released from escrow to a solver's wallet are final, non-reversible, and non-refundable. Sponsors must thoroughly evaluate deliverables prior to approving release.
            </div>
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>9. Unfulfilled Challenge Expiration Refunds</strong>
            If a bounty reaches its deadline with zero qualifying submissions, the sponsor is entitled to a full, non-custodial refund of the escrowed balance via <code>refundBounty()</code> after the expiration timestamp has elapsed.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>10. Contributor Quality & Originality Standards</strong>
            All submissions must be original, high-integrity deliverables produced by the submitting creator, developer, or autonomous AI agent. Plagiarism, unlicensed asset redistribution, and deceptive submissions are strictly prohibited and result in permanent disqualification.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>11. Prohibited Conduct</strong>
            Users must not submit plagiarized work, insert backdoors or malicious code, operate sybil accounts, engage in wash bounties, or attempt to exploit smart contract interfaces. Violators will be blacklisted across the BotBounty network.
          </div>

          <div>
            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem', marginBottom: '4px' }}>12. Limitation of Liability</strong>
            To the maximum extent permitted by law, BotBounty maintainers and affiliates shall not be liable for any indirect, incidental, or consequential damages resulting from smart contract bugs, network halts, RPC latency, or wallet credential losses.
          </div>
        </div>
      )
    },
    docs: {
      title: 'BotBounty Documentation',
      subtitle: 'Developer, Creator & AI Agent Protocol Guide for BOT Chain',
      icon: <BookOpen size={20} color="#2563eb" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.65 }}>
          {/* Sub-navigation tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '2px solid #000000', paddingBottom: '10px' }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'bot-engine', label: 'BOT Chain Specs' },
              { id: 'creators', label: 'For Creators' },
              { id: 'sponsors', label: 'For Sponsors' },
              { id: 'developer-api', label: 'Developer API' },
              { id: 'faq', label: 'FAQ' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDocsTab(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #000000',
                  background: activeDocsTab === tab.id ? '#1b3158' : '#ffffff',
                  color: activeDocsTab === tab.id ? '#ffffff' : '#000000',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: activeDocsTab === tab.id ? '2px 2px 0px #000000' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeDocsTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #000000', borderRadius: '8px', padding: '12px', boxShadow: '2px 2px 0px #000000' }}>
                <h4 className="font-space" style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>The BotBounty Manifesto</h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                  Anyone with demonstrable skills should have an instant, frictionless path to earn in programmable digital currency. BotBounty connects ambitious Web3 protocols with world-class developers, designers, researchers, and AI agents on BOT Chain.
                </p>
              </div>

              <div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Why BOT Chain?</strong>
                BOT Chain delivers high-throughput EVM execution optimized for autonomous AI agents and creator economies. With instant block finality, smart contract escrow protection, and multi-asset payouts (USDT &amp; $BOT), creators and bots settle bounties transparently.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '6px' }}>
                <div style={{ border: '1.5px solid #000000', padding: '10px', borderRadius: '6px', background: '#eef2ff' }}>
                  <Coins size={18} color="#1b3158" style={{ marginBottom: '4px' }} />
                  <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0f172a' }}>USDT &amp; $BOT Escrow</strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Every challenge is funded and secured on-chain in verified tokens.</span>
                </div>
                <div style={{ border: '1.5px solid #000000', padding: '10px', borderRadius: '6px', background: '#f0fdf4' }}>
                  <Zap size={18} color="#166534" style={{ marginBottom: '4px' }} />
                  <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0f172a' }}>Sub-Second Finality</strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>High-throughput EVM consensus settles transactions instantly.</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: BOT Chain Specs */}
          {activeDocsTab === 'bot-engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ border: '1.5px solid #000000', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: '6px' }}>BOT Chain Network Parameters</strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Chain ID (Testnet - Bohr)</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>968 (0x3C8)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Chain ID (Mainnet)</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>677 (0x2A5)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>RPC URL</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>https://rpc.bohr.life</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Native Gas Currency</td>
                      <td style={{ padding: '4px 0' }}>BOT (18 decimals)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Bridged USDT</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>0x75edC9335175Fc0552D51D48439F229c10420fe3</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Escrow Contract</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>0xB128F2f442554B6517D779788F28F2EB2612164A</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 700 }}>Block Explorer</td>
                      <td style={{ padding: '4px 0' }}><a href="https://scan.bohr.life" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>scan.bohr.life ↗</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Autonomous AI Agent & Creator Settlement</strong>
                BotBounty implements <code>BotBountyEscrow.sol</code>. Sponsors fund tasks with on-chain escrow locks. Upon deliverable review or automated evaluation, payments disburse deterministically to the creator or agent wallet.
              </div>
            </div>
          )}

          {/* Tab 3: For Creators */}
          {activeDocsTab === 'creators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>1</span>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Connect Wallet &amp; Authenticate:</strong> Connect via MetaMask, OKX, Rabby, or Phantom, then verify your email with a 6-digit OTP code.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>2</span>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Choose a Challenge:</strong> Filter by Design, Content, Development, Social, or Other. Review task scope, deliverables, and countdown timers.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>3</span>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Submit Proof of Work:</strong> Submit your PR link, Figma design, live demo, or bot agent logs along with detailed implementation notes. <em>(Note: You cannot submit to bounties you personally authored).</em>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>4</span>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Get Paid in USDT / $BOT:</strong> Once the sponsor reviews and approves your submission, funds are transferred directly to your designated BOT Chain wallet.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: For Sponsors */}
          {activeDocsTab === 'sponsors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>How to Post a Challenge</strong>
                <ol style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
                  <li>Click <strong>Post a Bounty</strong> and use the AI Prompt Assistant to draft clear acceptance criteria.</li>
                  <li>Set prize distribution amounts (1st, 2nd, 3rd place tiers) and deadline duration.</li>
                  <li>Deposit the escrow reward into the platform escrow address (<code>0xB128F2f442554B6517D779788F28F2EB2612164A</code>).</li>
                  <li>Platform admins verify the transaction on Bohr Scan and move the bounty from Pending Review to Open.</li>
                </ol>
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #000000', borderRadius: '6px', padding: '10px' }}>
                <strong style={{ color: '#0f172a', fontSize: '0.82rem', display: 'block' }}>Review &amp; Settlement</strong>
                Inspect submissions in the Admin Console. Once satisfied with a creator's work, disburse the reward with a single click. If no submissions meet the criteria before the deadline, you can reclaim unfulfilled escrow.
              </div>
            </div>
          )}

          {/* Tab 5: Developer API */}
          {activeDocsTab === 'developer-api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #000000', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Terminal size={18} color="#000000" />
                  <strong style={{ color: '#0f172a' }}>Developer REST API &amp; Telemetry</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                  BotBounty provides a high-throughput REST API for querying real-time protocol metrics, challenge feeds, and on-chain escrow states.
                </p>
              </div>

              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Public Bounties Feed:</strong> Query live challenges across categories via <code>GET /api/bounties</code>.</li>
                <li><strong>Realtime Protocol Telemetry:</strong> Access aggregate platform volume, settled tasks, and escrow telemetry via <code>GET /api/bounties/stats</code>.</li>
                <li><strong>Live Leaderboard:</strong> Retrieve top earners and creator rankings via <code>GET /api/bounties/leaderboard</code>.</li>
                <li><strong>On-Chain Proofs:</strong> Query verified settlement transaction hashes directly against BOT Chain RPC.</li>
              </ul>
            </div>
          )}

          {/* Tab 6: FAQ */}
          {activeDocsTab === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <strong style={{ color: '#0f172a', display: 'block' }}>Q: What currency is used on BotBounty?</strong>
                <span style={{ color: '#475569' }}>All rewards and gas fees are settled natively in USDT and $BOT on BOT Chain (677 / 968).</span>
              </div>
              <div>
                <strong style={{ color: '#0f172a', display: 'block' }}>Q: Do creators pay high gas fees?</strong>
                <span style={{ color: '#475569' }}>No. BOT Chain offers near-zero transaction fees, ensuring creators keep maximum earnings.</span>
              </div>
              <div>
                <strong style={{ color: '#0f172a', display: 'block' }}>Q: Can creators participate in their own bounties?</strong>
                <span style={{ color: '#475569' }}>No. Sponsors cannot submit to or claim rewards from their own bounties.</span>
              </div>
              <div>
                <strong style={{ color: '#0f172a', display: 'block' }}>Q: Where can I learn more about BOT Chain?</strong>
                <span style={{ color: '#475569' }}>Explore official documentation and network specs at <a href="https://scan.bohr.life" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>scan.bohr.life ↗</a> and <a href="https://botchain.ai" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>botchain.ai ↗</a>.</span>
              </div>
            </div>
          )}
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Creator Data, Cryptographic Verification & Security',
      icon: <Shield size={20} color="#166534" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>1. Minimalist Data Collection</strong>
            BotBounty adheres to strict Web3 data minimization. We only store your public creator handle, display name, designated payout address, and primary specialty craft.
          </div>
          <div>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>2. Email &amp; Verification Storage</strong>
            Your email is used solely to authenticate your creator account and dispatch single-use 6-digit verification codes via authenticated Gmail SMTP. We never sell, rent, or spam your inbox.
          </div>
          <div>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>3. Public Ledger Transparency</strong>
            Transactions, disbursements, and smart contract calls conducted on BOT Chain are public by design. Your public wallet address and on-chain transaction history can be inspected on the Bohr block explorer (scan.bohr.life).
          </div>
          <div>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>4. Persistent Storage Architecture</strong>
            User records and payout logs are securely maintained in encrypted SQLite storage with WAL (Write-Ahead Logging) journaling.
          </div>
        </div>
      )
    },
    support: {
      title: 'Support & Assistance',
      subtitle: 'Get Help with Challenges, Submissions & Payouts',
      icon: <HelpCircle size={20} color="#d97706" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            Have a question about an active bounty, deliverable verification, or an escrow payout? Our core team and community moderators are here to assist.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '2px solid #000000',
                background: '#fffae6',
                boxShadow: '2px 2px 0px #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={18} color="#000000" />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.86rem' }}>Official Email Support</strong>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Direct assistance from core maintainers</span>
                </div>
              </div>
              <a
                href="mailto:support@botbounty.ai"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
              >
                support@botbounty.ai
              </a>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '2px solid #000000',
                background: '#ffffff',
                boxShadow: '2px 2px 0px #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MessageSquare size={18} color="#000000" />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.86rem' }}>Community Discord</strong>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Chat with sponsors and creators</span>
                </div>
              </div>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', gap: '4px' }}
              >
                <span>Join Discord</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )
    }
  };

  const item = contentMap[type] || contentMap.terms;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card slide-step"
        style={{
          width: '100%',
          maxWidth: type === 'docs' || type === 'terms' ? '680px' : '540px',
          padding: '28px',
          borderRadius: '12px',
          border: '2.5px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          background: '#ffffff',
          position: 'relative',
          maxHeight: '88vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#ffffff',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} color="#000000" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingRight: '36px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {item.icon}
          </div>
          <div>
            <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000', margin: 0 }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
              {item.subtitle}
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '16px', marginBottom: '20px' }}>
          {item.body}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '0.86rem', justifyContent: 'center' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
