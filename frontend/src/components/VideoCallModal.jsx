import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users, AlertCircle, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { soundEffects } from '../utils/soundEffects.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function VideoCallModal({ isOpen, roomId, roomName, callType = 'video', isIncoming = false, onClose }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(isIncoming ? 'Incoming call...' : 'Calling channel members...');
  const [peerConnected, setPeerConnected] = useState(false);
  const [cameraWarning, setCameraWarning] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Start ringtone
    soundEffects.playCallingRingtone();
    setCameraWarning('');

    let localStream = null;

    async function initCall() {
      // 1. Initialize PeerConnection
      try {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call_signal', {
              roomId,
              signalData: event.candidate,
              type: 'ice-candidate',
            });
          }
        };

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play().catch((e) => console.warn('Remote video playback:', e));
            setPeerConnected(true);
            setCallStatus('Connected');
            soundEffects.stopRingtone();
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setPeerConnected(true);
            setCallStatus('Connected');
            soundEffects.stopRingtone();
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setPeerConnected(false);
          }
        };
      } catch (pcErr) {
        console.warn('RTCPeerConnection creation failed:', pcErr);
      }

      // 2. Access Local Media (Graceful audio fallback if camera is blocked/absent)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            if (callType === 'video') {
              localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } else {
              localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            }
          } catch (camErr) {
            console.warn('Camera access unavailable, falling back to Audio-only mode:', camErr.message);
            setCameraWarning('Camera unavailable or permission denied. Switched to high-clarity Audio mode.');
            setIsVideoOff(true);
            try {
              localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (micErr) {
              console.warn('Microphone also unavailable:', micErr.message);
              setCameraWarning('Microphone/Camera permission not granted. Running in simulated call mode.');
            }
          }

          if (localStream) {
            localStreamRef.current = localStream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }

            if (peerConnectionRef.current) {
              localStream.getTracks().forEach((track) => {
                peerConnectionRef.current.addTrack(track, localStream);
              });
            }
          }
        }
      } catch (err) {
        console.warn('Media devices initialization error:', err);
      }

      // 3. Initiate or Answer Call Signaling
      if (socket && roomId) {
        if (!isIncoming) {
          socket.emit('call_initiate', { roomId, roomName, callType });
        } else {
          // If this modal opened as a result of answering, emit call_accept
          socket.emit('call_accept', { roomId });
          soundEffects.stopRingtone();
        }
      }
    }

    initCall();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Socket Handlers: call_accepted, call_signal, call_ended
    const handleCallAccepted = async () => {
      soundEffects.stopRingtone();
      setCallStatus('Connected');
      setPeerConnected(true);

      // Caller creates and sends WebRTC Offer upon acceptance
      if (!isIncoming && peerConnectionRef.current && socket) {
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit('call_signal', {
            roomId,
            signalData: offer,
            type: 'offer',
          });
        } catch (offerErr) {
          console.warn('Error creating offer:', offerErr);
        }
      }
    };

    const handleCallSignal = async (data) => {
      if (data.roomId !== roomId || !peerConnectionRef.current) return;

      const pc = peerConnectionRef.current;
      try {
        if (data.type === 'offer' && data.signalData) {
          soundEffects.stopRingtone();
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (socket) {
            socket.emit('call_signal', {
              roomId,
              targetUserId: data.fromUserId,
              signalData: answer,
              type: 'answer',
            });
          }
          setCallStatus('Connected');
          setPeerConnected(true);
        } else if (data.type === 'answer' && data.signalData) {
          soundEffects.stopRingtone();
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
          setCallStatus('Connected');
          setPeerConnected(true);
        } else if (data.type === 'ice-candidate' && data.signalData) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signalData));
        }
      } catch (sigErr) {
        console.warn('Signal handling error:', sigErr);
      }
    };

    const handleCallEnded = () => {
      soundEffects.stopRingtone();
      onClose();
    };

    if (socket) {
      socket.on('call_accepted', handleCallAccepted);
      socket.on('call_signal', handleCallSignal);
      socket.on('call_ended', handleCallEnded);
    }

    return () => {
      clearInterval(timer);
      soundEffects.stopRingtone();

      if (socket) {
        socket.off('call_accepted', handleCallAccepted);
        socket.off('call_signal', handleCallSignal);
        socket.off('call_ended', handleCallEnded);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [isOpen, roomId, roomName, callType, isIncoming, socket]);

  if (!isOpen) return null;

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    if (isVideoOff) {
      try {
        if (navigator.mediaDevices) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = videoStream.getVideoTracks()[0];

          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newVideoTrack);
          } else {
            localStreamRef.current = videoStream;
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setCameraWarning('');
          setIsVideoOff(false);
        }
      } catch (e) {
        setCameraWarning('Camera permission denied or device in use.');
      }
    } else {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setIsVideoOff(true);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }
          setIsScreenSharing(true);

          screenStream.getVideoTracks()[0].onended = () => {
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            setIsScreenSharing(false);
          };
        }
      } catch (e) {
        console.warn('Screen share cancelled:', e);
      }
    } else {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    }
  };

  const handleEndCall = () => {
    soundEffects.playCallEndSound();
    soundEffects.stopRingtone();
    if (socket && roomId) {
      socket.emit('call_end', { roomId });
    }
    onClose();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={handleEndCall}>
      <div className="call-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Call Header */}
        <div className="call-header">
          <div className="call-header-info">
            <span className="call-room-name">#{roomName}</span>
            <span className="call-status-badge">
              <span className="call-pulse-dot" />
              {callStatus} • {formatDuration(callDuration)}
            </span>
          </div>
        </div>

        {cameraWarning && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', padding: '6px 16px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <AlertCircle size={14} />
            <span>{cameraWarning}</span>
          </div>
        )}

        {/* Video Grid */}
        <div className="call-video-grid">
          {/* Main Remote Feed */}
          <div className="call-video-box remote-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="video-element"
              style={{ display: peerConnected ? 'block' : 'none' }}
            />

            <div className="remote-avatar-placeholder" style={{ display: peerConnected ? 'none' : 'flex' }}>
              <div className="call-big-avatar">
                <Users size={48} color="#fff" />
              </div>
              <span style={{ fontWeight: 600, fontSize: '1rem', marginTop: '12px' }}>
                Channel #{roomName}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {peerConnected ? 'Live Audio / Video Stream' : 'Live Call Session'}
              </span>
            </div>

            <div className="video-user-tag">#{roomName} Audio/Video Channel</div>
          </div>

          {/* Local User Self-Preview */}
          <div className="call-video-box local-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-element"
              style={{ display: !isVideoOff ? 'block' : 'none' }}
            />

            {isVideoOff && (
              <div className="local-avatar-fallback">
                <div className="call-small-avatar">
                  {user?.avatarUrl ? user.avatarUrl : (user?.displayName?.substring(0, 2).toUpperCase() || 'ME')}
                </div>
                <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  {isMuted ? 'Muted' : 'Audio Live'}
                </span>
              </div>
            )}

            <div className="video-user-tag">You {isMuted && '(Muted)'}</div>
          </div>
        </div>

        {/* Call Controls Bar */}
        <div className="call-controls-bar">
          <button
            type="button"
            className={`call-control-btn ${isMuted ? 'danger' : ''}`}
            onClick={toggleMic}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            className={`call-control-btn ${isVideoOff ? 'danger' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button
            type="button"
            className={`call-control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title="Share Screen"
          >
            <Monitor size={20} />
          </button>

          <button
            type="button"
            className="call-control-btn end-call"
            onClick={handleEndCall}
            title="End Call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
