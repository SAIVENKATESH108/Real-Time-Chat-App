import React from 'react';

export function TypingIndicator({ isAnyoneTyping, typingText }) {
  if (!isAnyoneTyping) {
    return <div className="typing-container" />;
  }

  return (
    <div className="typing-container">
      <div className="typing-dots">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>{typingText}</span>
    </div>
  );
}
