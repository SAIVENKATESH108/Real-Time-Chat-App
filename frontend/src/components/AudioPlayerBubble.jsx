import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayerBubble({ audioUrl, duration = 0, isOwn = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);

  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Audio play error:', e));
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Render randomized animated waveform bars
  const bars = [40, 60, 30, 80, 50, 90, 35, 75, 45, 65, 85, 30, 70, 55, 95, 40, 60, 80, 50, 70];

  return (
    <div className={`audio-bubble-player ${isOwn ? 'own' : ''}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        type="button"
        className="audio-play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
      </button>

      <div className="audio-wave-container">
        <div className="audio-waveform">
          {bars.map((height, i) => {
            const isPlayed = (i / bars.length) * 100 <= progressPercent;
            return (
              <span
                key={i}
                className={`wave-bar ${isPlayed ? 'played' : ''} ${isPlaying ? 'animated' : ''}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div className="audio-time-info">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration || duration || 0)}</span>
        </div>
      </div>
    </div>
  );
}
