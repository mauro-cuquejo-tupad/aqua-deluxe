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
    calmAtmosphere: 2    // Diana: Viento 0, Medidor Lento o Tiro Extra
  },
  progress: {
    unlockedLevel: 1,
    completedLevels: {},       // { "1": { stars: 3, bestMoves: 8, bestTimeSec: 15, usedHints: false } }
    seenTutorials: []          // Lista de tutoriales ya vistos
  },
  customLevels: [],            // Niveles creados por el usuario [{ id, name, author, tubes, verified: true }]
  auxiliaryCooldownRemaining: 0 // Movimientos restantes para usar botella extra (persistente)
};

class StateManager {
  constructor() {
    this.state = this.loadState();
    this.regenerateLives();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          player: { ...DEFAULT_STATE.player, ...parsed.player },
          upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
          cards: { ...DEFAULT_STATE.cards, ...(parsed.cards || {}) },
          progress: {
            ...DEFAULT_STATE.progress,
            ...parsed.progress,
            seenTutorials: Array.isArray(parsed.progress?.seenTutorials) ? parsed.progress.seenTutorials : []
          },
          customLevels: Array.isArray(parsed.customLevels) ? parsed.customLevels : []
        };
      }
    } catch (e) {
      console.warn('Error cargando estado:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Error guardando estado:', e);
    }
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
}

// Instancia global
window.stateManager = new StateManager();
