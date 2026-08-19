import React, { useState } from 'react';
import { X, Lock, Globe, Copy, Check, Share2, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';

export function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Room name must be at least 2 characters.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.rooms.create({ name: trimmedName, isPrivate });
      if (data.success && data.room) {
        setCreatedRoom(data.room);
        onRoomCreated(data.room);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdRoom) return;
    const inviteUrl = `${window.location.origin}/join/${createdRoom.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setName('');
    setIsPrivate(false);
    setCreatedRoom(null);
    setError('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {createdRoom ? '🎉 Channel Created!' : 'Create Chat Channel'}
          </h3>
          <button className="icon-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {createdRoom ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
              #{createdRoom.name}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Your channel is ready! Copy and share the direct invite link with your friends:
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                className="form-input"
                readOnly
                value={`${window.location.origin}/join/${createdRoom.id}`}
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleCopy}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button type="button" className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleClose}>
              Go to Channel <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="auth-error-banner">{error}</div>}

              <div className="form-group">
                <label className="form-label">Channel Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. backend-devs, gaming, project-chato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={30}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Letters, numbers, and hyphens only (2-30 chars).
                </span>
              </div>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                  <span>Make room private (only accessible via direct invite link)</span>
                </div>
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
