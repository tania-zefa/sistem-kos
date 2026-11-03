import { Component, StrictMode } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: '#dc2626', margin: '0 0 8px' }}>⚠️ Terjadi Kesalahan</h2>
            <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '14px' }}>Sistem mengalami error. Buka Console browser (F12) untuk detail.</p>
            <pre style={{ background: '#fff1f2', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#9f1239', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {err.message}
            </pre>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: '16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px' }}>
              🔄 Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
