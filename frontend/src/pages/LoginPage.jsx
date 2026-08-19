import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MessageSquare, Lock, Mail, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const joinParam = searchParams.get('join');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result?.success) {
      if (joinParam) {
        navigate(`/join/${encodeURIComponent(joinParam)}`);
      } else {
        navigate('/chat');
      }
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setAuthError(null);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <MessageSquare size={32} style={{ color: 'var(--accent-primary)' }} />
            <span>chat<span style={{ color: 'var(--accent-primary)' }}>O</span></span>
          </div>
          <p className="auth-subtitle">
            {joinParam ? 'Log in to join the invited channel' : 'Log in to join real-time chat rooms'}
          </p>
        </div>

        {authError && <div className="auth-error-banner" style={{ marginBottom: '16px' }}>{authError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="search-box">
              <Mail size={16} color="var(--text-muted)" />
              <input
                type="email"
                className="search-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="search-box">
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                className="search-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={submitting}
          >
            {submitting ? 'Logging in...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Log In <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            🧪 Quick Demo Accounts:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}
              onClick={() => handleDemoFill('alice@demo.com', 'alice@demo.com')}
            >
              Fill Alice
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}
              onClick={() => handleDemoFill('bob@demo.com', 'bob@demo.com')}
            >
              Fill Bob
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to={`/signup${joinParam ? `?join=${encodeURIComponent(joinParam)}` : ''}`} style={{ fontWeight: 600 }}>
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
