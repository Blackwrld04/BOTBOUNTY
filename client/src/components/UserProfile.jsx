import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Wallet,
  Copy,
  Check,
  ArrowLeft,
  Camera,
  Upload,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  Award,
  Mail,
  LogOut
} from 'lucide-react';
import { truncateAddress } from '../utils/arc';
import { API_BASE } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
];

export default function UserProfile({
  user,
  setUser,
  wallet,
  bounties,
  onBackToFeed,
  onSelectBounty,
  onOpenSettings,
  onLogout,
  openAuthModal
}) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [profileStats, setProfileStats] = useState({
    submissionsCount: 0,
    winsCount: 0,
    totalEarnings: 0,
    submissions: [],
    disbursements: []
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Fetch verified stats dynamically from backend
  useEffect(() => {
    let isMounted = true;
    const query = new URLSearchParams();
    if (user?.id) query.set('userId', user.id);
    if (user?.email) query.set('email', user.email);
    if (wallet?.address || user?.address) query.set('address', wallet?.address || user?.address);

    setIsLoadingStats(true);
    fetch(`${API_BASE}/api/auth/profile-stats?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.stats) {
          setProfileStats(data.stats);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user profile stats:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, wallet]);

  const copyAddress = () => {
    const addr = wallet?.address || user?.address;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  // Change avatar handler
  const handleSaveAvatar = async (newAvatarUrl) => {
    if (!newAvatarUrl || !user?.id) return;
    setIsUpdatingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          avatar: newAvatarUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAvatarError(data.error || 'Failed to update avatar');
        setIsUpdatingAvatar(false);
        return;
      }

      if (setUser) setUser(data.user);
      localStorage.setItem('botbounty_session_user', JSON.stringify(data.user));
      localStorage.setItem('arcbounty_session_user', JSON.stringify(data.user));
      setAvatarSuccess('Avatar updated successfully!');
      setTimeout(() => {
        setAvatarModalOpen(false);
        setAvatarSuccess('');
        setCustomAvatarUrl('');
      }, 1000);
    } catch (err) {
      console.error('Avatar update failed:', err);
      setAvatarError('Network error while saving avatar');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // File upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Image size exceeds 3MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target.result;
      handleSaveAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const currentAvatar = user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  const isMobile = useIsMobile();

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Top Banner with soft gradient mesh */}
      <div
        style={{
          height: isMobile ? '160px' : '220px',
          background: 'linear-gradient(135deg, #acc6e9 0%, #cdddf2 30%, #e8eff5 65%, #c0827a 100%)',
          position: 'relative'
        }}
      >
        <div className="container" style={{ paddingTop: '20px' }}>
          <button
            onClick={onBackToFeed}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#000000',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Bounties</span>
          </button>
        </div>
      </div>

      {/* Floating Main Profile Card */}
      <div className="container" style={{ marginTop: isMobile ? '-60px' : '-80px', position: 'relative', zIndex: 10 }}>
        <div className="clean-card" style={{ padding: isMobile ? '20px 16px' : '36px', borderRadius: '14px', maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: isMobile ? '16px' : '20px' }}>
            {/* Avatar & User Details */}
            <div style={{ display: 'flex', gap: isMobile ? '14px' : '20px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
              {/* Interactive Avatar Container with Edit Camera Button */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={currentAvatar}
                  alt={user?.name || 'Creator'}
                  style={{
                    width: isMobile ? '72px' : '92px',
                    height: isMobile ? '72px' : '92px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    display: 'block'
                  }}
                />
                <button
                  type="button"
                  id="change-avatar-btn"
                  onClick={() => setAvatarModalOpen(true)}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--arc-blockstream-gold)',
                    border: '2px solid #000000',
                    boxShadow: '1.5px 1.5px 0px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#000000'
                  }}
                  title="Change profile avatar"
                >
                  <Camera size={15} strokeWidth={2.4} />
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 className="font-space" style={{ fontSize: isMobile ? '1.3rem' : '1.65rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {user?.name || 'Arc Creator'}
                  </h1>
                  <ShieldCheck size={20} color="#16a34a" />
                </div>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 700 }}>
                  @{user?.username || 'creator'} · <span style={{ color: '#1b3158' }}>{user?.discipline || 'Creator'}</span>
                </p>

                {/* Wallet Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                  <div
                    onClick={copyAddress}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#f1f5f9',
                      border: '1px solid #000000',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.76rem',
                      fontFamily: 'Geist Mono, monospace',
                      cursor: 'pointer',
                      color: '#0f172a'
                    }}
                    title="Click to copy Arc address"
                  >
                    <Wallet size={12} />
                    <span>{truncateAddress(wallet?.address || user?.address || '0x0000000000000000000000000000000000000000')}</span>
                    {copiedAddr ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  </div>

                  {/* Registered Sign-up Email Pill */}
                  {user?.email && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f8fafc',
                        border: '1px solid #000000',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                      title="Registered Sign-up Email"
                    >
                      <Mail size={12} color="#1b3158" />
                      <span>{user.email}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    style={{
                      background: '#fffae6',
                      border: '1px solid #000000',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: '#000000',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Camera size={11} />
                    <span>Change Avatar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                onClick={onOpenSettings}
              >
                <Edit3 size={14} />
                <span>Account Settings</span>
              </button>

              <button
                id="profile-logout-btn"
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px', color: '#ef4444' }}
                onClick={() => {
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={14} color="#ef4444" />
                <span>Log Out</span>
              </button>

              <button
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Profile link copied to clipboard!');
                }}
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Connected Social Accounts Proof Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
              marginTop: '20px',
              padding: '12px 16px',
              background: '#f8fafc',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              VERIFIED SOCIALS:
            </span>

            {/* X */}
            {user?.x ? (
              <a
                href={`https://x.com/${user.x}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#000000',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <span>X: @{user.x}</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #94a3b8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Connect X
              </button>
            )}

            {/* Telegram */}
            {user?.telegram ? (
              <a
                href={`https://t.me/${user.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#229ED9',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <span>Telegram: @{user.telegram}</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #94a3b8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Connect Telegram
              </button>
            )}

            {/* Discord */}
            {user?.discord ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#5865F2',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <span>Discord: {user.discord}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #94a3b8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Connect Discord
              </button>
            )}

            {/* GitHub */}
            {user?.github ? (
              <a
                href={`https://github.com/${user.github}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <span>GitHub: @{user.github}</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #94a3b8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Connect GitHub
              </button>
            )}
          </div>

          {/* Details & Skills Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: isMobile ? '16px' : '24px',
              marginTop: isMobile ? '16px' : '24px',
              paddingTop: isMobile ? '16px' : '20px',
              borderTop: '2px solid #000000'
            }}
          >
            {/* Skills & Bio */}
            <div>
              <p style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                CREATOR BIO &amp; DISCIPLINE
              </p>
              <p style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4, margin: '0 0 12px 0', fontWeight: 500 }}>
                {user?.bio || 'Web3 Creator on BOT Chain (677 / 968)'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ background: '#fffae6', border: '1.5px solid #000000', color: '#000000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                  {user?.discipline || 'Creator'}
                </span>
                <span style={{ background: '#f1f5f9', border: '1.5px solid #000000', color: '#000000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                  BOT Chain Escrow
                </span>
                <span style={{ background: '#dcfce7', border: '1.5px solid #000000', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                  USDT &amp; $BOT Verified
                </span>
              </div>
            </div>

            {/* Mathematically Consistent Dynamic Stats Metrics */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  ${(profileStats.totalEarnings || 0).toLocaleString()}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 700 }}>
                  EARNINGS COLLECTED
                </p>
              </div>

              <div style={{ width: '2px', height: '30px', background: '#000000' }} />

              <div style={{ textAlign: 'center' }}>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {profileStats.submissionsCount}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 700 }}>
                  SUBMISSIONS
                </p>
              </div>

              <div style={{ width: '2px', height: '30px', background: '#000000' }} />

              <div style={{ textAlign: 'center' }}>
                <p className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#16a34a', margin: 0 }}>
                  {profileStats.winsCount}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 700 }}>
                  WON ON ARC
                </p>
              </div>
            </div>
          </div>

          {/* Submissions & Proof of Work Section */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-space" style={{ fontSize: '1.15rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                PROOF OF WORK &amp; SUBMISSIONS
              </h3>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', border: '1px solid #000000', padding: '2px 8px', borderRadius: '4px' }}>
                {profileStats.submissions.length} Total
              </span>
            </div>

            {profileStats.submissions && profileStats.submissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profileStats.submissions.map((sub) => {
                  const isWon = sub.status === 'awarded' || sub.reward_paid > 0;

                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        background: isWon ? '#f0fdf4' : '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            className="font-space"
                            style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}
                          >
                            {sub.bounty_title || 'Bounty Submission'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 6px 0', lineHeight: 1.4 }}>
                          {sub.notes || 'Deliverable submitted for review.'}
                        </p>
                        <a
                          href={sub.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.74rem',
                            color: '#1b3158',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'underline'
                          }}
                        >
                          <span>View Proof of Work</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {isWon ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{
                              background: '#dcfce7',
                              border: '1.5px solid #16a34a',
                              color: '#166534',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle size={12} color="#16a34a" />
                              <span>AWARDED &amp; DISBURSED</span>
                            </span>
                            <span className="font-space" style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>
                              +{sub.reward_paid || sub.bounty_amount} BOT
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            background: '#fffae6',
                            border: '1.5px solid #000000',
                            color: '#000000',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} />
                            <span>UNDER REVIEW</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '28px',
                  borderRadius: '10px',
                  border: '2px dashed #cbd5e1',
                  background: '#f8fafc',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', margin: '0 0 6px 0' }}>
                  No bounty submissions recorded yet
                </p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px 0' }}>
                  Submit high-impact work to open challenges across Content, Design, Development, and All Social to earn native $BOT.
                </p>
                <button
                  type="button"
                  onClick={onBackToFeed}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', margin: '0 auto' }}
                >
                  <Sparkles size={14} />
                  <span>Explore Open Bounties</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Profile Avatar Modal */}
      {avatarModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setAvatarModalOpen(false)}
        >
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              borderRadius: '14px',
              border: '2.5px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              background: '#ffffff',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--arc-blockstream-gold)',
                    border: '1.5px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Camera size={16} color="#000000" />
                </div>
                <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
                  Change Profile Avatar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #000000',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {avatarError && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1.5px solid #ef4444',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '14px'
                }}
              >
                {avatarError}
              </div>
            )}

            {avatarSuccess && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '1.5px solid #16a34a',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#166534',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} />
                <span>{avatarSuccess}</span>
              </div>
            )}

            {/* Current Avatar Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
              <img
                src={currentAvatar}
                alt="Current avatar"
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #000000' }}
              />
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  Current Public Avatar
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Displayed across your bounties, profile, and submissions
                </span>
              </div>
            </div>

            {/* Option 1: Upload from Computer */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                1. Upload from Device (JPG, PNG, WEBP)
              </span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingAvatar}
                className="brutal-btn brutal-btn-sky"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} />
                <span>{isUpdatingAvatar ? 'Uploading & Updating...' : 'Choose Image File from Computer'}</span>
              </button>
            </div>

            {/* Option 2: Pick from Curated Web3 Avatars */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                2. Or Choose a Web3 Avatar
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: '8px' }}>
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <img
                    key={idx}
                    src={presetUrl}
                    alt={`Avatar preset ${idx + 1}`}
                    onClick={() => handleSaveAvatar(presetUrl)}
                    style={{
                      width: '100%',
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: currentAvatar === presetUrl ? '3px solid var(--arc-blockstream-gold)' : '2px solid #000000',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                      boxShadow: currentAvatar === presetUrl ? '2px 2px 0px #000000' : 'none'
                    }}
                    title="Click to select this avatar"
                  />
                ))}
              </div>
            </div>

            {/* Option 3: Custom URL */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                3. Or Enter Custom Image URL
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveAvatar(customAvatarUrl)}
                  disabled={!customAvatarUrl || isUpdatingAvatar}
                  className="btn-accent"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <span>Apply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
