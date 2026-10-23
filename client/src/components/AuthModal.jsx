import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Zap,
  Mail,
  KeyRound,
  RotateCw,
  User,
  AtSign,
  Palette,
  Code2,
  FileText,
  Share2,
  Layers,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getWalletProvider, getDetectedWallets } from '../utils/wallet';
import { API_BASE as SERVER_API_BASE } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';

const API_BASE = `${SERVER_API_BASE}/api/auth`;

const DISCIPLINES = [
  {
    id: 'Design',
    label: 'Design',
    desc: 'UI/UX, 3D Renders, Motion Graphics, Branding Kits',
    icon: Palette
  },
  {
    id: 'Content',
    label: 'Content',
    desc: 'Explainer Videos, Deep-Dive Threads, Technical Guides',
    icon: FileText
  },
  {
    id: 'Development',
    label: 'Development',
    desc: 'Smart Contracts, Frontends, DeFi Integrations, Bots',
    icon: Code2
  },
  {
    id: 'All Social',
    label: 'All Social',
    desc: 'Viral X/Twitter Posts, Memes, Community Moderation',
    icon: Share2
  },
  {
    id: 'Other',
    label: 'Other',
    desc: 'Protocol Research, Documentation Translation, Growth',
    icon: Layers
  }
];

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onLoginSuccess }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [step, setStep] = useState('input'); // 'input', 'otp', 'google_auth'
  const [signupSlide, setSignupSlide] = useState(1); // 1: Name & Handle, 2: Specialty, 3: Email & Password
  const [loginWithOtp, setLoginWithOtp] = useState(false); // toggle passwordless login

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Signup Profile
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [handleStatus, setHandleStatus] = useState({ state: 'idle', message: '' });
  const [discipline, setDiscipline] = useState('Content');

  // OTP Verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Google Sign-In Simulation
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const otpInputsRef = useRef([]);

  // Reset state when opened or mode changed
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('input');
      setSignupSlide(1);
      setLoginWithOtp(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setName('');
      setUsername('');
      setDiscipline('Content');
      setOtp(['', '', '', '', '', '']);
      setEmailPreviewUrl(null);
      setErrorMessage('');
      setSuccessMessage('');
      setGoogleEmail('');
      setGoogleName('');
    }
  }, [isOpen, initialMode]);

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setStep('input');
    setErrorMessage('');
    if (newMode === 'signup') setSignupSlide(1);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/${newMode}`);
    }
  };

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Live handle availability checking
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
    if (!clean || clean.length < 3) {
      setHandleStatus({ state: 'idle', message: '' });
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_BASE}/check-username?username=${clean}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.available) {
            setHandleStatus({ state: 'available', message: `@${clean} is available!` });
          } else {
            setHandleStatus({ state: 'taken', message: `@${clean} is already taken.` });
          }
        })
        .catch(() => setHandleStatus({ state: 'idle', message: '' }));
    }, 280);

    return () => clearTimeout(timer);
  }, [username]);

  if (!isOpen) return null;

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned && value !== '') return;

    const newOtp = [...otp];

    if (cleaned.length > 1) {
      // Pasted 6-digit code
      const digits = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto-advance to next input box
    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Standard Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Invalid credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      console.error('Password login error:', err);
      setErrorMessage('Network error connecting to BotBounty authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Slide 1 Next Validation
  const handleSlide1Next = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Please choose a handle with at least 3 characters.');
      return;
    }

    if (handleStatus.state === 'taken') {
      setErrorMessage(`Creator handle "@${cleanUsername}" is already taken. Please choose another handle.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/check-username?username=${cleanUsername}`);
      const data = await res.json();
      if (data && !data.available) {
        setErrorMessage(data.message || `Creator handle "@${cleanUsername}" is already taken. Please choose another handle.`);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Check username error:', err);
    } finally {
      setIsLoading(false);
    }

    setErrorMessage('');
    setSignupSlide(2);
  };

  // Slide 2 Next Validation
  const handleSlide2Next = (e) => {
    e.preventDefault();
    if (!discipline) {
      setErrorMessage('Please select your primary specialty.');
      return;
    }
    setErrorMessage('');
    setSignupSlide(3);
  };

  // Slide 3 Final Signup Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          email: cleanEmail,
          password,
          discipline
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to initialize account registration.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || `A 6-digit verification code has been dispatched to ${cleanEmail}`);
      if (data.previewUrl) {
        setEmailPreviewUrl(data.previewUrl);
      }
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(45);
      setStep('otp');
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error('Signup error:', err);
      setErrorMessage('Network error connecting to BotBounty authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Passwordless Email OTP Login Request
  const handleSendOtpCode = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'login' })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to dispatch verification email');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || `A 6-digit sign in code was sent to ${data.email}`);
      if (data.previewUrl) {
        setEmailPreviewUrl(data.previewUrl);
      }
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(45);
      setStep('otp');
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error('Send OTP error:', err);
      setErrorMessage('Network error connecting to BotBounty authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP (Works for both signup activation and passwordless login)
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const codeString = otp.join('');

    if (codeString.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: codeString,
          name: name.trim() || email.split('@')[0],
          username: username.trim() || email.split('@')[0],
          discipline: discipline,
          password: password || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Invalid verification code. Please check your inbox and try again.');
        setIsLoading(false);
        return;
      }

      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cryptographic Web3 Wallet Verification (SIWE)
  const handleCryptographicWalletAuth = async () => {
    setIsLoading(true);
    setErrorMessage('');

    // Check detected wallet provider (Phantom, Rabby, MetaMask, Coinbase, or any)
    const provider = getWalletProvider('phantom') ||
      getWalletProvider('rabby') ||
      getWalletProvider('metamask') ||
      getWalletProvider('coinbase') ||
      (typeof window !== 'undefined' ? (window.phantom?.ethereum || window.ethereum) : null);

    if (!provider) {
      setErrorMessage('No Web3 wallet extension found. Please install Phantom, Rabby Wallet, or MetaMask.');
      setIsLoading(false);
      return;
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) {
        throw new Error('No accounts selected in Web3 wallet extension.');
      }
      const address = accounts[0];

      // Switch or add BOT Chain (Bohr Testnet 968)
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

      const nonceRes = await fetch(`${API_BASE}/wallet-nonce?address=${address}`);
      const challengeData = await nonceRes.json();
      if (!challengeData.success) {
        throw new Error(challengeData.error || 'Failed to generate cryptographic challenge');
      }

      const signature = await provider.request({
        method: 'personal_sign',
        params: [challengeData.message, address]
      });

      const verifyRes = await fetch(`${API_BASE}/wallet-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          nonce: challengeData.nonce
        })
      });

      const authData = await verifyRes.json();
      if (!verifyRes.ok || !authData.success) {
        throw new Error(authData.error || 'Cryptographic signature verification failed.');
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      onLoginSuccess(authData.user, authData.token);
      onClose();
    } catch (err) {
      console.error('Wallet auth error:', err);
      setErrorMessage(err.message || 'Web3 wallet signature cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Auth handler (calls verified endpoint with robust fallbacks)
  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setErrorMessage('Please enter a valid Google email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleEmail.trim().toLowerCase(),
            name: googleName.trim() || googleEmail.split('@')[0],
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
          })
        });
      } catch (err) {
        console.warn('[Google Auth] Primary endpoint error, trying callback route...', err);
      }

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE}/google-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleEmail.trim().toLowerCase(),
            name: googleName.trim() || googleEmail.split('@')[0],
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
          })
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Google authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      console.error('Google auth error:', err);
      setErrorMessage('Google authentication request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepNumber = mode === 'login' ? 1 : step === 'otp' ? 4 : signupSlide;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '860px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          border: '2.5px solid #000000',
          boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.15)' : '6px 6px 0px #000000',
          position: 'relative',
          maxHeight: isMobile ? '95vh' : '92vh',
          background: '#ffffff'
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
            cursor: 'pointer',
            zIndex: 20
          }}
          title="Close modal"
        >
          <X size={18} color="#000000" />
        </button>

        {/* Brand Left Panel (Circle Arc Dark Navy) */}
        <div
          style={{
            width: '34%',
            background: 'linear-gradient(135deg, #1b3158 0%, #2f578c 100%)',
            color: '#ffffff',
            padding: '32px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '2.5px solid #000000'
          }}
          className="desktop-only"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
              <span
                className="font-space"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                Bot<span style={{ color: '#ffcc6f' }}>Bounty</span>
              </span>
            </div>

            <h3 className="font-space" style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '14px' }}>
              The Capital Engine for Web3 Creators
            </h3>

            <p style={{ fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.5, marginBottom: '22px' }}>
              Join the creative &amp; autonomous agent layer on BOT Chain with deterministic payouts and verified proof of work.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldCheck size={16} color="#ffcc6f" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Step-by-step guided onboarding designed for creators &amp; builders.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldCheck size={16} color="#ffcc6f" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Single-use 6-digit OTP codes sent to your genuine Gmail inbox.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldCheck size={16} color="#ffcc6f" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Native $BOT escrow payments direct to your BOT Chain wallet.</span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#ffcc6f',
                border: '1.5px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Lock size={18} color="#000000" strokeWidth={2.4} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Verified Creator Auth</p>
              <p style={{ fontSize: '0.7rem', opacity: 0.85, margin: 0, color: '#acc6e9' }}>BOT Chain Protocol (677 / 968)</p>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? '20px 16px' : '30px 28px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: isMobile ? '95vh' : '92vh'
          }}
        >
          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                background: '#fee2e2',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                color: '#991b1b',
                fontWeight: 700,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#991b1b" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} color="#991b1b" />
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && step === 'otp' && (
            <div
              style={{
                background: '#dcfce7',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                color: '#166534',
                fontWeight: 700,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Check size={16} color="#166534" strokeWidth={3} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Top Switcher (Login vs Sign Up) */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              border: '2px solid #000000',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '18px'
            }}
          >
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => handleSwitchMode('login')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: mode === 'login' ? '2px solid #000000' : '2px solid transparent',
                background: mode === 'login' ? '#ffffff' : 'transparent',
                boxShadow: mode === 'login' ? '2px 2px 0px #000000' : 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: mode === 'login' ? '#000000' : '#64748b',
                transition: 'all 0.1s ease'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              id="auth-tab-signup"
              onClick={() => handleSwitchMode('signup')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: mode === 'signup' ? '2px solid #000000' : '2px solid transparent',
                background: mode === 'signup' ? '#ffffff' : 'transparent',
                boxShadow: mode === 'signup' ? '2px 2px 0px #000000' : 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: mode === 'signup' ? '#000000' : '#64748b',
                transition: 'all 0.1s ease'
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Stepper Indicator for Progressive Signup */}
          {mode === 'signup' && (
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                {[
                  { num: 1, label: 'Identity' },
                  { num: 2, label: 'Specialty' },
                  { num: 3, label: 'Password' },
                  { num: 4, label: 'Verify Email' }
                ].map((s, idx) => {
                  const isCompleted = currentStepNumber > s.num;
                  const isActive = currentStepNumber === s.num;
                  return (
                    <React.Fragment key={s.num}>
                      <div
                        onClick={() => {
                          if (step !== 'otp' && isCompleted) {
                            setSignupSlide(s.num);
                            setErrorMessage('');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: isCompleted ? 'pointer' : 'default'
                        }}
                      >
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: '2px solid #000000',
                            background: isCompleted ? '#10b981' : isActive ? 'var(--arc-blockstream-gold)' : '#ffffff',
                            color: isCompleted ? '#ffffff' : '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            boxShadow: isActive ? '1.5px 1.5px 0px #000000' : 'none'
                          }}
                        >
                          {isCompleted ? <Check size={14} strokeWidth={3} /> : s.num}
                        </div>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: isActive ? 900 : 700,
                            color: isActive ? '#000000' : isCompleted ? '#10b981' : '#94a3b8'
                          }}
                          className="desktop-only"
                        >
                          {s.label}
                        </span>
                      </div>
                      {idx < 3 && (
                        <div
                          style={{
                            flex: 1,
                            height: '2px',
                            background: currentStepNumber > idx + 1 ? '#000000' : '#e2e8f0',
                            margin: '0 4px'
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* LOGIN FLOW                                                */}
          {/* ========================================================= */}
          {mode === 'login' && step === 'input' && (
            <div>
              <div style={{ marginBottom: '18px' }}>
                <h3 className="font-space" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                  Welcome Back
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#4b5563', marginTop: '4px', fontWeight: 500 }}>
                  Enter your credentials to access your bounties and USDC balance.
                </p>
              </div>

              {!loginWithOtp ? (
                <form
                  id="auth-login-form"
                  name="login"
                  data-testid="login-form"
                  onSubmit={handlePasswordLogin}
                  style={{ marginBottom: '16px' }}
                >
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      htmlFor="email"
                      style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px', color: '#1e293b' }}
                    >
                      Email Address or Username
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={17}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        name="email"
                        id="email"
                        autoComplete="username"
                        data-testid="auth-email-input"
                        placeholder="your.email@gmail.com or @handle"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 38px',
                          borderRadius: '8px',
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label
                        htmlFor="password"
                        style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginWithOtp(true);
                          setErrorMessage('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2f578c',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Forgot password? Sign in with email code
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={17}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        id="password"
                        autoComplete="current-password"
                        data-testid="auth-password-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 40px 11px 38px',
                          borderRadius: '8px',
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          background: '#ffffff'
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
                          color: '#64748b'
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="auth-submit-login-btn"
                    name="submit"
                    data-testid="auth-submit-login-btn"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.92rem',
                      justifyContent: 'center',
                      cursor: isLoading ? 'wait' : 'pointer'
                    }}
                  >
                    <span>{isLoading ? 'Verifying Credentials...' : 'Log In to BotBounty'}</span>
                    <ArrowRight size={16} />
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', marginTop: '14px', marginBottom: 0 }}>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      id="auth-switch-to-signup-link"
                      onClick={() => handleSwitchMode('signup')}
                      style={{ background: 'none', border: 'none', color: '#1b3158', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Sign up as creator
                    </button>
                  </p>
                </form>
              ) : (
                /* Fallback OTP Login */
                <form onSubmit={handleSendOtpCode} style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        Email Address for Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginWithOtp(false);
                          setErrorMessage('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2f578c',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Use password instead
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={17}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="email"
                        placeholder="your.email@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 38px',
                          borderRadius: '8px',
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.92rem',
                      justifyContent: 'center',
                      cursor: isLoading ? 'wait' : 'pointer'
                    }}
                  >
                    <span>{isLoading ? 'Dispatching Email...' : 'Send Sign-In Code to Gmail'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PROGRESSIVE SIGNUP SLIDES                                  */}
          {/* ========================================================= */}
          {mode === 'signup' && step === 'input' && (
            <div>
              {/* SLIDE 1: CREATOR IDENTITY (NAME & HANDLE) */}
              {signupSlide === 1 && (
                <form onSubmit={handleSlide1Next} className="slide-step">
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fffae6', border: '1.5px solid #000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                      <User size={13} />
                      <span>STEP 1 OF 3: CREATOR IDENTITY</span>
                    </div>
                    <h3 className="font-space" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                      What should we call you?
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '3px', fontWeight: 500 }}>
                      Set your public display name and creator handle on BOT Chain.
                    </p>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px', color: '#1e293b' }}>
                      Full Name *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={17}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        placeholder="e.g. Satoshi Nakamoto"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 38px',
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

                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px', color: '#1e293b' }}>
                      Creator Handle (@) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <AtSign
                        size={16}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        placeholder="satoshi"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 36px',
                          borderRadius: '8px',
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                      Your unique link: botchain.ai/@{username || 'handle'}
                    </span>
                    {handleStatus.state === 'available' && (
                      <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800, display: 'block', marginTop: '2px' }}>
                        {handleStatus.message}
                      </span>
                    )}
                    {handleStatus.state === 'taken' && (
                      <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 800, display: 'block', marginTop: '2px' }}>
                        {handleStatus.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="auth-signup-slide1-btn"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.92rem',
                      justifyContent: 'center'
                    }}
                  >
                    <span>Continue to Primary Specialty</span>
                    <ArrowRight size={16} />
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', marginTop: '14px', marginBottom: 0 }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      id="auth-switch-to-login-link"
                      onClick={() => handleSwitchMode('login')}
                      style={{ background: 'none', border: 'none', color: '#1b3158', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Log In
                    </button>
                  </p>
                </form>
              )}

              {/* SLIDE 2: PRIMARY SPECIALTY */}
              {signupSlide === 2 && (
                <form onSubmit={handleSlide2Next} className="slide-step">
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '1.5px solid #000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                      <Sparkles size={13} color="#0369a1" />
                      <span>STEP 2 OF 3: PRIMARY SPECIALTY</span>
                    </div>
                    <h3 className="font-space" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                      What is your primary craft?
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '3px', fontWeight: 500 }}>
                      Tailors which bounties and sponsor challenges are surfaced to you first.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {DISCIPLINES.map((item) => {
                      const Icon = item.icon;
                      const isSelected = discipline === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setDiscipline(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '2.5px solid #000000' : '1.5px solid #cbd5e1',
                            background: isSelected ? '#fffae6' : '#ffffff',
                            boxShadow: isSelected ? '3px 3px 0px #000000' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease'
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: isSelected ? 'var(--arc-blockstream-gold)' : '#f1f5f9',
                              border: '1.5px solid #000000',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Icon size={16} color="#000000" strokeWidth={2.4} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {item.desc}
                            </div>
                          </div>
                          {isSelected && <Check size={18} color="#16a34a" strokeWidth={3} />}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSignupSlide(1)}
                      className="btn-secondary"
                      style={{ padding: '12px 18px', borderRadius: '8px', gap: '6px' }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: '0.92rem',
                        justifyContent: 'center'
                      }}
                    >
                      <span>Continue to Security</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {/* SLIDE 3: EMAIL & PASSWORD SECURITY */}
              {signupSlide === 3 && (
                <form onSubmit={handleSignupSubmit} className="slide-step">
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', border: '1.5px solid #000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '6px' }}>
                      <Lock size={13} color="#166534" />
                      <span>STEP 3 OF 3: CREDENTIALS</span>
                    </div>
                    <h3 className="font-space" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                      Set email &amp; password
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '3px', fontWeight: 500 }}>
                      We will dispatch a 6-digit verification code to this Gmail address.
                    </p>
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}>
                      Email Address (Gmail Inbox) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={16}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="email"
                        placeholder="your.email@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '8px',
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password in 2 columns */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}>
                        Password (min 8 chars) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock
                          size={15}
                          color="#64748b"
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          style={{
                            width: '100%',
                            padding: '10px 32px 10px 30px',
                            borderRadius: '8px',
                            border: '2px solid #000000',
                            boxShadow: '2px 2px 0px #000000',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}>
                        Confirm Password *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock
                          size={15}
                          color="#64748b"
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          style={{
                            width: '100%',
                            padding: '10px 32px 10px 30px',
                            borderRadius: '8px',
                            border: '2px solid #000000',
                            boxShadow: '2px 2px 0px #000000',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: 0
                          }}
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password validation indicators */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: password.length >= 8 ? '#166534' : '#64748b' }}>
                      <Check size={12} strokeWidth={3} />
                      <span>At least 8 characters</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: password && password === confirmPassword ? '#166534' : '#64748b' }}>
                      <Check size={12} strokeWidth={3} />
                      <span>Passwords match</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSignupSlide(2)}
                      className="btn-secondary"
                      style={{ padding: '12px 18px', borderRadius: '8px', gap: '6px' }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary"
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: '0.92rem',
                        justifyContent: 'center',
                        cursor: isLoading ? 'wait' : 'pointer'
                      }}
                    >
                      <span>{isLoading ? 'Sending 6-Digit Code...' : 'Create Account & Verify Email'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4 / 'otp': REAL 6-DIGIT EMAIL CODE VERIFICATION       */}
          {/* ========================================================= */}
          {step === 'otp' && (
            <div className="slide-step">
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#ffcc6f',
                      border: '1.5px solid #000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <KeyRound size={16} color="#000000" />
                  </div>
                  <h3 className="font-space" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#000000', margin: 0 }}>
                    Check Your Gmail Inbox
                  </h3>
                </div>
                <p style={{ fontSize: '0.86rem', color: '#4b5563', margin: 0, fontWeight: 500 }}>
                  We dispatched a single-use 6-digit code to <strong style={{ color: '#000000' }}>{email}</strong>.
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      setSignupSlide(3);
                      setErrorMessage('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2f578c',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginLeft: '6px',
                      textDecoration: 'underline'
                    }}
                  >
                    Change
                  </button>
                </p>
              </div>

              {/* Real Email Dispatched Preview Notice */}
              {emailPreviewUrl && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #2f578c',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#1b3158', fontWeight: 700 }}>
                    Real email dispatched via Gmail SMTP.
                  </div>
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: '#2f578c',
                      fontWeight: 800,
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>View Dispatched Email</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* 6 Real OTP Input Boxes */}
              <form onSubmit={handleVerifyOtp}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      style={{
                        width: '46px',
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        fontFamily: 'Space Grotesk, sans-serif',
                        border: digit ? '2.5px solid #000000' : '2px solid #94a3b8',
                        background: digit ? '#fffae6' : '#ffffff',
                        boxShadow: digit ? '2px 2px 0px #000000' : 'none',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.12s ease'
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.92rem',
                    justifyContent: 'center',
                    opacity: otp.join('').length === 6 ? 1 : 0.6,
                    cursor: otp.join('').length === 6 && !isLoading ? 'pointer' : 'not-allowed'
                  }}
                >
                  <span>{isLoading ? 'Activating Account...' : 'Verify Code & Launch Account'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Resend Code Section */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Didn't receive email? Check spam or</span>
                {resendCooldown > 0 ? (
                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={mode === 'signup' ? handleSignupSubmit : handleSendOtpCode}
                    disabled={isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1b3158',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    <RotateCw size={12} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ALTERNATIVE LOGIN / SIGN IN WITH WALLET OR GOOGLE        */}
          {/* ========================================================= */}
          {step === 'input' && (mode === 'login' || signupSlide === 1) && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '16px 0 12px 0',
                  color: '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span>OR {mode === 'signup' ? 'REGISTER' : 'CONTINUE'} WITH</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCryptographicWalletAuth}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#acc6e9',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#1b3158',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Wallet size={15} />
                  <span>Connect Web3 Wallet (EIP-4361 SIWE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    if (email && email.includes('@')) {
                      setGoogleEmail(email.trim());
                    }
                    setStep('google_auth');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )}

          {/* GOOGLE AUTHENTICATION SCREEN */}
          {step === 'google_auth' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>
                  Sign in with Google
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                  Enter your Google Account to authenticate on BotBounty
                </p>
              </div>

              <form onSubmit={handleGoogleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                      Google Email
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem', justifyContent: 'center' }}
                >
                  <span>{isLoading ? 'Authenticating...' : 'Continue with Google Account'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setErrorMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2f578c',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Back to standard sign in options
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
