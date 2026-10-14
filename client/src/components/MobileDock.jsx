import React from 'react';
import { Compass, User, Plus, Trophy, Wallet } from 'lucide-react';

export default function MobileDock({
  activeTab,
  setActiveTab,
  openCreateModal,
  openWalletModal,
  openAuthModal,
  wallet,
  user
}) {
  return (
    <nav className="mobile-dock">
      {/* 1. Explore */}
      <button
        id="mobile-dock-explore-btn"
        onClick={() => setActiveTab('explore')}
        style={{
          background: 'transparent',
          border: 'none',
          color: activeTab === 'explore' ? '#000000' : '#6b7280',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.65rem',
          fontWeight: 900,
          cursor: 'pointer',
          flex: 1,
          minHeight: '44px',
          justifyContent: 'center',
          letterSpacing: '0.03em'
        }}
      >
        <Compass size={21} color={activeTab === 'explore' ? '#000000' : '#6b7280'} strokeWidth={activeTab === 'explore' ? 3 : 2} />
        <span style={{ borderBottom: activeTab === 'explore' ? '2px solid #000' : 'none', paddingBottom: '1px' }}>EXPLORE</span>
      </button>

      {/* 2. Profile or Log In */}
      <button
        id="mobile-dock-profile-btn"
        onClick={() => {
          if (user) {
            setActiveTab('profile');
          } else if (openAuthModal) {
            openAuthModal('login');
          } else {
            setActiveTab('explore');
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: activeTab === 'profile' ? '#000000' : '#6b7280',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.65rem',
          fontWeight: 900,
          cursor: 'pointer',
          flex: 1,
          minHeight: '44px',
          justifyContent: 'center',
          letterSpacing: '0.03em'
        }}
      >
        <User size={21} color={activeTab === 'profile' ? '#000000' : '#6b7280'} strokeWidth={activeTab === 'profile' ? 3 : 2} />
        <span style={{ borderBottom: activeTab === 'profile' ? '2px solid #000' : 'none', paddingBottom: '1px' }}>PROFILE</span>
      </button>

      {/* 3. Center Action: Post Bounty */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          id="mobile-dock-create-btn"
          onClick={openCreateModal}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'var(--arc-token-sand)',
            border: '3px solid #000000',
            boxShadow: '3px 3px 0px #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            marginTop: '-20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Post a creator bounty"
        >
          <Plus size={26} strokeWidth={3.5} />
        </button>
      </div>

      {/* 4. Leaderboard */}
      <button
        id="mobile-dock-leaderboard-btn"
        onClick={() => setActiveTab('leaderboard')}
        style={{
          background: 'transparent',
          border: 'none',
          color: activeTab === 'leaderboard' ? '#000000' : '#6b7280',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.65rem',
          fontWeight: 900,
          cursor: 'pointer',
          flex: 1,
          letterSpacing: '0.03em'
        }}
      >
        <Trophy size={21} color={activeTab === 'leaderboard' ? '#000000' : '#6b7280'} strokeWidth={activeTab === 'leaderboard' ? 3 : 2} />
        <span style={{ borderBottom: activeTab === 'leaderboard' ? '2px solid #000' : 'none', paddingBottom: '1px' }}>LEADERBOARD</span>
      </button>

      {/* 5. Wallet */}
      <button
        id="mobile-dock-wallet-btn"
        onClick={openWalletModal}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.65rem',
          fontWeight: 900,
          cursor: 'pointer',
          flex: 1,
          letterSpacing: '0.03em'
        }}
      >
        <Wallet size={21} color={wallet?.connected ? 'var(--arc-validator-blue)' : '#000000'} strokeWidth={2.5} />
        <span>WALLET</span>
      </button>
    </nav>
  );
}
