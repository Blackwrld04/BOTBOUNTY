import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Wallet,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Download,
  AlertCircle,
  Smartphone,
  Sparkles,
  Zap
} from 'lucide-react';
import { truncateAddress } from '../utils/arc';
import {
  initWalletDetection,
  subscribeWalletDetection,
  getDetectedWallets,
  getWalletProvider,
  getWalletDownloadUrl,
  isWalletInstalled,
  isMobileDevice,
  isInAppWalletBrowser,
  getMobileDeepLink
} from '../utils/wallet';
import { useIsMobile } from '../utils/useIsMobile';
import { API_BASE } from '../utils/api';

const WALLETS = [
  {
    id: 'phantom',
    name: 'Phantom',
    url: 'https://phantom.app/download',
    desc: 'EVM & Solana multi-chain wallet. Deep link supported on mobile.',
    icon: (
      <img
        src="/wallets/phantom.svg"
        alt="Phantom"
        width="32"
        height="32"
        style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    url: 'https://metamask.io/download/',
    desc: 'Connect using MetaMask mobile app or browser extension.',
    icon: (
      <img
        src="/wallets/metamask.svg"
        alt="MetaMask"
        width="32"
        height="32"
        style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    url: 'https://www.coinbase.com/wallet/downloads',
    desc: 'Passkey-ready with zero-gas creator settlement on Arc.',
    icon: (
      <img
        src="/wallets/coinbase.svg"
        alt="Coinbase Wallet"
        width="32"
        height="32"
        style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    url: 'https://rabby.io',
    desc: 'Optimal desktop multi-chain routing & sub-400ms Malachite BFT finality.',
    icon: (
      <img
        src="/wallets/rabby.svg"
        alt="Rabby Wallet"
        width="32"
        height="32"
        style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  }
];

export default function ConnectWalletModal({
  isOpen,
  onClose,
  user,
  wallet,
  onWalletConnected
}) {
  const isMobile = useIsMobile();
  const [selectedWallet, setSelectedWallet] = useState(isMobile ? 'metamask' : 'phantom');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [detectedWallets, setDetectedWallets] = useState(getDetectedWallets());
  const inAppBrowser = isInAppWalletBrowser();
  const mobileDevice = isMobileDevice() || isMobile;

  // Subscribe to EIP-6963 provider announcements & window provider detection
  useEffect(() => {
    if (!isOpen) return;
    initWalletDetection();

    const updateDetection = () => {
      const detected = getDetectedWallets();
      setDetectedWallets(detected);
    };

    updateDetection();
    const unsubscribe = subscribeWalletDetection(updateDetection);
    const interval = setInterval(updateDetection, 800);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen]);

  // If a wallet is installed, auto-select it if current selected is not installed
  useEffect(() => {
    if (!isOpen) return;
    if (detectedWallets.metamask && !isWalletInstalled(selectedWallet)) {
      setSelectedWallet('metamask');
    } else if (detectedWallets.phantom && !isWalletInstalled(selectedWallet)) {
      setSelectedWallet('phantom');
    } else if (detectedWallets.rabby && !isWalletInstalled(selectedWallet)) {
      setSelectedWallet('rabby');
    } else if (detectedWallets.coinbase && !isWalletInstalled(selectedWallet)) {
      setSelectedWallet('coinbase');
    }
  }, [detectedWallets, isOpen]);

  if (!isOpen) return null;

  // 1. Primary: Direct In-Browser / Extension / In-App Browser Connection (EIP-1193)
  const handleConnect = async (walletId) => {
    setIsConnecting(true);
    setError('');

    const targetWalletObj = WALLETS.find((w) => w.id === walletId) || WALLETS[0];
    const provider = getWalletProvider(walletId);

    // If outside in-app browser on mobile, guide user to deep link or instant creator wallet
    if (!provider) {
      if (mobileDevice) {
        const deepLink = getMobileDeepLink(walletId);
        setError(
          `To connect your ${targetWalletObj.name} on mobile, tap "Open in ${targetWalletObj.name} App" below to launch the DApp inside your wallet, or use the "Instant BOT Chain Creator Wallet" button.`
        );
      } else {
        setError(
          `${targetWalletObj.name} extension was not detected or is not active in this browser. Please make sure the ${targetWalletObj.name} extension is enabled, or click "Install ${targetWalletObj.name}" below.`
        );
      }
      setIsConnecting(false);
      return;
    }

    try {
      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) {
        throw new Error(`No account authorized in ${targetWalletObj.name}. Please unlock your wallet and approve the connection.`);
      }
      const address = accounts[0];

      // Switch or add BOT Chain (Bohr Testnet 968) to wallet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x3c8' }]
        });
      } catch (switchErr) {
        if (switchErr?.code === 4902 || switchErr?.data?.originalError?.code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x3c8',
                  chainName: 'BOT Bohr Testnet',
                  nativeCurrency: { name: 'tBOT', symbol: 'tBOT', decimals: 18 },
                  rpcUrls: ['https://rpc.bohr.life'],
                  blockExplorerUrls: ['https://scan.bohr.life']
                }
              ]
            });
          } catch (addErr) {
            console.warn('Network add skipped:', addErr);
          }
        }
      }

      // Request single-use cryptographic challenge nonce from BotBounty server
      let challenge = null;
      try {
        const nonceRes = await fetch(`${API_BASE}/api/auth/wallet-nonce?address=${address}`);
        challenge = await nonceRes.json();
      } catch (e) {
        console.warn('Nonce request error:', e);
      }

      // If nonce server is reachable, do cryptographic personal_sign
      if (challenge?.success && challenge?.message) {
        try {
          const signature = await provider.request({
            method: 'personal_sign',
            params: [challenge.message, address]
          });

          const sessionToken = localStorage.getItem('botbounty_session_token') || localStorage.getItem('arcbounty_session_token');
          const verifyRes = await fetch(`${API_BASE}/api/auth/wallet-verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
            },
            body: JSON.stringify({
              address,
              signature,
              nonce: challenge.nonce,
              userId: user?.id || null
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            onWalletConnected({
              connected: true,
              address: verifyData.user.address,
              balance: verifyData.user.balance || 1000,
              type: walletId
            }, verifyData.user, verifyData.token);
            onClose();
            return;
          }
        } catch (signErr) {
          console.warn('Signature skipped or cancelled, proceeding with authorized address:', signErr);
        }
      }

      // Fallback direct wallet login / link
      const fallbackRes = await fetch(`${API_BASE}/api/auth/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const fallbackData = await fallbackRes.json();

      if (fallbackRes.ok && fallbackData.success) {
        onWalletConnected({
          connected: true,
          address: fallbackData.user.address,
          balance: fallbackData.user.balance || 1000,
          type: walletId
        }, fallbackData.user, fallbackData.token);
        onClose();
      } else {
        // Direct local connect
        onWalletConnected({
          connected: true,
          address,
          balance: 1000,
          type: walletId
        }, user, null);
        onClose();
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      if (err.code === 4001 || err.message?.toLowerCase().includes('reject') || err.message?.toLowerCase().includes('denied')) {
        setError(`Connection request was cancelled in ${targetWalletObj.name}.`);
      } else {
        setError(err.message || `Failed to connect with ${targetWalletObj.name}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 2. Mobile Deep Link Launcher
  const handleOpenMobileApp = (walletId) => {
    const deepLink = getMobileDeepLink(walletId);
    if (deepLink) {
      window.location.href = deepLink;
    }
  };

  // 3. Instant Mobile Creator Wallet (One-Tap Zero Gas Setup for mobile users)
  const handleInstantCreatorWallet = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // If user already logged in with address, activate immediately
      const activeAddress = user?.address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const res = await fetch(`${API_BASE}/api/auth/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: activeAddress })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onWalletConnected({
          connected: true,
          address: data.user.address,
          balance: data.user.balance || 1000,
          type: 'arc_creator'
        }, data.user, data.token);
      } else {
        onWalletConnected({
          connected: true,
          address: activeAddress,
          balance: 1000,
          type: 'arc_creator'
        }, user, null);
      }
      onClose();
    } catch (err) {
      console.error('Instant wallet error:', err);
      setError('Failed to initialize instant creator wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const selectedWalletObj = WALLETS.find((w) => w.id === selectedWallet) || WALLETS[0];
  const isSelectedWalletInstalled = isWalletInstalled(selectedWallet) || inAppBrowser;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: isMobile ? '20px 16px' : '28px 30px',
          borderRadius: isMobile ? '12px' : '14px',
          border: '2.5px solid #000000',
          boxShadow: isMobile ? '4px 4px 0px #000000' : '6px 6px 0px #000000',
          background: '#ffffff',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
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
            zIndex: 10
          }}
        >
          <X size={16} color="#000000" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '36px' }}>
          <div
            style={{
              width: isMobile ? '34px' : '38px',
              height: isMobile ? '34px' : '38px',
              borderRadius: '8px',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              background: '#acc6e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Wallet size={18} color="#1b3158" />
          </div>
          <div>
            <h3 className="font-space" style={{ fontSize: isMobile ? '1.15rem' : '1.3rem', fontWeight: 900, color: '#000000', margin: 0, lineHeight: 1.2 }}>
              {wallet && wallet.connected ? 'Switch Connected Wallet' : 'Connect Web3 Wallet'}
            </h3>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.45, marginBottom: '14px' }}>
          Connect your Web3 wallet to receive fast USDT &amp; $BOT payouts directly on BOT Chain (Chain ID 677 / 968).
        </p>

        {/* Mobile Web3 In-App Browser Indicator */}
        {inAppBrowser && (
          <div
            style={{
              background: '#dcfce7',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: '#15803d',
              fontWeight: 800
            }}
          >
            <Sparkles size={16} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>In-App Web3 Browser Detected: Ready to connect directly!</span>
          </div>
        )}


        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.8rem',
              color: '#991b1b',
              fontWeight: 700,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} color="#991b1b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ lineHeight: 1.4 }}>{error}</div>
          </div>
        )}

        {/* Wallet Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {WALLETS.map((w) => {
            const isSelected = selectedWallet === w.id;
            const isCurrentlyActive = wallet && wallet.connected && wallet.type === w.id;
            const isInstalled = isWalletInstalled(w.id) || inAppBrowser;

            return (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedWallet(w.id);
                  setError('');
                }}
                style={{
                  padding: isMobile ? '10px 12px' : '12px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '2.5px solid #000000' : '1.5px solid #cbd5e1',
                  boxShadow: isSelected ? '3px 3px 0px #000000' : 'none',
                  background: isSelected ? '#fffae6' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {w.icon}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: isMobile ? '0.86rem' : '0.92rem', color: '#0f172a' }}>
                        {w.name}
                      </span>
                      {isInstalled ? (
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #16a34a',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#16a34a' }} />
                          <span>Detected</span>
                        </span>
                      ) : mobileDevice ? (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #0284c7',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '0.64rem',
                          fontWeight: 800
                        }}>
                          App Link
                        </span>
                      ) : (
                        <span style={{
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '0.64rem',
                          fontWeight: 700
                        }}>
                          Extension
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.desc}
                    </p>
                  </div>
                </div>

                {isCurrentlyActive ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                    <Check size={14} strokeWidth={3} />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #1b3158' : '2px solid #cbd5e1',
                      background: '#ffffff',
                      flexShrink: 0,
                      marginLeft: '8px'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isSelectedWalletInstalled ? (
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => handleConnect(selectedWallet)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: isMobile ? '0.86rem' : '0.92rem',
                justifyContent: 'center',
                cursor: isConnecting ? 'wait' : 'pointer'
              }}
            >
              <span>{isConnecting ? 'Verifying Signature...' : `Connect with ${selectedWalletObj.name}`}</span>
              <ArrowRight size={16} />
            </button>
          ) : mobileDevice ? (
            /* Mobile Deep Link & Instant Fallbacks */
            <>
              <button
                type="button"
                onClick={() => handleOpenMobileApp(selectedWallet)}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.88rem',
                  justifyContent: 'center',
                  background: 'var(--arc-validator-blue)',
                  gap: '8px'
                }}
              >
                <Smartphone size={16} />
                <span>Open in {selectedWalletObj.name} App</span>
                <ExternalLink size={14} />
              </button>

              <button
                type="button"
                disabled={isConnecting}
                onClick={handleInstantCreatorWallet}
                className="btn-accent"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: '0.86rem',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={16} strokeWidth={2.5} />
                <span>Activate Instant BOT Chain Creator Wallet (1-Tap)</span>
              </button>
            </>
          ) : (
            /* Desktop Fallback to Install */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href={getWalletDownloadUrl(selectedWallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.88rem',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  background: 'var(--arc-validator-blue)'
                }}
              >
                <Download size={16} />
                <span>Download & Install {selectedWalletObj.name} Extension</span>
                <ExternalLink size={14} />
              </a>

              <button
                type="button"
                disabled={isConnecting}
                onClick={handleInstantCreatorWallet}
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.84rem',
                  justifyContent: 'center'
                }}
              >
                <Zap size={15} />
                <span>Use Instant BOT Chain Creator Wallet</span>
              </button>
            </div>
          )}
        </div>

        {/* Security / Network info footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.72rem', color: '#64748b', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#16a34a" />
            <span>BOT Chain (677 / 968) &bull; USDT &amp; $BOT</span>
          </div>
          <a
            href="https://scan.bohr.life"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2f578c', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <span>BOT Chain Docs</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
