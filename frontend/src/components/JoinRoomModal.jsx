import React, { useState, useEffect } from 'react';
import { X, Search, Hash, Users, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';

export function JoinRoomModal({ isOpen, onClose, onRoomJoined, currentRoomId }) {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function loadPublicRooms() {
      try {
        setLoading(true);
        setError('');
        const data = await api.rooms.getAll(searchTerm);
        if (data.success) {
          setRooms(data.rooms || []);
        }
      } catch (err) {
        setError('Failed to load public rooms.');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadPublicRooms, 200);
    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  if (!isOpen) return null;

  const handleJoin = async (room) => {
    try {
      setJoiningId(room.id);
      await api.rooms.join(room.id);
      onRoomJoined(room);
      onClose();
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to join room.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Explore & Join Rooms</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="auth-error-banner">{error}</div>}

          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search rooms by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading rooms...
              </div>
            ) : rooms.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No rooms found matching your search.
              </div>
            ) : (
              rooms.map((room) => {
                const isCurrent = room.id === currentRoomId;
                return (
                  <div
                    key={room.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: isCurrent ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Hash size={18} color="var(--accent-primary)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{room.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Users size={12} />
                          <span>{room.memberCount} members</span>
                          <span>•</span>
                          <span>{room.isPrivate ? 'Private' : 'Public'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleJoin(room)}
                      disabled={joiningId === room.id}
                    >
                      {joiningId === room.id ? (
                        'Joining...'
                      ) : isCurrent ? (
                        'Active'
                      ) : room.isMember ? (
                        'Open'
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Join <ArrowRight size={14} />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
