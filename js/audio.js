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

  // Aplausos y ovación multitudinaria al ganar en la ruleta
  playCrowdCheer() {
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
    if (this.isMuted) return;
    this.init();
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
}

// Instancia global
window.audio = new ProceduralAudioEngine();
