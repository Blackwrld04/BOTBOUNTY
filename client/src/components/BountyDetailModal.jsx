import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Shield,
  Clock,
  ArrowRight,
  Zap,
  Copy,
  Check,
  Link as LinkIcon,
  FileText,
  User,
  Package,
  Users,
  Award,
  ShieldAlert,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  History,
  Share2,
  Send,
  MessageCircle,
  HelpCircle,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { truncateAddress } from '../utils/arc';
import { getRemainingTime } from '../utils/time';
import { API_BASE } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';

export default function BountyDetailModal({
  bounty,
  onClose,
  onSubmitSolution,
  onReleaseBounty,
  wallet,
  user,
  isAdmin: propIsAdmin,
  openAuthModal
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'discussion'
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [payoutWallet, setPayoutWallet] = useState(wallet.address || user?.address || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [submissions, setSubmissions] = useState(() => {
    let initial = Array.isArray(bounty.submissions) ? bounty.submissions : [];
    try {
      const mySubs = JSON.parse(localStorage.getItem('arcbounty_my_submissions') || '{}');
      if (bounty?.id && mySubs[bounty.id] && !initial.some((s) => s.id === mySubs[bounty.id].id)) {
        initial = [mySubs[bounty.id], ...initial];
      }
    } catch (e) {}
    return initial;
  });
  const [totalSubmissionsCount, setTotalSubmissionsCount] = useState(
    typeof bounty.submissionsCount === 'number'
      ? bounty.submissionsCount
      : (Array.isArray(bounty.submissions) ? bounty.submissions.length : 0)
  );
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Submissions Revision & Co-Creators State
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);
  const [hasCollaborators, setHasCollaborators] = useState(false);
  const [collaborators, setCollaborators] = useState([
    { address: '', percentage: 40, role: 'Co-Creator' }
  ]);
  const submissionFormRef = useRef(null);

  // Community Q&A State
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch full bounty details and live submissions from backend
  const fetchBountyDetails = async () => {
    if (!bounty?.id) return;
    try {
      setLoadingSubmissions(true);
      const token = localStorage.getItem('arcbounty_session_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const activeEmail = user?.email;
      const activeWallet = wallet?.address || user?.address || payoutWallet;
      if (activeEmail) headers['x-user-email'] = activeEmail;
      if (activeWallet) headers['x-wallet-address'] = activeWallet;

      const params = new URLSearchParams();
      if (activeEmail) params.set('email', activeEmail);
      if (activeWallet) params.set('wallet', activeWallet);
      const url = `${API_BASE}/api/bounties/${bounty.id}${params.toString() ? '?' + params.toString() : ''}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success && data.bounty) {
        if (typeof data.bounty.submissionsCount === 'number') {
          setTotalSubmissionsCount(data.bounty.submissionsCount);
        }
        let serverSubs = Array.isArray(data.bounty.submissions) ? data.bounty.submissions : [];

        // Also check localStorage submissions cache for personal deliverable
        try {
          const mySubs = JSON.parse(localStorage.getItem('arcbounty_my_submissions') || '{}');
          const cachedSub = mySubs[bounty.id];
          if (cachedSub && !serverSubs.some((s) => s.id === cachedSub.id)) {
            serverSubs = [cachedSub, ...serverSubs];
          }
        } catch (e) {}

        setSubmissions(serverSubs);
      }
    } catch (err) {
      console.warn('Failed to fetch submissions for bounty:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchBountyDetails();
  }, [bounty?.id]);

  // Fetch Q&A discussion comments
  const fetchComments = async () => {
    if (!bounty?.id) return;
    try {
      setLoadingComments(true);
      const res = await fetch(`${API_BASE}/api/bounties/${bounty.id}/comments`);
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err) {
      console.warn('Failed to fetch comments for bounty:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [bounty?.id]);

  if (!bounty) return null;

  const effectiveDeadline = bounty.deadline || (bounty.createdAt && bounty.deadlineDays ? (bounty.createdAt + bounty.deadlineDays * 86400000) : null);
  const remaining = getRemainingTime(effectiveDeadline, now);
  const isSettled = bounty.status === 'Settled' || bounty.status === 'Closed';
  const isExpired = remaining.isExpired;
  const isClosed = isSettled || isExpired;

  const isCreatorOfBounty = Boolean(
    (user || wallet?.address) && bounty && (
      (bounty.maintainerEmail && user?.email && bounty.maintainerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
      (bounty.maintainer && (
        (user?.address && bounty.maintainer.trim().toLowerCase() === user.address.trim().toLowerCase()) ||
        (wallet?.address && bounty.maintainer.trim().toLowerCase() === wallet.address.trim().toLowerCase())
      ))
    )
  );

  const isPlatformAdmin = Boolean(
    propIsAdmin ||
    (user?.email && user.email.toLowerCase() === 'olajideabdulquadri22@gmail.com')
  );

  // Find user's existing submission if already submitted
  const userSubmission = submissions.find((s) => {
    if (!s) return false;
    const sEmail = (s.creator_email || s.creatorEmail || '').trim().toLowerCase();
    const sWallet = (s.wallet_address || s.walletAddress || '').trim().toLowerCase();
    const uEmail = (user?.email || '').trim().toLowerCase();
    const uWallet = (user?.address || '').trim().toLowerCase();
    const wWallet = (wallet?.address || '').trim().toLowerCase();
    const pWallet = (payoutWallet || '').trim().toLowerCase();

    if (uEmail && sEmail && uEmail === sEmail) return true;
    if (uWallet && sWallet && uWallet === sWallet) return true;
    if (wWallet && sWallet && wWallet === sWallet) return true;
    if (pWallet && sWallet && pWallet === sWallet) return true;
    return false;
  }) || (submissions.length > 0 && !isPlatformAdmin ? submissions[0] : null);

  const startRevision = (sub) => {
    const target = sub || userSubmission;
    if (!target) return;
    setActiveTab('details');
    setIsRevisionMode(true);
    setEditingSubId(target.id);
    setSubmissionUrl(target.submission_url || target.submissionUrl || '');
    setNotes(target.notes || '');
    if (target.wallet_address || target.walletAddress) {
      setPayoutWallet(target.wallet_address || target.walletAddress);
    }
    if (Array.isArray(target.collaborators) && target.collaborators.length > 0) {
      setHasCollaborators(true);
      setCollaborators(target.collaborators);
    } else {
      setHasCollaborators(false);
      setCollaborators([{ address: '', percentage: 40, role: 'Co-Creator' }]);
    }
    setTimeout(() => {
      if (submissionFormRef.current) {
        submissionFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const cancelRevision = () => {
    setIsRevisionMode(false);
    setEditingSubId(null);
    setSubmissionUrl(userSubmission?.submission_url || userSubmission?.submissionUrl || '');
    setNotes(userSubmission?.notes || '');
    setHasCollaborators(false);
  };

  const handleAddCollaborator = () => {
    setCollaborators((prev) => [...prev, { address: '', percentage: 20, role: 'Co-Creator' }]);
  };

  const handleRemoveCollaborator = (index) => {
    setCollaborators((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCollaborator = (index, field, val) => {
    setCollaborators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    );
  };

  const totalCollaboratorShare = hasCollaborators
    ? collaborators.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0)
    : 0;
  const primaryShare = Math.max(0, 100 - totalCollaboratorShare);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionUrl) return;

    const validCollaborators = hasCollaborators
      ? collaborators.filter((c) => c.address && c.address.trim() && Number(c.percentage) > 0)
      : [];

    if (hasCollaborators && totalCollaboratorShare >= 100) {
      alert('Total collaborator percentage must be less than 100% so the primary submitter receives their share.');
      return;
    }

    if (userSubmission && !isRevisionMode) {
      alert('You have already submitted a deliverable for this challenge. Please click "Edit Deliverable" to revise your existing submission.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRevisionMode && (editingSubId || userSubmission?.id)) {
        const targetSubId = editingSubId || userSubmission?.id;
        const token = localStorage.getItem('arcbounty_session_token');
        const activeSub = submissions.find((s) => s.id === targetSubId) || userSubmission;
        const res = await fetch(`${API_BASE}/api/bounties/${bounty.id}/submissions/${targetSubId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            submissionUrl,
            notes,
            collaborators: validCollaborators,
            submitterEmail: user?.email || activeSub?.creator_email || activeSub?.creatorEmail,
            submitterWallet: payoutWallet || wallet.address || user?.address || activeSub?.wallet_address || activeSub?.walletAddress
          })
        });

        const data = await res.json();
        if (data.success && data.submission) {
          const updatedSub = {
            ...data.submission,
            submission_url: data.submission.submission_url || data.submission.submissionUrl || submissionUrl,
            wallet_address: data.submission.wallet_address || data.submission.walletAddress || payoutWallet || activeSub?.wallet_address,
            creator_email: data.submission.creator_email || data.submission.creatorEmail || activeSub?.creator_email,
            notes: data.submission.notes !== undefined ? data.submission.notes : notes,
            revision_count: data.submission.revision_count || data.submission.revisionCount || ((activeSub?.revision_count || 1) + 1),
            collaborators: data.submission.collaborators || validCollaborators,
            submitted_at: Date.now()
          };

          setSubmissions((prev) =>
            prev.map((s) => (s.id === targetSubId ? updatedSub : s))
          );

          try {
            const mySubs = JSON.parse(localStorage.getItem('arcbounty_my_submissions') || '{}');
            mySubs[bounty.id] = updatedSub;
            localStorage.setItem('arcbounty_my_submissions', JSON.stringify(mySubs));
          } catch (e) {}

          setIsRevisionMode(false);
          setEditingSubId(null);
          fetchBountyDetails();
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          alert('Submission updated! New revision recorded in audit history.');
        } else {
          alert(data.error || 'Failed to update submission');
        }
      } else {
        const result = await onSubmitSolution(
          bounty.id,
          submissionUrl,
          payoutWallet || wallet.address || user?.address,
          'Human Creator',
          notes,
          validCollaborators
        );

        if (result?.submission) {
          const newSub = {
            ...result.submission,
            submission_url: result.submission.submission_url || result.submission.submissionUrl || submissionUrl,
            wallet_address: result.submission.wallet_address || result.submission.walletAddress || payoutWallet || wallet.address || user?.address,
            creator_email: result.submission.creator_email || result.submission.creatorEmail || user?.email,
            creator_name: result.submission.creator_name || result.submission.creatorName || user?.name || 'Creator',
            revision_count: result.submission.revision_count || result.submission.revisionCount || 1,
            notes: result.submission.notes !== undefined ? result.submission.notes : notes,
            collaborators: result.submission.collaborators || validCollaborators,
            submitted_at: result.submission.submitted_at || result.submission.submittedAt || Date.now()
          };

          setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
          setTotalSubmissionsCount((prev) => Math.max(prev + 1, 1));

          try {
            const mySubs = JSON.parse(localStorage.getItem('arcbounty_my_submissions') || '{}');
            mySubs[bounty.id] = newSub;
            localStorage.setItem('arcbounty_my_submissions', JSON.stringify(mySubs));
          } catch (e) {}
        }

        fetchBountyDetails();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert(err.message || 'Failed to submit deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const token = localStorage.getItem('arcbounty_session_token');
      const authorRole = isCreatorOfBounty ? 'sponsor' : (user ? 'creator' : 'community');
      const res = await fetch(`${API_BASE}/api/bounties/${bounty.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content: newComment.trim(),
          authorName: user?.name || (wallet?.address ? truncateAddress(wallet.address) : 'Arc Builder'),
          authorRole
        })
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
      } else {
        alert(data.error || 'Failed to post comment');
      }
    } catch (err) {
      alert('Error posting comment: ' + err.message);
    } finally {
      setIsPostingComment(false);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '740px',
          maxHeight: isMobile ? '95vh' : '90vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          border: 'var(--border-thick)',
          boxShadow: 'var(--shadow-hard)',
          padding: isMobile ? '20px 16px' : '32px',
          position: 'relative',
          background: '#ffffff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#ffffff',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            zIndex: 10
          }}
        >
          <X size={18} color="#000000" />
        </button>

        {/* Top Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--arc-sky-sync)',
            color: '#000000',
            border: '1.5px solid #000000',
            boxShadow: '1.5px 1.5px 0px #000000',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            {bounty.categoryName || (bounty.category === 'CREATIVE' ? 'CONTENT' : bounty.category) || 'CONTENT'}
          </span>
          <span style={{
            background: '#ffffff',
            color: '#000000',
            border: '1.5px solid #000000',
            boxShadow: '1.5px 1.5px 0px #000000',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Package size={13} strokeWidth={2.2} />
            <span>{bounty.submissionType || 'Work Deliverable'}</span>
          </span>
          {isClosed ? (
            <span style={{
              background: '#e2e8f0',
              color: '#334155',
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px #000000',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textTransform: 'uppercase'
            }}>
              <CheckCircle2 size={13} strokeWidth={2.4} color="#16a34a" />
              <span>Closed</span>
            </span>
          ) : (
            <span style={{
              background: remaining.days === 0 ? '#fef3c7' : '#f8fafc',
              color: '#000000',
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px #000000',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Clock size={13} strokeWidth={2.2} color={remaining.days === 0 ? '#b91c1c' : '#000000'} />
              <span>{remaining.text}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="font-space" style={{ fontSize: '1.65rem', fontWeight: 900, color: '#000000', lineHeight: 1.25, marginBottom: '18px' }}>
          {bounty.title}
        </h2>

        {/* Escrow Reward Banner (Neo-Brutalist) */}
        <div style={{
          background: 'var(--arc-static-ether)',
          border: '2px solid #000000',
          boxShadow: '3.5px 3.5px 0px #000000',
          borderRadius: '10px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--arc-protocol-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CANONICAL CIRCLE USDC ESCROW
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span className="font-space" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#000000' }}>
                ${bounty.amount.toLocaleString()}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#4b5563' }}>USDC</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'Geist Mono, monospace' }}>
                (0x3600...0000)
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SPONSOR GUILD</span>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#000000', margin: '2px 0 0 0' }}>
              {bounty.maintainerName || 'Arc Creator DAO'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'Geist Mono, monospace', margin: 0 }}>
              {truncateAddress(bounty.maintainer)}
            </p>
          </div>
        </div>

        {/* Neo-Brutalist Tabs Bar: Deliverables & Specs vs Community Q&A */}
        <div style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2.5px solid #000000',
          paddingBottom: '12px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '2px solid #000000',
              boxShadow: activeTab === 'details' ? '2.5px 2.5px 0px #000000' : 'none',
              background: activeTab === 'details' ? 'var(--arc-protocol-navy)' : '#ffffff',
              color: activeTab === 'details' ? '#ffffff' : '#000000',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease'
            }}
          >
            <Package size={15} />
            <span>Deliverables &amp; Specs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discussion')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '2px solid #000000',
              boxShadow: activeTab === 'discussion' ? '2.5px 2.5px 0px #000000' : 'none',
              background: activeTab === 'discussion' ? 'var(--arc-protocol-navy)' : '#ffffff',
              color: activeTab === 'discussion' ? '#ffffff' : '#000000',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={15} />
            <span>Community Q&amp;A ({comments.length})</span>
          </button>
        </div>

        {/* TAB 1: DELIVERABLES & SPECS */}
        {activeTab === 'details' && (
          <div>
            {/* Prize Pool Distribution Breakdown */}
            {bounty.rewardDistribution && (
              <div style={{
                background: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--arc-protocol-navy)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      PRIZE POOL SHARING &amp; REWARD TIERS
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: 'var(--arc-token-sand)',
                    border: '1px solid #000000',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {bounty.rewardDistribution.type === 'tiered'
                      ? `${bounty.rewardDistribution.winnerCount} Ranked Winners`
                      : bounty.rewardDistribution.type === 'equal'
                      ? `${bounty.rewardDistribution.winnerCount} Equal Winners`
                      : '1 Winner'}
                  </span>
                </div>

                {bounty.rewardDistribution.type === 'tiered' && Array.isArray(bounty.rewardDistribution.tiers) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {bounty.rewardDistribution.tiers.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: idx === 0 ? '#fffae6' : '#f8fafc',
                          border: '1.5px solid #000000',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
                          {t.label || `${t.place} Place`}
                        </span>
                        <span className="font-space" style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                          ${t.amount.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>USDC</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {bounty.rewardDistribution.type === 'equal' && (
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1f2937' }}>
                    <strong>{bounty.rewardDistribution.winnerCount} creators</strong> will each receive an equal share of <strong>${bounty.rewardDistribution.perWinnerAmount} USDC</strong> (${bounty.amount.toLocaleString()} USDC total).
                  </div>
                )}

                {bounty.rewardDistribution.type === 'single' && (
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1f2937' }}>
                    Winner takes all: <strong>${bounty.amount.toLocaleString()} USDC</strong> awarded to the winning deliverable.
                  </div>
                )}
              </div>
            )}

            {/* Escrow Timeline */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                SETTLEMENT LIFECYCLE
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: '#ffffff', border: '2px solid #000000', boxShadow: '2px 2px 0px #000000' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', color: '#16a34a' }}>
                    <CheckCircle2 size={15} />
                    <span>1. Funded</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: '2px 0 0 0', fontWeight: 600 }}>Locked in Arc Escrow</p>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: bounty.status === 'InReview' || bounty.status === 'Settled' ? 'var(--arc-token-sand)' : '#ffffff',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', color: '#000000' }}>
                    <Clock size={15} />
                    <span>2. Delivered</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: '2px 0 0 0', fontWeight: 600 }}>
                    {bounty.status === 'Open' ? 'Awaiting Submission' : 'In Review'}
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: bounty.status === 'Settled' ? '#bbf7d0' : '#ffffff',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', color: '#000000' }}>
                    <Zap size={14} />
                    <span>3. Disbursed</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: '2px 0 0 0', fontWeight: 600 }}>
                    {bounty.status === 'Settled' ? '<400ms Finality' : 'Upon Admin Approval'}
                  </p>
                </div>
              </div>
            </div>

            {/* Specifications & Acceptance Criteria */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                SPECIFICATIONS &amp; ACCEPTANCE CRITERIA
              </h4>
              <div style={{
                padding: '18px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#1f2937',
                whiteSpace: 'pre-line'
              }}>
                {bounty.description}
              </div>
            </div>

            {/* Submitted Work Link */}
            {bounty.prUrl && (
              <div style={{
                marginBottom: '24px',
                padding: '16px 18px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--arc-validator-blue)' }}>SUBMITTED DELIVERABLE</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <a
                    href={bounty.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#000000', fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>{bounty.prUrl}</span>
                    <ExternalLink size={14} />
                  </a>
                  <span style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 600 }}>
                    By: {truncateAddress(bounty.solver)} ({bounty.solverType || 'Creator'})
                  </span>
                </div>
              </div>
            )}

            {/* Settlement Transaction Proof if Settled */}
            {bounty.status === 'Settled' && bounty.settlementTx && (
              <div style={{
                marginBottom: '24px',
                padding: '16px 18px',
                borderRadius: '10px',
                background: '#bbf7d0',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534' }}>BOT CHAIN SETTLEMENT PROOF</span>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#000000', margin: '4px 0 0 0' }}>
                      {bounty.settlementTx}
                    </p>
                  </div>
                  <button
                    onClick={() => copyHash(bounty.settlementTx)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #000000',
                      boxShadow: '1.5px 1.5px 0px #000000',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    {copied ? 'Copied' : 'Copy Tx'}
                  </button>
                </div>
              </div>
            )}

            {/* Challenge Closed Banner if expired or settled */}
            {isClosed && (
              <div style={{
                background: '#f8fafc',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '22px'
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 900, fontSize: '1.05rem', marginBottom: '6px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>CHALLENGE CLOSED &bull; SUBMISSIONS LOCKED</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
                  {isExpired
                    ? 'This challenge has reached its completion deadline. Deliverable submissions are strictly closed.'
                    : 'This challenge has completed review and USDC disbursement is settled.'}
                </p>
              </div>
            )}

            {/* Participants & Live Submissions Activity */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--arc-validator-blue)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                    Submissions Activity ({totalSubmissionsCount})
                  </h3>
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1.5px solid #000000',
                  boxShadow: '1px 1px 0px #000000'
                }}>
                  {totalSubmissionsCount} {totalSubmissionsCount === 1 ? 'Submission' : 'Submissions'} Received
                </span>
              </div>

              {loadingSubmissions ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading submissions activity...
                </div>
              ) : totalSubmissionsCount === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b'
                }}>
                  <Users size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>No Submissions Received Yet</p>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>
                    Be the first creator to submit your deliverable for this challenge.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Blind Submission Privacy Protocol Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '2px solid #000000',
                    boxShadow: '2.5px 2.5px 0px #000000',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#1b3158',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.85rem'
                        }}>
                          {totalSubmissionsCount}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                            {totalSubmissionsCount} Deliverable{totalSubmissionsCount === 1 ? '' : 's'} Submitted
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Challenge is live &bull; Escrow guaranteed
                          </div>
                        </div>
                      </div>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1.5px solid #3b82f6',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        <Lock size={12} />
                        <span>Direct Review Flow (v1)</span>
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                      🔒 <strong>Direct Deliverable Review &amp; On-Chain Settlement:</strong> In v1 of the portal, deliverables (GitHub PR / link) are submitted directly to the maintainer for evaluation and verified on-chain via Bohr Escrow (<code>submitSolution</code> / <code>releaseBounty</code>). Submissions are access-controlled so solvers see only their own work during review, while final winner deliverables and disbursements settle publicly on-chain. Smart contract cryptographic blind commit-reveal (<code>submitSolutionCommitment</code>) is reserved for Phase 2 privacy agent workflows.
                    </p>
                  </div>

                  {/* If current user has submitted, display their own deliverable with Edit Deliverable action */}
                  {userSubmission && (
                    <div style={{
                      background: '#ffffff',
                      border: '2px solid var(--arc-validator-blue)',
                      boxShadow: '2.5px 2.5px 0px #000000',
                      borderRadius: '8px',
                      padding: '14px 16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'var(--arc-validator-blue)',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '0.68rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em'
                          }}>
                            YOUR SUBMISSION
                          </span>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            border: '1px solid #000000',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <History size={10} />
                            <span>v{userSubmission.revision_count || 1}</span>
                          </span>
                          {userSubmission.status === 'awarded' && (
                            <span style={{
                              background: '#bbf7d0',
                              color: '#166534',
                              border: '1px solid #166534',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Award size={11} />
                              <span>WINNER &bull; ${userSubmission.reward_paid || bounty.amount} USDC</span>
                            </span>
                          )}
                        </div>

                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => startRevision(userSubmission)}
                            style={{
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1.5px solid #000000',
                              boxShadow: '1px 1px 0px #000000',
                              borderRadius: '5px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={11} />
                            <span>Edit Deliverable</span>
                          </button>
                        )}
                      </div>

                      {/* Co-Creators Collaboration Split Pills if any */}
                      {Array.isArray(userSubmission.collaborators) && userSubmission.collaborators.length > 0 && (
                        <div style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          marginBottom: '8px',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <span style={{ fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Share2 size={12} />
                            <span>Co-Creators Split:</span>
                          </span>
                          {userSubmission.collaborators.map((collab, cIdx) => (
                            <span
                              key={cIdx}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #000000',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}
                            >
                              {collab.role || 'Co-Creator'}: {truncateAddress(collab.address)} ({collab.percentage}%)
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Deliverable URL */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginBottom: userSubmission.notes ? '8px' : '4px'
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
                          YOUR DELIVERABLE URL
                        </div>
                        <a
                          href={userSubmission.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--arc-validator-blue)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            wordBreak: 'break-all'
                          }}
                        >
                          <span>{userSubmission.submission_url}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Notes */}
                      {userSubmission.notes && (
                        <div style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic', margin: '4px 0' }}>
                          "{userSubmission.notes}"
                        </div>
                      )}

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', textAlign: 'right' }}>
                        Submitted {new Date(userSubmission.submitted_at).toLocaleDateString()} at {new Date(userSubmission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}

                  {/* If challenge is settled, show winning awarded deliverables */}
                  {bounty.status === 'Settled' && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '2px solid #16a34a',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      boxShadow: '2px 2px 0px #000000'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, color: '#166534', fontSize: '0.88rem', marginBottom: '4px' }}>
                        <Award size={16} />
                        <span>Official Winning Outcome Settled</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d' }}>
                        Escrow prize disbursement of ${bounty.amount?.toLocaleString()} USDT is complete with instant finality on BOT Chain.
                      </p>
                    </div>
                  )}

                  {/* Admin-only review queue if caller is the platform administrator */}
                  {isPlatformAdmin && submissions.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '14px',
                      background: '#fffbeb',
                      border: '2px dashed #b45309',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, color: '#92400e', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <Shield size={14} />
                        <span>Admin Inspection Queue ({submissions.length} Submissions)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {submissions.map((sub, sIdx) => (
                          <div key={sub.id || sIdx} style={{ background: '#ffffff', border: '1px solid #d97706', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 800 }}>
                              <span>{sub.creator_name || 'Anonymous'} ({truncateAddress(sub.wallet_address)})</span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>v{sub.revision_count || 1}</span>
                            </div>
                            <a href={sub.submission_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                              {sub.submission_url}
                            </a>
                            {sub.notes && <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '3px' }}>"{sub.notes}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBMISSION / EDIT FORM SECTION (Active if Open or InReview, and not closed/settled) */}
            {(bounty.status === 'Open' || bounty.status === 'InReview') && !isClosed && (
              <div ref={submissionFormRef} style={{ borderTop: '2px solid #000000', paddingTop: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                    {isRevisionMode
                      ? `Revise Your Deliverable (v${(submissions.find((s) => s.id === editingSubId)?.revision_count || userSubmission?.revision_count || 1) + 1})`
                      : 'Submit Your Deliverable'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#4b5563' }}>
                    <Clock size={14} color="var(--arc-validator-blue)" />
                    <span>Time remaining: <strong>{remaining.text}</strong></span>
                  </div>
                </div>

                {isCreatorOfBounty ? (
                  <div style={{
                    background: '#fefce8',
                    border: '2px solid #ca8a04',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#fef08a',
                      border: '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto'
                    }}>
                      <ShieldAlert size={24} color="#854d0e" />
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                      You Created This Bounty Challenge
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#713f12', margin: '0 auto 14px auto', maxWidth: '480px', lineHeight: 1.45, fontWeight: 600 }}>
                      Bounty creators cannot participate in or submit solutions to their own bounties. You can monitor participant activity and review creator proofs in the Admin Console.
                    </p>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ffffff',
                      border: '1.5px solid #000000',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#1b3158'
                    }}>
                      <span>Maintainer: {bounty.maintainerEmail || truncateAddress(bounty.maintainer)}</span>
                    </div>
                  </div>
                ) : !user && !wallet?.address && !userSubmission ? (
                  <div style={{
                    background: 'var(--arc-static-ether)',
                    border: '2px solid #000000',
                    boxShadow: '2.5px 2.5px 0px #000000',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#000000', marginBottom: '6px' }}>
                      Sign in or create an account to submit work
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#4b5563', marginBottom: '18px', maxWidth: '440px', margin: '0 auto 18px auto', fontWeight: 500 }}>
                      Join thousands of creators earning USDT on BOT Chain. Submit your deliverable and get paid with zero gas fees.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => { onClose(); openAuthModal && openAuthModal('signup'); }}
                        className="btn-accent"
                        style={{ padding: '10px 22px', fontSize: '0.88rem' }}
                      >
                        <span>Sign Up to Submit</span>
                        <ArrowRight size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { onClose(); openAuthModal && openAuthModal('login'); }}
                        className="btn-secondary"
                        style={{ padding: '10px 20px', fontSize: '0.88rem' }}
                      >
                        <span>Log In</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* User already submitted notice with deliverable details & edit trigger */}
                    {userSubmission && !isRevisionMode && (
                      <div style={{
                        background: '#f0fdf4',
                        border: '2px solid #16a34a',
                        boxShadow: '2.5px 2.5px 0px #000000',
                        borderRadius: '8px',
                        padding: '16px 18px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 size={18} color="#16a34a" />
                              <span>Your Work Is Submitted for Review (Revision v{userSubmission.revision_count || 1})</span>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '3px 0 0 0', fontWeight: 600 }}>
                              Your deliverable is recorded on BOT Chain. Only one submission is permitted per creator — click <strong>Edit Deliverable</strong> to update your solution, notes, or co-creator splits before the deadline.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startRevision(userSubmission)}
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #000000',
                              boxShadow: '1.5px 1.5px 0px #000000',
                              borderRadius: '6px',
                              padding: '7px 14px',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit Deliverable</span>
                          </button>
                        </div>

                        {/* Submitted Deliverable Details */}
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#0f172a' }}>Deliverable URL:</strong>
                            <a
                              href={userSubmission.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb', wordBreak: 'break-all', fontWeight: 700, textDecoration: 'underline' }}
                            >
                              {userSubmission.submission_url}
                            </a>
                          </div>
                          {userSubmission.notes && (
                            <div>
                              <strong style={{ color: '#0f172a' }}>Notes:</strong>{' '}
                              <span style={{ color: '#475569' }}>{userSubmission.notes}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Payout Wallet: <code style={{ fontFamily: 'monospace' }}>{truncateAddress(userSubmission.wallet_address)}</code>
                          </div>
                        </div>
                      </div>
                    )}

                    {isRevisionMode && (
                      <div style={{
                        background: '#eff6ff',
                        border: '2px solid var(--arc-validator-blue)',
                        boxShadow: '2.5px 2.5px 0px #000000',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>
                          <Edit3 size={15} />
                          <span>Editing Revision #{(submissions.find((s) => s.id === editingSubId)?.revision_count || userSubmission?.revision_count || 1) + 1} &bull; Previous versions are preserved</span>
                        </div>
                        <button
                          type="button"
                          onClick={cancelRevision}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #000000',
                            borderRadius: '5px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {(!userSubmission || isRevisionMode) && (
                      <form onSubmit={handleSubmitWork}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', display: 'block', marginBottom: '6px' }}>
                              DELIVERABLE URL (Figma, Loom, YouTube, X Thread, GitHub, or Drive) *
                            </label>
                            <input
                              type="url"
                              placeholder="https://figma.com/... or https://x.com/... or https://github.com/..."
                              value={submissionUrl}
                              onChange={(e) => setSubmissionUrl(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                border: '2px solid #000000',
                                boxShadow: '2px 2px 0px #000000',
                                fontSize: '0.92rem',
                                outline: 'none',
                                fontWeight: 600
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', display: 'block', marginBottom: '6px' }}>
                              YOUR PAYOUT WALLET ADDRESS (BOT Chain EVM) *
                            </label>
                            <input
                              type="text"
                              placeholder="0x..."
                              value={payoutWallet}
                              onChange={(e) => setPayoutWallet(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                border: '2px solid #000000',
                                boxShadow: '2px 2px 0px #000000',
                                fontSize: '0.92rem',
                                outline: 'none',
                                fontFamily: 'monospace',
                                fontWeight: 600
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', display: 'block', marginBottom: '6px' }}>
                              SUBMISSION NOTES / PROOF DETAILS
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Explain how your deliverable satisfies the bounty acceptance criteria..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                border: '2px solid #000000',
                                boxShadow: '2px 2px 0px #000000',
                                fontSize: '0.9rem',
                                outline: 'none',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>

                          {/* Co-Creators Collaboration Split Payout Section */}
                          <div style={{
                            background: hasCollaborators ? '#f8fafc' : '#ffffff',
                            border: '2px solid #000000',
                            boxShadow: '2px 2px 0px #000000',
                            borderRadius: '8px',
                            padding: '14px 16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setHasCollaborators(!hasCollaborators)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Share2 size={16} color="var(--arc-protocol-navy)" />
                              <div>
                                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                                  Co-Creator Collaboration Split
                                </span>
                                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                                  Split payout between designer, developer, and researcher automatically
                                </p>
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={hasCollaborators}
                              onChange={(e) => setHasCollaborators(e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {hasCollaborators && (
                            <div style={{ marginTop: '14px', borderTop: '1.5px dashed #cbd5e1', paddingTop: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                                {collaborators.map((c, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 90px 110px 32px',
                                      gap: '8px',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <input
                                      type="text"
                                      placeholder="0x... co-creator wallet"
                                      value={c.address}
                                      onChange={(e) => handleUpdateCollaborator(cIdx, 'address', e.target.value)}
                                      style={{
                                        padding: '8px 10px',
                                        fontSize: '0.82rem',
                                        fontFamily: 'monospace',
                                        borderRadius: '6px',
                                        border: '1.5px solid #000000'
                                      }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={c.percentage}
                                        onChange={(e) => handleUpdateCollaborator(cIdx, 'percentage', e.target.value)}
                                        style={{
                                          width: '55px',
                                          padding: '8px 6px',
                                          fontSize: '0.82rem',
                                          borderRadius: '6px',
                                          border: '1.5px solid #000000',
                                          fontWeight: 800,
                                          textAlign: 'center'
                                        }}
                                      />
                                      <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>%</span>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Role"
                                      value={c.role || ''}
                                      onChange={(e) => handleUpdateCollaborator(cIdx, 'role', e.target.value)}
                                      style={{
                                        padding: '8px 10px',
                                        fontSize: '0.8rem',
                                        borderRadius: '6px',
                                        border: '1.5px solid #000000'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCollaborator(cIdx)}
                                      style={{
                                        background: '#fee2e2',
                                        border: '1.5px solid #000000',
                                        borderRadius: '6px',
                                        height: '34px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Trash2 size={13} color="#991b1b" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={handleAddCollaborator}
                                  style={{
                                    background: '#ffffff',
                                    border: '1.5px solid #000000',
                                    boxShadow: '1.5px 1.5px 0px #000000',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <Plus size={13} />
                                  <span>Add Co-Creator</span>
                                </button>

                                <div style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: primaryShare > 0 ? '#dcfce7' : '#fee2e2',
                                  color: primaryShare > 0 ? '#166534' : '#991b1b',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #000000'
                                }}>
                                  You: {primaryShare}% &bull; Co-Creators: {totalCollaboratorShare}%
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !submissionUrl}
                          className="btn-accent"
                          style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
                        >
                          <span>
                            {isSubmitting
                              ? 'Saving on BOT Chain...'
                              : isRevisionMode
                              ? `Save Revision #${(userSubmission?.revision_count || 1) + 1}`
                              : 'Submit Work for Review'}
                          </span>
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMUNITY Q&A DISCUSSION */}
        {activeTab === 'discussion' && (
          <div>
            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0' }}>
                  Public Community Q&amp;A
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500 }}>
                  Ask the sponsor questions about requirements, acceptance criteria, and deliverable formats.
                </p>
              </div>
              <div style={{
                background: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #0284c7',
                padding: '3px 8px',
                borderRadius: '5px',
                fontSize: '0.74rem',
                fontWeight: 800
              }}>
                {comments.length} {comments.length === 1 ? 'Question' : 'Questions'}
              </div>
            </div>

            {/* Questions Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {loadingComments ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading discussions...
                </div>
              ) : comments.length === 0 ? (
                <div style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: '#ffffff',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b'
                }}>
                  <HelpCircle size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>No Questions Yet</p>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>
                    Have a question regarding this challenge? Post your inquiry below to notify the sponsor.
                  </p>
                </div>
              ) : (
                comments.map((c, cIdx) => {
                  const isSponsor = c.author_role === 'sponsor' || c.author_role === 'maintainer';
                  return (
                    <div
                      key={c.id || cIdx}
                      style={{
                        background: isSponsor ? '#eff6ff' : '#ffffff',
                        border: isSponsor ? '2px solid var(--arc-validator-blue)' : '2px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        borderRadius: '8px',
                        padding: '14px 16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isSponsor ? '#1b3158' : '#e2e8f0',
                            color: isSponsor ? '#ffffff' : '#000000',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {(c.author_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                              {c.author_name}
                            </span>
                            {c.author_handle && (
                              <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px' }}>
                                {c.author_handle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #000000',
                            background: isSponsor ? '#fffae6' : '#f1f5f9',
                            color: isSponsor ? '#854d0e' : '#334155'
                          }}>
                            {isSponsor ? 'Sponsor' : 'Creator'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#1e293b', whiteSpace: 'pre-line' }}>
                        {c.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Comment Input */}
            <div style={{ borderTop: '2px solid #000000', paddingTop: '18px' }}>
              {!user ? (
                <div style={{
                  padding: '16px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
                    Sign in to ask questions or reply to the challenge discussion
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); openAuthModal && openAuthModal('login'); }}
                    className="btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                  >
                    Log In to Participate
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePostComment}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', display: 'block', marginBottom: '6px' }}>
                    {isCreatorOfBounty ? 'REPLY AS SPONSOR / MAINTAINER' : 'ASK A QUESTION / INQUIRY'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={isCreatorOfBounty ? 'Post clarification or reply to builder inquiries...' : 'Ask a question about acceptance criteria, scope, or deadlines...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      marginBottom: '10px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isPostingComment || !newComment.trim()}
                      className="btn-accent"
                      style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                    >
                      <Send size={14} />
                      <span>{isPostingComment ? 'Posting...' : isCreatorOfBounty ? 'Reply as Sponsor' : 'Post Question'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
