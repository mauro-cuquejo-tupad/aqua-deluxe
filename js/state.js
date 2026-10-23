/* ==========================================================================
   AQUASORT MASTER DELUXE - STATE & UPGRADES MANAGER
   Persistencia integral (aquasort_state_v1), guardado/carga en archivo,
   economía rebalanceada, sistema de vidas (3 vidas / 10min) y niveles creados.
   ========================================================================== */

const STORAGE_KEY = 'aquasort_state_v1';
const LIFE_REGEN_TIME_MS = 600000; // 10 minutos por vida

const DEFAULT_STATE = {
  player: {
    nickname: 'Alquimista',
    coins: 0,
    lives: 3,
    maxLives: 3,
    lastLifeLostTimestamp: null
  },
  upgrades: {
    cooldownReductionLevel: 1, // Nivel 1 = 100 movs, 2 = 75, 3 = 50, 4 = 25
    maxStoredHints: 3,         // 3, 5, 8
    rouletteBoost: false       // Ruleta/Diana sin penalización por pérdida
  },
  cards: {
    dianaFavor: 2,       // +80% prob de Diana
    rouletteFavor: 2,    // +80% prob de Ruleta
    doubleOrNothing: 2,  // Ruleta: 2 colores, x2.0, todo o nada
    calmAtmosphere: 2,   // Diana: Viento 0, Medidor Lento o Tiro Extra
    trajectorySight: 2   // Diana: Predicción de parábola (sin viento)
  },
  progress: {
    unlockedLevel: 1,
    completedLevels: {},       // { "1": { stars: 3, bestMoves: 8, bestTimeSec: 15, usedHints: false } }
    completedChallenges: {},   // { "1": { completedCount: 1, totalCount: 1, completedIds: [], bonusCoins: 3 } }
    honorMastery: {},          // { [sectionId]: { completed: boolean, lives: number, failedDate: string | null } }
    seenTutorials: []          // Lista de tutoriales ya vistos
  },
  minigameBag: {
    tokens: ['diana', 'diana', 'diana', 'roulette', 'roulette', 'roulette'],
    activeCard: null,         // 'dianaFavor' | 'rouletteFavor' | null
    cardUsesRemaining: 0     // Cantidad de minijuegos restantes con beneficio activo
  },
  settings: {
    showAccessibilityPatterns: false, // Por defecto desactivado: líquidos puros y limpios
    disabledMechanics: [],            // Mecánicas deshabilitadas por personalización de dificultad
    visualComfortMode: false          // Modo Descanso Visual / Filtro Lentes Amarillos
  },
  secretEasterEgg: {
    discoveredNames: [],              // Nombres descubiertos por 5s tap: ['mirko', 'tom', 'nina', 'matilda', 'bianca', 'zoila', 'freya']
    allDiscovered: false              // True cuando se descubren los 7 nombres
  },
  achievements: {
    unlocked: {},                     // { [id]: ISOString }
    progress: {}                      // { [id]: number }
  },
  timeAttackRecord: {
    bestScore: 0,
    bestTimeSec: 0,
    bestTubesCleared: 0
  },
  sandboxStats: {
    levelsCompleted: 0
  },
  customLevels: [],            // Niveles creados por el usuario [{ id, name, author, tubes, verified: true }]
  auxiliaryCooldownRemaining: 0 // Movimientos restantes para usar botella extra (persistente)
};

// Funciones auxiliares para persistencia en Cookies
function setCookie(name, value, days = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
  } catch (e) {
    console.warn('No se pudo guardar cookie:', e);
  }
}

function getCookie(name) {
  try {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(cname) === 0) {
        return c.substring(cname.length, c.length);
      }
    }
  } catch (e) {
    console.warn('No se pudo leer cookie:', e);
  }
  return "";
}

class StateManager {
  constructor() {
    this.state = this.loadState();
    this.regenerateLives();
  }

