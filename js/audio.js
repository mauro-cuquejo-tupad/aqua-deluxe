/* ==========================================================================
   AQUASORT MASTER DELUXE - PROCEDURAL AUDIO ENGINE
   Sintetizador Web Audio API: Música de Niveles, Música de Mapas y Ruleta
   ========================================================================== */

class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.5;

    // Estados de música activa
    this.currentTrack = null; // 'level', 'map', 'roulette', null
    this.pendingTrack = null;
    this.hasUserInteracted = false;
    this.musicLoopTimer = null;
    this.musicStep = 0;
    this.activeNodes = [];

    // Master Gains
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Cargar preferencia guardada
    try {
      const savedMute = localStorage.getItem('aquasort_muted');
      if (savedMute !== null) this.isMuted = JSON.parse(savedMute);
    } catch (e) {}

    // Desbloqueo limpio ante el primer gesto del usuario (toque, clic, tecla)
    this.setupGestureUnlock();
  }

  setupGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.hasUserInteracted = true;
      this.init();
      if (this.pendingTrack && !this.currentTrack) {
        const trk = this.pendingTrack;
        this.pendingTrack = null;
        this.playMusic(trk);
      }
      ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock, true);
      });
    };

    ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  init() {
    if (!this.ctx) {
      try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) return false;
        this.ctx = new AudioCtxClass();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Music Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      } catch (e) {
        return false;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && this.hasUserInteracted) {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  ready() {
    if (this.isMuted) return false;
    this.init();
    return Boolean(this.ctx);
  }

  toggleMute() {
    this.hasUserInteracted = true;
    this.init();
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('aquasort_muted', JSON.stringify(this.isMuted));
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 1;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  // ==========================================================================
  // 1. SISTEMA DE MÚSICA PROCEDURAL (NIVELES, MAPA, RULETA)
  // ==========================================================================

  playMusic(trackType) {
    if (!this.hasUserInteracted) {
      this.pendingTrack = trackType;
      return;
    }

    if (!this.init()) {
      this.pendingTrack = trackType;
      return;
    }

    if (this.currentTrack === trackType) return;
    this.stopMusic();
    this.currentTrack = trackType;
    this.musicStep = 0;

    if (trackType === 'level') {
      this.startLevelMusic();
    } else if (trackType === 'map') {
      this.startMapMusic();
    } else if (trackType === 'roulette') {
      this.startRouletteMusic();
    }
  }

  stopMusic() {
    if (this.musicLoopTimer) {
      clearInterval(this.musicLoopTimer);
      this.musicLoopTimer = null;
    }
    this.currentTrack = null;
  }

  // --- MÚSICA RELAJANTE DE NIVELES (Ambient Zen / Lo-Fi Water) ---
  startLevelMusic() {
    // Acordes pentatónicos suaves: Cmaj7, Am7, Fmaj7, Gsus4
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3 (Cmaj7)
      [110.00, 146.83, 174.61, 220.00], // A2, D3, F3, A3 (Am7)
      [87.31, 130.81, 174.61, 220.00],  // F2, C3, F3, A3 (Fmaj7)
      [98.00, 146.83, 196.00, 261.63]   // G2, D3, G3, C4 (Gsus4)
    ];

    const melodyNotes = [
      261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25
    ];

    const playChordStep = () => {
      if (!this.ctx || this.currentTrack !== 'level') return;

      const chordIdx = Math.floor(this.musicStep / 4) % chords.length;
      const currentChord = chords[chordIdx];
      const now = this.ctx.currentTime;

      // Al inicio de cada compás (cada 4 pasos), tocar una almohadilla (pad) cálida
      if (this.musicStep % 4 === 0) {
        currentChord.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = i === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.045, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now);
          osc.stop(now + 4.0);
        });
      }

      // Notas de campanita suave tipo gota de agua (marimba/chime)
      if (Math.random() > 0.3) {
        const noteFreq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(noteFreq, now + 0.1);

        bellGain.gain.setValueAtTime(0.04, now + 0.1);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        bellOsc.connect(bellGain);
        bellGain.connect(this.musicGain);

        bellOsc.start(now + 0.1);
        bellOsc.stop(now + 1.3);
      }

      this.musicStep++;
    };

    playChordStep();
    this.musicLoopTimer = setInterval(playChordStep, 950);
  }

  // --- MÚSICA DISTINTA PARA MAPAS (Exploración / Aventura Acústica) ---
  startMapMusic() {
    // Escala D mayor brillante, arpegios ligeros tipo kalimba
    const scale = [146.83, 185.00, 220.00, 277.18, 293.66, 370.00, 440.00, 554.37, 587.33];
    const bassline = [146.83, 146.83, 185.00, 220.00, 196.00, 196.00, 220.00, 146.83];

    const playMapStep = () => {
      if (!this.ctx || this.currentTrack !== 'map') return;
      const now = this.ctx.currentTime;

      // Bajo rítmico que camina
      const bassFreq = bassline[this.musicStep % bassline.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.06, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.5);

      // Melodía ligera tipo kalimba/marimba
      const noteIdx = (this.musicStep * 3) % scale.length;
      const kalimbaFreq = scale[noteIdx];
      const kOsc = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();

      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(kalimbaFreq, now);

      kGain.gain.setValueAtTime(0.05, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      kOsc.connect(kGain);
      kGain.connect(this.musicGain);
      kOsc.start(now);
      kOsc.stop(now + 0.4);

      this.musicStep++;
    };

    playMapStep();
    this.musicLoopTimer = setInterval(playMapStep, 450);
  }

  // --- MÚSICA ANIMADA PARA LA RULETA (Carnival / Upbeat Arcade) ---
  startRouletteMusic() {
    // 128 BPM rápido, ritmo festivo, bajo saltarín
    const bassNotes = [110.00, 110.00, 130.81, 146.83, 164.81, 146.83, 130.81, 123.47];
    const synthChords = [
      [220.00, 277.18, 329.63], // A major
      [246.94, 293.66, 369.99], // B minor
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00]  // D major
    ];

    const playRouletteStep = () => {
      if (!this.ctx || this.currentTrack !== 'roulette') return;
      const now = this.ctx.currentTime;

      // Bajo enérgico
      const bassFreq = bassNotes[this.musicStep % bassNotes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(600, now);
      bassFilter.frequency.exponentialRampToValueAtTime(200, now + 0.2);

      bassGain.gain.setValueAtTime(0.08, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.24);

      // Acordes rítmicos a contratiempo
      if (this.musicStep % 2 === 1) {
        const chord = synthChords[Math.floor(this.musicStep / 4) % synthChords.length];
        chord.forEach(f => {
          const cOsc = this.ctx.createOscillator();
          const cGain = this.ctx.createGain();
          cOsc.type = 'square';
          cOsc.frequency.setValueAtTime(f, now);

          cGain.gain.setValueAtTime(0.03, now);
          cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          cOsc.connect(cGain);
          cGain.connect(this.musicGain);
          cOsc.start(now);
          cOsc.stop(now + 0.2);
        });
      }

      this.musicStep++;
    };

    playRouletteStep();
    this.musicLoopTimer = setInterval(playRouletteStep, 240);
  }

  // ==========================================================================
  // 2. EFECTOS DE SONIDO (SFX)
  // ==========================================================================

  playSelect() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPourSound() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // Chorro burbujeante modulado
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = i * 0.07;

      osc.type = 'sine';
      const baseFreq = 380 + Math.random() * 260;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 180, now + delay + 0.14);

      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.17);
    }
  }

  playUnlock() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = now + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.35);
    });
  }

  playReveal() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playPegClack() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playComboTone(pitchIndex = 1) {
    if (!this.ready()) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    const freq = pentatonic[Math.min(pitchIndex - 1, pentatonic.length - 1)];

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  playWinFanfare() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const fanfare = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 523.25, t: 0.15, d: 0.15 },
      { f: 523.25, t: 0.3, d: 0.15 },
      { f: 659.25, t: 0.45, d: 0.3 },
      { f: 783.99, t: 0.75, d: 0.6 }
    ];

    fanfare.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + note.t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + note.d + 0.05);
    });
  }

  playFailSound() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Sonido de equivocación / negación (doble tono "uh-uh" con caída armónica y textura de rechazo)
  playInvalidMoveSound() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    const pulses = [
      { start: now, freq: 175, endFreq: 140, dur: 0.085, gain: 0.24 },
      { start: now + 0.10, freq: 125, endFreq: 95, dur: 0.13, gain: 0.28 }
    ];

    pulses.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, p.start);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p.freq, p.start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, p.endFreq), p.start + p.dur);

      gain.gain.setValueAtTime(p.gain, p.start);
      gain.gain.exponentialRampToValueAtTime(0.001, p.start + p.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(p.start);
      osc.stop(p.start + p.dur + 0.02);

      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(p.freq * 0.75, p.start);
      subOsc.frequency.exponentialRampToValueAtTime(Math.max(20, p.endFreq * 0.75), p.start + p.dur);

      subGain.gain.setValueAtTime(p.gain * 0.22, p.start);
      subGain.gain.exponentialRampToValueAtTime(0.001, p.start + p.dur);

      subOsc.connect(filter);
      subGain.connect(this.sfxGain);
      subOsc.start(p.start);
      subOsc.stop(p.start + p.dur + 0.02);
    });
  }

  playDeniedSound() {
    this.playInvalidMoveSound();
  }

  playPop() {
    this.playSelect();
  }

  // Sonido de éxito al cumplir un desafío (campanilla cristalina ascendente y luminosa)
  playChallengeSuccess(step = 0) {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const baseFreqs = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    const f1 = baseFreqs[Math.min(step, baseFreqs.length - 1)];
    const f2 = f1 * 1.5;

    [
      { f: f1, t: 0.0, d: 0.22, vol: 0.22 },
      { f: f2, t: 0.09, d: 0.35, vol: 0.26 }
    ].forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(n.vol, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }

  // Sonido de fallo al no cumplir un desafío (suave tono de descarte con sutil vibrato)
  playChallengeFail() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.08);
    osc.frequency.linearRampToValueAtTime(145, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.32);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Aplausos y ovación multitudinaria al ganar en la ruleta
  playCrowdCheer() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // Generar buffer de ruido para textura de aplausos
    const bufferSize = Math.floor(this.ctx.sampleRate * 2.2);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 2.2);

    // Silbido y ovación armónica festiva
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(950, now + 0.2);
    whistle.frequency.exponentialRampToValueAtTime(1750, now + 0.6);
    whistle.frequency.exponentialRampToValueAtTime(1200, now + 1.2);

    whistleGain.gain.setValueAtTime(0.001, now + 0.2);
    whistleGain.gain.linearRampToValueAtTime(0.09, now + 0.5);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

    whistle.connect(whistleGain);
    whistleGain.connect(this.sfxGain);
    whistle.start(now + 0.2);
    whistle.stop(now + 1.4);
  }

  // Decepción / "Awwwww" del público al perder en la ruleta
  playDisappointedCrowd() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // Ruido con filtro descendente ("Awww...")
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.8);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 1.4);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 1.6);

    // Acorde menor melancólico descendente
    const sadNotes = [146.83, 174.61, 220.00];
    sadNotes.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 1.2);

      const fFilter = this.ctx.createBiquadFilter();
      fFilter.type = 'lowpass';
      fFilter.frequency.setValueAtTime(400, now + 0.1);

      sGain.gain.setValueAtTime(0.08, now + 0.1);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(fFilter);
      fFilter.connect(sGain);
      sGain.connect(this.sfxGain);
      osc.start(now + 0.1);
      osc.stop(now + 1.5);
    });
  }

  // Lanzamiento de dardo (silbido de aire / swoosh)
  playDartThrow() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Impacto de dardo en la diana (thud seco de madera)
  playDartHit() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Ráfaga de viento para la diana
  playWindGust() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(450, now + 0.5);
    filter.frequency.linearRampToValueAtTime(280, now + 1.0);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 1.0);
  }

  // Error de frasco pegado (zumbido metálico trabado)
  playGluedError() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.setValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // Efecto químico inesperado / ebullición y desborde por sobrecarga en tubo 1x1
  playChemicalReactionSound() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // 1. Burbujeo rápido / ebullición química modulada
    const osc = this.ctx.createOscillator();
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    modOsc.frequency.setValueAtTime(45, now);
    modOsc.frequency.linearRampToValueAtTime(15, now + 0.65);
    modGain.gain.setValueAtTime(140, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(620, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.7);

    modOsc.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    modOsc.start(now);
    osc.start(now);
    modOsc.stop(now + 0.75);
    osc.stop(now + 0.75);

    // 2. Chispazo / escape de vapor a presión
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.65);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.6);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.65);
    } catch (e) {}
  }

  // Fanfarria Real Triunfal: Concesión de la Medalla de Honor Alquímica
  playHonorVictory() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 261.63, t: 0.00, d: 0.20 }, // C4
      { f: 329.63, t: 0.16, d: 0.20 }, // E4
      { f: 392.00, t: 0.32, d: 0.22 }, // G4
      { f: 523.25, t: 0.48, d: 0.45 }, // C5
      { f: 659.25, t: 0.70, d: 0.30 }, // E5
      { f: 783.99, t: 0.90, d: 0.75 }  // G5 (acorde final sostenido)
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.2, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  // Tic tac sutil del temporizador de honor cuando queda poco tiempo
  playHonorTimerTick() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Sonido de crujido y fisura de vidrio al introducir un color no afín
  playGlassCrack(severity = 1) {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // Ruido impulsivo de impacto inicial
    const baseFreq = severity === 2 ? 3200 : 2600;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Segundo chasquido agudo desfasado
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 1.25, t);
      osc2.frequency.exponentialRampToValueAtTime(800, t + 0.08);

      gain2.gain.setValueAtTime(0.2, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t);
      osc2.stop(t + 0.1);
    }, 35);
  }

  // Estallido de cristal rompiéndose en mil pedazos
  playGlassShatter() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // 1. Estallido de ruido blanco filtrado
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1600, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.45);
    } catch (e) {}

    // 2. Cascadas de cristales rotos tintineando en caída
    const shardFreqs = [3800, 4600, 5200, 2900, 6100];
    shardFreqs.forEach((freq, idx) => {
      const startT = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, startT + 0.18);

      gain.gain.setValueAtTime(0.18, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startT);
      osc.stop(startT + 0.2);
    });
  }

  // Estallido de Cataclismo Cósmico (Easter Egg: El Mundo Explotando)
  playWorldExplosion() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // 1. Estruendo Sísmico Grave Sub-Bass (80Hz -> 20Hz)
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 1.8);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 2.1);
    } catch (e) {}

    // 2. Onda expansiva masiva con Ruido Blanco de Frecuencia Descendente
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 2.2);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 2.0);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 2.2);
    } catch (e) {}

    // 3. Destellos / Chispas agudas de escombros celestes en dispersión
    const debrisPitches = [950, 720, 540, 380, 210];
    debrisPitches.forEach((freq, idx) => {
      try {
        const startT = now + 0.08 + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startT);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, startT + 0.35);

        gain.gain.setValueAtTime(0.25, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(startT);
        osc.stop(startT + 0.38);
      } catch (e) {}
    });
  }

  // Sonido cómico de explosión de laboratorio (Final Malo)
  playLabExplosion() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // 1. Silbido ascendente de olla a presión
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.28);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}

    // 2. Detonación cómica con estrépito
    setTimeout(() => {
      try {
        const t2 = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t2);
        filter.frequency.exponentialRampToValueAtTime(90, t2 + 0.85);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t2);
        gain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.9);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        whiteNoise.start(t2);
        whiteNoise.stop(t2 + 0.9);

        // Clink de cristal roto al final
        setTimeout(() => {
          if (typeof this.playGlassShatter === 'function') this.playGlassShatter();
        }, 320);
      } catch (e) {}
    }, 280);
  }

  // Sonido cómico de estornudo alérgico por plátanos (Final Regular)
  playBananaSneeze() {
    if (!this.ready()) return;
    const now = this.ctx.currentTime;

    // 1. Inhalación cómica "Ah... ah..."
    try {
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(480, now + 0.22);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.25);
    } catch (e) {}

    // 2. Estornudo explosivo "...¡¡CHÚÚÚ!!" con rebote de resorte
    setTimeout(() => {
      try {
        const t2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(750, t2);
        osc2.frequency.exponentialRampToValueAtTime(140, t2 + 0.35);

        gain2.gain.setValueAtTime(0.5, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.4);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(t2);
        osc2.stop(t2 + 0.42);

        // Boing cómico de banana elástica
        const osc3 = this.ctx.createOscillator();
        const gain3 = this.ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(220, t2 + 0.15);
        osc3.frequency.linearRampToValueAtTime(540, t2 + 0.32);
        osc3.frequency.linearRampToValueAtTime(300, t2 + 0.5);

        gain3.gain.setValueAtTime(0.25, t2 + 0.15);
        gain3.gain.exponentialRampToValueAtTime(0.001, t2 + 0.55);

        osc3.connect(gain3);
        gain3.connect(this.sfxGain);
        osc3.start(t2 + 0.15);
        osc3.stop(t2 + 0.58);
      } catch (e) {}
    }, 280);
  }
}

// Instancia global
window.audio = new ProceduralAudioEngine();
