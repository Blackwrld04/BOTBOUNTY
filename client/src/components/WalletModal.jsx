import React from 'react';
import { X, Wallet, Zap, Plus, ExternalLink, CheckCircle } from 'lucide-react';
import { BOT_TESTNET, BOT_MAINNET, truncateAddress } from '../utils/networks';
import { getWalletProvider } from '../utils/wallet';
import { useIsMobile } from '../utils/useIsMobile';

export default function WalletModal({
  isOpen,
  onClose,
  wallet,
  setWallet,
  network,
  setNetwork
}) {
  const isMobile = useIsMobile();
  if (!isOpen) return null;

  const handleConnectBrowserWallet = async () => {
    const provider = getWalletProvider('phantom') ||
      getWalletProvider('rabby') ||
      getWalletProvider('metamask') ||
      getWalletProvider('coinbase') ||
      (typeof window !== 'undefined' ? (window.phantom?.ethereum || window.ethereum) : null);

    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWallet({
            connected: true,
            address: accounts[0],
            balance: 5400,
            type: 'browser',
          });
          onClose();
        }
      } catch (err) {
        console.warn('Wallet connection dismissed, using simulation wallet');
      }
    } else {
      setWallet({
        connected: true,
        address: '0x461cd48D95993242bB04774cc68042795586BbAd',
        balance: 10000,
        type: 'simulated',
      });
      onClose();
    }
  };


  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          border: '3px solid #000000',
          boxShadow: isMobile ? '4px 4px 0px #000000' : '8px 8px 0px #000000',
          borderRadius: isMobile ? '12px' : '14px',
          position: 'relative',
          padding: isMobile ? '20px 16px' : '28px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-wallet-modal-btn"
          onClick={onClose}
          className="brutal-btn brutal-btn-white"
          style={{
            position: 'absolute',
            top: isMobile ? '14px' : '20px',
            right: isMobile ? '14px' : '20px',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '50%'
          }}
        >
          <X size={18} strokeWidth={3} />
        </button>

        <span className="sticker-tape" style={{ marginBottom: '8px' }}>
          BOT CHAIN WALLET &amp; NETWORK
        </span>

        <h3 className="font-space" style={{ fontSize: '1.65rem', fontWeight: 900, color: '#000000', marginBottom: '4px' }}>
          CONNECT &amp; SWITCH
        </h3>
        <p style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600, marginBottom: '22px' }}>
          Connect an EVM wallet (MetaMask / OKX / Rabby) or toggle between BOT Bohr Testnet and Mainnet.
        </p>

        {/* Network Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            BLOCKCHAIN NETWORK
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setNetwork(BOT_TESTNET)}
              className="brutal-btn"
              style={{
                background: network.id === 968 ? 'var(--arc-sky-sync)' : '#ffffff',
                color: '#000000',
                padding: '12px',
                textAlign: 'left',
                display: 'block'
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>BOHR TESTNET</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1f2937' }}>Chain ID: 968</div>
            </button>

            <button
              onClick={() => setNetwork(BOT_MAINNET)}
              className="brutal-btn"
              style={{
                background: network.id === 677 ? 'var(--arc-token-sand)' : '#ffffff',
                color: '#000000',
                padding: '12px',
                textAlign: 'left',
                display: 'block'
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>BOT MAINNET</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1f2937' }}>Chain ID: 677</div>
            </button>
          </div>
        </div>

        {/* Current Balance Box */}
        <div style={{
          background: 'var(--arc-token-sand)',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          borderRadius: '8px',
          padding: '18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#000000' }}>COLLECTED BOUNTY EARNINGS</span>
            <span className="brutal-badge" style={{ background: '#ffffff', color: '#000000', fontSize: '0.7rem' }}>
              {wallet.type === 'browser' ? 'MetaMask / Rabby' : 'Designated Wallet'}
            </span>
          </div>

          <div>
            <p className="font-space" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#000000', lineHeight: 1, margin: 0 }}>
              ${(wallet.balance || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 800 }}>USDT</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#1f2937', fontFamily: 'Geist Mono, monospace', fontWeight: 700, marginTop: '6px', margin: '6px 0 0 0' }}>
              {wallet.address}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            id="connect-browser-wallet-btn"
            onClick={handleConnectBrowserWallet}
            className="brutal-btn brutal-btn-sky"
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
          >
            <Zap size={18} strokeWidth={3} />
            <span>CONNECT METAMASK / RABBY</span>
          </button>

          <button
            onClick={() => {
              setWallet({
                connected: true,
                address: '0x461cd48D95993242bB04774cc68042795586BbAd',
                balance: 10000,
                type: 'simulated',
              });
              onClose();
            }}
            className="brutal-btn brutal-btn-white"
            style={{ width: '100%', padding: '12px', fontSize: '0.88rem' }}
          >
            USE SIMULATED DEMO ACCOUNT (10,000 USDT / 500 $BOT)
          </button>
        </div>
      </div>
    </div>
  );
}