  loadState() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn('LocalStorage inaccesible, intentando cookie:', e);
    }

    // Si localStorage estaba vacío o falló (ej. Safari privado/iOS), recurrir a Cookie
    if (!saved) {
      const fromCookie = getCookie(STORAGE_KEY);
      if (fromCookie) {
        saved = fromCookie;
        try {
          localStorage.setItem(STORAGE_KEY, fromCookie);
        } catch (e) {}
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          player: { ...DEFAULT_STATE.player, ...parsed.player },
          upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
          cards: { ...DEFAULT_STATE.cards, ...(parsed.cards || {}) },
          settings: {
            ...DEFAULT_STATE.settings,
            ...(parsed.settings || {}),
            disabledMechanics: Array.isArray(parsed.settings?.disabledMechanics) ? parsed.settings.disabledMechanics : [],
            visualComfortMode: !!parsed.settings?.visualComfortMode
          },
          secretEasterEgg: {
            ...DEFAULT_STATE.secretEasterEgg,
            ...(parsed.secretEasterEgg || {}),
            discoveredNames: Array.isArray(parsed.secretEasterEgg?.discoveredNames) ? parsed.secretEasterEgg.discoveredNames : []
          },
          achievements: {
            unlocked: { ...(DEFAULT_STATE.achievements.unlocked), ...(parsed.achievements?.unlocked || {}) },
            progress: { ...(DEFAULT_STATE.achievements.progress), ...(parsed.achievements?.progress || {}) }
          },
          timeAttackRecord: {
            ...DEFAULT_STATE.timeAttackRecord,
            ...(parsed.timeAttackRecord || {})
          },
          sandboxStats: {
            ...DEFAULT_STATE.sandboxStats,
            ...(parsed.sandboxStats || {})
          },
          minigameBag: {
            tokens: (parsed.minigameBag && Array.isArray(parsed.minigameBag.tokens) && parsed.minigameBag.tokens.length > 0)
              ? parsed.minigameBag.tokens
              : ['diana', 'diana', 'diana', 'roulette', 'roulette', 'roulette'],
            activeCard: parsed.minigameBag?.activeCard || null,
            cardUsesRemaining: typeof parsed.minigameBag?.cardUsesRemaining === 'number' ? parsed.minigameBag.cardUsesRemaining : 0
          },
          progress: {
            ...DEFAULT_STATE.progress,
            ...parsed.progress,
            honorMastery: parsed.progress?.honorMastery || {},
            seenTutorials: Array.isArray(parsed.progress?.seenTutorials) ? parsed.progress.seenTutorials : []
          },
          customLevels: Array.isArray(parsed.customLevels) ? parsed.customLevels : []
        };
      } catch (e) {
        console.warn('Error parseando estado guardado:', e);
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  saveState() {
    const json = JSON.stringify(this.state);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }

    // Persistencia de respaldo en cookies (garantiza progreso en celulares/iOS Safari)
    try {
      const backupState = {
        player: this.state.player,
        upgrades: this.state.upgrades,
        cards: this.state.cards,
        progress: {
          unlockedLevel: this.state.progress.unlockedLevel,
          completedLevels: this.state.progress.completedLevels,
          honorMastery: this.state.progress.honorMastery,
          seenTutorials: this.state.progress.seenTutorials
        },
        settings: this.state.settings
      };
      const backupJson = JSON.stringify(backupState);
      if (backupJson.length < 3800) {
        setCookie(STORAGE_KEY, backupJson, 365);
      } else {
        const compactBackup = {
          player: this.state.player,
          upgrades: this.state.upgrades,
          progress: { unlockedLevel: this.state.progress.unlockedLevel },
          settings: this.state.settings
        };
        setCookie(STORAGE_KEY, JSON.stringify(compactBackup), 365);
      }
    } catch (e) {
      console.warn('Error guardando respaldo en cookie:', e);
    }

    // Auto-sincronización con Google Cloud Firestore si hay sesión activa
    if (window.cloudSyncManager && typeof window.cloudSyncManager.triggerAutoSave === 'function') {
      window.cloudSyncManager.triggerAutoSave();
    }
  }

  // --- GESTIÓN DE DIFICULTAD PERSONALIZADA / MECÁNICAS DESHABILITADAS ---
  setMechanicDisabled(mechanicKey, isDisabled) {
    if (!this.state.settings) this.state.settings = {};
    if (!Array.isArray(this.state.settings.disabledMechanics)) {
      this.state.settings.disabledMechanics = [];
    }
    const idx = this.state.settings.disabledMechanics.indexOf(mechanicKey);
    if (isDisabled && idx === -1) {
      this.state.settings.disabledMechanics.push(mechanicKey);
    } else if (!isDisabled && idx !== -1) {
      this.state.settings.disabledMechanics.splice(idx, 1);
    }
    this.saveState();
  }

  isMechanicDisabled(mechanicKey) {
    return Array.isArray(this.state.settings?.disabledMechanics) &&
           this.state.settings.disabledMechanics.includes(mechanicKey);
  }

  // --- EASTER EGG SECRETO: 7 NOMBRES Y FINAL ESPECIAL ---
  recordDiscoveredSecretName(name) {
    const validNames = ['mirko', 'tom', 'nina', 'matilda', 'bianca', 'zoila', 'freya'];
    const clean = String(name).toLowerCase().trim();
    if (!validNames.includes(clean)) return { isNew: false, completed: false, total: 0 };

    if (!this.state.secretEasterEgg) {
      this.state.secretEasterEgg = { discoveredNames: [], allDiscovered: false };
    }
    if (!Array.isArray(this.state.secretEasterEgg.discoveredNames)) {
      this.state.secretEasterEgg.discoveredNames = [];
    }

    let isNew = false;
    if (!this.state.secretEasterEgg.discoveredNames.includes(clean)) {
      this.state.secretEasterEgg.discoveredNames.push(clean);
      isNew = true;
    }

    const completed = validNames.every(n => this.state.secretEasterEgg.discoveredNames.includes(n));
    if (completed) {
      this.state.secretEasterEgg.allDiscovered = true;
    }

    this.saveState();
    if (window.achievementManager) {
      window.achievementManager.check('easter_egg_master', this.state.secretEasterEgg.discoveredNames.length);
    }
    return {
      isNew,
      completed,
      total: this.state.secretEasterEgg.discoveredNames.length
    };
  }

  isSecretEndingUnlocked() {
    return !!this.state.secretEasterEgg?.allDiscovered;
  }

  // --- MODO DESCANSO VISUAL (FILTRO AMARILLO / LENTES) ---
  isVisualComfortMode() {
    return !!this.state.settings?.visualComfortMode;
  }

  setVisualComfortMode(enabled) {
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.visualComfortMode = !!enabled;
    this.saveState();
  }

  // --- GESTIÓN DE LOGROS (ACHIEVEMENTS) ---
  getAchievementProgress(id) {
    if (!this.state.achievements) this.state.achievements = { unlocked: {}, progress: {} };
    if (!this.state.achievements.progress) this.state.achievements.progress = {};
    return this.state.achievements.progress[id] || 0;
  }

  isAchievementUnlocked(id) {
    if (!this.state.achievements || !this.state.achievements.unlocked) return false;
    return !!this.state.achievements.unlocked[id];
  }

  setAchievementProgress(id, count) {
    if (!this.state.achievements) this.state.achievements = { unlocked: {}, progress: {} };
    if (!this.state.achievements.progress) this.state.achievements.progress = {};
    this.state.achievements.progress[id] = count;
    this.saveState();
  }

  incrementAchievementProgress(id, by = 1) {
    if (!this.state.achievements) this.state.achievements = { unlocked: {}, progress: {} };
    if (!this.state.achievements.progress) this.state.achievements.progress = {};
    const cur = this.state.achievements.progress[id] || 0;
    this.state.achievements.progress[id] = cur + by;
    this.saveState();
    return this.state.achievements.progress[id];
  }

  unlockAchievement(id) {
    if (!this.state.achievements) this.state.achievements = { unlocked: {}, progress: {} };
    if (!this.state.achievements.unlocked) this.state.achievements.unlocked = {};
    if (!this.state.achievements.unlocked[id]) {
      this.state.achievements.unlocked[id] = new Date().toISOString();
      this.saveState();
      return true; // nuevo logro desbloqueado
    }
    return false;
  }

  // --- REGISTRO TIME ATTACK (CONTRARRELOJ) ---
  recordTimeAttackScore(score, timeSec, tubesCleared) {
    if (!this.state.timeAttackRecord) {
      this.state.timeAttackRecord = { bestScore: 0, bestTimeSec: 0, bestTubesCleared: 0 };
    }
    let isNewBest = false;
    if (score > this.state.timeAttackRecord.bestScore) {
      this.state.timeAttackRecord.bestScore = score;
      isNewBest = true;
    }
    if (timeSec > this.state.timeAttackRecord.bestTimeSec) {
      this.state.timeAttackRecord.bestTimeSec = timeSec;
    }
    if (tubesCleared > this.state.timeAttackRecord.bestTubesCleared) {
      this.state.timeAttackRecord.bestTubesCleared = tubesCleared;
    }
    this.saveState();
    return isNewBest;
  }

  getTimeAttackRecord() {
    return this.state.timeAttackRecord || { bestScore: 0, bestTimeSec: 0, bestTubesCleared: 0 };
  }

  // --- REGISTRO MODO CASUAL SANDBOX INFINITO ---
  recordSandboxLevelCompleted() {
    if (!this.state.sandboxStats) {
      this.state.sandboxStats = { levelsCompleted: 0 };
    }
    this.state.sandboxStats.levelsCompleted = (this.state.sandboxStats.levelsCompleted || 0) + 1;
    this.saveState();
    return this.state.sandboxStats.levelsCompleted;
  }

  // --- MONEDAS Y ECONOMÍA REBALANCEADA ---
  getCoins() {
    return this.state.player.coins;
  }

  addCoins(amount) {
    this.state.player.coins += amount;
    this.saveState();
    return this.state.player.coins;
  }

  spendCoins(amount) {
    if (this.state.player.coins >= amount) {
      this.state.player.coins -= amount;
      this.saveState();
      return true;
    }
    return false;
  }

  // --- SISTEMA DE VIDAS (3 VIDAS / REGENERACIÓN DE 10 MINUTOS) ---
  getLives() {
    this.regenerateLives();
    return this.state.player.lives;
  }

  getMaxLives() {
    return this.state.player.maxLives || 3;
  }

  consumeLife() {
    this.regenerateLives();
    if (this.state.player.lives > 0) {
      if (this.state.player.lives === this.getMaxLives()) {
        this.state.player.lastLifeLostTimestamp = Date.now();
      }
      this.state.player.lives--;
      this.saveState();
      return true;
    }
    return false;
  }

  regenerateLives() {
    const max = this.getMaxLives();
    if (this.state.player.lives >= max) {
      this.state.player.lastLifeLostTimestamp = null;
      return;
    }

    if (!this.state.player.lastLifeLostTimestamp) {
      this.state.player.lastLifeLostTimestamp = Date.now();
      this.saveState();
      return;
    }

    const elapsed = Date.now() - this.state.player.lastLifeLostTimestamp;
    if (elapsed >= LIFE_REGEN_TIME_MS) {
      const recovered = Math.floor(elapsed / LIFE_REGEN_TIME_MS);
      this.state.player.lives = Math.min(max, this.state.player.lives + recovered);

      if (this.state.player.lives >= max) {
        this.state.player.lastLifeLostTimestamp = null;
      } else {
        this.state.player.lastLifeLostTimestamp += recovered * LIFE_REGEN_TIME_MS;
      }
      this.saveState();
    }
  }

  getTimeToNextLife() {
    if (this.state.player.lives >= this.getMaxLives()) return null;
    if (!this.state.player.lastLifeLostTimestamp) return null;

    const elapsed = Date.now() - this.state.player.lastLifeLostTimestamp;
    const remainingMs = Math.max(0, LIFE_REGEN_TIME_MS - (elapsed % LIFE_REGEN_TIME_MS));
    const totalSecs = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  addLifeInstant(count = 1) {
    this.state.player.lives = Math.min(this.getMaxLives(), this.state.player.lives + count);
    if (this.state.player.lives >= this.getMaxLives()) {
      this.state.player.lastLifeLostTimestamp = null;
    }
    this.saveState();
    return this.state.player.lives;
  }

  // --- ENFRIAMIENTO DE BOTELLA AUXILIAR (PERSISTENTE ENTRE REINICIOS) ---
  getMaxAuxiliaryCooldown() {
    const level = this.state.upgrades.cooldownReductionLevel || 1;
    if (level === 2) return 75;
    if (level === 3) return 50;
    if (level >= 4) return 25;
    return 100; // Base: 100 movimientos
  }

  getCooldownRemaining() {
    return this.state.auxiliaryCooldownRemaining || 0;
  }

  triggerAuxiliaryBottleUsed() {
    this.state.auxiliaryCooldownRemaining = this.getMaxAuxiliaryCooldown();
    this.saveState();
  }

  onMoveMade() {
    if (this.state.auxiliaryCooldownRemaining > 0) {
      this.state.auxiliaryCooldownRemaining = Math.max(0, this.state.auxiliaryCooldownRemaining - 1);
      this.saveState();
    }
  }

  resetAuxiliaryCooldownInstant() {
    this.state.auxiliaryCooldownRemaining = 0;
    this.saveState();
  }

  // --- TUTORIALES VISTOS ---
  hasSeenTutorial(mechanicId) {
    return this.state.progress.seenTutorials && this.state.progress.seenTutorials.includes(mechanicId);
  }

  markTutorialSeen(mechanicId) {
    if (!this.state.progress.seenTutorials) this.state.progress.seenTutorials = [];
    if (!this.state.progress.seenTutorials.includes(mechanicId)) {
      this.state.progress.seenTutorials.push(mechanicId);
      this.saveState();
    }
  }

  // --- NIVELES CREADOS POR EL USUARIO ---
  saveCustomLevel(levelObj) {
    if (!this.state.customLevels) this.state.customLevels = [];
    // Reemplazar si ya existe o agregar nuevo
    const idx = this.state.customLevels.findIndex(l => l.id === levelObj.id);
    if (idx >= 0) {
      this.state.customLevels[idx] = levelObj;
    } else {
      this.state.customLevels.push(levelObj);
    }
    this.saveState();
  }

  getCustomLevels() {
    return this.state.customLevels || [];
  }

  deleteCustomLevel(id) {
    if (this.state.customLevels) {
      this.state.customLevels = this.state.customLevels.filter(l => l.id !== id);
      this.saveState();
    }
  }

  // --- REGISTRO DE DESAFÍOS DE NIVEL (ACUMULATIVO EN PARTES DISTINTAS) ---
  recordLevelChallenges(level, bonusData, completedIds = [], totalCount = 1) {
    if (!this.state.progress.completedChallenges) {
      this.state.progress.completedChallenges = {};
    }
    const key = String(level);
    const prev = this.state.progress.completedChallenges[key] || {
      completedCount: 0,
      totalCount: totalCount,
      completedIds: [],
      bonusCoins: 0
    };

    // Unir IDs de desafíos completados históricamente (se pueden hacer en partes distintas)
    const prevIds = Array.isArray(prev.completedIds) ? prev.completedIds : [];
    const allCompletedIds = Array.from(new Set([...prevIds, ...completedIds]));

    const effectiveTotal = Math.max(prev.totalCount || 0, totalCount);
    const effectiveCompleted = Math.min(effectiveTotal, Math.max(prev.completedCount || 0, allCompletedIds.length));

    this.state.progress.completedChallenges[key] = {
      completedCount: effectiveCompleted,
      totalCount: effectiveTotal,
      completedIds: allCompletedIds,
      bonusCoins: Math.max(prev.bonusCoins || 0, bonusData?.totalCoins || 0),
      date: new Date().toLocaleDateString()
    };
    this.saveState();
  }

  getLevelChallenges(level) {
    const data = this.state.progress.completedChallenges ? this.state.progress.completedChallenges[String(level)] : null;
    if (!data) return null;
    return {
      completedCount: data.completedCount || 0,
      totalCount: data.totalCount || 1,
      completedIds: data.completedIds || [],
      bonusCoins: data.bonusCoins || 0,
      isAllCompleted: (data.completedCount || 0) >= (data.totalCount || 1)
    };
  }

  // --- REGISTRO DEL DESAFÍO DIARIO ALEATORIO ---
  recordDailyChallenge(dateStr = null, stats = {}) {
    if (!this.state.progress.dailyChallenges) {
      this.state.progress.dailyChallenges = {};
    }
    const today = dateStr || new Date().toISOString().slice(0, 10);
    const prev = this.state.progress.dailyChallenges[today] || {};
    this.state.progress.dailyChallenges[today] = {
      completed: true,
      date: today,
      score: Math.max(prev.score || 0, stats.score || 0),
      moves: (prev.moves && prev.moves < stats.moves) ? prev.moves : (stats.moves || 0),
      time: (prev.time && prev.time < stats.time) ? prev.time : (stats.time || 0),
      stars: Math.max(prev.stars || 0, stats.stars || 3),
      completedAll: true,
      timestamp: Date.now()
    };
    this.saveState();
  }

  getDailyChallengeRecord(dateStr = null) {
    if (!this.state.progress.dailyChallenges) return null;
    const today = dateStr || new Date().toISOString().slice(0, 10);
    return this.state.progress.dailyChallenges[today] || null;
  }

  // --- DESAFÍOS DE HONOR Y MEDALLAS DE SECCIÓN (3 VIDAS, 5 MINUTOS, REINICIO DIARIO) ---
  getHonorChallengeState(sectionId) {
    if (!this.state.progress.honorMastery) {
      this.state.progress.honorMastery = {};
    }
    const key = String(sectionId);
    let record = this.state.progress.honorMastery[key];

    const today = new Date().toISOString().slice(0, 10);

    if (!record) {
      record = {
        completed: false,
        lives: 3,
        failedDate: null
      };
      this.state.progress.honorMastery[key] = record;
      this.saveState();
    } else {
      // Reinicio diario si agotó las 3 vidas en un día anterior
      if (record.failedDate && record.failedDate !== today && !record.completed) {
        record.lives = 3;
        record.failedDate = null;
        this.saveState();
      }
    }

    const canPlayToday = record.lives > 0 && (!record.failedDate || record.failedDate !== today);

    return {
      sectionId: Number(sectionId),
      completed: !!record.completed,
      lives: typeof record.lives === 'number' ? record.lives : 3,
      failedDate: record.failedDate,
      canPlayToday: canPlayToday
    };
  }

  consumeHonorLife(sectionId) {
    const key = String(sectionId);
    const st = this.getHonorChallengeState(sectionId);
    const today = new Date().toISOString().slice(0, 10);

    const remaining = Math.max(0, st.lives - 1);
    this.state.progress.honorMastery[key] = {
      ...this.state.progress.honorMastery[key],
      lives: remaining,
      failedDate: remaining === 0 ? today : null
    };
    this.saveState();
    return remaining;
  }

  awardHonorMedal(sectionId) {
    const key = String(sectionId);
    if (!this.state.progress.honorMastery) {
      this.state.progress.honorMastery = {};
    }
    this.state.progress.honorMastery[key] = {
      completed: true,
      lives: 3,
      failedDate: null,
      achievedAt: new Date().toISOString()
    };
    this.saveState();
  }

  // --- EXPORTAR / IMPORTAR ARCHIVO DE PARTIDA (.JSON) ---
  exportToFile() {
    if (window.leaderboardManager) {
      this.state.progress.completedLevels = window.leaderboardManager.records;
    }

    const exportData = {
      ...this.state,
      exportedAt: new Date().toISOString(),
      version: '1.2.0',
      customPalette: window.paletteManager ? window.paletteManager.getPalette() : []
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `aquasort_partida_nivel${this.state.progress.unlockedLevel || 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromFile(file, onLoadedCallback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && (parsed.player || parsed.progress || parsed.upgrades)) {
          this.state = {
            ...DEFAULT_STATE,
            ...parsed,
            player: { ...DEFAULT_STATE.player, ...parsed.player },
            upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
            progress: {
              ...DEFAULT_STATE.progress,
              ...parsed.progress,
              seenTutorials: Array.isArray(parsed.progress?.seenTutorials) ? parsed.progress.seenTutorials : []
            },
            customLevels: Array.isArray(parsed.customLevels) ? parsed.customLevels : []
          };
          this.saveState();

          if (parsed.progress && parsed.progress.completedLevels && window.leaderboardManager) {
            window.leaderboardManager.records = parsed.progress.completedLevels;
            window.leaderboardManager.saveRecords();
          }

          if (Array.isArray(parsed.customPalette) && window.paletteManager) {
            window.paletteManager.palette = parsed.customPalette;
            window.paletteManager.savePalette();
          }

          if (typeof onLoadedCallback === 'function') {
            onLoadedCallback(this.state);
          }
        } else {
          alert('El archivo seleccionado no tiene el formato válido de partida de AquaSort.');
        }
      } catch (err) {
        alert('Error al leer el archivo de partida: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- TIENDA DE MEJORAS CON PRECIOS REBALANCEADOS ---
  purchaseUpgrade(upgradeType) {
    if (upgradeType === 'cooldown') {
      const current = this.state.upgrades.cooldownReductionLevel || 1;
      const costs = { 1: 80, 2: 180, 3: 350 };
      const cost = costs[current];
      if (!cost) return { success: false, msg: 'Nivel máximo ya alcanzado' };

      if (this.spendCoins(cost)) {
        this.state.upgrades.cooldownReductionLevel = current + 1;
        this.saveState();
        return { success: true, newLevel: current + 1 };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'hints_capacity') {
      const current = this.state.upgrades.maxStoredHints || 3;
      const nextMap = { 3: { next: 5, cost: 60 }, 5: { next: 8, cost: 150 } };
      const config = nextMap[current];
      if (!config) return { success: false, msg: 'Capacidad máxima de pistas alcanzada' };

      if (this.spendCoins(config.cost)) {
        this.state.upgrades.maxStoredHints = config.next;
        this.saveState();
        return { success: true, newMax: config.next };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'buy_hints_pack') {
      const cost = 45;
      if (this.spendCoins(cost)) {
        return { success: true, hintsAdded: 3 };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'recharge_bottle') {
      const cost = 40;
      if (this.spendCoins(cost)) {
        this.resetAuxiliaryCooldownInstant();
        return { success: true };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'roulette_boost') {
      const cost = 120;
      if (this.state.upgrades.rouletteBoost) return { success: false, msg: 'Seguro permanente ya activo' };
      if (this.spendCoins(cost)) {
        this.state.upgrades.rouletteBoost = true;
        this.saveState();
        return { success: true };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    // Compra de Cartas Alquímicas de Fortuna (20 monedas)
    if (upgradeType.startsWith('buy_card_')) {
      const cardId = upgradeType.replace('buy_card_', '');
      const cost = 20;
      if (this.spendCoins(cost)) {
        if (!this.state.cards) this.state.cards = { dianaFavor: 0, rouletteFavor: 0, doubleOrNothing: 0, calmAtmosphere: 0 };
        this.state.cards[cardId] = (this.state.cards[cardId] || 0) + 1;
        this.saveState();
        return { success: true, cardId, count: this.state.cards[cardId] };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'buy_life') {
      const cost = 25;
      if (this.state.player.lives >= this.getMaxLives()) {
        return { success: false, msg: '¡Ya tienes el máximo de vidas (3)!' };
      }
      if (this.spendCoins(cost)) {
        this.addLifeInstant(1);
        return { success: true, newLives: this.state.player.lives };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    if (upgradeType === 'recharge_all_lives') {
      const cost = 60;
      if (this.state.player.lives >= this.getMaxLives()) {
        return { success: false, msg: '¡Ya tienes el máximo de vidas (3)!' };
      }
      if (this.spendCoins(cost)) {
        this.state.player.lives = this.getMaxLives();
        this.state.player.lastLifeLostTimestamp = null;
        this.saveState();
        return { success: true, newLives: this.getMaxLives() };
      }
      return { success: false, msg: 'Monedas insuficientes' };
    }

    return { success: false, msg: 'Mejora desconocida' };
  }

  getCards() {
    return this.state.cards || { dianaFavor: 0, rouletteFavor: 0, doubleOrNothing: 0, calmAtmosphere: 0 };
  }

  consumeCard(cardId) {
    if (!this.state.cards) return false;
    if (this.state.cards[cardId] > 0) {
      this.state.cards[cardId]--;
      this.saveState();
      return true;
    }
    return false;
  }

  // --- BOLSA DE MINIJUEGOS Y CARTAS ALQUÍMICAS (DIANA / RULETA) ---
  getMinigameBag() {
    if (!this.state.minigameBag) {
      this.state.minigameBag = {
        tokens: ['diana', 'diana', 'diana', 'roulette', 'roulette', 'roulette'],
        activeCard: null,
        cardUsesRemaining: 0
      };
    }
    if (!Array.isArray(this.state.minigameBag.tokens) || this.state.minigameBag.tokens.length === 0) {
      this.refillMinigameBag();
    }
    return this.state.minigameBag;
  }

  refillMinigameBag() {
    if (!this.state.minigameBag) {
      this.state.minigameBag = {
        tokens: [],
        activeCard: null,
        cardUsesRemaining: 0
      };
    }
    // Bolsa equilibrada con 3 fichas de Diana y 3 de Ruleta (50% de probabilidad equitativa)
    const newTokens = ['diana', 'diana', 'diana', 'roulette', 'roulette', 'roulette'];

    // Si hay una carta de favor activa con usos restantes, se añaden fichas extras para mantener la ventaja
    if (this.state.minigameBag.activeCard === 'dianaFavor' && this.state.minigameBag.cardUsesRemaining > 0) {
      newTokens.push('diana', 'diana', 'diana');
    } else if (this.state.minigameBag.activeCard === 'rouletteFavor' && this.state.minigameBag.cardUsesRemaining > 0) {
      newTokens.push('roulette', 'roulette', 'roulette');
    }

    this.state.minigameBag.tokens = newTokens;
    this.saveState();
    return this.state.minigameBag.tokens;
  }

  drawMinigameToken() {
    const bag = this.getMinigameBag();
    if (!bag.tokens || bag.tokens.length === 0) {
      this.refillMinigameBag();
    }

    const tokens = this.state.minigameBag.tokens;
    const randomIndex = Math.floor(Math.random() * tokens.length);
    const chosen = tokens.splice(randomIndex, 1)[0];

    // Decrementar usos de la carta de favor activa si está vigente
    let cardJustExpired = false;
    let currentActiveCard = this.state.minigameBag.activeCard;
    if (this.state.minigameBag.activeCard && this.state.minigameBag.cardUsesRemaining > 0) {
      this.state.minigameBag.cardUsesRemaining--;
      if (this.state.minigameBag.cardUsesRemaining <= 0) {
        this.state.minigameBag.activeCard = null;
        this.state.minigameBag.cardUsesRemaining = 0;
        cardJustExpired = true;
      }
    }

    // Si la bolsa se quedó sin fichas (o salieron todas), se vuelve a llenar inmediatamente
    const wasEmptied = (tokens.length === 0);
    if (wasEmptied) {
      this.refillMinigameBag();
    }

    this.saveState();

    const remainingDiana = this.state.minigameBag.tokens.filter(t => t === 'diana').length;
    const remainingRoulette = this.state.minigameBag.tokens.filter(t => t === 'roulette').length;

    return {
      chosen,
      wasEmptied,
      cardJustExpired,
      activeCard: this.state.minigameBag.activeCard,
      activeCardName: currentActiveCard,
      cardUsesRemaining: this.state.minigameBag.cardUsesRemaining,
      remainingDiana,
      remainingRoulette,
      totalRemaining: this.state.minigameBag.tokens.length
    };
  }

  activateBonusFavorCard(cardId, uses = 5) {
    if (!this.state.cards || !this.state.cards[cardId] || this.state.cards[cardId] <= 0) {
      return { success: false, msg: 'No posees esta carta en tu inventario.' };
    }

    // Consumir 1 unidad de la carta del inventario
    this.state.cards[cardId]--;

    if (!this.state.minigameBag) {
      this.getMinigameBag();
    }

    this.state.minigameBag.activeCard = cardId;
    this.state.minigameBag.cardUsesRemaining = uses;

    // Agregar 5 fichas de la modalidad favorecida directamente a la bolsa
    const bonusType = (cardId === 'dianaFavor') ? 'diana' : 'roulette';
    for (let i = 0; i < 5; i++) {
      this.state.minigameBag.tokens.push(bonusType);
    }

    this.saveState();
    return {
      success: true,
      activeCard: cardId,
      cardUsesRemaining: uses,
      cardsLeft: this.state.cards[cardId]
    };
  }

  deactivateBonusFavorCard() {
    if (!this.state.minigameBag) return;
    this.state.minigameBag.activeCard = null;
    this.state.minigameBag.cardUsesRemaining = 0;
    this.saveState();
  }

  // --- REINICIAR TODO EL PROGRESO DEL JUGADOR ---
  resetAllProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Error borrando localStorage:', e);
    }
    try {
      setCookie(STORAGE_KEY, '', -1);
      document.cookie = `${STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    } catch (e) {
      console.warn('Error borrando cookie:', e);
    }
    if (window.leaderboardManager && typeof window.leaderboardManager.clearAllRecords === 'function') {
      window.leaderboardManager.clearAllRecords();
    } else {
      try {
        localStorage.removeItem('aquasort_leaderboard_records');
        localStorage.removeItem('aquasort_leaderboard');
      } catch (e) {}
    }
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }
}

// Instancia global
window.stateManager = new StateManager();
