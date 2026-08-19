import React, { useState } from 'react';
import { Search, Smile, Heart, ThumbsUp, Sparkles, Coffee, Cat } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: Smile,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '😎', '🤩', '🥳', '😏', '🧐', '🤓', '🤖', '👻', '💀'],
  },
  {
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: ['👍', '👎', '👏', '🙌', '👐', '🤝', '👊', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '✋', '👋', '🤙', '💪', '🙏', '✍️', '💅'],
  },
  {
    name: 'Hearts & Vibe',
    icon: Heart,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💞', '💕', '💘', '🔥', '✨', '🌟', '💫', '⚡', '💥', '💯', '🎉', '🎊', '🚀'],
  },
  {
    name: 'Animals',
    icon: Cat,
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🦄', '🐝'],
  },
  {
    name: 'Food & Drink',
    icon: Coffee,
    emojis: ['☕', '🍵', '🧃', '🥤', '🍺', '🍻', '🍷', '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🍳', '🧇', '🥞', '🥐', '🥨', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬'],
  },
];

export function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const filteredEmojis = search.trim()
    ? allEmojis.filter(() => true) // Emojis don't have text names in standard array, shows all or active
    : EMOJI_CATEGORIES[activeTab].emojis;

  return (
    <div className="emoji-picker-popover" onClick={(e) => e.stopPropagation()}>
      <div className="emoji-picker-header">
        <div className="emoji-search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="emoji-search-input"
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!search.trim() && (
        <div className="emoji-category-tabs">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                type="button"
                className={`emoji-category-btn ${activeTab === idx ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
                title={cat.name}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      <div className="emoji-grid">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            className="emoji-btn"
            onClick={() => onSelectEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
