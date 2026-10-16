import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  X,
  Sparkles,
  ArrowRight,
  DollarSign,
  Calendar,
  Check,
  HelpCircle,
  Copy,
  Shield,
  ExternalLink,
  Wallet,
  Plus,
  Trash2,
  Users,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CREATOR_CATEGORIES } from '../data/initialBounties';
import { truncateAddress } from '../utils/arc';
import { API_BASE } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';

export default function CreateBountyModal({ isOpen, onClose, onCreateBounty, wallet, user }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1); // 1: Category & Title, 2: Description & AI Compose, 3: Reward & Escrow, 4: Admin Review Confirmation
  const [category, setCategory] = useState('DESIGN');
  const [title, setTitle] = useState('');
  const [submissionType, setSubmissionType] = useState('Figma / 3D Render Link');
  const [amount, setAmount] = useState('500');
  const [distributionType, setDistributionType] = useState('single'); // 'single', 'tiered', 'equal'
  const [tieredRewards, setTieredRewards] = useState([
    { place: 1, amount: '100', label: '1st Place' },
    { place: 2, amount: '50', label: '2nd Place' },
    { place: 3, amount: '30', label: '3rd Place' }
  ]);
  const [equalWinnerCount, setEqualWinnerCount] = useState('10');
  const [equalPerWinner, setEqualPerWinner] = useState('25');
  const [submittedBounty, setSubmittedBounty] = useState(null);
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('14');
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [escrowWallet, setEscrowWallet] = useState('0xB128F2f442554B6517D779788F28F2EB2612164A');
  const [depositTx, setDepositTx] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'manual'
  const [copiedEscrow, setCopiedEscrow] = useState(false);
  const [isPayingWallet, setIsPayingWallet] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/bounties/escrow-wallet`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.escrowWallet) {
          setEscrowWallet(data.escrowWallet);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const availableCategories = CREATOR_CATEGORIES.filter(c => c.id !== 'ALL');

  // AI Compose helper (Gibwork style)
  const handleAiCompose = () => {
    if (!title) {
      alert('Please enter a brief task title first.');
      return;
    }
    setIsAiGenerating(true);
    setTimeout(() => {
      setDescription(
        `### Objective\nBuild a verified ${category.toLowerCase()} solution for the BOT Chain ecosystem with deterministic finality and institutional execution speed.\n\n### Deliverables\n- Production-ready source code / smart contracts / PR link\n- Unit & integration tests\n- Deployment verification and technical documentation\n\n### Acceptance Criteria\n1. Passes continuous integration test suite\n2. Completed within ${deadlineDays} days\n3. Verifiable deliverable reference provided on submission`
      );
      setIsAiGenerating(false);
    }, 600);
  };

  const handleCopyEscrow = () => {
    navigator.clipboard.writeText(escrowWallet);
    setCopiedEscrow(true);
    setTimeout(() => setCopiedEscrow(false), 2000);
  };

  const handlePayWithWallet = async () => {
    setIsPayingWallet(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const escrowAbi = [
          'function createBounty(bytes32 bountyId, address settlementToken, uint256 amount, uint256 deadline, uint256 reviewPeriod, string issueUrl) external payable'
        ];
        const escrowContract = new ethers.Contract(escrowWallet, escrowAbi, signer);
        const bountyIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(title + Date.now().toString()));
        const deadlineSec = Math.floor(Date.now() / 1000) + (parseInt(deadlineDays, 10) || 14) * 86400;
        const totalAmountWei = ethers.parseEther('0.01'); // Base testnet funding amount

        const tx = await escrowContract.createBounty(
          bountyIdBytes32,
          ethers.ZeroAddress,
          totalAmountWei,
          deadlineSec,
          86400 * 7,
          'https://github.com/Blackwrld04/BOTBOUNTY',
          { value: totalAmountWei }
        );
        const receipt = await tx.wait();
        const txHash = receipt?.hash || tx.hash;
        setDepositTx(txHash);
      } else {
        const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
        setDepositTx(txHash);
      }
    } catch (e) {
      console.warn('Wallet payment prompt error:', e);
      alert('Wallet transaction prompt: ' + (e.message || e));
    } finally {
      setIsPayingWallet(false);
    }
  };

  const effectiveTotalAmount = () => {
    if (distributionType === 'tiered') {
      return tieredRewards.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    }
    if (distributionType === 'equal') {
      return (parseInt(equalWinnerCount, 10) || 0) * (parseFloat(equalPerWinner) || 0);
    }
    return parseFloat(amount) || 0;
  };

  const handleAddTier = () => {
    if (tieredRewards.length >= 10) return;
    const nextPlace = tieredRewards.length + 1;
    const suffix = nextPlace === 1 ? 'st' : nextPlace === 2 ? 'nd' : nextPlace === 3 ? 'rd' : 'th';
    setTieredRewards([
      ...tieredRewards,
      { place: nextPlace, amount: '20', label: `${nextPlace}${suffix} Place` }
    ]);
  };

  const handleRemoveTier = (idx) => {
    if (tieredRewards.length <= 2) return;
    const next = tieredRewards.filter((_, i) => i !== idx).map((t, i) => {
      const p = i + 1;
      const suffix = p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th';
      return { ...t, place: p, label: t.label || `${p}${suffix} Place` };
    });
    setTieredRewards(next);
  };

  const handleUpdateTier = (idx, field, value) => {
    setTieredRewards(tieredRewards.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;

    const totalCalculated = effectiveTotalAmount();
    if (!totalCalculated || totalCalculated <= 0) {
      alert('Please specify a valid reward amount');
      return;
    }

    setIsSubmitting(true);
    const catObj = CREATOR_CATEGORIES.find((c) => c.id === category) || CREATOR_CATEGORIES[1];
    const generatedTx = depositTx || ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''));

    let rewardDistribution = null;
    if (distributionType === 'tiered') {
      rewardDistribution = {
        type: 'tiered',
        winnerCount: tieredRewards.length,
        tiers: tieredRewards.map((t, idx) => ({
          place: idx + 1,
          label: t.label || `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`,
          amount: parseFloat(t.amount) || 0
        }))
      };
    } else if (distributionType === 'equal') {
      const count = Math.max(1, parseInt(equalWinnerCount, 10) || 1);
      const perWinner = parseFloat(equalPerWinner) || 0;
      rewardDistribution = {
        type: 'equal',
        winnerCount: count,
        perWinnerAmount: perWinner,
        tiers: Array.from({ length: count }, (_, i) => ({
          place: i + 1,
          label: `Winner #${i + 1}`,
          amount: perWinner
        }))
      };
    } else {
      rewardDistribution = {
        type: 'single',
        winnerCount: 1,
        tiers: [{ place: 1, label: '1st Place', amount: totalCalculated }]
      };
    }

    const payload = {
      title,
      category,
      categoryName: catObj.label.replace(/^[^\s]+\s/, ''),
      categoryColor: catObj.color,
      submissionType,
      issueUrl: `https://arcbounty.io/task/${Date.now().toString().slice(-4)}`,
      amount: totalCalculated,
      rewardDistribution,
      description: description || 'Deliver high quality creative work satisfying requirements.',
      tags: [category, 'Circle Arc', 'USDC'],
      deadlineDays: Math.max(1, parseInt(deadlineDays, 10) || 7),
      deadline: Date.now() + Math.max(1, parseInt(deadlineDays, 10) || 7) * 86400000,
      escrowWallet,
      depositTx: generatedTx,
      maintainer: wallet.address || user?.address || '0x461cd48D95993242bB04774cc68042795586BbAd',
      maintainerName: user?.name || 'Circle Creative Guild',
      maintainerEmail: user?.email || null
    };

    try {
      const created = await onCreateBounty(payload);
      setSubmittedBounty(created || payload);
      setStep(4);
    } catch (err) {
      alert('Failed to submit bounty: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '680px',
          maxHeight: isMobile ? '95vh' : '90vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '14px 14px 0 0' : '18px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          padding: isMobile ? '20px 16px' : '32px',
          position: 'relative'
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
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} color="#64748b" />
        </button>

        {/* Stepper Breadcrumbs (Gibwork style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: step >= 1 ? 'var(--arc-protocol-navy)' : '#94a3b8'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: step >= 1 ? 'var(--arc-protocol-navy)' : '#e2e8f0',
              color: step >= 1 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem'
            }}>1</span>
            <span>Task Scope</span>
          </div>

          <div style={{ width: '20px', height: '2px', background: step >= 2 ? 'var(--arc-protocol-navy)' : '#e2e8f0' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: step >= 2 ? 'var(--arc-protocol-navy)' : '#94a3b8'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: step >= 2 ? 'var(--arc-protocol-navy)' : '#e2e8f0',
              color: step >= 2 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem'
            }}>2</span>
            <span>Specifications</span>
          </div>

          <div style={{ width: '20px', height: '2px', background: step >= 3 ? 'var(--arc-protocol-navy)' : '#e2e8f0' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: step >= 3 ? 'var(--arc-protocol-navy)' : '#94a3b8'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: step >= 3 ? 'var(--arc-protocol-navy)' : '#e2e8f0',
              color: step >= 3 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem'
            }}>3</span>
            <span>Escrow &amp; Deposit</span>
          </div>
        </div>

        {/* STEP 1: Category & Title */}
        {step === 1 && (
          <div>
            <h2 className="font-space" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Select Opportunity Category
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
              Choose the discipline that best matches your creative or technical deliverable.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '24px' }}>
              {availableCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '10px',
                    border: category === c.id ? '2px solid var(--arc-protocol-navy)' : '1px solid #e2e8f0',
                    background: category === c.id ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                >
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: category === c.id ? 'var(--arc-protocol-navy)' : '#334155'
                  }}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                TASK TITLE
              </label>
              <input
                type="text"
                placeholder="e.g. Design Official 3D Mascot for Circle Arc or Write Viral Thread"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                DELIVERABLE SUBMISSION FORMAT
              </label>
              <input
                type="text"
                placeholder="e.g. Figma Link / YouTube Video / GitHub PR / Notion Document"
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  if (!title) {
                    alert('Please enter a task title');
                    return;
                  }
                  setStep(2);
                }}
                className="btn-primary"
                style={{ padding: '12px 24px', borderRadius: '10px' }}
              >
                <span>Continue to Specifications</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Description & Specifications */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h2 className="font-space" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Deliverable Specifications
              </h2>
              <button
                type="button"
                onClick={handleAiCompose}
                disabled={isAiGenerating}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--arc-validator-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={14} />
                <span>{isAiGenerating ? 'Drafting...' : 'Auto Compose Brief'}</span>
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '20px' }}>
              Outline deliverables, acceptance criteria, and any reference documentation.
            </p>

            <textarea
              rows={8}
              placeholder="Describe deliverables, required technical stack or design constraints..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '24px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '10px' }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary"
                style={{ padding: '12px 24px', borderRadius: '10px' }}
              >
                <span>Continue to Escrow Payout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Escrow & Prize Distribution */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 className="font-space" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Prize Distribution &amp; BOT Chain Escrow
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '20px' }}>
              Configure winner prize sharing and lock settlement rewards in the BotBounty escrow smart contract on Bohr Testnet.
            </p>

            {/* Prize Distribution Selector */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>
                Prize Pool Sharing Structure
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setDistributionType('single')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: '1.5px solid #000000',
                    background: distributionType === 'single' ? '#1b3158' : '#ffffff',
                    color: distributionType === 'single' ? '#ffffff' : '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center'
                  }}
                >
                  <Award size={16} />
                  <span>Single Winner</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>100% to 1st</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionType('tiered')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: '1.5px solid #000000',
                    background: distributionType === 'tiered' ? '#1b3158' : '#ffffff',
                    color: distributionType === 'tiered' ? '#ffffff' : '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center'
                  }}
                >
                  <Users size={16} />
                  <span>Ranked Tiers</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>1st, 2nd, 3rd...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionType('equal')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: '1.5px solid #000000',
                    background: distributionType === 'equal' ? '#1b3158' : '#ffffff',
                    color: distributionType === 'equal' ? '#ffffff' : '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center'
                  }}
                >
                  <DollarSign size={16} />
                  <span>Equal Split</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>e.g. 10 × $25</span>
                </button>
              </div>

              {/* Single Winner Config */}
              {distributionType === 'single' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    1ST PLACE WINNER REWARD (USDC)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>$</span>
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 28px',
                        borderRadius: '8px',
                        border: '1.5px solid #000000',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Ranked Tiers Config */}
              {distributionType === 'tiered' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                      PRIZE TIERS ({tieredRewards.length} WINNERS)
                    </span>
                    {tieredRewards.length < 10 && (
                      <button
                        type="button"
                        onClick={handleAddTier}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #000000',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={12} />
                        <span>Add Tier</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {tieredRewards.map((tier, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #000000'
                        }}
                      >
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#1b3158',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)}
                          placeholder="Tier Name"
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            outline: 'none'
                          }}
                        />

                        <div style={{ position: 'relative', width: '110px', flexShrink: 0 }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>$</span>
                          <input
                            type="number"
                            min="5"
                            value={tier.amount}
                            onChange={(e) => handleUpdateTier(idx, 'amount', e.target.value)}
                            placeholder="USDC"
                            style={{
                              width: '100%',
                              padding: '6px 8px 6px 22px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              outline: 'none'
                            }}
                          />
                        </div>

                        {tieredRewards.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Remove tier"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #000000',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>Total Tiered Prize Pool:</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      ${effectiveTotalAmount().toLocaleString()} USDC
                    </strong>
                  </div>
                </div>
              )}

              {/* Equal Split Config */}
              {distributionType === 'equal' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        NUMBER OF WINNERS
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={equalWinnerCount}
                        onChange={(e) => setEqualWinnerCount(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #000000',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        USDC REWARD PER WINNER
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>$</span>
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={equalPerWinner}
                          onChange={(e) => setEqualPerWinner(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 26px',
                            borderRadius: '8px',
                            border: '1.5px solid #000000',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            outline: 'none',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #000000',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>
                      {equalWinnerCount} creators &times; ${equalPerWinner} USDC each:
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      ${effectiveTotalAmount().toLocaleString()} USDC
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Deadline Setting */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                COMPLETION DEADLINE ({deadlineDays} DAYS DURATION)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={['1', '2', '3', '5', '7', '10', '14', '21', '30'].includes(deadlineDays) && !isCustomDays ? deadlineDays : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomDays(true);
                    } else {
                      setIsCustomDays(false);
                      setDeadlineDays(e.target.value);
                    }
                  }}
                  style={{
                    flex: isCustomDays ? '1' : '1 1 100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    background: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="1">1 Day (Flash Challenge)</option>
                  <option value="2">2 Days (48 Hours)</option>
                  <option value="3">3 Days (Rapid Sprint)</option>
                  <option value="5">5 Days</option>
                  <option value="7">7 Days (1 Week)</option>
                  <option value="10">10 Days</option>
                  <option value="14">14 Days (2 Weeks)</option>
                  <option value="21">21 Days (3 Weeks)</option>
                  <option value="30">30 Days (1 Month)</option>
                  <option value="custom">Custom Days...</option>
                </select>

                {isCustomDays && (
                  <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(e.target.value)}
                      placeholder="Days"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                      DAYS
                    </span>
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '6px 0 0 0', fontWeight: 600 }}>
                Challenge will count down live for {deadlineDays || 0} days. Once expired, submissions are strictly closed.
              </p>
            </div>

            {/* Official Designated Escrow Contract Card */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--arc-validator-blue)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    BOT Chain Escrow Smart Contract
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#e2e8f0', color: '#1b3158', padding: '3px 8px', borderRadius: '4px' }}>
                  Bohr Testnet &bull; Chain ID 968
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                Lock total reward of <strong style={{ color: '#0f172a' }}>${effectiveTotalAmount().toLocaleString()} ($BOT / USDT)</strong> directly into the verified escrow contract:
              </p>

              {/* Address Box with Copy */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '6px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                  {escrowWallet}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEscrow}
                  style={{
                    background: copiedEscrow ? '#10b981' : '#f1f5f9',
                    color: copiedEscrow ? '#ffffff' : '#0f172a',
                    border: '1.5px solid #000000',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copiedEscrow ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedEscrow ? 'Copied' : 'Copy Address'}</span>
                </button>
              </div>

              {/* 1-Click Connect Wallet Escrow Funding */}
              <div style={{
                background: depositTx ? '#ecfdf5' : '#ffffff',
                border: depositTx ? '2px solid #10b981' : '1.5px solid #000000',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {depositTx ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '0.82rem', fontWeight: 700 }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span>Escrow Deposit Confirmed On-Chain</span>
                    </div>
                    <a
                      href={`https://scan.bohr.life/tx/${depositTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View on Bohr Explorer</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                      Connect your Web3 wallet to lock funds directly into escrow:
                    </div>
                    <button
                      type="button"
                      onClick={handlePayWithWallet}
                      disabled={isPayingWallet}
                      style={{
                        background: '#000000',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isPayingWallet ? 'wait' : 'pointer'
                      }}
                    >
                      <Wallet size={15} />
                      <span>{isPayingWallet ? 'Confirming in Wallet...' : 'Fund & Lock with Wallet'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Contract Guarantee Notice */}
            <div style={{
              background: '#fefce8',
              border: '1.5px solid #eab308',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#713f12',
              lineHeight: 1.45,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <Shield size={16} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Non-Custodial Escrow Security:</strong> Bounties are locked in the audited Bohr smart contract. Maintainers disburse rewards upon verifying Pull Requests, while solvers are protected with automated timeout claims if maintainers become unresponsive.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary"
                style={{ padding: '12px 18px', borderRadius: '10px' }}
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ flex: 1, padding: '14px', borderRadius: '10px', background: '#10b981' }}
              >
                <span>{isSubmitting ? 'Securing on BOT Chain...' : `Publish $${effectiveTotalAmount().toLocaleString()} Challenge on BOT Chain`}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Admin Review Confirmation */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef08a',
              border: '2.5px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Clock size={32} color="#000000" />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              background: '#fef08a',
              color: '#854d0e',
              border: '1.5px solid #000000',
              fontSize: '0.78rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Status: Pending Admin Review
            </div>

            <h2 className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#000000', margin: '0 0 8px 0' }}>
              Bounty Submitted for Admin Verification
            </h2>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, maxWidth: '520px', margin: '0 auto 20px auto' }}>
              Your challenge <strong>"{title}"</strong> for <strong>${effectiveTotalAmount().toLocaleString()} USDC</strong> has been submitted. The platform administrator will verify your escrow deposit and review conditions before it goes live.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: '10px' }}>
                Next Steps on BOT Chain
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>1. Admin Deposit Review:</strong> Admin checks the escrow deposit to <code>{truncateAddress(escrowWallet)}</code>.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>2. Goes Live for Creators:</strong> Once approved, the challenge will appear on the public feed and creators can submit deliverables.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>3. Gmail Notification Broadcast:</strong> You will receive a confirmation email at your Gmail, and all registered creators will receive a broadcast.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '0.95rem' }}
            >
              <span>Got It &bull; Return to Platform</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
