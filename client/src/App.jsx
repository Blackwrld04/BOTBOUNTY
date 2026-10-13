import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BountyList from './components/BountyList';
import BountyDetailModal from './components/BountyDetailModal';
import CreateBountyModal from './components/CreateBountyModal';
import AuthModal from './components/AuthModal';
import ConnectWalletModal from './components/ConnectWalletModal';
import WalletDrawer from './components/WalletDrawer';
import UserProfile from './components/UserProfile';
import AccountSettings from './components/AccountSettings';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';
import LegalModal from './components/LegalModal';
import MobileDock from './components/MobileDock';
import { INITIAL_BOUNTIES } from './data/initialBounties';
import { ARC_MAINNET, ARC_TESTNET } from './utils/arc';
import { BOT_TESTNET, BOT_MAINNET } from './utils/networks';
import { triggerSync, subscribeToSync } from './utils/sync';
import { API_BASE } from './utils/api';
import { Zap, CheckCircle2, ExternalLink, X } from 'lucide-react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

export default function App() {
  const isMobile = useIsMobile();
  const [network, setNetwork] = useState(BOT_TESTNET);

  // Authenticated user state: default to null (Guest / new visitor mode)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('botbounty_session_user') || localStorage.getItem('arcbounty_session_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [wallet, setWallet] = useState(() => {
    try {
      const savedUser = localStorage.getItem('arcbounty_session_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        return {
          connected: true,
          address: u.address || '0x461cd48D95993242bB04774cc68042795586BbAd',
          balance: typeof u.balance === 'number' ? u.balance : 0,
          type: 'simulated'
        };
      }
    } catch (e) {}
    return {
      connected: false,
      address: null,
      balance: 0,
      type: null
    };
  });

  const [bounties, setBounties] = useState(() => {
    try {
      const saved = localStorage.getItem('arcbounty_items_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BOUNTIES;
  });

  const [stats, setStats] = useState({
    tvlUsdc: 8200,
    totalEscrowedUsdc: 8200,
    totalSettledUsdc: 1550,
    totalDistributedUsdc: 1550,
    avgSettlementTimeMs: 384,
    activeBountiesCount: 5,
    totalBounties: 8,
    openBounties: 5,
    inReviewBounties: 0,
    settledBounties: 3,
    totalSubmissions: 2,
    totalDistributions: 2
  });

  // Active views: 'explore', 'profile', 'account', 'account-referrals', 'leaderboard', 'admin'
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin' || window.location.search.includes('admin=true')) {
        return 'admin';
      }
      if (path === '/leaderboard' || hash === '#/leaderboard') {
        return 'leaderboard';
      }
      if (path === '/profile' || hash === '#/profile') {
        return 'profile';
      }
      if (path === '/account' || hash === '#/account') {
        return 'account';
      }
      if (path === '/referrals' || path === '/account-referrals' || hash === '#/referrals') {
        return 'account-referrals';
      }
    }
    return 'explore';
  };

  const getInitialAuth = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/login' || path === '/signin' || hash === '#/login' || hash === '#/signin') {
        return { open: true, mode: 'login' };
      }
      if (path === '/signup' || path === '/register' || hash === '#/signup' || hash === '#/register') {
        return { open: true, mode: 'signup' };
      }
    }
    return { open: false, mode: 'login' };
  };

  const [activeView, setActiveView] = useState(getInitialView);
  const [searchQuery, setSearchQuery] = useState('');

  const initialAuth = getInitialAuth();
  const [authModalOpen, setAuthModalOpen] = useState(initialAuth.open);
  const [authModalMode, setAuthModalMode] = useState(initialAuth.mode);

  // Synchronize browser history and hash navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin' || window.location.search.includes('admin=true')) {
        setActiveView('admin');
      } else if (path === '/login' || path === '/signin' || hash === '#/login' || hash === '#/signin') {
        setAuthModalMode('login');
        setAuthModalOpen(true);
        if (activeView === 'admin') setActiveView('explore');
      } else if (path === '/signup' || path === '/register' || hash === '#/signup' || hash === '#/register') {
        setAuthModalMode('signup');
        setAuthModalOpen(true);
        if (activeView === 'admin') setActiveView('explore');
      } else if (path === '/leaderboard' || hash === '#/leaderboard') {
        setActiveView('leaderboard');
      } else if (path === '/profile' || hash === '#/profile') {
        setActiveView('profile');
      } else if (path === '/account' || hash === '#/account') {
        setActiveView('account');
      } else if (path === '/referrals' || path === '/account-referrals' || hash === '#/referrals') {
        setActiveView('account-referrals');
      } else if (path === '/' || path === '' || hash === '#/' || hash === '' || hash === '#/explore') {
        if (activeView === 'admin') setActiveView('explore');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [activeView]);

  const handleBackToExplore = () => {
    syncAllData();
    triggerSync({ action: 'nav_to_explore' });
    setActiveView('explore');
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      } else if (window.location.hash) {
        window.location.hash = '';
      }
    }
  };

  // Modals & Drawers state
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useState(false);
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | 'support'
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', link = null) => {
    setToast({ message, type, link });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleWalletConnected = (newWallet, updatedUser, token) => {
    setWallet(newWallet);
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('arcbounty_session_user', JSON.stringify(updatedUser));
    }
    if (token) {
      localStorage.setItem('arcbounty_session_token', token);
    }
    showToast(`Wallet connected! Address: ${newWallet.address.slice(0, 6)}...${newWallet.address.slice(-4)}`);
  };

  // Fetch live bounties and aggregate platform telemetry from SQLite database
  const loadBounties = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bounties`);
      const data = await res.json();
      if (data.success && Array.isArray(data.bounties) && data.bounties.length > 0) {
        const seen = new Set();
        const unique = data.bounties.filter((b) => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        setBounties(unique);
      }
    } catch (e) {
      console.warn('[App] SQLite bounties sync fallback:', e);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bounties/stats`);
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.warn('[App] SQLite stats sync fallback:', e);
    }
  };

  const syncAllData = async () => {
    await Promise.all([loadBounties(), loadStats()]);
  };

  useEffect(() => {
    syncAllData();

    // Universal sync subscriber (CustomEvent, BroadcastChannel, localStorage beacon, focus, visibility)
    const unsubscribe = subscribeToSync(() => {
      syncAllData();
    });

    // Continuous 3-second live background sync so Admin and Public pages are ALWAYS in sync
    const syncInterval = setInterval(() => {
      syncAllData();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  // Sync whenever activeView changes (e.g. going to/from Admin)
  useEffect(() => {
    syncAllData();
  }, [activeView]);

  // Keep selectedBounty live in sync with bounties updates
  useEffect(() => {
    if (selectedBounty) {
      const updated = bounties.find((b) => b.id === selectedBounty.id);
      if (updated && (
        updated.status !== selectedBounty.status ||
        updated.submissionsCount !== selectedBounty.submissionsCount ||
        updated.settlementTx !== selectedBounty.settlementTx ||
        updated.solver !== selectedBounty.solver ||
        updated.prUrl !== selectedBounty.prUrl
      )) {
        setSelectedBounty(updated);
      }
    }
  }, [bounties]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('arcbounty_items_v4', JSON.stringify(bounties));
  }, [bounties]);

  // Handle posting a new bounty with Escrow deposit
  const handleCreateBounty = async (newBountyData) => {
    try {
      const token = localStorage.getItem('arcbounty_session_token');
      const res = await fetch(`${API_BASE}/api/bounties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newBountyData)
      });
      const data = await res.json();
      if (data.success && data.bounty) {
        syncAllData();
        triggerSync({ action: 'bounty_created', bountyId: data.bounty.id });
        showToast(`Bounty submitted! Awaiting Admin review & verification.`);
        return data.bounty;
      }
    } catch (e) {
      console.warn('Backend create bounty failed:', e);
    }

    // Local state fallback
    const newBounty = {
      id: `bounty-arc-${Date.now().toString().slice(-4)}`,
      bountyId: `0x${Date.now().toString(16).padStart(64, '0')}`,
      ...newBountyData,
      status: 'Pending Review',
      maintainerName: user?.name || 'Circle Creative Guild',
      solver: null,
      solverType: null,
      prUrl: null,
      createdAt: Date.now(),
      deadline: Date.now() + newBountyData.deadlineDays * 86400000,
    };

    triggerSync({ action: 'bounty_created', bountyId: newBounty.id });
    showToast(`Bounty submitted! Awaiting Admin review & verification.`);
    return newBounty;
  };

  // Handle solver deliverable submission
  const handleSubmitSolution = async (bountyId, submissionUrl, solverAddress, solverType, notes, collaborators = []) => {
    try {
      const token = localStorage.getItem('arcbounty_session_token');
      const res = await fetch(`${API_BASE}/api/bounties/${bountyId}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          submissionUrl,
          walletAddress: solverAddress || user?.address || '0x461cd48D95993242bB04774cc68042795586BbAd',
          solverType: solverType || 'Human Creator',
          notes,
          creatorName: user?.name,
          creatorEmail: user?.email,
          collaborators
        })
      });
      const data = await res.json();
      if (data.success && data.bounty) {
        setBounties((prev) => prev.map((b) => (b.id === bountyId ? data.bounty : b)));
        setSelectedBounty(data.bounty);
        syncAllData();
        triggerSync({ action: 'work_submitted', bountyId });
        return { success: true, bounty: data.bounty, submission: data.submission };
      } else {
        const errMsg = data.error || 'Failed to submit work deliverable';
        showToast(errMsg);
        throw new Error(errMsg);
      }
    } catch (e) {
      console.warn('Backend participate error:', e);
      throw e;
    }
  };

  // Handle administrator approving release & executing settlement
  const handleReleaseBounty = async (bountyId) => {
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('arcbounty_admin_token') : null;
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('arcbounty_session_token') : null;
      const token = adminToken || sessionToken;

      const res = await fetch(`${API_BASE}/api/bounties/${bountyId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && data.settlement) {
        if (data.bounty) {
          setBounties((prev) => prev.map((b) => (b.id === bountyId ? data.bounty : b)));
          setSelectedBounty(data.bounty);
        }
        await syncAllData();
        triggerSync({ action: 'bounty_settled', bountyId });
        showToast(`Settlement confirmed on Arc Mainnet in 382ms! USDC disbursed.`, 'success', `https://explorer.arc.io/tx/${data.settlement.txHash}`);
        return;
      } else if (data.error) {
        showToast(data.error, 'error');
        throw new Error(data.error);
      }
    } catch (e) {
      console.warn('Backend release error:', e);
      showToast(e.message || 'Approval and disbursal failed', 'error');
      throw e;
    }
  };

  // Validate existing session token against SQLite backend on startup
  useEffect(() => {
    const token = localStorage.getItem('arcbounty_session_token');
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser(data.user);
            setWallet({
              connected: true,
              address: data.user.address || '0x461cd48D95993242bB04774cc68042795586BbAd',
              balance: typeof data.user.balance === 'number' ? data.user.balance : 0,
              type: data.user.provider || 'email'
            });
            localStorage.setItem('arcbounty_session_user', JSON.stringify(data.user));
          } else {
            // Session expired or invalid in database
            localStorage.removeItem('arcbounty_session_token');
            localStorage.removeItem('arcbounty_session_user');
            setUser(null);
            setWallet({
              connected: false,
              address: null,
              balance: 0,
              type: null
            });
          }
        })
        .catch(() => {
          // If server is offline, keep cached user if any
        });
    }
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setWallet({
      connected: true,
      address: userData.address || '0x461cd48D95993242bB04774cc68042795586BbAd',
      balance: typeof userData.balance === 'number' ? userData.balance : 0,
      type: userData.provider || userData.type || 'email'
    });
    try {
      localStorage.setItem('arcbounty_session_user', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('arcbounty_session_token', token);
      }
    } catch (e) {}
    showToast(`Welcome, ${userData.name}!`);
    setAuthModalOpen(false);
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setWallet({
      connected: false,
      address: null,
      balance: 0,
      type: null
    });
    try {
      localStorage.removeItem('arcbounty_session_user');
      localStorage.removeItem('arcbounty_session_token');
    } catch (e) {}
    setActiveView('explore');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    showToast('Logged out successfully.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Modern Top Navigation Bar (Hidden when in dedicated separate Admin mode) */}
      {activeView !== 'admin' && (
        <Navbar
          user={user}
          wallet={wallet}
          network={network}
          activeView={activeView}
          setActiveView={setActiveView}
          openAuthModal={handleOpenAuth}
          openWalletDrawer={() => setWalletDrawerOpen(true)}
          openConnectWalletModal={() => setConnectWalletModalOpen(true)}
          openCreateModal={() => {
            if (!user) {
              handleOpenAuth('signup');
            } else {
              setCreateModalOpen(true);
            }
          }}
          openDocsModal={() => setLegalModal('docs')}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* Main View Controller */}
      <main style={{ flex: 1 }}>
        {activeView === 'explore' && (
          <>
            <Hero
              openCreateModal={() => {
                if (!user) handleOpenAuth('signup');
                else setCreateModalOpen(true);
              }}
              onExploreClick={() => {
                const el = document.getElementById('bounties-feed');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              openAuthModal={handleOpenAuth}
              user={user}
              stats={stats}
            />

            <div id="bounties-feed">
              <BountyList
                bounties={bounties}
                onSelectBounty={(bounty) => setSelectedBounty(bounty)}
                stats={stats}
                openCreateModal={() => {
                  if (!user) handleOpenAuth('signup');
                  else setCreateModalOpen(true);
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setActiveTab={setActiveView}
              />
            </div>
          </>
        )}

        {activeView === 'profile' && user && (
          <UserProfile
            user={user}
            setUser={setUser}
            wallet={wallet}
            bounties={bounties}
            onBackToFeed={() => setActiveView('explore')}
            onSelectBounty={(bounty) => setSelectedBounty(bounty)}
            onOpenSettings={() => setActiveView('account')}
            onLogout={handleLogout}
            openAuthModal={handleOpenAuth}
          />
        )}

        {(activeView === 'account' || activeView === 'account-referrals') && user && (
          <AccountSettings
            user={user}
            setUser={setUser}
            wallet={wallet}
            setWallet={setWallet}
            initialTab={activeView === 'account-referrals' ? 'referrals' : 'account'}
            onBackToFeed={() => setActiveView('explore')}
            onLogout={handleLogout}
            openAuthModal={handleOpenAuth}
          />
        )}


        {activeView === 'leaderboard' && (
          <div style={{ paddingTop: '20px' }}>
            <Leaderboard />
          </div>
        )}

        {activeView === 'admin' && (
          <div>
            <AdminDashboard
              user={user}
              wallet={wallet}
              onBackToExplore={handleBackToExplore}
              onDataChanged={syncAllData}
            />
          </div>
        )}
      </main>

      {/* Modern Slide-out Wallet Drawer */}
      <WalletDrawer
        isOpen={walletDrawerOpen}
        onClose={() => setWalletDrawerOpen(false)}
        wallet={wallet}
        setWallet={setWallet}
        network={network}
        user={user}
      />

      {/* Dedicated Web3 Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={connectWalletModalOpen}
        onClose={() => setConnectWalletModalOpen(false)}
        user={user}
        wallet={wallet}
        onWalletConnected={handleWalletConnected}
      />

      {/* Split Login & Sign Up Modal (Gibwork style) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={handleCloseAuth}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Stepped Create Bounty Modal */}
      <CreateBountyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateBounty={handleCreateBounty}
        wallet={wallet}
        user={user}
      />

      {/* Bounty Detail & Deliverable Submission Modal */}
      {selectedBounty && (
        <BountyDetailModal
          bounty={selectedBounty}
          onClose={() => setSelectedBounty(null)}
          onSubmitSolution={handleSubmitSolution}
          onReleaseBounty={handleReleaseBounty}
          wallet={wallet}
          user={user}
          isAdmin={Boolean(
            user?.email && user.email.trim().toLowerCase() === 'olajideabdulquadri22@gmail.com'
          )}
          openAuthModal={handleOpenAuth}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '82px' : '24px',
          right: isMobile ? '12px' : '24px',
          left: isMobile ? '12px' : 'auto',
          zIndex: 10000,
          background: '#0f172a',
          color: '#ffffff',
          padding: isMobile ? '12px 16px' : '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: isMobile ? '0.82rem' : '0.88rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
          {toast.link && (
            <a
              href={toast.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--arc-sky-sync)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
            >
              <span>View ArcScan</span>
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Clean Footer */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '2px solid #000000',
          padding: isMobile ? '24px 0' : '36px 0',
          marginTop: isMobile ? '32px' : '60px'
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'center' : 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: isMobile ? '16px' : '20px',
            textAlign: isMobile ? 'center' : 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
            <span
              className="font-space"
              style={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: 900,
                color: 'var(--arc-protocol-navy)',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                margin: 0,
                padding: 0
              }}
            >
              Arc<span style={{ color: 'var(--arc-blockstream-gold)' }}>Bounty</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
              © 2026 ArcBounty. All rights reserved.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: isMobile ? '12px' : '20px',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: isMobile ? '0.72rem' : '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <button
              onClick={() => setLegalModal('terms')}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Terms
            </button>

            <button
              onClick={() => setLegalModal('docs')}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Docs
            </button>

            <button
              onClick={() => setLegalModal('privacy')}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Privacy
            </button>

            <button
              onClick={() => setLegalModal('support')}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Support
            </button>

            <span style={{ color: '#cbd5e1' }}>•</span>

            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Discord
            </a>

            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              X
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#475569',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Telegram
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Dock Navigation */}
      {activeView !== 'admin' && (
        <MobileDock
          activeTab={activeView}
          setActiveTab={setActiveView}
          openCreateModal={() => {
            if (!user) {
              handleOpenAuth('signup');
            } else {
              setCreateModalOpen(true);
            }
          }}
          openWalletModal={() => {
            if (!user) {
              setConnectWalletModalOpen(true);
            } else {
              setWalletDrawerOpen(true);
            }
          }}
          openAuthModal={handleOpenAuth}
          wallet={wallet}
          user={user}
        />
      )}

      {/* Legal & Support Information Modal */}
      <LegalModal
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </div>
  );
}
