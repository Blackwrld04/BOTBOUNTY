import React, { useState, useEffect } from 'react';
import { Trophy, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
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

export default function Leaderboard() {
  const [creators, setCreators] = useState(FALLBACK_CREATORS);
  const [loading, setLoading] = useState(true);
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

  const totalLeaderboardEarned = creators.reduce((acc, c) => acc + (Number(c.earned) || 0), 0);
  const totalLeaderboardTasks = creators.reduce((acc, c) => acc + (Number(c.completed) || 0), 0);

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
                  ${totalLeaderboardEarned.toLocaleString()} USDT
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
                {creators.map((c) => (
                  <tr
                    key={c.rank}
                    style={{
                      borderBottom: '2px solid #000000',
                      background: c.rank % 2 === 0 ? '#fafaf8' : '#ffffff',
                      transition: 'background 0.15s'
                    }}
                  >
                    <td style={{ padding: isMobile ? '12px 10px' : '18px 20px' }}>
                      <span style={{
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
                        boxShadow: '2px 2px 0px #000000'
                      }}>
                        #{c.rank}
                      </span>
                    </td>
                    <td style={{ padding: isMobile ? '12px 10px' : '18px 20px' }}>
                      <span className="font-space" style={{ fontSize: isMobile ? '0.88rem' : '1.1rem', fontWeight: 900, color: '#000000' }}>
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
                        ${Number(c.earned).toLocaleString()}
                      </span>
                      <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 800, marginLeft: '4px' }}>USDT</span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
