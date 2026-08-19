import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Mic } from 'lucide-react';

export function VoiceRecorder({ onSendVoiceNote, onCancel }) {
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    let stream = null;

    async function startRecording() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Audio recording is not supported in this browser.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(100);
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Microphone permission error:', err);
        setError('Microphone access denied. Please grant permission in browser settings.');
      }
    }

    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const handleSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (timerRef.current) clearInterval(timerRef.current);

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        onSendVoiceNote(base64Audio, duration);
      };
    };

    recorder.stop();
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder-bar">
      <button
        type="button"
        className="icon-btn danger"
        onClick={handleCancel}
        title="Discard voice message"
      >
        <Trash2 size={18} />
      </button>

      <div className="voice-recorder-status">
        <div className="recording-pulsing-dot" />
        <span className="recording-timer">{formatDuration(duration)}</span>

        <div className="live-sound-bars">
          <span className="sound-bar" />
          <span className="sound-bar" />
          <span className="sound-bar" />
          <span className="sound-bar" />
          <span className="sound-bar" />
          <span className="sound-bar" />
        </div>
      </div>

      {error ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--status-error)' }}>{error}</span>
      ) : (
        <button
          type="button"
          className="btn-send"
          onClick={handleSend}
          title="Send voice note"
        >
          <Send size={18} />
        </button>
      )}
    </div>
  );
}
