import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar.jsx';
import { RoomSidebar } from '../components/RoomSidebar.jsx';
import { ChatArea } from '../components/ChatArea.jsx';
import { CreateRoomModal } from '../components/CreateRoomModal.jsx';
import { SettingsModal } from '../components/SettingsModal.jsx';
import { ToastNotification } from '../components/ToastNotification.jsx';
import { MobileBottomNav } from '../components/MobileBottomNav.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { usePresence } from '../hooks/usePresence.js';
import { api } from '../services/api.js';

export function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [mobileTab, setMobileTab] = useState('chats');

  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const { onlineUsers } = usePresence(activeRoom?.id);

  // Detect mobile device
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Load initial rooms
  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const data = await api.rooms.list();
      if (data.success && Array.isArray(data.rooms)) {
        setRooms(data.rooms);

        // Check if room URL query param exists (e.g. /chat?room=xyz)
        const params = new URLSearchParams(location.search);
        const roomParam = params.get('room');

        if (roomParam) {
          const targetRoom = data.rooms.find(
            (r) => r.id === roomParam || r.name.toLowerCase() === roomParam.toLowerCase() || r.rawName === roomParam
          );
          if (targetRoom) {
            setActiveRoom(targetRoom);
          } else {
            try {
              const res = await api.rooms.getById(roomParam);
              if (res.success && res.room) {
                setRooms((prev) => {
                  if (prev.some((r) => r.id === res.room.id)) return prev;
                  return [...prev, res.room];
                });
                setActiveRoom(res.room);
              }
            } catch (e) {
              if (!isMobileScreen && data.rooms.length > 0) setActiveRoom(data.rooms[0]);
            }
          }
        } else if (!isMobileScreen && !activeRoom && data.rooms.length > 0) {
          // On desktop, default to the first room. On mobile, keep sidebar visible!
          setActiveRoom(data.rooms[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Global socket listener for in-app toasts across other channels
  useEffect(() => {
    if (!socket) return;

    const handleGlobalNewMessage = (newMsg) => {
      if (activeRoom && newMsg.roomId !== activeRoom.id) {
        const foundRoom = rooms.find((r) => r.id === newMsg.roomId);
        setToastMessage({
          roomId: newMsg.roomId,
          roomName: foundRoom ? foundRoom.name : 'channel',
          sender: newMsg.user,
          content: newMsg.content,
          attachmentType: newMsg.attachmentType,
        });
      }
    };

    socket.on('new_message', handleGlobalNewMessage);
    return () => {
      socket.off('new_message', handleGlobalNewMessage);
    };
  }, [socket, activeRoom, rooms]);

  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    setToastMessage(null);
  };

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => {
      if (prev.some((r) => r.id === newRoom.id)) return prev;
      return [newRoom, ...prev];
    });
    setActiveRoom(newRoom);
  };

  const handleRoomJoined = (joinedRoom) => {
    setRooms((prev) => {
      if (prev.some((r) => r.id === joinedRoom.id)) return prev;
      return [...prev, joinedRoom];
    });
    setActiveRoom(joinedRoom);
  };

  const handleChannelUpdated = (updatedRoom) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r))
    );
    if (activeRoom?.id === updatedRoom.id) {
      setActiveRoom((prev) => ({ ...prev, ...updatedRoom }));
    }
  };

  const handleChannelDeleted = (deletedRoomId) => {
    setRooms((prev) => prev.filter((r) => r.id !== deletedRoomId));
    const remaining = rooms.filter((r) => r.id !== deletedRoomId);
    if (remaining.length > 0 && !isMobileScreen) {
      setActiveRoom(remaining[0]);
    } else {
      setActiveRoom(null);
    }
  };

  const handleToastJump = (targetRoomId) => {
    const target = rooms.find((r) => r.id === targetRoomId);
    if (target) {
      setActiveRoom(target);
    }
    setToastMessage(null);
  };

  return (
    <div className="app-container">
      <Navbar />

      {/* Floating In-App Toast Notification */}
      <ToastNotification
        toast={toastMessage}
        onSelectRoom={handleToastJump}
        onDismiss={() => setToastMessage(null)}
      />

      <div className={`chat-layout ${activeRoom ? 'has-active-room' : ''}`}>
        <RoomSidebar
          rooms={rooms}
          activeRoomId={activeRoom?.id}
          onSelectRoom={handleSelectRoom}
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onlineUsers={onlineUsers}
        />

        <ChatArea
          room={activeRoom}
          onMobileBack={() => setActiveRoom(null)}
          onChannelUpdated={handleChannelUpdated}
          onChannelDeleted={handleChannelDeleted}
        />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'chats') setActiveRoom(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
