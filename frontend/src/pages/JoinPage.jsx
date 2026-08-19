import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { MessageSquare, Hash, ArrowRight } from 'lucide-react';

export function JoinPage() {
  const { roomId } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [joining, setJoining] = useState(true);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Preserve destination for post-login redirect
      navigate(`/login?join=${encodeURIComponent(roomId)}`);
      return;
    }

    async function joinRoomDirectly() {
      try {
        setJoining(true);
        setError('');

        // Attempt joining the room
        const joinRes = await api.rooms.join(roomId);
        if (joinRes.success) {
          navigate(`/chat?room=${encodeURIComponent(joinRes.roomId || roomId)}`);
        } else {
          setError(joinRes.error || 'Failed to join room.');
        }
      } catch (err) {
        setError(err.data?.error || err.message || 'Unable to join room. The link may be invalid or expired.');
      } finally {
        setJoining(false);
      }
    }

    joinRoomDirectly();
  }, [roomId, isAuthenticated, authLoading, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <MessageSquare size={36} color="var(--accent-primary)" />
          <span>chat<span style={{ color: 'var(--accent-primary)' }}>O</span></span>
        </div>

        {joining ? (
          <div style={{ padding: '30px 0' }}>
            <div className="typing-dots" style={{ justifyContent: 'center', marginBottom: '16px' }}>
              <span className="typing-dot" style={{ width: '8px', height: '8px' }} />
              <span className="typing-dot" style={{ width: '8px', height: '8px' }} />
              <span className="typing-dot" style={{ width: '8px', height: '8px' }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Joining channel...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Connecting you to the conversation
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px 0' }}>
            <div className="auth-error-banner" style={{ marginBottom: '16px' }}>
              {error}
            </div>
            <button className="btn-primary" onClick={() => navigate('/chat')}>
              Go to Channels
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
