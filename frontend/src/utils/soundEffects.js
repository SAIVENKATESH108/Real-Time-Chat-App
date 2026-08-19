/**
 * Zero-dependency Web Audio API sound synthesizer for chat and call audio cues.
 */

let audioCtx = null;
let ringtoneOscillator1 = null;
let ringtoneOscillator2 = null;
let ringtoneGain = null;
let ringtoneInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundEffects = {
  // Pop sound when message is sent
  playSentSound: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // ignore
    }
  },

  // Pleasant chime when message is received
  playReceivedSound: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch (e) {
      // ignore
    }
  },

  // Subtle bubble pop for emoji reactions
  playReactionSound: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // ignore
    }
  },

  // Ringtone for incoming/outgoing call
  playCallingRingtone: () => {
    try {
      soundEffects.stopRingtone();
      const ctx = getAudioContext();
      if (!ctx) return;

      const playPulse = () => {
        const now = ctx.currentTime;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();

        o1.type = 'sine';
        o1.frequency.setValueAtTime(440, now);
        o2.type = 'sine';
        o2.frequency.setValueAtTime(480, now);

        g.gain.setValueAtTime(0.15, now);
        g.gain.setValueAtTime(0.15, now + 1.2);
        g.gain.linearRampToValueAtTime(0.001, now + 1.4);

        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);

        o1.start(now);
        o1.stop(now + 1.4);
        o2.start(now);
        o2.stop(now + 1.4);
      };

      playPulse();
      ringtoneInterval = setInterval(playPulse, 3000);
    } catch (e) {
      // ignore
    }
  },

  stopRingtone: () => {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      ringtoneInterval = null;
    }
  },

  // Call disconnected tone
  playCallEndSound: () => {
    try {
      soundEffects.stopRingtone();
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // ignore
    }
  },
};
