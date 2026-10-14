import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Coins, Award, CheckCircle, Wallet } from 'lucide-react';
import { truncateAddress } from '../utils/arc';
import { API_BASE } from '../utils/api';

export default function WalletDrawer({ isOpen, onClose, wallet, setWallet, network, user }) {
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const creatorAddress = wallet?.address || user?.address || '0x461cd48D95993242bB04774cc68042795586BbAd';
  const creatorBalance = typeof wallet?.balance === 'number' ? wallet.balance : (user?.balance || 0);

  // Fetch creator's authentic disbursements / payouts from the server
  useEffect(() => {
    if (!isOpen) return;

    const fetchTransactions = async () => {
      setLoadingTx(true);
      try {
        const token = localStorage.getItem('arcbounty_session_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const query = user?.email ? `?email=${encodeURIComponent(user.email)}` : creatorAddress ? `?address=${encodeURIComponent(creatorAddress)}` : '';

        const res = await fetch(`${API_BASE}/api/auth/transactions${query}`, { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        setLoadingTx(false);
      }
    };

    fetchTransactions();
  }, [isOpen, user?.email, creatorAddress]);

  if (!isOpen) return null;

  const copyAddress = () => {
    if (creatorAddress) {
      navigator.clipboard.writeText(creatorAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div
          style={{
            padding: '22px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Creator Payout Wallet
              </h3>
              <button
                type="button"
                onClick={copyAddress}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
                title="Copy creator address"
              >
                <span>{truncateAddress(creatorAddress)}</span>
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              Native BOT Chain (Chain ID 677 / 968). Payouts for completed challenges are distributed here by the admin.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: '12px'
            }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Main Balance Box: TOTAL COLLECTED EARNINGS */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
              border: '2px solid #000000',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.9 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>
                TOTAL EARNINGS COLLECTED
              </span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {network?.name || 'BOT Chain'}
              </span>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="font-space" style={{ fontSize: '2.7rem', fontWeight: 900, lineHeight: 1, color: '#ffffff' }}>
                ${creatorBalance.toLocaleString()}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--arc-blockstream-gold)' }}>
                USDC
              </span>
            </div>
          </div>

          {/* Connected Payout Wallet Card */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Designated Payout Destination
            </h4>

            <div
              style={{
                background: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#2775ca',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    flexShrink: 0
                  }}
                >
                  <Wallet size={18} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>Circle USDC</span>
                    <span style={{ fontSize: '0.68rem', color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      CANONICAL
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {creatorAddress}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={copyAddress}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #000',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
              >
                {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Activity Section: Real Collected Transactions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Payout Transactions ({transactions.length})
              </h4>
              <span style={{ fontSize: '0.74rem', color: 'var(--arc-validator-blue)', fontWeight: 700 }}>
                &lt;400ms Malachite BFT
              </span>
            </div>

            {loadingTx ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                Loading transactions...
              </div>
            ) : transactions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {tx.bounty_title || 'Bounty Challenge Reward'}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '3px 0 0 0', fontFamily: 'monospace' }}>
                        {new Date(tx.distributed_at).toLocaleDateString()} · {truncateAddress(tx.tx_hash)}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: '0.92rem',
                          color: '#16a34a',
                          background: '#dcfce7',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #16a34a',
                          display: 'inline-block'
                        }}
                      >
                        +${tx.amount.toLocaleString()} USDC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: '12px',
                  border: '2px dashed #cbd5e1',
                  background: '#f8fafc',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    border: '1.5px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto'
                  }}
                >
                  <Award size={20} color="#0f172a" />
                </div>
                <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  No Bounty Payouts Collected Yet
                </h5>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                  Participate in open challenges on ArcBounty. When your work is approved, your USDC reward will be disbursed directly from escrow to your wallet and logged here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Escrow:</span>
            <span style={{ fontFamily: 'monospace' }}>0x9096...9aA2</span>
          </div>
          <a
            href="https://scan.bohr.life"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--arc-validator-blue)',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>View on Bohr Explorer</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
