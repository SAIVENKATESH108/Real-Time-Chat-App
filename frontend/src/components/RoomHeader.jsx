import React, { useState } from 'react';
import { Hash, Lock, Users, Video, Phone, Search, UserPlus, ArrowLeft, Settings, GitBranch, MessageSquare } from 'lucide-react';
import { InviteModal } from './InviteModal.jsx';
import { ChannelSettingsModal } from './ChannelSettingsModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function RoomHeader({
  room,
  onlineCount,
  isMembersOpen,
  onToggleMembers,
  onStartCall,
  onToggleSearch,
  isSearchOpen,
  onMobileBack,
  onChannelUpdated,
  onChannelDeleted,
}) {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!room) return null;

  const isAdmin = room.role === 'admin' || room.createdBy === user?.id;
  const isDM = room.type === 'dm';
  const isSubchannel = room.type === 'subchannel';

  return (
    <>
      <header className="chat-header">
        <div className="room-info">
          {/* Mobile Back Button */}
          {onMobileBack && (
            <button
              className="icon-btn mobile-back-btn"
              onClick={onMobileBack}
              title="Back to Channels"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="room-info-name">
            {isDM ? (
              <div className="sidebar-user-avatar-wrap" style={{ width: '28px', height: '28px' }}>
                {room.targetUser?.avatarImage ? (
                  <img src={room.targetUser.avatarImage} alt="User" className="sidebar-user-avatar-img" />
                ) : (
                  <div className="sidebar-user-avatar" style={{ fontSize: '0.75rem' }}>
                    {room.targetUser?.avatarUrl || room.name.substring(1, 3).toUpperCase()}
                  </div>
                )}
              </div>
            ) : isSubchannel ? (
              <GitBranch size={18} color="var(--accent-primary)" />
            ) : room.isPrivate ? (
              <Lock size={18} color="var(--accent-primary)" />
            ) : (
              <Hash size={20} color="var(--accent-primary)" />
            )}
            <span>{room.name}</span>
          </div>

          <div className="room-info-meta">
            <span className="online-dot" />
            <span>{onlineCount} {onlineCount === 1 ? 'online' : 'online'}</span>
            {room.topic && <span style={{ color: 'var(--text-muted)' }}>• {room.topic}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Invite Friends */}
          {!isDM && (
            <button
              className="icon-btn"
              title="Invite Friends / Share Link"
              onClick={() => setIsInviteOpen(true)}
            >
              <UserPlus size={16} color="var(--accent-primary)" />
            </button>
          )}

          {/* Search Button */}
          <button
            className={`icon-btn ${isSearchOpen ? 'active' : ''}`}
            title="Search in this conversation"
            onClick={onToggleSearch}
          >
            <Search size={16} />
          </button>

          {/* Voice Call */}
          <button
            className="icon-btn"
            title="Start Voice Call"
            onClick={() => onStartCall('audio')}
          >
            <Phone size={16} color="var(--status-online)" />
          </button>

          {/* Video Call */}
          <button
            className="icon-btn"
            title="Start Video Call"
            onClick={() => onStartCall('video')}
          >
            <Video size={17} color="var(--accent-primary)" />
          </button>

          {/* Channel Settings (Admin only) */}
          {!isDM && isAdmin && (
            <button
              className="icon-btn"
              title="Channel Settings & Moderation"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings size={16} />
            </button>
          )}

          {/* Member List Toggle */}
          {!isDM && (
            <button
              className={`icon-btn ${isMembersOpen ? 'active' : ''}`}
              title="Toggle Member List"
              onClick={onToggleMembers}
            >
              <Users size={17} />
            </button>
          )}
        </div>
      </header>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        room={room}
        onClose={() => setIsInviteOpen(false)}
      />

      {/* Channel Settings Modal */}
      <ChannelSettingsModal
        isOpen={isSettingsOpen}
        roomId={room.id}
        onClose={() => setIsSettingsOpen(false)}
        onChannelUpdated={onChannelUpdated}
        onChannelDeleted={onChannelDeleted}
      />
    </>
  );
}
