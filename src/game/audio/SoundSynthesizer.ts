/**
 * Procedural Web Audio API Sound Synthesizer & Synthwave Engine for SNAKE AI 2026
 * Zero external audio assets, zero 404 risk.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private sfxVol: number = 0.7;
  private musicVol: number = 0.4;

  // Background Synthwave Sequencer State
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;
  private bgmBpm: number = 120;
  private isPlayingBgm: boolean = false;
  private currentMode: 'menu' | 'play' | 'turbo' | 'challenge' = 'menu';

  constructor() {
    // Lazily initialize upon first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSfxVolume(v: number) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVol, this.ctx.currentTime);
    }
  }

  public setMusicVolume(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVol, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVol, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVol, this.ctx.currentTime);
    }
    return !this.isMusicMuted;
  }

  public playUiClick() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  public playTurn() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  public playEat(combo: number = 1, type: string = 'quantum') {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const baseFreq = type === 'mega_crystal' ? 587.33 : type === 'overclock' ? 659.25 : 440;
    const pitchMultiplier = Math.min(2.0, 1 + (combo - 1) * 0.1);
    const freq = baseFreq * pitchMultiplier;

    // Harmonic bell synth
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(freq * 3, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.18);
    osc2.stop(this.ctx.currentTime + 0.18);
  }

  public playPowerup() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    // Fast ascending cyber arpeggio
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.04;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  }

  public playPortal() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
  }

  public playTurbo() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    // Filtered noise pulse
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.2);
  }

  public playCrash() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    // Deep sub-bass drop + white noise burst
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

    oscGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);

    // Noise crackle
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.35);
  }

  public playVictory() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const chords = [523.25, 659.25, 783.99, 1046.5]; // C major fanfare
    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * Adaptive Synthwave BGM Generator
   */
  public startBgm(mode: 'menu' | 'play' | 'turbo' | 'challenge' = 'play') {
    this.initContext();
    this.currentMode = mode;
    this.bgmBpm = mode === 'turbo' ? 140 : mode === 'challenge' ? 132 : mode === 'menu' ? 100 : 120;

    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;

    const stepIntervalMs = (60 / this.bgmBpm / 4) * 1000; // 16th notes
    this.bgmStep = 0;

    // Bassline and lead patterns (in A minor pentatonic)
    const bassline = [110, 0, 110, 110, 130.81, 0, 110, 0, 98, 0, 98, 98, 146.83, 0, 130.81, 0];
    const arpeggio = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 440, 392];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMusicMuted || !this.isPlayingBgm) {
        this.bgmStep = (this.bgmStep + 1) % 16;
        return;
      }

      const now = this.ctx.currentTime;
      const step = this.bgmStep;

      // 1. Bassline note on 16th note triggers
      const bassFreq = bassline[step];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.currentMode === 'turbo' ? 1200 : 600, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 0.14);
      }

      // 2. Snare / Cyber hi-hat on every off-beat
      if (step % 4 === 2) {
        // Snare pop
        const noise = this.createNoiseBurst(now, 0.08, 1800, 0.08);
        if (noise) noise.connect(this.musicGain);
      } else if (step % 2 === 0) {
        // Crisp hi-hat
        const noise = this.createNoiseBurst(now, 0.03, 6000, 0.04);
        if (noise) noise.connect(this.musicGain);
      }

      // 3. Cyber Lead / Arpeggio in play & turbo modes
      if (this.currentMode !== 'menu' && (step % 2 === 0)) {
        const arpIndex = (Math.floor(step / 2)) % arpeggio.length;
        const noteFreq = arpeggio[arpIndex];

        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();

        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(noteFreq, now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);

        leadOsc.start(now);
        leadOsc.stop(now + 0.1);
      }

      this.bgmStep = (this.bgmStep + 1) % 16;
    }, stepIntervalMs);
  }

  private createNoiseBurst(now: number, duration: number, freq: number, gainVal: number): AudioNode | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    src.start(now);
    src.stop(now + duration);

    return gain;
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public setMode(mode: 'menu' | 'play' | 'turbo' | 'challenge') {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      if (this.isPlayingBgm) {
        this.stopBgm();
        this.startBgm(mode);
      }
    }
  }
}

export const sound = new SoundSynthesizer();
