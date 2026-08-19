import React, { useState, useEffect, useRef } from 'react';
import { Plus, Compass, Hash, Lock, Search, LogOut, Settings, MessageSquare, ChevronDown, ChevronRight, GitBranch, UserPlus, User, Send, X, Bookmark } from 'lucide-react';
import { CreateRoomModal } from './CreateRoomModal.jsx';
import { JoinRoomModal } from './JoinRoomModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function RoomSidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  onRoomCreated,
  onRoomJoined,
  onOpenSettings,
  onlineUsers = [],
}) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});

  const searchContainerRef = useRef(null);

  // Trigger search for users when search is non-empty
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setUserSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const data = await api.users.search(trimmed);
        if (data.success && Array.isArray(data.users)) {
          setUserSearchResults(data.users);
        }
      } catch (err) {
        console.warn('User search error:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [search]);

  // Load all users on clicking quick "New DM" button
  const handleQuickNewDM = async () => {
    setSearch('@');
    try {
      setSearchingUsers(true);
      const data = await api.users.search('');
      if (data.success && Array.isArray(data.users)) {
        setUserSearchResults(data.users);
      }
    } catch (e) {
      // ignore
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartDM = async (targetUser) => {
    try {
      const res = await api.rooms.createDM(targetUser.id);
      if (res.success && res.room) {
        if (onRoomJoined) onRoomJoined(res.room);
        if (onSelectRoom) onSelectRoom(res.room);
        setSearch('');
        setUserSearchResults([]);
      }
    } catch (e) {
      console.warn('Failed to start DM:', e);
    }
  };

  const handleRoomCreated = (newRoom) => {
    if (onRoomCreated) onRoomCreated(newRoom);
    if (onSelectRoom) onSelectRoom(newRoom);
  };

  const handleRoomJoined = (joinedRoom) => {
    if (onRoomJoined) onRoomJoined(joinedRoom);
    if (onSelectRoom) onSelectRoom(joinedRoom);
  };

  const toggleParentExpand = (e, roomId) => {
    e.stopPropagation();
    setExpandedParents((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

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

  // Group rooms into DMs and Channels (excluding child sub-channels from top list)
  const isQueryingDM = search.startsWith('@');
  const filterTerm = isQueryingDM ? search.substring(1).trim().toLowerCase() : search.trim().toLowerCase();

  const dmRooms = rooms.filter((r) =>
    r.type === 'dm' && (!filterTerm || r.name.toLowerCase().includes(filterTerm))
  );

  const channelRooms = rooms.filter((r) =>
    r.type !== 'dm' && !r.parentId && (!filterTerm || r.name.toLowerCase().includes(filterTerm))
  );

  return (
    <aside className="sidebar">
      {/* Sidebar Top Search & Actions */}
      <div className="sidebar-header" ref={searchContainerRef}>
        <div className="sidebar-title-row">
          <span className="sidebar-title">Chats & Channels</span>
          <div className="sidebar-actions">
            <button
              className="icon-btn"
              title="Start Direct Message (@user)"
              onClick={handleQuickNewDM}
            >
              <UserPlus size={16} color="var(--accent-primary)" />
            </button>
            <button
              className="icon-btn"
              title="Explore & Join Public Channels"
              onClick={() => setIsJoinOpen(true)}
            >
              <Compass size={16} />
            </button>
            <button
              className="icon-btn"
              title="Create New Channel"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search channels or @DisplayName..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setUserSearchResults([]); }}
              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* User Search Results Dropdown / Panel */}
      {search && (
        <div className="user-search-dropdown">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>
              USERS ({userSearchResults.length})
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to direct message</span>
          </div>

          {userSearchResults.length === 0 ? (
            <div style={{ padding: '10px 4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {searchingUsers ? 'Searching...' : `No user matching "${search}"`}
            </div>
          ) : (
            userSearchResults.map((u) => (
              <div
                key={u.id}
                className="user-search-item"
                onClick={() => handleStartDM(u)}
              >
                <div className="sidebar-user-avatar-wrap" style={{ width: '34px', height: '34px', flexShrink: 0 }}>
                  {u.avatarImage ? (
                    <img src={u.avatarImage} alt={u.displayName} className="sidebar-user-avatar-img" />
                  ) : (
                    <div className="sidebar-user-avatar" style={{ fontSize: '0.85rem' }}>
                      {u.avatarUrl || getInitials(u.displayName)}
                    </div>
                  )}
                  <span
                    className="sidebar-presence-dot"
                    style={{ backgroundColor: getPresenceColor(u.presenceStatus) }}
                  />
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>@{u.displayName}</span>
                    {u.isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(You / Notes)</span>}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.statusMessage || u.email}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
                >
                  {u.isSelf ? 'Notes' : 'Chat'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Top Active Presence / Story Avatars Carousel */}
      <div className="story-avatars-section">
        <div className="story-avatars-row">
          {/* Your Story / Status Button */}
          <div className="story-avatar-item" onClick={onOpenSettings} title="Update your status & photo">
            <div className="story-avatar-ring your-story">
              {user?.avatarImage ? (
                <img src={user.avatarImage} alt="You" className="story-avatar-img" />
              ) : user?.avatarUrl ? (
                <div className="story-avatar-placeholder">{user.avatarUrl}</div>
              ) : (
                <div className="story-avatar-placeholder">{getInitials(user?.displayName)}</div>
              )}
              <div className="story-add-badge">+</div>
            </div>
            <span className="story-name">Your Story</span>
          </div>

          {/* Active Online Members */}
          {onlineUsers.filter(u => u.id !== user?.id).map((onlineUser) => (
            <div
              key={onlineUser.id}
              className="story-avatar-item"
              onClick={() => handleStartDM(onlineUser)}
              title={`Chat with @${onlineUser.displayName} • ${onlineUser.statusMessage || 'Online'}`}
            >
              <div className="story-avatar-ring active-ring">
                {onlineUser.avatarImage ? (
                  <img src={onlineUser.avatarImage} alt={onlineUser.displayName} className="story-avatar-img" />
                ) : onlineUser.avatarUrl ? (
                  <div className="story-avatar-placeholder">{onlineUser.avatarUrl}</div>
                ) : (
                  <div className="story-avatar-placeholder">{getInitials(onlineUser.displayName)}</div>
                )}
                <span
                  className="story-online-dot"
                  style={{ backgroundColor: getPresenceColor(onlineUser.presenceStatus) }}
                />
              </div>
              <span className="story-name">@{onlineUser.displayName.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room & Channel List */}
      <div className="room-list">
        {/* DIRECT MESSAGES SECTION */}
        {dmRooms.length > 0 && (
          <div className="room-section-group">
            <div className="room-section-header">
              <span>DIRECT MESSAGES</span>
            </div>

            {dmRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  className={`room-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectRoom && onSelectRoom(room)}
                >
                  <div className="sidebar-user-avatar-wrap" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    {room.targetUser?.avatarImage ? (
                      <img src={room.targetUser.avatarImage} alt="User" className="sidebar-user-avatar-img" />
                    ) : (
                      <div className="sidebar-user-avatar" style={{ fontSize: '0.9rem' }}>
                        {room.targetUser?.avatarUrl || room.name.substring(1, 3).toUpperCase()}
                      </div>
                    )}
                    <span
                      className="sidebar-presence-dot"
                      style={{ backgroundColor: getPresenceColor(room.targetUser?.presenceStatus) }}
                    />
                  </div>

                  <div className="room-item-content">
                    <div className="room-item-top">
                      <span className="room-name">{room.name}</span>
                      {room.lastMessage?.createdAt && (
                        <span className="room-time">
                          {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="room-item-bottom">
                      <span className="room-snippet">
                        {room.lastMessage ? room.lastMessage.content : (room.targetUser?.statusMessage || 'Direct conversation')}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* CHANNELS & SUB-CHANNELS SECTION */}
        <div className="room-section-group">
          <div className="room-section-header">
            <span>CHANNELS</span>
          </div>

          {channelRooms.length === 0 && dmRooms.length === 0 && !search ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No channels found. Click "+" to create one.
            </div>
          ) : (
            channelRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const hasSubchannels = room.subChannels && room.subChannels.length > 0;
              const isExpanded = Boolean(expandedParents[room.id]);

              return (
                <div key={room.id} className="channel-group-container">
                  <button
                    className={`room-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectRoom && onSelectRoom(room)}
                  >
                    <div className="room-avatar-badge">
                      {room.isPrivate ? <Lock size={15} color="#fff" /> : <Hash size={16} color="#fff" />}
                    </div>

                    <div className="room-item-content">
                      <div className="room-item-top">
                        <span className="room-name">{room.name}</span>
                        {hasSubchannels && (
                          <span
                            className="subchannel-toggle-btn"
                            onClick={(e) => toggleParentExpand(e, room.id)}
                            title={isExpanded ? 'Collapse sub-channels' : 'Expand sub-channels'}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        )}
                      </div>

                      <div className="room-item-bottom">
                        <span className="room-snippet">
                          {room.topic || (room.lastMessage ? `${room.lastMessage.user?.displayName}: ${room.lastMessage.content}` : `${room.memberCount || 1} members`)}
                        </span>
                        {room.memberCount > 0 && (
                          <span className="room-badge">{room.memberCount}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Sub-Channels list */}
                  {hasSubchannels && isExpanded && (
                    <div className="subchannels-nested-list">
                      {room.subChannels.map((sub) => {
                        const isSubActive = sub.id === activeRoomId;
                        return (
                          <button
                            key={sub.id}
                            className={`subchannel-item ${isSubActive ? 'active' : ''}`}
                            onClick={() => onSelectRoom && onSelectRoom(sub)}
                          >
                            <GitBranch size={13} color="var(--accent-primary)" />
                            <span className="subchannel-name">#{sub.name.replace(`${room.name}-`, '')}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Bottom User Profile & Logout Section */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user-card"
          onClick={onOpenSettings}
          title="Click to customize profile, photo & status"
        >
          <div className="sidebar-user-avatar-wrap">
            {user?.avatarImage ? (
              <img src={user.avatarImage} alt={user?.displayName} className="sidebar-user-avatar-img" />
            ) : user?.avatarUrl ? (
              <div className="sidebar-user-avatar">{user.avatarUrl}</div>
            ) : (
              <div className="sidebar-user-avatar">{getInitials(user?.displayName)}</div>
            )}
            <span
              className="sidebar-presence-dot"
              style={{ backgroundColor: getPresenceColor(user?.presenceStatus) }}
            />
          </div>

          <div className="sidebar-user-details">
            <span className="sidebar-user-name">@{user?.displayName}</span>
            <span className="sidebar-user-status">
              {user?.statusMessage || '⚡ Available'}
            </span>
          </div>
        </div>

        <div className="sidebar-footer-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenSettings}
            title="Settings & Themes"
          >
            <Settings size={16} />
          </button>

          <button
            type="button"
            className="icon-btn danger"
            onClick={logout}
            title="Log out of chatO"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        currentRoomId={activeRoomId}
        onRoomJoined={handleRoomJoined}
      />
    </aside>
  );
}
