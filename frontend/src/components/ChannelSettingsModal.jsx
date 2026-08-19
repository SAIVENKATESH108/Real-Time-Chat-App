import React, { useState, useEffect } from 'react';
import { X, Hash, Lock, Shield, UserX, Trash2, Plus, Check, AlertTriangle, Users, GitBranch } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function ChannelSettingsModal({ isOpen, roomId, onClose, onChannelUpdated, onChannelDeleted }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Subchannel form states
  const [subchannelName, setSubchannelName] = useState('');
  const [subchannelTopic, setSubchannelTopic] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomId) return;

    async function loadRoomDetails() {
      try {
        setLoading(true);
        setError('');
        const data = await api.rooms.getById(roomId);
        if (data.success && data.room) {
          setRoom(data.room);
          setName(data.room.name || '');
          setTopic(data.room.topic || '');
          setIsPrivate(Boolean(data.room.isPrivate));
        }
      } catch (err) {
        setError('Failed to load channel details.');
      } finally {
        setLoading(false);
      }
    }

    loadRoomDetails();
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const isAdmin = room?.role === 'admin' || room?.createdBy === user?.id;

  const handleUpdateOverview = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await api.rooms.update(roomId, {
        name,
        topic,
        isPrivate,
      });

      if (res.success && res.room) {
        setSuccess('Channel settings updated successfully.');
        if (onChannelUpdated) onChannelUpdated(res.room);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to update channel.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubchannel = async (e) => {
    e.preventDefault();
    if (!subchannelName.trim()) return;

    try {
      setCreatingSub(true);
      setError('');
      const res = await api.rooms.createSubchannel(roomId, {
        name: subchannelName.trim(),
        topic: subchannelTopic.trim(),
      });

      if (res.success && res.room) {
        setRoom((prev) => ({
          ...prev,
          subChannels: [...(prev.subChannels || []), res.room],
        }));
        setSubchannelName('');
        setSubchannelTopic('');
        setSuccess(`Sub-channel #${res.room.name} created!`);
        if (onChannelUpdated) onChannelUpdated(room);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to create sub-channel.');
    } finally {
      setCreatingSub(false);
    }
  };

  const handleKickMember = async (targetUserId, targetName) => {
    if (!window.confirm(`Are you sure you want to remove ${targetName} from #${room.name}?`)) {
      return;
    }

    try {
      setError('');
      await api.rooms.kickMember(roomId, targetUserId);
      setRoom((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== targetUserId),
        memberCount: Math.max((prev.memberCount || 1) - 1, 1),
      }));
      setSuccess(`Removed ${targetName} from the channel.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to remove member.');
    }
  };

  const handleToggleRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      setError('');
      await api.rooms.updateMemberRole(roomId, targetUserId, newRole);
      setRoom((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m)),
      }));
      setSuccess(`Updated member role to ${newRole}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to update member role.');
    }
  };

  const handleDeleteChannel = async () => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to permanently delete #${room.name}? All messages will be erased.`)) {
      return;
    }

    try {
      setSaving(true);
      await api.rooms.delete(roomId);
      if (onChannelDeleted) onChannelDeleted(roomId);
      onClose();
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to delete channel.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={20} color="var(--accent-primary)" />
            <h3 className="modal-title">Channel Settings • #{room?.name || 'Channel'}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Layout */}
        <div className="settings-layout">
          <div className="settings-nav">
            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Hash size={16} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'subchannels' ? 'active' : ''}`}
              onClick={() => setActiveTab('subchannels')}
            >
              <GitBranch size={16} />
              <span>Sub-Channels</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={16} />
              <span>Members ({room?.members?.length || 0})</span>
            </button>
          </div>

          <div className="settings-content">
            {error && <div className="auth-error-banner" style={{ marginBottom: '12px' }}>{error}</div>}
            {success && (
              <div className="alert-box info" style={{ color: 'var(--status-online)', background: 'rgba(49, 162, 76, 0.12)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                ✅ {success}
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <form onSubmit={handleUpdateOverview} className="settings-section">
                <h4 className="settings-section-title">Channel Overview</h4>

                <div className="form-group">
                  <label className="form-label">Channel Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin}
                    required
                    minLength={2}
                    maxLength={30}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Channel Topic / Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Daily engineering standup & tech discussions"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={!isAdmin}
                    maxLength={150}
                  />
                </div>

                <label className="form-checkbox" style={{ marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    disabled={!isAdmin}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isPrivate ? <Lock size={16} /> : <Hash size={16} />}
                    <span>Make Private (Accessible via invite link only)</span>
                  </div>
                </label>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {room?.name !== 'general' && (
                      <button
                        type="button"
                        className="btn-secondary danger"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleDeleteChannel}
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                        Delete Channel
                      </button>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: SUB-CHANNELS */}
            {activeTab === 'subchannels' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Sub-Channels Hierarchy</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Sub-channels are nested categories under #{room?.name} to organize topics, announcements, and side discussions.
                </p>

                {/* Sub-channel creation form */}
                {isAdmin && (
                  <form onSubmit={handleCreateSubchannel} style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      Create Nested Sub-Channel
                    </span>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Sub-channel name (e.g. dev-chat, updates)"
                        value={subchannelName}
                        onChange={(e) => setSubchannelName(e.target.value)}
                        required
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn-primary" disabled={creatingSub} style={{ whiteSpace: 'nowrap', padding: '8px 14px' }}>
                        <Plus size={16} /> Create
                      </button>
                    </div>
                  </form>
                )}

                {/* List of sub-channels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(!room?.subChannels || room.subChannels.length === 0) ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No sub-channels created yet.
                    </div>
                  ) : (
                    room.subChannels.map((sub) => (
                      <div
                        key={sub.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <GitBranch size={16} color="var(--accent-primary)" />
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{sub.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sub-Channel</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEMBERS & MODERATION */}
            {activeTab === 'members' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Channel Members ({room?.members?.length || 0})</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {room?.members?.map((m) => {
                    const isSelf = m.userId === user?.id;
                    const isRoomOwner = m.userId === room?.createdBy;

                    return (
                      <div
                        key={m.userId}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="sidebar-user-avatar-wrap" style={{ width: '32px', height: '32px' }}>
                            {m.avatarImage ? (
                              <img src={m.avatarImage} alt={m.displayName} className="sidebar-user-avatar-img" />
                            ) : (
                              <div className="sidebar-user-avatar" style={{ fontSize: '0.8rem' }}>
                                {m.avatarUrl || m.displayName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.displayName}</span>
                              {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(You)</span>}
                              {isRoomOwner ? (
                                <span className="brand-badge" style={{ fontSize: '0.6rem', padding: '1px 6px', background: '#f59e0b' }}>Owner</span>
                              ) : m.role === 'admin' ? (
                                <span className="brand-badge" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Admin</span>
                              ) : null}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</span>
                          </div>
                        </div>

                        {isAdmin && !isRoomOwner && !isSelf && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleToggleRole(m.userId, m.role)}
                              title={m.role === 'admin' ? 'Demote to Member' : 'Promote to Channel Admin'}
                            >
                              {m.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              style={{ width: '30px', height: '30px' }}
                              onClick={() => handleKickMember(m.userId, m.displayName)}
                              title="Kick user from channel"
                            >
                              <UserX size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
