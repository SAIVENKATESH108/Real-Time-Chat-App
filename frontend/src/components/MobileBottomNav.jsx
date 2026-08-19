import React from 'react';
import { MessageSquare, Users, Phone, Settings, Sparkles } from 'lucide-react';

export function MobileBottomNav({ activeTab, onSelectTab, onOpenSettings }) {
  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'chats' ? 'active' : ''}`}
        onClick={() => onSelectTab('chats')}
      >
        <MessageSquare size={20} />
        <span>Channels</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => onSelectTab('members')}
      >
        <Users size={20} />
        <span>Members</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'calls' ? 'active' : ''}`}
        onClick={() => onSelectTab('calls')}
      >
        <Phone size={20} />
        <span>Call</span>
      </button>

      <button
        type="button"
        className="mobile-nav-btn"
        onClick={onOpenSettings}
      >
        <Settings size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
}
