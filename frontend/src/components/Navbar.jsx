import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { MessageSquare, Wifi, WifiOff, Sun, Moon, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal.jsx';

export function Navbar() {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="brand-logo">
          <MessageSquare className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          <span>chat<span style={{ color: 'var(--accent-primary)' }}>O</span></span>
          <span className="brand-badge">PRO</span>
        </div>

        <div className="nav-user-section">
          {/* Real-time Engine Status */}
          <div
            className="nav-connection-indicator"
            title={isConnected ? 'Connected to real-time engine' : 'Reconnecting to real-time engine...'}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Pitch Black'} Mode`}
          >
            {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="var(--accent-primary)" />}
          </button>

          {/* Settings Button */}
          <button
            className="icon-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Wallpapers"
          >
            <Settings size={17} />
          </button>
        </div>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
