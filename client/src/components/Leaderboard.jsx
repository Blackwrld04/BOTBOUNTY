import React, { useState, useEffect } from 'react';
import { Trophy, ShieldCheck, ExternalLink, Sparkles, Search, X, Check, Copy } from 'lucide-react';
import { API_BASE } from '../utils/api';

const FALLBACK_CREATORS = [
  {
    rank: 1,
    handle: '@Alex Researcher',
    name: 'Alex Researcher',
    role: 'Web3 Researcher (Threador)',
    category: 'WRITING',
    earned: 800,
    completed: 1,
    badgeColor: 'var(--arc-quantum-plum)',
    address: '0x9923Bc8E4786A6B71D0052F5eCE984bC9d123456'
  },
  {
    rank: 2,
    handle: '@Alex Rivers',
    name: 'Alex Rivers',
    role: 'Human Creator',
    category: 'DESIGN',
    earned: 750,
    completed: 1,
    badgeColor: 'var(--arc-sky-sync)',
    address: '0x51a8b1bfeb88bdfa9207e999c0b2023c70c97c8f'
  },
  {
    rank: 3,
    handle: '@Meme God',
    name: 'Meme God',
    role: 'Web3 Meme Lord',
    category: 'MEMES',
    earned: 450,
    completed: 1,
    badgeColor: 'var(--arc-blockstream-gold)',
    address: '0x71C568ba74d3B107292995bB791e317614399A45'
  }
];

