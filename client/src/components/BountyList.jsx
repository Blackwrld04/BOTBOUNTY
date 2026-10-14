import React, { useState, useEffect } from 'react';
import { Filter, Sparkles, Bot, Search, SlidersHorizontal, ArrowRight, Layers } from 'lucide-react';
import BountyCard from './BountyCard';
import SidebarWidgets from './SidebarWidgets';
import { CREATOR_CATEGORIES } from '../data/initialBounties';
import { isChallengeExpired } from '../utils/time';

export default function BountyList({
  bounties,
  onSelectBounty,
  stats,
  openCreateModal,
  searchQuery,
  setSearchQuery,
  setActiveTab
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('All');
  const [now, setNow] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Real-time countdown ticker every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter logic: keeps Settled tab visible and allows browsing all bounties
  const filteredBounties = bounties.filter((b) => {
    const effectiveDeadline = b.deadline || (b.createdAt && b.deadlineDays ? (b.createdAt + b.deadlineDays * 86400000) : null);
    const isExpired = effectiveDeadline && now >= effectiveDeadline;
    const isClosed = b.status === 'Closed' || isExpired;

    // Status filter
    if (activeStatus === 'Open') {
      // In Open tab, show only active non-expired bounties
      if (b.status !== 'Open' || isExpired) {
        return false;
      }
    } else if (activeStatus === 'Closed') {
      if (!isClosed) {
        return false;
      }
    } else if (activeStatus === 'Settled') {
      // In Settled tab, show settled bounties
      if (b.status !== 'Settled') {
        return false;
      }
    } else if (activeStatus === 'InReview') {
      if (b.status !== 'InReview') {
        return false;
      }
    } else if (activeStatus !== 'All') {
      if (b.status !== activeStatus) {
        return false;
      }
    }

    // Category
    if (activeCategory !== 'ALL' && b.category !== activeCategory) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchDesc = b.description?.toLowerCase().includes(q);
      const matchCat = b.category?.toLowerCase().includes(q);
      const matchTags = b.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchTags;
    }
    return true;
  });

  return (
    <section style={{ padding: '24px 0 60px 0', minHeight: '600px' }}>
      <div className="container">
        {/* 70% / 30% Dual Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 340px',
          gap: isMobile ? '20px' : '36px',
          alignItems: 'start',
          width: '100%',
          maxWidth: '100%'
        }}>
          {/* Main Feed (Left 70%) */}
          <div style={{ minWidth: 0, maxWidth: '100%', width: '100%' }}>
            {/* Header & Subtabs */}
            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '14px',
              width: '100%',
              maxWidth: '100%'
            }}>
              <div style={{ minWidth: 0, maxWidth: '100%' }}>
                <h2 className="font-space" style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 900, color: '#000000', margin: 0, letterSpacing: '-0.02em' }}>
                  Browse Opportunities
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: '2px 0 0 0', fontWeight: 600 }}>
                  Showing {filteredBounties.length} open creator tasks across Content, Design, Dev, Social, and Other
                </p>
              </div>

              {/* Status Filter Subtabs (Neo-Brutalist) */}
              <div style={{ display: 'flex', gap: '4px', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', overflowX: 'auto', maxWidth: '100%', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
                {['All', 'Open', 'InReview', 'Closed', 'Settled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setActiveStatus(st)}
                    style={{
                      background: activeStatus === st ? 'var(--arc-protocol-navy)' : 'transparent',
                      color: activeStatus === st ? '#ffffff' : '#000000',
                      border: 'none',
                      borderRadius: '5px',
                      padding: isMobile ? '4px 8px' : '5px 12px',
                      fontSize: isMobile ? '0.72rem' : '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {st === 'InReview' ? 'In Review' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills (Exact 6 Categories: All Bounties, Content, Design, Development, All Social, Other) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '14px',
              marginBottom: '16px',
              width: '100%',
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch'
            }}>
              {CREATOR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  id={`filter-category-${cat.id.toLowerCase()}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile Leaderboard Fast-Track Shortcut */}
            {isMobile && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof setActiveTab === 'function') {
                      setActiveTab('leaderboard');
                      if (typeof window !== 'undefined') window.history.pushState({}, '', '/leaderboard');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--arc-token-sand)',
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    boxShadow: '2px 2px 0px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    color: '#000000',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏆 View Creator &amp; Agent Leaderboard
                  </span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Bounty Horizontal Rows Stream */}
            {filteredBounties.length > 0 ? (
              <div style={{ width: '100%', maxWidth: '100%' }}>
                {filteredBounties.map((bounty) => (
                  <BountyCard
                    key={bounty.id}
                    bounty={bounty}
                    onSelect={onSelectBounty}
                    now={now}
                  />
                ))}
              </div>
            ) : (
              <div className="clean-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#000000' }}>
                  No matching bounties found
                </p>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
                  Try switching categories or clearing your search filter.
                </p>
                <button
                  onClick={() => { setActiveCategory('ALL'); setActiveStatus('All'); setSearchQuery(''); }}
                  className="btn-secondary"
                  style={{ marginTop: '16px' }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar Widgets (Right 30%) */}
          <div className="desktop-only" style={{ position: 'sticky', top: '90px' }}>
            <SidebarWidgets
              stats={stats}
              onOpenCreate={openCreateModal}
              onNavigateToLeaderboard={() => {
                if (typeof setActiveTab === 'function') {
                  setActiveTab('leaderboard');
                  if (typeof window !== 'undefined') window.history.pushState({}, '', '/leaderboard');
                }
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
