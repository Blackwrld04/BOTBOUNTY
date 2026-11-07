import React from 'react';
import { Shield, CheckCircle, Clock, Sparkles } from 'lucide-react';

export default function MetricsStrip({ stats }) {
  const metrics = [
    {
      label: 'TOTAL VALUE IN ESCROW',
      value: `${(stats?.totalEscrowedUsdc ?? stats?.tvlUsdc ?? 0).toLocaleString()} BOT`,
      detail: 'Locked in BOT Chain Escrow',
      bg: 'var(--arc-sky-sync)',
      icon: <Shield size={20} strokeWidth={2.5} />
    },
    {
      label: 'COMPLETED CREATOR PAYOUTS',
      value: `${(stats?.totalDistributedUsdc ?? stats?.totalSettledUsdc ?? 0).toLocaleString()} BOT`,
      detail: `${stats?.settledBounties ?? 0} Bounties Disbursed on BOT Chain`,
      bg: '#ffffff',
      icon: <CheckCircle size={20} strokeWidth={2.5} />
    },
    {
      label: 'SETTLEMENT LATENCY',
      value: `${stats?.avgSettlementTimeMs || 384}ms`,
      detail: 'Deterministic BOT Chain Finality',
      bg: 'var(--arc-token-sand)',
      icon: <Clock size={20} strokeWidth={2.5} />
    },
    {
      label: 'CREATOR CATEGORIES',
      value: '6 ACTIVE',
      detail: 'Design, Video, Threads, Memes, Dev',
      bg: 'var(--arc-blockstream-gold)',
      icon: <Sparkles size={20} strokeWidth={2.5} />
    }
  ];

  return (
    <section style={{ padding: '36px 0', position: 'relative' }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}>
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="brutal-card"
              style={{
                background: item.bg,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#000000', letterSpacing: '0.04em' }}>
                  {item.label}
                </span>
                <div style={{
                  background: 'var(--arc-protocol-navy)',
                  color: '#ffffff',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <p className="font-space" style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--arc-protocol-navy)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {item.value}
                </p>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1f2937', marginTop: '6px' }}>
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
