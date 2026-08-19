import React from 'react';
import { Search, X } from 'lucide-react';

export function ChatSearchBar({ searchFilter, onSearchChange, onClose, matchCount }) {
  return (
    <div className="chat-search-bar" onClick={(e) => e.stopPropagation()}>
      <Search size={16} color="var(--text-muted)" />
      <input
        type="text"
        className="chat-search-input"
        placeholder="Search messages in this channel..."
        value={searchFilter}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus
      />
      {searchFilter.trim() && (
        <span className="search-match-count">
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </span>
      )}
      <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
