import React, { useState } from 'react';
import { X, Check, ArrowRight, ExternalLink, ShieldCheck, Unlink } from 'lucide-react';
import { API_BASE } from '../utils/api';

const PLATFORM_CONFIG = {
  telegram: {
    name: 'Telegram',
    color: '#229ED9',
    prefix: '@',
    placeholder: 'username',
    tagline: 'Connect your Telegram for real-time bounty notifications, sponsor coordination, and guild updates.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"
          fill="#229ED9"
        />
      </svg>
    )
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    prefix: '@',
    placeholder: 'username or username#0000',
    tagline: 'Link your Discord to receive verified Creator Guild roles and unlock private bounties on Arc.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    )
  },
  x: {
    name: 'X (Twitter)',
    color: '#000000',
    prefix: '@',
    placeholder: 'handle',
    tagline: 'Verify your X presence to show social clout, build reputational capital, and share bounty triumphs.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  },
  github: {
    name: 'GitHub',
    color: '#24292e',
    prefix: '@',
    placeholder: 'username',
    tagline: 'Connect GitHub to automatically verify code deliverables, commit histories, and smart contract PRs.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#24292e">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    )
  }
};

export default function SocialConnectModal({
  isOpen,
  platform,
  currentHandle,
  userId,
  onClose,
  onSuccess
}) {
  const [handle, setHandle] = useState(currentHandle || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !platform) return null;

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.x;
  const isConnected = !!currentHandle;

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (!handle.trim()) {
      setError(`Please enter your ${config.name} username`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/social-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platform,
          handle: handle.trim(),
          action: 'connect'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to connect account');
        setIsLoading(false);
        return;
      }

      onSuccess(data.user);
      onClose();
    } catch (err) {
      console.error('Social connect error:', err);
      setError('Network error connecting to Arc verification service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/social-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platform,
          action: 'disconnect'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to disconnect account');
        setIsLoading(false);
        return;
      }

      onSuccess(data.user);
      onClose();
    } catch (err) {
      console.error('Social disconnect error:', err);
      setError('Failed to disconnect account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          borderRadius: '14px',
          border: '2.5px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          background: '#ffffff',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#ffffff',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} color="#000000" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {config.icon}
          </div>
          <div>
            <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000', margin: 0 }}>
              {isConnected ? `Manage ${config.name}` : `Connect ${config.name}`}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              BOT Chain Creator Guild Identity
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.45, marginBottom: '20px' }}>
          {config.tagline}
        </p>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '2px solid #000000',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.82rem',
              color: '#991b1b',
              fontWeight: 700,
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        {isConnected ? (
          <div>
            <div
              style={{
                background: '#f0fdf4',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                  ACTIVE CONNECTION
                </span>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                  @{currentHandle}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 800, fontSize: '0.8rem' }}>
                <ShieldCheck size={18} />
                <span>Verified</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Unlink size={15} />
                <span>{isLoading ? 'Disconnecting...' : 'Disconnect Account'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                {config.name} Username / Handle
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}
                >
                  {config.prefix}
                </span>
                <input
                  type="text"
                  placeholder={config.placeholder}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 28px',
                    borderRadius: '8px',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.9rem',
                  justifyContent: 'center',
                  cursor: isLoading ? 'wait' : 'pointer'
                }}
              >
                <span>{isLoading ? 'Verifying Account...' : `Verify & Link ${config.name}`}</span>
                <ArrowRight size={16} />
              </button>

              {platform === 'github' && (
                <p style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', margin: 0 }}>
                  Account validity is confirmed in real time against the public GitHub API.
                </p>
              )}
              {platform === 'telegram' && (
                <p style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', margin: 0 }}>
                  Make sure your Telegram username is public so sponsors can message you.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
