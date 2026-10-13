import React from 'react';
import { ArrowRight, Zap, Shield, Layers, Plus, CheckCircle2 } from 'lucide-react';
import { useIsMobile } from '../utils/useIsMobile';

export default function Hero({ openCreateModal, onExploreClick, openAuthModal, user, stats }) {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? '20px 0 12px 0' : '32px 0 20px 0' }}>
      <div className="container">
        {/* Flagship Hero Grid (Inspired by Superteam Earn & Gibwork) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 340px',
          gap: isMobile ? '20px' : '36px',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%'
        }}>
          {/* Main Feature Banner (Left 70%) */}
          <div
            className="clean-card"
            style={{
              background: 'linear-gradient(135deg, #1b3158 0%, #2f578c 100%)',
              color: '#ffffff',
              padding: isMobile ? '24px 20px' : '36px 38px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: isMobile ? '220px' : '260px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div>
              {/* Sticker Tape Badge */}
              <div style={{ marginBottom: '16px' }}>
                <span className="sticker-tape">
                  BOT CHAIN (EVM 677) · MULTI-ASSET ESCROW (USDT &amp; $BOT) · AI AGENT SETTLEMENTS
                </span>
              </div>

              {/* Unique Headline */}
              <h1 className="font-space" style={{
                fontSize: isMobile ? 'clamp(1.4rem, 5.5vw, 1.85rem)' : 'clamp(1.85rem, 3.2vw, 2.6rem)',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.025em',
                lineHeight: 1.18,
                marginBottom: isMobile ? '10px' : '14px'
              }}>
                The Open Bounty Protocol for Web3 Creators &amp; Builders
              </h1>

              {/* Subheading */}
              <p style={{
                fontSize: isMobile ? '0.88rem' : '0.98rem',
                color: '#acc6e9',
                lineHeight: 1.55,
                maxWidth: '640px',
                marginBottom: isMobile ? '18px' : '26px',
                fontWeight: 500
              }}>
                Lock canonical USDC in escrow. Deliver high-impact work in <strong>Content, Design, Development, and All Social</strong> campaigns. Receive instant disbursements with sub-second Malachite BFT finality.
              </p>
            </div>

            {/* CTAs & Social Proof */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? '10px' : '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexWrap: 'wrap' }}>
                {!user ? (
                  <>
                    <button
                      id="hero-signup-btn"
                      onClick={() => openAuthModal('signup')}
                      className="btn-accent"
                      style={{ padding: isMobile ? '10px 18px' : '12px 24px', fontSize: isMobile ? '0.84rem' : '0.92rem' }}
                    >
                      <span>Sign Up as Creator</span>
                      <ArrowRight size={16} />
                    </button>

                    <button
                      onClick={onExploreClick}
                      className="btn-secondary"
                      style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: isMobile ? '0.84rem' : '0.92rem', background: '#ffffff', color: '#000000' }}
                    >
                      <span>Explore Bounties</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="hero-create-bounty-btn"
                      onClick={openCreateModal}
                      className="btn-accent"
                      style={{ padding: isMobile ? '10px 18px' : '12px 24px', fontSize: isMobile ? '0.84rem' : '0.92rem' }}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      <span>Post a Bounty</span>
                    </button>

                    <button
                      onClick={onExploreClick}
                      className="btn-secondary"
                      style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: isMobile ? '0.84rem' : '0.92rem', background: '#ffffff', color: '#000000' }}
                    >
                      <span>Browse Opportunities</span>
                    </button>
                  </>
                )}
              </div>

              {/* Social Proof (Overlapping Avatars) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="desktop-only">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Creator"
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #000000', marginLeft: '0px' }}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Creator"
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #000000', marginLeft: '-8px' }}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                    alt="Creator"
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #000000', marginLeft: '-8px' }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: '#acc6e9', fontWeight: 600 }}>
                  Join 2,400+ Web3 creators on Arc
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards (Right 30%, exactly matching Superteam Earn) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'space-between' }} className="desktop-only">
            <div className="clean-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#dcfce7',
                border: '2px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                flexShrink: 0
              }}>
                <Shield size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
                  TOTAL VALUE SETTLED
                </p>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#000000', margin: '2px 0 0 0' }}>
                  ${(stats?.totalDistributedUsdc ?? stats?.totalSettledUsdc ?? 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>USDC</span>
                </p>
              </div>
            </div>

            <div className="clean-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#e0f2fe',
                border: '2px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--arc-validator-blue)',
                flexShrink: 0
              }}>
                <Layers size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
                  ACTIVE OPPORTUNITIES
                </p>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#000000', margin: '2px 0 0 0' }}>
                  {stats?.activeBountiesCount ?? (stats?.openBounties || 0)} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Bounties</span>
                </p>
              </div>
            </div>

            <div className="clean-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--arc-token-sand)',
                border: '2px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                flexShrink: 0
              }}>
                <Zap size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
                  DETERMINISTIC FINALITY
                </p>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#000000', margin: '2px 0 0 0' }}>
                  &lt;400ms <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Malachite BFT</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
