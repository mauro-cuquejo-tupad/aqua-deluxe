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
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

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
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
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
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
}

// Instancia global
window.audio = new ProceduralAudioEngine();
