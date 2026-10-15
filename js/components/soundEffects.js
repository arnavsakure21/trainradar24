/**
 * RailRadar Web Audio Sound Synthesizer
 * Generates harmonic railway announcement chimes and delay alerts
 * using the Web Audio API without external audio asset dependencies.
 */

class SoundEffectsService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initAudioContext();
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    // Browser audio policy requires user gesture before playing audio
    const unlockAudio = () => {
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Helper to play a chime note with realistic acoustic chime envelope
   * (gentle attack, prolonged resonant decay with overtone harmonic).
   */
  playNote(frequency, startTime, duration = 0.8, baseVolume = 0.15) {
    const ctx = this.ensureContext();
    if (!ctx || !this.enabled) return;

    // Fundamental tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    // Overtone for bell/chime chime resonance
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(frequency * 2.01, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(baseVolume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    overtoneGain.gain.setValueAtTime(0.0001, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(baseVolume * 0.35, startTime + 0.02);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    gain.connect(ctx.destination);
    overtoneGain.connect(ctx.destination);

    osc.start(startTime);
    overtone.start(startTime);

    osc.stop(startTime + duration + 0.05);
    overtone.stop(startTime + duration + 0.05);
  }

  /**
   * Classic Railway Station Announcement Chime (4-tone triad sequence)
   * Inspired by authentic high-speed train and station chimes (F4 -> A4 -> C5 -> F5)
   */
  playStationChime() {
    const ctx = this.ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 349.23, time: 0.00, dur: 0.9 }, // F4
      { freq: 440.00, time: 0.22, dur: 0.9 }, // A4
      { freq: 523.25, time: 0.44, dur: 0.9 }, // C5
      { freq: 698.46, time: 0.68, dur: 1.4 }  // F5
    ];

    notes.forEach(n => {
      this.playNote(n.freq, now + n.time, n.dur, 0.16);
    });
  }

  /**
   * Delay Alert Attention Chime (2-tone warning chord)
   * Urgent yet clean melodic notification (A5 -> D5)
   */
  playDelayAlertChime() {
    const ctx = this.ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;
    // Two distinct alert bells
    this.playNote(880.00, now, 0.5, 0.20);        // A5
    this.playNote(587.33, now + 0.18, 1.1, 0.22); // D5
  }

  /**
   * Recovered / Back On-Schedule Chime (Upward ascending bright triad)
   */
  playOnTimeChime() {
    const ctx = this.ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.4 }, // C5
      { freq: 659.25, time: 0.14, dur: 0.4 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.9 }  // G5
    ];

    notes.forEach(n => {
      this.playNote(n.freq, now + n.time, n.dur, 0.14);
    });
  }

  /**
   * Subtle click feedback for buttons/toggles
   */
  playClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundEffects = new SoundEffectsService();
