import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  Star,
  Zap,
  Palette,
  FileText,
  Code,
  Share2,
  Globe,
  Layers,
  Users
} from 'lucide-react';
import { getRemainingTime } from '../utils/time';
import { useIsMobile } from '../utils/useIsMobile';

export default function BountyCard({ bounty, onSelect, now }) {
  const isMobile = useIsMobile();
  const effectiveDeadline = bounty.deadline || (bounty.createdAt && bounty.deadlineDays ? (bounty.createdAt + bounty.deadlineDays * 86400000) : null);
  const remaining = getRemainingTime(effectiveDeadline, now || Date.now());
  const isSettled = bounty.status === 'Settled' || bounty.status === 'Closed';
  const isExpired = remaining.isExpired;
  const isClosed = isSettled || isExpired;
  // Category theme mapped cleanly to official Circle Arc colors
  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'DESIGN':
        return { bg: '#f3e8ff', text: '#6b21a8', border: '#000000', label: 'Design' };
      case 'CREATIVE':
      case 'CONTENT':
        return { bg: '#fff7ed', text: '#c2410c', border: '#000000', label: 'Content' };
      case 'DEV':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#000000', label: 'Development' };
      case 'SOCIAL':
        return { bg: '#fefce8', text: '#a16207', border: '#000000', label: 'All Social' };
      case 'OTHER':
        return { bg: '#fff1f2', text: '#be123c', border: '#000000', label: 'Other' };
      default:
        return { bg: '#fff7ed', text: '#c2410c', border: '#000000', label: 'Content' };
    }
  };

  const theme = getCategoryTheme(bounty.category);

  return (
    <div
      onClick={() => onSelect(bounty)}
      className="bounty-row"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Left: Sponsor Avatar & Discipline Icon */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '10px' : '16px',
        flex: 1,
        minWidth: 0,
        maxWidth: '100%',
        width: '100%'
      }}>
        <div style={{
          width: isMobile ? '38px' : '46px',
          height: isMobile ? '38px' : '46px',
          borderRadius: isMobile ? '8px' : '10px',
          background: theme.bg,
          border: '2px solid #000000',
          boxShadow: '2px 2px 0px #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: isMobile ? '2px' : '0'
        }}>
          {bounty.category === 'DESIGN' && <Palette size={22} color="#664c88" strokeWidth={2.3} />}
          {bounty.category === 'CONTENT' && <FileText size={22} color="#c2410c" strokeWidth={2.3} />}
          {bounty.category === 'DEV' && <Code size={22} color="#1d4ed8" strokeWidth={2.3} />}
          {bounty.category === 'SOCIAL' && <Share2 size={22} color="#a16207" strokeWidth={2.3} />}
          {bounty.category === 'OTHER' && <Globe size={22} color="#be123c" strokeWidth={2.3} />}
          {!['DESIGN', 'CONTENT', 'DEV', 'SOCIAL', 'OTHER'].includes(bounty.category) && (
            <Layers size={22} color="#1b3158" strokeWidth={2.3} />
          )}
        </div>

        {/* Center: Title & Metadata */}
        <div style={{
          minWidth: 0,
          flex: 1,
          maxWidth: '100%',
          paddingRight: isMobile ? '0' : '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', maxWidth: '100%' }}>
            <h3 style={{
              fontSize: isMobile ? '0.94rem' : '1rem',
              fontWeight: 800,
              color: '#000000',
              margin: 0,
              lineHeight: 1.35,
              wordBreak: 'break-word'
            }}>
              {bounty.title}
            </h3>

            {bounty.isMainnetVerified || (bounty.id && bounty.id.startsWith('bounty-mainnet')) ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#166534',
                background: '#dcfce7',
                border: '1.5px solid #16a34a',
                boxShadow: '1.5px 1.5px 0px #16a34a',
                padding: '1px 7px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                <CheckCircle2 size={11} strokeWidth={2.8} />
                ON-CHAIN MAINNET (677)
              </span>
            ) : null}

            {bounty.tags?.includes('Featured') || bounty.amount >= 1200 ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#000000',
                background: 'var(--arc-token-sand)',
                border: '1.5px solid #000000',
                boxShadow: '1.5px 1.5px 0px #000000',
                padding: '1px 7px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                <Star size={10} fill="#000000" strokeWidth={2} />
                FEATURED
              </span>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px 8px' : '12px',
            flexWrap: 'wrap',
            fontSize: '0.78rem',
            color: '#4b5563',
            maxWidth: '100%'
          }}>
            {/* Sponsor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              color: '#000000',
              maxWidth: isMobile ? '135px' : 'none',
              minWidth: 0,
              flexShrink: 1
            }}>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {bounty.maintainerName || 'BOT Chain Sponsor'}
              </span>
              <CheckCircle2 size={13} color="var(--arc-validator-blue)" style={{ flexShrink: 0 }} />
            </div>

            {/* Category Pill */}
            <span style={{
              background: theme.bg,
              color: theme.text,
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px #000000',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.72rem',
              textTransform: 'uppercase'
            }}>
              {theme.label}
            </span>

            {/* Prize Distribution Split Badge */}
            {bounty.rewardDistribution && (
              <span
                style={{
                  background: '#f8fafc',
                  color: '#1e293b',
                  border: '1.5px solid #000000',
                  boxShadow: '1px 1px 0px #000000',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Users size={11} strokeWidth={2.4} />
                <span>
                  {bounty.rewardDistribution.type === 'tiered'
                    ? `${bounty.rewardDistribution.winnerCount} Winners`
                    : bounty.rewardDistribution.type === 'equal'
                    ? `${bounty.rewardDistribution.winnerCount} Winners × ${bounty.rewardDistribution.perWinnerAmount} BOT`
                    : '1 Winner'}
                </span>
              </span>
            )}

            {/* Status / Deadline Badge */}
            {isClosed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 800,
                  color: '#475569',
                  background: '#f1f5f9',
                  border: '1.5px solid #000000',
                  boxShadow: '1px 1px 0px #000000',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase'
                }}
                title={isSettled ? 'Challenge Settled & Disbursed' : 'Challenge Deadline Ended'}
              >
                <CheckCircle2 size={12} color="#16a34a" strokeWidth={2.5} />
                <span>Closed</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  color: remaining.days === 0 ? '#b91c1c' : '#1f2937',
                  background: remaining.days === 0 ? '#fee2e2' : '#f1f5f9',
                  border: '1.5px solid #000000',
                  boxShadow: '1px 1px 0px #000000',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem'
                }}
                title={effectiveDeadline ? `Deadline: ${new Date(effectiveDeadline).toLocaleString()}` : 'No deadline'}
              >
                <Clock size={12} color={remaining.days === 0 ? '#b91c1c' : '#000000'} strokeWidth={2.2} />
                <span>{remaining.text}</span>
              </div>
            )}

            {/* Submissions / Participants */}
            {isClosed ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 800,
                fontSize: '0.74rem',
                color: '#1e3a8a',
                background: '#dbeafe',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1.5px solid #000000',
                boxShadow: '1px 1px 0px #000000'
              }} className="desktop-only">
                <Users size={12} color="#1e40af" strokeWidth={2.5} />
                <span>
                  {bounty.participantsCount || bounty.submissionsCount || (bounty.submissions?.length) || 0} {((bounty.participantsCount || bounty.submissionsCount || (bounty.submissions?.length) || 0) === 1) ? 'Participant' : 'Participants'} &bull; Submissions for Review
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }} className="desktop-only">
                <MessageSquare size={12} />
                <span>{bounty.submissionsCount ? `${bounty.submissionsCount} submissions` : 'Open for submissions'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Payout Amount & Action Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '10px' : '16px',
        flexShrink: 0,
        paddingLeft: isMobile ? '0' : '12px',
        width: isMobile ? '100%' : 'auto',
        maxWidth: '100%',
        justifyContent: isMobile ? 'space-between' : 'flex-end',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: '6px' }}>
            {/* Native $BOT Symbol */}
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#059669',
              color: '#ffffff',
              border: '1.5px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 900,
              flexShrink: 0
            }}>
              B
            </div>
            <span className="font-space" style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: '#000000' }}>
              {bounty.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b5563' }}>$BOT</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
            gap: '4px',
            fontSize: '0.74rem',
            fontWeight: 700,
            marginTop: '2px',
            color: bounty.status === 'Settled' ? '#16a34a' : bounty.status === 'InReview' ? '#d97706' : '#64748b'
          }}>
            {bounty.status === 'Settled' ? (
              <>
                <CheckCircle2 size={12} color="#16a34a" />
                <span>Paid &amp; Settled</span>
              </>
            ) : bounty.status === 'InReview' ? (
              <>
                <Clock size={12} color="#d97706" />
                <span>Under Review</span>
              </>
            ) : (
              <>
                <Zap size={12} color="var(--arc-validator-blue)" />
                <span>BOT Chain Escrow</span>
              </>
            )}
          </div>
        </div>

        <div style={{
          width: isMobile ? '30px' : '36px',
          height: isMobile ? '30px' : '36px',
          borderRadius: '8px',
          background: '#ffffff',
          border: '2px solid #000000',
          boxShadow: '2px 2px 0px #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000000',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}>
          <ArrowUpRight size={17} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
