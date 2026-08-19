import React, { useState, useRef } from 'react';
import { X, User, Palette, Volume2, ShieldCheck, Bell, Upload, Camera, Trash2, Check, Sparkles, Moon, Sun } from 'lucide-react';
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
  const { user } = useAuth();
  const { socket } = useSocket();
  const { theme, toggleTheme, setTheme, wallpaper, setWallpaper, soundEnabled, toggleSound } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '⚡ Available');
  const [presenceStatus, setPresenceStatus] = useState(user?.presenceStatus || 'online');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [avatarImage, setAvatarImage] = useState(user?.avatarImage || null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [notifPermission, setNotifPermission] = useState(notifications.getPermission());

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select a photo under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarImage(event.target.result);
      setSelectedAvatar('');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEnablePushNotifications = async () => {
    const perm = await notifications.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      notifications.show({
        title: 'chatO Notifications Enabled',
        body: 'You will receive real-time alerts when messages arrive.',
      });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSaveSuccess(false);

    try {
      setSaving(true);
      const res = await api.auth.updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        avatarUrl: selectedAvatar,
        avatarImage,
        presenceStatus,
        themePreference: theme,
        customWallpaper: wallpaper,
      });

      if (user) {
        user.displayName = displayName.trim();
        user.statusMessage = statusMessage.trim();
        user.avatarUrl = selectedAvatar;
        user.avatarImage = avatarImage;
        user.presenceStatus = presenceStatus;
      }

      if (socket) {
        socket.emit('status_update', {
          presenceStatus,
          statusMessage: statusMessage.trim(),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h3 className="modal-title">Settings & Profile</h3>
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
              <span>Security</span>
            </button>
          </div>

          <div className="settings-content">
            {/* TAB 1: PROFILE & PHOTO UPLOAD */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="settings-section">
                <h4 className="settings-section-title">Profile Picture & Presence</h4>
                {error && <div className="auth-error-banner">{error}</div>}
                {saveSuccess && (
                  <div className="alert-box info" style={{ color: 'var(--status-online)', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    ✅ Profile updated successfully!
                  </div>
                )}

                {/* Profile Photo Upload Section */}
                <div className="profile-photo-uploader">
                  <div className="photo-preview-wrapper">
                    {avatarImage ? (
                      <img src={avatarImage} alt="Profile" className="photo-preview-img" />
                    ) : selectedAvatar ? (
                      <div className="photo-emoji-preview">{selectedAvatar}</div>
                    ) : (
                      <div className="photo-placeholder-preview">
                        {displayName.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                    <button
                      type="button"
                      className="photo-camera-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload profile photo"
                    >
                      <Camera size={16} />
                    </button>
                  </div>

                  <div className="photo-upload-actions">
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

                {/* Presence Status */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Online Presence Status</label>
                  <div className="presence-options-grid">
                    {PRESENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`presence-option-btn ${presenceStatus === opt.id ? 'active' : ''}`}
                        onClick={() => setPresenceStatus(opt.id)}
                      >
                        <span className="presence-dot" style={{ backgroundColor: opt.color }} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{opt.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Display Name</label>
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

                <div className="form-group">
                  <label className="form-label">Custom Status Message</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 🚀 Building awesome things"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    maxLength={100}
                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
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

                <div className="form-group">
                  <label className="form-label">Or Pick an Avatar Emoji Icon</label>
                  <div className="avatar-preset-grid">
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        className={`avatar-preset-item ${selectedAvatar === av && !avatarImage ? 'selected' : ''}`}
                        onClick={() => {
                          setAvatarImage(null);
                          setSelectedAvatar(selectedAvatar === av ? '' : av);
                        }}
                      >
                        <span>{av}</span>
                        {selectedAvatar === av && !avatarImage && (
                          <div className="avatar-check-badge"><Check size={10} /></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '16px' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Color Mode & Theme</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={22} color="var(--accent-primary)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Dark Theme</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sleek, low-eye strain dark mode</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={22} color="#f59e0b" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Light Theme</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crisp and high-clarity daylight theme</div>
                    </div>
                  </button>
                </div>

                <h4 className="settings-section-title" style={{ marginTop: '24px' }}>Chat Wallpaper Preset</h4>
                <div className="wallpaper-grid">
                  {WALLPAPERS.map((wp) => (
                    <div
                      key={wp.id}
                      className={`wallpaper-card ${wallpaper === wp.id ? 'active' : ''}`}
                      onClick={() => setWallpaper(wp.id)}
                    >
                      <div className={`wallpaper-preview-box wp-${wp.id}`} />
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{wp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wp.desc}</div>
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

            {/* TAB 4: SECURITY */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h4 className="settings-section-title">Security & Protocol Status</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
