import React from 'react';
import { X, Crown, Shield } from 'lucide-react';

export function MemberList({ onlineUsers, allMembers, onClose }) {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getPresenceColor = (status) => {
    switch (status) {
      case 'idle': return 'var(--status-warning)';
      case 'dnd': return 'var(--status-error)';
      case 'offline': return 'var(--status-offline)';
      default: return 'var(--status-online)';
    }
  };

  const onlineUserIds = new Set(onlineUsers.map((u) => u.id));

  const sortedMembers = [...allMembers].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.id);
    const bOnline = onlineUserIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <aside className="member-sidebar">
      <div className="member-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Channel Members ({allMembers.length})</span>
        <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="member-items">
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '4px 8px' }}>
          ONLINE — {onlineUsers.length}
        </div>

        {sortedMembers.map((member) => {
          const isOnline = onlineUserIds.has(member.id);
          const onlineInfo = onlineUsers.find((u) => u.id === member.id);
          const presenceStatus = onlineInfo?.presenceStatus || member.presenceStatus || (isOnline ? 'online' : 'offline');

          return (
            <div
              key={member.id}
              className="member-card"
              title={`${member.displayName}${member.statusMessage ? ` • ${member.statusMessage}` : ''}`}
            >
              <div className="member-avatar-wrapper">
                {member.avatarImage ? (
                  <img src={member.avatarImage} alt={member.displayName} className="member-avatar-img" />
                ) : member.avatarUrl ? (
                  <div className="member-avatar">{member.avatarUrl}</div>
                ) : (
                  <div className="member-avatar">{getInitials(member.displayName)}</div>
                )}
                <span
                  className="member-status-indicator"
                  style={{
                    backgroundColor: isOnline ? getPresenceColor(presenceStatus) : 'var(--status-offline)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className="member-name">{member.displayName}</span>
                {member.statusMessage && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.statusMessage}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
