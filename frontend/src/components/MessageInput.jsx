import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image, Paperclip, Mic, X, Reply } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker.jsx';
import { GifPicker } from './GifPicker.jsx';
import { VoiceRecorder } from './VoiceRecorder.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { soundEffects } from '../utils/soundEffects.js';

export function MessageInput({
  onSendMessage,
  onTyping,
  onStopTyping,
  placeholder,
  replyingTo,
  onCancelReply,
}) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);

  const { soundEnabled } = useTheme();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setContent(e.target.value);
    onTyping();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (gifUrl = null, attachmentData = null) => {
    const trimmed = content.trim();
    const hasAttachment = attachedImage || attachmentData;

    if (!trimmed && !gifUrl && !hasAttachment) return;

    if (soundEnabled) {
      soundEffects.playSentSound();
    }

    onSendMessage({
      content: trimmed,
      gifUrl: gifUrl || null,
      attachmentUrl: attachmentData?.url || attachedImage || null,
      attachmentType: attachmentData?.type || (attachedImage ? 'image' : null),
      audioDuration: attachmentData?.duration || null,
      replyToId: replyingTo?.id || null,
    });

    setContent('');
    setAttachedImage(null);
    onStopTyping();
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    if (onCancelReply) onCancelReply();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleVoiceNoteSend = (audioUrl, duration) => {
    setIsRecordingVoice(false);
    handleSend(null, { url: audioUrl, type: 'audio', duration });
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target.result);
      if (textareaRef.current) textareaRef.current.focus();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    };

    if (showEmojiPicker || showGifPicker) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker, showGifPicker]);

  return (
    <div className="chat-input-container">
      {/* Quoted Reply Preview Bar */}
      {replyingTo && (
        <div className="replying-to-bar">
          <div className="replying-to-content">
            <Reply size={14} className="replying-to-icon" />
            <span>Replying to <strong>{replyingTo.user?.displayName || 'message'}</strong>: </span>
            <span className="replying-to-snippet">{replyingTo.content || 'attachment'}</span>
          </div>
          <button className="icon-btn" style={{ width: '22px', height: '22px' }} onClick={onCancelReply}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Attachment Preview Chip */}
      {attachedImage && (
        <div className="attachment-preview-chip">
          <img src={attachedImage} alt="Attachment Preview" className="attachment-chip-thumb" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Photo attached</span>
          <button className="icon-btn" style={{ width: '20px', height: '20px' }} onClick={() => setAttachedImage(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Voice Recorder View or Standard Input View */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoiceNote={handleVoiceNoteSend}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="chat-input-bar">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              rows={1}
              placeholder={placeholder || 'Type a message... (Enter to send, Shift+Enter for newline)'}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={onStopTyping}
            />

            <div className="input-action-buttons">
              {/* Attachment / Paperclip Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo/image"
              >
                <Paperclip size={18} />
              </button>

              {/* Emoji Button */}
              <div className="popover-anchor">
                <button
                  type="button"
                  className={`input-icon-btn ${showEmojiPicker ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGifPicker(false);
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  title="Add Emoji"
                >
                  <Smile size={19} />
                </button>

                {showEmojiPicker && (
                  <EmojiPicker
                    onSelectEmoji={(emoji) => setContent((prev) => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>

              {/* GIF Button */}
              <div className="popover-anchor">
                <button
                  type="button"
                  className={`input-icon-btn ${showGifPicker ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(false);
                    setShowGifPicker(!showGifPicker);
                  }}
                  title="Send a GIF"
                >
                  <Image size={19} />
                </button>

                {showGifPicker && (
                  <GifPicker
                    onSelectGif={(gifUrl) => handleSend(gifUrl)}
                    onClose={() => setShowGifPicker(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Send or Voice Record Button */}
          {content.trim() || attachedImage ? (
            <button
              type="button"
              className="btn-send"
              onClick={() => handleSend()}
              title="Send Message"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-voice-record"
              onClick={() => setIsRecordingVoice(true)}
              title="Record Voice Note"
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
