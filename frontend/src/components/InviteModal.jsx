import React, { useState } from 'react';
import { X, Copy, Check, Share2, Hash, Lock, Users } from 'lucide-react';

export function InviteModal({ isOpen, room, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !room) return null;

  const inviteUrl = `${window.location.origin}/join/${room.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Invite Friends</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
            {room.isPrivate ? <Lock size={20} color="var(--accent-primary)" /> : <Hash size={22} color="var(--accent-primary)" />}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>#{room.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {room.isPrivate ? 'Private Channel' : 'Public Channel'} • {room.memberCount || 1} members
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Shareable Channel Link</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                readOnly
                value={inviteUrl}
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
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Send this link to friends so they can join and chat with you in #{room.name} instantly.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
