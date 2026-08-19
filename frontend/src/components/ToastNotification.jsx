import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';

export function ToastNotification({ toast, onSelectRoom, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="in-app-toast" onClick={() => onSelectRoom(toast.roomId)}>
      <div className="toast-avatar">
        {toast.sender?.avatarImage ? (
          <img src={toast.sender.avatarImage} alt="Avatar" className="toast-avatar-img" />
        ) : toast.sender?.avatarUrl ? (
          <span>{toast.sender.avatarUrl}</span>
        ) : (
          <span>{toast.sender?.displayName?.substring(0, 2).toUpperCase() || 'U'}</span>
        )}
      </div>

      <div className="toast-body">
        <div className="toast-header">
          <span className="toast-author">{toast.sender?.displayName || 'Someone'}</span>
          <span className="toast-room">in #{toast.roomName || 'channel'}</span>
        </div>
        <p className="toast-message">{toast.content || (toast.attachmentType ? `Sent an ${toast.attachmentType}` : 'Sent a message')}</p>
      </div>

      <button
        type="button"
        className="icon-btn"
        style={{ width: '24px', height: '24px' }}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
