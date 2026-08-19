import React, { useState, useEffect } from 'react';
import { RoomHeader } from './RoomHeader.jsx';
import { MessageList } from './MessageList.jsx';
import { MessageInput } from './MessageInput.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { MemberList } from './MemberList.jsx';
import { VideoCallModal } from './VideoCallModal.jsx';
import { ChatSearchBar } from './ChatSearchBar.jsx';
import { useChat } from '../hooks/useChat.js';
import { useTyping } from '../hooks/useTyping.js';
import { usePresence } from '../hooks/usePresence.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../services/api.js';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';

export function ChatArea({ room, onMobileBack, onChannelUpdated, onChannelDeleted }) {
  const [isMembersOpen, setIsMembersOpen] = useState(true);
  const [roomDetails, setRoomDetails] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Call states
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeCallType, setActiveCallType] = useState('video');
  const [isIncomingCallActive, setIsIncomingCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const { socket } = useSocket();
  const { wallpaper, soundEnabled } = useTheme();

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    sendReaction,
    deleteMessage,
    loadOlderMessages,
  } = useChat(room?.id);

  const {
    isAnyoneTyping,
    typingText,
    handleTypingKeystroke,
    stopTyping,
  } = useTyping(room?.id);

  const { onlineUsers, totalOnline } = usePresence(room?.id);

  // Incoming call socket listener
  useEffect(() => {
    if (!socket || !room?.id) return;

    const handleIncomingCall = (data) => {
      if (data.roomId === room.id) {
        if (soundEnabled) {
          soundEffects.playCallingRingtone();
        }
        setIncomingCall(data);
      }
    };

    const handleCallEnded = (data) => {
      if (data.roomId === room.id) {
        setIncomingCall(null);
        setIsCallModalOpen(false);
        soundEffects.stopRingtone();
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, room?.id, soundEnabled]);

  // Fetch full room details
  useEffect(() => {
    if (!room?.id) return;
    async function loadDetails() {
      try {
        const data = await api.rooms.getById(room.id);
        if (data.success && data.room) {
          setRoomDetails(data.room);
        }
      } catch (e) {
        // ignore
      }
    }
    loadDetails();
  }, [room?.id]);

  const handleStartCall = (callType = 'video') => {
    setActiveCallType(callType);
    setIsIncomingCallActive(false);
    setIsCallModalOpen(true);
  };

  const handleAnswerCall = () => {
    soundEffects.stopRingtone();
    setActiveCallType(incomingCall?.callType || 'video');
    setIsIncomingCallActive(true);
    setIncomingCall(null);
    setIsCallModalOpen(true);
  };

  const handleDeclineCall = () => {
    soundEffects.stopRingtone();
    if (socket && room?.id) {
      socket.emit('call_reject', { roomId: room.id });
    }
    setIncomingCall(null);
  };

  const matchedMessagesCount = searchFilter.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchFilter.trim().toLowerCase())).length
    : 0;

  if (!room) {
    return (
      <main className="chat-main" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="empty-state">
          <h3>Select a channel or message a friend to start chatting</h3>
          <p>Choose from the left sidebar or search users with @username.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`chat-main wallpaper-bg wp-${wallpaper}`}>
      {/* Header */}
      <RoomHeader
        room={room}
        onlineCount={totalOnline || 1}
        isMembersOpen={isMembersOpen}
        onToggleMembers={() => setIsMembersOpen((prev) => !prev)}
        onStartCall={handleStartCall}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => {
          setIsSearchOpen(!isSearchOpen);
          if (isSearchOpen) setSearchFilter('');
        }}
        onMobileBack={onMobileBack}
        onChannelUpdated={onChannelUpdated}
        onChannelDeleted={onChannelDeleted}
      />

      {/* In-channel Search Bar */}
      {isSearchOpen && (
        <ChatSearchBar
          searchFilter={searchFilter}
          onSearchChange={setSearchFilter}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchFilter('');
          }}
          matchCount={matchedMessagesCount}
        />
      )}

      {/* Incoming Call Notification Banner */}
      {incomingCall && (
        <div className="incoming-call-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="call-pulse-dot ringing" />
            <div>
              <strong>{incomingCall.caller?.displayName || 'Someone'}</strong> is starting a {incomingCall.callType} call in #{room.name}...
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-call-action answer" onClick={handleAnswerCall}>
              {incomingCall.callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
              Answer
            </button>
            <button className="btn-call-action decline" onClick={handleDeclineCall}>
              <PhoneOff size={16} />
              Decline
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <MessageList
            messages={messages}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadOlderMessages}
            onReact={sendReaction}
            onReply={(msg) => setReplyingTo(msg)}
            onDelete={deleteMessage}
            searchFilter={searchFilter}
          />

          <TypingIndicator
            isAnyoneTyping={isAnyoneTyping}
            typingText={typingText}
          />

          <MessageInput
            onSendMessage={sendMessage}
            onTyping={handleTypingKeystroke}
            onStopTyping={stopTyping}
            placeholder={`Message ${room.name}`}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>

        {isMembersOpen && room.type !== 'dm' && (
          <MemberList
            onlineUsers={onlineUsers}
            allMembers={roomDetails?.members || []}
            onClose={() => setIsMembersOpen(false)}
          />
        )}
      </div>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={isCallModalOpen}
        roomId={room.id}
        roomName={room.name}
        callType={activeCallType}
        isIncoming={isIncomingCallActive}
        onClose={() => setIsCallModalOpen(false)}
      />
    </main>
  );
}
