/* ==========================================================================
   AQUASORT MASTER DELUXE - PROCEDURAL AUDIO ENGINE
   Sintetizador Web Audio API: Música de Niveles, Música de Mapas y Ruleta
   ========================================================================== */

const MUSIC_TRACKS = [
  {
    id: 'track_zen',
    name: 'Zen Alquímico',
    genre: 'Ambient Chill / Gotas de Agua',
    icon: 'droplets',
    sectionName: 'Cap. 1: Laboratorio Escolar (Niveles 1-10)',
    levelRange: [1, 10],
    description: 'Pads etéreos aterciopelados y campanitas pentatónicas que transmiten serenidad pura y gotas cristalinas.'
  },
  {
    id: 'track_mystery',
    name: 'Misterio Nocturno',
    genre: 'Lo-Fi Cósmico / Piano Eólico',
    icon: 'moon',
    sectionName: 'Cap. 2: Líquidos Ocultos & Candados (Niveles 11-20, 31-40)',
    levelRange: [11, 20],
    description: 'Acordes en modo eólico con notas espaciadas de piano de medianoche que invitan a la introspección.'
  },
  {
    id: 'track_bossa',
    name: 'Bossa de los Frascos',
    genre: 'Bossa Nova Jazz Relajante',
    icon: 'coffee',
    sectionName: 'Cap. 3: Frascos Gigantes & Tubos Estrechos (Niveles 21-30, 41-50)',
    levelRange: [21, 30],
    description: 'Cadencia de bossa suave con bajo sincopado cálido, acordes de novena y sutil escobilla con swing brasileño.'
  },
  {
    id: 'track_tropical',
    name: 'Laguna Tropical',
    genre: 'Calypso & Marimba Relajante',
    icon: 'palmtree',
    sectionName: 'Cap. 4: Frascos en Roca & Naturaleza (Niveles 51-60)',
    levelRange: [51, 60],
    description: 'Marimba de madera caribeña, cadencia veraniega suave y brisa marina que acompaña con calma paradisíaca.'
  },
  {
    id: 'track_coral',
    name: 'Mar de Coral',
    genre: 'Bossa-Tropical Exótica',
    icon: 'waves',
    sectionName: 'Cap. 5: Líquido Camaleón (Niveles 61-70)',
    levelRange: [61, 70],
    description: 'Armonías fluidas que mutan de color como el líquido camaleón entre arrecifes de coral y olas cristalinas.'
  },
  {
    id: 'track_cristal',
    name: 'Cristal Efervescente',
    genre: 'Neo-Soul & Jazz Acuático',
    icon: 'sparkles',
    sectionName: 'Cap. 6: Cristales Frágiles & Reacciones (Niveles 71-80)',
    levelRange: [71, 80],
    description: 'Glockenspiel que tintinea como burbujas al reaccionar químicamente y armonías jazzísticas sofisticadas.'
  },
  {
    id: 'track_magna',
    name: 'Sinfonía del Destino',
    genre: 'Ambient Orquestal Suave',
    icon: 'crown',
    sectionName: 'Cap. 7: Conjunción Híbrida & Obra Magna (Niveles 81-100)',
    levelRange: [81, 100],
    description: 'Pads orquestales majestuosos de violonchelo suave y campanas celestiales que celebran la maestría alquímica.'
  },
  {
    id: 'track_time_attack',
    name: 'Pulso Contrarreloj',
    genre: 'Chillwave Hipnótico',
    icon: 'hourglass',
    sectionName: 'Modo Contrarreloj (Time Attack)',
    isSpecial: true,
    description: 'Arpegio fluido y pulso rítmico lo-fi a 108 BPM que acompaña el reto con concentración zen y sin estrés.'
  },
  {
    id: 'track_map',
    name: 'Senda de la Kalimba',
    genre: 'Exploración Acústica',
    icon: 'map',
    sectionName: 'Mapa de Aventura',
    isSpecial: true,
    description: 'Kalimba africana y contrabajo caminante durante los viajes de exploración por el archipiélago.'
  },
  {
    id: 'track_roulette',
    name: 'Vals de la Ruleta',
    genre: 'Caja de Música / Arcade Suave',
    icon: 'dices',
    sectionName: 'Ruleta de la Fortuna y Diana',
    isSpecial: true,
    description: 'Pizzicato alegre y festivo que celebra la emoción de cada tirada de la suerte.'
  }
];

