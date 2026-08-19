import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { MessageReactionPicker } from './MessageReactionPicker.jsx';
import { AudioPlayerBubble } from './AudioPlayerBubble.jsx';
import { Reply, Check, CheckCheck, FileText, Download } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';
import { useTheme } from '../context/ThemeContext.jsx';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function MessageItem({
  message,
  isGrouped = false,
  onReact,
  onReply,
  onDelete,
}) {
  const { user } = useAuth();
  const { soundEnabled } = useTheme();
  const [copied, setCopied] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  const isOwn = message.userId === user?.id || (message.user && message.user.id === user?.id);
  const displayName = isOwn ? 'You' : message.user?.displayName || 'Anonymous';
  const timeFormatted = formatTimestamp(message.createdAt);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReactClick = (emoji) => {
    if (soundEnabled) {
      soundEffects.playReactionSound();
    }
    onReact(message.id, emoji);
  };

  const reactions = (typeof message.reactions === 'object' && message.reactions !== null)
    ? message.reactions
    : {};
  const reactionEntries = Object.entries(reactions).filter(([_, users]) => Array.isArray(users) && users.length > 0);

  return (
    <div className={`message-item-container ${isOwn ? 'own' : ''} ${isGrouped ? 'grouped' : ''}`}>
      {/* Quoted Reply Header if this message is a reply */}
      {message.replyTo && (
        <div className="reply-preview-bubble">
          <Reply size={12} className="reply-icon" />
          <span className="reply-author">{message.replyTo.user?.displayName || 'Someone'}:</span>
          <span className="reply-text">
            {message.replyTo.attachmentType === 'audio'
              ? '🎤 Voice Message'
              : message.replyTo.content}
          </span>
        </div>
      )}

      <div className={`message-item ${isOwn ? 'own-message' : ''}`}>
        {/* Avatar (only rendered if not consecutive/grouped) */}
        {!isGrouped ? (
          <div className="message-avatar-wrapper">
            {message.user?.avatarImage ? (
              <img src={message.user.avatarImage} alt="Avatar" className="message-avatar-img" />
            ) : message.user?.avatarUrl ? (
              <div className="message-avatar">{message.user.avatarUrl}</div>
            ) : (
              <div className="message-avatar">
                {getInitials(isOwn ? user?.displayName : message.user?.displayName)}
              </div>
            )}
          </div>
        ) : (
          <div className="message-avatar-spacer" />
        )}

        <div className="message-content-wrapper">
          {!isGrouped && (
            <div className="message-meta">
              <span className="message-author">{displayName}</span>
              {message.user?.statusMessage && !isOwn && (
                <span className="message-user-status">{message.user.statusMessage}</span>
              )}
            </div>
          )}

          <div className="message-bubble">
            {/* Image Attachment */}
            {message.attachmentUrl && message.attachmentType === 'image' && (
              <div className="message-attachment-container" onClick={() => setLightboxImg(message.attachmentUrl)}>
                <img src={message.attachmentUrl} alt="Attachment" className="message-attachment-img" />
              </div>
            )}

            {/* Voice Message */}
            {message.attachmentType === 'audio' && message.attachmentUrl && (
              <AudioPlayerBubble
                audioUrl={message.attachmentUrl}
                duration={message.audioDuration || 0}
                isOwn={isOwn}
              />
            )}

            {/* Animated GIF */}
            {message.gifUrl && (
              <div className="message-gif-container">
                <img src={message.gifUrl} alt="GIF" className="message-gif-img" />
              </div>
            )}

            {/* Text Message Content */}
            {message.content && message.content !== 'GIF' && message.content !== 'Voice Message' && message.content !== 'Attachment' && (
              <div className="message-text-content">{message.content}</div>
            )}

            {/* Message Delivery Status & Timestamp */}
            <div className="message-footer-row">
              <span className="message-timestamp">{timeFormatted}</span>
              {isOwn && (
                <span className="delivery-status" title={message.isOptimistic ? 'Sending...' : 'Delivered'}>
                  {message.isOptimistic ? (
                    <Check size={13} color="var(--text-muted)" />
                  ) : (
                    <CheckCheck size={14} className="double-tick-delivered" />
                  )}
                </span>
              )}
            </div>

            {/* Reaction Badges */}
            {reactionEntries.length > 0 && (
              <div className="message-reactions-row">
                {reactionEntries.map(([emoji, userList]) => {
                  const hasUserReacted = userList.some((u) => u.id === user?.id);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`reaction-badge ${hasUserReacted ? 'active' : ''}`}
                      onClick={() => handleReactClick(emoji)}
                      title={userList.map((u) => u.displayName).join(', ')}
                    >
                      <span>{emoji}</span>
                      <span className="reaction-count">{userList.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Hover Reaction Toolbar */}
        <MessageReactionPicker
          message={message}
          isOwn={isOwn}
          onReact={handleReactClick}
          onReply={onReply}
          onCopy={handleCopy}
          onDelete={onDelete}
        />
      </div>

      {copied && (
        <div className="copied-toast">
          <Check size={12} /> Copied
        </div>
      )}

      {/* Lightbox Modal for Full Image View */}
      {lightboxImg && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Enlarged" className="lightbox-img" />
        </div>
      )}
    </div>
  );
}
