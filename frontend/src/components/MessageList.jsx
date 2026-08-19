import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { MessageItem } from './MessageItem.jsx';
import { ChevronUp, MessageSquare } from 'lucide-react';

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onReact,
  onReply,
  onDelete,
  searchFilter = '',
}) {
  const containerRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);

  // Filter messages if search filter active
  const filteredMessages = searchFilter.trim()
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(searchFilter.trim().toLowerCase()) ||
        m.user?.displayName?.toLowerCase().includes(searchFilter.trim().toLowerCase())
      )
    : messages;

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 150;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = isNearBottom;
  };

  useEffect(() => {
    if (containerRef.current && !loading && messages.length > 0) {
      if (isNearBottomRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  }, [messages.length, loading]);

  const handleLoadMoreClick = () => {
    if (containerRef.current) {
      previousScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    onLoadMore();
  };

  useLayoutEffect(() => {
    if (containerRef.current && previousScrollHeightRef.current > 0) {
      const heightDifference = containerRef.current.scrollHeight - previousScrollHeightRef.current;
      containerRef.current.scrollTop += heightDifference;
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="messages-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading conversation history...</div>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <MessageSquare className="empty-state-icon" />
          <h4 style={{ color: 'var(--text-secondary)' }}>
            {searchFilter ? 'No matching messages found' : 'Welcome to the channel!'}
          </h4>
          <p style={{ fontSize: '0.875rem' }}>
            {searchFilter ? 'Try searching for a different keyword.' : 'No messages here yet. Be the first one to say hello!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
      {hasMore && !searchFilter && (
        <div className="load-more-container">
          <button
            className="btn-load-more"
            onClick={handleLoadMoreClick}
            disabled={loadingMore}
          >
            {loadingMore ? (
              'Loading older messages...'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronUp size={14} />
                Load older messages
              </span>
            )}
          </button>
        </div>
      )}

      {filteredMessages.map((message, index) => {
        // Determine if consecutive message from same author within 5 mins
        const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
        const isSameUser = prevMessage && (prevMessage.userId === message.userId || prevMessage.user?.id === message.user?.id);
        const timeDiff = prevMessage ? (new Date(message.createdAt) - new Date(prevMessage.createdAt)) / 1000 : Infinity;
        const isGrouped = Boolean(isSameUser && timeDiff < 300 && !message.replyTo);

        return (
          <MessageItem
            key={message.id || message.tempId}
            message={message}
            isGrouped={isGrouped}
            onReact={onReact}
            onReply={onReply}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