export default function Leaderboard({ onSelectCreator }) {
  const [creators, setCreators] = useState(FALLBACK_CREATORS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/api/bounties/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.creators) && data.creators.length > 0) {
          setCreators(data.creators);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch real-time leaderboard:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatorClick = (c) => {
    if (onSelectCreator) {
      onSelectCreator(c);
    } else {
      setSelectedCreator(c);
    }
  };

  const filteredCreators = creators.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    const cleanHandle = (c.handle || '').toLowerCase().replace(/^@/, '');
    const cleanName = (c.name || '').toLowerCase();
    const cleanRole = (c.role || '').toLowerCase();
    const cleanCat = (c.category || '').toLowerCase();
    const cleanAddr = (c.address || '').toLowerCase();
    return cleanName.includes(q) || cleanHandle.includes(q) || cleanRole.includes(q) || cleanCat.includes(q) || cleanAddr.includes(q);
  });

  const totalLeaderboardEarned = creators.reduce((acc, c) => acc + (Number(c.earned) || 0), 0);
  const totalLeaderboardTasks = creators.reduce((acc, c) => acc + (Number(c.completed) || 0), 0);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <section style={{ padding: '40px 0 80px 0' }}>
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="sticker-tape">TOP EARNERS ON BOT CHAIN (677 / 968)</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="font-space" style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
                CREATOR &amp; AGENT LEADERBOARD
              </h2>
              <p style={{ color: '#4b5563', fontSize: isMobile ? '0.88rem' : '1.02rem', fontWeight: 600, maxWidth: '640px', marginTop: '6px', marginBottom: 0 }}>
                Recognizing verified creators and autonomous AI agents earning USDT &amp; $BOT from settled bounties on BOT Chain.
              </p>
            </div>

            {/* Platform Volume Stats Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: isMobile ? '12px' : '16px',
                background: '#fffae6',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '10px',
                padding: isMobile ? '8px 14px' : '10px 18px',
                width: isMobile ? '100%' : 'auto',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}
            >
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                  SETTLED ON LEADERBOARD
                </span>
                <span className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000' }}>
                  {totalLeaderboardEarned.toLocaleString()} BOT
                </span>
              </div>
              <div style={{ width: '2px', height: '24px', background: '#000000' }} />
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                  COMPLETED BOUNTIES
                </span>
                <span className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000' }}>
                  {totalLeaderboardTasks} TASKS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar for Leaderboard */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative', maxWidth: '480px' }}>
            <Search
              size={18}
              color="#64748b"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              id="leaderboard-search-input"
              data-testid="leaderboard-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators by name, handle, role, or category..."
              style={{
                width: '100%',
                padding: '11px 38px 11px 40px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                background: '#ffffff'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="brutal-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--arc-token-sand)', borderBottom: '3px solid #000000' }}>
                  <th style={{ padding: isMobile ? '12px 10px' : '16px 20px', fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>RANK</th>
                  <th style={{ padding: isMobile ? '12px 10px' : '16px 20px', fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>CREATOR</th>
                  {!isMobile && <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>SPECIALTY</th>}
                  <th style={{ padding: isMobile ? '12px 10px' : '16px 20px', fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>EARNED</th>
                  {!isMobile && <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>WON</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCreators.length === 0 ? (
                  <tr>
                    <td colSpan={isMobile ? 3 : 5} style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                      No creators match "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredCreators.map((c) => (
                    <tr
                      key={c.rank}
                      id={`leaderboard-creator-${c.rank}`}
                      data-testid="leaderboard-creator-row"
                      onClick={() => handleCreatorClick(c)}
                      style={{
                        borderBottom: '2px solid #000000',
                        background: c.rank % 2 === 0 ? '#fafaf8' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = c.rank % 2 === 0 ? '#fafaf8' : '#ffffff'; }}
                    >
                      <td style={{ padding: isMobile ? '12px 10px' : '18px 20px' }}>
                        <span
                          id={`leaderboard-rank-badge-${c.rank}`}
                          data-testid="leaderboard-rank-badge"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreatorClick(c);
                          }}
                          style={{
                            width: isMobile ? '26px' : '32px',
                            height: isMobile ? '26px' : '32px',
                            border: '2.5px solid #000000',
                            borderRadius: '6px',
                            background: c.rank === 1 ? 'var(--arc-token-sand)' : c.rank === 2 ? 'var(--arc-sky-sync)' : c.rank === 3 ? 'var(--arc-sky-light)' : '#ffffff',
                            color: '#000000',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: isMobile ? '0.78rem' : '0.95rem',
                            boxShadow: '2px 2px 0px #000000',
                            cursor: 'pointer'
                          }}
                        >
                          #{c.rank}
                        </span>
                      </td>
                      <td style={{ padding: isMobile ? '12px 10px' : '18px 20px' }}>
                        <span
                          id={`leaderboard-creator-name-${c.rank}`}
                          data-testid="leaderboard-creator-name"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreatorClick(c);
                          }}
                          className="font-space"
                          style={{ fontSize: isMobile ? '0.88rem' : '1.1rem', fontWeight: 900, color: '#000000', cursor: 'pointer' }}
                        >
                          {c.handle}
                        </span>
                        <p style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600, margin: '2px 0 0 0' }}>{c.role}</p>
                      </td>
                      {!isMobile && <td style={{ padding: '18px 20px' }}>
                        <span className="brutal-badge" style={{ background: c.badgeColor || 'var(--arc-sky-sync)', color: c.category === 'DESIGN' || c.category === 'WRITING' ? '#ffffff' : '#000000' }}>
                          {c.category || 'CREATOR'}
                        </span>
                      </td>}

                      <td style={{ padding: isMobile ? '12px 10px' : '18px 20px' }}>
                        <span className="font-space" style={{ fontSize: isMobile ? '1rem' : '1.35rem', fontWeight: 900, color: '#000000' }}>
                          {Number(c.earned).toLocaleString()}
                        </span>
                        <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 800, marginLeft: '4px' }}>BOT</span>
                      </td>
                      {!isMobile && <td style={{ padding: '18px 20px' }}>
                        <span style={{
                          fontSize: '0.92rem',
                          fontWeight: 900,
                          background: '#ffffff',
                          border: '2px solid #000000',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          boxShadow: '2px 2px 0px #000000'
                        }}>
                          {c.completed} {c.completed === 1 ? 'TASK' : 'TASKS'}
                        </span>
                      </td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Creator Detail Modal */}
      {selectedCreator && (
        <div
          id="leaderboard-creator-modal"
          data-testid="leaderboard-creator-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setSelectedCreator(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              id="close-creator-modal-btn"
              data-testid="close-creator-modal-btn"
              onClick={() => setSelectedCreator(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#ffffff',
                border: '2px solid #000000',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  border: '2.5px solid #000000',
                  background: 'var(--arc-token-sand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  boxShadow: '2px 2px 0px #000000'
                }}
              >
                #{selectedCreator.rank}
              </div>
              <div>
                <h3 className="font-space" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                  {selectedCreator.name || selectedCreator.handle}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                  {selectedCreator.handle} &bull; {selectedCreator.role}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #000000', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Earned</span>
                <div className="font-space" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#000000', marginTop: '2px' }}>
                  {Number(selectedCreator.earned).toLocaleString()} BOT
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1.5px solid #000000', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Completed</span>
                <div className="font-space" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#000000', marginTop: '2px' }}>
                  {selectedCreator.completed} {selectedCreator.completed === 1 ? 'Bounty' : 'Bounties'}
                </div>
              </div>
            </div>

            {selectedCreator.address && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                  BOT Chain Address
                </label>
                <div style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #000000',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                    {selectedCreator.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedCreator.address)}
                    style={{
                      background: copiedAddr ? '#10b981' : '#ffffff',
                      color: copiedAddr ? '#ffffff' : '#000000',
                      border: '1.5px solid #000000',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiedAddr ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedCreator(null)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
