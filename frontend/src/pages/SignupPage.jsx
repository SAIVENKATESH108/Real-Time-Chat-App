import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MessageSquare, Lock, Mail, User, ArrowRight } from 'lucide-react';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const joinParam = searchParams.get('join');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;

    setSubmitting(true);
    const result = await signup(email, password, displayName);
    setSubmitting(false);

    if (result?.success) {
      if (joinParam) {
        navigate(`/join/${encodeURIComponent(joinParam)}`);
      } else {
        navigate('/chat');
      }
    }
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
            {joinParam ? 'Create an account to join the channel' : 'Create an account to start chatting'}
          </p>
        </div>

        {authError && <div className="auth-error-banner" style={{ marginBottom: '16px' }}>{authError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <div className="search-box">
              <User size={16} color="var(--text-muted)" />
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Alice Cooper"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
              />
            </div>
          </div>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Create Account <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to={`/login${joinParam ? `?join=${encodeURIComponent(joinParam)}` : ''}`} style={{ fontWeight: 600 }}>
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
