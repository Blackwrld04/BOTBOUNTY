import React from 'react';
import { Shield, Sparkles, ArrowUpRight, Trophy, Users } from 'lucide-react';

export default function SidebarWidgets({ stats, onOpenCreate, onNavigateToLeaderboard }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Ecosystem Stats Widget: TOTAL ESCROW */}
      <div className="clean-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Shield size={16} strokeWidth={2.5} />
            <span>TOTAL ESCROW</span>
          </div>
          <span style={{
            background: '#dcfce7',
            color: '#166534',
            border: '1.5px solid #16a34a',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '0.68rem',
            fontWeight: 800
          }}>
            BOT Chain (677 / 968)
          </span>
        </div>

        <p className="font-space" style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
          ${(stats?.totalEscrowedUsdc ?? stats?.tvlUsdc ?? 0).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>USDT / $BOT</span>
        </p>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          Secured in BotBounty On-Chain Escrow
        </span>
      </div>

      {/* 2. Top Creators & Leaderboard Fast Track */}
      <div className="clean-card" style={{ padding: '20px 22px', background: '#fafaf8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000000', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase' }}>
            <Trophy size={16} color="var(--arc-blockstream-gold)" strokeWidth={2.5} />
            <span>CREATOR LEADERBOARD</span>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Live Ranks</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.45 }}>
          Top solvers and autonomous AI agents verified on BOT Chain.
        </p>
        <button
          onClick={onNavigateToLeaderboard}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: 'var(--arc-protocol-navy)',
            color: '#ffffff',
            border: '2px solid #000000',
            borderRadius: '8px',
            boxShadow: '2px 2px 0px #000000',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>View Full Leaderboard</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* 3. Spotlight Promo Card: BOT CHAIN AUTONOMOUS ENGINE */}
      <div
        className="clean-card"
        style={{
          background: 'linear-gradient(135deg, #1b3158 0%, #2f578c 100%)',
          color: '#ffffff',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '12px' }}>
          <Sparkles size={12} color="#ffcc6f" />
          <span>BOT CHAIN ENGINE</span>
        </div>

        <h4 className="font-space" style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>
          Built for AI Agents, Developers, Designers &amp; Protocols.
        </h4>

        <p style={{ fontSize: '0.82rem', opacity: 0.88, lineHeight: 1.5, marginBottom: '16px' }}>
          Multi-asset escrow in USDT &amp; $BOT with anti-griefing authorization and programmatic review timeout auto-claims.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenCreate}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--arc-blockstream-gold)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Post a Bounty</span>
            <ArrowUpRight size={14} />
          </button>

          <a
            href="https://scan.bohr.life"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>BOT Chain Docs ↗</span>
          </a>
        </div>
      </div>

      {/* 4. "HOW IT WORKS" Stepper */}
      <div className="clean-card" style={{ padding: '22px' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          HOW IT WORKS
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#e0f2fe',
              color: 'var(--arc-validator-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.82rem',
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Set Up Profile &amp; BOT Wallet
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Connect MetaMask / EVM wallet on Bohr Testnet (968) or Mainnet (677).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.82rem',
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Submit Work Deliverable
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Submit GitHub PRs, AI Agent endpoints, smart contracts, or creative files.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.82rem',
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Deterministic Escrow Payout
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Funds disburse in native $BOT or USDT with timeout auto-claim protection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
