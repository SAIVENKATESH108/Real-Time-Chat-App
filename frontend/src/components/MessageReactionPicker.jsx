import React from 'react';
import { Reply, Copy, Trash2, Smile } from 'lucide-react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🚀', '🎉'];

export function MessageReactionPicker({
  message,
  isOwn,
  onReact,
  onReply,
  onCopy,
  onDelete,
}) {
  return (
    <div className="message-action-toolbar" onClick={(e) => e.stopPropagation()}>
      <div className="reaction-buttons-row">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="action-emoji-btn"
            onClick={() => onReact(emoji)}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="action-divider" />

      <button
        type="button"
        className="action-tool-btn"
        onClick={() => onReply(message)}
        title="Reply to message"
      >
        <Reply size={14} />
      </button>

      <button
        type="button"
        className="action-tool-btn"
        onClick={() => onCopy(message.content)}
        title="Copy text"
      >
        <Copy size={14} />
      </button>

      {isOwn && (
        <button
          type="button"
          className="action-tool-btn danger"
          onClick={() => onDelete(message.id)}
          title="Delete message"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
