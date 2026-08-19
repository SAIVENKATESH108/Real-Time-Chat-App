import React, { useState, useRef } from 'react';
import { X, User, Palette, Volume2, ShieldCheck, Bell, Upload, Camera, Trash2, Check, Sparkles, Moon, Sun, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { api } from '../services/api.js';
import { soundEffects } from '../utils/soundEffects.js';
import { notifications } from '../utils/notifications.js';

const STATUS_PRESETS = [
  '⚡ Available',
  '🚀 Coding hard',
  '🎧 Jamming to tunes',
  '☕ Coffee break',
  '🔕 Do Not Disturb',
  '🔥 In the flow',
];

const PRESENCE_OPTIONS = [
  { id: 'online', name: 'Online', desc: 'Active & available', color: 'var(--status-online)' },
  { id: 'idle', name: 'Away / Idle', desc: 'Temporarily stepped away', color: 'var(--status-warning)' },
  { id: 'dnd', name: 'Do Not Disturb', desc: 'Mutes audio cues', color: 'var(--status-error)' },
  { id: 'offline', name: 'Invisible', desc: 'Appear offline to others', color: 'var(--status-offline)' },
];

const WALLPAPERS = [
  { id: 'cyber', name: 'Cyber Midnight', desc: 'Sleek dark gradient with glowing indigo accents' },
  { id: 'sunset', name: 'Sunset Aurora', desc: 'Warm violet & sunset pink ambient glow' },
  { id: 'deepspace', name: 'Deep Space', desc: 'Cosmic navy blue with subtle nebula dust' },
  { id: 'emerald', name: 'Emerald Forest', desc: 'Dark emerald green and mint highlights' },
  { id: 'grid', name: 'Geometric Grid', desc: 'Modern technical blueprint mesh pattern' },
  { id: 'minimal', name: 'Clean Slate', desc: 'Pure minimalist solid card background' },
];

const AVATAR_PRESETS = [
  '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐯', '🦄', '🤖', '👾', '🚀', '⭐', '⚡', '🔥', '💎', '👑'
];

export function SettingsModal({ isOpen, onClose }) {
  const { user, deleteAccount } = useAuth();
  const { socket } = useSocket();
  const { theme, toggleTheme, setTheme, wallpaper, setWallpaper, soundEnabled, toggleSound } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '⚡ Available');
  const [presenceStatus, setPresenceStatus] = useState(user?.presenceStatus || 'online');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [avatarImage, setAvatarImage] = useState(user?.avatarImage || null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [notifPermission, setNotifPermission] = useState(notifications.getPermission());

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setAvatarImage(loadEvent.target?.result);
      setSelectedAvatar('');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarImage(null);
    setSelectedAvatar('⚡');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const payload = {
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        avatarUrl: selectedAvatar,
        avatarImage: avatarImage,
        presenceStatus,
        customWallpaper: wallpaper,
        themePreference: theme,
      };

      const res = await api.auth.updateProfile(payload);
      if (res.success) {
        setSaveSuccess(true);
        if (socket) {
          socket.emit('status_update', {
            presenceStatus,
            statusMessage: statusMessage.trim(),
          });
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    const granted = await notifications.requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      notifications.send('chatO Notifications Active', {
        body: 'You will now receive instant desktop alerts for new messages!',
      });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ PERMANENT ACCOUNT DELETION\n\nAre you absolutely sure you want to permanently delete your account?\n\n• All your messages, attachments, voice notes, and profile data will be permanently wiped from the database.\n• This action is irreversible.'
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError('');
      await deleteAccount();
      onClose();
      window.location.href = '/signup';
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Settings Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h3 className="modal-title">Settings & Customization</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Settings Layout: Sidebar Tabs + Content */}
        <div className="settings-layout">
          <div className="settings-nav">
            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              <span>Profile & Photo</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={16} />
              <span>Appearance</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <ShieldCheck size={16} />
              <span>Security & Privacy</span>
            </button>
          </div>

          <div className="settings-content">
            {/* TAB 1: PROFILE & PHOTO UPLOAD */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="settings-section">
                <h4 className="settings-section-title">Profile Picture & Presence</h4>
                {error && <div className="auth-error-banner" style={{ marginBottom: '12px' }}>{error}</div>}
                {saveSuccess && (
                  <div className="alert-box info" style={{ color: 'var(--status-online)', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    ✅ Profile updated successfully!
                  </div>
                )}

                {/* Profile Photo Upload Section */}
                <div className="profile-photo-uploader" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                  <div className="photo-preview-wrapper" style={{ position: 'relative', width: '70px', height: '70px' }}>
                    {avatarImage ? (
                      <img src={avatarImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : selectedAvatar ? (
                      <div className="sidebar-user-avatar" style={{ width: '100%', height: '100%', fontSize: '1.8rem' }}>{selectedAvatar}</div>
                    ) : (
                      <div className="sidebar-user-avatar" style={{ width: '100%', height: '100%', fontSize: '1.4rem' }}>
                        {displayName.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  <div className="photo-upload-actions" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageFileChange}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      Upload Photo
                    </button>
                    {avatarImage && (
                      <button
                        type="button"
                        className="btn-secondary danger"
                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleRemovePhoto}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Display Name / Handle</label>
                  <input
                    type="text"
                    className="form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>

                {/* Presence Status Selector */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Online Presence Status</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {PRESENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`status-option-card ${presenceStatus === opt.id ? 'active' : ''}`}
                        onClick={() => setPresenceStatus(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          background: presenceStatus === opt.id ? 'rgba(0, 132, 255, 0.15)' : 'var(--bg-surface)',
                          border: presenceStatus === opt.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Status Message */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Custom Status</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="What's on your mind?"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    maxLength={100}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {STATUS_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="status-preset-btn"
                        onClick={() => setStatusMessage(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '14px' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile & Status'}
                </button>
              </form>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Theme Mode</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={20} color="var(--accent-primary)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>OLED Pitch Black</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Pure #000000 deep dark mode</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={20} color="#f59e0b" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Clean Light</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Bright, high clarity layout</div>
                    </div>
                  </button>
                </div>

                <h4 className="settings-section-title">Chat Wallpaper Presets</h4>
                <div className="wallpaper-grid">
                  {WALLPAPERS.map((wp) => (
                    <div
                      key={wp.id}
                      className={`wallpaper-card ${wallpaper === wp.id ? 'active' : ''}`}
                      onClick={() => setWallpaper(wp.id)}
                    >
                      <div className={`wallpaper-preview-box wp-${wp.id}`} />
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{wp.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{wp.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Desktop & Mobile Notifications</h4>

                <div className="security-status-card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Browser Push Alerts</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Status: <strong style={{ color: notifPermission === 'granted' ? 'var(--status-online)' : 'var(--status-warning)' }}>{notifPermission}</strong>
                      </div>
                    </div>
                    {notifPermission !== 'granted' && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={handleEnablePushNotifications}
                      >
                        Enable Alerts
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="settings-section-title" style={{ marginTop: '20px' }}>Audio Cues (Web Audio API)</h4>
                <label className="form-checkbox" style={{ justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Sound Effects</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plays audio cues when sending, receiving messages and during calls</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={toggleSound}
                    style={{ width: '18px', height: '18px' }}
                  />
                </label>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={() => soundEffects.playSentSound()}>
                    🔊 Test Sent Pop
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => soundEffects.playReceivedSound()}>
                    🔔 Test Incoming Chime
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY & DANGER ZONE */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Security & Privacy Protocol</h4>
                {error && <div className="auth-error-banner" style={{ marginBottom: '12px' }}>{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div className="security-status-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="var(--status-online)" />
                      <span style={{ fontWeight: 600 }}>httpOnly Cookie Session Security</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Your authentication token is stored exclusively in secure, httpOnly cookies protected against Cross-Site Scripting (XSS).
                    </p>
                  </div>

                  <div className="security-status-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="var(--status-online)" />
                      <span style={{ fontWeight: 600 }}>Sanitized Message Streams</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      All text, images, and audio attachments are cleansed before persisting to PostgreSQL.
                    </p>
                  </div>
                </div>

                {/* DANGER ZONE: ACCOUNT DELETION */}
                <h4 className="settings-section-title" style={{ color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} />
                  Danger Zone
                </h4>

                <div style={{ background: 'rgba(250, 56, 62, 0.08)', border: '1px solid rgba(250, 56, 62, 0.25)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ff8589', marginBottom: '4px' }}>
                    Permanently Delete Account & Wipe All Data
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Once deleted, all your sent messages, attachments, direct conversations, memberships, and profile records will be immediately and irreversibly wiped from the database.
                  </p>

                  <button
                    type="button"
                    className="btn-secondary danger"
                    style={{
                      background: 'rgba(250, 56, 62, 0.15)',
                      borderColor: 'var(--status-error)',
                      color: '#ff8589',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                    }}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    <Trash2 size={16} />
                    {deleting ? 'Wiping All Account Data...' : 'Delete Account Permanently'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
