import React from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ArcBounty ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleHardReset = () => {
    try {
      sessionStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '20px',
          fontFamily: "'Geist', system-ui, sans-serif"
        }}>
          <div style={{
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            padding: '32px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              border: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} color="#dc2626" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              Something went wrong
            </h2>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              BotBounty encountered an unexpected error while rendering. We've captured the error diagnostics.
            </p>

            {this.state.error?.message && (
              <div style={{
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#475569',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                textAlign: 'left',
                marginBottom: '24px'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#1b3158',
                  color: '#ffffff',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RotateCw size={15} />
                <span>Reload BotBounty</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Home size={15} />
                <span>Reset &amp; Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
