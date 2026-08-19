import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

const GIF_PRESETS = [
  { id: '1', title: 'Party Dance', category: 'happy', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { id: '2', title: 'Cheering', category: 'excited', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '3', title: 'Thumbs Up Cat', category: 'thumbsup', url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif' },
  { id: '4', title: 'Mind Blown', category: 'wow', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '5', title: 'Popcorn Eating', category: 'waiting', url: 'https://media.giphy.com/media/t3cL1iXeWH8fSS2468/giphy.gif' },
  { id: '6', title: 'Laughing Dog', category: 'laugh', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  { id: '7', title: 'Applause', category: 'applause', url: 'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif' },
  { id: '8', title: 'Typing Fast Hacker', category: 'tech', url: 'https://media.giphy.com/media/ule4akeEDWA0/giphy.gif' },
  { id: '9', title: 'Rocket Launch', category: 'excited', url: 'https://media.giphy.com/media/mi6tXMhEEQ8T17PAcn/giphy.gif' },
  { id: '10', title: 'High Five', category: 'happy', url: 'https://media.giphy.com/media/l0ErFafpUCQTQFMSk/giphy.gif' },
  { id: '11', title: 'Confused Travolta', category: 'shocked', url: 'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif' },
  { id: '12', title: 'Sleepy Cat', category: 'tired', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif' },
];

export function GifPicker({ onSelectGif, onClose }) {
  const [search, setSearch] = useState('');

  const filteredGifs = GIF_PRESETS.filter((g) =>
    g.title.toLowerCase().includes(search.trim().toLowerCase()) ||
    g.category.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="gif-picker-popover" onClick={(e) => e.stopPropagation()}>
      <div className="gif-picker-header">
        <div className="emoji-search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="emoji-search-input"
            placeholder="Search reaction GIFs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="gif-grid">
        {filteredGifs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No GIFs found.
          </div>
        ) : (
          filteredGifs.map((gif) => (
            <div
              key={gif.id}
              className="gif-item"
              onClick={() => onSelectGif(gif.url)}
              title={gif.title}
            >
              <img src={gif.url} alt={gif.title} loading="lazy" />
              <div className="gif-overlay">{gif.title}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
