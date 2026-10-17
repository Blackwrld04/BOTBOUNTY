import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Wallet,
  DollarSign,
  Users,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Search,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  Clock,
  Layers,
  Award,
  ChevronRight,
  AlertTriangle,
  FileText,
  Key,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  UserCheck,
  Mail,
  X,
  Download,
  Sliders,
  GitPullRequest,
  Radar,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { truncateAddress } from '../utils/arc';
import { triggerSync, subscribeToSync } from '../utils/sync';
import { API_BASE } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';

export default function AdminDashboard({ user, wallet, onBackToExplore, onDataChanged }) {
  const isMobile = useIsMobile();
  // Master Administrator Password Authentication State
  const [adminToken, setAdminToken] = useState(() => {
    return sessionStorage.getItem('arcbounty_admin_token') || '';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Admin Console State
  const [stats, setStats] = useState(null);
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBounty, setSelectedBounty] = useState(null);
  const selectedBountyRef = useRef(selectedBounty);
  useEffect(() => {
    selectedBountyRef.current = selectedBounty;
  }, [selectedBounty]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedSubId, setCopiedSubId] = useState(null);
  const [distributingId, setDistributingId] = useState(null);
  const [settlementResult, setSettlementResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { bounty, submission }
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  // Creators & Users Directory State
  const [usersList, setUsersList] = useState([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [copiedUserWallet, setCopiedUserWallet] = useState(null);

  // Automated Arc Escrow Scanner State
  const [isScanningDeposits, setIsScanningDeposits] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Rubric Scoring Modal State
  const [rubricModal, setRubricModal] = useState(null); // { submission, bounty }
  const [scoreQuality, setScoreQuality] = useState(8);
  const [scoreCreativity, setScoreCreativity] = useState(8);
  const [scoreCompleteness, setScoreCompleteness] = useState(8);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Multi-Winner Split Distribution Modal State
  const [multiWinnerModal, setMultiWinnerModal] = useState(null); // { bounty }
  const [winnersSelection, setWinnersSelection] = useState([
    { place: 1, submissionId: '', percentage: 60 },
    { place: 2, submissionId: '', percentage: 30 },
    { place: 3, submissionId: '', percentage: 10 }
  ]);
  const [isDisbursingMulti, setIsDisbursingMulti] = useState(false);

  // GitHub Bot Modal State
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [pingStatus, setPingStatus] = useState('');

  const handleCopySubWallet = (subId, address) => {
    navigator.clipboard.writeText(address);
    setCopiedSubId(subId);
    setTimeout(() => setCopiedSubId(null), 2000);
  };

  const handleCopyUserWallet = (userId, address) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedUserWallet(userId);
    setTimeout(() => setCopiedUserWallet(null), 2000);
  };

  const handleScanDeposits = async () => {
    setIsScanningDeposits(true);
    setScanResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/scan-deposits`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      setScanResult(data);
      if (data.depositsDetected > 0) {
        fetchAdminData();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      alert('Deposit scanner error: ' + err.message);
    } finally {
      setIsScanningDeposits(false);
    }
  };

  const openRubricModal = (sub) => {
    setRubricModal({ submission: sub, bounty: selectedBounty });
    setScoreQuality(sub.score_code_quality ?? 8);
    setScoreCreativity(sub.score_creativity ?? 8);
    setScoreCompleteness(sub.score_completeness ?? 8);
    setReviewerNotes(sub.reviewer_notes || '');
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!rubricModal) return;
    setIsSavingScore(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/submissions/${rubricModal.submission.id}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          codeQuality: scoreQuality,
          creativity: scoreCreativity,
          completeness: scoreCompleteness,
          reviewerNotes
        })
      });
      const data = await res.json();
      if (data.success && data.submission) {
        setSubmissions((prev) => prev.map((s) => (s.id === rubricModal.submission.id ? data.submission : s)));
        setRubricModal(null);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        alert('Evaluation scores and reviewer feedback recorded!');
      } else {
        alert(data.error || 'Failed to save score');
      }
    } catch (err) {
      alert('Error scoring submission: ' + err.message);
    } finally {
      setIsSavingScore(false);
    }
  };

  const openMultiWinnerModal = () => {
    if (!selectedBounty) return;
    const defaultTiers = selectedBounty.rewardDistribution?.tiers;
    if (Array.isArray(defaultTiers) && defaultTiers.length > 0) {
      setWinnersSelection(defaultTiers.map((t, i) => ({
        place: i + 1,
        submissionId: submissions[i]?.id || '',
        percentage: Math.round((t.amount / selectedBounty.amount) * 100) || (i === 0 ? 60 : i === 1 ? 30 : 10)
      })));
    } else {
      setWinnersSelection([
        { place: 1, submissionId: submissions[0]?.id || '', percentage: 60 },
        { place: 2, submissionId: submissions[1]?.id || '', percentage: 30 },
        { place: 3, submissionId: submissions[2]?.id || '', percentage: 10 }
      ]);
    }
    setMultiWinnerModal({ bounty: selectedBounty });
  };

  const handleExecuteMultiWinner = async () => {
    if (!multiWinnerModal) return;
    setIsDisbursingMulti(true);
    try {
      const selectedWinners = winnersSelection
        .filter((w) => w.submissionId)
        .map((w) => {
          const sub = submissions.find((s) => s.id === w.submissionId);
          const amount = Math.round((multiWinnerModal.bounty.amount * w.percentage) / 100);
          return {
            submissionId: w.submissionId,
            place: w.place,
            percentage: w.percentage,
            amount,
            walletAddress: sub?.wallet_address,
            creatorEmail: sub?.creator_email
          };
        });

      if (selectedWinners.length === 0) {
        alert('Please assign at least one winning creator submission.');
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/bounties/${multiWinnerModal.bounty.id}/disburse-multi-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ winners: selectedWinners })
      });
      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
        setMultiWinnerModal(null);
        fetchAdminData();
        handleSelectBounty(multiWinnerModal.bounty);
        triggerSync({ action: 'multi_winner_distributed', bountyId: multiWinnerModal.bounty.id });
        alert('Multi-winner reward split successfully disbursed on BOT Chain!');
      } else {
        alert(data.error || 'Failed to disburse multi-winner rewards');
      }
    } catch (err) {
      alert('Multi-winner disbursement error: ' + err.message);
    } finally {
      setIsDisbursingMulti(false);
    }
  };

  const handlePingWebhook = async () => {
    setPingStatus('Testing GitHub webhook endpoint on BOT Chain...');
    try {
      const res = await fetch(`${API_BASE}/api/bounties/github-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ping',
          repository: { full_name: 'bot-ecosystem/botbounty' }
        })
      });
      const data = await res.json();
      setPingStatus(`Active: ${data.message || 'Webhook listening on BOT Chain'}`);
    } catch (err) {
      setPingStatus('Ping failed: ' + err.message);
    }
  };

  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter administrator password.');
      return;
    }

    setAuthenticating(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem('arcbounty_admin_token', data.token);
        setAdminToken(data.token);
        setPasswordInput('');
      } else {
        setAuthError(data.error || 'Invalid administrator password. Access denied.');
      }
    } catch (err) {
      setAuthError('Connection failed: ' + err.message);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLockConsole = async () => {
    try {
      if (adminToken) {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }
    } catch (e) {}
    sessionStorage.removeItem('arcbounty_admin_token');
    setAdminToken('');
    if (onBackToExplore) {
      triggerSync({ action: 'nav_back_to_public' });
      onBackToExplore();
    }
  };

  const fetchAdminData = async (isBackground = false) => {
    if (!adminToken) return;
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const [statsRes, bountiesRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/bounties`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers })
      ]);

      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      } else if (statsRes.status === 401 || statsRes.status === 403) {
        // Invalidate stale token
        sessionStorage.removeItem('arcbounty_admin_token');
        setAdminToken('');
        setAuthError('Admin session expired. Please re-enter your password.');
        return;
      }

      const bountiesData = await bountiesRes.json();
      if (bountiesData.success && Array.isArray(bountiesData.bounties)) {
        setBounties(bountiesData.bounties);

        // Keep currently selected bounty live in sync using latest ref
        const currentSelected = selectedBountyRef.current;
        if (currentSelected) {
          const freshSelected = bountiesData.bounties.find((b) => b.id === currentSelected.id);
          if (freshSelected) {
            // Only update selectedBounty state if status or metadata actually changed
            if (
              freshSelected.status !== currentSelected.status ||
              freshSelected.paymentStatus !== currentSelected.paymentStatus ||
              freshSelected.amount !== currentSelected.amount ||
              freshSelected.settlementTx !== currentSelected.settlementTx ||
              freshSelected.submissionsCount !== currentSelected.submissionsCount
            ) {
              setSelectedBounty(freshSelected);
              selectedBountyRef.current = freshSelected;
            }
          }
        }
      }

      const usersData = await usersRes.json();
      if (usersData && usersData.success && Array.isArray(usersData.users)) {
        setUsersList(usersData.users);
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch admin data:', err);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData(false);

      // Universal cross-tab and intra-app sync listener
      const unsubscribe = subscribeToSync(() => {
        fetchAdminData(true);
      });

      // Background live polling ticker every 3 seconds (smooth background sync)
      const interval = setInterval(() => {
        fetchAdminData(true);
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [adminToken]);

  const handleSelectBounty = async (bounty) => {
    if (!bounty) return;
    setSelectedBounty(bounty);
    selectedBountyRef.current = bounty;
    setLoadingSubmissions(true);
    setSettlementResult(null);

    // On mobile screens, smoothly scroll to review pane
    if (isMobile) {
      setTimeout(() => {
        const detailsEl = document.getElementById('admin-bounty-details-panel');
        if (detailsEl) {
          detailsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/bounties/${bounty.id}/submissions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (selectedBountyRef.current?.id === bounty.id && data.success) {
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch submissions:', err);
    } finally {
      if (selectedBountyRef.current?.id === bounty.id) {
        setLoadingSubmissions(false);
      }
    }
  };

  const handleCopyWallet = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleExecuteDistribution = async () => {
    if (!confirmModal) return;
    const { bounty, submission } = confirmModal;
    setDistributingId(submission.id);

    try {
      let clientTxHash = null;
      if (typeof window !== 'undefined' && window.ethereum && bounty.onChainBountyId) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const escrowAbi = ['function releaseBounty(bytes32 bountyId) external'];
          const escrowContract = new ethers.Contract('0xB128F2f442554B6517D779788F28F2EB2612164A', escrowAbi, signer);
          const tx = await escrowContract.releaseBounty(bounty.onChainBountyId);
          const receipt = await tx.wait();
          clientTxHash = receipt?.hash || tx.hash;
        } catch (walletErr) {
          console.warn('Direct wallet release bypassed, falling back to facilitator relay:', walletErr.message);
        }
      }

      const res = await fetch(`${API_BASE}/api/admin/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          bountyId: bounty.id,
          submissionId: submission.id,
          amount: bounty.amount,
          txHash: clientTxHash
        })
      });

      const data = await res.json();
      if (data.success) {
        setSettlementResult(data.settlement);
        setConfirmModal(null);
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.6 }
        });
        // Refresh telemetry & submissions
        fetchAdminData();
        handleSelectBounty(bounty);
        if (onDataChanged) {
          onDataChanged();
        }
        triggerSync({ action: 'reward_distributed', bountyId: bounty.id, submissionId: submission.id });
      } else {
        alert(data.error || 'Failed to distribute funds');
      }
    } catch (err) {
      alert('Network error while distributing reward: ' + err.message);
    } finally {
      setDistributingId(null);
    }
  };

  const handleApproveBounty = async (bountyId) => {
    setIsApproving(true);
    setApprovalMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/bounties/${bountyId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setApprovalMessage(`Bounty approved and published live! Emails dispatched.`);
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        fetchAdminData();
        if (selectedBounty && selectedBounty.id === bountyId) {
          setSelectedBounty(data.bounty);
        }
        if (onDataChanged) {
          onDataChanged();
        }
        triggerSync({ action: 'bounty_approved', bountyId });
      } else {
        alert(data.error || 'Failed to approve bounty');
      }
    } catch (err) {
      alert('Error approving bounty: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectBounty = async (bountyId) => {
    const reason = prompt('Please enter the rejection reason (optional):');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/bounties/${bountyId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        alert('Bounty has been rejected.');
        fetchAdminData();
        if (selectedBounty && selectedBounty.id === bountyId) {
          setSelectedBounty(data.bounty);
        }
        if (onDataChanged) {
          onDataChanged();
        }
        triggerSync({ action: 'bounty_rejected', bountyId });
      } else {
        alert(data.error || 'Failed to reject bounty');
      }
    } catch (err) {
      alert('Error rejecting bounty: ' + err.message);
    }
  };

  // Guard: Master Password Gate Screen
  if (!adminToken) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 16px',
        backgroundColor: 'var(--bg-canvas)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          borderRadius: '14px',
          padding: '36px 30px',
          position: 'relative'
        }}>
          {/* Top header badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fee2e2',
              color: '#991b1b',
              border: '1.5px solid #000000',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <Lock size={12} color="#991b1b" />
              <span>Restricted Access</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
              BOT Chain (677 / 968)
            </span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: '#1b3158',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Key size={26} color="#ffcc6f" />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
              ArcBounty Admin Portal
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Separate administrative environment. Enter master administrator password to access the platform escrow treasury and distribute prize USDC.
            </p>
          </div>

          {authError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fef2f2',
              border: '1.5px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '0.84rem',
              color: '#991b1b',
              fontWeight: 700
            }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#0f172a',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Master Admin Password
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter administrator password..."
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 42px 12px 14px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    boxShadow: '2.5px 2.5px 0px #000000',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authenticating || !passwordInput.trim()}
              style={{
                width: '100%',
                background: authenticating || !passwordInput.trim() ? '#cbd5e1' : '#1b3158',
                color: '#ffffff',
                border: '2px solid #000000',
                boxShadow: authenticating || !passwordInput.trim() ? 'none' : '3px 3px 0px #000000',
                borderRadius: '8px',
                padding: '13px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: authenticating || !passwordInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Key size={16} color="#ffcc6f" />
              <span>{authenticating ? 'Verifying Password...' : 'Unlock Admin Console'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
            <button
              onClick={onBackToExplore}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} />
              <span>Return to Public Site</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getBountyEffectiveStatus = (b) => {
    if (!b) return '';
    const st = b.status || '';
    if (st.toLowerCase() === 'pending review') return 'Pending Review';
    if (st === 'Settled') return 'Settled';
    if (st === 'Closed') return 'Closed';
    const effectiveDeadline = b.deadline || (b.createdAt && b.deadlineDays ? (b.createdAt + b.deadlineDays * 86400000) : null);
    const isExpired = effectiveDeadline && Date.now() >= Number(effectiveDeadline);
    if (isExpired) return 'Closed';
    return st || 'Open';
  };

  const filteredBounties = bounties.filter(b => {
    const effectiveStatus = getBountyEffectiveStatus(b);
    if (filterStatus !== 'All' && effectiveStatus.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredUsers = usersList.filter(u => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.wallet_address && u.wallet_address.toLowerCase().includes(q)) ||
      (u.discipline && u.discipline.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container" style={{ padding: '36px 16px', maxWidth: '1200px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '2.5px solid #000000'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: '#1b3158',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1.5px solid #000000'
            }}>
              ADMIN CONSOLE
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
              BOT Chain Protocol (Chain ID 677 / 968)
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Escrow Treasury &amp; Prize Disbursement
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: '4px 0 0 0' }}>
            Oversee deposited challenge bounties, review creator participants, and disburse USDT &amp; $BOT payouts with sub-second finality.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={fetchAdminData}
            style={{
              background: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh Telemetry</span>
          </button>

          <button
            onClick={() => setShowUsersModal(true)}
            style={{
              background: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Inspect all registered creators and users on BOT Chain"
          >
            <UserCheck size={14} color="#1b3158" />
            <span>Creators Directory ({stats ? (stats.totalUsers ?? usersList.length) : (usersList.length || '---')})</span>
          </button>

          {/* 1-Click CSV Audit Ledger Export */}
          <a
            href={`${API_BASE}/api/admin/export-csv?token=${adminToken}`}
            target="_blank"
            rel="noopener noreferrer"
            download="arcbounty_audit_ledger.csv"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
            title="Download full CSV audit ledger of all bounty payouts and settlements"
          >
            <Download size={14} color="#1b3158" />
            <span>Audit Ledger (CSV)</span>
          </a>

          {/* GitHub Bot Integration Panel */}
          <button
            onClick={() => setShowGithubModal(true)}
            style={{
              background: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="View GitHub Bot Webhook integration status"
          >
            <GitPullRequest size={14} color="#1b3158" />
            <span>GitHub Bot</span>
          </button>

          <button
            onClick={onBackToExplore}
            className="btn-secondary"
            style={{ padding: '9px 15px', borderRadius: '8px', fontSize: '0.84rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Public View</span>
          </button>

          <button
            onClick={handleLockConsole}
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              border: '2px solid #000000',
              boxShadow: '2.5px 2.5px 0px #000000',
              borderRadius: '8px',
              padding: '9px 15px',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Lock administrative console and require password"
          >
            <LogOut size={14} color="#991b1b" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: isMobile ? '10px' : '16px',
        marginBottom: '28px'
      }}>
        {/* Total Escrowed USDC */}
        <div style={{
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: '3px 3px 0px #000000',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              TOTAL ESCROW VOLUME
            </span>
            <DollarSign size={18} color="#1b3158" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
            ${stats ? stats.totalEscrowedUsdc.toLocaleString() : '---'} <span style={{ fontSize: '1rem', color: '#64748b' }}>USDT / $BOT</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
            Secured on BOT Chain
          </div>
        </div>

        {/* Total Bounties Created */}
        <div style={{
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: '3px 3px 0px #000000',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              CREATED BOUNTIES
            </span>
            <Layers size={18} color="#1b3158" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
            {stats ? stats.totalBounties : '---'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>
            {stats?.openBounties || 0} Open &bull; {stats?.inReviewBounties || 0} In Review &bull; {stats?.settledBounties || 0} Settled
          </div>
        </div>

        {/* Total Creators & Users */}
        <div
          onClick={() => setShowUsersModal(true)}
          style={{
            background: '#ffffff',
            border: '2.5px solid #000000',
            boxShadow: '3px 3px 0px #000000',
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '3px 3px 0px #000000';
          }}
          title="Click to view all registered creators and community members on BOT Chain"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              CREATORS / USERS
            </span>
            <UserCheck size={18} color="#1b3158" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
            {stats ? (stats.totalUsers ?? usersList.length) : (usersList.length || '---')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1b3158', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats?.totalUsers ?? usersList.length} Registered on BOT Chain</span>
            <span style={{ textDecoration: 'underline', fontSize: '0.72rem' }}>Directory &rarr;</span>
          </div>
        </div>

        {/* Total Submissions / Participants */}
        <div style={{
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: '3px 3px 0px #000000',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              PARTICIPANTS &amp; PROOFS
            </span>
            <Users size={18} color="#1b3158" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
            {stats ? stats.totalSubmissions : '---'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>
            Creator deliverables submitted
          </div>
        </div>

        {/* Total Distributed USDC */}
        <div style={{
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: '3px 3px 0px #000000',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              TOTAL DISTRIBUTED
            </span>
            <Award size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981' }}>
            ${stats ? stats.totalDistributedUsdc.toLocaleString() : '---'} <span style={{ fontSize: '1rem', color: '#64748b' }}>USDC</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
            {stats?.totalDistributions || 0} Payouts Executed
          </div>
        </div>
      </div>

      {/* Official Platform Treasury Wallet Card */}
      <div style={{
        background: '#101b2f',
        color: '#ffffff',
        border: '2.5px solid #000000',
        boxShadow: '4px 4px 0px #000000',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: '#1b3158',
            border: '2px solid #ffcc6f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={22} color="#ffcc6f" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffcc6f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              PLATFORM ESCROW TREASURY WALLET (USDC RECEIVER)
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: '2px', wordBreak: 'break-all' }}>
              {stats?.escrowWallet || '0x7Cd0F0db26f47dFa757014a8f756506B9F32F823'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              All sponsors pay here when creating challenges &bull; You control payouts from this address
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => handleCopyWallet(stats?.escrowWallet || '0x7Cd0F0db26f47dFa757014a8f756506B9F32F823')}
            style={{
              background: copiedWallet ? '#10b981' : '#1b3158',
              color: '#ffffff',
              border: '1.5px solid #2f578c',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedWallet ? 'Copied' : 'Copy Address'}</span>
          </button>

          <a
            href={`https://scan.bohr.life/address/${stats?.escrowWallet || '0xB128F2f442554B6517D779788F28F2EB2612164A'}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#0a1322',
              color: '#acc6e9',
              border: '1.5px solid #2f578c',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Arc Explorer</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Main Content: Bounties Table & Participant Review */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (selectedBounty ? '1fr 1.15fr' : '1fr'), gap: isMobile ? '16px' : '24px' }}>
        
        {/* Left Column: Bounties Table */}
        <div style={{
          background: '#ffffff',
          border: '2.5px solid #000000',
          boxShadow: isMobile ? '3px 3px 0px #000000' : '4px 4px 0px #000000',
          borderRadius: '12px',
          padding: isMobile ? '14px' : '24px',
          overflow: 'hidden'
        }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', 'Pending Review', 'Open', 'InReview', 'Closed', 'Settled'].map((s) => {
                const pendingCount = bounties.filter(b => (b.status || '').toLowerCase() === 'pending review').length;
                const closedCount = bounties.filter(b => getBountyEffectiveStatus(b) === 'Closed').length;
                const isSelected = filterStatus.toLowerCase() === s.toLowerCase();
                const badgeCount = s === 'Pending Review' ? pendingCount : (s === 'Closed' ? closedCount : null);
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      background: isSelected ? 'var(--arc-protocol-navy)' : (s === 'Pending Review' && pendingCount > 0 ? '#fef08a' : '#f1f5f9'),
                      color: isSelected ? '#ffffff' : (s === 'Pending Review' && pendingCount > 0 ? '#854d0e' : '#475569'),
                      border: '1.5px solid #000000',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{s}</span>
                    {badgeCount > 0 && (
                      <span style={{
                        background: s === 'Pending Review' ? '#dc2626' : (isSelected ? '#ffffff' : '#64748b'),
                        color: s === 'Pending Review' ? '#ffffff' : (isSelected ? '#000000' : '#ffffff'),
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 900
                      }}>
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search bounties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: '6px',
                  border: '1.5px solid #000000',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000000', background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>CHALLENGE</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>REWARD</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>PARTICIPANTS</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredBounties.map((b) => {
                  const isSelected = selectedBounty?.id === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => handleSelectBounty(b)}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isSelected ? '#fffae6' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          By: {b.maintainerName || truncateAddress(b.maintainer)}
                        </div>
                      </td>

                      <td style={{ padding: '12px', fontWeight: 900, color: '#0f172a' }}>
                        ${b.amount} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>USDC</span>
                      </td>

                      <td style={{ padding: '12px' }}>
                        {(() => {
                          const effectiveStatus = getBountyEffectiveStatus(b);
                          return (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              border: '1.5px solid #000000',
                              background: effectiveStatus === 'Settled'
                                ? '#bbf7d0'
                                : (effectiveStatus === 'InReview'
                                ? '#fef08a'
                                : (effectiveStatus === 'Closed'
                                ? '#f1f5f9'
                                : ((effectiveStatus || '').toLowerCase() === 'pending review'
                                ? '#fee2e2'
                                : '#e0f2fe'))),
                              color: (effectiveStatus || '').toLowerCase() === 'pending review'
                                ? '#991b1b'
                                : (effectiveStatus === 'Closed'
                                ? '#475569'
                                : '#000000')
                            }}>
                              {effectiveStatus}
                            </span>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} color="#64748b" />
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>
                            {b.submissionsCount || (b.submissions?.length) || 0}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectBounty(b); }}
                          style={{
                            background: isSelected ? '#1b3158' : ((b.status || '').toLowerCase() === 'pending review' ? '#fef08a' : '#ffffff'),
                            color: isSelected ? '#ffffff' : '#0f172a',
                            border: '1.5px solid #000000',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{(b.status || '').toLowerCase() === 'pending review' ? 'Verify' : 'Review'}</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredBounties.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No bounties found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Participant Submissions & Distribution Panel */}
        {selectedBounty && (
          <div
            id="admin-bounty-details-panel"
            style={{
              background: '#ffffff',
              border: '2.5px solid #000000',
              boxShadow: isMobile ? '3px 3px 0px #000000' : '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: isMobile ? '16px 12px' : '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Selected Bounty Details Header */}
            <div style={{ borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{
                  background: 'var(--arc-token-sand)',
                  border: '1.5px solid #000000',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {selectedBounty.category}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: isMobile ? '1.15rem' : '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                    ${selectedBounty.amount} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>USDC</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBounty(null);
                      selectedBountyRef.current = null;
                      setSubmissions([]);
                    }}
                    title="Close challenge review"
                    style={{
                      background: '#f1f5f9',
                      border: '1.5px solid #000000',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      boxShadow: '1px 1px 0px #000000'
                    }}
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                {selectedBounty.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                <span>ID: <code>{selectedBounty.id}</code></span>
                <span>Deposit: <strong style={{ color: '#10b981' }}>{selectedBounty.paymentStatus || 'funded'}</strong></span>
                <span>Escrow: <code>{truncateAddress(selectedBounty.escrowWallet)}</code></span>
                {(() => {
                  const selEffStatus = getBountyEffectiveStatus(selectedBounty);
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: selEffStatus === 'Settled'
                        ? '#bbf7d0'
                        : (selEffStatus === 'Closed'
                        ? '#f1f5f9'
                        : (selEffStatus === 'InReview'
                        ? '#fef08a'
                        : ((selEffStatus || '').toLowerCase() === 'pending review'
                        ? '#fee2e2'
                        : '#e0f2fe'))),
                      color: (selEffStatus || '').toLowerCase() === 'pending review'
                        ? '#991b1b'
                        : (selEffStatus === 'Closed'
                        ? '#475569'
                        : '#000000'),
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1.5px solid #000000',
                      fontWeight: 800,
                      fontSize: '0.72rem'
                    }}>
                      STATUS: {selEffStatus.toUpperCase()}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Live Settlement Banner if just settled */}
            {settlementResult && (
              <div style={{
                background: '#bbf7d0',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, color: '#166534', marginBottom: '4px' }}>
                  <CheckCircle2 size={18} />
                  <span>Reward Disbursed on BOT Chain!</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#14532d', margin: 0 }}>
                  Prize of <strong>${settlementResult.amount} USDC</strong> successfully transferred to <code>{settlementResult.recipient}</code>.
                </p>
                <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#166534', marginTop: '6px' }}>
                  Tx Hash: {settlementResult.txHash}
                </div>
              </div>
            )}

            {/* Conditional: If Pending Review, show Escrow & Conditions Approval Pane. Else show Submissions & Payout */}
            {(selectedBounty.status || '').toLowerCase() === 'pending review' ? (
              <div style={{ flex: 1 }}>
                <div style={{
                  background: '#fefce8',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, color: '#854d0e' }}>
                      <Shield size={18} />
                      <span>Action Required: Escrow Deposit &amp; Condition Verification</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleScanDeposits}
                      disabled={isScanningDeposits}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #000000',
                        boxShadow: '1.5px 1.5px 0px #000000',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#0f172a'
                      }}
                    >
                      <Radar size={13} />
                      <span>{isScanningDeposits ? 'Scanning BOT Chain...' : 'Auto-Detect BOT Deposits'}</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#713f12', margin: 0, lineHeight: 1.45 }}>
                    This challenge was submitted by a user and is currently hidden from creators. Verify the on-chain escrow deposit to the treasury and review the criteria below. Once accepted, it will go live on the public feed and email alerts will be sent to the maintainer and all registered creators.
                  </p>
                  {scanResult && (
                    <div style={{
                      marginTop: '10px',
                      background: '#ffffff',
                      border: '1px solid #ca8a04',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#854d0e'
                    }}>
                      BOT Chain RPC Scanner: {scanResult.bountiesScanned} bounties scanned on Chain 968 &bull; {scanResult.depositsDetected} deposits verified.
                    </div>
                  )}
                </div>

                {/* Verification Details */}
                <div style={{
                  background: '#f8fafc',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sponsor / Maintainer Info</span>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', marginTop: '2px' }}>
                      {selectedBounty.maintainerName || 'Arc User'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                      Email: <strong>{selectedBounty.maintainerEmail || 'Not specified'}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b', marginTop: '2px' }}>
                      Wallet: {selectedBounty.maintainer}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Escrow Collateral &amp; Deposit Tx</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        Amount: ${selectedBounty.amount.toLocaleString()} USDC
                      </span>
                      <span style={{
                        background: '#fef08a',
                        color: '#854d0e',
                        border: '1px solid #000000',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800
                      }}>
                        Status: {selectedBounty.paymentStatus || 'pending_review'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all', marginTop: '4px', background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      Deposit Tx: {selectedBounty.depositTx || 'N/A'}
                    </div>
                  </div>

                  {/* Prize Distribution Breakdown */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Prize Pool Distribution</span>
                    {selectedBounty.rewardDistribution && selectedBounty.rewardDistribution.type === 'tiered' ? (
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                          Ranked Multi-Tier ({selectedBounty.rewardDistribution.winnerCount} Winners):
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
                          {selectedBounty.rewardDistribution.tiers?.map((t, i) => (
                            <div key={i} style={{ background: '#ffffff', border: '1px solid #000000', borderRadius: '6px', padding: '6px 8px', fontSize: '0.76rem' }}>
                              <div style={{ fontWeight: 800, color: '#1b3158' }}>{t.label || `${t.place} Place`}</div>
                              <div style={{ fontWeight: 900, color: '#0f172a' }}>${t.amount} USDC</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : selectedBounty.rewardDistribution && selectedBounty.rewardDistribution.type === 'equal' ? (
                      <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                        Equal Split: {selectedBounty.rewardDistribution.winnerCount} Winners &times; ${selectedBounty.rewardDistribution.perWinnerAmount} USDC each (${selectedBounty.amount} USDC total)
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                        Single Winner: 100% (${selectedBounty.amount} USDC) to 1st Place deliverable
                      </div>
                    )}
                  </div>

                  {/* Specifications */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Challenge Specifications</span>
                    <div style={{ fontSize: '0.82rem', color: '#1f2937', marginTop: '4px', lineHeight: 1.5, background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-line' }}>
                      {selectedBounty.description}
                    </div>
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleRejectBounty(selectedBounty.id)}
                    style={{
                      background: '#ffffff',
                      color: '#ef4444',
                      border: '2px solid #ef4444',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Reject Challenge
                  </button>

                  <button
                    onClick={() => handleApproveBounty(selectedBounty.id)}
                    disabled={isApproving}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: '8px',
                      background: '#10b981',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isApproving ? 'Verifying & Notifying...' : 'Approve & Publish Live'}</span>
                  </button>
                </div>

                {approvalMessage && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: '#dcfce7',
                    border: '1.5px solid #16a34a',
                    borderRadius: '6px',
                    color: '#166534',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CheckCircle2 size={16} />
                    <span>{approvalMessage}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Submissions Section for Active / Closed / Settled Bounties */
              <div style={{ flex: 1 }}>
                {(() => {
                  const selEffStatus = getBountyEffectiveStatus(selectedBounty);
                  if (selEffStatus !== 'Closed') return null;
                  return (
                    <div style={{
                      background: '#fef2f2',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '2px 2px 0px #000000',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#dc2626" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#991b1b' }}>
                          CHALLENGE CLOSED &bull; {submissions.length} {submissions.length === 1 ? 'PARTICIPANT' : 'PARTICIPANTS'} FOR REVIEW
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>
                        Escrow: ${selectedBounty.amount} USDC
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                    Challenge Participants &amp; Submissions ({submissions.length})
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {submissions.length > 1 && selectedBounty.status !== 'Settled' && (
                      <button
                        type="button"
                        onClick={openMultiWinnerModal}
                        style={{
                          background: '#eff6ff',
                          color: '#1e40af',
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
                        <Award size={13} />
                        <span>Multi-Winner Split Payout (1st, 2nd, 3rd)</span>
                      </button>
                    )}

                    <span style={{ fontSize: '0.75rem', color: getBountyEffectiveStatus(selectedBounty) === 'Closed' ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
                      {getBountyEffectiveStatus(selectedBounty) === 'Closed' ? 'Review creator deliverables below to disburse rewards' : 'Select a winning participant to disburse reward'}
                    </span>
                  </div>
                </div>

              {loadingSubmissions ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Loading challenge participant proofs...
                </div>
              ) : submissions.length === 0 ? (
                <div style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b'
                }}>
                  <Users size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>No Submissions Yet</p>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>
                    Creators have not submitted deliverables for this opportunity yet. Once submitted, their proof links and payout wallet addresses will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {submissions.map((sub, idx) => {
                    const isWinner = sub.status === 'awarded';
                    return (
                      <div
                        key={sub.id}
                        style={{
                          background: isWinner ? '#f0fdf4' : '#ffffff',
                          border: '2px solid #000000',
                          boxShadow: '3px 3px 0px #000000',
                          borderRadius: '8px',
                          padding: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 200px' }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#1b3158',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                {sub.creator_name || 'Anonymous Creator'}
                              </div>
                              {sub.creator_email && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>
                                  {sub.creator_email}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{
                              background: '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #000000',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800
                            }}>
                              v{sub.revision_count || 1}
                            </span>

                            {isWinner ? (
                              <span style={{
                                background: '#bbf7d0',
                                color: '#166534',
                                border: '1.5px solid #166534',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Award size={12} />
                                <span>WINNER PAID</span>
                              </span>
                            ) : (
                              <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                {sub.solver_type || 'Human Creator'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Deliverable URL */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                            DELIVERABLE URL
                          </div>
                          <a
                            href={sub.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--arc-validator-blue)',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                              wordBreak: 'break-all',
                              marginTop: '2px',
                              maxWidth: '100%'
                            }}
                          >
                            <span style={{ wordBreak: 'break-all' }}>{sub.submission_url}</span>
                            <ExternalLink size={13} style={{ flexShrink: 0 }} />
                          </a>
                        </div>

                        {/* Notes */}
                        {sub.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, marginBottom: '10px', fontStyle: 'italic' }}>
                            "{sub.notes}"
                          </div>
                        )}

                        {/* Co-Creators Collaboration Split if any */}
                        {Array.isArray(sub.collaborators) && sub.collaborators.length > 0 && (
                          <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            marginBottom: '10px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <span style={{ fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Share2 size={12} />
                              <span>Co-Creators:</span>
                            </span>
                            {sub.collaborators.map((c, cIdx) => (
                              <span key={cIdx} style={{ background: '#ffffff', border: '1px solid #000000', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {c.role || 'Co-Creator'}: {truncateAddress(c.address)} ({c.percentage}%)
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Structured Rubric Scoring Display / Trigger */}
                        {sub.score_code_quality !== null && sub.score_code_quality !== undefined ? (
                          <div style={{
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: '6px',
                            padding: '10px 12px',
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.78rem' }}>
                                RUBRIC EVALUATION SCORE: {Math.round(((sub.score_code_quality + sub.score_creativity + sub.score_completeness) / 3) * 10) / 10} / 10
                              </span>
                              <button
                                type="button"
                                onClick={() => openRubricModal(sub)}
                                style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline', fontSize: '0.74rem' }}
                              >
                                Edit Score
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', color: '#14532d', fontSize: '0.76rem', fontWeight: 700 }}>
                              <span>Quality: {sub.score_code_quality}/10</span>
                              <span>Creativity: {sub.score_creativity}/10</span>
                              <span>Completeness: {sub.score_completeness}/10</span>
                            </div>
                            {sub.reviewer_notes && (
                              <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#166534', fontStyle: 'italic' }}>
                                Notes: "{sub.reviewer_notes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginBottom: '10px' }}>
                            <button
                              type="button"
                              onClick={() => openRubricModal(sub)}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #000000',
                                boxShadow: '1.5px 1.5px 0px #000000',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Sliders size={12} />
                              <span>Score Submission with Rubric (1-10)</span>
                            </button>
                          </div>
                        )}

                        {/* Participant Payout Wallet Card (Admin View) */}
                        <div style={{
                          background: '#f8fafc',
                          border: '2px solid #000000',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '14px',
                          boxShadow: '2px 2px 0px #000000'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                              <Wallet size={14} color="#2f578c" />
                              <span>PARTICIPANT PAYOUT WALLET</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              Ready for Payout
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            justifyContent: 'space-between',
                            gap: isMobile ? '10px' : '8px',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: isMobile ? '10px 12px' : '8px 10px'
                          }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: isMobile ? '0.76rem' : '0.84rem',
                              color: '#0f172a',
                              wordBreak: 'break-all',
                              lineHeight: 1.45
                            }}>
                              {sub.wallet_address}
                            </span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexShrink: 0,
                              width: isMobile ? '100%' : 'auto',
                              justifyContent: isMobile ? 'flex-end' : 'flex-start'
                            }}>
                              <button
                                type="button"
                                onClick={() => handleCopySubWallet(sub.id, sub.wallet_address)}
                                style={{
                                  background: copiedSubId === sub.id ? '#10b981' : '#f1f5f9',
                                  color: copiedSubId === sub.id ? '#ffffff' : '#0f172a',
                                  border: '1.5px solid #000000',
                                  borderRadius: '5px',
                                  padding: '5px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Copy participant wallet"
                              >
                                {copiedSubId === sub.id ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedSubId === sub.id ? 'Copied' : 'Copy'}</span>
                              </button>

                              <a
                                href={`https://scan.bohr.life/address/${sub.wallet_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#ffffff',
                                  color: '#2f578c',
                                  border: '1.5px solid #000000',
                                  borderRadius: '5px',
                                  padding: '5px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'none'
                                }}
                                title="View on Arc Explorer"
                              >
                                <span>Explorer</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Action: Distribute Button */}
                        {!isWinner && (
                          <button
                            onClick={() => setConfirmModal({ bounty: selectedBounty, submission: sub })}
                            disabled={distributingId === sub.id}
                            className="btn-primary"
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '6px',
                              background: '#10b981',
                              fontSize: '0.85rem'
                            }}
                          >
                            <Award size={15} />
                            <span>{distributingId === sub.id ? 'Settling on Arc...' : `Distribute $${selectedBounty.amount} USDC to this Creator`}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '14px',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#fffae6',
                border: '2px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={20} color="#b45309" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Confirm Native $BOT Prize Payout
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Execution on BOT Chain Protocol (Chain ID 677 / 968)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '18px' }}>
              You are about to distribute the platform escrow prize of <strong style={{ color: '#0f172a' }}>{confirmModal.bounty.amount} Native $BOT</strong> to:
            </p>

            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>RECIPIENT CREATOR</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                {confirmModal.submission.creator_name || 'Anonymous Creator'}
              </div>
              {confirmModal.submission.creator_email && (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {confirmModal.submission.creator_email}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '8px' }}>PAYOUT WALLET ADDRESS</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', marginTop: '3px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>
                  {confirmModal.submission.wallet_address}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopySubWallet('confirm', confirmModal.submission.wallet_address)}
                  style={{
                    background: copiedSubId === 'confirm' ? '#10b981' : '#f1f5f9',
                    color: copiedSubId === 'confirm' ? '#ffffff' : '#0f172a',
                    border: '1.5px solid #000000',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                >
                  {copiedSubId === 'confirm' ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedSubId === 'confirm' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '8px' }}>CHALLENGE</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                {confirmModal.bounty.title}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '8px' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDistribution}
                disabled={distributingId !== null}
                className="btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#10b981' }}
              >
                <Award size={16} />
                <span>{distributingId !== null ? 'Disbursing...' : `Confirm & Pay $${confirmModal.bounty.amount} USDC`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Rubric Evaluation Modal */}
      {rubricModal && (
        <div className="modal-backdrop" onClick={() => setRubricModal(null)}>
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '14px',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#1b3158',
                  border: '2px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sliders size={20} color="#ffcc6f" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Submission Rubric Scoring
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Standardized evaluation framework (1 - 10)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRubricModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '0.82rem'
            }}>
              <span style={{ color: '#64748b', fontWeight: 700 }}>Candidate: </span>
              <strong style={{ color: '#0f172a' }}>{rubricModal.submission.creator_name || 'Creator'}</strong>
              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>&bull;</span>
              <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{truncateAddress(rubricModal.submission.wallet_address)}</span>
            </div>

            <form onSubmit={handleSaveScore}>
              {/* Slider 1: Code / Deliverable Quality */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    1. Code / Deliverable Quality &amp; Cleanliness
                  </label>
                  <span style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #0284c7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.85rem'
                  }}>
                    {scoreQuality} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scoreQuality}
                  onChange={(e) => setScoreQuality(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                  <span>Basic / Poor (1)</span>
                  <span>Meets Expectations (5)</span>
                  <span>Flawless &amp; Production-Ready (10)</span>
                </div>
              </div>

              {/* Slider 2: Creativity & UX / Polish */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    2. Creativity, UI / UX Polish &amp; Presentation
                  </label>
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #d97706',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.85rem'
                  }}>
                    {scoreCreativity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scoreCreativity}
                  onChange={(e) => setScoreCreativity(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                  <span>Uninspired (1)</span>
                  <span>Good Polish (5)</span>
                  <span>Exceptional Innovation (10)</span>
                </div>
              </div>

              {/* Slider 3: Completeness & Spec Compliance */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    3. Acceptance Criteria &amp; Spec Compliance
                  </label>
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #16a34a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.85rem'
                  }}>
                    {scoreCompleteness} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scoreCompleteness}
                  onChange={(e) => setScoreCompleteness(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                  <span>Missing Requirements (1)</span>
                  <span>Covers Core Scope (5)</span>
                  <span>100% Scope Completed (10)</span>
                </div>
              </div>

              {/* Reviewer Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Private Reviewer Notes / Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Include qualitative scoring feedback or notes for DAO compliance..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRubricModal(null)}
                  className="btn-secondary"
                  style={{ padding: '12px 18px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingScore}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                >
                  <span>{isSavingScore ? 'Saving Score...' : 'Record Rubric Score'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Winner Split Disbursement Modal */}
      {multiWinnerModal && (
        <div className="modal-backdrop" onClick={() => setMultiWinnerModal(null)}>
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '600px',
              borderRadius: '14px',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#1b3158',
                  border: '2px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Award size={20} color="#ffcc6f" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Multi-Winner Split Disbursement
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Ranked prize pool distribution: ${multiWinnerModal.bounty.amount} USDC total
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMultiWinnerModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '18px', lineHeight: 1.45 }}>
              Allocate the escrow prize pool across ranked winners. Each winner will receive their allocated share disbursed to their BOT Chain wallet address.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {winnersSelection.map((w, idx) => {
                const computedUsdc = Math.round((multiWinnerModal.bounty.amount * w.percentage) / 100);
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      boxShadow: '2px 2px 0px #000000'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        color: idx === 0 ? '#166534' : idx === 1 ? '#0369a1' : '#92400e',
                        textTransform: 'uppercase'
                      }}>
                        {idx === 0 ? '1st Place Winner' : idx === 1 ? '2nd Place Winner' : '3rd Place Winner'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                          ${computedUsdc} USDC
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                          ({w.percentage}%)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '8px' }}>
                      <select
                        value={w.submissionId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWinnersSelection((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], submissionId: val };
                            return copy;
                          });
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1.5px solid #000000',
                          fontSize: '0.82rem',
                          background: '#ffffff',
                          fontWeight: 700
                        }}
                      >
                        <option value="">Select Winning Creator / Submission...</option>
                        {submissions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.creator_name || 'Creator'} &bull; {truncateAddress(s.wallet_address)} (v{s.revision_count || 1})
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={w.percentage}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWinnersSelection((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], percentage: val };
                              return copy;
                            });
                          }}
                          style={{
                            width: '60px',
                            padding: '8px 6px',
                            borderRadius: '6px',
                            border: '1.5px solid #000000',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '0.82rem'
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>% share</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMultiWinnerModal(null)}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMultiWinner}
                disabled={isDisbursingMulti}
                className="btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#10b981' }}
              >
                <Award size={16} />
                <span>{isDisbursingMulti ? 'Settling on BOT Chain...' : 'Confirm & Disburse Split Rewards'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Bot Integration Status Modal */}
      {showGithubModal && (
        <div className="modal-backdrop" onClick={() => setShowGithubModal(false)}>
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '14px',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  border: '2px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GitPullRequest size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    GitHub Bot &amp; Webhook Engine
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Automated pull request lifecycle on BOT Chain
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGithubModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '18px',
              boxShadow: '2px 2px 0px #000000'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                WEBHOOK ENDPOINT URL
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', marginTop: '4px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>
                  {`${API_BASE}/api/bounties/github-webhook`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${API_BASE}/api/bounties/github-webhook`);
                    alert('Webhook URL copied to clipboard!');
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '6px', fontSize: '0.8rem', color: '#166534' }}>
                <strong>&bull; PR Opened:</strong> Automatically marks targeted bounty as <em>InReview</em> and logs the pull request URL.
              </div>
              <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '6px', fontSize: '0.8rem', color: '#1e40af' }}>
                <strong>&bull; PR Merged:</strong> Automatically flags solver deliverable for final payout settlement on BOT Chain.
              </div>
            </div>

            {pingStatus && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 12px',
                background: '#f1f5f9',
                border: '1.5px solid #000000',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a'
              }}>
                {pingStatus}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePingWebhook}
                className="btn-accent"
                style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
              >
                <Radar size={15} />
                <span>Test Webhook Ping</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGithubModal(false)}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registered Creators & Users Directory Modal */}
      {showUsersModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: isMobile ? '10px 8px' : '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: isMobile ? '4px 4px 0px #000000' : '8px 8px 0px #000000',
            borderRadius: isMobile ? '12px' : '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: isMobile ? '94vh' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: isMobile ? '14px 14px' : '20px 24px',
              borderBottom: '2.5px solid #000000',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: isMobile ? '10px' : '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: isMobile ? '36px' : '42px',
                  height: isMobile ? '36px' : '42px',
                  borderRadius: '10px',
                  background: '#1b3158',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                  flexShrink: 0
                }}>
                  <Users size={isMobile ? 18 : 22} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Registered Creators &amp; Users
                    </h2>
                    <span style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: '1.5px solid #000000',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {stats ? (stats.totalUsers ?? usersList.length) : (usersList.length || 0)} TOTAL
                    </span>
                  </div>
                  <p style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', color: '#64748b', margin: '3px 0 0 0', fontWeight: 600 }}>
                    BOT Chain verified creators, solvers, and community members
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUsersModal(false)}
                style={{
                  background: '#ffffff',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 900,
                  flexShrink: 0
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Subheader: Search Filter & Telemetry */}
            <div style={{
              padding: isMobile ? '10px 14px' : '16px 24px',
              borderBottom: '2px solid #000000',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                position: 'relative',
                flex: 1,
                minWidth: isMobile ? '160px' : '240px'
              }}>
                <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder={isMobile ? "Search creators..." : "Search by name, @handle, email, or BOT address..."}
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxShadow: '2px 2px 0px #000000'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                  Showing {filteredUsers.length} of {usersList.length}
                </span>
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    style={{
                      background: '#e2e8f0',
                      border: '1.5px solid #000000',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Users List */}
            <div style={{
              padding: isMobile ? '12px 10px' : '20px 24px',
              overflowY: 'auto',
              maxHeight: isMobile ? 'calc(94vh - 150px)' : 'calc(90vh - 180px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {filteredUsers.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px'
                }}>
                  <Users size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>No creators or users found</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    {userSearchQuery ? `No users match "${userSearchQuery}"` : 'No registered users in the database yet.'}
                  </div>
                </div>
              ) : (
                filteredUsers.map((u, idx) => {
                  const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'Genesis';

                  return (
                    <div
                      key={u.id || idx}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #000000',
                        boxShadow: '3px 3px 0px #000000',
                        borderRadius: '10px',
                        padding: isMobile ? '12px 10px' : '14px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* User Top Row: Avatar, Name, Handle, Badges */}
                      <div style={{
                        display: 'flex',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, flex: '1 1 200px' }}>
                          <img
                            src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username || u.id}`}
                            alt={u.name || 'User'}
                            style={{
                              width: isMobile ? '38px' : '42px',
                              height: isMobile ? '38px' : '42px',
                              borderRadius: '50%',
                              border: '2px solid #000000',
                              objectFit: 'cover',
                              background: '#e2e8f0',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username || 'arc'}`;
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: isMobile ? '0.9rem' : '0.98rem', fontWeight: 900, color: '#0f172a', wordBreak: 'break-word' }}>
                                {u.name || 'Anonymous Creator'}
                              </span>
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#1b3158',
                                background: '#e0e7ff',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #000000',
                                maxWidth: isMobile ? '135px' : '220px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }} title={`@${u.username}`}>
                                @{u.username || 'creator'}
                              </span>
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '2px',
                              fontSize: '0.74rem',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: isMobile ? '190px' : '300px'
                            }} title={u.email}>
                              <Mail size={12} color="#64748b" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginTop: isMobile ? '2px' : '0' }}>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            border: '1.5px solid #000000',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase'
                          }}>
                            {u.discipline || 'Creator'}
                          </span>
                          <span style={{
                            background: '#dcfce7',
                            color: '#166534',
                            border: '1.5px solid #000000',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 900
                          }}>
                            ${(u.usdc_balance || 0).toLocaleString()} USDC
                          </span>
                        </div>
                      </div>

                      {/* User Bottom Row: Arc L1 Wallet, Joined Date, Socials */}
                      <div style={{
                        display: 'flex',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: '1px dashed #cbd5e1',
                        flexDirection: isMobile ? 'column' : 'row',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                          <span style={{ fontWeight: 800, color: '#64748b', flexShrink: 0 }}>BOT Wallet:</span>
                          {u.wallet_address ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#0f172a',
                                background: '#f8fafc',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.74rem'
                              }}>
                                {truncateAddress(u.wallet_address)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyUserWallet(u.id, u.wallet_address)}
                                style={{
                                  background: copiedUserWallet === u.id ? '#10b981' : '#ffffff',
                                  color: copiedUserWallet === u.id ? '#ffffff' : '#0f172a',
                                  border: '1px solid #000000',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Copy wallet address"
                              >
                                {copiedUserWallet === u.id ? <Check size={10} /> : <Copy size={10} />}
                                <span>{copiedUserWallet === u.id ? 'Copied' : 'Copy'}</span>
                              </button>
                              <a
                                href={`https://scan.bohr.life/address/${u.wallet_address}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: '#1b3158',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontWeight: 700,
                                  textDecoration: 'underline',
                                  fontSize: '0.74rem'
                                }}
                                title="View on Bohr Explorer"
                              >
                                <span>Explorer</span>
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Wallet unlinked</span>
                          )}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#64748b',
                          fontWeight: 600,
                          flexWrap: 'wrap',
                          width: isMobile ? '100%' : 'auto',
                          justifyContent: isMobile ? 'space-between' : 'flex-end',
                          fontSize: '0.74rem'
                        }}>
                          {(u.x || u.github || u.telegram || u.discord) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {u.x && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>X: @{u.x}</span>}
                              {u.github && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>GH: {u.github}</span>}
                              {u.telegram && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>TG: {u.telegram}</span>}
                            </div>
                          )}
                          <span style={{ flexShrink: 0 }}>Joined: {joinedDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: isMobile ? '12px 14px' : '14px 24px',
              borderTop: '2px solid #000000',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span style={{ fontSize: isMobile ? '0.72rem' : '0.78rem', color: '#64748b', fontWeight: 700 }}>
                Total Registered Creators &amp; Users: <strong style={{ color: '#0f172a' }}>{usersList.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowUsersModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '0.84rem' }}
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