class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.5;

    // Estados de música activa
    this.currentTrack = null;      // tipo de contexto: 'level', 'map', 'roulette', 'time_attack'
    this.currentTrackId = null;    // id específico del tema: 'track_zen', 'track_bossa', etc.
    this.pendingTrack = null;
    this.pendingContext = null;
    this.hasUserInteracted = false;
    this.musicLoopTimer = null;
    this.musicStep = 0;
    this.activeNodes = [];
    this.noiseBuffer = null;

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
        const ctxParam = this.pendingContext;
        this.pendingTrack = null;
        this.pendingContext = null;
        this.playMusic(trk, ctxParam);
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
  // 1. SISTEMA DE MÚSICA PROCEDURAL Y CATÁLOGO DE TEMAS
  // ==========================================================================

  getTracksCatalog() {
    return MUSIC_TRACKS;
  }

  getCurrentTrackInfo() {
    if (!this.currentTrackId) return null;
    return MUSIC_TRACKS.find(t => t.id === this.currentTrackId) || null;
  }

  createNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  playShakerTap(now, gainLevel = 0.005) {
    if (!this.ctx) return;
    const buf = this.createNoiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(now);
    src.stop(now + 0.07);
  }

  resolveLevelTrack(levelContext) {
    if (levelContext === 'time_attack') return 'track_time_attack';
    
    // Nivel por defecto según progresión de mecánicas y capítulos
    let preferredTrackId = 'track_zen';
    if (typeof levelContext === 'number') {
      if (levelContext >= 81) preferredTrackId = 'track_magna';
      else if (levelContext >= 71) preferredTrackId = 'track_cristal';
      else if (levelContext >= 61) preferredTrackId = 'track_coral';
      else if (levelContext >= 51) preferredTrackId = 'track_tropical';
      else if (levelContext >= 41) preferredTrackId = 'track_bossa';
      else if (levelContext >= 31) preferredTrackId = 'track_mystery';
      else if (levelContext >= 21) preferredTrackId = 'track_bossa';
      else if (levelContext >= 11) preferredTrackId = 'track_mystery';
      else preferredTrackId = 'track_zen';
    } else if (levelContext === 'casual') {
      // En modo casual rotamos entre los temas relajantes
      const casualOptions = ['track_zen', 'track_bossa', 'track_tropical', 'track_coral', 'track_cristal'];
      const enabledCasual = casualOptions.filter(t => !window.stateManager || !window.stateManager.isMusicTrackDisabled(t));
      if (enabledCasual.length > 0) {
        return enabledCasual[Math.floor(Math.random() * enabledCasual.length)];
      }
    }

    // Comprobar si el usuario deshabilitó este tema en Opciones
    const sm = window.stateManager;
    if (sm && sm.isMusicTrackDisabled(preferredTrackId)) {
      const levelTracks = ['track_zen', 'track_bossa', 'track_tropical', 'track_mystery', 'track_coral', 'track_cristal', 'track_magna'];
      const enabled = levelTracks.filter(id => !sm.isMusicTrackDisabled(id));
      if (enabled.length > 0) {
        const idx = (typeof levelContext === 'number' ? levelContext - 1 : 0) % enabled.length;
        return enabled[idx];
      }
      return null; // Todos los temas de niveles están desactivados por el usuario
    }

    return preferredTrackId;
  }

  playMusic(trackType, contextParam = null) {
    if (!this.hasUserInteracted) {
      this.pendingTrack = trackType;
      this.pendingContext = contextParam;
      return;
    }

    if (!this.init()) {
      this.pendingTrack = trackType;
      this.pendingContext = contextParam;
      return;
    }

    if (trackType === 'level') {
      const trackId = this.resolveLevelTrack(contextParam);
      if (trackId) {
        this.playTrack(trackId);
      } else {
        this.stopMusic();
      }
    } else if (trackType === 'time_attack') {
      const isDis = window.stateManager && window.stateManager.isMusicTrackDisabled('track_time_attack');
      if (isDis) {
        const fallback = this.resolveLevelTrack('casual');
        if (fallback) this.playTrack(fallback);
        else this.stopMusic();
      } else {
        this.playTrack('track_time_attack');
      }
    } else if (trackType === 'map') {
      const isDis = window.stateManager && window.stateManager.isMusicTrackDisabled('track_map');
      if (!isDis) this.playTrack('track_map');
      else this.stopMusic();
    } else if (trackType === 'roulette') {
      const isDis = window.stateManager && window.stateManager.isMusicTrackDisabled('track_roulette');
      if (!isDis) this.playTrack('track_roulette');
      else this.stopMusic();
    }
  }

  playTrack(trackId) {
    if (!this.hasUserInteracted) {
      this.pendingTrack = trackId;
      return;
    }

    if (!this.init()) {
      this.pendingTrack = trackId;
      return;
    }

    // Si ya está sonando este mismo tema en el bucle, no interrumpir
    if (this.currentTrackId === trackId && this.musicLoopTimer) return;

    this.stopMusic();
    this.currentTrackId = trackId;
    this.currentTrack = trackId;
    this.musicStep = 0;

    switch (trackId) {
      case 'track_zen':
        this.startZenMusic();
        break;
      case 'track_mystery':
        this.startMysteryMusic();
        break;
      case 'track_bossa':
        this.startBossaMusic();
        break;
      case 'track_tropical':
        this.startTropicalMusic();
        break;
      case 'track_coral':
        this.startCoralMusic();
        break;
      case 'track_cristal':
        this.startCrystalMusic();
        break;
      case 'track_magna':
        this.startMagnaMusic();
        break;
      case 'track_time_attack':
        this.startTimeAttackMusic();
        break;
      case 'track_map':
        this.startMapMusic();
        break;
      case 'track_roulette':
        this.startRouletteMusic();
        break;
      default:
        this.startZenMusic();
        break;
    }

    // Notificar cambio de tema para que el UI se actualice
    try {
      window.dispatchEvent(new CustomEvent('aquasort:trackchange', {
        detail: { trackId, track: this.getCurrentTrackInfo() }
      }));
    } catch (e) {}
  }

  onTrackToggled(trackId, isDisabled) {
    if (this.currentTrackId === trackId && isDisabled) {
      // El tema que estaba sonando fue desactivado por el usuario, pasar a otro
      const sm = window.stateManager;
      const levelTracks = ['track_zen', 'track_bossa', 'track_tropical', 'track_mystery', 'track_coral', 'track_cristal', 'track_magna'];
      const enabled = levelTracks.filter(id => !sm || !sm.isMusicTrackDisabled(id));
      if (enabled.length > 0) {
        this.playTrack(enabled[0]);
      } else {
        this.stopMusic();
      }
    }
  }

  stopMusic() {
    if (this.musicLoopTimer) {
      clearInterval(this.musicLoopTimer);
      this.musicLoopTimer = null;
    }
    this.currentTrack = null;
    this.currentTrackId = null;

    try {
      window.dispatchEvent(new CustomEvent('aquasort:trackchange', {
        detail: { trackId: null, track: null }
      }));
    } catch (e) {}
  }

  // --- 1. TEMA ZEN ALQUÍMICO (Ambient Chill / Gotas de Agua) ---
  startZenMusic() {
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3 (Cmaj7)
      [110.00, 146.83, 174.61, 220.00], // A2, D3, F3, A3 (Am7)
      [87.31, 130.81, 174.61, 220.00],  // F2, C3, F3, A3 (Fmaj7)
      [98.00, 146.83, 196.00, 261.63]   // G2, D3, G3, C4 (Gsus4)
    ];

    const melodyNotes = [
      261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25
    ];

    const playStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_zen') return;

      const chordIdx = Math.floor(this.musicStep / 4) % chords.length;
      const currentChord = chords[chordIdx];
      const now = this.ctx.currentTime;

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

      if (Math.random() > 0.3) {
        const noteFreq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(noteFreq, now + 0.1);

        bellGain.gain.setValueAtTime(0.038, now + 0.1);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        bellOsc.connect(bellGain);
        bellGain.connect(this.musicGain);

        bellOsc.start(now + 0.1);
        bellOsc.stop(now + 1.3);
      }

      this.musicStep++;
    };

    playStep();
    this.musicLoopTimer = setInterval(playStep, 950);
  }

  // --- 2. TEMA BOSSA DE LOS FRASCOS (Bossa Nova Jazz Relajante) ---
  startBossaMusic() {
    // Progresión cálida de bossa nova: Fmaj9 -> Em7 -> Dm9 -> Cmaj7
    const bossaChords = [
      [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4 (Fmaj9)
      [164.81, 196.00, 246.94, 293.66],         // E3, G3, B3, D4 (Em7)
      [146.83, 174.61, 220.00, 261.63, 329.63], // D3, F3, A3, C4, E4 (Dm9)
      [130.81, 164.81, 196.00, 246.94]          // C3, E3, G3, B3 (Cmaj7)
    ];

    const bossaBassNotes = [
      87.31,  130.81, // F2, C3
      82.41,  123.47, // E2, B2
      73.42,  110.00, // D2, A2
      65.41,  98.00   // C2, G2
    ];

    const playBossaStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_bossa') return;
      const now = this.ctx.currentTime;
      const compasStep = this.musicStep % 4;
      const chordIdx = Math.floor(this.musicStep / 4) % bossaChords.length;
      const currentChord = bossaChords[chordIdx];

      // Bajo de Bossa Nova acústico y sincopado
      const bassIndex = (chordIdx * 2) + (compasStep >= 2 ? 1 : 0);
      const bassFreq = bossaBassNotes[bassIndex % bossaBassNotes.length];
      if (compasStep === 0 || compasStep === 2) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        const bFilter = this.ctx.createBiquadFilter();

        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bassFreq, now);

        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(260, now);

        bGain.gain.setValueAtTime(0.065, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.musicGain);

        bOsc.start(now);
        bOsc.stop(now + 0.6);
      }

      // Rasgueo suave de guitarra de nylon / Rhodes con séptimas
      if (compasStep === 0 || compasStep === 3) {
        currentChord.forEach((freq, idx) => {
          const chordOsc = this.ctx.createOscillator();
          const chordGain = this.ctx.createGain();
          const chordFilter = this.ctx.createBiquadFilter();

          const stagger = now + (idx * 0.015);
          chordOsc.type = 'sine';
          chordOsc.frequency.setValueAtTime(freq, stagger);

          chordFilter.type = 'lowpass';
          chordFilter.frequency.setValueAtTime(750, stagger);

          chordGain.gain.setValueAtTime(0.001, stagger);
          chordGain.gain.linearRampToValueAtTime(0.024, stagger + 0.04);
          chordGain.gain.exponentialRampToValueAtTime(0.0005, stagger + 0.65);

          chordOsc.connect(chordFilter);
          chordFilter.connect(chordGain);
          chordGain.connect(this.musicGain);

          chordOsc.start(stagger);
          chordOsc.stop(stagger + 0.7);
        });
      }

      // Shaker/escobilla acústica con swing brasileño
      this.playShakerTap(now, 0.0035);
      if (compasStep === 1 || compasStep === 3) {
        this.playShakerTap(now + 0.35, 0.0045);
      }

      this.musicStep++;
    };

    playBossaStep();
    this.musicLoopTimer = setInterval(playBossaStep, 720);
  }

  // --- 3. TEMA LAGUNA TROPICAL (Calypso & Marimba Relajante) ---
  startTropicalMusic() {
    // Escala pentatónica caribeña en G mayor
    const scale = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88];
    const bassline = [98.00, 146.83, 110.00, 146.83, 82.41, 123.47, 98.00, 146.83];
    const melodyPattern = [0, 2, 4, 3, 5, 4, 2, 1, 3, 5, 7, 5, 4, 2, 3, 0];

    const playTropicalStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_tropical') return;
      const now = this.ctx.currentTime;

      // Bajo caminante tropical cálido
      const bassFreq = bassline[this.musicStep % bassline.length];
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bGain.gain.setValueAtTime(0.06, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      bOsc.connect(bGain);
      bGain.connect(this.musicGain);
      bOsc.start(now);
      bOsc.stop(now + 0.5);

      // Marimba de madera caribeña (fundamental + 3er armónico cálido)
      const noteIdx = melodyPattern[this.musicStep % melodyPattern.length];
      const freq = scale[noteIdx];

      const mOsc1 = this.ctx.createOscillator();
      const mOsc2 = this.ctx.createOscillator();
      const mGain = this.ctx.createGain();
      const mFilter = this.ctx.createBiquadFilter();

      mOsc1.type = 'sine';
      mOsc1.frequency.setValueAtTime(freq, now);

      mOsc2.type = 'sine';
      mOsc2.frequency.setValueAtTime(freq * 3.01, now); // Click amaderado característico

      mFilter.type = 'bandpass';
      mFilter.frequency.setValueAtTime(750, now);
      mFilter.Q.setValueAtTime(2.2, now);

      mGain.gain.setValueAtTime(0.05, now);
      mGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.38);

      mOsc1.connect(mGain);
      mOsc2.connect(mFilter);
      mFilter.connect(mGain);
      mGain.connect(this.musicGain);

      mOsc1.start(now);
      mOsc2.start(now);
      mOsc1.stop(now + 0.42);
      mOsc2.stop(now + 0.42);

      // Suave shaker caribeño
      if (this.musicStep % 2 === 1) {
        this.playShakerTap(now, 0.003);
      }

      this.musicStep++;
    };

    playTropicalStep();
    this.musicLoopTimer = setInterval(playTropicalStep, 560);
  }

  // --- 4. TEMA MISTERIO NOCTURNO (Lo-Fi Cósmico / Piano Eólico) ---
  startMysteryMusic() {
    const mysteryChords = [
      [146.83, 220.00, 261.63, 329.63, 392.00], // Dm9
      [116.54, 174.61, 233.08, 293.66, 369.99], // Bbmaj7(#11)
      [98.00, 146.83, 196.00, 293.66, 329.63],  // Gm9
      [110.00, 164.81, 220.00, 293.66, 311.13]  // Asus4(b9)
    ];

    const pianoNotes = [293.66, 349.23, 440.00, 523.25, 587.33, 698.46, 783.99];

    const playMysteryStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_mystery') return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(this.musicStep / 4) % mysteryChords.length;
      const currentChord = mysteryChords[chordIdx];

      // Pad nocturno con filtro oscuro que respira suavemente
      if (this.musicStep % 4 === 0) {
        currentChord.forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, now);
          filter.frequency.linearRampToValueAtTime(520, now + 1.8);
          filter.frequency.linearRampToValueAtTime(320, now + 3.6);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.032, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.7);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now);
          osc.stop(now + 3.9);
        });
      }

      // Gotas de piano de medianoche dispersas
      if (Math.random() > 0.4) {
        const pFreq = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
        const pOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        const pFilter = this.ctx.createBiquadFilter();

        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(pFreq, now);

        pFilter.type = 'lowpass';
        pFilter.frequency.setValueAtTime(1100, now);

        pGain.gain.setValueAtTime(0.04, now);
        pGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        pOsc.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(this.musicGain);

        pOsc.start(now);
        pOsc.stop(now + 1.6);
      }

      this.musicStep++;
    };

    playMysteryStep();
    this.musicLoopTimer = setInterval(playMysteryStep, 920);
  }

  // --- 5. TEMA MAR DE CORAL (Bossa-Tropical Exótica) ---
  startCoralMusic() {
    const coralChords = [
      [220.00, 277.18, 329.63, 415.30], // Amaj7
      [185.00, 220.00, 277.18, 329.63], // F#m7
      [246.94, 293.66, 369.99, 440.00], // Bm7
      [164.81, 246.94, 293.66, 370.00]  // E7sus4
    ];

    const arpeggios = [
      [220.00, 277.18, 329.63, 440.00],
      [277.18, 329.63, 415.30, 554.37],
      [246.94, 293.66, 369.99, 493.88],
      [196.00, 246.94, 293.66, 392.00]
    ];

    const playCoralStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_coral') return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(this.musicStep / 4) % coralChords.length;

      // Sub-bajo oceánico profundo
      if (this.musicStep % 2 === 0) {
        const bassFreq = coralChords[chordIdx][0] / 2;
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bGain.gain.setValueAtTime(0.07, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        bOsc.connect(bGain);
        bGain.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + 0.9);
      }

      // Arpegio flotante de coral
      const arpNotes = arpeggios[chordIdx];
      const noteFreq = arpNotes[this.musicStep % arpNotes.length];
      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'sine';
      arpOsc.frequency.setValueAtTime(noteFreq, now);

      arpGain.gain.setValueAtTime(0.038, now);
      arpGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.55);

      arpOsc.connect(arpGain);
      arpGain.connect(this.musicGain);

      arpOsc.start(now);
      arpOsc.stop(now + 0.6);

      this.playShakerTap(now, 0.0025);
      this.musicStep++;
    };

    playCoralStep();
    this.musicLoopTimer = setInterval(playCoralStep, 640);
  }

  // --- 6. TEMA CRISTAL EFERVESCENTE (Neo-Soul & Jazz Acuático) ---
  startCrystalMusic() {
    const jazzChords = [
      [155.56, 196.00, 233.08, 293.66, 349.23], // Ebmaj9
      [130.81, 155.56, 196.00, 233.08, 293.66], // Cm9
      [174.61, 207.65, 261.63, 311.13, 392.00], // Fm9
      [116.54, 185.00, 233.08, 293.66, 349.23]  // Bb13
    ];

    const sparkleBells = [1046.50, 1174.66, 1244.51, 1396.91, 1567.98, 1864.66, 2093.00];

    const playCrystalStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_cristal') return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(this.musicStep / 4) % jazzChords.length;
      const chord = jazzChords[chordIdx];

      // Acordes aterciopelados estilo Rhodes
      if (this.musicStep % 4 === 0) {
        chord.forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(650, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.025, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now);
          osc.stop(now + 2.6);
        });
      }

      // Tintineo de glockenspiel acuático / burbujas químicas
      if (Math.random() > 0.35) {
        const bellFreq = sparkleBells[Math.floor(Math.random() * sparkleBells.length)];
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();

        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bellFreq, now);

        bGain.gain.setValueAtTime(0.028, now);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

        bOsc.connect(bGain);
        bGain.connect(this.musicGain);

        bOsc.start(now);
        bOsc.stop(now + 0.95);
      }

      this.musicStep++;
    };

    playCrystalStep();
    this.musicLoopTimer = setInterval(playCrystalStep, 680);
  }

  // --- 7. TEMA SINFONÍA DEL DESTINO (Ambient Orquestal Suave) ---
  startMagnaMusic() {
    const magnaChords = [
      [146.83, 220.00, 277.18, 370.00, 440.00], // Dmaj7
      [123.47, 185.00, 220.00, 293.66, 370.00], // Bm9
      [98.00, 146.83, 196.00, 293.66, 370.00],  // Gmaj7
      [110.00, 164.81, 220.00, 293.66, 440.00]  // Asus4
    ];

    const cathedralChimes = [587.33, 739.99, 880.00, 1174.66];

    const playMagnaStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_magna') return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(this.musicStep / 4) % magnaChords.length;
      const chord = magnaChords[chordIdx];

      // Pad orquestal cálido con violonchelo sintético
      if (this.musicStep % 4 === 0) {
        chord.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 1.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now);
          osc.stop(now + 4.0);
        });

        // Campana dorada en el cambio armónico
        const chimeFreq = cathedralChimes[chordIdx % cathedralChimes.length];
        const cOsc = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();

        cOsc.type = 'sine';
        cOsc.frequency.setValueAtTime(chimeFreq, now);

        cGain.gain.setValueAtTime(0.035, now);
        cGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

        cOsc.connect(cGain);
        cGain.connect(this.musicGain);

        cOsc.start(now);
        cOsc.stop(now + 2.3);
      }

      this.musicStep++;
    };

    playMagnaStep();
    this.musicLoopTimer = setInterval(playMagnaStep, 980);
  }

  // --- 8. TEMA PULSO CONTRARRELOJ (Chillwave Hipnótico 108 BPM) ---
  startTimeAttackMusic() {
    const arpNotes = [
      220.00, 261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 523.25,
      440.00, 392.00, 329.63, 261.63, 329.63, 392.00, 440.00, 523.25
    ];

    const subPulseNotes = [55.00, 65.41, 73.42, 65.41]; // A1, C2, D2, C2

    const playTimeAttackStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_time_attack') return;
      const now = this.ctx.currentTime;

      // Arpegio chillwave hipnótico en semicorcheas
      const noteFreq = arpNotes[this.musicStep % arpNotes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.26);

      // Pulso sub-bass en cada negra (cada 4 pasos)
      if (this.musicStep % 4 === 0) {
        const subFreq = subPulseNotes[Math.floor(this.musicStep / 4) % subPulseNotes.length];
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(subFreq, now);

        subGain.gain.setValueAtTime(0.07, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        subOsc.connect(subGain);
        subGain.connect(this.musicGain);

        subOsc.start(now);
        subOsc.stop(now + 0.38);
      }

      this.musicStep++;
    };

    playTimeAttackStep();
    this.musicLoopTimer = setInterval(playTimeAttackStep, 280);
  }

  // --- 9. MÚSICA PARA MAPAS (Exploración / Aventura Acústica) ---
  startMapMusic() {
    const scale = [146.83, 185.00, 220.00, 277.18, 293.66, 370.00, 440.00, 554.37, 587.33];
    const bassline = [146.83, 146.83, 185.00, 220.00, 196.00, 196.00, 220.00, 146.83];

    const playMapStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_map') return;
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

  // --- 10. MÚSICA ANIMADA PARA LA RULETA (Carnival / Upbeat Arcade) ---
  startRouletteMusic() {
    const bassNotes = [110.00, 110.00, 130.81, 146.83, 164.81, 146.83, 130.81, 123.47];
    const synthChords = [
      [220.00, 277.18, 329.63], // A major
      [246.94, 293.66, 369.99], // B minor
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00]  // D major
    ];

    const playRouletteStep = () => {
      if (!this.ctx || this.currentTrackId !== 'track_roulette') return;
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

  // Chime misterioso celestial para descubrimiento de secretos / Easter Egg
  playMysteryChime() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Arpegio místico pentatónico brillante: E6 (1318), G#6 (1661), B6 (1975), D#7 (2489), E7 (2637)
      const freqs = [1318.5, 1661.2, 1975.5, 2489.0, 2637.0];
      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.085;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + 1.25);
      });
    } catch (e) {}
  }
}

// Instancia global
window.audio = new ProceduralAudioEngine();
