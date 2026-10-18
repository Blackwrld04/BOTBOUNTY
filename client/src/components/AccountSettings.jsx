import React, { useState } from 'react';
import {
  User,
  Wallet,
  Bell,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Unlink,
  CheckCircle2,
  Save,
  RotateCcw,
  Camera,
  Upload,
  Mail
} from 'lucide-react';
import { truncateAddress } from '../utils/arc';
import { API_BASE } from '../utils/api';
import SocialConnectModal from './SocialConnectModal';
import ConnectWalletModal from './ConnectWalletModal';
import { useIsMobile } from '../utils/useIsMobile';

export default function AccountSettings({
  user,
  setUser,
  wallet,
  setWallet,
  onBackToFeed,
  initialTab = 'account',
  onLogout,
  openAuthModal
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(initialTab); // 'account', 'wallet', 'notifications', 'referrals'
  const [name, setName] = useState(user?.name || 'Bot Creator');
  const [username, setUsername] = useState(user?.username || 'creator');
  const [bio, setBio] = useState(user?.bio || 'Web3 Creator on BOT Chain (677 / 968)');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
  const avatarFileRef = React.useRef(null);
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' }); // 'idle', 'checking', 'available', 'taken', 'invalid'
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [savedNotifications, setSavedNotifications] = useState(false);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Modals
  const [socialModalPlatform, setSocialModalPlatform] = useState(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Notification toggles
  const [notifs, setNotifs] = useState({
    newBounties: true,
    githubBounties: true,
    productUpdates: true
  });

  // Real-time handle availability checking
  React.useEffect(() => {
    const clean = (username || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
    if (!clean || clean === (user?.username || '').toLowerCase()) {
      setUsernameStatus({ state: 'idle', message: '' });
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus({ state: 'invalid', message: 'Handle must be at least 3 characters' });
      return;
    }

    setUsernameStatus({ state: 'checking', message: 'Checking availability...' });
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/auth/check-username?username=${clean}&userId=${user?.id || ''}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.available) {
            setUsernameStatus({ state: 'available', message: `@${clean} is available!` });
          } else {
            setUsernameStatus({ state: 'taken', message: data?.message || `@${clean} is already taken by another creator.` });
          }
        })
        .catch(() => {
          setUsernameStatus({ state: 'idle', message: '' });
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [username, user?.username, user?.id]);

  const referralLink = `https://botbounty-theta.vercel.app?ref=${username}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyWalletAddr = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return;

    if (usernameStatus.state === 'taken') {
      setProfileError(usernameStatus.message || `Creator handle "@${username}" is already taken by another creator.`);
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatar
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || 'Failed to save profile');
        setIsSavingProfile(false);
        return;
      }

      if (setUser) setUser(data.user);
      localStorage.setItem('botbounty_session_user', JSON.stringify(data.user));
      localStorage.setItem('arcbounty_session_user', JSON.stringify(data.user));
      setSaveProfileSuccess(true);
      setTimeout(() => setSaveProfileSuccess(false), 3000);
    } catch (err) {
      console.error('Update profile error:', err);
      setProfileError('Network error saving profile changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSocialSuccess = (updatedUser) => {
    if (setUser) setUser(updatedUser);
    localStorage.setItem('botbounty_session_user', JSON.stringify(updatedUser));
    localStorage.setItem('arcbounty_session_user', JSON.stringify(updatedUser));
  };

  const handleWalletSuccess = (newWallet, updatedUser) => {
    setWallet(newWallet);
    if (updatedUser && setUser) {
      setUser(updatedUser);
      localStorage.setItem('botbounty_session_user', JSON.stringify(updatedUser));
      localStorage.setItem('arcbounty_session_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <section style={{ padding: '36px 0 80px 0' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Back navigation */}
        <button
          onClick={onBackToFeed}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Bounties</span>
        </button>

        {/* Top Horizontal Navigation Tabs (Gibwork style) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid #000000',
            paddingBottom: '12px',
            marginBottom: '28px'
          }}
        >
          {[
            { id: 'account', label: 'Account & Socials' },
            { id: 'wallet', label: 'Arc Wallet' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'referrals', label: 'Referrals' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? '#fffae6' : '#ffffff',
                color: activeTab === t.id ? '#000000' : '#64748b',
                border: activeTab === t.id ? '2px solid #000000' : '2px solid transparent',
                boxShadow: activeTab === t.id ? '2px 2px 0px #000000' : 'none',
                borderRadius: '8px',
                padding: isMobile ? '6px 12px' : '8px 16px',
                fontSize: isMobile ? '0.78rem' : '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Account (Profile Settings & Connected Accounts) */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Profile Settings Card */}
            <form onSubmit={handleSaveProfile} className="clean-card" style={{ padding: isMobile ? '20px 16px' : '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Profile Settings
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '3px 0 0 0' }}>
                    Manage your public creator handle, display name, and bio.
                  </p>
                </div>
                {saveProfileSuccess && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: '#16a34a', fontWeight: 800 }}>
                    <CheckCircle2 size={16} />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              {profileError && (
                <div style={{ background: '#fee2e2', border: '2px solid #000000', padding: '8px 12px', borderRadius: '6px', color: '#991b1b', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px' }}>
                  {profileError}
                </div>
              )}

              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={avatar}
                      alt={name}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #000000', boxShadow: '2px 2px 0px #000000' }}
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--arc-blockstream-gold)',
                        border: '1.5px solid #000000',
                        boxShadow: '1px 1px 0px #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#000000'
                      }}
                      title="Upload new avatar"
                    >
                      <Camera size={13} strokeWidth={2.4} />
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0 }}>Public Avatar</p>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 8px 0' }}>
                      JPG, PNG, or select a Web3 preset below
                    </p>
                    <input
                      type="file"
                      ref={avatarFileRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setAvatar(ev.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #000000',
                        boxShadow: '1.5px 1.5px 0px #000000',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Upload size={12} />
                      <span>Upload New Avatar</span>
                    </button>
                  </div>
                </div>

                {/* Quick Avatar Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Presets:</span>
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
                  ].map((presetUrl, idx) => (
                    <img
                      key={idx}
                      src={presetUrl}
                      alt={`Preset ${idx + 1}`}
                      onClick={() => setAvatar(presetUrl)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: avatar === presetUrl ? '2px solid var(--arc-blockstream-gold)' : '1px solid #000000',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Registered Sign-up Email Address */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="#1b3158" />
                    <span>Registered Sign-up Email</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px', padding: '1px 6px' }}>
                    Verified Account
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                  background: '#f8fafc',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{user?.email || 'No email attached'}</span>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Sign-up Identity</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    Creator Handle (@)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: usernameStatus.state === 'taken' ? '2px solid #ef4444' : '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                  {usernameStatus.state === 'checking' && (
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                      Checking availability...
                    </span>
                  )}
                  {usernameStatus.state === 'available' && (
                    <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800, display: 'block', marginTop: '4px' }}>
                      {usernameStatus.message}
                    </span>
                  )}
                  {usernameStatus.state === 'taken' && (
                    <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 800, display: 'block', marginTop: '4px' }}>
                      {usernameStatus.message}
                    </span>
                  )}
                  {usernameStatus.state === 'invalid' && (
                    <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                      {usernameStatus.message}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                  Creator Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell sponsors and creators about your skills and interests..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.88rem' }}
              >
                <Save size={15} />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </form>

            {/* Connected Social Accounts Section */}
            <div className="clean-card" style={{ padding: '28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Connected Social Accounts &amp; Proof of Identity
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Connect your Telegram, Discord, X, and GitHub. Sponsors verify these social links before releasing USDC bounties.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. Telegram */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    borderRadius: '10px',
                    background: user?.telegram ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#229ED9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #000000'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Telegram</p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        {user?.telegram ? `Connected as @${user.telegram}` : 'Not connected — required for direct sponsor chat'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSocialModalPlatform('telegram')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #000000',
                      boxShadow: '1.5px 1.5px 0px #000000',
                      background: user?.telegram ? '#ffffff' : '#acc6e9',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {user?.telegram ? 'Manage' : 'Connect Telegram'}
                  </button>
                </div>

                {/* 2. Discord */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    borderRadius: '10px',
                    background: user?.discord ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#5865F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #000000'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Discord</p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        {user?.discord ? `Connected as ${user.discord}` : 'Not connected — required for guild roles'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSocialModalPlatform('discord')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #000000',
                      boxShadow: '1.5px 1.5px 0px #000000',
                      background: user?.discord ? '#ffffff' : '#acc6e9',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {user?.discord ? 'Manage' : 'Connect Discord'}
                  </button>
                </div>

                {/* 3. X (Twitter) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    borderRadius: '10px',
                    background: user?.x ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#000000',
                        color: '#ffffff',
                        border: '1.5px solid #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>X (Twitter)</p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        {user?.x ? `Connected as @${user.x}` : 'Not connected — required for social bounties'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSocialModalPlatform('x')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #000000',
                      boxShadow: '1.5px 1.5px 0px #000000',
                      background: user?.x ? '#ffffff' : '#acc6e9',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {user?.x ? 'Manage' : 'Connect X'}
                  </button>
                </div>

                {/* 4. GitHub */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    borderRadius: '10px',
                    background: user?.github ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #000000'
                      }}
                    >
                      <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>GitHub</p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                        {user?.github ? `Connected as @${user.github}` : 'Not connected — required for code deliverables'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSocialModalPlatform('github')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #000000',
                      boxShadow: '1.5px 1.5px 0px #000000',
                      background: user?.github ? '#ffffff' : '#acc6e9',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {user?.github ? 'Manage' : 'Connect GitHub'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Wallet */}
        {activeTab === 'wallet' && (
          <div className="clean-card" style={{ padding: '28px' }}>
            <div style={{ marginBottom: '18px' }}>
              <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Primary Web3 Wallet (BOT Chain EVM)
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Connected to BOT Chain (Chain ID 677 / 968). All payments and escrow locks settle here.
              </p>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  COLLECTED BOUNTY EARNINGS
                </span>
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', border: '1px solid #166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  CHAIN ID 968 (BOHR TESTNET)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                <span className="font-space" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a' }}>
                  ${(wallet?.balance || 0).toLocaleString()}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#64748b' }}>USDT</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'Geist Mono, monospace', margin: 0 }}>
                  {wallet?.address || user?.address || 'No wallet connected'}
                </p>
                {wallet?.address && (
                  <button
                    type="button"
                    onClick={copyWalletAddr}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Copy wallet address"
                  >
                    {copiedWallet ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#64748b" />}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setWalletModalOpen(true)}
                className="btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.86rem' }}
              >
                <span>Connect MetaMask / Rabby</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Notifications (Gibwork style) */}
        {activeTab === 'notifications' && (
          <div className="clean-card" style={{ padding: '28px' }}>
            <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Email &amp; Telegram Notifications
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '3px 0 24px 0' }}>
              Configure alerts for new bounties, review updates, and payments.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>New Bounties</p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Receive alerts when high-reward bounties match your creator tags
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifs.newBounties}
                    onChange={(e) => setNotifs({ ...notifs, newBounties: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Deliverable Reviews &amp; Approvals
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Receive alerts when sponsors review or disburse your USDC escrow
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifs.githubBounties}
                    onChange={(e) => setNotifs({ ...notifs, githubBounties: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Product Updates</p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Receive occasional announcements about BOT Chain upgrades and hackathons
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifs.productUpdates}
                    onChange={(e) => setNotifs({ ...notifs, productUpdates: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Referrals */}
        {activeTab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="clean-card" style={{ padding: '28px' }}>
              <h3 className="font-space" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Earn every time your referrals get paid
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '4px 0 22px 0' }}>
                Share BotBounty with creator friends and collect rewards instantly as users create or complete work on BOT Chain.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    background: '#f8fafc',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '0.85rem',
                    color: '#334155'
                  }}
                />
                <button
                  type="button"
                  onClick={copyRefLink}
                  className="btn-primary"
                  style={{ padding: '10px 18px', fontSize: '0.86rem' }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Social Connection Modal */}
      {socialModalPlatform && (
        <SocialConnectModal
          isOpen={!!socialModalPlatform}
          platform={socialModalPlatform}
          currentHandle={user ? user[socialModalPlatform] : null}
          userId={user?.id}
          onClose={() => setSocialModalPlatform(null)}
          onSuccess={handleSocialSuccess}
        />
      )}

      {/* Interactive Connect Wallet Modal */}
      {walletModalOpen && (
        <ConnectWalletModal
          isOpen={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          user={user}
          wallet={wallet}
          onWalletConnected={handleWalletSuccess}
        />
      )}
    </section>
  );
}
