/* ==========================================================================
   AQUASORT MASTER DELUXE - MAIN GAME CONTROLLER
   Orquestador de física de vertido, animaciones, accesibilidad y ciclo de juego
   ========================================================================== */

class GameController {
  constructor() {
    this.currentLevel = 1;
    this.maxLevels = 100;
    this.levelData = null;
    this.tubes = [];
    this.selectedTubeIndex = null;
    this.lastInvalidTargetIdx = null;
    this.moves = 0;
    this.coins = window.stateManager ? window.stateManager.getCoins() : 0;
    this.hintsRemaining = 3;
    this.hintsUsedInLevel = 0;
    this.undoCountInLevel = 0;
    this.touchedTubeIndices = new Set();
    this.isDailyChallenge = false;
    this.extraTubesUsed = 0;
    this.moveHistory = [];
    this.activeHint = null;
    this.isPouringAnimation = false;
    this.seedVariation = 0;
    this.customLevelTesting = null;
    this.levelChallenges = [];
    this.victoryAnimationTimers = [];

    // Modo Contrarreloj (Time Attack - Alquimia Viva)
    this.isTimeAttack = false;
    this.timeAttackSecondsRemaining = 60;
    this.timeAttackScore = 0;
    this.timeAttackTubesCleared = 0;
    this.timeAttackLevel = 1;
    this.timeAttackBaseDropInterval = 30;
    this.timeAttackDropTimer = 30;
    this.timeAttackInterval = null;
    this.timeAttackActiveCountdowns = new Set();
    this.timeAttackPendingDrops = [];
    this.timeAttackPendingDropExecution = false;

    // Modo Casual Infinito (Sandbox)
    this.isCasualSandbox = false;
    this.casualSandboxConfig = null;

    // Desafíos de Honor de Sección
    this.isHonorMode = false;
    this.honorSectionId = null;
    this.honorMovesLimit = 0;
    this.honorMovesRemaining = 0;
    this.honorTimeRemaining = 300;
    this.honorTimerInterval = null;

    // Accesibilidad y personalización
    this.isLowVision = false;
    this.isHighContrast = false;
    this.showAccessibilityPatterns = window.stateManager?.state?.settings?.showAccessibilityPatterns || false;
    this.showAccessibilityLetters = window.stateManager?.isAccessibilityLettersMode ? window.stateManager.isAccessibilityLettersMode() : false;

    // Editor de Niveles
    this.editorLevel = {
      name: 'El Crisol del Titán',
      creator: 'Maestro Alquimista',
      tubeCount: 5,
      tubes: [],
      hasBeenPassed: false
    };
    this.activeBrush = { type: 'color', color: '#ef4444', name: 'Rojo', shape: '●' };

    // Easter Egg: Contador de intentos de vertido con líquido incompatible
    this.incompatiblePourAttempts = 0;

    // Canvas de chorro de agua
    this.pourCanvas = null;
    this.pourCtx = null;

    // Referencias DOM
    this.cacheDom();
    this.initEvents();
    this.initCanvas();
    this.initEditorWorkspace();

    // Auto-reparación y sincronización de unlockedLevel según el progreso guardado
    if (window.stateManager && window.leaderboardManager) {
      const records = window.leaderboardManager.records || {};
      let highestCompleted = 0;
      Object.keys(records).forEach(k => {
        const lvlNum = parseInt(k, 10);
        if (!isNaN(lvlNum) && records[k] && records[k].stars >= 1) {
          highestCompleted = Math.max(highestCompleted, lvlNum);
        }
      });
      const currentUnlocked = window.stateManager.state.progress.unlockedLevel || 1;
      const expectedUnlocked = Math.max(currentUnlocked, highestCompleted + 1);
      if (expectedUnlocked > currentUnlocked && expectedUnlocked <= this.maxLevels) {
        window.stateManager.state.progress.unlockedLevel = expectedUnlocked;
        window.stateManager.saveState();
      }
    }

    // Sincronizar nivel desde parámetro URL o progreso guardado
    const urlParams = new URLSearchParams(window.location.search);
    const paramLevel = parseInt(urlParams.get('level'), 10);
    if (!isNaN(paramLevel) && paramLevel >= 1 && paramLevel <= this.maxLevels) {
      this.currentLevel = paramLevel;
      if (this.modalHome) this.hideModal(this.modalHome);
    } else if (window.stateManager && window.stateManager.state.progress.unlockedLevel) {
      this.currentLevel = window.stateManager.state.progress.unlockedLevel;
    }

    this.loadLevel(this.currentLevel);

    // Iniciar loop de vidas en tiempo real
    this.livesInterval = setInterval(() => this.updateLivesHUD(), 1000);
    this.updateLivesHUD();

    // Iniciar música relajante de nivel tras la primera interacción
    this.setupAudioUnlock();

    // Iniciar cofre diario de bienvenida (50 monedas) y ciclo de 24 horas a las 12 de la noche
    this.initDailyChest();
  }

  cacheDom() {
    this.tubesGrid = document.getElementById('tubes-grid');
    this.lblLevel = document.getElementById('lbl-level');
    this.lblMechanicTag = document.getElementById('lbl-mechanic-tag');
    this.lblMoves = document.getElementById('lbl-moves');
    this.lblTimer = document.getElementById('lbl-timer');
    this.lblCoins = document.getElementById('lbl-coins');
    this.lblOptimalMoves = document.getElementById('lbl-optimal-moves');
    this.lblHintsLeft = document.getElementById('lbl-hints-left');
    this.selLevelQuick = document.getElementById('sel-level-quick');
    this.pourCanvas = document.getElementById('pour-canvas');
    if (this.pourCanvas) this.pourCtx = this.pourCanvas.getContext('2d');

    // Desafíos del Nivel (Side Challenges)
    this.challengesHud = document.getElementById('challenges-hud');
    this.victoryChallengesCard = document.getElementById('victory-challenges-card');
    this.victoryChallengesList = document.getElementById('victory-challenges-list');
    this.lblVicChallengesBonus = document.getElementById('lbl-vic-challenges-bonus');

    // Botones del HUD
    this.btnUndo = document.getElementById('btn-undo');
    this.btnHint = document.getElementById('btn-hint');
    this.btnAddTube = document.getElementById('btn-add-tube');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnPause = document.getElementById('btn-pause');
    this.btnChallengesBadge = document.getElementById('btn-challenges-badge');
    this.lblChallengesBadgeCount = document.getElementById('lbl-challenges-badge-count');
    this.btnOpenEditor = document.getElementById('btn-open-editor');

    // Widget de Vidas
    this.livesHud = document.getElementById('lives-hud');
    this.livesHeartsDisplay = document.getElementById('lives-hearts-display');
    this.livesCountText = document.getElementById('lives-count-text');
    this.livesTimerText = document.getElementById('lives-timer-text');

    // Modales
    this.modalMap = document.getElementById('modal-map');
    this.modalVictory = document.getElementById('modal-victory');
    this.modalRoulette = document.getElementById('modal-roulette');
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalHome = document.getElementById('modal-home');
    this.modalShop = document.getElementById('modal-shop');
    this.modalRestartConfirm = document.getElementById('modal-restart-confirm');
    this.modalTutorial = document.getElementById('modal-tutorial');
    this.modalEditor = document.getElementById('modal-editor');
    this.modalHonorVictory = document.getElementById('modal-honor-victory');
    this.modalHonorDefeat = document.getElementById('modal-honor-defeat');
    this.vicHonorUnlockedBanner = document.getElementById('vic-honor-unlocked-banner');
    this.btnVicLaunchHonor = document.getElementById('btn-vic-launch-honor');
    this.modalApocalypse = document.getElementById('modal-apocalypse-easter-egg');
    this.modalCloudSync = document.getElementById('modal-cloud-sync');
    this.modalAchievements = document.getElementById('modal-achievements');
    this.modalCasualSandbox = document.getElementById('modal-casual-sandbox');
    this.modalTimeAttackGameOver = document.getElementById('modal-time-attack-gameover');
    this.modalChallengeIntro = document.getElementById('modal-challenge-intro');
    this.modalPause = document.getElementById('modal-pause');
    this.modalOutOfLives = document.getElementById('modal-out-of-lives');
    this.modalShieldTutorial = document.getElementById('modal-shield-tutorial');
    this.modalExtras = document.getElementById('modal-extras');
    this.modalExitModeConfirm = document.getElementById('modal-exit-mode-confirm');
    this.modalConfirmExitGame = document.getElementById('modal-confirm-exit-game');
    this.screenGameExited = document.getElementById('screen-game-exited');
    this.modalPublishLevel = document.getElementById('modal-publish-level');
    this.modalCommunityLevels = document.getElementById('modal-community-levels');
    this.currentCommunityFilter = 'all';
    this.pendingPublishLevel = null;
    this.pendingPublishDifficulty = null;
    this.navigationSource = 'game';
    this.pendingExitDestination = 'home';

    // Catálogo de Mecánicas y Guía de Tutoriales (Espaciadas cada 10 niveles)
    this.mechanicsCatalog = [
      { id: 'basic', title: 'Básico', fullName: 'Reglas Básicas de AquaSort', level: 1, icon: 'droplets' },
      { id: 'mystery', title: "Líquidos '?'", fullName: "Líquidos Ocultos '?'", level: 11, icon: 'help-circle' },
      { id: 'giant', title: 'Gigante', fullName: 'Frasco Gigante (Capacidad 6)', level: 21, icon: 'maximize-2' },
      { id: 'lock', title: 'Candado', fullName: 'Candado Alquímico con Llave', level: 31, icon: 'lock' },
      { id: 'narrow', title: 'Estrecho', fullName: 'Tubo Estrecho (1x1)', level: 41, icon: 'minimize-2' },
      { id: 'glued', title: 'En la Roca', fullName: 'Frasco Inamovible en la Roca', level: 51, icon: 'mountain' },
      { id: 'chameleon', title: 'Camaleón', fullName: 'Líquido Camaleón Multicolor', level: 61, icon: 'disc' },
      { id: 'fragile', title: 'Afinidad', fullName: 'Cristal de Afinidad (3 Usos)', level: 71, icon: 'shield-alert' },
      { id: 'hybrid', title: 'Híbrido', fullName: 'Conjunción Alquímica Híbrida', level: 81, icon: 'sparkles' },
      { id: 'magna', title: 'Obra Magna', fullName: 'La Gran Obra Alquímica', level: 91, icon: 'award' }
    ];
    this.currentTutorialId = 'basic';

    // Elementos de la Tienda y Pantalla de Inicio
    this.shopItemsContainer = document.getElementById('shop-items-container');
    this.inputSaveFile = document.getElementById('input-save-file');
  }

  // --- GESTIÓN ROBUSTA DE MODALES (COMPATIBILIDAD MÓVIL Y DESKTOP) ---
  showModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    modal.style.setProperty('opacity', '1', 'important');
    modal.style.setProperty('pointer-events', 'auto', 'important');
  }

  hideModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
    modal.style.setProperty('visibility', 'hidden', 'important');
    modal.style.setProperty('opacity', '0', 'important');
    modal.style.setProperty('pointer-events', 'none', 'important');
  }

  bindTapOrClick(element, callback) {
    if (!element) return;
    let startX = 0;
    let startY = 0;
    let isTouch = false;
    let touchStartTime = 0;

    element.addEventListener('touchstart', (e) => {
      isTouch = true;
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
      touchStartTime = Date.now();
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      if (!isTouch) return;
      const touch = e.changedTouches && e.changedTouches[0];
      if (touch) {
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        // Tap válido si no se movió más de 14px y duró menos de 600ms
        if (dx < 14 && dy < 14 && (Date.now() - touchStartTime < 600)) {
          if (e.cancelable) e.preventDefault();
          element._lastTapHandled = Date.now();
          callback(e);
        }
      }
      isTouch = false;
    }, { passive: false });

    element.addEventListener('click', (e) => {
      // Ignorar click sintético generado por el navegador tras el touchend
      if (element._lastTapHandled && (Date.now() - element._lastTapHandled < 450)) {
        return;
      }
      callback(e);
    });
  }

  setupBackdropClose(modal, closeCallback) {
    if (!modal) return;
    let startTarget = null;
    let startX = 0;
    let startY = 0;

    modal.addEventListener('touchstart', (e) => {
      startTarget = e.target;
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      if (startTarget === modal && e.target === modal) {
        const touch = e.changedTouches && e.changedTouches[0];
        if (touch) {
          const dx = Math.abs(touch.clientX - startX);
          const dy = Math.abs(touch.clientY - startY);
          if (dx < 15 && dy < 15) {
            if (e.cancelable) e.preventDefault();
            modal._lastBackdropTap = Date.now();
            closeCallback(e);
          }
        }
      }
      startTarget = null;
    }, { passive: false });

    modal.addEventListener('click', (e) => {
      if (modal._lastBackdropTap && (Date.now() - modal._lastBackdropTap < 450)) return;
      if (e.target === modal) {
        closeCallback(e);
      }
    });
  }

  initCanvas() {
    if (!this.pourCanvas) return;
    const resize = () => {
      const rect = this.pourCanvas.parentElement.getBoundingClientRect();
      this.pourCanvas.width = rect.width;
      this.pourCanvas.height = rect.height;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  resumeGameMusic() {
    if (!window.audio) return;
    if (this.isTimeAttack) {
      window.audio.playMusic('time_attack');
    } else if (this.isCasualSandbox) {
      window.audio.playMusic('level', 'casual');
    } else {
      window.audio.playMusic('level', this.currentLevel);
    }
  }

  setupAudioUnlock() {
    const unlock = () => {
      if (window.audio) {
        window.audio.init();
        if (window.audio.currentTrack === null) {
          this.resumeGameMusic();
        }
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
  }

  isLevelUnlocked(lvl) {
    if (lvl <= 1) return true;
    const prevRec = window.leaderboardManager ? window.leaderboardManager.getRecord(lvl - 1) : null;
    if (prevRec && prevRec.stars >= 1) return true;
    const comp = window.stateManager ? window.stateManager.state.progress.completedLevels[String(lvl - 1)] : null;
    if (comp && comp.stars >= 1) return true;
    const unlockedSaved = window.stateManager?.state?.progress?.unlockedLevel || 1;
    if (lvl <= unlockedSaved) return true;
    return false;
  }

  hasAllLevelsAtLeastOneStar() {
    for (let i = 1; i <= 100; i++) {
      const rec = window.leaderboardManager ? window.leaderboardManager.getRecord(i) : null;
      const comp = window.stateManager ? window.stateManager.state.progress.completedLevels[String(i)] : null;
      const stars = (rec && rec.stars) ? rec.stars : (comp && comp.stars ? comp.stars : 0);
      if (stars < 1) return false;
    }
    return true;
  }

  // --- CARGA Y GENERACIÓN DE NIVELES ---
  loadLevel(lvl, seedVariation = 0, customLevelData = null) {
    if (lvl !== 'daily' && lvl !== 'casual_sandbox' && lvl !== 'time_attack' && !customLevelData && !this.isHonorMode) {
      const targetLvl = Math.max(1, Math.min(lvl, this.maxLevels));
      if (!this.isLevelUnlocked(targetLvl)) {
        if (window.audio) window.audio.playFailSound();
        alert(`¡El Nivel ${targetLvl} está bloqueado! Debes superar el Nivel ${targetLvl - 1} primero.`);
        return;
      }
      if (window.stateManager && window.stateManager.getLives() <= 0) {
        if (window.audio) window.audio.playFailSound();
        this.openMapModal();
        this.showNoLivesMapModal();
        return;
      }
      this.currentLevel = targetLvl;
      this.isDailyChallenge = false;
      this.isCasualSandbox = false;
      this.isTimeAttack = false;
    }
    if (lvl !== 'daily') this.isDailyChallenge = false;
    if (lvl !== 'casual_sandbox') this.isCasualSandbox = false;
    if (lvl !== 'time_attack') {
      this.isTimeAttack = false;
      if (this.timeAttackInterval) {
        clearInterval(this.timeAttackInterval);
        this.timeAttackInterval = null;
      }
      if (this.timeAttackActiveCountdowns) {
        this.timeAttackActiveCountdowns.clear();
      }
      const dropHud = document.getElementById('ta-drop-hud');
      if (dropHud) dropHud.remove();
      const hudContainer = document.getElementById('time-attack-hud-container');
      if (hudContainer) {
        hudContainer.classList.add('hidden');
        hudContainer.innerHTML = '';
      }
    }
    this.moves = 0;
    this.moveHistory = [];
    this.selectedTubeIndex = null;
    this.lastInvalidTargetIdx = null;
    this.extraTubesUsed = 0;
    this.activeHint = null;
    this.hintsUsedInLevel = 0;
    this.undoCountInLevel = 0;
    this.touchedTubeIndices = new Set();
    this.isPouringAnimation = false;
    this.seedVariation = seedVariation;

    // Resetear modo de honor
    this.isHonorMode = false;
    this.stopHonorTimer();
    const boardWrap = document.getElementById('game-board-container') || document.body;
    if (boardWrap) boardWrap.classList.remove('honor-hud-active');

    // Actualizar nivel desbloqueado en el estado persistente
    if (window.stateManager && !customLevelData) {
      if (this.currentLevel > (window.stateManager.state.progress.unlockedLevel || 1)) {
        window.stateManager.state.progress.unlockedLevel = this.currentLevel;
        window.stateManager.saveState();
      }
      this.coins = window.stateManager.getCoins();
    }

    if (customLevelData) {
      this.levelData = customLevelData;
      this.tubes = JSON.parse(JSON.stringify(customLevelData.tubes));
      if (customLevelData.isCasualSandbox || lvl === 'casual_sandbox') {
        this.isCasualSandbox = true;
        this.customLevelTesting = null;
        this.initialSandboxTubes = JSON.parse(JSON.stringify(customLevelData.tubes));
      } else {
        this.isCasualSandbox = false;
        this.customLevelTesting = customLevelData;
      }
    } else {
      this.customLevelTesting = null;
      this.isCasualSandbox = false;
      this.levelData = window.LevelGenerator.generate(this.currentLevel, this.seedVariation);
      this.tubes = this.levelData.tubes;
    }

    // Limpiar temporizadores de animación de desafíos anteriores
    if (this.victoryAnimationTimers && this.victoryAnimationTimers.length > 0) {
      this.victoryAnimationTimers.forEach(t => clearTimeout(t));
    }
    this.victoryAnimationTimers = [];

    // Cargar y renderizar desafíos secundarios del nivel
    if (window.ChallengeManager && !customLevelData) {
      this.levelChallenges = window.ChallengeManager.getChallengesForLevel(this.levelData);
    } else {
      this.levelChallenges = [];
    }
    this.renderChallengesHUD();

    // Reiniciar contador de tiempo de juego activo para la pérdida de vidas cada 10 min en historia
    this.storyLevelPlaySeconds = 0;
    this.storyLevelLostLivesCount = 0;

    // Iniciar temporizador en vivo (desactivado en Contrarreloj)
    if (window.leaderboardManager) {
      if (lvl === 'time_attack' || this.isTimeAttack) {
        window.leaderboardManager.stopTimer();
      } else {
        window.leaderboardManager.startTimer('lbl-timer');
      }
    }

    // Actualizar música de fondo
    if (window.audio && !this.isModalOpen()) {
      this.resumeGameMusic();
    }

    this.updateHeaderUI();
    this.updateMovesUI();
    this.renderTubes();
    this.updateButtonsUI();
    this.updateAuxiliaryButtonUI();
    this.updateLivesHUD();

    // Comprobar si hay nueva mecánica que requiera tutorial animado
    if (!customLevelData && this.levelData.primaryMechanicId && this.levelData.primaryMechanicId !== 'basic') {
      if (window.stateManager && !window.stateManager.hasSeenTutorial(this.levelData.primaryMechanicId)) {
        setTimeout(() => {
          this.showTutorialModal(this.levelData.primaryMechanicId, true);
          window.stateManager.markTutorialSeen(this.levelData.primaryMechanicId);
        }, 400);
      }
    }

    // Si inicia el Modo Historia por primera vez en el Nivel 1, mostrar la animación inicial una única vez (Prólogo)
    if (!customLevelData && !this.isHonorMode && !this.isDailyChallenge && !this.isCasualSandbox && !this.isTimeAttack) {
      if (this.currentLevel === 1 && window.stateManager && !window.stateManager.hasSeenStoryPrologue()) {
        window.stateManager.markStoryPrologueSeen();
        setTimeout(() => {
          if (window.storyManager) {
            window.storyManager.openStoryModal(0, false);
          }
        }, 450);
      }
    }

    // Mostrar cartel de desafíos al inicio del nivel (los desafíos se presentan en un cartel antes de empezar)
    if (this.levelChallenges && this.levelChallenges.length > 0 && !customLevelData && !this.isHonorMode && !this.isDailyChallenge && !this.isTimeAttack && !this.isCasualSandbox) {
      setTimeout(() => {
        const isBonusActive = (this.modalRoulette && !this.modalRoulette.classList.contains('hidden')) ||
                              (window.rouletteEngine && (window.rouletteEngine.isSpinning || window.rouletteEngine.isDartFlying));
        if (isBonusActive) {
          this.pendingChallengeIntro = true;
          return;
        }
        if (!this.isModalOpen()) {
          this.showChallengeIntroModal();
        }
      }, 350);
    }
  }

  updateHeaderUI() {
    if (this.isHonorMode && this.levelData) {
      if (this.lblLevel) this.lblLevel.textContent = `🏅 Honor ${this.honorSectionId}`;
      if (this.selLevelQuick) this.selLevelQuick.value = '';
      if (this.lblOptimalMoves) this.lblOptimalMoves.textContent = this.levelData.optimalMoves;
      if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.levelData.mechanicTag;
      this.updateCoinsUI();
      return;
    }
    if (this.customLevelTesting) {
      if (this.lblLevel) this.lblLevel.textContent = '🧪 COMUNIDAD';
      if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.customLevelTesting.name || 'Personalizado';
      this.updateCoinsUI();
      return;
    }
    if (this.isCasualSandbox) {
      if (this.lblLevel) this.lblLevel.textContent = '🎲 CASUAL';
      if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.levelData?.mechanicTag || 'Infinito';
      this.updateCoinsUI();
      return;
    }
    if (this.isTimeAttack) {
      if (this.lblLevel) this.lblLevel.textContent = '⏳ ATAQUE';
      if (this.lblMechanicTag) this.lblMechanicTag.textContent = 'Alquimia Viva';
      this.updateCoinsUI();
      return;
    }
    if (this.isDailyChallenge) {
      if (this.lblLevel) this.lblLevel.textContent = '👑 DIARIO';
      if (this.lblMechanicTag) this.lblMechanicTag.textContent = 'Desafío del Día';
      this.updateCoinsUI();
      return;
    }
    if (this.lblLevel) this.lblLevel.textContent = this.currentLevel;
    if (this.selLevelQuick) this.selLevelQuick.value = this.currentLevel;
    if (this.lblOptimalMoves) this.lblOptimalMoves.textContent = this.levelData.optimalMoves;
    if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.levelData.mechanicTag;
    this.updateCoinsUI();
  }

  launchDailyChallenge() {
    this.isDailyChallenge = true;
    this.isTimeAttack = false;
    this.isCasualSandbox = false;
    const dailyData = window.LevelGenerator ? window.LevelGenerator.generateDailyLevel() : null;
    if (!dailyData) return;
    this.loadLevel('daily', 0, dailyData);
    if (window.audio) window.audio.playWinFanfare();
  }

  // --- MODO CONTRARRELOJ INFINITO (ALQUIMIA VIVA) ---
  startTimeAttack() {
    this.isTimeAttack = true;
    this.isDailyChallenge = false;
    this.isHonorMode = false;
    this.isCasualSandbox = false;
    this.timeAttackSecondsRemaining = 60;
    this.timeAttackScore = 0;
    this.timeAttackTubesCleared = 0;
    this.timeAttackLevel = 1;
    this.timeAttackBaseDropInterval = 20; // Demora inicial de 20s (se reduce 7% por nivel, mín 5s)
    this.timeAttackDropTimer = 20;
    this.timeAttackActiveCountdowns = new Set();
    this.timeAttackPendingDrops = [];
    this.timeAttackPendingDropExecution = false;

    if (this.timeAttackInterval) {
      clearInterval(this.timeAttackInterval);
      this.timeAttackInterval = null;
    }

    // Generar tablero de Time Attack: 7 tubos iniciales (4 colores de 4 capas + 3 tubos vacíos)
    const pal = window.paletteManager ? window.paletteManager.getPalette() : [];
    const colors = pal.slice(0, 4);
    const tubes = [];
    for (let i = 0; i < 4; i++) {
      const col = colors[i];
      const tubeLiquids = [];
      for (let k = 0; k < 4; k++) {
        tubeLiquids.push({
          colorIndex: col.id,
          color: col.hex,
          name: col.name,
          shape: col.shape,
          letter: col.letter || col.shape,
          pattern: col.pattern,
          textHex: col.textHex,
          isMystery: false,
          revealed: true
        });
      }
      tubes.push({ id: i, capacity: 4, liquids: tubeLiquids, isLocked: false, isGlued: false, isNarrow: false });
    }
    for (let j = 0; j < 3; j++) {
      tubes.push({ id: 4 + j, capacity: 4, liquids: [], isLocked: false, isGlued: false, isNarrow: false });
    }
    window.LevelGenerator.distributeAndShuffle(tubes, Math.floor(Math.random() * 999999));

    const timeAttackData = {
      level: 'time_attack',
      isTimeAttack: true,
      title: 'Contrarreloj • Alquimia Viva ⏳',
      mechanicTag: 'Alquimia Viva',
      optimalMoves: 999,
      tubes: tubes
    };

    this.loadLevel('time_attack', 0, timeAttackData);

    // Planificar la primera ronda de 4 reactivos telegrafiados
    this.planNextTimeAttackDrops();
    this.renderTubes();
    this.renderTimeAttackDropHUD();

    const movesLbl = document.getElementById('lbl-moves');
    const optimalLbl = document.getElementById('lbl-optimal-moves');
    if (movesLbl) movesLbl.textContent = '0 pts';
    if (optimalLbl) optimalLbl.textContent = 'Nivel 1 • 0/100 • Derrame: 20s';

    const timerEl = document.getElementById('lbl-timer');
    if (timerEl) {
      timerEl.textContent = '01:00';
      timerEl.className = 'font-mono font-black text-amber-300 text-sm';
    }

    this.timeAttackInterval = setInterval(() => {
      if (!this.isTimeAttack) {
        if (this.timeAttackInterval) {
          clearInterval(this.timeAttackInterval);
          this.timeAttackInterval = null;
        }
        return;
      }
      this.tickTimeAttack();
    }, 1000);

    if (window.audio && typeof window.audio.playWinFanfare === 'function') {
      window.audio.playWinFanfare();
    }
  }

  // Cantidad de líquidos en circulación según el nivel:
  // Nivel 1-4: 4 líquidos base
  // A partir de nivel 5: +1 líquido cada 5 niveles (máximo 8 líquidos)
  getTimeAttackColorCount(level = null) {
    const lvl = (level !== null) ? level : this.timeAttackLevel;
    if (lvl < 5) return 4;
    return Math.min(8, 4 + Math.floor((lvl - 5) / 5) + 1);
  }

  // Intervalo de derrame según el nivel actual: 20s inicial, reducción de 7% por nivel, mínimo 5s
  getDropIntervalForLevel(level = null) {
    const lvl = (level !== null) ? level : this.timeAttackLevel;
    return Math.max(5, Math.round(this.timeAttackBaseDropInterval * Math.pow(0.93, Math.max(0, lvl - 1))));
  }

  // Planifica con antelación los 4 reactivos que van a caer y qué tubos recibirán cada uno
  planNextTimeAttackDrops() {
    if (!this.tubes || this.tubes.length === 0) return;
    const pal = window.paletteManager ? window.paletteManager.getPalette() : [];
    const colorCount = this.getTimeAttackColorCount();
    const activeColors = pal.slice(0, colorCount);

    const slots = this.tubes.map(t => (!t.isCountingDown && !t.isDraining ? Math.max(0, t.capacity - t.liquids.length) : 0));

    this.timeAttackPendingDrops = [];
    for (let i = 0; i < 4; i++) {
      const availableIndices = [];
      slots.forEach((free, idx) => {
        if (free > 0) availableIndices.push(idx);
      });

      let targetIdx = 0;
      if (availableIndices.length > 0) {
        targetIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        slots[targetIdx]--;
      } else {
        const nonCounting = [];
        this.tubes.forEach((t, idx) => {
          if (!t.isCountingDown && !t.isDraining) nonCounting.push(idx);
        });
        targetIdx = nonCounting.length > 0 ? nonCounting[Math.floor(Math.random() * nonCounting.length)] : 0;
      }

      const randomCol = activeColors[Math.floor(Math.random() * activeColors.length)];
      this.timeAttackPendingDrops.push({
        targetTubeIdx: targetIdx,
        colorIndex: randomCol.id,
        color: randomCol.hex,
        name: randomCol.name,
        shape: randomCol.shape,
        letter: randomCol.letter || randomCol.shape,
        pattern: randomCol.pattern,
        textHex: randomCol.textHex,
        isMystery: false,
        revealed: true
      });
    }
  }

  // Rebalancea los reactivos telegrafiados si el jugador llena un tubo antes del derrame
  rebalancePendingDrops() {
    if (!this.isTimeAttack || !this.timeAttackPendingDrops || this.timeAttackPendingDrops.length === 0) return;
    const eligibleTubes = this.tubes.filter(t => !t.isCountingDown && !t.isDraining && t.liquids.length < t.capacity);
    if (eligibleTubes.length === 0) return;

    let changed = false;
    this.timeAttackPendingDrops.forEach(drop => {
      const currentTarget = this.tubes[drop.targetTubeIdx];
      if (!currentTarget || currentTarget.isCountingDown || currentTarget.isDraining || currentTarget.liquids.length >= currentTarget.capacity) {
        const newTarget = eligibleTubes[Math.floor(Math.random() * eligibleTubes.length)];
        drop.targetTubeIdx = this.tubes.indexOf(newTarget);
        changed = true;
      }
    });
    if (changed) {
      this.renderTimeAttackDropHUD();
      this.renderTubes();
    }
  }

  // Barra informativa general sobre el tablero: "Próximo derrame en X segundos" y colores venideros
  renderTimeAttackDropHUD() {
    const container = document.getElementById('time-attack-hud-container');
    if (!this.isTimeAttack) {
      if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
      }
      const existing = document.getElementById('ta-drop-hud');
      if (existing) existing.remove();
      return;
    }

    if (container) {
      container.classList.remove('hidden');
    }

    let hud = document.getElementById('ta-drop-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'ta-drop-hud';
      if (container) {
        container.appendChild(hud);
      } else {
        const centralArea = this.tubesGrid?.parentElement;
        if (centralArea && centralArea.parentElement) {
          centralArea.parentElement.insertBefore(hud, centralArea);
        }
      }
    } else if (container && hud.parentElement !== container) {
      container.appendChild(hud);
    }

    const useLetters = this.showAccessibilityLetters || (window.stateManager && window.stateManager.isAccessibilityLettersMode());
    const isUrgent = this.timeAttackDropTimer <= 4;
    hud.className = `ta-drop-hud ${isUrgent ? 'ta-hud-urgent animate-pulse' : ''}`;

    let previewsHtml = '';
    if (this.timeAttackPendingDrops && this.timeAttackPendingDrops.length > 0) {
      previewsHtml = this.timeAttackPendingDrops.map(d => {
        const char = useLetters ? (d.letter || d.shape) : (d.shape || d.letter);
        return `<span class="ta-hud-pill" style="background-color: ${d.color}; color: ${d.textHex || '#fff'};" title="${d.name}">${char}</span>`;
      }).join('');
    }

    hud.innerHTML = `
      <span class="ta-hud-level">⚡ Nivel <b>${this.timeAttackLevel}</b></span>
      <span class="text-slate-500">•</span>
      <span class="ta-hud-timer">Próximo derrame en <b>${this.timeAttackDropTimer}s</b></span>
      <div class="ta-hud-previews">${previewsHtml}</div>
      <button id="btn-ta-spill-now" class="ta-btn-spill active:scale-95" title="¡Derramar reactivos ahora! Suma ${this.timeAttackDropTimer}s al reloj y +${this.timeAttackDropTimer * 100} pts">
        <span>⚡ ¡Derramar!</span>
      </button>
    `;

    const btnSpill = hud.querySelector('#btn-ta-spill-now');
    if (btnSpill) {
      btnSpill.onclick = (e) => {
        e.stopPropagation();
        this.spillNowTimeAttack();
      };
    }
  }

  // Fuerza el derrame inmediato, acumula el tiempo restante al reloj y multiplica x100 al puntaje
  spillNowTimeAttack() {
    if (!this.isTimeAttack) return;
    if (this.isPouringAnimation) {
      this.showTimeAttackNotice('⏳ Espera a que termine el movimiento para derramar...');
      return;
    }
    const totalFreeSpaces = this.tubes.reduce((acc, t) => {
      if (t.isCountingDown || t.isDraining) return acc;
      return acc + Math.max(0, t.capacity - t.liquids.length);
    }, 0);

    if (totalFreeSpaces < 4) {
      this.showTimeAttackNotice('⚠️ Huecos insuficientes para derramar (requiere 4 espacios libres)');
      return;
    }

    const savedTime = Math.max(0, this.timeAttackDropTimer);
    if (savedTime > 0) {
      this.timeAttackSecondsRemaining += savedTime;
      const bonusScore = savedTime * 100;
      this.timeAttackScore += bonusScore;
      this.showTimeAttackNotice(`⚡ ¡Derrame Rápido! +${savedTime}s ⏱️ +${bonusScore.toLocaleString()} pts`);
      this.updateMovesUI();
    }

    this.triggerTimeAttackDrop();
    if (window.audio && typeof window.audio.playPour === 'function') {
      window.audio.playPour();
    }
  }

  tickTimeAttack() {
    this.timeAttackSecondsRemaining--;

    const timerEl = document.getElementById('lbl-timer');
    if (timerEl) {
      timerEl.textContent = window.leaderboardManager
        ? window.leaderboardManager.formatTime(Math.max(0, this.timeAttackSecondsRemaining))
        : `${this.timeAttackSecondsRemaining}s`;
      if (this.timeAttackSecondsRemaining <= 15) {
        timerEl.className = 'font-mono font-black text-rose-400 text-sm animate-pulse';
      } else {
        timerEl.className = 'font-mono font-black text-amber-300 text-sm';
      }
    }

    if (this.timeAttackSecondsRemaining <= 0) {
      this.endTimeAttack('timeout');
      return;
    }

    // Temporizador de caída de los 4 reactivos telegrafiados
    if (this.timeAttackPendingDropExecution) {
      if (!this.isPouringAnimation) {
        this.timeAttackPendingDropExecution = false;
        this.triggerTimeAttackDrop();
      } else {
        this.timeAttackDropTimer = 0;
        this.renderTimeAttackDropHUD();
      }
    } else {
      this.timeAttackDropTimer--;
      if (this.timeAttackDropTimer <= 0) {
        if (this.isPouringAnimation) {
          // Si el contador de derrame llega a 0 y se está ejecutando una animación de vertido/movimiento,
          // esperar a que finalice la animación para derramar los líquidos
          this.timeAttackDropTimer = 0;
          this.timeAttackPendingDropExecution = true;
          this.renderTimeAttackDropHUD();
        } else {
          this.triggerTimeAttackDrop();
        }
      } else {
        this.renderTimeAttackDropHUD();
        if (this.timeAttackDropTimer <= 4) {
          const markers = this.tubesGrid?.querySelectorAll('.ta-incoming-marker');
          markers?.forEach(m => m.classList.add('ta-urgent'));
        }
      }
    }

    // En Contrarreloj, comprobar y vaciar inmediatamente los tubos que se hayan llenado
    this.checkTimeAttackTubes();

    this.updateMovesUI();
  }

  checkTimeAttackTubes() {
    if (!this.isTimeAttack) return false;
    let anyComplete = false;
    for (let i = 0; i < this.tubes.length; i++) {
      const tube = this.tubes[i];
      if (tube.liquids.length === tube.capacity && !tube.isDraining && this.isTubeComplete(tube, { allowChameleon: true })) {
        this.clearTimeAttackTubeImmediately(i);
        anyComplete = true;
      }
    }
    return anyComplete;
  }

  // Vaciado inmediato al completar tubo en Contrarreloj (timer de 5s desactivado temporalmente)
  clearTimeAttackTubeImmediately(tubeIdx) {
    const tube = this.tubes[tubeIdx];
    if (!tube || tube.isDraining) return;

    tube.isDraining = true;
    tube.isCountingDown = false;
    tube.countdownSeconds = undefined;
    if (this.timeAttackActiveCountdowns) {
      this.timeAttackActiveCountdowns.delete(tubeIdx);
    }

    const tubeEl = this.tubesGrid?.querySelector(`[data-index="${tubeIdx}"]`);
    if (tubeEl) {
      tubeEl.classList.remove('tube-countdown-active');
      const badge = tubeEl.querySelector('.ta-countdown-badge');
      if (badge) badge.remove();
      tubeEl.classList.add('tube-liquid-drain', 'tube-vaporize-complete');

      // Mostrar flotante de tiempo y puntos inmediatamente
      const floatTag = document.createElement('div');
      floatTag.className = 'time-attack-bonus-float';
      floatTag.innerHTML = `+15s ⏱️ +1,500 pts ✨`;
      tubeEl.appendChild(floatTag);
      setTimeout(() => floatTag.remove(), 1300);
    }

    // Sumar tiempo fijo de 15 segundos, puntos y contador de tubos vaciados
    this.timeAttackSecondsRemaining += 15;
    this.timeAttackScore += 1500;
    this.timeAttackTubesCleared++;
    this.updateMovesUI();

    if (window.audio) {
      if (typeof window.audio.playVictory === 'function') {
        window.audio.playVictory();
      } else if (typeof window.audio.playWinFanfare === 'function') {
        window.audio.playWinFanfare();
      }
    }

    // Efecto de drenaje del líquido (420ms) y vaciado completo
    setTimeout(() => {
      // 1. Vaciar el tubo para permitir volver a usarlo como frasco libre
      tube.liquids = [];
      tube.isDraining = false;
      tube.isCountingDown = false;
      tube.countdownSeconds = undefined;

      // 2. Rebalancear drops planificados si es necesario
      this.rebalancePendingDrops();

      // 3. Re-renderizar tubos para que quede completamente limpio y disponible
      this.renderTubes();
      this.updateMovesUI();

      // 4. Comprobar Aumento de Nivel (Cada 5 tubos completados)
      const calculatedLevel = 1 + Math.floor(this.timeAttackTubesCleared / 5);
      if (calculatedLevel > this.timeAttackLevel) {
        this.triggerTimeAttackLevelUp(calculatedLevel);
      }

      // Logro
      if (this.timeAttackScore >= 10000 && window.achievementManager) {
        window.achievementManager.unlock('time_attack_survivor');
      }

      // CONDICIÓN DE VICTORIA: Si consigue vaciar 100 tubos, gana
      if (this.timeAttackTubesCleared >= 100) {
        this.endTimeAttack('victory');
        return;
      }

      // BONIFICACIÓN PANTALLA LIMPIA:
      // "Si logra vaciar todos los tubos de la pantalla antes que caigan nuevos liquidos, se le dan 50 segundos extra."
      const allEmpty = this.tubes.every(t => t.liquids.length === 0 && !t.isCountingDown && !t.isDraining);
      if (allEmpty) {
        this.timeAttackSecondsRemaining += 50;
        this.timeAttackScore += 10000;
        this.showTimeAttackCleanScreenBanner();
        if (window.audio && typeof window.audio.playWinFanfare === 'function') {
          window.audio.playWinFanfare();
        }

        // Reiniciar ciclo de caída e inyectar 4 reactivos tras una breve pausa
        this.timeAttackDropTimer = this.getDropIntervalForLevel();
        this.planNextTimeAttackDrops();
        this.renderTimeAttackDropHUD();
        setTimeout(() => {
          if (this.isTimeAttack) {
            this.triggerTimeAttackDrop();
          }
        }, 1500);
      } else {
        this.checkTimeAttackDeadlock();
      }
    }, 420);
  }

  finalizeTubeClear(tubeIdx) {
    this.clearTimeAttackTubeImmediately(tubeIdx);
  }

  startTubeCountdown(tubeIdx) {
    this.clearTimeAttackTubeImmediately(tubeIdx);
  }

  // Aumento de nivel estilo Tetris cada 5 tubos completados
  triggerTimeAttackLevelUp(newLevel) {
    this.timeAttackLevel = newLevel;

    // 1. Sonido de celebración
    if (window.audio) {
      if (typeof window.audio.playLevelUp === 'function') window.audio.playLevelUp();
      else if (typeof window.audio.playWinFanfare === 'function') window.audio.playWinFanfare();
    }

    // 2. Movimiento / sacudida en la pantalla (Screen Shake)
    const boardWrap = document.getElementById('game-board-container') || document.body;
    if (boardWrap) {
      boardWrap.classList.remove('anim-screen-shake');
      void boardWrap.offsetWidth;
      boardWrap.classList.add('anim-screen-shake');
      setTimeout(() => boardWrap.classList.remove('anim-screen-shake'), 600);
    }

    // 3. Cartel temporal con aviso especial si se sumó un nuevo color
    const existing = document.querySelector('.ta-levelup-banner');
    if (existing) existing.remove();

    const prevCount = this.getTimeAttackColorCount(newLevel - 1);
    const newCount = this.getTimeAttackColorCount(newLevel);
    const newInterval = this.getDropIntervalForLevel();

    let extraSub = `⚡ Velocidad de derrame -7% (${newInterval}s) ⚡`;
    if (newCount > prevCount) {
      extraSub = `🎨 ¡${newCount}º líquido en juego! • Derrame -7% (${newInterval}s) ⚡`;
      // Añadir tubos vacíos para asegurar maniobrabilidad al introducir nuevo líquido
      const neededTubes = Math.min(10, newCount + 2);
      while (this.tubes.length < neededTubes) {
        this.tubes.push({
          id: this.tubes.length,
          capacity: 4,
          liquids: [],
          isLocked: false,
          isGlued: false,
          isNarrow: false
        });
      }
      this.renderTubes();
    }

    const banner = document.createElement('div');
    banner.className = 'ta-levelup-banner';
    banner.innerHTML = `
      <div class="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">¡Aumento de Nivel!</div>
      <div class="text-3xl sm:text-4xl font-black text-white drop-shadow-md">¡NIVEL ${newLevel}!</div>
      <div class="text-xs text-sky-200 mt-1.5 font-bold">${extraSub}</div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2400);

    // 4. Actualizar temporizador si es mayor al nuevo intervalo reducido
    if (this.timeAttackDropTimer > newInterval) {
      this.timeAttackDropTimer = newInterval;
    }
    this.renderTimeAttackDropHUD();
    this.updateMovesUI();
  }

  showTimeAttackCleanScreenBanner() {
    const existing = document.querySelector('.ta-clean-screen-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'ta-clean-screen-banner';
    banner.innerHTML = `🌟 ¡PANTALLA LIMPIA! +50s EXTRA ✨`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2200);
  }

  showTimeAttackNotice(text) {
    const existing = document.querySelector('.ta-drop-notice-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'ta-drop-notice-banner';
    banner.innerHTML = text;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2000);
  }

  // Caída de los 4 reactivos telegrafiados
  triggerTimeAttackDrop() {
    if (!this.isTimeAttack) return;

    // Si aún se está ejecutando una animación de movimiento o vertido, diferir y esperar
    if (this.isPouringAnimation) {
      this.timeAttackPendingDropExecution = true;
      this.timeAttackDropTimer = 0;
      this.renderTimeAttackDropHUD();
      return;
    }

    // "Solo deben caer si existen cuatro espacios disponibles."
    const totalFreeSpaces = this.tubes.reduce((acc, t) => {
      if (t.isCountingDown || t.isDraining) return acc;
      return acc + Math.max(0, t.capacity - t.liquids.length);
    }, 0);

    if (totalFreeSpaces < 4) {
      this.showTimeAttackNotice('⚠️ Huecos insuficientes para la caída (requiere 4 espacios libres)');
      this.timeAttackDropTimer = 5; // Reintentar en 5 segundos
      this.renderTimeAttackDropHUD();
      return;
    }

    if (!this.timeAttackPendingDrops || this.timeAttackPendingDrops.length < 4) {
      this.planNextTimeAttackDrops();
    }

    // Ejecutar la caída de los reactivos planificados
    for (const drop of this.timeAttackPendingDrops) {
      let target = this.tubes[drop.targetTubeIdx];
      // Si el objetivo se llenó o está vaciándose, reasignar dinámicamente a otro tubo libre
      if (!target || target.isCountingDown || target.isDraining || target.liquids.length >= target.capacity) {
        const eligible = this.tubes.filter(t => !t.isCountingDown && !t.isDraining && t.liquids.length < t.capacity);
        if (eligible.length > 0) {
          target = eligible[Math.floor(Math.random() * eligible.length)];
        }
      }

      if (target && target.liquids.length < target.capacity) {
        target.liquids.push({
          colorIndex: drop.colorIndex,
          color: drop.color,
          name: drop.name,
          shape: drop.shape,
          letter: drop.letter || drop.shape,
          pattern: drop.pattern,
          textHex: drop.textHex,
          isMystery: false,
          revealed: true
        });
      }
    }

    if (window.audio && typeof window.audio.playPour === 'function') {
      window.audio.playPour();
    }

    this.showTimeAttackNotice('💧 ¡Han caído 4 nuevos reactivos! ⚡');

    // Planificar la siguiente ronda de 4 reactivos telegrafiados
    this.planNextTimeAttackDrops();
    this.timeAttackDropTimer = this.getDropIntervalForLevel();

    this.renderTubes();
    this.renderTimeAttackDropHUD();
    this.updateMovesUI();

    this.checkTimeAttackTubes();
    this.checkTimeAttackDeadlock();
  }

  areTubesAdjacent(idxA, idxB) {
    if (idxA === idxB) return false;
    if (Math.abs(idxA - idxB) === 1) return true;

    const elA = this.tubesGrid?.querySelector(`[data-index="${idxA}"]`);
    const elB = this.tubesGrid?.querySelector(`[data-index="${idxB}"]`);
    if (!elA || !elB) return false;

    const rA = elA.getBoundingClientRect();
    const rB = elB.getBoundingClientRect();
    const cAx = rA.left + rA.width / 2;
    const cAy = rA.top + rA.height / 2;
    const cBx = rB.left + rB.width / 2;
    const cBy = rB.top + rB.height / 2;

    const dist = Math.hypot(cAx - cBx, cAy - cBy);
    const maxThreshold = Math.max(rA.height, rB.height) * 1.35;
    return dist <= maxThreshold;
  }

  hasPossibleMoves() {
    for (let i = 0; i < this.tubes.length; i++) {
      const fromTube = this.tubes[i];
      if (fromTube.liquids.length === 0 || fromTube.isCountingDown || fromTube.isDraining) continue;
      if (this.isTubeComplete(fromTube)) continue;

      for (let j = 0; j < this.tubes.length; j++) {
        if (i === j) continue;
        const toTube = this.tubes[j];
        if (toTube.isCountingDown || toTube.isDraining) continue;
        if (toTube.liquids.length >= toTube.capacity) continue;

        if (this.canPour(i, j)) {
          // Si el tubo destino es volátil / afín, solo es movimiento viable si el color es compatible
          if (toTube.isAffinity || toTube.isSuperFragile || toTube.isFragile) {
            const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
            const isChameleon = topFrom.isChameleon || topFrom.color === 'chameleon';
            const isAffinityMatch = isChameleon || (Array.isArray(toTube.allowedColors) && toTube.allowedColors.includes(topFrom.color));
            if (!isAffinityMatch) continue;
          }
          return true;
        }
      }
    }
    return false;
  }

  checkTimeAttackDeadlock() {
    if (!this.isTimeAttack) return false;

    // Si algún tubo se está vaciando, liberará huecos en segundos
    const hasBusyTubes = this.tubes.some(t => t.isCountingDown || t.isDraining);
    if (hasBusyTubes) return false;

    // "Si se llenan los tubos con liquidos incorrectos y no se puede mover, o si se acaba el tiempo, se finaliza el reto."
    if (!this.hasPossibleMoves()) {
      this.endTimeAttack('deadlock');
      return true;
    }
    return false;
  }

  endTimeAttack(reason = 'timeout') {
    if (this.timeAttackInterval) {
      clearInterval(this.timeAttackInterval);
      this.timeAttackInterval = null;
    }
    this.timeAttackPendingDropExecution = false;
    if (this.timeAttackActiveCountdowns) {
      this.timeAttackActiveCountdowns.clear();
    }
    if (window.audio) window.audio.stopMusic();
    const dropHud = document.getElementById('ta-drop-hud');
    if (dropHud) dropHud.remove();
    const hudContainer = document.getElementById('time-attack-hud-container');
    if (hudContainer) {
      hudContainer.classList.add('hidden');
      hudContainer.innerHTML = '';
    }

    const isVictory = (reason === 'victory');
    if (isVictory) {
      if (window.audio && typeof window.audio.playWinFanfare === 'function') {
        window.audio.playWinFanfare();
      }
    } else {
      if (window.audio && typeof window.audio.playGameOverSound === 'function') {
        window.audio.playGameOverSound();
      } else if (window.audio) {
        window.audio.playFailSound();
      }
    }

    const isNewBest = window.stateManager ? window.stateManager.recordTimeAttackScore(
      this.timeAttackScore,
      Math.max(0, 60 - this.timeAttackSecondsRemaining),
      this.timeAttackTubesCleared
    ) : false;

    const modal = document.getElementById('modal-time-attack-gameover');
    if (modal) {
      const lblTitle = document.getElementById('lbl-ta-title');
      const lblDesc = document.getElementById('lbl-ta-desc');
      const iconResult = document.getElementById('icon-ta-result');
      const lblScore = document.getElementById('lbl-ta-final-score');
      const lblTubes = document.getElementById('lbl-ta-tubes-cleared');
      const lblBest = document.getElementById('lbl-ta-best-score');
      const badgeNew = document.getElementById('lbl-ta-new-record-badge');

      if (lblTitle) {
        if (isVictory) lblTitle.textContent = '¡VICTORIA MAGISTRAL! 🏆';
        else if (reason === 'deadlock') lblTitle.textContent = '¡Sin Movimientos Posibles! 🛑';
        else lblTitle.textContent = '¡Tiempo Agotado! ⏳';
      }
      if (lblDesc) {
        if (isVictory) lblDesc.textContent = '¡Increíble hazaña! Has conseguido vaciar 100 tubos de Alquimia Viva.';
        else if (reason === 'deadlock') lblDesc.textContent = 'Los tubos se llenaron con combinaciones incompatibles y no quedan movimientos válidos.';
        else lblDesc.textContent = 'El reloj de la Alquimia Viva ha concluido su ciclo.';
      }
      if (iconResult) {
        iconResult.textContent = isVictory ? '🏆' : (reason === 'deadlock' ? '🛑' : '⏳');
      }
      if (lblScore) lblScore.textContent = `${this.timeAttackScore.toLocaleString()} pts`;
      if (lblTubes) lblTubes.textContent = `${this.timeAttackTubesCleared} / 100 tubos`;
      if (lblBest && window.stateManager) {
        lblBest.textContent = `${window.stateManager.getTimeAttackRecord().bestScore.toLocaleString()} pts`;
      }
      if (badgeNew) {
        badgeNew.style.display = isNewBest ? 'inline-flex' : 'none';
      }
      modal.classList.remove('hidden');
    }
  }

  // --- MODO CASUAL SANDBOX INFINITO ---
  // --- MODO CASUAL SANDBOX INFINITO ---
  openCasualSandboxModal() {
    const modal = document.getElementById('modal-casual-sandbox');
    if (!modal) return;
    const cbSuggest = document.getElementById('cb-sandbox-suggest-publish');
    if (cbSuggest) {
      cbSuggest.checked = window.stateManager ? window.stateManager.isSandboxPublishPromptEnabled() : true;
    }

    const sm = window.stateManager;
    const unlocked = sm ? (sm.state.progress.unlockedLevel || 1) : 1;
    const mechUnlocks = [
      { id: 'cb-sandbox-mystery', lbl: 'lbl-cb-mystery', lvl: 11 },
      { id: 'cb-sandbox-giant', lbl: 'lbl-cb-giant', lvl: 21 },
      { id: 'cb-sandbox-lock', lbl: 'lbl-cb-lock', lvl: 31 },
      { id: 'cb-sandbox-narrow', lbl: 'lbl-cb-narrow', lvl: 41 },
      { id: 'cb-sandbox-chameleon', lbl: 'lbl-cb-chameleon', lvl: 61 },
      { id: 'cb-sandbox-fragile', lbl: 'lbl-cb-fragile', lvl: 71 }
    ];

    mechUnlocks.forEach(m => {
      const cb = document.getElementById(m.id);
      const lbl = document.getElementById(m.lbl);
      if (cb) {
        if (unlocked < m.lvl) {
          cb.checked = false;
          cb.disabled = true;
          if (lbl) {
            lbl.classList.add('opacity-40', 'cursor-not-allowed');
            lbl.title = `Bloqueado: Requiere desbloquear el Nivel ${m.lvl} en la Historia.`;
          }
        } else {
          cb.disabled = false;
          if (lbl) {
            lbl.classList.remove('opacity-40', 'cursor-not-allowed');
            lbl.title = '';
          }
        }
      }
    });

    modal.classList.remove('hidden');
    if (window.audio) window.audio.playSelect();
  }

  closeCasualSandboxModal() {
    const modal = document.getElementById('modal-casual-sandbox');
    if (!modal) return;
    modal.classList.add('hidden');
    if (window.audio) window.audio.playSelect();
    if (this.navigationSource === 'home') {
      this.openHomeModal();
    }
  }

  startCasualSandbox(config = null) {
    this.navigationSource = 'game';
    const cbSuggest = document.getElementById('cb-sandbox-suggest-publish');
    if (cbSuggest && window.stateManager) {
      window.stateManager.setSandboxPublishPromptEnabled(cbSuggest.checked);
    }
    this.closeCasualSandboxModal();
    this.isCasualSandbox = true;
    this.isTimeAttack = false;
    this.isDailyChallenge = false;
    this.isHonorMode = false;

    const unlockedLvl = window.stateManager ? (window.stateManager.state.progress.unlockedLevel || 1) : 1;

    if (!config) {
      const tubeCount = parseInt(document.getElementById('input-sandbox-tubes')?.value, 10) || 7;
      const colorCount = parseInt(document.getElementById('input-sandbox-colors')?.value, 10) || 5;
      const mechanics = {
        mystery: (unlockedLvl >= 11) && !!document.getElementById('cb-sandbox-mystery')?.checked,
        giant: (unlockedLvl >= 21) && !!document.getElementById('cb-sandbox-giant')?.checked,
        lock: (unlockedLvl >= 31) && !!document.getElementById('cb-sandbox-lock')?.checked,
        narrow: (unlockedLvl >= 41) && !!document.getElementById('cb-sandbox-narrow')?.checked,
        glued: (unlockedLvl >= 51) && !!document.getElementById('cb-sandbox-glued')?.checked,
        chameleon: (unlockedLvl >= 61) && !!document.getElementById('cb-sandbox-chameleon')?.checked,
        fragile: (unlockedLvl >= 71) && !!document.getElementById('cb-sandbox-fragile')?.checked
      };
      config = { tubeCount, colorCount, mechanics, seed: Math.floor(Math.random() * 9999999) };
    } else if (config && config.mechanics) {
      if (unlockedLvl < 11) config.mechanics.mystery = false;
      if (unlockedLvl < 21) config.mechanics.giant = false;
      if (unlockedLvl < 31) config.mechanics.lock = false;
      if (unlockedLvl < 41) config.mechanics.narrow = false;
      if (unlockedLvl < 51) config.mechanics.glued = false;
      if (unlockedLvl < 61) config.mechanics.chameleon = false;
      if (unlockedLvl < 71) config.mechanics.fragile = false;
    }
    this.casualSandboxConfig = config;

    const data = window.LevelGenerator.generateCasualSandbox(config);
    this.loadLevel('casual_sandbox', 0, data);
  }

  nextCasualSandboxLevel() {
    if (!this.casualSandboxConfig) {
      this.casualSandboxConfig = { tubeCount: 7, colorCount: 5, mechanics: {}, seed: Math.floor(Math.random() * 9999999) };
    }
    this.casualSandboxConfig.seed = Math.floor(Math.random() * 9999999);
    const data = window.LevelGenerator.generateCasualSandbox(this.casualSandboxConfig);
    this.loadLevel('casual_sandbox', 0, data);
  }

  // --- MODO DESCANSO VISUAL (FILTRO AMARILLO / LENTES SEPIA) ---
  toggleVisualComfortMode(forceValue = null) {
    const sm = window.stateManager;
    const currentVal = sm ? sm.isVisualComfortMode() : false;
    const nextVal = (forceValue !== null) ? !!forceValue : !currentVal;

    if (sm) sm.setVisualComfortMode(nextVal);

    if (nextVal) {
      if (window.paletteManager) window.paletteManager.applyPreset('visual_comfort');
      // Garantizar que los líquidos se mantengan limpios y puros sin forzar símbolos ni letras
      this.showAccessibilityPatterns = false;
      this.showAccessibilityLetters = false;
      if (sm?.state?.settings) {
        sm.state.settings.showAccessibilityPatterns = false;
        sm.state.settings.showAccessibilityLetters = false;
        sm.saveState();
      }
      const cbPatterns = document.getElementById('toggle-accessibility-patterns');
      if (cbPatterns) cbPatterns.checked = false;
      const cbLetters = document.getElementById('toggle-accessibility-letters');
      if (cbLetters) cbLetters.checked = false;
    } else {
      if (window.paletteManager) window.paletteManager.applyPreset('aaa');
    }

    const cbComfort = document.getElementById('toggle-visual-comfort-mode');
    if (cbComfort) cbComfort.checked = nextVal;

    this.refreshBoardVisuals();
    if (window.audio) window.audio.playSelect();
  }

  // --- IDENTIFICADOR DE LETRAS EN LÍQUIDOS ---
  toggleAccessibilityLetters(forceValue = null) {
    const sm = window.stateManager;
    const currentVal = sm ? sm.isAccessibilityLettersMode() : false;
    const nextVal = (forceValue !== null) ? !!forceValue : !currentVal;

    if (sm) sm.setAccessibilityLettersMode(nextVal);
    this.showAccessibilityLetters = nextVal;

    const cb = document.getElementById('toggle-accessibility-letters');
    if (cb) cb.checked = nextVal;

    this.refreshBoardVisuals();
    if (window.audio) window.audio.playSelect();
  }

  // Actualiza los colores, nombres, formas y letras de los líquidos en el tablero según la paleta activa
  refreshBoardVisuals() {
    if (!this.tubes) return;
    const pm = window.paletteManager;
    if (pm) {
      this.tubes.forEach(tube => {
        tube.liquids.forEach(liq => {
          if (!liq.isMystery && !liq.isChameleon) {
            let col = null;
            if (liq.colorIndex !== undefined && liq.colorIndex !== null) {
              col = pm.getColor(liq.colorIndex);
            } else if (liq.color) {
              col = pm.getColorByHex(liq.color);
            }
            if (col) {
              liq.color = col.hex;
              liq.name = col.name;
              liq.shape = col.shape;
              liq.letter = col.letter;
              liq.pattern = col.pattern;
              liq.textHex = col.textHex;
            }
          }
        });
      });
    }
    this.renderTubes();
  }

  updateMovesUI() {
    if (this.isTimeAttack) {
      if (this.lblMoves) this.lblMoves.textContent = `${this.timeAttackScore.toLocaleString()} pts`;
      if (this.lblOptimalMoves) {
        this.lblOptimalMoves.textContent = `${this.timeAttackTubesCleared}/100 | Caída: ${this.timeAttackDropTimer}s`;
      }
      const timerEl = document.getElementById('lbl-timer');
      if (timerEl) {
        timerEl.textContent = window.leaderboardManager
          ? window.leaderboardManager.formatTime(Math.max(0, this.timeAttackSecondsRemaining))
          : `${this.timeAttackSecondsRemaining}s`;
        if (this.timeAttackSecondsRemaining <= 15) {
          timerEl.className = 'font-mono font-black text-rose-400 text-sm animate-pulse';
        } else {
          timerEl.className = 'font-mono font-black text-amber-300 text-sm';
        }
      }
      this.updateButtonsUI();
      return;
    }
    if (this.isHonorMode) {
      this.honorMovesRemaining = this.honorMovesLimit - this.moves;
      if (this.lblMoves) {
        const isLow = this.honorMovesRemaining <= 3;
        this.lblMoves.innerHTML = `
          <span>${this.moves}</span>
          <span class="text-[11px] ml-1 font-mono ${isLow ? 'text-rose-400 font-black animate-pulse' : 'text-amber-300'}">
            (${Math.max(0, this.honorMovesRemaining)} restantes / max ${this.honorMovesLimit})
          </span>
        `;
      }
      if (this.honorMovesRemaining < 0) {
        this.handleHonorDefeat('moves');
        return;
      }
      this.updateButtonsUI();
      return;
    }

    if (this.lblMoves) this.lblMoves.textContent = this.moves;
    this.updateStarsPreview();
    this.updateAuxiliaryButtonUI();
    this.updateChallengesHUD();
  }

  updateStarsPreview() {
    const starsCont = document.getElementById('stars-preview');
    if (!starsCont || !this.levelData) return;
    const optimal = this.levelData.optimalMoves;
    let stars = 3;
    if (this.moves > optimal * 1.5) stars = 1;
    else if (this.moves > optimal) stars = 2;

    starsCont.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      starsCont.innerHTML += `
        <i data-lucide="star" class="w-3.5 h-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}"></i>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }

  updateButtonsUI() {
    if (this.isTimeAttack) {
      if (this.btnUndo) {
        this.btnUndo.disabled = true;
        this.btnUndo.classList.add('opacity-40', 'cursor-not-allowed');
        this.btnUndo.title = 'Deshacer desactivado en Modo Ataque';
      }
      if (this.btnAddTube) {
        this.btnAddTube.disabled = true;
        this.btnAddTube.classList.add('opacity-40', 'cursor-not-allowed');
        this.btnAddTube.title = 'Botella auxiliar no permitida en Modo Ataque';
      }
      return;
    }
    if (this.isHonorMode) {
      if (this.btnUndo) {
        this.btnUndo.disabled = true;
        this.btnUndo.classList.add('opacity-40', 'cursor-not-allowed');
        this.btnUndo.title = 'Deshacer desactivado en Desafíos de Honor';
      }
      if (this.btnAddTube) {
        this.btnAddTube.disabled = true;
        this.btnAddTube.classList.add('opacity-40', 'cursor-not-allowed');
        this.btnAddTube.title = 'Botella auxiliar no permitida en Desafíos de Honor';
      }
      return;
    }
    if (this.btnUndo) {
      this.btnUndo.disabled = this.moveHistory.length === 0;
      this.btnUndo.classList.remove('opacity-40', 'cursor-not-allowed');
      this.btnUndo.title = 'Deshacer último movimiento';
    }
    this.updateAuxiliaryButtonUI();
  }

  updateAuxiliaryButtonUI() {
    if (!this.btnAddTube) return;
    const cooldown = window.stateManager ? window.stateManager.getCooldownRemaining() : 0;
    const lblAdd = document.getElementById('lbl-add-tube-text');

    if (cooldown > 0) {
      this.btnAddTube.disabled = true;
      this.btnAddTube.classList.add('opacity-50', 'cursor-not-allowed');
      if (lblAdd) lblAdd.textContent = `+ Botella (${cooldown} movs)`;
      this.btnAddTube.title = `En enfriamiento: faltan ${cooldown} movimientos para usar otra botella (o recárgala en la Tienda)`;
    } else if (this.extraTubesUsed >= 1) {
      this.btnAddTube.disabled = true;
      this.btnAddTube.classList.add('opacity-50', 'cursor-not-allowed');
      if (lblAdd) lblAdd.textContent = 'En uso (1 max)';
      this.btnAddTube.title = 'Ya tienes una botella auxiliar activa en este nivel';
    } else {
      this.btnAddTube.disabled = false;
      this.btnAddTube.classList.remove('opacity-50', 'cursor-not-allowed');
      if (lblAdd) lblAdd.textContent = '+ Botella (❤️)';
      this.btnAddTube.title = 'Añadir una botella vacía auxiliar (cuesta 1 vida)';
    }
  }

  getCoins() {
    return window.stateManager ? window.stateManager.getCoins() : this.coins;
  }

  addCoins(amount) {
    if (window.stateManager) {
      this.coins = window.stateManager.addCoins(amount);
    } else {
      this.coins += amount;
    }
    this.updateCoinsUI();
  }

  spendCoins(amount) {
    let success = false;
    if (window.stateManager) {
      success = window.stateManager.spendCoins(amount);
      if (success) {
        this.coins = window.stateManager.getCoins();
      }
    } else if (this.coins >= amount) {
      this.coins -= amount;
      success = true;
    }
    if (success) {
      this.updateCoinsUI();
    }
    return success;
  }

  updateCoinsUI() {
    const current = this.getCoins();
    const formatted = current >= 1000000000
      ? (current / 1000000000).toFixed(1) + 'B'
      : current >= 1000000
        ? (current / 1000000).toFixed(1) + 'M'
        : current >= 10000
          ? (current / 1000).toFixed(1) + 'k'
          : current.toLocaleString();

    if (this.lblCoins) {
      this.lblCoins.textContent = formatted;
      this.lblCoins.title = `${current.toLocaleString()} monedas`;
    }
    const shopBal = document.getElementById('shop-coins-balance');
    if (shopBal) shopBal.textContent = formatted;
    const homeCoins = document.getElementById('home-stat-coins');
    if (homeCoins) homeCoins.textContent = `${formatted} 🪙`;
    const pauseCoins = document.getElementById('pause-lbl-coins');
    if (pauseCoins) pauseCoins.textContent = formatted;
  }

  // --- RENDERIZADO VISUAL DE FRASCOS Y LÍQUIDOS (OPTIMIZADO PARA MÓVILES Y PWA) ---
  renderTubes() {
    if (!this.tubesGrid) return;
    this.tubesGrid.innerHTML = '';

    const totalTubes = this.tubes.length;
    const isMobile = (typeof window !== 'undefined' && window.innerWidth < 640);
    const isNarrow = (typeof window !== 'undefined' && window.innerWidth < 400);

    let widthClass = 'tube-size-normal';
    let heightMultiplier = 1;
    let gapClass = 'gap-3 sm:gap-6';
    let maxWidthClass = 'max-w-4xl';

    if (totalTubes > 14) {
      widthClass = 'tube-size-tiny';
      gapClass = isNarrow ? 'gap-x-1 gap-y-8' : 'gap-x-1.5 sm:gap-x-2.5 gap-y-9';
      maxWidthClass = 'max-w-[98vw]';
      heightMultiplier = isMobile ? 0.72 : 0.80;
    } else if (totalTubes > 9) {
      widthClass = 'tube-size-compact';
      gapClass = isNarrow ? 'gap-x-1.5 gap-y-8' : 'gap-x-2 sm:gap-x-3.5 gap-y-9';
      maxWidthClass = 'max-w-5xl';
      heightMultiplier = isMobile ? 0.78 : 0.88;
    } else if (totalTubes > 6) {
      widthClass = 'tube-size-medium';
      gapClass = isNarrow ? 'gap-x-2 gap-y-8' : 'gap-x-2.5 sm:gap-x-4 gap-y-10';
      maxWidthClass = 'max-w-4xl';
      heightMultiplier = isMobile ? 0.84 : 0.94;
    } else {
      widthClass = 'tube-size-normal';
      gapClass = isNarrow ? 'gap-x-2.5 gap-y-8' : 'gap-x-3 sm:gap-x-6 gap-y-10';
      maxWidthClass = 'max-w-3xl';
      heightMultiplier = isMobile ? 0.88 : 1;
    }

    this.tubesGrid.className = `flex flex-wrap items-center justify-center ${gapClass} z-20 ${maxWidthClass} transition-all duration-300`;

    const useLetters = this.showAccessibilityLetters || (window.stateManager && window.stateManager.isAccessibilityLettersMode());

    this.tubes.forEach((tube, idx) => {
      const tubeEl = document.createElement('div');
      tubeEl.className = `test-tube ${widthClass} relative`;

      let baseHeight = isMobile ? 155 : 190;
      if (tube.capacity === 8) baseHeight = isMobile ? 245 : 310;
      else if (tube.capacity === 6) baseHeight = isMobile ? 200 : 250;
      else if (tube.capacity === 1) baseHeight = isMobile ? 70 : 85;
      tubeEl.style.height = `${Math.round(baseHeight * heightMultiplier)}px`;
      tubeEl.dataset.index = idx;

      if (this.selectedTubeIndex === idx) {
        tubeEl.classList.add('selected');
      }

      // Resaltar pistas de ayuda activas
      if (this.activeHint) {
        if (this.activeHint.from === idx) tubeEl.classList.add('tube-hint-source');
        if (this.activeHint.to === idx) tubeEl.classList.add('tube-hint-dest');
      }

      // Labio superior de vidrio
      const lip = document.createElement('div');
      lip.className = 'tube-lip';
      tubeEl.appendChild(lip);

      // Tapón de corcho de victoria
      const cork = document.createElement('div');
      cork.className = 'cork-plug';
      cork.id = `cork-${idx}`;
      tubeEl.appendChild(cork);

      // Cuerpo de vidrio que contiene y recorta todos los líquidos
      const glassEl = document.createElement('div');
      glassEl.className = 'tube-glass';

      // Overlay de candado si está bloqueado
      if (tube.isLocked) {
        const keyDef = window.paletteManager ? window.paletteManager.getColorByHex(tube.keyColor) : null;
        const keyHex = keyDef ? keyDef.hex : '#f59e0b';
        const keyShape = keyDef ? keyDef.shape : '🔑';

        const lockOverlay = document.createElement('div');
        lockOverlay.className = 'locked-overlay';
        lockOverlay.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-1 text-amber-400 shadow-md">
            <i data-lucide="lock" class="w-4 h-4"></i>
          </div>
          <span class="text-[9px] font-bold text-amber-300">Llave Requerida</span>
          <div class="mt-1 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/20">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${keyHex};"></span>
            <span class="text-[10px] text-white font-black">${keyShape}</span>
          </div>
        `;
        glassEl.appendChild(lockOverlay);
      }

      // Renderizar segmentos de líquido dentro de glassEl
      const unitHeightPercent = 100 / tube.capacity;
      tube.liquids.forEach((liq, lIdx) => {
        const isTop = (lIdx === tube.liquids.length - 1);
        const segment = document.createElement('div');
        segment.className = `liquid-segment ${isTop ? 'top-liquid' : ''}`;
        segment.style.height = `${unitHeightPercent}%`;

        if (liq.isMystery && !isTop) {
          // Capa oculta misteriosa
          segment.classList.add('liquid-mystery');
          segment.innerHTML = `<span>?</span>`;
        } else {
          // Capa de color normal o camaleón
          const shouldShowPatterns = this.showAccessibilityPatterns || (window.stateManager && window.stateManager.isAccessibilityPatternsMode && window.stateManager.isAccessibilityPatternsMode());
          
          const isChamWild = liq.isChameleon && (!liq.adaptedToColor || liq.color === 'chameleon');
          const isChamImitating = liq.isChameleon && !isChamWild;

          if (isChamWild) {
            // Cuando está solo: efecto brillante y colores cambiantes espectrales
            segment.classList.add('liquid-chameleon');
          } else if (isChamImitating) {
            // Al imitar: adquiere el color del objetivo con un patrón orgánico de variaciones de luminosidad (sin rayas)
            segment.style.backgroundColor = liq.color;
            segment.classList.add('liquid-chameleon-imitating');
          } else {
            segment.style.backgroundColor = liq.color;
            if (shouldShowPatterns && liq.pattern) segment.classList.add(liq.pattern);
          }

          // Burbujas ascendentes decorativas
          const bubble = document.createElement('div');
          bubble.className = 'bubble w-1.5 h-1.5 left-3';
          segment.appendChild(bubble);

          // Símbolos o letras y etiquetas de color (opcionales: sólo si el usuario activó letras o patrones de accesibilidad)
          if ((useLetters || shouldShowPatterns) && (liq.shape || liq.letter)) {
            const shapesList = ['●', '▲', '■', '★', '◆', '✚', '♥', '✦', '⬟', '⬢', '✿', '❄', '✪', '⯁', '🞛', '🞗'];
            let displayChar = liq.shape;
            if (useLetters) {
              if (liq.letter && !shapesList.includes(liq.letter)) {
                displayChar = liq.letter;
              } else if (window.paletteManager) {
                const col = (liq.colorIndex !== undefined && liq.colorIndex !== null)
                  ? window.paletteManager.getColor(liq.colorIndex)
                  : window.paletteManager.getColorByHex(liq.color);
                displayChar = (col && col.letter && !shapesList.includes(col.letter)) ? col.letter : null;
              }
              if (!displayChar || shapesList.includes(displayChar)) {
                const letterFallback = ['A', 'R', 'N', 'L', 'F', 'M', 'C', 'O', 'G', 'T', 'V', 'X', 'B', 'P', 'Y', 'E'];
                const idx = typeof liq.colorIndex === 'number' ? liq.colorIndex : 0;
                displayChar = letterFallback[idx % letterFallback.length];
              }
            }
            const isDarkText = liq.textHex === '#000000' || liq.textHex === '#111111';
            const textShadowStyle = isDarkText
              ? 'text-shadow: 0 0 3px rgba(255,255,255,0.95), 0 0 1px #ffffff;'
              : 'text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px #000000;';
            const iconClass = useLetters ? 'letter-icon font-mono font-black' : 'shape-icon';
            const fontSize = useLetters ? '1.25rem' : '1.15rem';

            segment.innerHTML += `
              <span class="${iconClass}" style="color: ${liq.textHex || '#fff'}; font-size: ${fontSize}; ${textShadowStyle}">
                ${displayChar}
              </span>
              <span class="color-text-label hidden font-mono">
                ${liq.name}
              </span>
            `;
          }
        }
        glassEl.appendChild(segment);
      });

      tubeEl.appendChild(glassEl);

      // Indicadores especiales (Tubo estrecho 1x1, Gigante, Pegado, Frágil)
      if (tube.isNarrow) {
        tubeEl.classList.add('tube-narrow');
        // Emisor de burbujitas mágicas continuas dentro del cristal
        const emitter = document.createElement('div');
        emitter.className = 'narrow-bubble-emitter';
        emitter.innerHTML = `
          <div class="narrow-bubble"></div>
          <div class="narrow-bubble"></div>
          <div class="narrow-bubble"></div>
          <div class="narrow-bubble"></div>
        `;
        glassEl.appendChild(emitter);

        const narrowTag = document.createElement('span');
        narrowTag.className = 'absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9.5px] text-purple-200 font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-purple-950/90 border border-purple-400/60 shadow-md whitespace-nowrap flex items-center gap-0.5 z-30 pointer-events-none';
        narrowTag.innerHTML = `<span>1x1</span><span class="text-[8px] text-purple-300">✨</span>`;
        tubeEl.appendChild(narrowTag);
      }
      if (tube.capacity === 8) {
        const superTag = document.createElement('span');
        superTag.className = 'absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-amber-300 font-black tracking-wider whitespace-nowrap bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/40 z-30 pointer-events-none shadow-sm';
        superTag.textContent = 'Max 8 (Titán)';
        tubeEl.appendChild(superTag);
      } else if (tube.capacity === 6) {
        const giantTag = document.createElement('span');
        giantTag.className = 'absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-sky-300 font-bold tracking-wider whitespace-nowrap bg-sky-950/80 px-1.5 py-0.5 rounded-full border border-sky-400/40 z-30 pointer-events-none shadow-sm';
        giantTag.textContent = 'Max 6';
        tubeEl.appendChild(giantTag);
      }
      if (tube.isGlued) {
        tubeEl.classList.add('tube-glued');
        const stoneEl = document.createElement('div');
        stoneEl.className = 'tube-stone-base';
        stoneEl.title = 'Frasco Inamovible (Incrustado en la roca: solo recibe líquidos)';
        stoneEl.innerHTML = `
          <svg viewBox="93 182 70 35" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <!-- Roca posterior -->
            <path d="M 104,187 L 116,184 L 128,193 L 140,184 L 152,190 L 160,208 L 144,215 L 111,215 L 95,208 Z" fill="#26364c"/>
            <!-- Facetas de la roca -->
            <path d="M 104,190 L 116,187 L 123,199 L 111,211 L 97,207 Z" fill="#34465e"/>
            <path d="M 128,193 L 140,187 L 151,194 L 144,211 L 128,215 L 123,199 Z" fill="#1b293d"/>
            <path d="M 140,187 L 152,190 L 160,208 L 144,211 L 151,194 Z" fill="#2d3e55"/>
            <!-- Grietas y aristas -->
            <path d="M 116,187 L 123,199 L 111,211 M 140,187 L 134,201 L 144,211" fill="none" stroke="#64758a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
          </svg>
        `;
        tubeEl.appendChild(stoneEl);
      }
      if (tube.isAffinity || tube.isFragile) {
        tubeEl.classList.add('tube-affinity');
        if (tube.isSuperFragile) tubeEl.classList.add('tube-super-fragile');
        if (tube.isBroken) tubeEl.classList.add('tube-shattered-remains');

        // Corona / pastilla superior de gemas de afinidad elemental
        if (Array.isArray(tube.allowedColors) && tube.allowedColors.length > 0) {
          const pill = document.createElement('div');
          pill.className = 'affinity-gems-pill';
          const iconSymbol = tube.isSuperFragile ? '⚡' : '💎';
          pill.innerHTML = `<span class="text-[9px] mr-0.5">${iconSymbol}</span>`;
          pill.title = `Colores Afines: ${(tube.allowedColorNames || []).join(', ') || 'Específicos'}`;

          tube.allowedColors.forEach(colorHex => {
            const dot = document.createElement('span');
            dot.className = 'affinity-gem-dot';
            dot.style.backgroundColor = colorHex;
            dot.style.color = colorHex;
            pill.appendChild(dot);
          });
          tubeEl.appendChild(pill);
        }

        // Capas de fisuras en el cristal
        if (!tube.isBroken) {
          if (tube.cracks === 1) {
            const crack1 = document.createElement('div');
            crack1.className = 'crack-overlay crack-stage-1';
            tubeEl.appendChild(crack1);
          } else if (tube.cracks >= 2) {
            const crack2 = document.createElement('div');
            crack2.className = 'crack-overlay crack-stage-2';
            tubeEl.appendChild(crack2);
          }
        }

        // Etiqueta de durabilidad / estado
        const durabilityTag = document.createElement('span');
        durabilityTag.className = 'durability-tag absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider whitespace-nowrap z-30 pointer-events-none shadow-sm px-1.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80';
        if (tube.isBroken) {
          durabilityTag.className += ' text-red-400';
          durabilityTag.textContent = '💥 ROTO';
        } else if (tube.isSuperFragile) {
          durabilityTag.className += ' text-amber-300';
          durabilityTag.textContent = '⚡ Volátil (1)';
        } else {
          const remaining = (tube.maxCracks || 3) - (tube.cracks || 0);
          durabilityTag.className += remaining <= 1 ? ' text-red-400' : ' text-purple-300';
          durabilityTag.textContent = `${remaining}/${tube.maxCracks || 3} 🛡️`;
        }
        durabilityTag.dataset.defaultText = durabilityTag.textContent;
        tubeEl.appendChild(durabilityTag);
      }

      // Modo Ataque: Previsualización de bloques que caerán sobre este tubo
      if (this.isTimeAttack && !tube.isCountingDown && this.timeAttackPendingDrops && this.timeAttackPendingDrops.length > 0) {
        const targetDrops = this.timeAttackPendingDrops.filter(d => d.targetTubeIdx === idx);
        if (targetDrops.length > 0) {
          const marker = document.createElement('div');
          const isUrgent = this.timeAttackDropTimer <= 4;
          marker.className = `ta-incoming-marker ${isUrgent ? 'ta-urgent' : ''}`;

          let pillsHtml = '';
          targetDrops.forEach(drop => {
            const char = useLetters ? (drop.letter || drop.shape) : (drop.shape || drop.letter);
            const isDark = drop.textHex === '#000000' || drop.textHex === '#111111';
            const shadowStyle = isDark ? 'text-shadow: 0 0 2px #ffffff;' : 'text-shadow: 0 1px 2px #000000;';
            pillsHtml += `
              <div class="ta-incoming-pill" style="background-color: ${drop.color}; color: ${drop.textHex || '#fff'}; ${shadowStyle}" title="Próximo líquido: ${drop.name}">
                ${char}
              </div>
            `;
          });

          marker.innerHTML = `
            <div class="ta-incoming-arrow">▼</div>
            <div class="ta-incoming-pills">${pillsHtml}</div>
          `;
          tubeEl.appendChild(marker);
        }
      }

      // Modo Ataque: Estado de drenaje/vaciado inmediato (timer desactivado temporalmente)
      if (this.isTimeAttack && tube.isDraining) {
        tubeEl.classList.add('tube-liquid-drain', 'tube-vaporize-complete');
      }

      // Rol y accesibilidad táctil para dispositivos móviles y lectores
      tubeEl.setAttribute('role', 'button');
      tubeEl.setAttribute('tabindex', '0');
      tubeEl.setAttribute('aria-label', `Frasco ${idx + 1}`);

      // Hover únicamente en dispositivos con puntero fino/ratón físico
      // (En móviles, el mouseenter sintetizado muta el DOM y cancela el evento táctil de toque)
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        tubeEl.addEventListener('mouseenter', () => this.showFluorBadge(tubeEl, tube));
        tubeEl.addEventListener('mouseleave', () => this.removeFluorBadge(tubeEl));
      }

      // Soporte táctil universal instantáneo sin retrasos ni deselección duplicada en Android/iOS
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let isTouchGesture = false;

      tubeEl.addEventListener('touchstart', (e) => {
        isTouchGesture = true;
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
        touchStartTime = Date.now();
      }, { passive: true });

      tubeEl.addEventListener('touchend', (e) => {
        if (!isTouchGesture) return;
        const touch = e.changedTouches && e.changedTouches[0];
        if (touch) {
          const dx = Math.abs(touch.clientX - touchStartX);
          const dy = Math.abs(touch.clientY - touchStartY);
          // Tap válido: movimiento menor a 15px (no es scroll o arrastre) y duración menor a 700ms
          if (dx < 15 && dy < 15 && (Date.now() - touchStartTime < 700)) {
            if (e.cancelable) e.preventDefault();
            this._lastTubeInteractionTime = Date.now();
            this.handleTubeClick(idx, tubeEl, e);
          }
        }
        isTouchGesture = false;
      }, { passive: false });

      tubeEl.addEventListener('click', (e) => {
        // Ignorar click sintético posterior generado por Android Chrome tras touchend
        if (this._lastTubeInteractionTime && (Date.now() - this._lastTubeInteractionTime < 450)) {
          return;
        }
        this._lastTubeInteractionTime = Date.now();
        this.handleTubeClick(idx, tubeEl, e);
      });

      tubeEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleTubeClick(idx, tubeEl, e);
        }
      });

      this.tubesGrid.appendChild(tubeEl);
    });

    if (window.lucide) lucide.createIcons();
    if (this.isTimeAttack) this.renderTimeAttackDropHUD();
    this.updateVolatileFeedback();
  }

  showFluorBadge(tubeEl, tube) {
    if (tube.liquids.length === 0 || tube.isLocked) return;
    if (tubeEl.querySelector('.tube-invalid-badge')) return;
    const topLiq = tube.liquids[tube.liquids.length - 1];
    const badge = document.createElement('div');
    badge.className = 'fluor-indicator';
    badge.id = 'active-fluor-badge';
    badge.innerHTML = `
      <span>${topLiq.shape}</span>
      <span>${topLiq.name || 'Color'}</span>
    `;
    tubeEl.appendChild(badge);
  }

  removeFluorBadge(tubeEl) {
    const badge = tubeEl.querySelector('#active-fluor-badge');
    if (badge) badge.remove();
  }

  selectTube(idx) {
    if (this.selectedTubeIndex !== null && this.selectedTubeIndex !== idx) {
      const prevEl = this.tubesGrid?.querySelector(`[data-index="${this.selectedTubeIndex}"]`);
      if (prevEl) prevEl.classList.remove('selected');
    }
    this.selectedTubeIndex = idx;
    this.lastInvalidTargetIdx = null;
    const currEl = this.tubesGrid?.querySelector(`[data-index="${idx}"]`);
    if (currEl) currEl.classList.add('selected');
    if (window.audio) window.audio.playSelect();
    this.updateVolatileFeedback();
  }

  deselectTube(playAudio = false) {
    if (this.selectedTubeIndex !== null) {
      const prevEl = this.tubesGrid?.querySelector(`[data-index="${this.selectedTubeIndex}"]`);
      if (prevEl) prevEl.classList.remove('selected');
      this.selectedTubeIndex = null;
      this.lastInvalidTargetIdx = null;
      if (playAudio && window.audio) window.audio.playSelect();
      this.updateVolatileFeedback();
    }
  }

  // --- INDICACIÓN VISUAL EN FRASCO VOLÁTIL / AFINIDAD AL SELECCIONAR LÍQUIDO ---
  updateVolatileFeedback() {
    if (!this.tubesGrid || !this.tubes) return;
    const allTubeEls = this.tubesGrid.querySelectorAll('.test-tube');

    const fromIdx = this.selectedTubeIndex;
    const fromTube = (fromIdx !== null && fromIdx >= 0 && fromIdx < this.tubes.length) ? this.tubes[fromIdx] : null;
    const topLiquid = (fromTube && fromTube.liquids.length > 0)
      ? fromTube.liquids[fromTube.liquids.length - 1]
      : null;

    this.tubes.forEach((tube, idx) => {
      const tubeEl = allTubeEls[idx];
      if (!tubeEl) return;

      // Limpiar clases y estados dinámicos previos
      tubeEl.classList.remove('tube-affinity-compatible', 'tube-affinity-incompatible');

      const durTag = tubeEl.querySelector('.durability-tag');
      if (durTag && durTag.dataset.defaultText) {
        durTag.textContent = durTag.dataset.defaultText;
      }

      // Solo aplica a tubos volátiles / afinidad activos no rotos
      const isVolatile = (tube.isAffinity || tube.isFragile || tube.isSuperFragile) && !tube.isBroken;
      if (!isVolatile) return;

      // Si no hay líquido seleccionado o es el mismo tubo seleccionado
      if (!topLiquid || fromIdx === idx) return;

      // Evaluar afinidad de color con el tubo volátil
      const isChameleon = topLiquid.isChameleon || topLiquid.color === 'chameleon';
      const isColorAllowed = Array.isArray(tube.allowedColors) && tube.allowedColors.includes(topLiquid.color);
      const isAffinityMatch = isChameleon || isColorAllowed;

      // Evaluar compatibilidad de apilado si el tubo volátil ya tiene líquido dentro
      let isStackCompatible = true;
      if (tube.liquids.length > 0) {
        const topTo = tube.liquids[tube.liquids.length - 1];
        if (topTo && !topTo.isChameleon && topTo.color !== 'chameleon') {
          if (!isChameleon && topLiquid.color !== topTo.color) {
            isStackCompatible = false;
          }
        }
      }

      // No puede recibir si está lleno
      const isNotFull = tube.liquids.length < tube.capacity;

      const isCompatible = isAffinityMatch && isStackCompatible && isNotFull;

      if (isCompatible) {
        // Se torna verdoso: líquido compatible
        tubeEl.classList.add('tube-affinity-compatible');
        if (durTag) {
          if (!durTag.dataset.defaultText) durTag.dataset.defaultText = durTag.textContent;
          durTag.textContent = `✓ Compatible (${durTag.dataset.defaultText})`;
        }
      } else {
        // Se torna rojizo: líquido incompatible (evita confusión por colores parecidos)
        tubeEl.classList.add('tube-affinity-incompatible');
        if (durTag) {
          if (!durTag.dataset.defaultText) durTag.dataset.defaultText = durTag.textContent;
          durTag.textContent = `✕ Incompatible (${durTag.dataset.defaultText})`;
        }
      }
    });
  }

  // --- LÓGICA DE MOVIMIENTOS Y VERTIDO CON ANIMACIONES COMPLETAS ---
  handleTubeClick(idx, tubeEl, event) {
    if (this.isPouringAnimation) return;
    if (window.audio) window.audio.init();

    const clickedTube = this.tubes[idx];

    // 1. Si no hay tubo seleccionado: intentar seleccionar
    if (this.selectedTubeIndex === null) {
      // Mecánica: Frasco pegado (solo puede recibir líquido, nunca vaciarse)
      if (clickedTube.isGlued) {
        this.triggerInvalidMove(idx, '🪨 Solo recibe (no sale)');
        return;
      }

      // Frasco destruido
      if (clickedTube.isBroken) {
        this.triggerInvalidMove(idx, '💥 Frasco destruido');
        return;
      }

      // Frasco con candado
      if (clickedTube.isLocked) {
        this.triggerInvalidMove(idx, '🔒 Candado cerrado');
        return;
      }

      // Frasco vacío
      if (clickedTube.liquids.length === 0) {
        this.triggerInvalidMove(idx, '🚫 Tubo vacío');
        return;
      }

      // Frasco ya completado
      if (this.isTubeComplete(clickedTube, { allowChameleon: false })) {
        this.triggerInvalidMove(idx, '✨ Tubo ya completado');
        return;
      }

      // Modo Ataque: Frasco en cuenta regresiva o vaciado
      if (this.isTimeAttack && (clickedTube.isCountingDown || clickedTube.isDraining)) {
        this.triggerInvalidMove(idx, '⏳ Vaciándose en breve...');
        return;
      }

      this.selectTube(idx);
      return;
    }

    // 2. Si se hace clic en el mismo tubo: deseleccionar
    if (this.selectedTubeIndex === idx) {
      this.deselectTube(true);
      return;
    }

    // 3. Si se hace clic en otro tubo: intentar verter
    const fromIdx = this.selectedTubeIndex;
    const toIdx = idx;
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    // Modo Ataque: Frasco receptor en vaciado
    if (this.isTimeAttack && (toTube.isCountingDown || toTube.isDraining)) {
      this.triggerInvalidMove(toIdx, '⏳ Tubo en vaciado');
      this.deselectTube();
      return;
    }

    // Frasco receptor destruido
    if (toTube.isBroken) {
      this.triggerInvalidMove(toIdx, '💥 Frasco destruido');
      this.deselectTube();
      return;
    }

    // Desbloqueo de candado si se vierte la llave correcta
    if (toTube.isLocked) {
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      const isKeyMatch = topFrom && toTube.keyColor && (
        topFrom.color.toLowerCase() === toTube.keyColor.toLowerCase() ||
        (topFrom.isChameleon && topFrom.revealed)
      );
      if (isKeyMatch) {
        this.saveStateForUndo();
        toTube.isLocked = false;
        if (window.audio) window.audio.playUnlock();
        this.triggerUnlockSuccess(toIdx, '🔓 ¡Candado Desbloqueado!');
        this.selectedTubeIndex = null;
        this.lastInvalidTargetIdx = null;
        this.moves++;
        this.renderTubes();
        this.updateButtonsUI();
        return;
      } else {
        this.triggerInvalidMove(toIdx, '🔒 Llave incorrecta');
        this.deselectTube();
        return;
      }
    }

    // REGLA DEL TUBO DE PRECISIÓN (1x1)
    if (toTube.isNarrow) {
      let topBlockCount = 0;
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      if (topFrom.isChameleon) {
        topBlockCount = 1;
      } else {
        const topColor = topFrom.color;
        for (let i = fromTube.liquids.length - 1; i >= 0; i--) {
          const item = fromTube.liquids[i];
          if (!item.isMystery && !item.isChameleon && item.color === topColor) {
            topBlockCount++;
          } else {
            break;
          }
        }
      }

      if (topBlockCount >= 2) {
        this.triggerNarrowChemicalReaction(fromIdx, toIdx);
        this.deselectTube();
        return;
      }
    }

    // Verificar si el vertido es válido
    if (this.canPour(fromIdx, toIdx)) {
      this.executePour(fromIdx, toIdx);
    } else {
      // Activar feedback de movimiento inválido y deseleccionar frasco de origen
      const reason = this.getInvalidPourReason(fromIdx, toIdx);

      // EASTER EGG ALQUÍMICO:
      if (reason === '🚫 ¡Líquido incompatible!') {
        this.incompatiblePourAttempts = (this.incompatiblePourAttempts || 0) + 1;
        if (this.incompatiblePourAttempts >= 50) {
          this.triggerApocalypseEasterEgg(fromIdx, toIdx);
          return;
        }
      }

      this.triggerInvalidMove(toIdx, reason);
      this.deselectTube();
    }
  }

  // Identificar el motivo específico por el cual un vertido es inválido
  getInvalidPourReason(fromIdx, toIdx) {
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    if (!fromTube || !toTube) return '🚫 Movimiento inválido';

    if (toTube.isBroken || fromTube.isBroken) return '💥 ¡Frasco destruido!';
    if (this.isTimeAttack && (fromTube.isCountingDown || toTube.isCountingDown || fromTube.isDraining || toTube.isDraining)) return '⏳ ¡Tubo en vaciado!';
    if (toTube.isLocked) return '🔒 Llave requerida';
    if (toTube.liquids.length >= toTube.capacity) return '🚫 ¡Tubo lleno!';
    if (fromTube.isGlued) return '🪨 ¡Frasco inamovible!';

    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];

    // Regla: El frasco en roca (capacidad 4) jamás puede recibir un color que requiere frasco gigante (6 u 8 unidades)
    if (toTube.isGlued && topFrom && !topFrom.isChameleon) {
      let totalColorUnits = 0;
      for (const t of this.tubes) {
        for (const l of t.liquids) {
          if (!l.isChameleon && l.color === topFrom.color) totalColorUnits++;
        }
      }
      if (totalColorUnits > toTube.capacity) {
        return `🪨 ¡Color de frasco largo (${totalColorUnits}u)! No cabe en la roca.`;
      }
    }

    if (toTube.liquids.length > 0) {
      const topTo = toTube.liquids[toTube.liquids.length - 1];
      if (topFrom && topTo && topFrom.color !== topTo.color && !topFrom.isChameleon && !topTo.isChameleon) {
        return '🚫 ¡Líquido incompatible!';
      }
    }

    return '🚫 Movimiento inválido';
  }

  // Feedback visual y sonoro ante movimientos inválidos
  triggerInvalidMove(tubeIdx, reasonText = '🚫 Movimiento inválido') {
    if (window.audio) {
      if (typeof window.audio.playInvalidMoveSound === 'function') {
        window.audio.playInvalidMoveSound();
      } else if (typeof window.audio.playFailSound === 'function') {
        window.audio.playFailSound();
      }
    }

    const tubeEl = this.tubesGrid?.querySelector(`[data-index="${tubeIdx}"]`);
    if (!tubeEl) return;

    this.removeFluorBadge(tubeEl);

    // Reiniciar animación si ya estaba activa
    tubeEl.classList.remove('tube-invalid-shake');
    void tubeEl.offsetWidth; // Forzar reflow para re-disparar keyframes
    tubeEl.classList.add('tube-invalid-shake');

    // Remover badge previo si existe en este tubo
    const oldBadge = tubeEl.querySelector('.tube-invalid-badge');
    if (oldBadge) oldBadge.remove();

    // Crear badge flotante con mensaje descriptivo
    const badge = document.createElement('div');
    badge.className = 'tube-invalid-badge';
    badge.textContent = reasonText;
    tubeEl.appendChild(badge);

    setTimeout(() => {
      tubeEl.classList.remove('tube-invalid-shake');
      if (badge.parentNode) badge.remove();
    }, 1100);
  }

  // Feedback visual y sonoro ante desbloqueo exitoso de candados
  triggerUnlockSuccess(tubeIdx, reasonText = '🔓 ¡Desbloqueado!') {
    const tubeEl = this.tubesGrid?.querySelector(`[data-index="${tubeIdx}"]`);
    if (!tubeEl) return;

    tubeEl.classList.remove('tube-unlock-pulse');
    void tubeEl.offsetWidth;
    tubeEl.classList.add('tube-unlock-pulse');

    const oldBadge = tubeEl.querySelector('.tube-success-badge');
    if (oldBadge) oldBadge.remove();

    const badge = document.createElement('div');
    badge.className = 'tube-success-badge';
    badge.textContent = reasonText;
    tubeEl.appendChild(badge);

    setTimeout(() => {
      tubeEl.classList.remove('tube-unlock-pulse');
      if (badge.parentNode) badge.remove();
    }, 1200);
  }

  // Comprobar y auto-desbloquear candados si se completa cualquier frasco con el color de la llave
  checkAutoUnlockLockedTubes() {
    let unlockedAny = false;
    this.tubes.forEach((tube, idx) => {
      if (tube.isLocked && tube.keyColor) {
        const isKeyColorComplete = this.tubes.some(t => {
          if (t === tube || t.liquids.length === 0) return false;
          if (!this.isTubeComplete(t, { allowChameleon: true })) return false;
          return t.liquids[0].color.toLowerCase() === tube.keyColor.toLowerCase();
        });

        if (isKeyColorComplete) {
          tube.isLocked = false;
          unlockedAny = true;
          this.triggerUnlockSuccess(idx, '🔓 ¡Color Completado!');
          if (window.audio) window.audio.playUnlock();
        }
      }
    });
    if (unlockedAny) {
      this.renderTubes();
      this.updateButtonsUI();
    }
  }

  canPour(fromIdx, toIdx) {
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    if (fromTube.isBroken || toTube.isBroken) return false;
    if (this.isTimeAttack && (fromTube.isCountingDown || toTube.isCountingDown || fromTube.isDraining || toTube.isDraining)) return false;
    if (toTube.isLocked || fromTube.liquids.length === 0) return false;
    if (toTube.liquids.length >= toTube.capacity) return false;

    // Un frasco pegado nunca puede verter
    if (fromTube.isGlued) return false;

    // Regla: El frasco en roca jamás puede recibir un color que requiere frasco gigante (6 u 8 unidades)
    if (toTube.isGlued) {
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      if (topFrom && !topFrom.isChameleon) {
        let totalColorUnits = 0;
        for (const t of this.tubes) {
          for (const l of t.liquids) {
            if (!l.isChameleon && l.color === topFrom.color) totalColorUnits++;
          }
        }
        if (totalColorUnits > toTube.capacity) return false;
      }
    }

    // Tubo de precisión (1x1): NUNCA permite fluidos con 2 o más cuartos combinados
    if (toTube.isNarrow) {
      let topBlockCount = 0;
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      if (topFrom.isChameleon) {
        topBlockCount = 1;
      } else {
        const topColor = topFrom.color;
        for (let i = fromTube.liquids.length - 1; i >= 0; i--) {
          const item = fromTube.liquids[i];
          if (!item.isMystery && !item.isChameleon && item.color === topColor) {
            topBlockCount++;
          } else {
            break;
          }
        }
      }
      if (topBlockCount >= 2) return false;
    }

    // Asegurar que la capa superior NUNCA esté bloqueada por misterio
    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (topFrom.isMystery) topFrom.isMystery = false;

    if (toTube.liquids.length === 0) return true; // Tubo receptor vacío

    const topTo = toTube.liquids[toTube.liquids.length - 1];
    if (topTo.isMystery) topTo.isMystery = false;

    // Coincidencia de color o camaleón
    return (topFrom.color === topTo.color || topFrom.isChameleon || topTo.isChameleon);
  }

  executePour(fromIdx, toIdx) {
    this.saveStateForUndo();
    this.isPouringAnimation = true;
    this.selectedTubeIndex = null;
    this.updateVolatileFeedback();

    if (this.touchedTubeIndices) {
      this.touchedTubeIndices.add(fromIdx);
      this.touchedTubeIndices.add(toIdx);
    }

    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (topFrom.isMystery) topFrom.isMystery = false;

    // Contar cuántos bloques contiguos se pueden mover:
    // EL LÍQUIDO CAMALEÓN ES INDIVIDUAL: Se mueve siempre solo (1 unidad)
    // y NUNCA arrastra el líquido que esté debajo.
    let pourColor = '#ec4899';
    if (topFrom.isChameleon) {
      if (toTube.liquids.length > 0) {
        const targetTop = toTube.liquids[toTube.liquids.length - 1];
        pourColor = (targetTop.color !== 'chameleon') ? targetTop.color : (targetTop.adaptedToColor || '#ec4899');
      } else {
        pourColor = '#ec4899';
      }
    } else {
      pourColor = topFrom.color;
    }
    let count = 0;
    if (topFrom.isChameleon) {
      count = 1;
    } else {
      for (let i = fromTube.liquids.length - 1; i >= 0; i--) {
        const item = fromTube.liquids[i];
        if (!item.isMystery && !item.isChameleon && item.color === pourColor) {
          count++;
        } else {
          break;
        }
      }
    }

    // Si algún tubo es estrecho, sólo se mueve 1 unidad
    if (fromTube.isNarrow || toTube.isNarrow) {
      count = 1;
    }

    const space = toTube.capacity - toTube.liquids.length;
    const unitsToMove = Math.min(count, space);

    // Obtener elementos DOM para la cinemática
    const allTubeEls = this.tubesGrid.querySelectorAll('.test-tube');
    const fromEl = allTubeEls[fromIdx];
    const toEl = allTubeEls[toIdx];

    // Detener la animación flotante de frasco seleccionado y habilitar cinemática de vertido
    fromEl.classList.remove('selected');
    fromEl.classList.add('is-pouring');
    fromEl.style.zIndex = '70';

    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const isTargetToTheRight = tRect.left >= fRect.left;
    const tiltDeg = isTargetToTheRight ? 54 : -54;
    const offsetX = tRect.left - fRect.left + (isTargetToTheRight ? -26 : 26);
    const offsetY = tRect.top - fRect.top - 48;

    // =========================================================================
    // SECUENCIA CINEMÁTICA ESTRICTA:
    // 1. Levantar botella origen
    // 2. Acercar botella origen a destino
    // 3. Inclinar botella origen
    // 4. Derramar líquido en destino
    // 5. Animación vaciándose líquido en una, llenándose en la otra
    // 6. Vuelta de botella origen a lugar origen
    // =========================================================================

    // PASO 1: Levantar botella origen (-36px)
    fromEl.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
    fromEl.style.transform = 'translateY(-36px)';

    setTimeout(() => {
      // PASO 2: Acercar botella origen a boca de destino
      fromEl.style.transition = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)';
      fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

      setTimeout(() => {
        // PASO 3: Inclinar botella origen hacia el destino
        fromEl.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.3, 0.64, 1)';
        fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tiltDeg}deg)`;

        setTimeout(() => {
          // PASO 4: Iniciar chorro de fluido en Canvas y sonido
          const portionDuration = unitsToMove > 1 ? 320 : 440;
          const totalPourTime = unitsToMove * portionDuration;

          if (window.audio) window.audio.playPourSound();
          let streamColor = '#ec4899';
          if (topFrom.isChameleon) {
            streamColor = (topFrom.adaptedToColor && topFrom.adaptedToColor !== 'chameleon')
              ? topFrom.adaptedToColor
              : (toTube.liquids.length > 0 && toTube.liquids[toTube.liquids.length - 1].color !== 'chameleon' ? toTube.liquids[toTube.liquids.length - 1].color : '#ec4899');
          } else {
            streamColor = (topFrom.color === 'chameleon') ? '#ec4899' : topFrom.color;
          }
          const currentFromRect = fromEl.getBoundingClientRect();
          this.drawPourStream(currentFromRect, tRect, streamColor, isTargetToTheRight, totalPourTime + 80);

          // PASO 5: Animación secuencial de vaciado porción por porción con transformaciones de fluido
          const fromGlass = fromEl.querySelector('.tube-glass');
          const toGlass = toEl.querySelector('.tube-glass');
          const topSegments = fromGlass ? Array.from(fromGlass.querySelectorAll('.liquid-segment')) : [];

          for (let u = 0; u < unitsToMove; u++) {
            setTimeout(() => {
              // 5.a Vaciado fluido porción origen
              const segIdx = topSegments.length - 1 - u;
              if (segIdx >= 0 && topSegments[segIdx]) {
                const segToDrain = topSegments[segIdx];
                segToDrain.classList.add('liquid-draining');
                segToDrain.style.transition = `height ${portionDuration * 0.9}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${portionDuration * 0.8}ms ease`;
                segToDrain.style.height = '0%';
                segToDrain.style.opacity = '0.1';
              }

              // 5.b Llenado porción destino con rebote y oleaje líquido
              if (toGlass) {
                const incomingSeg = document.createElement('div');
                incomingSeg.className = 'liquid-segment top-liquid liquid-bounce';
                if (topFrom.isChameleon) {
                  if (toTube.liquids.length > 0) {
                    incomingSeg.classList.add('liquid-chameleon-imitating');
                    incomingSeg.style.backgroundColor = pourColor;
                  } else {
                    incomingSeg.classList.add('liquid-chameleon');
                  }
                } else {
                  incomingSeg.style.backgroundColor = pourColor;
                }
                incomingSeg.style.height = '0%';
                incomingSeg.style.transition = `height ${portionDuration * 0.85}ms cubic-bezier(0.2, 0.9, 0.3, 1.2)`;
                toGlass.appendChild(incomingSeg);
                requestAnimationFrame(() => {
                  incomingSeg.style.height = `${(1 / toTube.capacity) * 100}%`;
                });
              }

              // Sonido de trasvase repetido si son múltiples unidades
              if (u > 0 && window.audio) {
                window.audio.playPourSound();
              }
            }, u * portionDuration);
          }

          setTimeout(() => {
            // PASO 6: Vuelta de botella origen a su posición inicial
            // 6.a: Enderezar
            fromEl.style.transition = 'transform 0.18s ease-out';
            fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(0deg)`;

            setTimeout(() => {
              // 6.b: Regresar al lugar de origen
              fromEl.style.transition = 'transform 0.24s cubic-bezier(0.25, 1, 0.5, 1)';
              fromEl.style.transform = 'translate(0px, 0px)';

              setTimeout(() => {
                // Limpiar estilos inline
                fromEl.style.transition = '';
                fromEl.style.transform = '';
                fromEl.style.zIndex = '';
                fromEl.classList.remove('selected', 'is-pouring');

                // Transferir unidades en memoria
                const movedUnits = [];
                for (let u = 0; u < unitsToMove; u++) {
                  const item = fromTube.liquids.pop();
                  item.isMystery = false;

                  // Camaleón adopta color receptor si aplica
                  if (item.isChameleon) {
                    if (toTube.liquids.length > 0) {
                      const targetTop = toTube.liquids[toTube.liquids.length - 1];
                      const targetColor = (targetTop.color !== 'chameleon') ? targetTop.color : targetTop.adaptedToColor;
                      if (targetColor) {
                        item.color = targetColor;
                        item.name = targetTop.name;
                        item.shape = targetTop.shape;
                        item.pattern = null; // No con rayas adicionales: sutiles variaciones de luminosidad
                        item.textHex = targetTop.textHex;
                        item.adaptedToColor = targetColor;
                      }
                    } else {
                      // Al vaciarse en un frasco limpio, vuelve a su estado comodín puro (cuando está solo)
                      item.color = 'chameleon';
                      item.name = 'Camaleón';
                      item.shape = '★';
                      item.pattern = null;
                      item.textHex = '#ffffff';
                      item.adaptedToColor = null;
                    }
                  } else {
                    // Si se vierte un color sobre un camaleón comodín que estaba solo en el tubo receptor:
                    if (toTube.liquids.length > 0) {
                      const underItem = toTube.liquids[toTube.liquids.length - 1];
                      if (underItem && underItem.isChameleon && (!underItem.adaptedToColor || underItem.color === 'chameleon')) {
                        underItem.color = item.color;
                        underItem.name = item.name;
                        underItem.shape = item.shape;
                        underItem.pattern = null; // Sin rayas adicionales
                        underItem.textHex = item.textHex;
                        underItem.adaptedToColor = item.color;
                      }
                    }
                  }
                  toTube.liquids.push(item);
                  movedUnits.push(item);
                }

                // Revelar capas misteriosas si la nueva capa superior era oculta
                // Regla: si hay bloques ocultos consecutivos del mismo color, se desbloquean todos juntos
                let mysteryRevealed = false;
                if (fromTube.liquids.length > 0) {
                  const newTop = fromTube.liquids[fromTube.liquids.length - 1];
                  if (newTop.isMystery) {
                    newTop.isMystery = false;
                    mysteryRevealed = true;
                  }
                  const topColor = newTop.color;
                  for (let k = fromTube.liquids.length - 2; k >= 0; k--) {
                    if (fromTube.liquids[k].isMystery && fromTube.liquids[k].color === topColor) {
                      fromTube.liquids[k].isMystery = false;
                      mysteryRevealed = true;
                    } else {
                      break;
                    }
                  }
                }
                if (mysteryRevealed && window.audio) {
                  window.audio.playReveal();
                }

                // --- MECÁNICA: FRASCO DE AFINIDAD (CRISTAL SELECTIVO Y VOLÁTIL) ---
                if (toTube.isAffinity && !toTube.isBroken && movedUnits.length > 0) {
                  const pouredSample = movedUnits[0];
                  const isChameleon = pouredSample.isChameleon || pouredSample.color === 'chameleon';
                  const isAffinityMatch = isChameleon || (Array.isArray(toTube.allowedColors) && toTube.allowedColors.includes(pouredSample.color));

                  if (!isAffinityMatch) {
                    toTube.cracks = (toTube.cracks || 0) + 1;
                    const maxCracks = toTube.maxCracks || (toTube.isSuperFragile ? 1 : 3);
                    const tubeDomEl = this.tubesGrid?.querySelector(`[data-index="${toIdx}"]`);

                    if (toTube.cracks < maxCracks) {
                      // Fisura parcial (leve o profunda)
                      if (window.audio && typeof window.audio.playGlassCrack === 'function') {
                        window.audio.playGlassCrack(toTube.cracks);
                      }
                      if (tubeDomEl) {
                        tubeDomEl.classList.remove('tube-crack-jolt');
                        void tubeDomEl.offsetWidth;
                        tubeDomEl.classList.add('tube-crack-jolt');
                      }
                      const remaining = maxCracks - toTube.cracks;
                      this.triggerInvalidMove(toIdx, `⚠️ Fisura (${remaining} restante${remaining > 1 ? 's' : ''})`);
                    } else {
                      // Rotura total del frasco
                      toTube.isBroken = true;
                      if (window.achievementManager) {
                        window.achievementManager.unlock('first_shatter');
                      }
                      if (window.audio && typeof window.audio.playGlassShatter === 'function') {
                        window.audio.playGlassShatter();
                      }
                      if (tubeDomEl) {
                        tubeDomEl.classList.add('tube-shattering');
                      }

                      // Dispersar los líquidos recién vertidos para que no se pierdan unidades del puzzle
                      const spilled = [...toTube.liquids];
                      toTube.liquids = [];

                      for (let i = 0; i < spilled.length; i++) {
                        const item = spilled[i];
                        const eligibleTubes = this.tubes.filter((t, eIdx) => {
                          if (eIdx === toIdx) return false;
                          if (t.isBroken || t.isLocked || t.isNarrow || t.isGlued) return false;
                          if (this.isTubeComplete(t)) return false;
                          return t.liquids.length < t.capacity;
                        });

                        if (eligibleTubes.length > 0) {
                          const dest = eligibleTubes[Math.floor(Math.random() * eligibleTubes.length)];
                          dest.liquids.push(item);
                        } else {
                          fromTube.liquids.push(item);
                        }
                      }
                      this.triggerInvalidMove(toIdx, '💥 ¡CRISTAL DESTRUIDO!');
                    }
                  }
                }

                // Incrementar movimientos reales y actualizar UI
                this.moves++;
                if (window.stateManager) {
                  window.stateManager.onMoveMade();
                }
                this.updateMovesUI();

                this.selectedTubeIndex = null;
                this.clearHintHighlight();
                this.isPouringAnimation = false;

                this.renderTubes();
                this.updateButtonsUI();
                this.updateChallengesHUD();

                // Auto-desbloqueo de candados si se completó el frasco del color de la llave
                this.checkAutoUnlockLockedTubes();

                // Comprobar victoria
                this.checkVictory();
                if (this.isTimeAttack) {
                  this.checkTimeAttackDeadlock();
                  if (this.timeAttackPendingDropExecution) {
                    this.timeAttackPendingDropExecution = false;
                    setTimeout(() => {
                      if (this.isTimeAttack && !this.isPouringAnimation) {
                        this.triggerTimeAttackDrop();
                      }
                    }, 50);
                  }
                }
              }, 250);
            }, 190);
          }, 520);
        }, 220);
      }, 290);
    }, 190);
  }

  // =========================================================================
  // EASTER EGG: CATACLISMO QUÍMICO (50 INTENTOS INCOMPATIBLES)
  // Permite el vertido prohibido ("le deje"), sacude el mundo con un estruendo
  // y abre el modal con la animación cósmica del planeta Tierra estallando.
  // =========================================================================
  triggerApocalypseEasterEgg(fromIdx, toIdx) {
    this.saveStateForUndo();
    this.isPouringAnimation = true;

    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    if (!fromTube || !toTube || fromTube.liquids.length === 0) {
      this.isPouringAnimation = false;
      return;
    }

    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (topFrom.isMystery) topFrom.isMystery = false;

    // Obtener elementos DOM para la cinemática
    const allTubeEls = this.tubesGrid.querySelectorAll('.test-tube');
    const fromEl = allTubeEls[fromIdx];
    const toEl = allTubeEls[toIdx];

    if (!fromEl || !toEl) {
      this.isPouringAnimation = false;
      this.openApocalypseModal();
      return;
    }

    // Detener la animación flotante de frasco seleccionado y habilitar cinemática de vertido
    fromEl.classList.remove('selected');
    fromEl.classList.add('is-pouring');
    fromEl.style.zIndex = '70';

    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const isTargetToTheRight = tRect.left >= fRect.left;
    const tiltDeg = isTargetToTheRight ? 54 : -54;
    const offsetX = tRect.left - fRect.left + (isTargetToTheRight ? -26 : 26);
    const offsetY = tRect.top - fRect.top - 48;

    // 1. Levantar frasco origen
    fromEl.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
    fromEl.style.transform = 'translateY(-36px)';

    setTimeout(() => {
      // 2. Acercar frasco origen al destino
      fromEl.style.transition = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)';
      fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

      setTimeout(() => {
        // 3. Inclinar botella origen hacia el destino
        fromEl.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.3, 0.64, 1)';
        fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tiltDeg}deg)`;

        setTimeout(() => {
          // 4. Iniciar chorro del líquido incompatible hacia el frasco receptor ("le deje")
          const pourDuration = 440;
          if (window.audio) window.audio.playPourSound();
          const streamColor = topFrom.isChameleon ? '#ec4899' : (topFrom.color === 'chameleon' ? '#ec4899' : topFrom.color);
          const currentFromRect = fromEl.getBoundingClientRect();
          this.drawPourStream(currentFromRect, tRect, streamColor, isTargetToTheRight, pourDuration + 80);

          // 5. Animación de drenaje en origen y llenado en destino
          const fromGlass = fromEl.querySelector('.tube-glass');
          const toGlass = toEl.querySelector('.tube-glass');
          const topSegments = fromGlass ? Array.from(fromGlass.querySelectorAll('.liquid-segment')) : [];

          if (topSegments.length > 0) {
            const segToDrain = topSegments[topSegments.length - 1];
            segToDrain.classList.add('liquid-draining');
            segToDrain.style.transition = `height ${pourDuration * 0.9}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${pourDuration * 0.8}ms ease`;
            segToDrain.style.height = '0%';
            segToDrain.style.opacity = '0.1';
          }

          if (toGlass) {
            const incomingSeg = document.createElement('div');
            incomingSeg.className = 'liquid-segment top-liquid liquid-bounce';
            incomingSeg.style.backgroundColor = streamColor;
            incomingSeg.style.height = '0%';
            incomingSeg.style.transition = `height ${pourDuration * 0.85}ms cubic-bezier(0.2, 0.9, 0.3, 1.2)`;
            toGlass.appendChild(incomingSeg);
            requestAnimationFrame(() => {
              incomingSeg.style.height = `${100 / toTube.capacity}%`;
            });
          }

          // Transferir 1 unidad del líquido incompatible al frasco destino
          const transferred = fromTube.liquids.pop();
          toTube.liquids.push(transferred);

          // 6. ¡REACCIÓN QUÍMICA CATASTRÓFICA Y EXPLOSIÓN DEL MUNDO!
          setTimeout(() => {
            fromEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
            fromEl.style.transform = 'translateY(0) rotate(0deg)';
            fromEl.classList.remove('is-pouring');

            // Frasco entra en ebullición caótica inestable y la pantalla tiembla violentamente
            toEl.classList.add('tube-catastrophic-reaction');
            document.body.classList.add('screen-apocalypse-rumble');

            // Gran estruendo sísmico procedimental
            if (window.audio && typeof window.audio.playWorldExplosion === 'function') {
              window.audio.playWorldExplosion();
            }

            // Desplegar el modal del mundo explotando
            setTimeout(() => {
              document.body.classList.remove('screen-apocalypse-rumble');
              toEl.classList.remove('tube-catastrophic-reaction');
              fromEl.style.zIndex = '';
              this.isPouringAnimation = false;
              this.selectedTubeIndex = null;
              this.renderTubes();
              this.openApocalypseModal();
            }, 950);
          }, pourDuration + 100);
        }, 220);
      }, 280);
    }, 180);
  }

  openApocalypseModal() {
    const modal = document.getElementById('modal-apocalypse-easter-egg');
    if (!modal) return;
    this.showModal(modal);
    if (window.lucide) lucide.createIcons();
  }

  closeApocalypseModal() {
    const modal = document.getElementById('modal-apocalypse-easter-egg');
    this.hideModal(modal);
  }

  restartFromApocalypse() {
    this.closeApocalypseModal();
    this.incompatiblePourAttempts = 0;
    this.loadLevel(this.currentLevel);
    if (window.audio) window.audio.playSelect();
  }

  // --- TRAZADO DEL CHORRO DE AGUA CON CANVAS Y FÍSICA PROCEDURAL ---
  drawPourStream(fRect, tRect, color, isToRight, duration) {
    if (!this.pourCanvas || !this.pourCtx) return;
    const ctx = this.pourCtx;
    const parentRect = this.pourCanvas.getBoundingClientRect();

    const startX = (isToRight ? fRect.right - 14 : fRect.left + 14) - parentRect.left;
    const startY = fRect.top + 22 - parentRect.top;
    const endX = (tRect.left + tRect.width / 2) - parentRect.left;
    const endY = (tRect.top + 28) - parentRect.top;

    const start = performance.now();

    // Partículas de salpicaduras con velocidad, gravedad g=0.28 y dispersión estocástica
    const splashes = [];
    for (let i = 0; i < 18; i++) {
      splashes.push({
        x: endX + (Math.random() - 0.5) * 14,
        y: endY,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 2,
        radius: Math.random() * 2.5 + 1.2,
        alpha: 1,
        color: color
      });
    }

    const render = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, this.pourCanvas.width, this.pourCanvas.height);

      if (progress < 1) {
        ctx.save();

        // Parábola de fluido con comba natural por gravedad
        const dx = Math.abs(startX - endX);
        const arch = Math.max(8, Math.min(32, dx * 0.35));
        const midX = (startX + endX) / 2 + (isToRight ? arch * 0.3 : -arch * 0.3);
        const midY = Math.min(startY, endY) - arch * 0.4;

        // Chorro de fluido translúcido con brillo de color
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Núcleo reflectante blanco central
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Salpicaduras con física en boca receptora
        if (progress > 0.25) {
          splashes.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28; // Gravedad del SRS g = 0.28 px/frame^2
            p.alpha -= 0.022;
            if (p.alpha > 0) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = Math.max(0, p.alpha);
              ctx.fill();

              // Micro destello blanco en la gota
              ctx.beginPath();
              ctx.arc(p.x - 0.5, p.y - 0.5, p.radius * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = Math.max(0, p.alpha * 0.9);
              ctx.fill();
            }
          });
        }

        ctx.restore();
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, this.pourCanvas.width, this.pourCanvas.height);
      }
    };

    requestAnimationFrame(render);
  }

  // --- REGLAS DE TUBOS COMPLETOS Y REACCIÓN QUÍMICA 1x1 ---
  isTubeComplete(tube, { allowChameleon = false } = {}) {
    if (!tube || tube.isBroken || tube.liquids.length === 0) return false;
    if (tube.liquids.length !== tube.capacity) return false;
    if (tube.liquids.some(l => l.isMystery)) return false;

    // Si no se permite camaleón (durante el juego normal), cualquier presencia de camaleón
    // significa que el tubo no está bloqueado como completo.
    const hasCham = tube.liquids.some(l => l.isChameleon || l.color === 'chameleon');
    if (!allowChameleon && hasCham) return false;

    // Obtener los colores reales
    const realColors = tube.liquids.filter(l => !l.isChameleon && l.color !== 'chameleon').map(l => l.color);
    if (realColors.length === 0) {
      return allowChameleon;
    }

    const targetColor = realColors[0];
    const allMatch = realColors.every(c => c === targetColor);
    if (!allMatch) return false;

    // REGLA CRÍTICA DEL USUARIO:
    // "puede pasar que yo traspase en una botella gigante un liquido temporalmente a otra botella y lo llene
    // (porque el gigante tiene 8 y las demas 4), bloqueandome para continuar"
    // Durante el juego (allowChameleon = false), si el total de unidades de este color en el nivel supera
    // la capacidad de este tubo (por ejemplo, color de frasco gigante de 6 u 8 unidades en un frasco de 4),
    // este frasco es solo un receptor temporal y NO debe considerarse completado ni bloquearse.
    if (!allowChameleon && this.tubes) {
      let totalUnitsOfColor = 0;
      for (const t of this.tubes) {
        for (const l of t.liquids) {
          if (!l.isChameleon && l.color === targetColor) {
            totalUnitsOfColor++;
          }
        }
      }
      if (totalUnitsOfColor > tube.capacity) {
        return false;
      }
    }

    return true;
  }

  triggerNarrowChemicalReaction(fromIdx, toIdx) {
    this.saveStateForUndo();
    this.isPouringAnimation = true;

    try {
      if (window.achievementManager) {
        try {
          window.achievementManager.increment('chemical_master_10', 1);
        } catch (achErr) {
          console.warn('Error al incrementar logro de reacción química:', achErr);
        }
      }

      const fromTube = this.tubes[fromIdx];
      const toTube = this.tubes[toIdx];

      const allTubeEls = this.tubesGrid.querySelectorAll('.test-tube');
      const fromEl = allTubeEls[fromIdx];
      const toEl = allTubeEls[toIdx];

      // Reproducir audio de reacción química
      if (window.audio && typeof window.audio.playChemicalReactionSound === 'function') {
        window.audio.playChemicalReactionSound();
      } else if (window.audio) {
        window.audio.playFailSound();
      }

      // Efectos visuales de sobrecarga y ebullición en DOM:
      if (toEl) {
        toEl.classList.add('tube-overload-flash');
        setTimeout(() => toEl.classList.remove('tube-overload-flash'), 900);
      }
      if (fromEl) {
        fromEl.classList.add('tube-boil-overflow');
        setTimeout(() => fromEl.classList.remove('tube-boil-overflow'), 900);
      }

      // Vaciado del tubo y dispersión aleatoria en tubos incompletos
      const spilled = [...fromTube.liquids];
      fromTube.liquids = [];

      // Efectos de salpicaduras de líquido desparramándose por la pantalla y banner cerca del tubo
      if (toEl) {
        const rect = toEl.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        this.triggerScreenLiquidSplatter(originX, originY, spilled.map(s => s.color));
        this.showChemicalReactionBannerNear(toEl);
      } else {
        this.showChemicalReactionBannerNear(null);
      }

      // Distribuir cada unidad en los demás tubos que NO estén completos, tengan espacio libre
      // y NUNCA en frascos inamovibles (roca) ni frascos de afinidad con color incompatible
      for (let i = 0; i < spilled.length; i++) {
        const item = spilled[i];
        item.isMystery = false; // Se revela por la reacción química

        const eligibleTubes = this.tubes.filter((t, idx) => {
          if (idx === fromIdx) return false;
          if (t.isLocked) return false;
          if (t.isNarrow) return false;
          if (t.isGlued || t.isImmovable || t.immovable) return false; // NUNCA esparcir en frascos inamovibles (roca)
          if (t.isBroken) return false;
          if (t.isAffinity && (!t.allowedColors || !t.allowedColors.includes(item.color))) return false;
          if (this.isTubeComplete(t)) return false; // NUNCA alterar tubos completos
          return t.liquids.length < t.capacity;
        });

        if (eligibleTubes.length > 0) {
          const dest = eligibleTubes[Math.floor(Math.random() * eligibleTubes.length)];
          dest.liquids.push(item);
        } else {
          // Si ningún otro frasco tiene lugar disponible, regresa al frasco origen
          fromTube.liquids.push(item);
        }
      }

      // Incrementar movimientos (penalización que retrasa y afecta el récord y monedas)
      this.moves++;
      if (window.stateManager) {
        window.stateManager.onMoveMade();
      }
      this.updateMovesUI();
    } catch (err) {
      console.error('Error durante la reacción química inesperada del tubo 1x1:', err);
    } finally {
      setTimeout(() => {
        this.selectedTubeIndex = null;
        this.clearHintHighlight();
        this.isPouringAnimation = false;
        this.renderTubes();
        this.updateButtonsUI();
        this.checkAutoUnlockLockedTubes();
        this.checkVictory();
        if (this.isTimeAttack) {
          this.checkTimeAttackDeadlock();
          if (this.timeAttackPendingDropExecution) {
            this.timeAttackPendingDropExecution = false;
            setTimeout(() => {
              if (this.isTimeAttack && !this.isPouringAnimation) {
                this.triggerTimeAttackDrop();
              }
            }, 50);
          }
        }
      }, 850);
    }
  }

  // --- EFECTO DE LÍQUIDO DESPARRAMÁNDOSE POR LA PANTALLA ---
  triggerScreenLiquidSplatter(originX, originY, colors = []) {
    const palette = colors.length > 0 ? colors : ['#ec4899', '#a855f7', '#38bdf8', '#f59e0b', '#10b981'];
    const count = 30;

    // Vibración háptica en celulares si está disponible
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 30, 80]); } catch (e) {}
    }

    // Sacudida enérgica de pantalla
    const appEl = document.getElementById('app-container') || document.body;
    appEl.classList.remove('perfect-screen-shake');
    void appEl.offsetWidth;
    appEl.classList.add('perfect-screen-shake');
    setTimeout(() => appEl.classList.remove('perfect-screen-shake'), 600);

    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div');
      drop.className = 'chem-splatter-droplet';
      const col = palette[i % palette.length];
      const size = Math.floor(Math.random() * 14 + 8); // 8px a 22px
      drop.style.width = `${size}px`;
      drop.style.height = `${size}px`;
      drop.style.backgroundColor = col;
      drop.style.color = col;
      drop.style.left = `${originX}px`;
      drop.style.top = `${originY}px`;

      // Ángulo y distancia aleatoria multidireccional
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 260 + 60; // 60px a 320px
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const scale = (Math.random() * 0.4 + 0.25).toFixed(2);

      drop.style.setProperty('--tx', `${tx}px`);
      drop.style.setProperty('--ty', `${ty}px`);
      drop.style.setProperty('--scale', scale);

      document.body.appendChild(drop);
      setTimeout(() => drop.remove(), 950);
    }
  }

  // --- BANNER DE REACCIÓN QUÍMICA POSICIONADO CERCA DEL TUBO ---
  showChemicalReactionBannerNear(targetEl) {
    let banner = document.getElementById('chemical-reaction-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chemical-reaction-banner';
      banner.className = 'chemical-banner-near';
      document.body.appendChild(banner);
    }

    banner.innerHTML = `
      <div class="flex items-center justify-center gap-1.5 mb-0.5">
        <span class="text-base sm:text-lg">⚗️💥</span>
        <span class="text-amber-300 font-black tracking-wide text-xs sm:text-sm">¡REACCIÓN EN CADENA!</span>
      </div>
      <div class="text-[10px] sm:text-[11px] font-semibold text-amber-100 leading-tight">
        ¡Sobrecarga en el tubo 1x1! El líquido desbordó y se esparció por el laboratorio.
      </div>
    `;

    // Posicionamiento dinámico cerca del tubo
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const bannerWidth = 260;
      let left = rect.left + rect.width / 2 - bannerWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - bannerWidth - 12, left));

      let top = rect.top - 82;
      if (top < 70) {
        top = rect.bottom + 12;
      }
      banner.style.left = `${left}px`;
      banner.style.top = `${top}px`;
      banner.style.transform = 'none';
    } else {
      banner.style.left = '50%';
      banner.style.top = '120px';
      banner.style.transform = 'translateX(-50%)';
    }

    banner.style.display = 'block';

    if (this._chemBannerTimer) clearTimeout(this._chemBannerTimer);
    this._chemBannerTimer = setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 4200);
  }

  showChemicalReactionBanner() {
    this.showChemicalReactionBannerNear(null);
  }

  // --- COMPROBACIÓN DE VICTORIA Y SECUENCIA DE CORCHOS ---
  checkVictory() {
    if (this.isTimeAttack) {
      this.rebalancePendingDrops();
      this.checkTimeAttackTubes();
      return;
    }

    // 1. CONDICIÓN CRÍTICA DE VICTORIA SOLICITADA POR EL USUARIO:
    // Las botellas especiales (gigantes de max 6 u 8, botellas de una dirección / en la roca)
    // DEBEN ESTAR COMPLETAS (no pueden dejarse vacías ni a medio llenar).
    for (const tube of this.tubes) {
      const isGiant = (tube.capacity > 4);
      const isOneWay = tube.isGlued;
      if (isGiant || isOneWay) {
        if (!this.isTubeComplete(tube, { allowChameleon: true })) {
          return; // La botella especial no está completa
        }
      }
    }

    // 2. Todas las demás botellas deben estar o bien COMPLETAMENTE VACÍAS o bien COMPLETAMENTE LLENAS
    for (const tube of this.tubes) {
      if (tube.liquids.length === 0) continue; // Tubos auxiliares vacíos son válidos
      if (tube.liquids.length !== tube.capacity) {
        return; // Tubo a medio llenar
      }
    }

    // 3. Validación de completitud con Líquido Camaleón:
    // "Al finalizar el nivel, se valida que todas las botellas tengan liquido completo y en ese caso
    // si se cuenta como mismo color el liquido camaleon, porque si las demas botellas están completas
    // es porque se usó correctamente. En el resto de los casos solo se considera completa por color real."
    for (const tube of this.tubes) {
      if (tube.liquids.length === 0) continue;
      if (!this.isTubeComplete(tube, { allowChameleon: true })) {
        return;
      }
    }

    if (this.isHonorMode) {
      this.handleHonorVictory();
      return;
    }
    this.triggerVictorySequence();
  }

  triggerVictorySequence() {
    // Si estamos en modo de juego o prueba de nivel personalizado
    if (this.customLevelTesting) {
      if (this.customLevelTesting.isCommunityPlay) {
        if (window.audio) window.audio.playWinFanfare();
        alert(`¡Felicitaciones! Has completado el nivel de la comunidad '${this.customLevelTesting.name}' en ${this.moves} movimientos.`);
        this.openCommunityLevelsModal();
        return;
      }
      this.customLevelTesting.hasBeenPassed = true;
      this.editorLevel.hasBeenPassed = true;
      if (window.audio) window.audio.playWinFanfare();
      this.openPublishLevelModal({
        tubes: this.customLevelTesting.tubes,
        moves: this.moves,
        name: this.customLevelTesting.name,
        creator: this.customLevelTesting.creator
      });
      return;
    }

    const elapsedSecs = window.leaderboardManager ? window.leaderboardManager.stopTimer() : 0;

    // Calcular estrellas
    const starCount = this.moves <= this.levelData.optimalMoves ? 3 : (this.moves <= this.levelData.optimalMoves * 1.5 ? 2 : 1);

    // REGLA DEL USUARIO - COMBOS CONSECUTIVOS DESDE POSICIÓN 1:
    // Los combos requieren que los tubos completos estén desde la posición 1 en adelante (índice 0), consecutivos.
    // El combo se corta ante el primer tubo vacío o incompleto.
    // Los combos ocurren cuando se dejan consecutivos dos o más tubos (>= 2). Si es uno solo (o ninguno), no hay combo (combo = 0).
    let consecutiveCount = 0;
    for (let i = 0; i < this.tubes.length; i++) {
      const t = this.tubes[i];
      if (t.liquids.length === 0 || !this.isTubeComplete(t, { allowChameleon: true })) {
        break; // El combo se corta ante el primer tubo vacío o incompleto
      }
      consecutiveCount++;
    }
    const combo = consecutiveCount >= 2 ? consecutiveCount : 0;

    // Evaluar desafíos secundarios cumplidos del nivel para el puntaje
    let challengesCompleted = 0;
    const totalChallenges = this.levelChallenges ? this.levelChallenges.length : 0;
    if (this.levelChallenges && this.levelChallenges.length > 0) {
      challengesCompleted = this.levelChallenges.filter(c => {
        return typeof c.check === 'function' ? c.check(this, elapsedSecs) : false;
      }).length;
    }

    // Calcular Puntaje Alquímico Acumulativo (Score)
    let scoreData = null;
    if (window.leaderboardManager) {
      scoreData = window.leaderboardManager.calculateScore({
        level: this.currentLevel,
        elapsedSecs: elapsedSecs,
        moves: this.moves,
        optimalMoves: this.levelData.optimalMoves,
        combo: combo,
        challengesCompleted: challengesCompleted,
        totalChallenges: totalChallenges,
        stars: starCount
      });
    }

    // Guardar récord en el gestor de clasificaciones y persistir progreso (incluso si se usaron pistas)
    let recordResult = null;
    const usedHints = (this.hintsUsedInLevel > 0);
    if (window.leaderboardManager) {
      recordResult = window.leaderboardManager.recordLevelCompletion(
        this.currentLevel,
        elapsedSecs,
        this.moves,
        starCount,
        scoreData,
        combo,
        usedHints
      );
    }

    // Desbloquear siguiente nivel y persistir estado de niveles completados
    if (window.stateManager && !this.customLevelTesting && !this.isDailyChallenge && !this.isHonorMode) {
      const nextLevel = Math.min(this.maxLevels, this.currentLevel + 1);
      if (nextLevel > (window.stateManager.state.progress.unlockedLevel || 1)) {
        window.stateManager.state.progress.unlockedLevel = nextLevel;
      }
      if (!window.stateManager.state.progress.completedLevels) {
        window.stateManager.state.progress.completedLevels = {};
      }
      window.stateManager.state.progress.completedLevels[String(this.currentLevel)] = {
        stars: starCount,
        usedHints: usedHints
      };
      window.stateManager.saveState();
    }

    // Animación de sellado de corchos uno por uno con fanfarria pentatónica
    const allTubeWrappers = this.tubesGrid.children;
    this.tubes.forEach((t, i) => {
      setTimeout(() => {
        const cork = document.getElementById(`cork-${i}`);
        const wrapper = allTubeWrappers[i];
        if (cork && t.liquids.length > 0) {
          cork.classList.add('sealed');
          if (window.audio) window.audio.playComboTone(i + 1);

          // Insignia de combo ÚNICAMENTE si combo >= 2 y este tubo forma parte de la racha consecutiva (i < combo)
          if (wrapper && combo >= 2 && i < combo) {
            const badge = document.createElement('div');
            badge.className = 'combo-pill-badge';
            badge.innerHTML = `<span>Combo x${i + 1} ⭐</span>`;
            wrapper.appendChild(badge);
          }
        }
      }, i * 320);
    });

    // Lanzamiento de Confeti elegante
    setTimeout(() => {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
        }, 250);
      }
      if (window.audio) window.audio.playWinFanfare();

      this.showVictoryModal(elapsedSecs, combo, starCount, recordResult, scoreData);
    }, this.tubes.length * 320 + 400);
  }

  showVictoryModal(elapsedSecs, combo, stars, recordResult, scoreData = null) {
    try {
      // Reajuste de economía alquímica aumentado x1.5 (o próximo entero): 3 a 6 monedas base
      let baseCoins = 3;
      if (this.moves <= this.levelData.optimalMoves) baseCoins = 6;
      else if (this.moves <= this.levelData.optimalMoves * 1.5) baseCoins = 5;

      // Bonificación de combo para monedas si combo >= 2 (aumentado x1.5)
      let comboCoins = combo >= 2 ? (combo >= 4 ? 3 : 2) : 0;
      let totalEarned = baseCoins + comboCoins;

      // Modos no-historia (casual infinito, taller/custom, etc.) NO otorgan monedas
      if (this.isCasualSandbox || this.customLevelTesting || !this.isStoryLevel()) {
        totalEarned = 0;
      }

      if (totalEarned > 0) {
        this.addCoins(totalEarned);
      }

      // Badge de advertencia si se usaron pistas
      const hintsBadge = document.getElementById('lbl-hints-warning-badge');
      if (hintsBadge) {
        if (this.hintsUsedInLevel > 0) {
          hintsBadge.classList.remove('hidden');
        } else {
          hintsBadge.classList.add('hidden');
        }
      }

      // Resumen en modal
      const movesEl = document.getElementById('lbl-vic-moves');
      const timeEl = document.getElementById('lbl-vic-time');
      const coinsEl = document.getElementById('lbl-vic-total-coins');
      const starsCont = document.getElementById('victory-stars');
      const comboEl = document.getElementById('lbl-vic-combo');

      if (movesEl) movesEl.textContent = this.moves;
      if (timeEl) timeEl.textContent = window.leaderboardManager ? window.leaderboardManager.formatTime(elapsedSecs) : `${elapsedSecs}s`;
      if (coinsEl) coinsEl.textContent = totalEarned > 0 ? `${totalEarned} 🪙` : '0 🪙 (Modo Libre)';
      if (comboEl) comboEl.textContent = combo >= 2 ? `x${combo} ⭐` : '--';

      // Render de Puntaje Alquímico y Desglose
      const scoreEl = document.getElementById('lbl-vic-score');
      const breakdownEl = document.getElementById('lbl-vic-score-breakdown');
      if (scoreData) {
        if (scoreEl) {
          scoreEl.textContent = `${scoreData.totalScore.toLocaleString()} pts`;
        }
        if (breakdownEl) {
          breakdownEl.innerHTML = `
            <div><span class="text-slate-400">Base Victoria:</span> <span class="text-amber-200 font-semibold">+${scoreData.baseScore}</span></div>
            <div><span class="text-slate-400">Eficiencia Movs:</span> <span class="text-emerald-300 font-semibold">+${scoreData.movesBonus}</span></div>
            <div><span class="text-slate-400">Rapidez Tiempo:</span> <span class="text-sky-300 font-semibold">+${scoreData.timeBonus}</span></div>
            <div><span class="text-slate-400">Combo Consecutivo:</span> <span class="${scoreData.comboBonus > 0 ? 'text-amber-300 font-bold' : 'text-slate-500'}">${scoreData.comboBonus > 0 ? '+' + scoreData.comboBonus + ' (x' + combo + ')' : '--'}</span></div>
            <div><span class="text-slate-400">Desafíos (${scoreData.challengesCompleted}/${scoreData.totalChallenges}):</span> <span class="${scoreData.challengesBonus > 0 ? 'text-indigo-300 font-semibold' : 'text-slate-500'}">${scoreData.challengesBonus > 0 ? '+' + scoreData.challengesBonus : '--'}</span></div>
            <div><span class="text-slate-400">Multiplicador ★:</span> <span class="text-amber-400 font-black">${scoreData.starMultiplier}x</span></div>
          `;
        }
      }

      const btnVicRoulette = document.getElementById('btn-vic-roulette');
      if (btnVicRoulette) {
        const span = btnVicRoulette.querySelector('span');
        if (span) span.textContent = 'Multiplicar en Minijuego de Fortuna (🎯 / 🎡)';
      }

      // Render de estrellas
      if (starsCont) {
        starsCont.innerHTML = '';
        for (let s = 0; s < 3; s++) {
          starsCont.innerHTML += `
            <i data-lucide="star" class="w-8 h-8 ${s < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}"></i>
          `;
        }
      }

      // Notificación de nuevo récord personal si aplica (solo si no se usaron pistas para mérito de récord)
      const recordBadge = document.getElementById('lbl-new-record-badge');
      if (recordBadge) {
        if (!this.hintsUsedInLevel && recordResult && (recordResult.isNewBestTime || recordResult.isNewBestMoves || recordResult.isNewBestScore)) {
          recordBadge.classList.remove('hidden');
          if (recordResult.isNewBestScore) {
            recordBadge.innerHTML = '<span>🏆 ¡NUEVO RÉCORD DE PUNTAJE! 🏆</span>';
          } else {
            recordBadge.innerHTML = '<span>⭐ ¡NUEVO RÉCORD PERSONAL! ⭐</span>';
          }
        } else {
          recordBadge.classList.add('hidden');
        }
      }

      // Comprobar si se desbloqueó el Desafío de Honor para esta sección
      const honorBanner = document.getElementById('vic-honor-unlocked-banner');
      if (honorBanner && window.HonorManager && window.stateManager && !this.customLevelTesting) {
        const currentSec = window.HonorManager.getSectionForLevel(this.currentLevel);
        const unlockStatus = window.HonorManager.checkSectionUnlockStatus(currentSec.id);
        const honorState = window.stateManager.getHonorChallengeState(currentSec.id);

        if (unlockStatus.unlocked && !honorState.completed && honorState.canPlayToday) {
          honorBanner.classList.remove('hidden');
          const bannerText = document.getElementById('vic-honor-banner-text');
          if (bannerText) {
            bannerText.textContent = `¡Has completado con 3★ y todos los desafíos la Sección ${currentSec.id}: ${currentSec.name}! ¿Aceptas el reto de 3 vidas y 5:00 para ganar la Medalla de Honor?`;
          }
          const btnLaunch = document.getElementById('btn-vic-launch-honor');
          if (btnLaunch) {
            btnLaunch.onclick = () => {
              if (this.modalVictory) this.modalVictory.classList.add('hidden');
              this.startHonorChallenge(currentSec.id);
            };
          }
        } else {
          honorBanner.classList.add('hidden');
        }
      } else if (honorBanner) {
        honorBanner.classList.add('hidden');
      }

      // Evaluación y animación escalonada de desafíos del nivel
      this.animateVictoryChallenges(elapsedSecs, totalEarned);

      // Detección y personalización para el Nivel 100 (Final de la Campaña)
      const vicTitle = document.getElementById('vic-modal-title');
      const vicSubtitle = document.getElementById('vic-modal-subtitle');
      const btnVicNext = document.getElementById('btn-vic-next');
      const completionBadge = document.getElementById('lbl-vic-completion-badge');

      if (this.isDailyChallenge) {
        if (vicTitle) {
          vicTitle.innerHTML = '👑 ¡DESAFÍO DIARIO SUPERADO!';
          vicTitle.className = 'text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 mb-1 animate-pulse';
        }
        if (vicSubtitle) {
          vicSubtitle.innerHTML = '✨ ¡Medalla dorada del día conseguida en la Tabla de Clasificaciones!';
          vicSubtitle.className = 'text-xs text-amber-200 font-bold mb-3';
        }
        if (completionBadge) completionBadge.classList.add('hidden');
        if (btnVicNext) {
          btnVicNext.className = 'btn-interactive w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md';
          btnVicNext.innerHTML = '<span>👑 Ver Tabla de Clasificaciones</span><i data-lucide="award" class="w-4 h-4"></i>';
        }
        if (window.stateManager) {
          const dateStr = this.levelData?.dateStr || new Date().toISOString().slice(0, 10);
          window.stateManager.recordDailyChallenge(dateStr, {
            score: this.lastLevelScore || 1000,
            moves: this.moves,
            time: elapsedSecs,
            stars: 3
          });
          if (window.leaderboardManager) {
            window.leaderboardManager.submitDailyScoreToGlobal({
              dateStr,
              score: this.lastLevelScore || 1000,
              moves: this.moves,
              time: elapsedSecs,
              combo: combo,
              stars: 3
            });
            window.leaderboardManager.submitHallOfFameScore();
          }
          const totalDaily = Object.values(window.stateManager.state.progress.dailyChallenges || {}).filter(d => d.completed).length;
          if (window.achievementManager) {
            window.achievementManager.check('daily_streak_7', totalDaily);
          }
        }
      } else if (this.isCasualSandbox) {
        if (vicTitle) {
          vicTitle.innerHTML = '🎲 ¡NIVEL CASUAL RESUELTO!';
          vicTitle.className = 'text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 mb-1';
        }
        if (vicSubtitle) {
          vicSubtitle.innerHTML = '✨ ¡Completado sin consumir vidas! Puzzles infinitos para relajarte.';
          vicSubtitle.className = 'text-xs text-emerald-300 font-bold mb-3';
        }
        if (completionBadge) completionBadge.classList.add('hidden');
        if (btnVicNext) {
          btnVicNext.className = 'btn-interactive w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md';
          btnVicNext.innerHTML = '<span>🎲 Siguiente Nivel Aleatorio</span><i data-lucide="refresh-cw" class="w-4 h-4"></i>';
        }

        // En Modo Infinito se oculta la ruleta de campaña para foco en puzzles continuos
        const btnVicRoulette = document.getElementById('btn-vic-roulette');
        if (btnVicRoulette) btnVicRoulette.classList.add('hidden');

        // Tarjeta de sugerencia de publicación en el Taller
        const sandboxPublishCard = document.getElementById('vic-sandbox-publish-card');
        const canSuggestPublish = window.stateManager ? window.stateManager.isSandboxPublishPromptEnabled() : true;
        if (sandboxPublishCard) {
          if (canSuggestPublish) {
            sandboxPublishCard.classList.remove('hidden');
            const lvlTag = document.getElementById('vic-sandbox-level-tag');
            const levelName = this.levelData?.name || `Alquimia Infinita #${(this.casualSandboxConfig?.seed || Math.floor(Math.random() * 99999)) % 100000}`;
            if (lvlTag) lvlTag.textContent = levelName;

            const btnPublish = document.getElementById('btn-vic-publish-sandbox');
            if (btnPublish) {
              btnPublish.onclick = () => {
                this.hideModal(this.modalVictory);
                const savedTubes = this.initialSandboxTubes || this.levelData.tubes;
                const movesUsed = this.moves;
                const defaultName = levelName;
                const creator = window.stateManager?.state?.player?.nickname || 'Alquimista Viajero';

                this.openPublishLevelModal({
                  tubes: savedTubes,
                  moves: movesUsed,
                  name: defaultName,
                  creator: creator
                });
              };
            }

            const cbSuppressToday = document.getElementById('cb-suppress-sandbox-today');
            if (cbSuppressToday) {
              cbSuppressToday.checked = false;
              cbSuppressToday.onchange = (e) => {
                if (e.target.checked && window.stateManager) {
                  window.stateManager.suppressSandboxPublishForToday();
                }
              };
            }
          } else {
            sandboxPublishCard.classList.add('hidden');
          }
        }

        if (window.stateManager) {
          const total = window.stateManager.recordSandboxLevelCompleted();
          if (window.achievementManager) {
            window.achievementManager.check('casual_explorer_10', total);
          }
        }
      } else if (this.currentLevel === 100) {
        const btnVicRoulette = document.getElementById('btn-vic-roulette');
        if (btnVicRoulette) btnVicRoulette.classList.remove('hidden');
        const sandboxPublishCard = document.getElementById('vic-sandbox-publish-card');
        if (sandboxPublishCard) sandboxPublishCard.classList.add('hidden');

        const hasAllOneStar = this.hasAllLevelsAtLeastOneStar();
        if (window.stateManager) {
          window.stateManager.state.progress.hasCompletedAll100 = hasAllOneStar;
          if (hasAllOneStar && !window.stateManager.state.progress.all100BonusClaimed) {
            window.stateManager.state.progress.all100BonusClaimed = true;
            this.addCoins(999999999);
          }
          window.stateManager.saveState();
        }

        if (vicTitle) {
          vicTitle.innerHTML = '👑 ¡GRAN OBRA MAGNA SUPERADA!';
          vicTitle.className = 'text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 mb-1 animate-pulse';
        }
        if (vicSubtitle) {
          if (hasAllOneStar) {
            vicSubtitle.innerHTML = '✨ ¡FELICITACIONES! Has consumado la Gran Obra Magna Alquímica con estrellas.';
          } else {
            vicSubtitle.innerHTML = '✨ ¡Superaste el último nivel! Pero para desbloquear el Epílogo Alquímico, debes obtener al menos 1★ en cada nivel de campaña.';
          }
          vicSubtitle.className = 'text-xs text-amber-200 font-bold mb-3';
        }
        if (completionBadge) {
          completionBadge.classList.remove('hidden');
        }
        if (btnVicNext) {
          btnVicNext.className = 'btn-interactive w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30';
          if (hasAllOneStar) {
            btnVicNext.innerHTML = '<span>👑 Ver Consagración y Epílogo Final</span><i data-lucide="award" class="w-4 h-4"></i>';
          } else {
            btnVicNext.innerHTML = '<span>🗺️ Ver Mapa de Niveles</span><i data-lucide="map" class="w-4 h-4"></i>';
          }
        }

        // Torrente continuado de confeti dorado
        if (typeof confetti === 'function') {
          const end = Date.now() + 4000;
          const colors = ['#f59e0b', '#fde047', '#38bdf8', '#a855f7', '#ec4899', '#10b981'];
          (function frame() {
            confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0 }, colors: colors });
            confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1 }, colors: colors });
            if (Date.now() < end) requestAnimationFrame(frame);
          }());
        }
        if (window.audio) {
          window.audio.playWinFanfare();
          setTimeout(() => window.audio.playCrowdCheer(), 450);
        }
      } else {
        const btnVicRoulette = document.getElementById('btn-vic-roulette');
        if (btnVicRoulette) btnVicRoulette.classList.remove('hidden');
        const sandboxPublishCard = document.getElementById('vic-sandbox-publish-card');
        if (sandboxPublishCard) sandboxPublishCard.classList.add('hidden');

        if (vicTitle) {
          vicTitle.innerHTML = '¡Nivel Completado!';
          vicTitle.className = 'text-2xl font-black text-white mb-1';
        }
        if (vicSubtitle) {
          vicSubtitle.innerHTML = 'Todos los colores han sido clasificados con maestría.';
          vicSubtitle.className = 'text-xs text-slate-400 mb-3';
        }
        if (completionBadge) completionBadge.classList.add('hidden');
        if (btnVicNext) {
          btnVicNext.className = 'btn-interactive w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md';
          btnVicNext.innerHTML = '<span>Siguiente Nivel</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
        }
      }

      // --- EVALUACIÓN DE LOGROS GENERALES ---
      if (window.achievementManager) {
        if (window.stateManager && window.stateManager.isVisualComfortMode()) {
          window.achievementManager.unlock('visual_comfort_win');
        }
        if (combo >= 5) {
          window.achievementManager.unlock('combo_streak_5');
        }
        if (this.undoCountInLevel === 0 && this.extraTubesUsed === 0) {
          window.achievementManager.increment('no_undo_master', 1);
        }
        if (stars === 3 && elapsedSecs <= 25) {
          window.achievementManager.unlock('flawless_win');
        }
        if (this.currentLevel >= 10 && !this.isDailyChallenge && !this.isCasualSandbox) {
          window.achievementManager.unlock('chapter_1_complete');
        }
        const totalStars = window.leaderboardManager ? window.leaderboardManager.getGlobalStats().totalStars : 0;
        window.achievementManager.check('stars_150', totalStars);
      }
    } catch (err) {
      console.error('Error rendering victory modal details:', err);
    } finally {
      if (window.lucide) {
        try { lucide.createIcons(); } catch (e) { console.warn(e); }
      }
      this.showModal(this.modalVictory);
    }
  }

  // --- ANIMACIÓN SECUENCIAL Y EVALUACIÓN DE DESAFÍOS AL GANAR EL NIVEL ---
  animateVictoryChallenges(elapsedSecs, baseCoinsEarned) {
    const card = document.getElementById('victory-challenges-card');
    const list = document.getElementById('victory-challenges-list');
    const bonusLbl = document.getElementById('lbl-vic-challenges-bonus');
    const coinsEl = document.getElementById('lbl-vic-total-coins');

    if (!card || !list) return;

    // Limpiar temporizadores previos de animación
    if (this.victoryAnimationTimers && this.victoryAnimationTimers.length > 0) {
      this.victoryAnimationTimers.forEach(t => clearTimeout(t));
    }
    this.victoryAnimationTimers = [];

    if (!this.levelChallenges || this.levelChallenges.length === 0) {
      card.classList.add('hidden');
      return;
    }

    card.classList.remove('hidden');
    list.innerHTML = '';
    if (bonusLbl) bonusLbl.textContent = 'Evaluando...';

    // Evaluar cada desafío del nivel preservando los previamente completados en intentos anteriores
    const savedChallenges = (window.stateManager && !this.customLevelTesting && !this.isDailyChallenge)
      ? window.stateManager.getLevelChallenges(this.currentLevel)
      : null;
    const prevCompletedIds = savedChallenges?.completedIds || [];

    const results = this.levelChallenges.map(c => {
      const wasAlreadyCompleted = prevCompletedIds.includes(c.id);
      const isCompleted = wasAlreadyCompleted || (typeof c.check === 'function' ? c.check(this, elapsedSecs) : false);
      return { challenge: c, completed: isCompleted, wasAlreadyCompleted };
    });

    const bonusData = window.ChallengeManager
      ? window.ChallengeManager.calculateBonus(results)
      : { completedCount: 0, totalCount: results.length, totalCoins: 0, multiplier: 1 };

    // Guardar en la persistencia del jugador (acumulativo entre diferentes intentos)
    if (window.stateManager && typeof window.stateManager.recordLevelChallenges === 'function' && !this.customLevelTesting) {
      const completedIds = results.filter(r => r.completed).map(r => r.challenge.id);
      window.stateManager.recordLevelChallenges(this.currentLevel, bonusData, completedIds, this.levelChallenges.length);
    }

    // Renderizar filas inicialmente ocultas con transparencia y desplazamiento
    const rows = [];
    results.forEach((r, idx) => {
      const c = r.challenge;
      const row = document.createElement('div');
      row.className = 'victory-challenge-row';
      row.id = `vic-chal-row-${idx}`;

      let colorSwatch = '';
      if (c.colorHex) {
        colorSwatch = `<span class="challenge-color-dot" style="background-color: ${c.colorHex}; box-shadow: 0 0 6px ${c.colorHex};"></span>`;
      }

      row.innerHTML = `
        <div class="flex items-center gap-2 text-xs">
          <div class="chal-status-icon w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs transition-transform">
            <span>•</span>
          </div>
          <div class="flex items-center gap-1.5 text-slate-300 font-medium chal-title-wrap">
            ${colorSwatch}
            <span class="chal-title-text">${c.title}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="chal-reward-badge text-amber-300/80 font-bold text-[11px]">+${c.coins || 3} 🪙</span>
        </div>
      `;
      list.appendChild(row);
      rows.push({ el: row, res: r, index: idx });
    });

    // Animación secuencial escalonada de cada desafío
    rows.forEach((item, i) => {
      const timer = setTimeout(() => {
        const row = item.el;
        const r = item.res;
        const iconContainer = row.querySelector('.chal-status-icon');
        const titleText = row.querySelector('.chal-title-text');
        const rewardBadge = row.querySelector('.chal-reward-badge');

        row.classList.add('is-visible');

        if (r.completed) {
          // Cumplió: Check verde con rebote alegre + sonido de éxito
          row.classList.add('is-success');
          if (iconContainer) {
            iconContainer.className = 'chal-status-icon w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center font-black text-xs shadow-md shadow-emerald-500/25 challenge-check-bounce';
            iconContainer.innerHTML = '✓';
          }
          if (titleText) {
            titleText.classList.add('text-emerald-300', 'font-bold');
          }
          if (rewardBadge) {
            rewardBadge.className = 'chal-reward-badge text-amber-300 font-black text-xs';
          }
          if (window.audio && typeof window.audio.playChallengeSuccess === 'function') {
            window.audio.playChallengeSuccess(i);
          }
        } else {
          // No cumplió: Cruz roja + texto temblando + sonido de equivocación/fallo
          row.classList.add('is-failed');
          if (iconContainer) {
            iconContainer.className = 'chal-status-icon w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center font-black text-xs shadow-md';
            iconContainer.innerHTML = '✕';
          }
          if (titleText) {
            titleText.classList.add('challenge-text-shake');
          }
          if (rewardBadge) {
            rewardBadge.className = 'chal-reward-badge text-slate-500 line-through text-[11px]';
          }
          if (window.audio && typeof window.audio.playChallengeFail === 'function') {
            window.audio.playChallengeFail();
          }
        }
      }, 350 + i * 550);
      this.victoryAnimationTimers.push(timer);
    });

    // Gran final de bonificación tras evaluar todos los desafíos
    const totalDelay = 350 + rows.length * 550 + 200;
    const finalTimer = setTimeout(() => {
      if (bonusData.totalCoins > 0) {
        if (bonusLbl) {
          const multTag = bonusData.multiplier > 1.0 ? ` (${bonusData.multiplierLabel})` : '';
          bonusLbl.innerHTML = `<span class="text-amber-300 font-black animate-pulse">+${bonusData.totalCoins} 🪙 ${multTag}</span>`;
        }
        // Otorgar las monedas al jugador
        this.addCoins(bonusData.totalCoins);

        // Actualizar visualmente las monedas ganadas totales en el modal
        const finalTotal = baseCoinsEarned + bonusData.totalCoins;
        if (coinsEl) {
          coinsEl.innerHTML = `<span class="text-amber-300 font-black text-lg scale-110 transition-transform">${finalTotal} 🪙</span>`;
        }
      } else {
        if (bonusLbl) {
          bonusLbl.innerHTML = `<span class="text-slate-400 font-semibold text-[11px]">0 🪙 (0/${bonusData.totalCount})</span>`;
        }
      }

      // Si el jugador completa el 100% de los desafíos del nivel, regenerar +1 escudo automáticamente (si compró escudos y le falta)
      const allCompleted = results.length > 0 && results.every(r => r.completed);
      if (allCompleted && window.stateManager && typeof window.stateManager.restoreShieldOnAllChallenges === 'function') {
        const shieldRestored = window.stateManager.restoreShieldOnAllChallenges();
        if (shieldRestored) {
          this.updateLivesHUD();
          if (bonusLbl) {
            bonusLbl.innerHTML += `<div class="mt-1.5 text-sky-300 font-black text-xs animate-bounce flex items-center justify-center gap-1 bg-sky-500/20 border border-sky-400/40 rounded-xl py-1 px-2.5"><span>+1 🛡️ ¡Escudo Restaurado!</span></div>`;
          }
        }
      }
    }, totalDelay);
    this.victoryAnimationTimers.push(finalTimer);
  }

  // --- RENDER Y ACTUALIZACIÓN EN VIVO DE DESAFÍOS EN EL HUD ---
  renderChallengesHUD() {
    const badgeBtn = document.getElementById('btn-challenges-badge');
    const badgeCount = document.getElementById('lbl-challenges-badge-count');

    if (!this.challengesHud) return;

    if (this.isHonorMode) {
      this.challengesHud.classList.remove('hidden');
      if (badgeBtn) badgeBtn.classList.add('hidden');
      const st = window.stateManager ? window.stateManager.getHonorChallengeState(this.honorSectionId) : { lives: 3 };
      this.challengesHud.innerHTML = `
        <div class="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/50 px-3 py-1 rounded-full text-xs font-black text-amber-300 shadow-md">
          <i data-lucide="award" class="w-4 h-4 text-amber-400"></i>
          <span>DESAFÍO DE HONOR: ${this.levelData.title || ''}</span>
          <span class="text-[10px] text-rose-300 font-mono">${st.lives}/3 ❤️</span>
          <span class="text-[10px] text-sky-300 font-mono">• Sin Deshacer • Límite 5:00</span>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (!this.levelChallenges || this.levelChallenges.length === 0) {
      this.challengesHud.innerHTML = '';
      this.challengesHud.classList.add('hidden');
      if (badgeBtn) badgeBtn.classList.add('hidden');
      return;
    }

    // El HUD principal mantiene únicamente el botón badge compacto
    if (badgeBtn) {
      badgeBtn.classList.remove('hidden');
      if (badgeCount) badgeCount.textContent = `0/${this.levelChallenges.length}`;
    }
    this.challengesHud.classList.add('hidden'); // Ocultar chips duplicados para despejar el tablero

    this.updateChallengesHUD();
  }

  updateChallengesHUD() {
    if (!this.levelChallenges || this.levelChallenges.length === 0) return;
    const elapsedSecs = window.leaderboardManager ? window.leaderboardManager.getElapsedSeconds() : 0;

    let achievedCount = 0;
    this.levelChallenges.forEach((c) => {
      const isFailed = typeof c.isFailedLive === 'function' && c.isFailedLive(this, elapsedSecs);
      const isCompleted = typeof c.isAchievedLive === 'function' ? c.isAchievedLive(this, elapsedSecs) : !isFailed;
      if (isCompleted && !isFailed) achievedCount++;
    });

    const badgeCount = document.getElementById('lbl-challenges-badge-count');
    if (badgeCount) {
      badgeCount.textContent = `${achievedCount}/${this.levelChallenges.length}`;
    }
  }

  isStoryLevel() {
    return !this.customLevelTesting && !this.isHonorMode && !this.isDailyChallenge && !this.isTimeAttack && !this.isCasualSandbox && typeof this.currentLevel === 'number';
  }

  onTimerTick(elapsedSecs) {
    if (this.levelChallenges && this.levelChallenges.length > 0) {
      this.updateChallengesHUD();
    }

    // Pérdida de 1 vida cada 10 minutos (600s) de juego activo en niveles de historia
    if (this.isStoryLevel() && !this.isModalOpen() && !this.isVictoryModalOpen) {
      this.storyLevelPlaySeconds = (this.storyLevelPlaySeconds || 0) + 1;
      const intervals = Math.floor(this.storyLevelPlaySeconds / 600);
      if (intervals > (this.storyLevelLostLivesCount || 0)) {
        this.storyLevelLostLivesCount = intervals;
        if (window.stateManager) {
          const consumed = window.stateManager.consumeLife();
          this.updateLivesHUD();
          if (consumed) {
            if (window.audio && typeof window.audio.playFailSound === 'function') {
              window.audio.playFailSound();
            }
            this.showToast(`⏱️ ¡Han pasado ${intervals * 10} min en este nivel! Se ha consumido 1 vida (-1 ❤️).`, 'danger');
            if (window.stateManager.getLives() === 0) {
              this.handleOutOfLives('timer');
            }
          } else {
            this.handleOutOfLives('timer');
          }
        }
      }
    }
  }

  showToast(text, type = 'info') {
    let toast = document.getElementById('game-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-floating-toast';
      document.body.appendChild(toast);
    }
    const colorClasses = {
      info: 'bg-slate-900/95 border-sky-500/70 text-sky-200 shadow-sky-500/25',
      warning: 'bg-slate-900/95 border-amber-500/75 text-amber-200 shadow-amber-500/25',
      danger: 'bg-slate-900/95 border-rose-500/85 text-rose-200 shadow-rose-500/35',
      success: 'bg-slate-900/95 border-emerald-500/75 text-emerald-200 shadow-emerald-500/25'
    };
    toast.className = `fixed top-16 left-1/2 transform -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl border text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all duration-300 pointer-events-none ${colorClasses[type] || colorClasses.info}`;
    toast.innerHTML = text;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';

    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -10px)';
    }, 3800);
  }

  multiplyCoins(mult) {
    const current = this.getCoins();
    let updated;
    if (mult < 0) {
      // Pérdida porcentual por sector negativo (ej. -0.5 pierde el 50%)
      const lossRatio = Math.min(1, Math.abs(mult));
      updated = Math.max(0, Math.round(current * (1 - lossRatio)));
    } else {
      updated = Math.round(current * mult);
    }
    const diff = updated - current;
    if (diff > 0) {
      this.addCoins(diff);
    } else if (diff < 0) {
      if (window.stateManager) {
        window.stateManager.spendCoins(Math.abs(diff));
      } else {
        this.coins = updated;
      }
      this.updateCoinsUI();
    }
  }

  onRouletteClosed() {
    this.resumeGameMusic();
    if (this.modalRoulette) {
      this.hideModal(this.modalRoulette);
    }
    if (this.navigationSource === 'home') {
      this.openHomeModal();
      return;
    }
    // Si había un cartel de desafíos pausado mientras corría el bonus, mostrarlo al cerrar
    if (this.pendingChallengeIntro) {
      this.pendingChallengeIntro = false;
      setTimeout(() => {
        if (!this.isModalOpen() && this.levelChallenges && this.levelChallenges.length > 0) {
          this.showChallengeIntroModal();
        }
      }, 400);
    }
    if (window.rouletteEngine && window.rouletteEngine.fromVictory) {
      window.rouletteEngine.fromVictory = false;
      if (this.currentLevel >= 100) {
        this.showGameCompletionModal();
      } else {
        const nextLvl = this.currentLevel + 1;
        if (this.isLevelUnlocked(nextLvl)) {
          this.loadLevel(nextLvl);
        } else {
          this.openMapModal();
        }
      }
    }
    // Modo Entrenamiento / Libre: No se realiza ninguna validación de nivel ni se avanza el nivel.
  }

  // --- DESHACER (UNDO) Y PISTAS (HINTS) ---
  saveStateForUndo() {
    this.moveHistory.push({
      tubes: JSON.parse(JSON.stringify(this.tubes)),
      moves: this.moves
    });
  }

  undo() {
    if (this.isHonorMode) return;
    if (this.moveHistory.length === 0 || this.isPouringAnimation) return;

    this.undoCountInLevel = (this.undoCountInLevel || 0) + 1;
    const prev = this.moveHistory.pop();
    this.tubes = prev.tubes;
    this.moves = prev.moves;
    this.selectedTubeIndex = null;
    this.clearHintHighlight();

    if (window.audio) window.audio.playSelect();
    this.renderTubes();
    this.updateMovesUI();
    this.updateButtonsUI();
    this.updateChallengesHUD();
    this.showToast('↩️ Movimiento deshecho', 'info');
  }

  addAuxiliaryTube() {
    if (this.isHonorMode) return;
    const cooldown = window.stateManager ? window.stateManager.getCooldownRemaining() : 0;
    if (cooldown > 0) {
      if (confirm(`La botella auxiliar está en enfriamiento (${cooldown} movimientos restantes). ¿Deseas ir a la Tienda de Mejoras para recargarla inmediatamente con 400🪙?`)) {
        this.openShopModal();
      }
      return;
    }

    if (this.extraTubesUsed >= 1) return;

    // Costo de 1 vida por invocar la botella extra
    if (window.stateManager) {
      const lives = window.stateManager.getLives();
      if (lives <= 0) {
        this.handleOutOfLives('extra_tube');
        return;
      }
      window.stateManager.consumeLife();
      this.updateLivesHUD();
      this.showToast('🧪 ¡Frasco auxiliar invocado! (-1 ❤️)', 'warning');

      if (window.stateManager.getLives() === 0) {
        this.handleOutOfLives('zero_lives');
      }
    }

    this.saveStateForUndo();
    this.extraTubesUsed++;

    // Iniciar enfriamiento de 100 movimientos en el estado persistente
    if (window.stateManager) {
      window.stateManager.triggerAuxiliaryBottleUsed();
    }

    this.tubes.push({
      id: 200 + this.extraTubesUsed,
      capacity: 4,
      liquids: [],
      isLocked: false,
      keyColor: null,
      isNarrow: false
    });

    if (window.audio) window.audio.playReveal();
    this.renderTubes();
    this.updateButtonsUI();
    this.updateAuxiliaryButtonUI();
    this.updateChallengesHUD();
  }

  findBestHint() {
    const scoredMoves = [];

    for (let i = 0; i < this.tubes.length; i++) {
      const fromTube = this.tubes[i];
      if (!fromTube || fromTube.liquids.length === 0 || fromTube.isBroken || fromTube.isGlued) continue;
      if (this.isTimeAttack && (fromTube.isCountingDown || fromTube.isDraining)) continue;

      // NUNCA sugerir extraer líquido de un frasco ya completado
      if (this.isTubeComplete(fromTube, { allowChameleon: true })) continue;

      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      const isChameleon = topFrom.isChameleon || topFrom.color === 'chameleon';

      // Contar bloques contiguos de este color en el tubo origen
      let topCount = 0;
      for (let k = fromTube.liquids.length - 1; k >= 0; k--) {
        const item = fromTube.liquids[k];
        if (!item.isMystery && (item.color === topFrom.color || item.isChameleon)) topCount++;
        else break;
      }

      // Comprobar si el tubo origen es 100% homogéneo (un solo color conocido, sin misterio abajo)
      const isFromHomogeneous = fromTube.liquids.every(item => !item.isMystery && (item.color === topFrom.color || item.isChameleon));

      for (let j = 0; j < this.tubes.length; j++) {
        if (i === j) continue;
        const toTube = this.tubes[j];
        if (!toTube || toTube.isBroken || toTube.isLocked) continue;
        if (this.isTimeAttack && (toTube.isCountingDown || toTube.isDraining)) continue;
        if (toTube.liquids.length >= toTube.capacity) continue;

        // Validar reglas básicas de vertido del motor
        if (!this.canPour(i, j)) continue;

        // --- REGLA CRÍTICA: FRASCOS VOLÁTILES Y DE AFINIDAD ---
        // NUNCA sugerir verter un color incompatible en un frasco volátil o de afinidad
        const isVolatile = toTube.isAffinity || toTube.isFragile || toTube.isSuperFragile;
        if (isVolatile) {
          const isAffinityMatch = isChameleon || (Array.isArray(toTube.allowedColors) && toTube.allowedColors.includes(topFrom.color));
          if (!isAffinityMatch) continue; // Descartar: provocaría fisura o destrucción del frasco
        }

        // --- EVITAR MOVIMIENTOS REDUNDANTES / INÚTILES ---
        // Mover un frasco puro hacia un tubo vacío común no aporta progreso al puzzle
        if (toTube.liquids.length === 0 && !isVolatile && isFromHomogeneous) {
          scoredMoves.push({ from: i, to: j, score: 5, isFallback: true });
          continue;
        }

        const space = toTube.capacity - toTube.liquids.length;
        const effectiveCount = (fromTube.isNarrow || toTube.isNarrow) ? 1 : topCount;
        const unitsToMove = Math.min(effectiveCount, space);

        let score = 100;

        // 1. ¿El movimiento completa el tubo destino? (Prioridad máxima de victoria)
        if (toTube.liquids.length + unitsToMove === toTube.capacity) {
          const isDestEmpty = toTube.liquids.length === 0;
          const isDestMatching = !isDestEmpty && toTube.liquids.every(l => l.color === topFrom.color || l.isChameleon);
          if (isDestEmpty ? (unitsToMove === toTube.capacity) : isDestMatching) {
            score += 2000;
          }
        }

        // 2. ¿Revela un líquido misterioso debajo en el tubo origen?
        if (unitsToMove === topCount && fromTube.liquids.length > topCount) {
          const itemBelow = fromTube.liquids[fromTube.liquids.length - 1 - topCount];
          if (itemBelow && itemBelow.isMystery) {
            score += 1200;
          }
        }

        // 3. ¿Vacía completamente el frasco origen para liberar un espacio libre nuevo?
        if (unitsToMove === fromTube.liquids.length && toTube.liquids.length > 0) {
          score += 800;
        }

        // 4. ¿Desbloquea otro color conocido diferente que estaba atrapado debajo?
        if (unitsToMove === topCount && fromTube.liquids.length > topCount) {
          const itemBelow = fromTube.liquids[fromTube.liquids.length - 1 - topCount];
          if (itemBelow && !itemBelow.isMystery && itemBelow.color !== topFrom.color) {
            score += 500;
          }
        }

        // 5. ¿Consolida capas del mismo color sobre un frasco que ya lo contiene?
        if (toTube.liquids.length > 0) {
          const topTo = toTube.liquids[toTube.liquids.length - 1];
          if (topTo && (topTo.color === topFrom.color || topTo.isChameleon)) {
            score += 350;
          }
        }

        // 6. ¿Llena un frasco volátil con su color afín correcto?
        if (isVolatile) {
          score += 300;
        }

        // 7. ¿Mueve todo el bloque contiguo sin partirlo?
        if (unitsToMove === topCount) {
          score += 100;
        }

        // 8. Mover a un tubo vacío desde un frasco mezclado para liberar colores
        if (toTube.liquids.length === 0 && !isFromHomogeneous) {
          score += 150;
        }

        scoredMoves.push({ from: i, to: j, score });
      }
    }

    if (scoredMoves.length === 0) return null;

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0];
  }

  giveHint() {
    if (this.hintsRemaining <= 0) return;

    const bestMove = this.findBestHint();
    const banner = document.getElementById('hint-banner');

    if (!bestMove) {
      if (banner) {
        banner.classList.remove('hidden');
        const textSpan = banner.querySelector('span');
        if (textSpan) {
          textSpan.innerHTML = '⚠️ ¡No hay movimientos seguros disponibles! Prueba <strong>Deshacer (Undo)</strong> o añade un <strong>Frasco Extra (+ Botella)</strong>.';
        }
      }
      if (window.audio && typeof window.audio.playInvalidMoveSound === 'function') {
        window.audio.playInvalidMoveSound();
      }
      return;
    }

    this.hintsRemaining--;
    this.hintsUsedInLevel = (this.hintsUsedInLevel || 0) + 1; // Marca el nivel para exclusión del leaderboard
    if (this.lblHintsLeft) this.lblHintsLeft.textContent = this.hintsRemaining;
    this.activeHint = { from: bestMove.from, to: bestMove.to };

    if (banner) {
      banner.classList.remove('hidden');
      const textSpan = banner.querySelector('span');
      if (textSpan) {
        const fromTube = this.tubes[bestMove.from];
        const toTube = this.tubes[bestMove.to];
        const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
        const colorName = topFrom?.name ? `el color <strong class="text-sky-300 font-bold">${topFrom.name}</strong>` : 'el líquido';

        if (toTube.isSuperFragile) {
          textSpan.innerHTML = `Pista guiada: vierte ${colorName} desde el frasco <strong class="text-amber-300 underline">DORADO</strong> hacia el frasco volátil ⚡ <strong class="text-emerald-400 underline">VERDE</strong> (color afín).`;
        } else if (toTube.isAffinity) {
          textSpan.innerHTML = `Pista guiada: vierte ${colorName} desde el frasco <strong class="text-amber-300 underline">DORADO</strong> hacia el frasco afín 💎 <strong class="text-emerald-400 underline">VERDE</strong>.`;
        } else {
          textSpan.innerHTML = `Pista guiada: vierte ${colorName} desde el frasco <strong class="text-amber-300 underline">DORADO</strong> hacia el <strong class="text-emerald-400 underline">VERDE</strong>.`;
        }
      }
    }

    if (window.audio) window.audio.playSelect();
    this.renderTubes();
    this.updateChallengesHUD();
  }

  clearHintHighlight() {
    this.activeHint = null;
    const banner = document.getElementById('hint-banner');
    if (banner) banner.classList.add('hidden');
    document.querySelectorAll('.tube-hint-source, .tube-hint-dest').forEach(el => {
      el.classList.remove('tube-hint-source', 'tube-hint-dest');
    });
  }

  // --- TIENDA DE MEJORAS (UPGRADES SHOP CON ECONOMÍA REBALANCEADA) ---
  openShopModal() {
    this.updateCoinsUI();
    this.renderShopItems();
    this.showModal(this.modalShop);
    if (window.lucide) lucide.createIcons();
  }

  closeShopModal() {
    this.hideModal(this.modalShop);
    this.updateAuxiliaryButtonUI();
    this.updateLivesHUD();
    if (this.navigationSource === 'home') {
      this.openHomeModal();
    }
  }

  renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container || !window.stateManager) return;
    const state = window.stateManager.state;
    const coins = window.stateManager.getCoins();
    const lives = window.stateManager.getLives();
    const maxLives = window.stateManager.getMaxLives();
    const maxShields = window.stateManager.getMaxShields ? window.stateManager.getMaxShields() : 0;
    const shields = window.stateManager.getShields ? window.stateManager.getShields() : 0;
    const shieldCosts = { 0: 300, 1: 500, 2: 750 };
    const shieldCost = shieldCosts[maxShields] || 750;

    const cdLvl = state.upgrades.cooldownReductionLevel || 1;
    const cdMs = { 1: 100, 2: 75, 3: 50, 4: 25 }[cdLvl] || 25;
    const nextCdMs = { 1: 75, 2: 50, 3: 25 }[cdLvl];
    const cdCost = { 1: 800, 2: 1800, 3: 3500 }[cdLvl];

    const hintsCap = state.upgrades.maxStoredHints || 3;
    const nextHintsCap = hintsCap === 3 ? 5 : (hintsCap === 5 ? 8 : null);
    const hintsCapCost = hintsCap === 3 ? 600 : (hintsCap === 5 ? 1500 : null);

    const remCd = window.stateManager.getCooldownRemaining();
    const canBuyDailyLives = window.stateManager.canBuyRechargeAllLives();
    const hasBoost = window.stateManager.hasRouletteBoost();
    const boostRemaining = window.stateManager.getRouletteBoostRemainingTime();

    container.innerHTML = `
      <!-- 0. Vidas Alquímicas: Comprar 1 Vida -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
            <i data-lucide="heart" class="w-6 h-6 fill-rose-500"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Comprar 1 Vida (+1 ❤️)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">${lives}/${maxLives} Vidas</span>
            </h4>
            <p class="text-xs text-slate-400">Recupera 1 vida instantáneamente para reintentar niveles sin esperar los 10 minutos.</p>
          </div>
        </div>
        <div>
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-40" ${lives >= maxLives || coins < 250 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_life')">
            Comprar (250 🪙)
          </button>
        </div>
      </div>

      <!-- 0.b Vidas Alquímicas: Recarga Completa (3/3) -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
            <i data-lucide="heart-pulse" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Elixir de Vida Total (3/3 ❤️)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">1 por Día</span>
            </h4>
            <p class="text-xs text-slate-400">Restaura todas tus vidas al máximo de inmediato con precio de oferta. Máximo 1 compra por día.</p>
          </div>
        </div>
        <div>
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/20 disabled:opacity-40" ${lives >= maxLives || coins < 600 || !canBuyDailyLives ? 'disabled' : ''} onclick="window.game.buyUpgrade('recharge_all_lives')">
            ${!canBuyDailyLives ? 'Agotado hoy (1 por día)' : 'Restaurar Todo (600 🪙)'}
          </button>
        </div>
      </div>

      <!-- 0.c Escudo Alquímico de Vida (🛡️) -->
      <div class="bg-slate-800/80 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Carta: Escudo de Vida (🛡️)
              <span class="text-[10px] px-2 py-0.5 rounded-full ${maxShields >= 3 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'} font-mono">${maxShields}/3 Ranuras (${shields} Activo${shields === 1 ? '' : 's'})</span>
            </h4>
            <p class="text-xs text-slate-400">Convierte corazones en metal plateado protector. Absorbe el daño antes que las vidas rojas (hasta 6 vidas totales). Se recarga con tiempo o completando el 100% de desafíos.</p>
          </div>
        </div>
        <div>
          ${maxShields < 3 ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-500/20 disabled:opacity-40" ${coins < shieldCost ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_shield')">
              Comprar (${shieldCost} 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Nivel Máx (3/3 🛡️)
            </span>
          `}
        </div>
      </div>

      <!-- 1. Reducción de Enfriamiento de Botella Auxiliar -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
            <i data-lucide="timer" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Enfriamiento de Botella Extra
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">Nvl ${cdLvl}/4</span>
            </h4>
            <p class="text-xs text-slate-400">Actual: <strong>${cdMs} movs</strong> entre usos. ${nextCdMs ? `Siguiente: <strong>${nextCdMs} movs</strong>` : '<span class="text-emerald-400 font-semibold">¡Mejora Máxima!</span>'}</p>
          </div>
        </div>
        <div>
          ${nextCdMs ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-500/20 disabled:opacity-40" ${coins < cdCost ? 'disabled' : ''} onclick="window.game.buyUpgrade('cooldown')">
              Mejorar (${cdCost} 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Nivel Máximo
            </span>
          `}
        </div>
      </div>

      <!-- 2. Recarga Inmediata de Botella Extra -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <i data-lucide="zap" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Recarga Inmediata de Botella
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Consumible</span>
            </h4>
            <p class="text-xs text-slate-400">${remCd > 0 ? `En enfriamiento: <strong>${remCd} movs</strong> restantes.` : '<span class="text-emerald-400 font-semibold">Botella disponible ahora mismo.</span>'}</p>
          </div>
        </div>
        <div>
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 disabled:opacity-40" ${remCd === 0 || coins < 400 ? 'disabled' : ''} onclick="window.game.buyUpgrade('recharge_bottle')">
            Recargar (400 🪙)
          </button>
        </div>
      </div>

      <!-- 3. Capacidad Máxima de Pistas -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <i data-lucide="sparkles" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Capacidad de Pistas
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">Max: ${hintsCap}</span>
            </h4>
            <p class="text-xs text-slate-400">Capacidad actual: <strong>${hintsCap} pistas</strong>. ${nextHintsCap ? `Ampliar a <strong>${nextHintsCap} pistas</strong>.` : '<span class="text-emerald-400 font-semibold">¡Capacidad Máxima!</span>'}</p>
          </div>
        </div>
        <div>
          ${nextHintsCap ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 disabled:opacity-40" ${coins < hintsCapCost ? 'disabled' : ''} onclick="window.game.buyUpgrade('hints_capacity')">
              Ampliar (${hintsCapCost} 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Nivel Máximo
            </span>
          `}
        </div>
      </div>

      <!-- 4. Pack Instantáneo de Pistas (+3 Pistas) -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
            <i data-lucide="layers" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Pack Instantáneo (+3 Pistas)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">Consumible</span>
            </h4>
            <p class="text-xs text-slate-400">Pistas disponibles en juego: <strong>${this.hintsRemaining}</strong>.</p>
          </div>
        </div>
        <div>
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-md shadow-purple-500/20 disabled:opacity-40" ${coins < 450 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_hints_pack')">
            Comprar (450 🪙)
          </button>
        </div>
      </div>

      <!-- 5. Seguro Temporal de Minijuego (Ruleta / Diana - 30 Minutos) -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Seguro de Minijuegos (Boost)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">30 Minutos</span>
            </h4>
            <p class="text-xs text-slate-400">Si fallas en la ruleta o en la diana con viento, conservas el 100% de tus monedas ganadas en lugar de perderlas. Dura 30 minutos desde la activación.</p>
          </div>
        </div>
        <div>
          ${!hasBoost ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-40" ${coins < 1200 ? 'disabled' : ''} onclick="window.game.buyUpgrade('roulette_boost')">
              Activar (1200 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Seguro Activo (${boostRemaining})
            </span>
          `}
        </div>
      </div>

      <!-- 6. Cartas Alquímicas de Fortuna (Consumibles de Bonificación) -->
      <div class="mt-4 pt-4 border-t border-slate-700/80">
        <h3 class="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-2 mb-3">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
          Cartas Alquímicas de Fortuna (200 🪙 c/u)
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Favor de la Diana -->
          <div class="bg-slate-800/90 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>🎯 Favor de la Diana</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">x${(state.cards && state.cards.dianaFavor) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Añade 5 fichas de Diana a la bolsa durante los próximos 5 minijuegos. Se desactiva tras 5 usos.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white shadow-sm disabled:opacity-40" ${coins < 200 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_dianaFavor')">
              200 🪙
            </button>
          </div>

          <!-- Giro del Destino -->
          <div class="bg-slate-800/90 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>🎡 Giro del Destino</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">x${(state.cards && state.cards.rouletteFavor) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Añade 5 fichas de Ruleta a la bolsa durante los próximos 5 minijuegos. Se desactiva tras 5 usos.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-sm disabled:opacity-40" ${coins < 200 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_rouletteFavor')">
              200 🪙
            </button>
          </div>

          <!-- Doble o Nada Alquímico -->
          <div class="bg-slate-800/90 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>⚡ Doble o Nada</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">x${(state.cards && state.cards.doubleOrNothing) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Ruleta simplificada a 2 colores (50% prob) a x2.0 o perder todo.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-sm disabled:opacity-40" ${coins < 200 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_doubleOrNothing')">
              200 🪙
            </button>
          </div>

          <!-- Calma Atmosférica -->
          <div class="bg-slate-800/90 border border-teal-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>🍃 Calma Atmosférica</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono">x${(state.cards && state.cards.calmAtmosphere) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Diana: beneficio de Sin Viento, medidor lento o tiro extra de respaldo.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-sm disabled:opacity-40" ${coins < 200 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_calmAtmosphere')">
              200 🪙
            </button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  buyUpgrade(type) {
    if (!window.stateManager) return;
    const res = window.stateManager.purchaseUpgrade(type);
    if (res.success) {
      if (type === 'buy_hints_pack') {
        this.hintsRemaining += 3;
        if (this.lblHintsLeft) this.lblHintsLeft.textContent = this.hintsRemaining;
      }
      if (type === 'buy_shield') {
        this.updateLivesHUD();
        if (res.isFirstTime) {
          this.openShieldTutorialModal();
        }
      }
      if (type === 'buy_life' || type === 'recharge_all_lives') {
        this.updateLivesHUD();
        if (this.modalOutOfLives && !this.modalOutOfLives.classList.contains('hidden')) {
          this.hideModal(this.modalOutOfLives);
          if (this.outOfLivesInterval) {
            clearInterval(this.outOfLivesInterval);
            this.outOfLivesInterval = null;
          }
          if (window.leaderboardManager) {
            window.leaderboardManager.resumeTimer('lbl-timer');
          }
        }
      }
      if (window.audio) window.audio.playWinFanfare();
      this.updateCoinsUI();
      this.renderShopItems();
      this.updateAuxiliaryButtonUI();
      if (window.minigameEngine && typeof window.minigameEngine.updateCardsUI === 'function') {
        window.minigameEngine.updateCardsUI();
      }
    } else {
      alert(res.msg || 'No se pudo realizar la compra');
    }
  }

  // --- PANTALLA DE INICIO (HOME SCREEN) ---
  openHomeModal() {
    // Si estaba en Time Attack, pausar el intervalo mientras el menú está abierto
    if (this.isTimeAttack && this.timeAttackInterval) {
      clearInterval(this.timeAttackInterval);
      this.timeAttackInterval = null;
    }

    this.updateCoinsUI();
    const statLvl = document.getElementById('home-stat-level');
    const statCoins = document.getElementById('home-stat-coins');
    const statCd = document.getElementById('home-stat-cooldown');
    const playText = document.getElementById('btn-home-play-text');

    if (statLvl) statLvl.textContent = this.currentLevel;
    if (statCoins) statCoins.textContent = `${this.getCoins()} 🪙`;
    if (statCd) {
      const cd = window.stateManager ? window.stateManager.getCooldownRemaining() : 0;
      statCd.textContent = cd > 0 ? `${cd} movs` : 'Lista';
      statCd.className = `text-xs sm:text-sm font-black mt-1 ${cd > 0 ? 'text-amber-400' : 'text-emerald-400'}`;
    }
    if (playText) {
      if (this.isTimeAttack && this.timeAttackSecondsRemaining > 0) {
        playText.textContent = `Continuar Contrarreloj (⏳ ${this.timeAttackSecondsRemaining}s)`;
      } else {
        playText.textContent = `Continuar Nivel ${this.currentLevel}`;
      }
    }

    this.showModal(this.modalHome);
    if (window.audio) window.audio.playMusic('level');
  }

  closeHomeModal() {
    this.hideModal(this.modalHome);
    if (window.audio) {
      window.audio.init();
      this.resumeGameMusic();
    }
  }

  // --- MENÚ DE EXTRAS Y COLECCIONES ---
  openExtrasModal() {
    this.navigationSource = 'home';
    if (this.modalHome) this.hideModal(this.modalHome);
    this.updateCommunityBadgeCount();
    this.showModal(this.modalExtras);
    if (window.lucide) lucide.createIcons();
  }

  closeExtrasModal() {
    this.hideModal(this.modalExtras);
    this.openHomeModal();
  }

  // --- SALIDA Y CIERRE DE MODO CON CONFIRMACIÓN ---
  promptExitCurrentMode(destination = 'home') {
    this.pendingExitDestination = destination;
    if (this.modalPause && !this.modalPause.classList.contains('hidden')) {
      this.hideModal(this.modalPause);
    }
    const desc = document.getElementById('exit-mode-confirm-desc');
    if (desc) {
      let modeName = 'la partida en curso';
      if (this.isTimeAttack) modeName = 'el Modo Contrarreloj';
      else if (this.isCasualSandbox) modeName = 'el Modo Casual';
      else if (this.isDailyChallenge) modeName = 'el Desafío Diario';
      else if (this.isHonorMode) modeName = 'el Desafío de Honor';
      else modeName = `el Nivel ${this.currentLevel}`;
      desc.textContent = `Se cerrará ${modeName}. Si vuelves a iniciar este modo, deberás empezar de cero.`;
    }
    this.showModal(this.modalExitModeConfirm);
    if (window.lucide) lucide.createIcons();
  }

  confirmExitCurrentMode() {
    this.hideModal(this.modalExitModeConfirm);
    // Cerrar y resetear el modo a cero
    if (this.isTimeAttack) {
      this.endTimeAttack('exit');
      this.isTimeAttack = false;
      this.timeAttackSecondsRemaining = 0;
      this.timeAttackScore = 0;
      this.timeAttackTubesCleared = 0;
    } else if (this.isCasualSandbox) {
      this.isCasualSandbox = false;
    } else if (this.isDailyChallenge) {
      this.isDailyChallenge = false;
    } else if (this.isHonorMode) {
      this.isHonorMode = false;
    } else {
      // Reiniciar el nivel de historia de cero
      this.moves = 0;
      this.history = [];
      this.extraTubesUsed = 0;
      this.loadLevel(this.currentLevel);
    }

    if (this.pendingExitDestination === 'map') {
      this.navigationSource = 'home';
      this.openMapModal();
    } else {
      this.openHomeModal();
    }
  }

  cancelExitCurrentMode() {
    this.hideModal(this.modalExitModeConfirm);
    if (window.leaderboardManager && !this.isModalOpen()) {
      window.leaderboardManager.resumeTimer('lbl-timer');
    }
  }

  // --- SALIDA CONTROLADA DEL JUEGO CON GUARDADO (DESDE MENÚ PRINCIPAL) ---
  openConfirmExitGameModal() {
    if (this.modalConfirmExitGame) {
      this.showModal(this.modalConfirmExitGame);
      if (window.lucide) lucide.createIcons();
    }
  }

  closeConfirmExitGameModal() {
    if (this.modalConfirmExitGame) {
      this.hideModal(this.modalConfirmExitGame);
    }
  }

  executeExitGame() {
    this.closeConfirmExitGameModal();

    // 1. Guardar estado de forma segura (nivel, vidas, monedas, escudos)
    if (window.stateManager) {
      window.stateManager.saveState();
    }
    if (window.audio) {
      window.audio.stopMusic();
      if (typeof window.audio.playClick === 'function') {
        window.audio.playClick();
      }
    }

    // 2. Intentar cerrar ventana/pestaña nativamente (si el navegador o PWA de escritorio lo permite)
    try {
      window.close();
    } catch (e) {
      console.warn('window.close() no soportado directamente en este entorno:', e);
    }

    // 3. En iOS PWA / WebClip o navegadores móviles (donde la política de seguridad
    // de Apple impide que JavaScript cierre la app), mostrar pantalla de salida segura
    setTimeout(() => {
      if (this.screenGameExited) {
        this.screenGameExited.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      }
    }, 120);
  }

  resumeGameFromExitScreen() {
    if (this.screenGameExited) {
      this.screenGameExited.classList.add('hidden');
    }
    this.openHomeModal();
  }

  // --- GUARDADO Y CARGA EN ARCHIVO (.JSON) ---
  exportGameFile() {
    if (window.stateManager) {
      window.stateManager.exportToFile();
      if (window.audio) window.audio.playWinFanfare();
    }
  }

  importGameFile(file) {
    if (!file || !window.stateManager) return;
    window.stateManager.importFromFile(file, (loadedState) => {
      this.coins = loadedState.player.coins || 0;
      this.updateCoinsUI();
      const targetLevel = (loadedState.progress && loadedState.progress.unlockedLevel) ? loadedState.progress.unlockedLevel : 1;
      this.loadLevel(targetLevel);
      this.closeHomeModal();
      if (window.audio) window.audio.playWinFanfare();
      alert(`¡Partida cargada exitosamente! Se restauró el nivel ${targetLevel} y tus ${this.coins} monedas.`);
    });
  }

  // --- ACCESIBILIDAD Y MODOS VISUALES ---
  toggleLowVisionMode() {
    this.isLowVision = !this.isLowVision;
    document.body.classList.toggle('low-vision-mode', this.isLowVision);
    const cb = document.getElementById('toggle-low-vision');
    if (cb) cb.checked = this.isLowVision;
    this.renderTubes();
  }

  toggleHighContrastMode() {
    this.isHighContrast = !this.isHighContrast;
    document.body.classList.toggle('high-contrast-mode', this.isHighContrast);
    const cb = document.getElementById('toggle-high-contrast');
    if (cb) cb.checked = this.isHighContrast;
  }

  toggleAccessibilityPatterns(forceValue = null) {
    this.showAccessibilityPatterns = (forceValue !== null) ? !!forceValue : !this.showAccessibilityPatterns;
    if (window.stateManager) {
      if (!window.stateManager.state.settings) window.stateManager.state.settings = {};
      window.stateManager.state.settings.showAccessibilityPatterns = this.showAccessibilityPatterns;
      window.stateManager.saveState();
    }
    const cb = document.getElementById('toggle-accessibility-patterns');
    if (cb) cb.checked = this.showAccessibilityPatterns;
    this.renderTubes();
  }

  openSettingsModal() {
    if (window.paletteManager) {
      window.paletteManager.renderColorSettingsUI('color-pickers-list', () => {
        this.renderTubes();
      });
    }
    const cbComfort = document.getElementById('toggle-visual-comfort-mode');
    if (cbComfort) cbComfort.checked = window.stateManager ? window.stateManager.isVisualComfortMode() : false;
    const cbPat = document.getElementById('toggle-accessibility-patterns');
    if (cbPat) cbPat.checked = this.showAccessibilityPatterns;
    const cbLet = document.getElementById('toggle-accessibility-letters');
    if (cbLet) cbLet.checked = window.stateManager ? window.stateManager.isAccessibilityLettersMode() : false;
    const cbSandboxPrompt = document.getElementById('toggle-sandbox-publish-prompt');
    if (cbSandboxPrompt) cbSandboxPrompt.checked = window.stateManager ? window.stateManager.isSandboxPublishPromptEnabled() : true;

    this.renderDifficultyMechanicsSettings();
    this.renderMusicSettingsUI();
    this.showModal(this.modalSettings);
  }

  openShieldTutorialModal() {
    const m = document.getElementById('modal-shield-tutorial');
    if (m) this.showModal(m);
  }

  // --- GESTIÓN DE DIFICULTAD PERSONALIZADA / MECÁNICAS DESHABILITADAS ---
  renderDifficultyMechanicsSettings() {
    const container = document.getElementById('difficulty-mechanics-list');
    if (!container) return;

    const sm = window.stateManager;
    const unlockedLevel = sm?.state?.progress?.unlockedLevel || 1;

    const mechanics = [
      {
        id: 'narrow',
        name: 'Tubo Estrecho (1x1)',
        level: 41,
        icon: 'minimize-2',
        color: 'text-purple-400',
        desc: 'Frasco delgado que solo admite 1 líquido y sobrecarga con 2+'
      },
      {
        id: 'mystery',
        name: "Líquidos Misterio '?'",
        level: 11,
        icon: 'help-circle',
        color: 'text-sky-400',
        desc: 'Capas inferiores ocultas hasta remover el líquido superior'
      },
      {
        id: 'giant',
        name: 'Frascos Gigantes (Max 6 y Max 8)',
        level: 21,
        icon: 'maximize-2',
        color: 'text-amber-400',
        desc: 'Tubos de mayor capacidad que requieren estar completos para ganar'
      },
      {
        id: 'lock',
        name: 'Candado con Llave Oculta',
        level: 31,
        icon: 'lock',
        color: 'text-yellow-400',
        desc: 'Tubo bloqueado que requiere desenterrar su llave'
      },
      {
        id: 'glued',
        name: 'Frasco en la Roca (Solo Recibe)',
        level: 51,
        icon: 'anchor',
        color: 'text-slate-400',
        desc: 'Frasco inamovible que no puede verter en otros'
      },
      {
        id: 'chameleon',
        name: 'Líquido Camaleón',
        level: 61,
        icon: 'sparkles',
        color: 'text-emerald-400',
        desc: 'Adopta el color del líquido que recibe'
      },
      {
        id: 'fragile',
        name: 'Cristal Frágil y Volátil',
        level: 71,
        icon: 'alert-triangle',
        color: 'text-rose-400',
        desc: 'Límite estricto de usos antes de quebrarse'
      }
    ];

    let html = '';
    mechanics.forEach(m => {
      const isUnlocked = unlockedLevel >= m.level;
      const isDisabled = sm ? sm.isMechanicDisabled(m.id) : false;

      if (!isUnlocked) {
        html += `
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 opacity-50">
            <div class="flex items-center gap-2">
              <i data-lucide="${m.icon}" class="w-4 h-4 text-slate-500"></i>
              <div>
                <div class="text-xs font-bold text-slate-400">${m.name}</div>
                <div class="text-[10px] text-slate-500">Se desbloquea al alcanzar el Nivel ${m.level}</div>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-500 font-bold px-2 py-0.5 rounded-full bg-slate-800">🔒 Bloqueado</span>
          </div>
        `;
      } else {
        html += `
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 transition">
            <div class="flex items-center gap-2">
              <i data-lucide="${m.icon}" class="w-4 h-4 ${m.color}"></i>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  ${m.name}
                  ${isDisabled ? '<span class="text-[9px] text-amber-400 font-bold bg-amber-500/20 px-1 rounded border border-amber-400/30">Desactivado</span>' : ''}
                </div>
                <div class="text-[10.5px] text-slate-400">${m.desc}</div>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer ml-2">
              <input type="checkbox" data-mech-id="${m.id}" class="toggle-mech-checkbox sr-only peer" ${isDisabled ? '' : 'checked'}>
              <div class="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        `;
      }
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Eventos de toggles
    container.querySelectorAll('.toggle-mech-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-mech-id');
        const isChecked = e.target.checked;
        if (sm) sm.setMechanicDisabled(id, !isChecked);
        this.renderDifficultyMechanicsSettings();
        // Si estamos en un nivel regular, regenerar determinísticamente para reflejar el cambio
        if (this.currentLevel && !this.isHonorMode && !this.isDailyChallenge && !this.customLevelTesting) {
          this.loadLevel(this.currentLevel, this.seedVariation);
        }
      });
    });
  }

  renderMusicSettingsUI() {
    const container = document.getElementById('music-tracks-list');
    if (!container || !window.audio) return;

    const catalog = window.audio.getTracksCatalog();
    const sm = window.stateManager;
    const currentTrackInfo = window.audio.getCurrentTrackInfo();

    // Actualizar banner de tema actual
    const banner = document.getElementById('now-playing-banner');
    const lblName = document.getElementById('lbl-now-playing-track-name');
    const lblGenre = document.getElementById('lbl-now-playing-track-genre');
    const btnStopPreview = document.getElementById('btn-audio-stop-preview');

    if (currentTrackInfo) {
      if (banner) banner.classList.remove('hidden');
      if (lblName) lblName.textContent = currentTrackInfo.name;
      if (lblGenre) lblGenre.textContent = currentTrackInfo.genre;
      if (btnStopPreview) btnStopPreview.classList.remove('hidden');
    } else {
      if (lblName) lblName.textContent = 'Silencio (Música desactivada)';
      if (lblGenre) lblGenre.textContent = 'Mute';
      if (btnStopPreview) btnStopPreview.classList.add('hidden');
    }

    let html = '';
    catalog.forEach(track => {
      const isDisabled = sm ? sm.isMusicTrackDisabled(track.id) : false;
      const isPlaying = (window.audio.currentTrackId === track.id);

      html += `
        <div class="flex items-center justify-between p-2.5 rounded-xl border transition-all ${
          isPlaying
            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
            : isDisabled
            ? 'bg-slate-900/60 border-slate-800 opacity-60'
            : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
        }">
          <div class="flex items-start gap-2.5 flex-1 mr-2">
            <button class="btn-preview-track mt-0.5 p-1.5 rounded-lg border text-xs font-bold shrink-0 transition-all ${
              isPlaying
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
            }" data-track-id="${track.id}" title="${isPlaying ? 'Pausar' : 'Escuchar prueba'}">
              <i data-lucide="${isPlaying ? 'square' : 'play'}" class="w-3.5 h-3.5"></i>
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold ${isPlaying ? 'text-emerald-300' : 'text-white'}">${track.name}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  track.id === 'track_bossa'
                    ? 'bg-amber-900/50 text-amber-300 border border-amber-600/40'
                    : track.id === 'track_tropical' || track.id === 'track_coral'
                    ? 'bg-teal-900/50 text-teal-300 border border-teal-600/40'
                    : track.id === 'track_cristal'
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-600/40'
                    : 'bg-slate-700/70 text-slate-300 border border-slate-600/40'
                }">${track.genre}</span>
              </div>
              <p class="text-[10px] text-sky-400/90 font-medium">${track.sectionName}</p>
              <p class="text-[10px] text-slate-400 line-clamp-1 mt-0.5">${track.description}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer toggle-track-checkbox" data-track-id="${track.id}" ${!isDisabled ? 'checked' : ''}>
              <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();

    // Event listeners para toggles
    container.querySelectorAll('.toggle-track-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const trackId = e.target.getAttribute('data-track-id');
        const isEnabled = e.target.checked;
        if (sm) {
          sm.setMusicTrackDisabled(trackId, !isEnabled);
        }
        this.renderMusicSettingsUI();
      });
    });

    // Event listeners para preview
    container.querySelectorAll('.btn-preview-track').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const trackId = targetBtn.getAttribute('data-track-id');
        if (window.audio) {
          if (window.audio.currentTrackId === trackId) {
            window.audio.stopMusic();
          } else {
            window.audio.playTrack(trackId);
          }
        }
        this.renderMusicSettingsUI();
      });
    });

    if (btnStopPreview && !btnStopPreview.hasAttribute('data-bound')) {
      btnStopPreview.setAttribute('data-bound', 'true');
      btnStopPreview.addEventListener('click', () => {
        if (window.audio) window.audio.stopMusic();
        this.renderMusicSettingsUI();
      });
    }
  }

  isModalOpen() {
    const modals = [
      this.modalMap, this.modalVictory, this.modalRoulette, this.modalLeaderboard,
      this.modalSettings, this.modalHome, this.modalShop, this.modalRestartConfirm,
      this.modalTutorial, this.modalEditor, this.modalChallengeIntro, this.modalPause,
      this.modalOutOfLives, this.modalShieldTutorial, this.modalExtras, this.modalExitModeConfirm
    ];
    return modals.some(m => m && !m.classList.contains('hidden'));
  }

  // --- EVENT LISTENERS E INTERACTIVIDAD DE INTERFAZ ---
  initEvents() {
    // Acciones principales del HUD
    if (this.btnUndo) this.bindTapOrClick(this.btnUndo, () => this.undo());
    if (this.btnRestart) this.bindTapOrClick(this.btnRestart, () => this.openRestartConfirmModal());
    if (this.btnPause) this.bindTapOrClick(this.btnPause, () => this.openPauseModal());
    if (this.btnChallengesBadge) this.bindTapOrClick(this.btnChallengesBadge, () => this.showChallengeIntroModal());
    if (this.btnHint) this.bindTapOrClick(this.btnHint, () => this.giveHint());
    if (this.btnAddTube) this.bindTapOrClick(this.btnAddTube, () => this.addAuxiliaryTube());

    const btnCloseHint = document.getElementById('btn-close-hint');
    if (btnCloseHint) this.bindTapOrClick(btnCloseHint, () => this.clearHintHighlight());

    // Deseleccionar tubo al hacer clic o tap en un espacio vacío (fuera de tubos y botones)
    let bgTouchStartX = 0;
    let bgTouchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        bgTouchStartX = e.touches[0].clientX;
        bgTouchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    const handleEmptyAreaTap = (e) => {
      if (this.selectedTubeIndex === null) return;
      if (this.isPouringAnimation) return;

      const target = e.target;
      if (!target) return;
      if (target.closest('.test-tube') || target.closest('button') || target.closest('input') || target.closest('select') || target.closest('.modal-content') || target.closest('.modal-overlay:not(.hidden)')) {
        return;
      }

      this.deselectTube(true);
    };

    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches && e.changedTouches[0];
      if (touch) {
        const dx = Math.abs(touch.clientX - bgTouchStartX);
        const dy = Math.abs(touch.clientY - bgTouchStartY);
        if (dx < 15 && dy < 15) {
          handleEmptyAreaTap(e);
        }
      }
    }, { passive: true });

    document.addEventListener('click', (e) => {
      if (this._lastTubeInteractionTime && (Date.now() - this._lastTubeInteractionTime < 450)) return;
      handleEmptyAreaTap(e);
    });

    // Selector rápido de nivel
    if (this.selLevelQuick) {
      this.selLevelQuick.innerHTML = '';
      for (let i = 1; i <= this.maxLevels; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Nivel ${i}`;
        this.selLevelQuick.appendChild(opt);
      }
      this.selLevelQuick.addEventListener('change', (e) => {
        this.loadLevel(parseInt(e.target.value));
      });
    }

    // Botón Inicio y Botón Tienda en Header
    const btnOpenHome = document.getElementById('btn-open-home');
    if (btnOpenHome) {
      this.bindTapOrClick(btnOpenHome, () => {
        const isPlayingActiveGame = this.isTimeAttack || this.isCasualSandbox || this.isDailyChallenge || this.isHonorMode || (this.moves > 0 && !this.isModalOpen());
        if (isPlayingActiveGame) {
          this.promptExitCurrentMode('home');
        } else {
          this.openHomeModal();
        }
      });
    }

    const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
      this.bindTapOrClick(btnOpenShop, () => this.openShopModal());
    }

    const btnOpenDaily = document.getElementById('btn-open-daily');
    if (btnOpenDaily) {
      this.bindTapOrClick(btnOpenDaily, () => {
        this.navigationSource = 'game';
        if (this.modalExtras) this.hideModal(this.modalExtras);
        this.hideModal(this.modalHome);
        this.launchDailyChallenge();
      });
    }

    const btnOpenMinigame = document.getElementById('btn-open-minigame');
    if (btnOpenMinigame) {
      this.bindTapOrClick(btnOpenMinigame, () => {
        if (window.minigameEngine) window.minigameEngine.openModal();
      });
    }

    // Botón Widget de Vidas -> Abre la tienda para recarga
    if (this.livesHud) {
      this.bindTapOrClick(this.livesHud, () => this.openShopModal());
    }

    // Botón Taller de Creación en Header
    if (this.btnOpenEditor) {
      this.bindTapOrClick(this.btnOpenEditor, () => this.openEditorModal('design'));
    }

    // Botón Taller de Creación en Home Screen
    const btnHomeEditor = document.getElementById('btn-home-editor');
    if (btnHomeEditor) {
      this.bindTapOrClick(btnHomeEditor, () => {
        this.closeHomeModal();
        this.openEditorModal('design');
      });
    }

    // Modal Reinicio Confirmación
    const btnConfirmRestart = document.getElementById('btn-confirm-restart');
    if (btnConfirmRestart) {
      this.bindTapOrClick(btnConfirmRestart, () => this.confirmRestartLevel());
    }
    const btnCancelRestart = document.getElementById('btn-cancel-restart');
    if (btnCancelRestart) {
      this.bindTapOrClick(btnCancelRestart, () => this.closeRestartConfirmModal());
    }

    // Botón Ayuda y Guía de Tubos / Tutoriales en Header
    const btnOpenHelp = document.getElementById('btn-open-help');
    if (btnOpenHelp) {
      this.bindTapOrClick(btnOpenHelp, () => this.openTutorialsHelp());
    }

    // Botón Rápido de Tutorial de Mecánica en Subtítulo de Nivel
    const btnQuickHelp = document.getElementById('btn-quick-help');
    if (btnQuickHelp) {
      this.bindTapOrClick(btnQuickHelp, () => this.openTutorialsHelp(this.levelData?.primaryMechanicId));
    }

    // Botón Guía de Tubos en Pantalla de Inicio / Extras
    const btnHomeTutorials = document.getElementById('btn-home-tutorials');
    if (btnHomeTutorials) {
      this.bindTapOrClick(btnHomeTutorials, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (this.modalExtras) this.hideModal(this.modalExtras);
        this.openTutorialModal();
      });
    }

    // Modal Tutorial (Cerrar, Cerrar X, Anterior, Siguiente)
    const btnCloseTut = document.getElementById('btn-close-tutorial');
    if (btnCloseTut) {
      this.bindTapOrClick(btnCloseTut, () => this.closeTutorialModal());
    }
    const btnCloseTutX = document.getElementById('btn-close-tutorial-x');
    if (btnCloseTutX) {
      this.bindTapOrClick(btnCloseTutX, () => this.closeTutorialModal());
    }
    const btnTutPrev = document.getElementById('btn-tut-prev');
    if (btnTutPrev) {
      this.bindTapOrClick(btnTutPrev, () => this.navigateTutorial(-1));
    }
    const btnTutNext = document.getElementById('btn-tut-next');
    if (btnTutNext) {
      this.bindTapOrClick(btnTutNext, () => this.navigateTutorial(1));
    }

    // Modal Easter Egg de Apocalipsis (Reiniciar nivel tras la explosión)
    const btnRestartApocalypse = document.getElementById('btn-restart-apocalypse');
    if (btnRestartApocalypse) {
      this.bindTapOrClick(btnRestartApocalypse, () => this.restartFromApocalypse());
    }
    const btnCloseApocalypseX = document.getElementById('btn-close-apocalypse-x');
    if (btnCloseApocalypseX) {
      this.bindTapOrClick(btnCloseApocalypseX, () => this.restartFromApocalypse());
    }

    // Modal Editor de Niveles botones y pestañas
    const btnCloseEditor = document.getElementById('btn-close-editor');
    if (btnCloseEditor) {
      this.bindTapOrClick(btnCloseEditor, () => this.closeEditorModal());
    }
    const tabDesign = document.getElementById('tab-editor-design');
    if (tabDesign) {
      this.bindTapOrClick(tabDesign, () => this.switchEditorTab('design'));
    }
    const tabSaved = document.getElementById('tab-editor-saved');
    if (tabSaved) {
      this.bindTapOrClick(tabSaved, () => this.switchEditorTab('saved'));
    }
    const btnTest = document.getElementById('btn-editor-test');
    if (btnTest) {
      this.bindTapOrClick(btnTest, () => this.testCustomLevel());
    }
    const btnPublish = document.getElementById('btn-editor-publish');
    if (btnPublish) {
      this.bindTapOrClick(btnPublish, () => this.publishCustomLevel());
    }
    const selTubeCount = document.getElementById('editor-tube-count');
    if (selTubeCount) {
      selTubeCount.addEventListener('change', (e) => {
        const count = parseInt(e.target.value);
        this.editorLevel.tubeCount = count;
        while (this.editorLevel.tubes.length < count) {
          this.editorLevel.tubes.push({ capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] });
        }
        while (this.editorLevel.tubes.length > count) {
          this.editorLevel.tubes.pop();
        }
        this.editorLevel.hasBeenPassed = false;
        this.updateEditorValidation();
        this.renderEditorTubes();
      });
    }

    // Modal Inicio (Home) botones internos
    const btnCloseHome = document.getElementById('btn-close-home');
    if (btnCloseHome) {
      this.bindTapOrClick(btnCloseHome, () => {
        this.openConfirmExitGameModal();
      });
    }

    const btnConfirmExitGame = document.getElementById('btn-confirm-exit-game');
    if (btnConfirmExitGame) {
      this.bindTapOrClick(btnConfirmExitGame, () => this.executeExitGame());
    }

    const btnCancelExitGame = document.getElementById('btn-cancel-exit-game');
    if (btnCancelExitGame) {
      this.bindTapOrClick(btnCancelExitGame, () => this.closeConfirmExitGameModal());
    }

    const btnResumeFromExit = document.getElementById('btn-resume-from-exit');
    if (btnResumeFromExit) {
      this.bindTapOrClick(btnResumeFromExit, () => this.resumeGameFromExitScreen());
    }

    const btnHomePlay = document.getElementById('btn-home-play');
    if (btnHomePlay) {
      this.bindTapOrClick(btnHomePlay, () => {
        this.closeHomeModal();
        if (this.isTimeAttack) {
          if (this.timeAttackSecondsRemaining > 0 && !this.timeAttackInterval) {
            this.timeAttackInterval = setInterval(() => {
              if (!this.isTimeAttack) {
                if (this.timeAttackInterval) {
                  clearInterval(this.timeAttackInterval);
                  this.timeAttackInterval = null;
                }
                return;
              }
              this.tickTimeAttack();
            }, 1000);
          } else {
            this.isTimeAttack = false;
            // Si entra al Modo Historia por primera vez en su perfil, mostrar solo la animación inicial
            if (this.currentLevel === 1 && window.stateManager && !window.stateManager.hasSeenStoryPrologue()) {
              window.stateManager.markStoryPrologueSeen();
              if (window.storyManager) {
                window.storyManager.openStoryModal(0, false);
              }
            }
            this.loadLevel(this.currentLevel);
          }
        } else {
          // Si entra al Modo Historia por primera vez en su perfil, mostrar solo la animación inicial
          if (this.currentLevel === 1 && window.stateManager && !window.stateManager.hasSeenStoryPrologue()) {
            window.stateManager.markStoryPrologueSeen();
            if (window.storyManager) {
              window.storyManager.openStoryModal(0, false);
            }
          }
        }
      });
    }

    const btnHomeMap = document.getElementById('btn-home-map');
    if (btnHomeMap) {
      this.bindTapOrClick(btnHomeMap, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (this.isTimeAttack) {
          this.isTimeAttack = false;
          this.loadLevel(this.currentLevel);
        }
        this.openMapModal();
        if (window.audio) window.audio.playMusic('map');
      });
    }

    const btnHomeShop = document.getElementById('btn-home-shop');
    if (btnHomeShop) {
      this.bindTapOrClick(btnHomeShop, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        this.openShopModal();
      });
    }

    const btnHomeLeaderboard = document.getElementById('btn-home-leaderboard');
    if (btnHomeLeaderboard) {
      this.bindTapOrClick(btnHomeLeaderboard, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (this.modalExtras) this.hideModal(this.modalExtras);
        this.showModal(this.modalLeaderboard);
        if (window.leaderboardManager) {
          window.leaderboardManager.renderLeaderboardUI('leaderboard-table-container', 'global');
        }
      });
    }

    const btnHomeSettings = document.getElementById('btn-home-settings');
    if (btnHomeSettings) {
      this.bindTapOrClick(btnHomeSettings, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        this.openSettingsModal();
      });
    }

    const btnHomeMinigame = document.getElementById('btn-home-minigame');
    if (btnHomeMinigame) {
      this.bindTapOrClick(btnHomeMinigame, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (window.minigameEngine) {
          window.minigameEngine.openModal();
        } else if (window.rouletteEngine) {
          window.rouletteEngine.openModal();
        } else {
          this.showModal(this.modalRoulette);
        }
      });
    }

    const btnHomeExtras = document.getElementById('btn-home-extras');
    if (btnHomeExtras) {
      this.bindTapOrClick(btnHomeExtras, () => this.openExtrasModal());
    }

    const btnCloseExtras = document.getElementById('btn-close-extras');
    if (btnCloseExtras) {
      this.bindTapOrClick(btnCloseExtras, () => this.closeExtrasModal());
    }
    if (this.modalExtras) {
      this.setupBackdropClose(this.modalExtras, () => this.closeExtrasModal());
    }

    // Acceso y navegación de Niveles de la Comunidad Alquímica
    const btnOpenCommunity = document.getElementById('btn-open-community-levels');
    if (btnOpenCommunity) {
      this.bindTapOrClick(btnOpenCommunity, () => {
        this.openCommunityLevelsModal('all');
      });
    }

    const btnCloseCommunity = document.getElementById('btn-close-community-levels');
    if (btnCloseCommunity) {
      this.bindTapOrClick(btnCloseCommunity, () => {
        this.closeCommunityLevelsModal();
      });
    }

    if (this.modalCommunityLevels) {
      this.setupBackdropClose(this.modalCommunityLevels, () => this.closeCommunityLevelsModal());
    }

    // Filtros de dificultad en la Biblioteca de Niveles de la Comunidad
    const filterBtns = document.querySelectorAll('#community-diff-filters-bar .btn-diff-filter');
    filterBtns.forEach(btn => {
      this.bindTapOrClick(btn, () => {
        const diff = btn.getAttribute('data-diff-filter') || 'all';
        this.openCommunityLevelsModal(diff);
      });
    });

    // Modal de Publicación Rápida de Niveles (Solo Nombre y Publicar)
    const btnSubmitPublish = document.getElementById('btn-submit-publish');
    if (btnSubmitPublish) {
      this.bindTapOrClick(btnSubmitPublish, () => this.executePublishLevel());
    }

    const btnCancelPublish = document.getElementById('btn-cancel-publish');
    if (btnCancelPublish) {
      this.bindTapOrClick(btnCancelPublish, () => this.hideModal(this.modalPublishLevel));
    }

    if (this.modalPublishLevel) {
      this.setupBackdropClose(this.modalPublishLevel, () => this.hideModal(this.modalPublishLevel));
    }

    // Soporte e Instalación de App Móvil (PWA)
    let deferredInstallPrompt = null;
    const btnInstallApp = document.getElementById('btn-install-app');
    const btnInstallAppText = document.getElementById('btn-install-app-text');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstallApp) {
        btnInstallApp.classList.remove('hidden');
        if (btnInstallAppText) btnInstallAppText.textContent = '📲 Instalar AquaSort en tu Celular';
      }
    });

    if (btnInstallApp) {
      btnInstallApp.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            btnInstallApp.classList.add('hidden');
          }
          deferredInstallPrompt = null;
        } else {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIOS) {
            alert('Para instalar en iPhone/iPad:\n1. Toca el botón Compartir (el ícono ⎋ en Safari).\n2. Elige "Agregar a pantalla de inicio" ➕.\n¡Y listo! Se abrirá como una App nativa a pantalla completa.');
          } else {
            alert('Para instalar como App en tu teléfono:\n1. Abre el menú del navegador (los 3 puntos ⋮).\n2. Elige "Instalar aplicación" o "Agregar a la pantalla principal".\n¡Se guardará con su ícono y pantalla completa!');
          }
        }
      });
    }

    window.addEventListener('appinstalled', () => {
      if (btnInstallApp) btnInstallApp.classList.add('hidden');
      console.log('AquaSort Deluxe PWA instalada exitosamente');
    });

    // Modal Tienda botones internos
    const btnCloseShop = document.getElementById('btn-close-shop');
    if (btnCloseShop) this.bindTapOrClick(btnCloseShop, () => this.closeShopModal());

    // Audio Mute Toggle
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
      this.bindTapOrClick(btnSound, () => {
        if (window.audio) {
          const muted = window.audio.toggleMute();
          const icon = document.getElementById('icon-sound');
          if (icon) icon.setAttribute('data-lucide', muted ? 'volume-x' : 'volume-2');
          if (window.lucide) lucide.createIcons();
        }
      });
    }

    // Pantalla completa
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      this.bindTapOrClick(btnFullscreen, () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Modal Mapa de Niveles (Cambia a música de exploración)
    const btnOpenMap = document.getElementById('btn-open-map');
    const btnCloseMap = document.getElementById('btn-close-map');
    if (btnOpenMap) {
      this.bindTapOrClick(btnOpenMap, () => {
        this.openMapModal();
        if (window.audio) window.audio.playMusic('map');
      });
    }
    if (btnCloseMap) {
      this.bindTapOrClick(btnCloseMap, () => {
        this.hideModal(this.modalMap);
        if (this.navigationSource === 'home') {
          this.openHomeModal();
        } else {
          this.resumeGameMusic();
        }
      });
    }

    // Modal Sincronización en la Nube con Google
    const btnOpenCloud = document.getElementById('btn-open-cloud-sync');
    const btnCloseCloud = document.getElementById('btn-close-cloud-sync');
    const btnSettingsOpenCloud = document.getElementById('btn-settings-open-cloud');
    const homeCloudPill = document.getElementById('home-cloud-status-pill');
    const btnCloudLogin = document.getElementById('btn-cloud-login-google');
    const btnCloudLogout = document.getElementById('btn-cloud-logout');
    const btnCloudSyncNow = document.getElementById('btn-cloud-sync-now');
    const btnToggleConfig = document.getElementById('btn-toggle-firebase-config');
    const btnSaveConfig = document.getElementById('btn-save-firebase-config');
    const btnResetConfig = document.getElementById('btn-reset-firebase-config');

    if (btnOpenCloud) {
      this.bindTapOrClick(btnOpenCloud, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.openCloudModal();
      });
    }
    if (btnCloseCloud) {
      this.bindTapOrClick(btnCloseCloud, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.closeCloudModal();
      });
    }
    if (btnSettingsOpenCloud) {
      this.bindTapOrClick(btnSettingsOpenCloud, () => {
        if (this.modalSettings) this.hideModal(this.modalSettings);
        if (window.cloudSyncManager) window.cloudSyncManager.openCloudModal();
      });
    }
    if (homeCloudPill) {
      this.bindTapOrClick(homeCloudPill, () => {
        if (this.modalHome) this.hideModal(this.modalHome);
        if (window.cloudSyncManager) window.cloudSyncManager.openCloudModal();
      });
    }
    if (btnCloudLogin) {
      this.bindTapOrClick(btnCloudLogin, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.loginWithGoogle();
      });
    }
    if (btnCloudLogout) {
      this.bindTapOrClick(btnCloudLogout, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.logout();
      });
    }
    if (btnCloudSyncNow) {
      this.bindTapOrClick(btnCloudSyncNow, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.syncWithCloud(true);
      });
    }
    if (btnToggleConfig) {
      this.bindTapOrClick(btnToggleConfig, () => {
        const box = document.getElementById('cloud-config-box');
        if (box) box.classList.toggle('hidden');
      });
    }
    if (btnSaveConfig) {
      this.bindTapOrClick(btnSaveConfig, () => {
        const txt = document.getElementById('txt-firebase-config');
        if (txt && window.cloudSyncManager) {
          window.cloudSyncManager.reconfigure(txt.value.trim());
        }
      });
    }
    if (btnResetConfig) {
      this.bindTapOrClick(btnResetConfig, () => {
        if (window.cloudSyncManager) window.cloudSyncManager.resetConfiguration();
      });
    }

    // Modal Clasificaciones / Leaderboard
    const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    if (btnOpenLeaderboard) {
      this.bindTapOrClick(btnOpenLeaderboard, () => {
        if (window.leaderboardManager) {
          window.leaderboardManager.renderLeaderboardUI('leaderboard-table-container', 'score');
        }
        // Marcar pestaña 'score' como activa
        document.querySelectorAll('.tab-leaderboard').forEach(t => {
          if (t.dataset.filter === 'score') {
            t.classList.add('active', 'border-amber-400', 'text-amber-300');
            t.classList.remove('border-transparent', 'text-slate-400');
          } else {
            t.classList.remove('active', 'border-amber-400', 'text-amber-300', 'border-sky-400', 'text-sky-300');
            t.classList.add('border-transparent', 'text-slate-400');
          }
        });
        this.showModal(this.modalLeaderboard);
      });
    }
    if (btnCloseLeaderboard) {
      this.bindTapOrClick(btnCloseLeaderboard, () => {
        this.hideModal(this.modalLeaderboard);
        if (this.navigationSource === 'home') {
          this.openHomeModal();
        }
      });
    }

    // Pestañas de filtrado de clasificaciones
    document.querySelectorAll('.tab-leaderboard').forEach(tab => {
      this.bindTapOrClick(tab, (e) => {
        document.querySelectorAll('.tab-leaderboard').forEach(t => {
          t.classList.remove('active', 'border-sky-400', 'text-sky-300', 'border-amber-400', 'text-amber-300');
          t.classList.add('border-transparent', 'text-slate-400');
        });
        e.currentTarget.classList.add('active', 'border-amber-400', 'text-amber-300');
        e.currentTarget.classList.remove('border-transparent', 'text-slate-400');
        const filter = e.currentTarget.dataset.filter;
        if (window.leaderboardManager) {
          window.leaderboardManager.renderLeaderboardUI('leaderboard-table-container', filter);
        }
      });
    });

    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const openSettingsAction = () => {
      this.openSettingsModal();
    };
    if (btnOpenSettings) this.bindTapOrClick(btnOpenSettings, openSettingsAction);
    if (btnCloseSettings) {
      this.bindTapOrClick(btnCloseSettings, () => {
        this.hideModal(this.modalSettings);
        if (this.navigationSource === 'home') {
          this.openHomeModal();
        } else {
          this.resumeGameMusic();
        }
      });
    }

    // Restablecer colores de paleta
    const btnResetColors = document.getElementById('btn-reset-palette-colors');
    if (btnResetColors) {
      this.bindTapOrClick(btnResetColors, () => {
        if (window.paletteManager) {
          window.paletteManager.resetDefaults();
          window.paletteManager.renderColorSettingsUI('color-pickers-list', () => this.renderTubes());
          this.renderTubes();
        }
      });
    }

    // Toggles de accesibilidad en Opciones
    const cbLowVision = document.getElementById('toggle-low-vision');
    if (cbLowVision) {
      cbLowVision.addEventListener('change', () => this.toggleLowVisionMode());
    }
    const cbHighContrast = document.getElementById('toggle-high-contrast');
    if (cbHighContrast) {
      cbHighContrast.addEventListener('change', () => this.toggleHighContrastMode());
    }
    const cbPatterns = document.getElementById('toggle-accessibility-patterns');
    if (cbPatterns) {
      cbPatterns.checked = this.showAccessibilityPatterns;
      cbPatterns.addEventListener('change', (e) => this.toggleAccessibilityPatterns(e.target.checked));
    }
    const cbLetters = document.getElementById('toggle-accessibility-letters');
    if (cbLetters) {
      cbLetters.checked = window.stateManager ? window.stateManager.isAccessibilityLettersMode() : false;
      cbLetters.addEventListener('change', (e) => this.toggleAccessibilityLetters(e.target.checked));
    }
    const cbVisualComfort = document.getElementById('toggle-visual-comfort-mode');
    if (cbVisualComfort) {
      cbVisualComfort.checked = window.stateManager ? window.stateManager.isVisualComfortMode() : false;
      cbVisualComfort.addEventListener('change', (e) => this.toggleVisualComfortMode(e.target.checked));
    }
    const cbSandboxPrompt = document.getElementById('toggle-sandbox-publish-prompt');
    if (cbSandboxPrompt) {
      cbSandboxPrompt.checked = window.stateManager ? window.stateManager.isSandboxPublishPromptEnabled() : true;
      cbSandboxPrompt.addEventListener('change', (e) => {
        if (window.stateManager) window.stateManager.setSandboxPublishPromptEnabled(e.target.checked);
      });
    }

    // Botones de Modos en Home Screen
    const btnHomeCasual = document.getElementById('btn-home-casual');
    if (btnHomeCasual) {
      this.bindTapOrClick(btnHomeCasual, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        this.openCasualSandboxModal();
      });
    }

    const btnHomeTimeAttack = document.getElementById('btn-home-time-attack');
    if (btnHomeTimeAttack) {
      this.bindTapOrClick(btnHomeTimeAttack, () => {
        this.navigationSource = 'game';
        this.closeHomeModal();
        this.startTimeAttack();
      });
    }

    const btnHomeAchievements = document.getElementById('btn-home-achievements');
    if (btnHomeAchievements) {
      this.bindTapOrClick(btnHomeAchievements, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (this.modalExtras) this.hideModal(this.modalExtras);
        if (window.achievementManager) window.achievementManager.openModal();
      });
    }

    // Modal Logros
    const btnCloseAchievements = document.getElementById('btn-close-achievements');
    if (btnCloseAchievements) {
      this.bindTapOrClick(btnCloseAchievements, () => {
        if (window.achievementManager) window.achievementManager.closeModal();
        if (this.navigationSource === 'home') {
          this.openHomeModal();
        }
      });
    }

    const achFilterAll = document.getElementById('btn-ach-filter-all');
    const achFilterUnlocked = document.getElementById('btn-ach-filter-unlocked');
    const achFilterLocked = document.getElementById('btn-ach-filter-locked');
    if (achFilterAll && window.achievementManager) {
      achFilterAll.addEventListener('click', () => {
        window.achievementManager.currentFilter = 'all';
        window.achievementManager.renderAchievementsUI();
      });
    }
    if (achFilterUnlocked && window.achievementManager) {
      achFilterUnlocked.addEventListener('click', () => {
        window.achievementManager.currentFilter = 'unlocked';
        window.achievementManager.renderAchievementsUI();
      });
    }
    if (achFilterLocked && window.achievementManager) {
      achFilterLocked.addEventListener('click', () => {
        window.achievementManager.currentFilter = 'locked';
        window.achievementManager.renderAchievementsUI();
      });
    }

    // Modal Casual Sandbox
    const btnCloseSandbox = document.getElementById('btn-close-sandbox');
    if (btnCloseSandbox) {
      this.bindTapOrClick(btnCloseSandbox, () => this.closeCasualSandboxModal());
    }
    const btnStartSandboxPlay = document.getElementById('btn-start-sandbox-play');
    if (btnStartSandboxPlay) {
      this.bindTapOrClick(btnStartSandboxPlay, () => this.startCasualSandbox());
    }

    // Modal Time Attack Game Over
    const btnTaReplay = document.getElementById('btn-time-attack-replay');
    if (btnTaReplay) {
      this.bindTapOrClick(btnTaReplay, () => {
        const m = document.getElementById('modal-time-attack-gameover');
        if (m) m.classList.add('hidden');
        this.startTimeAttack();
      });
    }
    const btnTaHome = document.getElementById('btn-time-attack-home');
    if (btnTaHome) {
      this.bindTapOrClick(btnTaHome, () => {
        const m = document.getElementById('modal-time-attack-gameover');
        if (m) m.classList.add('hidden');
        this.isTimeAttack = false;
        this.loadLevel(this.currentLevel);
        this.openHomeModal();
      });
    }

    // Modal Victoria: Rehacer Nivel (Replay para mejorar tiempos manteniendo desafíos)
    const btnVicReplay = document.getElementById('btn-vic-replay');
    if (btnVicReplay) {
      this.bindTapOrClick(btnVicReplay, () => {
        this.hideModal(this.modalVictory);
        if (this.isDailyChallenge) {
          this.launchDailyChallenge();
        } else if (this.isCasualSandbox && this.casualSandboxConfig) {
          const data = window.LevelGenerator.generateCasualSandbox(this.casualSandboxConfig);
          this.loadLevel('casual_sandbox', 0, data);
        } else {
          this.loadLevel(this.currentLevel);
        }
      });
    }

    // Modal Victoria: Siguiente Nivel y Ruleta
    const btnVicNext = document.getElementById('btn-vic-next');
    if (btnVicNext) {
      this.bindTapOrClick(btnVicNext, () => {
        this.hideModal(this.modalVictory);
        if (this.isCasualSandbox) {
          this.nextCasualSandboxLevel();
        } else if (this.isDailyChallenge) {
          this.showLeaderboardModal();
        } else if (this.currentLevel >= 100) {
          if (!this.hasAllLevelsAtLeastOneStar()) {
            this.openMapModal();
          } else {
            this.showGameCompletionModal();
          }
        } else {
          this.loadLevel(this.currentLevel + 1);
        }
      });
    }

    // Modal Ajustes: Reinicio de Partida
    const btnResetProgress = document.getElementById('btn-reset-all-progress');
    if (btnResetProgress) {
      this.bindTapOrClick(btnResetProgress, () => {
        const confirmed = confirm('⚠️ ¿Estás completamente seguro de reiniciar TODO el progreso?\n\nSe restablecerá la campaña al Nivel 1, y se borrarán todos tus niveles completados, estrellas, monedas y récords.');
        if (confirmed) {
          if (window.leaderboardManager && typeof window.leaderboardManager.clearAllRecords === 'function') {
            window.leaderboardManager.clearAllRecords();
          }
          if (window.stateManager && typeof window.stateManager.resetAllProgress === 'function') {
            window.stateManager.resetAllProgress();
          }
          try {
            localStorage.removeItem('aquasort_leaderboard_records');
            localStorage.removeItem('aquasort_leaderboard');
            localStorage.removeItem('aquasort_state_v1');
            document.cookie = 'aquasort_state_v1=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
          } catch (e) {}
          alert('Progreso reiniciado con éxito. ¡Comienza una nueva Gran Obra desde el Nivel 1!');
          // Redirigir limpiando posibles parámetros de URL (ej. ?level=X)
          window.location.href = window.location.pathname;
        }
      });
    }
    const btnVicRoulette = document.getElementById('btn-vic-roulette');
    if (btnVicRoulette) {
      this.bindTapOrClick(btnVicRoulette, () => {
        this.hideModal(this.modalVictory);
        if (window.rouletteEngine) {
          window.rouletteEngine.openModal(75, true);
        } else {
          this.showModal(this.modalRoulette);
        }
        if (window.audio) window.audio.playMusic('roulette');
      });
    }

    // Salir de la ruleta / Cobrar
    const btnCashout = document.getElementById('btn-cashout-roulette');
    if (btnCashout) {
      this.bindTapOrClick(btnCashout, () => {
        this.onRouletteClosed();
      });
    }

    const btnCloseRoulette = document.getElementById('btn-close-roulette');
    if (btnCloseRoulette) {
      this.bindTapOrClick(btnCloseRoulette, () => {
        if (!window.rouletteEngine?.isSpinning && !window.rouletteEngine?.isDartFlying) {
          this.onRouletteClosed();
        }
      });
    }

    this.setupCompletionModalEvents();

    // Selector de Color de Fondo
    const bgPicker = document.getElementById('bg-color-picker');
    if (bgPicker) {
      bgPicker.addEventListener('input', (e) => {
        document.body.style.backgroundColor = e.target.value;
      });
    }
    const btnResetBg = document.getElementById('btn-reset-bg');
    if (btnResetBg) {
      this.bindTapOrClick(btnResetBg, () => {
        document.body.style.backgroundColor = '#0b1329';
        if (bgPicker) bgPicker.value = '#0b1329';
      });
    }

    // Modal Victoria de Desafío de Honor
    const btnHonorVicClose = document.getElementById('btn-honor-vic-close');
    if (btnHonorVicClose) {
      this.bindTapOrClick(btnHonorVicClose, () => {
        this.hideModal(this.modalHonorVictory);
        this.isHonorMode = false;
        this.openMapModal();
      });
    }

    // Modal Derrota de Desafío de Honor
    const btnHonorRetry = document.getElementById('btn-honor-retry');
    if (btnHonorRetry) {
      this.bindTapOrClick(btnHonorRetry, () => {
        this.hideModal(this.modalHonorDefeat);
        this.startHonorChallenge(this.honorSectionId, (this.seedVariation || 0) + 1);
      });
    }

    const btnHonorExit = document.getElementById('btn-honor-exit');
    if (btnHonorExit) {
      this.bindTapOrClick(btnHonorExit, () => {
        this.hideModal(this.modalHonorDefeat);
        this.isHonorMode = false;
        this.loadLevel(this.currentLevel);
      });
    }

    const btnHonorLockedOk = document.getElementById('btn-honor-locked-ok');
    if (btnHonorLockedOk) {
      this.bindTapOrClick(btnHonorLockedOk, () => {
        this.hideModal(this.modalHonorDefeat);
        this.isHonorMode = false;
        this.loadLevel(this.currentLevel);
      });
    }

    // Configurar cierre instantáneo tocando el fondo oscuro exterior (Backdrop)
    this.setupBackdropClose(this.modalHome, () => this.openConfirmExitGameModal());
    if (this.modalConfirmExitGame) {
      this.setupBackdropClose(this.modalConfirmExitGame, () => this.closeConfirmExitGameModal());
    }
    this.setupBackdropClose(this.modalShop, () => this.closeShopModal());
    this.setupBackdropClose(this.modalMap, () => {
      this.hideModal(this.modalMap);
      if (this.navigationSource === 'home') {
        this.openHomeModal();
      } else {
        this.resumeGameMusic();
      }
    });
    this.setupBackdropClose(this.modalLeaderboard, () => {
      this.hideModal(this.modalLeaderboard);
      if (this.navigationSource === 'home') {
        this.openHomeModal();
      }
    });
    this.setupBackdropClose(this.modalSettings, () => {
      this.hideModal(this.modalSettings);
      if (this.navigationSource === 'home') {
        this.openHomeModal();
      } else {
        this.resumeGameMusic();
      }
    });
    this.setupBackdropClose(this.modalRestartConfirm, () => this.closeRestartConfirmModal());
    this.setupBackdropClose(this.modalTutorial, () => this.closeTutorialModal());
    this.setupBackdropClose(this.modalEditor, () => this.closeEditorModal());
    this.setupBackdropClose(this.modalHonorVictory, () => {
      this.hideModal(this.modalHonorVictory);
      this.isHonorMode = false;
      this.openMapModal();
    });
    this.setupBackdropClose(this.modalHonorDefeat, () => {
      this.hideModal(this.modalHonorDefeat);
      this.isHonorMode = false;
      this.loadLevel(this.currentLevel);
    });
    this.setupBackdropClose(document.getElementById('modal-completion'), () => {
      const mc = document.getElementById('modal-completion');
      if (mc) this.hideModal(mc);
      if (this.navigationSource === 'home') {
        this.openHomeModal();
      }
    });
    this.setupBackdropClose(this.modalApocalypse, () => this.restartFromApocalypse());
    this.setupBackdropClose(this.modalRoulette, () => {
      if (this.modalRoulette && !window.rouletteEngine?.isSpinning && !window.rouletteEngine?.isDartFlying) {
        this.onRouletteClosed();
      }
    });

    // Escuchar cambios de música para refrescar UI de opciones si está abierta
    window.addEventListener('aquasort:trackchange', () => {
      if (this.modalSettings && !this.modalSettings.classList.contains('hidden')) {
        this.renderMusicSettingsUI();
      }
    });

    // Eventos del Modo Historia (Crónicas del Alquimista) y Easter Egg
    const btnHomeStory = document.getElementById('btn-home-story');
    if (btnHomeStory) {
      this.bindTapOrClick(btnHomeStory, () => {
        this.closeHomeModal();
        if (window.storyManager) window.storyManager.openGalleryModal();
      });
    }

    const btnMapStoryGallery = document.getElementById('btn-map-story-gallery');
    if (btnMapStoryGallery) {
      this.bindTapOrClick(btnMapStoryGallery, () => {
        this.hideModal(this.modalMap);
        if (window.storyManager) window.storyManager.openGalleryModal();
      });
    }

    const btnCloseStoryGallery = document.getElementById('btn-close-story-gallery');
    if (btnCloseStoryGallery) {
      this.bindTapOrClick(btnCloseStoryGallery, () => {
        if (window.storyManager) window.storyManager.closeGalleryModal();
        this.openMapModal();
      });
    }

    const btnHonorVicPlayCinematic = document.getElementById('btn-honor-vic-play-cinematic');
    if (btnHonorVicPlayCinematic) {
      this.bindTapOrClick(btnHonorVicPlayCinematic, () => {
        this.hideModal(this.modalHonorVictory);
        this.isHonorMode = false;
        if (window.storyManager && this.pendingHonorCinematicIndex !== null) {
          window.storyManager.openStoryModal(this.pendingHonorCinematicIndex, false);
        }
      });
    }

    const btnCloseStory = document.getElementById('btn-close-story');
    if (btnCloseStory) {
      this.bindTapOrClick(btnCloseStory, () => {
        if (window.storyManager) window.storyManager.closeStoryModal();
      });
    }

    const btnStoryBackGallery = document.getElementById('btn-story-back-gallery');
    if (btnStoryBackGallery) {
      this.bindTapOrClick(btnStoryBackGallery, () => {
        if (window.storyManager) {
          window.storyManager.closeStoryModal();
          window.storyManager.openGalleryModal();
        }
      });
    }

    const btnStoryReplay = document.getElementById('btn-story-replay');
    if (btnStoryReplay) {
      this.bindTapOrClick(btnStoryReplay, () => {
        if (window.storyManager) window.storyManager.replayAnimation();
      });
    }

    const btnCloseSpecialEnding = document.getElementById('btn-close-special-ending');
    if (btnCloseSpecialEnding) {
      this.bindTapOrClick(btnCloseSpecialEnding, () => {
        if (window.storyManager) window.storyManager.closeSpecialEndingModal();
      });
    }

    const btnEndingSecret = document.getElementById('btn-ending-secret');
    if (btnEndingSecret) {
      this.bindTapOrClick(btnEndingSecret, () => {
        const mc = document.getElementById('modal-completion');
        if (mc) this.hideModal(mc);
        if (window.storyManager) window.storyManager.triggerSecretEndingCinematic();
      });
    }

    this.setupBackdropClose(document.getElementById('modal-story-gallery'), () => {
      if (window.storyManager) window.storyManager.closeGalleryModal();
    });

    this.setupBackdropClose(document.getElementById('modal-story-chapter'), () => {
      if (window.storyManager) window.storyManager.closeStoryModal();
    });
    this.setupBackdropClose(document.getElementById('modal-special-ending-naza'), () => {
      if (window.storyManager) window.storyManager.closeSpecialEndingModal();
    });

    // Modal Científico Aburrido (Easter Egg 9999s)
    const btnBoredRestart = document.getElementById('btn-bored-restart');
    if (btnBoredRestart) {
      this.bindTapOrClick(btnBoredRestart, () => {
        const modal = document.getElementById('modal-bored-scientist');
        if (modal) this.hideModal(modal);
        this.restartLevel();
      });
    }

    const btnBoredMap = document.getElementById('btn-bored-map');
    if (btnBoredMap) {
      this.bindTapOrClick(btnBoredMap, () => {
        const modal = document.getElementById('modal-bored-scientist');
        if (modal) this.hideModal(modal);
        this.openMapModal();
      });
    }

    this.setupBackdropClose(document.getElementById('modal-bored-scientist'), () => {
      const modal = document.getElementById('modal-bored-scientist');
      if (modal) this.hideModal(modal);
    });

    // Modal Pausa Alquímica (⏸️)
    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) this.bindTapOrClick(btnPauseResume, () => this.closePauseModal());
    const btnClosePauseX = document.getElementById('btn-close-pause-x');
    if (btnClosePauseX) this.bindTapOrClick(btnClosePauseX, () => this.closePauseModal());

    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) {
      this.bindTapOrClick(btnPauseRestart, () => {
        this.closePauseModal();
        this.openRestartConfirmModal();
      });
    }

    const btnPauseShop = document.getElementById('btn-pause-shop');
    if (btnPauseShop) {
      this.bindTapOrClick(btnPauseShop, () => {
        this.closePauseModal();
        this.openShopModal();
      });
    }

    const btnPauseSettings = document.getElementById('btn-pause-settings');
    if (btnPauseSettings) {
      this.bindTapOrClick(btnPauseSettings, () => {
        this.closePauseModal();
        this.openSettingsModal();
      });
    }

    const btnPauseExitMap = document.getElementById('btn-pause-exit-map');
    if (btnPauseExitMap) {
      this.bindTapOrClick(btnPauseExitMap, () => {
        this.promptExitCurrentMode('map');
      });
    }

    const btnPauseExitHome = document.getElementById('btn-pause-exit-home');
    if (btnPauseExitHome) {
      this.bindTapOrClick(btnPauseExitHome, () => {
        this.promptExitCurrentMode('home');
      });
    }
    this.setupBackdropClose(this.modalPause, () => this.closePauseModal());

    // Modal Confirmar Salida y Cierre de Modo
    const btnConfirmExitMode = document.getElementById('btn-confirm-exit-mode');
    if (btnConfirmExitMode) {
      this.bindTapOrClick(btnConfirmExitMode, () => this.confirmExitCurrentMode());
    }
    const btnCancelExitMode = document.getElementById('btn-cancel-exit-mode');
    if (btnCancelExitMode) {
      this.bindTapOrClick(btnCancelExitMode, () => this.cancelExitCurrentMode());
    }
    if (this.modalExitModeConfirm) {
      this.setupBackdropClose(this.modalExitModeConfirm, () => this.cancelExitCurrentMode());
    }

    // Modal Tutorial del Escudo de Vida Alquímico (🛡️)
    const btnCloseShieldTutorial = document.getElementById('btn-close-shield-tutorial');
    if (btnCloseShieldTutorial) {
      this.bindTapOrClick(btnCloseShieldTutorial, () => {
        const m = document.getElementById('modal-shield-tutorial');
        if (m) this.hideModal(m);
      });
    }
    const modalShieldTut = document.getElementById('modal-shield-tutorial');
    if (modalShieldTut) {
      this.setupBackdropClose(modalShieldTut, () => this.hideModal(modalShieldTut));
    }

    // Modal Introductorio de Desafíos
    const btnCloseChalIntro = document.getElementById('btn-close-challenge-intro');
    if (btnCloseChalIntro) this.bindTapOrClick(btnCloseChalIntro, () => this.closeChallengeIntroModal());
    const btnCloseChalIntroX = document.getElementById('btn-close-challenge-intro-x');
    if (btnCloseChalIntroX) this.bindTapOrClick(btnCloseChalIntroX, () => this.closeChallengeIntroModal());
    this.setupBackdropClose(this.modalChallengeIntro, () => this.closeChallengeIntroModal());

    // Modal Sin Vidas (Out of Lives)
    const btnBuyLifeModal = document.getElementById('btn-buy-life-modal');
    if (btnBuyLifeModal) {
      this.bindTapOrClick(btnBuyLifeModal, () => {
        const res = window.stateManager ? window.stateManager.purchaseUpgrade('buy_life') : { success: false, msg: 'Error de estado' };
        if (res.success) {
          this.hideModal(this.modalOutOfLives);
          if (this.outOfLivesInterval) {
            clearInterval(this.outOfLivesInterval);
            this.outOfLivesInterval = null;
          }
          if (window.audio) window.audio.playWinFanfare();
          this.updateLivesHUD();
          this.updateCoinsUI();
          if (window.leaderboardManager) {
            window.leaderboardManager.resumeTimer('lbl-timer');
          }
          if (this.modalMap && !this.modalMap.classList.contains('hidden')) {
            this.openMapModal();
          }
        } else {
          alert(res.msg || 'No tienes suficientes monedas (250 🪙). Puedes esperar los 30 minutos o jugar modos alternativos (Casual / Bonuses).');
        }
      });
    }

    const btnOutOfLivesExit = document.getElementById('btn-out-of-lives-exit');
    if (btnOutOfLivesExit) {
      this.bindTapOrClick(btnOutOfLivesExit, () => {
        this.hideModal(this.modalOutOfLives);
        if (this.outOfLivesInterval) {
          clearInterval(this.outOfLivesInterval);
          this.outOfLivesInterval = null;
        }
        this.openMapModal();
      });
    }

    const btnCloseOutOfLivesX = document.getElementById('btn-close-out-of-lives-x');
    if (btnCloseOutOfLivesX) {
      this.bindTapOrClick(btnCloseOutOfLivesX, () => {
        this.hideModal(this.modalOutOfLives);
        if (this.outOfLivesInterval) {
          clearInterval(this.outOfLivesInterval);
          this.outOfLivesInterval = null;
        }
        if (window.stateManager && window.stateManager.getLives() <= 0 && this.isStoryLevel()) {
          this.openMapModal();
        }
      });
    }
    this.setupBackdropClose(this.modalOutOfLives, () => {
      this.hideModal(this.modalOutOfLives);
      if (this.outOfLivesInterval) {
        clearInterval(this.outOfLivesInterval);
        this.outOfLivesInterval = null;
      }
      if (window.stateManager && window.stateManager.getLives() <= 0 && this.isStoryLevel()) {
        this.openMapModal();
      }
    });

    // Cerrar modales con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = [
          this.modalMap, this.modalLeaderboard, this.modalSettings, this.modalHome,
          this.modalShop, this.modalRestartConfirm, this.modalTutorial, this.modalEditor,
          this.modalHonorVictory, this.modalHonorDefeat, document.getElementById('modal-completion'),
          document.getElementById('modal-story-chapter'), document.getElementById('modal-special-ending-naza'),
          this.modalChallengeIntro, this.modalPause, this.modalOutOfLives
        ];
        modals.forEach(m => m && this.hideModal(m));
        if (this.outOfLivesInterval) {
          clearInterval(this.outOfLivesInterval);
          this.outOfLivesInterval = null;
        }
        if (window.stateManager && window.stateManager.getLives() <= 0 && this.isStoryLevel()) {
          this.openMapModal();
        }
        if (window.audio && !this.isModalOpen()) {
          this.resumeGameMusic();
        }
      }
    });

    // Pausa automática y detención del tiempo cuando la aplicación pasa a segundo plano
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // La app pasó a segundo plano o se bloqueó la pantalla: pausar temporizadores
        if (window.leaderboardManager) {
          window.leaderboardManager.pauseTimer();
        }
        // Si hay una partida activa (sin modal de victoria ni pantalla de carga), pausar automáticamente
        const isGamePlaying = this.levelData && !this.isModalOpen() && (!this.modalVictory || this.modalVictory.classList.contains('hidden'));
        if (isGamePlaying) {
          this.openPauseModal();
        }
      } else {
        // La app volvió a primer plano:
        // Si NO está abierto ningún modal (incluido modalPause), reanudar tiempo
        if (!this.isModalOpen() && window.leaderboardManager) {
          window.leaderboardManager.resumeTimer('lbl-timer');
        }
      }
    });
  }

  // --- GESTIÓN DEL SISTEMA DE VIDAS Y REGENERACIÓN EN TIEMPO REAL ---
  updateLivesHUD() {
    if (!window.stateManager) return;
    window.stateManager.regenerateLives();
    const lives = window.stateManager.getLives();
    const maxLives = window.stateManager.getMaxLives();
    const shields = window.stateManager.getShields ? window.stateManager.getShields() : 0;
    const maxShields = window.stateManager.getMaxShields ? window.stateManager.getMaxShields() : 0;
    const timer = window.stateManager.getTimeToNextLife();

    // Eliminar el número (3/3) del HUD: se entiende visualmente con los corazones
    if (this.livesCountText) {
      this.livesCountText.textContent = `${lives}/${maxLives}`;
      this.livesCountText.classList.add('hidden');
    }

    if (this.livesHud) {
      if (shields > 0) {
        this.livesHud.classList.add('has-shields');
        this.livesHud.title = `Vidas: ${lives}/${maxLives} • Escudos Protectores: ${shields}/${maxShields}`;
      } else {
        this.livesHud.classList.remove('has-shields');
        this.livesHud.title = `Vidas: ${lives}/${maxLives}`;
      }
    }

    if (this.livesHeartsDisplay) {
      this.livesHeartsDisplay.innerHTML = '';
      for (let i = 0; i < maxLives; i++) {
        // Pintar metálico de izquierda a derecha por cada escudo activo
        if (i < shields) {
          this.livesHeartsDisplay.innerHTML += `
            <i data-lucide="heart" class="w-3.5 h-3.5 heart-icon-metallic" title="Escudo de Vida Activo"></i>
          `;
        } else if (i < lives) {
          this.livesHeartsDisplay.innerHTML += `
            <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500 text-rose-500 heart-icon-full" title="Vida Activa"></i>
          `;
        } else {
          this.livesHeartsDisplay.innerHTML += `
            <i data-lucide="heart" class="w-3.5 h-3.5 text-slate-600 heart-icon-empty" title="Vida Perdida"></i>
          `;
        }
      }
      if (window.lucide) lucide.createIcons();
    }

    if (this.livesTimerText) {
      if (timer && (lives < maxLives || (maxShields > 0 && shields < maxShields))) {
        this.livesTimerText.textContent = timer;
        this.livesTimerText.classList.remove('hidden');
      } else {
        this.livesTimerText.classList.add('hidden');
      }
    }
  }

  // --- MODAL DE PAUSA ALQUÍMICA (⏸️) ---
  openPauseModal() {
    if (!this.modalPause) return;
    if (window.leaderboardManager) {
      window.leaderboardManager.pauseTimer();
    }
    this.updateCoinsUI();
    const pauseInfo = document.getElementById('pause-level-info');
    if (pauseInfo) {
      pauseInfo.textContent = `Nivel ${this.currentLevel}`;
    }
    const list = document.getElementById('pause-challenges-list');
    if (list) {
      if (this.levelChallenges && this.levelChallenges.length > 0) {
        list.innerHTML = this.levelChallenges.map((c, i) => {
          const isDone = c.isCompleted || (typeof c.checkCompletion === 'function' && c.checkCompletion(this));
          return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border ${isDone ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700/80'}">
              <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-lg ${isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'} flex items-center justify-center text-xs font-black">${i + 1}</span>
                <div>
                  <h5 class="text-xs font-bold ${isDone ? 'text-emerald-300' : 'text-white'}">${c.name || c.title || 'Desafío'}</h5>
                  <p class="text-[11px] text-slate-400">${c.description || c.desc || ''}</p>
                </div>
              </div>
              <span class="text-xs font-bold px-2 py-1 rounded-lg ${isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700/40 text-slate-400'}">
                ${isDone ? '✓ Logrado' : 'En curso'}
              </span>
            </div>
          `;
        }).join('');
      } else {
        list.innerHTML = `
          <div class="text-xs text-slate-400 text-center py-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
            No hay desafíos secundarios en este nivel.
          </div>
        `;
      }
    }
    this.showModal(this.modalPause);
    if (window.lucide) lucide.createIcons();
  }

  closePauseModal() {
    if (!this.modalPause) return;
    this.hideModal(this.modalPause);
    if (window.leaderboardManager && !this.isModalOpen()) {
      window.leaderboardManager.resumeTimer('lbl-timer');
    }
  }

  // --- MODAL INTRODUCTORIO DE DESAFÍOS (DESAFÍOS AL INICIO DEL NIVEL) ---
  showChallengeIntroModal() {
    if (!this.modalChallengeIntro) return;

    // Si el bonus (ruleta / diana) está activo o visible, pausar el cartel de desafíos hasta que finalice
    const isBonusActive = (this.modalRoulette && !this.modalRoulette.classList.contains('hidden')) ||
                          (window.rouletteEngine && (window.rouletteEngine.isSpinning || window.rouletteEngine.isDartFlying));
    if (isBonusActive) {
      this.pendingChallengeIntro = true;
      return;
    }

    if (window.leaderboardManager) {
      window.leaderboardManager.pauseTimer();
    }
    const list = document.getElementById('challenge-intro-list');
    if (list) {
      if (this.levelChallenges && this.levelChallenges.length > 0) {
        list.innerHTML = this.levelChallenges.map((c, i) => `
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-indigo-500/30 shadow-inner">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              ${i + 1}
            </div>
            <div class="flex-1">
              <h5 class="text-xs font-bold text-white flex items-center gap-2">
                <span>${c.name || c.title || 'Desafío Secundario'}</span>
                ${c.rewardCoins ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">+${c.rewardCoins} 🪙</span>` : ''}
              </h5>
              <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${c.description || c.desc || ''}</p>
            </div>
          </div>
        `).join('');
      } else {
        list.innerHTML = `
          <div class="text-xs text-slate-400 text-center py-4 bg-slate-800/40 rounded-xl">
            ¡Supera el nivel sin restricciones adicionales!
          </div>
        `;
      }
    }
    this.showModal(this.modalChallengeIntro);
    if (window.lucide) lucide.createIcons();
  }

  closeChallengeIntroModal() {
    if (!this.modalChallengeIntro) return;
    this.hideModal(this.modalChallengeIntro);
    if (window.leaderboardManager && !this.isModalOpen()) {
      window.leaderboardManager.resumeTimer('lbl-timer');
    }
  }

  // --- GESTIÓN DE PÉRDIDA TOTAL DE VIDAS (OUT OF LIVES) ---
  handleOutOfLives(reason = 'zero_lives') {
    if (!this.modalOutOfLives) return;
    if (window.leaderboardManager) {
      window.leaderboardManager.pauseTimer();
    }
    if (window.audio) window.audio.playFailSound();

    const titleEl = document.getElementById('out-of-lives-title');
    const msgEl = document.getElementById('out-of-lives-msg');
    if (titleEl) titleEl.textContent = '¡Te has quedado sin vidas! 💔';
    if (msgEl) {
      if (reason === 'undo') {
        msgEl.textContent = 'Deshacer un movimiento cuesta 1 vida (❤️) y no te quedan vidas disponibles. No puedes continuar sin vidas.';
      } else if (reason === 'extra_tube') {
        msgEl.textContent = 'Agregar una botella extra cuesta 1 vida (❤️) y no te quedan vidas disponibles. No puedes continuar sin vidas.';
      } else if (reason === 'timer') {
        msgEl.textContent = 'Has permanecido más de 10 minutos en este nivel y has perdido tu última vida alquímica. No puedes continuar sin vidas.';
      } else {
        msgEl.textContent = 'Has perdido tu última vida alquímica. Para continuar jugando la historia debes recargar con monedas o esperar la recarga por tiempo.';
      }
    }

    this.startOutOfLivesCountdown();
    this.showModal(this.modalOutOfLives);
    if (window.lucide) lucide.createIcons();
  }

  showNoLivesMapModal() {
    if (!this.modalOutOfLives) return;
    const titleEl = document.getElementById('out-of-lives-title');
    const msgEl = document.getElementById('out-of-lives-msg');
    if (titleEl) titleEl.textContent = '¡Niveles Bloqueados! 🔒💔';
    if (msgEl) {
      msgEl.textContent = 'No puedes entrar a los niveles de la Gran Obra sin vidas alquímicas. Puedes adquirir 1 vida con monedas de inmediato o esperar la recarga cada 30 minutos. También puedes jugar al Modo Casual Infinito o Minijuegos de Bonus.';
    }

    this.startOutOfLivesCountdown();
    this.showModal(this.modalOutOfLives);
    if (window.lucide) lucide.createIcons();
  }

  startOutOfLivesCountdown() {
    if (this.outOfLivesInterval) {
      clearInterval(this.outOfLivesInterval);
      this.outOfLivesInterval = null;
    }
    const updateTimer = () => {
      const timerEl = document.getElementById('out-of-lives-regen-timer');
      if (!timerEl) return;
      if (!window.stateManager) {
        timerEl.textContent = '--:--';
        return;
      }
      const lives = window.stateManager.getLives();
      if (lives > 0) {
        timerEl.textContent = '¡Ya tienes vidas disponibles!';
        setTimeout(() => {
          if (this.modalOutOfLives && !this.modalOutOfLives.classList.contains('hidden')) {
            this.hideModal(this.modalOutOfLives);
            if (this.outOfLivesInterval) {
              clearInterval(this.outOfLivesInterval);
              this.outOfLivesInterval = null;
            }
            if (window.leaderboardManager) {
              window.leaderboardManager.resumeTimer('lbl-timer');
            }
            if (this.modalMap && !this.modalMap.classList.contains('hidden')) {
              this.openMapModal();
            }
          }
        }, 800);
        return;
      }
      const timeRemaining = window.stateManager.getTimeToNextLife();
      timerEl.textContent = timeRemaining;
    };

    updateTimer();
    this.outOfLivesInterval = setInterval(updateTimer, 1000);
  }

  // --- MODAL DE CONFIRMACIÓN DE REINICIO CON SEED REROLL Y CONSUMO DE VIDA ---
  openRestartConfirmModal() {
    if (this.isTimeAttack) {
      this.startTimeAttack();
      if (window.audio) window.audio.playSelect();
      return;
    }
    if (!window.stateManager) {
      this.loadLevel(this.currentLevel);
      return;
    }
    this.updateLivesHUD();
    const lives = window.stateManager.getLives();
    const maxLives = window.stateManager.getMaxLives();
    const timer = window.stateManager.getTimeToNextLife();

    const lblLives = document.getElementById('restart-modal-lives');
    const lblRegen = document.getElementById('restart-modal-regen-timer');
    const btnConfirm = document.getElementById('btn-confirm-restart');

    if (lblLives) lblLives.textContent = `${lives}/${maxLives} ❤️`;
    if (lblRegen) lblRegen.textContent = timer ? `+1 ❤️ en ${timer}` : 'Vidas al máximo';

    if (btnConfirm) {
      if (lives <= 0) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Sin Vidas Suficientes (Compra en Tienda)';
        btnConfirm.classList.add('opacity-40');
      } else {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Confirmar y Reiniciar (❤️ -1)';
        btnConfirm.classList.remove('opacity-40');
      }
    }

    this.showModal(this.modalRestartConfirm);
    if (window.lucide) lucide.createIcons();
  }

  closeRestartConfirmModal() {
    this.hideModal(this.modalRestartConfirm);
  }

  confirmRestartLevel() {
    if (this.isCasualSandbox) {
      this.closeRestartConfirmModal();
      this.nextCasualSandboxLevel();
      if (window.audio) window.audio.playSelect();
      return;
    }
    if (this.isTimeAttack) {
      this.closeRestartConfirmModal();
      this.startTimeAttack();
      if (window.audio) window.audio.playSelect();
      return;
    }
    if (!window.stateManager) {
      this.loadLevel(this.currentLevel);
      this.closeRestartConfirmModal();
      return;
    }

    const consumed = window.stateManager.consumeLife();
    if (!consumed) {
      alert('¡No te quedan vidas disponibles! Puedes comprar vidas en la Tienda del Alquimista.');
      this.closeRestartConfirmModal();
      this.openShopModal();
      return;
    }

    // Variación determinista de semilla alquímica para romper memoria repetitiva
    this.seedVariation = (this.seedVariation || 0) + 1;
    this.closeRestartConfirmModal();
    this.loadLevel(this.currentLevel, this.seedVariation);
    this.updateLivesHUD();
    if (window.audio) window.audio.playSelect();
  }

  // --- GUÍA Y TUTORIALES DE MECÁNICAS (ANIMACIONES LOOPEADAS) ---
  isMechanicUnlocked(mechanicId) {
    if (mechanicId === 'basic') return true;
    const cat = this.mechanicsCatalog.find(m => m.id === mechanicId);
    if (!cat) return false;
    const currentLvl = this.currentLevel || 1;
    const highestLvl = Math.max(currentLvl, window.stateManager?.state?.progress?.unlockedLevel || 1);
    const seen = window.stateManager?.state?.progress?.seenTutorials || [];
    return highestLvl >= cat.level || currentLvl >= cat.level || seen.includes(mechanicId);
  }

  openTutorialsHelp(preferredId = null) {
    let targetId = preferredId;
    if (!targetId || !this.isMechanicUnlocked(targetId)) {
      if (this.levelData?.primaryMechanicId && this.isMechanicUnlocked(this.levelData.primaryMechanicId)) {
        targetId = this.levelData.primaryMechanicId;
      } else {
        const unlocked = this.mechanicsCatalog.filter(m => this.isMechanicUnlocked(m.id));
        targetId = unlocked.length > 0 ? unlocked[unlocked.length - 1].id : 'basic';
      }
    }
    this.showTutorialModal(targetId, false);
  }

  showTutorialModal(mechanicId = 'basic', isNewAnnouncement = false) {
    this.currentTutorialId = mechanicId;
    this.renderTutorialTabs();
    this.renderTutorialContent(this.currentTutorialId, isNewAnnouncement);

    this.showModal(this.modalTutorial);
    if (window.audio) {
      if (isNewAnnouncement) window.audio.playReveal();
      else window.audio.playPop();
    }
  }

  switchTutorial(mechanicId) {
    if (!this.isMechanicUnlocked(mechanicId)) return;
    this.currentTutorialId = mechanicId;
    this.renderTutorialTabs();
    this.renderTutorialContent(this.currentTutorialId, false);
    if (window.audio) window.audio.playPop();
  }

  navigateTutorial(dir) {
    const unlocked = this.mechanicsCatalog.filter(m => this.isMechanicUnlocked(m.id));
    if (unlocked.length === 0) return;
    const currentIndex = unlocked.findIndex(m => m.id === this.currentTutorialId);
    const newIndex = currentIndex + dir;
    if (newIndex >= 0 && newIndex < unlocked.length) {
      this.switchTutorial(unlocked[newIndex].id);
    }
  }

  renderTutorialTabs() {
    const tabsCont = document.getElementById('tutorial-tabs-container');
    if (!tabsCont) return;

    tabsCont.innerHTML = '';
    this.mechanicsCatalog.forEach(m => {
      const isUnlocked = this.isMechanicUnlocked(m.id);
      const isActive = m.id === this.currentTutorialId;

      if (isUnlocked) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          isActive
            ? 'bg-gradient-to-r from-sky-500/30 to-indigo-600/30 text-sky-200 border border-sky-400 shadow-md shadow-sky-500/20'
            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
        }`;
        btn.innerHTML = `
          <i data-lucide="${m.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-sky-300' : 'text-slate-400'}"></i>
          <span>${m.title}</span>
        `;
        btn.addEventListener('click', () => this.switchTutorial(m.id));
        tabsCont.appendChild(btn);
      } else {
        const lockedDiv = document.createElement('div');
        lockedDiv.className = 'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-slate-800/40 text-slate-500 border border-slate-800 select-none cursor-not-allowed';
        lockedDiv.title = `Se desbloquea al alcanzar el Nivel ${m.level}`;
        lockedDiv.innerHTML = `
          <i data-lucide="lock" class="w-3 h-3 text-slate-500"></i>
          <span>${m.title} (Niv. ${m.level})</span>
        `;
        tabsCont.appendChild(lockedDiv);
      }
    });

    // Auto-scroll hacia la pestaña activa
    const activeBtn = tabsCont.querySelector('.border-sky-400');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  renderTutorialContent(mechanicId, isNewAnnouncement = false) {
    const tutorials = {
      basic: {
        title: 'Reglas Básicas de AquaSort',
        desc: 'Toca un frasco para levantarlo y luego toca otro para verter su líquido. Solo puedes verter si el frasco de destino tiene espacio libre y el líquido superior coincide en color (¡o si el frasco está totalmente vacío!). Agrupa cada color en su propio frasco para ganar el nivel.',
        icon: 'droplets',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <!-- Tubo A (Izquierda, se inclina y vierte azul) -->
            <g class="demo-basic-tubeA">
              <rect x="42" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <rect x="45" y="102" width="30" height="28" rx="8" fill="#ef4444"/>
              <rect x="45" y="72" width="30" height="28" rx="4" fill="#3b82f6" class="demo-basic-pour"/>
            </g>
            <!-- Tubo B (Derecha, recibe el líquido azul) -->
            <g>
              <rect x="142" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <rect x="145" y="102" width="30" height="28" rx="8" fill="#3b82f6"/>
              <rect x="145" y="72" width="30" height="28" rx="4" fill="#3b82f6" class="demo-basic-fill"/>
            </g>
            <path d="M 80 50 Q 112 25 140 50" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,3"/>
            <text x="60" y="152" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">1. Toca para verter</text>
            <text x="160" y="152" fill="#38bdf8" font-size="9" font-weight="bold" text-anchor="middle">2. Mismo color o vacío</text>
          </svg>
        `
      },
      glued: {
        title: 'Frasco Inamovible en la Roca',
        desc: 'Este frasco está enterrado en la piedra como la espada de Excalibur. Solo puede RECIBIR fluidos (normales o camaleón), ¡nunca puede vaciarse! Si te equivocas vertiendo un color indebido, tendrás que reiniciar el nivel.',
        icon: 'mountain',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <!-- Tubo A (Izquierda: normal, se inclina y vierte fluido en B) -->
            <g class="demo-glued-tubeA">
              <rect x="35" y="25" width="34" height="105" rx="13" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <rect x="38" y="97" width="28" height="28" rx="7" fill="#3b82f6"/>
              <rect x="38" y="67" width="28" height="28" rx="4" fill="#3b82f6"/>
            </g>

            <!-- Tubo B (Derecha: incrustado en roca, solo recibe) -->
            <g class="demo-glued-tube-rock" style="transform-origin: 155px 125px;">
              <rect x="138" y="25" width="34" height="105" rx="13" fill="rgba(255,255,255,0.06)" stroke="#64748b" stroke-width="2"/>
              <g class="demo-glued-fillB">
                <rect x="141" y="97" width="28" height="28" rx="7" fill="#3b82f6"/>
              </g>

              <!-- Roca base Excalibur poligonal facetada ajustada a la base del tubo -->
              <g transform="translate(155, 130) scale(0.607) translate(-128, -199)">
                <path d="M 104,187 L 116,184 L 128,193 L 140,184 L 152,190 L 160,208 L 144,215 L 111,215 L 95,208 Z" fill="#26364c"/>
                <path d="M 104,190 L 116,187 L 123,199 L 111,211 L 97,207 Z" fill="#34465e"/>
                <path d="M 128,193 L 140,187 L 151,194 L 144,211 L 128,215 L 123,199 Z" fill="#1b293d"/>
                <path d="M 140,187 L 152,190 L 160,208 L 144,211 L 151,194 Z" fill="#2d3e55"/>
                <path d="M 116,187 L 123,199 L 111,211 M 140,187 L 134,201 L 144,211" fill="none" stroke="#64758a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
              </g>

              <!-- Signo de prohibido cuando intenta salir -->
              <g class="demo-no-sign" style="transform-origin: 155px 50px;">
                <circle cx="155" cy="50" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
                <line x1="145" y1="40" x2="165" y2="60" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
                <text x="155" y="80" fill="#f87171" font-size="10" font-weight="900" text-anchor="middle">INAMOVIBLE</text>
              </g>
            </g>
            <text x="52" y="152" fill="#38bdf8" font-size="9" font-weight="bold" text-anchor="middle">Solo entrada ✓</text>
            <text x="155" y="152" fill="#ef4444" font-size="9" font-weight="bold" text-anchor="middle">No puede vaciarse 🚫</text>
          </svg>
        `
      },
      mystery: {
        title: "Líquidos Ocultos '?'",
        desc: 'Los fluidos misteriosos ocultan su color bajo el signo ?. La superficie superior siempre está descubierta. ¡Al retirar el líquido que lo tapa, el bloque oculto revela su color y símbolo!',
        icon: 'help-circle',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <!-- Tubo A (Izquierda, se inclina y vierte) -->
            <g class="demo-anim-mystery-tubeA">
              <rect x="42" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <!-- Bloque inferior oculto que se revela -->
              <rect x="45" y="102" width="30" height="28" rx="8" class="demo-anim-mystery-block"/>
              <g class="demo-anim-mystery-mark">
                <text x="60" y="121" fill="#94a3b8" font-size="14" font-weight="900" text-anchor="middle" class="demo-mystery-q">?</text>
              </g>
              <!-- Bloque azul superior que se vacía hacia Tubo B -->
              <rect x="45" y="72" width="30" height="28" rx="4" fill="#3b82f6" class="demo-anim-mystery-blue"/>
            </g>
            
            <!-- Tubo B (Derecha, recibe el líquido azul) -->
            <g>
              <rect x="142" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <rect x="145" y="102" width="30" height="28" rx="8" fill="#3b82f6" class="demo-anim-mystery-blue-dest"/>
            </g>
            <text x="60" y="152" fill="#94a3b8" font-size="10" font-weight="bold" text-anchor="middle">1. Quitar capa azul</text>
            <text x="160" y="152" fill="#38bdf8" font-size="10" font-weight="bold" text-anchor="middle">2. ¡Se revela el color!</text>
          </svg>
        `
      },
      giant: {
        title: 'Frasco Gigante (Capacidad 6)',
        desc: 'Un recipiente de gran tamaño capaz de contener hasta 6 unidades de líquido. Te brinda espacio adicional para maniobras complejas de trasvase.',
        icon: 'maximize-2',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <g>
              <rect x="45" y="40" width="34" height="95" rx="12" fill="rgba(255,255,255,0.06)" stroke="#94a3b8" stroke-width="1.8"/>
              <text x="62" y="32" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">Normal: 4</text>
            </g>
            <g>
              <rect x="135" y="15" width="40" height="125" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2.2"/>
              <rect x="138" y="112" width="34" height="24" rx="8" fill="#10b981"/>
              <rect x="138" y="86" width="34" height="24" fill="#10b981"/>
              <rect x="138" y="60" width="34" height="24" fill="#10b981"/>
              <text x="155" y="12" fill="#38bdf8" font-size="10" font-weight="900" text-anchor="middle">GIGANTE: 6</text>
            </g>
            <text x="110" y="152" fill="#38bdf8" font-size="10" font-weight="bold" text-anchor="middle">Capacidad extendida de 6 unidades</text>
          </svg>
        `
      },
      lock: {
        title: 'Candado Alquímico con Llave',
        desc: 'El frasco C está protegido por un cerrojo mágico. Si el color de la llave está cubierto por otro líquido en el tubo A, despeja primero ese líquido hacia el tubo B y luego vierte la llave para desbloquear.',
        icon: 'lock',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <!-- Tubo A (Izquierda: llave rosa tapada por bloque azul) -->
            <g>
              <rect x="20" y="25" width="34" height="108" rx="13" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="1.8"/>
              <!-- Llave rosa inferior que viaja a C -->
              <g class="demo-lock-key-c">
                <rect x="23" y="100" width="28" height="28" rx="7" fill="#ec4899"/>
                <text x="37" y="119" fill="#ffffff" font-size="13" text-anchor="middle">🔑</text>
              </g>
              <!-- Bloque azul que estorba y viaja a B -->
              <rect x="23" y="70" width="28" height="28" rx="4" fill="#3b82f6" class="demo-lock-block-b"/>
              <text x="37" y="150" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">A: Llave tapada</text>
            </g>

            <!-- Tubo B (Centro: receptor del bloque azul) -->
            <g>
              <rect x="93" y="25" width="34" height="108" rx="13" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="1.8"/>
              <text x="110" y="150" fill="#60a5fa" font-size="9" font-weight="bold" text-anchor="middle">B: Despejar</text>
            </g>

            <!-- Tubo C (Derecha: frasco con candado) -->
            <g>
              <rect x="166" y="25" width="34" height="108" rx="13" fill="rgba(255,255,255,0.06)" stroke="#f59e0b" stroke-width="2"/>
              <!-- Candado mágico -->
              <g class="demo-lock-shackle" style="transform-origin: 183px 75px;">
                <circle cx="183" cy="70" r="16" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
                <path d="M 178 70 L 178 63 A 5 5 0 0 1 188 63 L 188 70" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
                <rect x="176" y="70" width="14" height="11" rx="2" fill="#f59e0b"/>
                <text x="183" y="79" fill="#0f172a" font-size="8" font-weight="900" text-anchor="middle">✓</text>
              </g>
              <text x="183" y="150" fill="#f59e0b" font-size="9" font-weight="bold" text-anchor="middle">C: ¡Desbloqueo!</text>
            </g>
          </svg>
        `
      },
      narrow: {
        title: 'Tubo Estrecho de Precisión (1x1)',
        desc: 'Tubo de precisión ultra delgado: solo permite ingresar 1 cuarto de fluido puro (aislado). Si intentas meter un líquido que ya combinó 2 o más cuartos juntos, ¡se produce una Reacción Química Inesperada!, vaciando el frasco origen y esparciendo sus fluidos en los demás tubos que no estén completos.',
        icon: 'minimize-2',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <g>
              <rect x="45" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" stroke-width="2"/>
              <rect x="48" y="103" width="30" height="28" rx="8" fill="#8b5cf6"/>
              <rect x="48" y="73" width="30" height="28" fill="#8b5cf6"/>
              <rect x="48" y="43" width="30" height="28" fill="#8b5cf6"/>
            </g>
            <g>
              <rect x="140" y="35" width="22" height="100" rx="10" fill="rgba(255,255,255,0.06)" stroke="#a855f7" stroke-width="2"/>
              <rect x="142" y="108" width="18" height="24" rx="6" fill="#8b5cf6"/>
              <text x="151" y="26" fill="#c084fc" font-size="10" font-weight="900" text-anchor="middle">1x1</text>
            </g>
            <path d="M 85 55 Q 115 35 138 50" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="4,3"/>
            <text x="110" y="152" fill="#c084fc" font-size="9" font-weight="bold" text-anchor="middle">Solo 1 cuarto puro (¡2+ causan sobrecarga!)</text>
          </svg>
        `
      },
      chameleon: {
        title: 'Líquido Camaleón Multicolor (Comodín)',
        desc: '¡El comodín alquímico! Se transfiere de forma individual (1 sola unidad) sin arrastrar los líquidos de abajo. Al verterlo en otro frasco, adopta su color y forma para ayudarte a completarlo. ¡Si lo pasas a un frasco vacío, se conserva multicolor!',
        icon: 'disc',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <g>
              <rect x="45" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#ec4899" stroke-width="2"/>
              <rect x="48" y="103" width="30" height="28" rx="8" class="anim-chameleon-loop"/>
            </g>
            <g>
              <rect x="140" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#a855f7" stroke-width="2"/>
              <rect x="143" y="103" width="30" height="28" rx="8" fill="#a855f7"/>
            </g>
            <path d="M 85 60 Q 112 35 138 60" fill="none" stroke="#ec4899" stroke-width="3" stroke-dasharray="4,3"/>
            <text x="110" y="152" fill="#ec4899" font-size="10" font-weight="bold" text-anchor="middle">Se mueve solo (1u) y adopta el color destino</text>
          </svg>
        `
      },
      fragile: {
        title: 'Cristal de Afinidad (Selectivo / Volátil)',
        desc: 'Frasco que inicia vacío y posee afinidad por colores específicos representados en sus gemas superiores. Permite almacenar temporalmente otros colores en emergencias, pero cada color no afín resquebraja el cristal. A la 3ª infracción (o a la 1ª en versiones volátiles ⚡) el frasco estalla y se destruye.',
        icon: 'shield-alert',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <g>
              <rect x="92" y="32" width="36" height="105" rx="14" fill="rgba(255,255,255,0.06)" stroke="#c084fc" stroke-width="2"/>
              <!-- Gemas de afinidad en corona superior -->
              <circle cx="102" cy="22" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.2"/>
              <circle cx="118" cy="22" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2"/>
              <!-- Líquido incompatible -->
              <rect x="95" y="103" width="30" height="30" rx="8" fill="#10b981"/>
              <!-- Fisura -->
              <path d="M 104 45 L 112 60 L 106 80 L 118 102" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="80" y="142" width="60" height="16" rx="8" fill="#7e22ce"/>
              <text x="110" y="154" fill="#ffffff" font-size="9" font-weight="900" text-anchor="middle">AFINIDAD: 💎</text>
            </g>
            <text x="110" y="13" fill="#c084fc" font-size="10" font-weight="bold" text-anchor="middle">Solo tolera sus colores afines</text>
          </svg>
        `
      },
      hybrid: {
        title: 'Desafío Alquímico Híbrido',
        desc: 'Combina múltiples mecánicas avanzadas en un solo nivel (candados, tubos pegados, estrechos y líquidos misteriosos). ¡Pon a prueba tu máxima maestría!',
        icon: 'sparkles',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <rect x="40" y="35" width="32" height="105" rx="12" fill="rgba(255,255,255,0.08)" stroke="#f97316" stroke-width="2"/>
            <rect x="84" y="20" width="32" height="120" rx="12" fill="rgba(255,255,255,0.08)" stroke="#38bdf8" stroke-width="2"/>
            <rect x="128" y="35" width="32" height="105" rx="12" fill="rgba(255,255,255,0.08)" stroke="#a855f7" stroke-width="2"/>
            <text x="100" y="152" fill="#f97316" font-size="10" font-weight="bold" text-anchor="middle">¡Combina múltiples reglas mágicas!</text>
          </svg>
        `
      },
      magna: {
        title: 'La Gran Obra Magna',
        desc: 'El pináculo del arte alquímico en los niveles 91 al 100. Coordina simultáneamente fluidos camaleón, sellos de candado, tubos estrechos de precisión y cristales frágiles. ¡Solo los verdaderos Grandes Maestros logran consumar la Gran Obra!',
        icon: 'award',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <rect x="25" y="30" width="30" height="110" rx="12" fill="rgba(255,255,255,0.08)" stroke="#f59e0b" stroke-width="2"/>
            <rect x="75" y="15" width="30" height="125" rx="12" fill="rgba(255,255,255,0.08)" stroke="#ec4899" stroke-width="2"/>
            <rect x="125" y="30" width="30" height="110" rx="12" fill="rgba(255,255,255,0.08)" stroke="#10b981" stroke-width="2"/>
            <rect x="175" y="45" width="20" height="95" rx="10" fill="rgba(255,255,255,0.08)" stroke="#a855f7" stroke-width="2"/>
            <text x="110" y="152" fill="#fbbf24" font-size="10" font-weight="900" text-anchor="middle">🏅 Gran Obra Alquímica: Fusión Total</text>
          </svg>
        `
      }
    };

    const data = tutorials[mechanicId] || tutorials.basic;
    const cat = this.mechanicsCatalog.find(m => m.id === mechanicId) || this.mechanicsCatalog[0];

    const badgeEl = document.getElementById('tutorial-badge');
    const unlockLvlEl = document.getElementById('tutorial-unlock-level');
    const titleEl = document.getElementById('tutorial-title');
    const descEl = document.getElementById('tutorial-desc');
    const looperCont = document.getElementById('tutorial-looper-container');
    const iconBox = document.getElementById('tutorial-icon-box');

    if (badgeEl) {
      badgeEl.textContent = isNewAnnouncement ? '¡NUEVA MECÁNICA ALQUÍMICA!' : 'GUÍA DE TUBOS Y MECÁNICAS';
      if (isNewAnnouncement) {
        badgeEl.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-black animate-pulse';
      } else {
        badgeEl.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-black';
      }
    }

    if (unlockLvlEl && cat) {
      unlockLvlEl.textContent = cat.level === 1 ? 'Nivel 1+ (Básico)' : `Desbloqueado (Nivel ${cat.level}+)`;
    }

    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;
    if (looperCont) looperCont.innerHTML = data.svg;
    if (iconBox) iconBox.innerHTML = `<i data-lucide="${data.icon}" class="w-7 h-7 sm:w-8 sm:h-8"></i>`;

    // Actualizar botones de navegación Anterior / Siguiente
    const unlocked = this.mechanicsCatalog.filter(m => this.isMechanicUnlocked(m.id));
    const currentIndex = unlocked.findIndex(m => m.id === mechanicId);
    const btnPrev = document.getElementById('btn-tut-prev');
    const btnNext = document.getElementById('btn-tut-next');

    if (btnPrev) btnPrev.disabled = currentIndex <= 0;
    // Botón de activación/desactivación rápida de dificultad personalizada
    const toggleCont = document.getElementById('tutorial-mechanic-toggle-container');
    if (toggleCont) {
      if (mechanicId === 'basic') {
        toggleCont.classList.add('hidden');
      } else {
        toggleCont.classList.remove('hidden');
        const isDis = window.stateManager ? window.stateManager.isMechanicDisabled(mechanicId) : false;
        toggleCont.innerHTML = `
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
            <div class="pr-2">
              <span class="text-[11px] font-semibold text-slate-200 block">¿Deseas jugar sin esta mecánica?</span>
              <span class="text-[10px] text-slate-400">Puedes desactivarla aquí o en el menú de Ajustes.</span>
            </div>
            <button id="btn-toggle-this-mechanic" class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${isDis ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'}">
              ${isDis ? 'Desactivada ✓' : 'Desactivar ✕'}
            </button>
          </div>
        `;
        const btnToggle = toggleCont.querySelector('#btn-toggle-this-mechanic');
        if (btnToggle) {
          btnToggle.addEventListener('click', () => {
            const nowDis = !window.stateManager?.isMechanicDisabled(mechanicId);
            window.stateManager?.setMechanicDisabled(mechanicId, nowDis);
            this.renderTutorialContent(mechanicId, false);
            if (this.currentLevel && !this.isHonorMode && !this.isDailyChallenge && !this.customLevelTesting) {
              this.loadLevel(this.currentLevel, this.seedVariation);
            }
          });
        }
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  closeTutorialModal() {
    this.hideModal(this.modalTutorial);
    if (this.navigationSource === 'home') {
      this.openHomeModal();
    }
  }

  // --- TALLER DE CREACIÓN DE NIVELES (LEVEL EDITOR) ---
  initEditorWorkspace() {
    this.editorLevel.tubes = [
      { capacity: 4, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●', isMystery: false }, { color: '#3b82f6', name: 'Azul', shape: '▲', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] },
      { capacity: 4, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲', isMystery: false }, { color: '#ef4444', name: 'Rojo', shape: '●', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] },
      { capacity: 4, liquids: [{ color: '#10b981', name: 'Verde', shape: '■', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] },
      { capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] },
      { capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: true, isFragile: false, isAffinity: false, isSuperFragile: false, cracks: 0, maxCracks: null, isBroken: false, allowedColors: [], allowedColorNames: [] }
    ];
  }

  openEditorModal(tab = 'design') {
    this.switchEditorTab(tab);
    this.renderEditorBrushes();
    this.renderEditorTubes();
    this.updateEditorValidation();
    this.showModal(this.modalEditor);
    if (window.lucide) lucide.createIcons();
  }

  closeEditorModal() {
    this.hideModal(this.modalEditor);
  }

  switchEditorTab(tab) {
    const tabDesign = document.getElementById('tab-editor-design');
    const tabSaved = document.getElementById('tab-editor-saved');
    const panelDesign = document.getElementById('editor-panel-design');
    const panelSaved = document.getElementById('editor-panel-saved');

    if (tab === 'design') {
      if (tabDesign) { tabDesign.classList.add('bg-purple-600', 'text-white'); tabDesign.classList.remove('bg-slate-800', 'text-slate-300'); }
      if (tabSaved) { tabSaved.classList.remove('bg-purple-600', 'text-white'); tabSaved.classList.add('bg-slate-800', 'text-slate-300'); }
      if (panelDesign) panelDesign.classList.remove('hidden');
      if (panelSaved) panelSaved.classList.add('hidden');
    } else {
      if (tabSaved) { tabSaved.classList.add('bg-purple-600', 'text-white'); tabSaved.classList.remove('bg-slate-800', 'text-slate-300'); }
      if (tabDesign) { tabDesign.classList.remove('bg-purple-600', 'text-white'); tabDesign.classList.add('bg-slate-800', 'text-slate-300'); }
      if (panelSaved) panelSaved.classList.remove('hidden');
      if (panelDesign) panelDesign.classList.add('hidden');
      this.renderSavedCustomLevels();
    }
  }

  renderEditorBrushes() {
    const container = document.getElementById('editor-palette-brushes');
    if (!container) return;
    container.innerHTML = '';

    const palette = window.paletteManager ? window.paletteManager.getPalette() : [];
    palette.forEach(col => {
      const btn = document.createElement('button');
      btn.className = `editor-slot-btn has-color px-2.5 py-1 flex items-center gap-1 text-white font-bold text-xs ${this.activeBrush.type === 'color' && this.activeBrush.color === col.hex ? 'ring-2 ring-white scale-105' : ''}`;
      btn.style.backgroundColor = col.hex;
      btn.innerHTML = `<span>${col.shape}</span><span>${col.name}</span>`;
      btn.onclick = () => {
        this.activeBrush = { type: 'color', color: col.hex, name: col.name, shape: col.shape };
        const lbl = document.getElementById('editor-active-brush-lbl');
        if (lbl) lbl.textContent = `Pincel: ${col.name}`;
        this.renderEditorBrushes();
      };
      container.appendChild(btn);
    });

    // Pincel Misterio '?'
    const btnMystery = document.createElement('button');
    btnMystery.className = `editor-slot-btn px-2.5 py-1 bg-slate-800 border border-sky-400 text-sky-300 font-extrabold text-xs flex items-center gap-1 ${this.activeBrush.type === 'mystery' ? 'ring-2 ring-sky-300 scale-105' : ''}`;
    btnMystery.innerHTML = `<span>?</span><span>Misterio</span>`;
    btnMystery.onclick = () => {
      this.activeBrush = { type: 'mystery' };
      const lbl = document.getElementById('editor-active-brush-lbl');
      if (lbl) lbl.textContent = "Pincel: Misterio '?'";
      this.renderEditorBrushes();
    };
    container.appendChild(btnMystery);

    // Pincel Camaleón
    const btnChameleon = document.createElement('button');
    btnChameleon.className = `editor-slot-btn px-2.5 py-1 bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1 ${this.activeBrush.type === 'chameleon' ? 'ring-2 ring-white scale-105' : ''}`;
    btnChameleon.innerHTML = `<span>★</span><span>Camaleón</span>`;
    btnChameleon.onclick = () => {
      this.activeBrush = { type: 'chameleon' };
      const lbl = document.getElementById('editor-active-brush-lbl');
      if (lbl) lbl.textContent = 'Pincel: Fluido Camaleón';
      this.renderEditorBrushes();
    };
    container.appendChild(btnChameleon);

    // Pincel Vaciar Slot
    const btnClear = document.createElement('button');
    btnClear.className = `editor-slot-btn px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1 ${this.activeBrush.type === 'clear' ? 'ring-2 ring-rose-400 scale-105' : ''}`;
    btnClear.innerHTML = `<span>✕</span><span>Vaciar</span>`;
    btnClear.onclick = () => {
      this.activeBrush = { type: 'clear' };
      const lbl = document.getElementById('editor-active-brush-lbl');
      if (lbl) lbl.textContent = 'Pincel: Vaciar Capa';
      this.renderEditorBrushes();
    };
    container.appendChild(btnClear);
  }

  renderEditorTubes() {
    const workspace = document.getElementById('editor-tubes-workspace');
    if (!workspace) return;
    workspace.innerHTML = '';

    this.editorLevel.tubes.forEach((tube, tIdx) => {
      const card = document.createElement('div');
      card.className = 'editor-tube-card w-28';

      // Header del tubo: Selector de mecánica
      const selectType = document.createElement('select');
      selectType.className = 'w-full bg-slate-900 border border-slate-700 text-[10px] text-sky-200 rounded-lg p-1 outline-none';
      selectType.innerHTML = `
        <option value="normal" ${!tube.isGlued && !tube.isLocked && !tube.isNarrow && !tube.isAffinity && !tube.isFragile ? 'selected' : ''}>Normal</option>
        <option value="glued" ${tube.isGlued ? 'selected' : ''}>Inamovible (Roca) 🪨</option>
        <option value="lock" ${tube.isLocked ? 'selected' : ''}>Candado 🔒</option>
        <option value="narrow" ${tube.isNarrow ? 'selected' : ''}>Estrecho 1x1</option>
        <option value="affinity" ${tube.isAffinity && !tube.isSuperFragile ? 'selected' : ''}>Afinidad (3 Usos) 💎</option>
        <option value="super_fragile" ${tube.isAffinity && tube.isSuperFragile ? 'selected' : ''}>Volátil (1 Uso) ⚡</option>
      `;
      selectType.onchange = (e) => {
        const val = e.target.value;
        tube.isGlued = (val === 'glued');
        tube.isLocked = (val === 'lock');
        tube.isNarrow = (val === 'narrow');
        tube.isAffinity = (val === 'affinity' || val === 'super_fragile');
        tube.isFragile = tube.isAffinity;
        tube.isSuperFragile = (val === 'super_fragile');
        tube.maxCracks = tube.isAffinity ? (tube.isSuperFragile ? 1 : 3) : null;
        tube.cracks = 0;
        tube.isBroken = false;
        if (tube.isNarrow) tube.capacity = 1;
        if (tube.isAffinity) {
          tube.liquids = []; // Los frascos de afinidad siempre inician vacíos
          if (!Array.isArray(tube.allowedColors) || tube.allowedColors.length === 0) {
            const pal = this.editorLevel.palette || [];
            tube.allowedColors = [pal[0]?.hex || '#ef4444', pal[1]?.hex || '#3b82f6'];
            tube.allowedColorNames = [pal[0]?.name || 'Rojo', pal[1]?.name || 'Azul'];
          }
        }
        this.editorLevel.hasBeenPassed = false;
        this.updateEditorValidation();
        this.renderEditorTubes();
      };
      card.appendChild(selectType);

      // Selector de Colores Afines si es frasco de Afinidad
      if (tube.isAffinity) {
        const affBox = document.createElement('div');
        affBox.className = 'w-full flex flex-col gap-1 p-1 bg-purple-950/40 border border-purple-500/40 rounded-lg mt-1 text-[9px] text-purple-200';
        affBox.innerHTML = '<span class="font-bold text-center">Colores Afines:</span>';
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'flex flex-wrap gap-1 justify-center';

        const pal = this.editorLevel.palette || [];
        pal.forEach(c => {
          const isSelected = Array.isArray(tube.allowedColors) && tube.allowedColors.includes(c.hex);
          const dot = document.createElement('button');
          dot.className = `w-4 h-4 rounded-full border transition-all ${isSelected ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-40 hover:opacity-80'}`;
          dot.style.backgroundColor = c.hex;
          dot.title = c.name;
          dot.onclick = () => {
            if (!Array.isArray(tube.allowedColors)) tube.allowedColors = [];
            if (!Array.isArray(tube.allowedColorNames)) tube.allowedColorNames = [];
            const idx = tube.allowedColors.indexOf(c.hex);
            if (idx >= 0) {
              if (tube.allowedColors.length > 1) {
                tube.allowedColors.splice(idx, 1);
                tube.allowedColorNames.splice(idx, 1);
              }
            } else {
              tube.allowedColors.push(c.hex);
              tube.allowedColorNames.push(c.name);
            }
            this.renderEditorTubes();
          };
          dotsWrap.appendChild(dot);
        });
        affBox.appendChild(dotsWrap);
        card.appendChild(affBox);
      }

      // Selector de capacidad (4 Normal, 6 Gigante u 8 Súper Largo)
      if (!tube.isNarrow) {
        const capBtn = document.createElement('button');
        capBtn.className = 'text-[10px] text-slate-400 hover:text-white font-mono underline';
        const capName = tube.capacity === 8 ? '8 (Súper Largo)' : (tube.capacity === 6 ? '6 (Gigante)' : '4 (Normal)');
        capBtn.textContent = `Capacidad: ${capName} (Cambiar)`;
        capBtn.onclick = () => {
          if (tube.capacity === 4) tube.capacity = 6;
          else if (tube.capacity === 6) tube.capacity = 8;
          else tube.capacity = 4;
          while (tube.liquids.length > tube.capacity) tube.liquids.pop();
          this.editorLevel.hasBeenPassed = false;
          this.updateEditorValidation();
          this.renderEditorTubes();
        };
        card.appendChild(capBtn);
      }

      // Columna de ranuras de líquido
      const slotsContainer = document.createElement('div');
      slotsContainer.className = 'flex flex-col-reverse gap-1 items-center p-2 bg-slate-950/70 border border-slate-700 rounded-xl w-full';

      for (let s = 0; s < tube.capacity; s++) {
        const liq = tube.liquids[s];
        const slotBtn = document.createElement('button');
        slotBtn.className = 'editor-slot-btn w-full';

        if (liq) {
          slotBtn.classList.add('has-color');
          slotBtn.style.backgroundColor = liq.color;
          if (liq.isMystery) {
            slotBtn.innerHTML = "<span class='text-white font-black'>?</span>";
            slotBtn.style.backgroundColor = '#1e293b';
          } else if (liq.isChameleon) {
            slotBtn.classList.add('anim-chameleon-loop');
            slotBtn.innerHTML = "<span class='text-white font-black'>★</span>";
          } else {
            slotBtn.innerHTML = `<span style='color: ${liq.textHex || '#fff'}'>${liq.shape || '●'}</span>`;
          }
        } else {
          slotBtn.innerHTML = "<span class='text-slate-600 text-[10px]'>Vacío</span>";
        }

        slotBtn.onclick = () => {
          this.handleEditorSlotClick(tIdx, s);
        };
        slotsContainer.appendChild(slotBtn);
      }
      card.appendChild(slotsContainer);

      workspace.appendChild(card);
    });
  }

  handleEditorSlotClick(tubeIdx, slotIdx) {
    const tube = this.editorLevel.tubes[tubeIdx];
    this.editorLevel.hasBeenPassed = false;
    this.updateEditorValidation();

    if (this.activeBrush.type === 'clear') {
      if (slotIdx < tube.liquids.length) {
        tube.liquids.splice(slotIdx, 1);
      }
    } else if (this.activeBrush.type === 'mystery') {
      if (tube.liquids[slotIdx]) {
        tube.liquids[slotIdx].isMystery = !tube.liquids[slotIdx].isMystery;
      }
    } else if (this.activeBrush.type === 'chameleon') {
      tube.liquids[slotIdx] = {
        color: '#ec4899',
        name: 'Camaleón',
        shape: '★',
        isChameleon: true,
        isMystery: false
      };
    } else if (this.activeBrush.type === 'color') {
      tube.liquids[slotIdx] = {
        color: this.activeBrush.color,
        name: this.activeBrush.name,
        shape: this.activeBrush.shape,
        isMystery: false,
        isChameleon: false
      };
    }

    this.renderEditorTubes();
  }

  updateEditorValidation() {
    const badge = document.getElementById('editor-validation-badge');
    const btnPub = document.getElementById('btn-editor-publish');
    if (!badge || !btnPub) return;

    if (this.editorLevel.hasBeenPassed) {
      badge.className = 'px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40';
      badge.innerHTML = '✓ ¡NIVEL VALIDADO Y SUPERADO! Listo para publicar.';
      btnPub.disabled = false;
    } else {
      badge.className = 'px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40';
      badge.innerHTML = '⚠️ Sin validar (Debes ganar el nivel al menos una vez para publicarlo)';
      btnPub.disabled = true;
    }
  }

  testCustomLevel() {
    let totalCap = 0;
    let totalLiquids = 0;
    this.editorLevel.tubes.forEach(t => {
      totalCap += t.capacity;
      totalLiquids += t.liquids.length;
    });

    if (totalCap - totalLiquids < 1) {
      alert('Tu nivel debe tener al menos 1 espacio libre o un frasco vacío para poder realizar trasvases.');
      return;
    }

    // Validación de resolubilidad: El frasco en roca jamás puede tener un color con más unidades que su capacidad
    for (const tube of this.editorLevel.tubes) {
      if (tube.isGlued && tube.liquids.length > 0) {
        const gluedColor = tube.liquids[0].color;
        let count = 0;
        for (const t of this.editorLevel.tubes) {
          for (const l of t.liquids) {
            if (l.color === gluedColor) count++;
          }
        }
        if (count > tube.capacity) {
          alert(`⚠️ Regla de Roca Inamovible: El frasco en roca tiene un color que suma ${count} unidades en el nivel, pero el frasco solo tiene capacidad ${tube.capacity}. Como no puede verterse, este nivel sería imposible de ganar. Cambia el color o la capacidad.`);
          return;
        }
      }
    }

    const nameInput = document.getElementById('editor-level-name');
    const creatorInput = document.getElementById('editor-creator-name');
    if (nameInput) this.editorLevel.name = nameInput.value.trim() || 'Nivel Personalizado';
    if (creatorInput) this.editorLevel.creator = creatorInput.value.trim() || 'Alquimista Anónimo';

    this.closeEditorModal();

    const customLevelObj = {
      level: 999,
      tubes: JSON.parse(JSON.stringify(this.editorLevel.tubes)),
      optimalMoves: 14,
      mechanicTag: `Creación de ${this.editorLevel.creator}`,
      name: this.editorLevel.name,
      creator: this.editorLevel.creator,
      hasBeenPassed: false
    };

    this.loadLevel(1, 0, customLevelObj);
  }

  // --- NIVELES DE LA COMUNIDAD Y SISTEMA DE DIFICULTAD PROCEDURAL ---
  calculateCustomLevelDifficulty(levelData) {
    const tubes = levelData.tubes || [];
    const moves = levelData.moves || 15;

    let score = 0;
    const mechanics = [];

    // 1. Frascos totales
    const tubeCount = tubes.length;
    if (tubeCount <= 5) {
      score += 1;
    } else if (tubeCount <= 7) {
      score += 2;
    } else if (tubeCount <= 9) {
      score += 3;
    } else {
      score += 4.5;
    }
    mechanics.push(`${tubeCount} Frascos`);

    // 2. Colores distintos
    const colorSet = new Set();
    tubes.forEach(t => {
      (t.liquids || []).forEach(l => {
        if (!l.isChameleon && l.color) colorSet.add(l.color.toLowerCase());
      });
    });
    const colorCount = colorSet.size;
    if (colorCount >= 7) score += 3;
    else if (colorCount >= 5) score += 2;
    else score += 1;

    // 3. Mecánicas especiales detectadas en los frascos
    let hasGiant = false;
    let hasSuperGiant = false;
    let hasLock = false;
    let hasNarrow = false;
    let hasGlued = false;
    let hasFragile = false;
    let hasMystery = false;
    let hasChameleon = false;

    tubes.forEach(t => {
      if (t.capacity >= 8) hasSuperGiant = true;
      else if (t.capacity >= 6) hasGiant = true;
      if (t.isLocked) hasLock = true;
      if (t.isNarrow) hasNarrow = true;
      if (t.isGlued) hasGlued = true;
      if (t.isFragile || t.isAffinity) hasFragile = true;
      (t.liquids || []).forEach(l => {
        if (l.isMystery) hasMystery = true;
        if (l.isChameleon) hasChameleon = true;
      });
    });

    if (hasSuperGiant) { score += 2.5; mechanics.push('Max 8 (Titán)'); }
    else if (hasGiant) { score += 1.5; mechanics.push('Max 6'); }
    if (hasLock) { score += 2; mechanics.push('🔒 Candado'); }
    if (hasNarrow) { score += 1.5; mechanics.push('1x1 ✨'); }
    if (hasGlued) { score += 2; mechanics.push('🪨 En Roca'); }
    if (hasFragile) { score += 2; mechanics.push('🛡️ Cristal'); }
    if (hasMystery) { score += 1.5; mechanics.push('❓ Misterio'); }
    if (hasChameleon) { score += 2; mechanics.push('🌈 Camaleón'); }

    // 4. Métrica de movimientos requeridos para resolverlo
    if (moves <= 12) score += 0.5;
    else if (moves <= 20) score += 1.5;
    else if (moves <= 32) score += 2.5;
    else score += 4;

    // 5. Clasificación de dificultad
    let level = 'medium';
    let label = 'Intermedio';
    let stars = '⭐⭐';
    let colorClass = 'text-amber-300 bg-amber-500/15 border-amber-400/30';

    if (score < 4.5) {
      level = 'easy';
      label = 'Fácil';
      stars = '⭐';
      colorClass = 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30';
    } else if (score < 7.5) {
      level = 'medium';
      label = 'Intermedio';
      stars = '⭐⭐';
      colorClass = 'text-amber-300 bg-amber-500/15 border-amber-400/30';
    } else if (score < 11) {
      level = 'hard';
      label = 'Desafiante';
      stars = '⭐⭐⭐';
      colorClass = 'text-rose-300 bg-rose-500/15 border-rose-400/30';
    } else {
      level = 'master';
      label = 'Maestro Alquimista';
      stars = '👑';
      colorClass = 'text-purple-300 bg-purple-500/20 border-purple-400/40';
    }

    return {
      score,
      level,
      label,
      stars,
      colorClass,
      mechanicsSummary: mechanics.join(' • '),
      mechanics
    };
  }

  openPublishLevelModal(data) {
    if (!data || !data.tubes) return;
    this.pendingPublishLevel = data;
    const diff = this.calculateCustomLevelDifficulty(data);
    this.pendingPublishDifficulty = diff;

    const inputName = document.getElementById('publish-input-name');
    const inputCreator = document.getElementById('publish-input-creator');
    const badgeDiff = document.getElementById('publish-difficulty-badge');
    const metricMoves = document.getElementById('publish-moves-metric');
    const summaryFeatures = document.getElementById('publish-features-summary');

    if (inputName) inputName.value = data.name || 'Crisol Alquímico';
    if (inputCreator) inputCreator.value = data.creator || window.stateManager?.state?.player?.nickname || 'Alquimista Viajero';

    if (badgeDiff) {
      badgeDiff.className = `px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${diff.colorClass}`;
      badgeDiff.textContent = `${diff.stars} ${diff.label}`;
    }
    if (metricMoves) {
      metricMoves.textContent = `🎯 ${data.moves || 0} movimientos`;
    }
    if (summaryFeatures) {
      summaryFeatures.textContent = diff.mechanicsSummary;
    }

    if (this.modalPublishLevel) {
      this.showModal(this.modalPublishLevel);
      if (window.lucide) lucide.createIcons();
    }
  }

  executePublishLevel() {
    if (!this.pendingPublishLevel) return;

    const inputName = document.getElementById('publish-input-name');
    const inputCreator = document.getElementById('publish-input-creator');

    const name = inputName?.value?.trim() || this.pendingPublishLevel.name || 'Nivel de la Comunidad';
    const creator = inputCreator?.value?.trim() || this.pendingPublishLevel.creator || 'Alquimista Anónimo';
    const diff = this.pendingPublishDifficulty || this.calculateCustomLevelDifficulty(this.pendingPublishLevel);

    const levelObj = {
      id: `custom_${Date.now()}`,
      name: name,
      creator: creator,
      tubes: JSON.parse(JSON.stringify(this.pendingPublishLevel.tubes)),
      moves: this.pendingPublishLevel.moves || 15,
      createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      difficulty: diff.level,
      difficultyLabel: diff.label,
      difficultyColor: diff.colorClass,
      stars: diff.stars,
      mechanicsSummary: diff.mechanicsSummary
    };

    if (window.stateManager) {
      window.stateManager.saveCustomLevel(levelObj);

      // Recompensa al usuario: +50 Monedas por cada nivel publicado
      window.stateManager.addCoins(50);
      this.updateCoinsUI();

      // Logro: Publicar 50 niveles (Recompensa: 1000 monedas)
      const totalPublished = window.stateManager.getCustomLevels().length;
      if (window.achievementManager) {
        window.achievementManager.check('community_architect_50', totalPublished);
      }
    }

    this.hideModal(this.modalPublishLevel);
    this.pendingPublishLevel = null;

    if (window.audio) window.audio.playWinFanfare();
    this.updateCommunityBadgeCount();
    alert(`🚀 ¡Éxito! Tu nivel '${name}' ha sido publicado en la Biblioteca de la Comunidad.\n\n🪙 ¡Recompensa obtenida: +50 Monedas!`);
  }

  openCommunityLevelsModal(filter = 'all') {
    this.currentCommunityFilter = filter;
    this.updateCommunityFilterButtons();
    this.renderCommunityLevelsList();
    if (this.modalCommunityLevels) {
      this.showModal(this.modalCommunityLevels);
      if (window.lucide) lucide.createIcons();
    }
  }

  closeCommunityLevelsModal() {
    if (this.modalCommunityLevels) {
      this.hideModal(this.modalCommunityLevels);
    }
  }

  updateCommunityFilterButtons() {
    const buttons = document.querySelectorAll('#community-diff-filters-bar .btn-diff-filter');
    buttons.forEach(btn => {
      const f = btn.getAttribute('data-diff-filter');
      if (f === this.currentCommunityFilter) {
        btn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
        btn.classList.remove('bg-slate-800');
      } else {
        btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-slate-800');
      }
    });
  }

  renderCommunityLevelsList() {
    const listCont = document.getElementById('community-levels-list');
    if (!listCont) return;
    listCont.innerHTML = '';

    const defaultCommunityLevels = [
      {
        id: 'comm_default_1',
        name: 'Iniciación de Mercurio',
        creator: 'Hermes Alquimista',
        moves: 9,
        isBuiltin: true,
        difficulty: 'easy',
        difficultyLabel: 'Fácil',
        difficultyColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
        stars: '⭐',
        mechanicsSummary: '5 Frascos • Básico',
        createdAt: 'Oficial',
        tubes: [
          { id: 0, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
          { id: 1, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
          { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }] },
          { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [] },
          { id: 4, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
        ]
      },
      {
        id: 'comm_default_2',
        name: 'El Cerrojo del Zafiro',
        creator: 'Adepto Zafiro',
        moves: 21,
        isBuiltin: true,
        difficulty: 'medium',
        difficultyLabel: 'Intermedio',
        difficultyColor: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
        stars: '⭐⭐',
        mechanicsSummary: '6 Frascos • 🔒 Candado • 1x1 ✨',
        createdAt: 'Oficial',
        tubes: [
          { id: 0, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }] },
          { id: 1, capacity: 4, isLocked: true, keyColor: '#3b82f6', keyColorName: 'Azul', isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
          { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
          { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
          { id: 4, capacity: 1, isLocked: false, isNarrow: true, liquids: [] },
          { id: 5, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
        ]
      },
      {
        id: 'comm_default_3',
        name: 'La Fragua del Fénix',
        creator: 'Gran Alquimista Flamel',
        moves: 35,
        isBuiltin: true,
        difficulty: 'hard',
        difficultyLabel: 'Desafiante',
        difficultyColor: 'text-rose-300 bg-rose-500/15 border-rose-400/30',
        stars: '⭐⭐⭐',
        mechanicsSummary: '8 Frascos • Max 6 • 🔒 Candado • 🪨 En Roca',
        createdAt: 'Oficial',
        tubes: [
          { id: 0, capacity: 6, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#a855f7', name: 'Morado', shape: '◆' }] },
          { id: 1, capacity: 4, isLocked: true, keyColor: '#ef4444', keyColorName: 'Rojo', isNarrow: false, liquids: [{ color: '#a855f7', name: 'Morado', shape: '◆' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }] },
          { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#a855f7', name: 'Morado', shape: '◆', isMystery: true }, { color: '#10b981', name: 'Verde', shape: '■', isMystery: true }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
          { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#a855f7', name: 'Morado', shape: '◆' }, { color: '#10b981', name: 'Verde', shape: '■' }] },
          { id: 4, capacity: 4, isLocked: false, isNarrow: false, isGlued: true, liquids: [{ color: '#06b6d4', name: 'Cian', shape: '✚' }] },
          { id: 5, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
          { id: 6, capacity: 4, isLocked: false, isNarrow: false, liquids: [] },
          { id: 7, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
        ]
      }
    ];

    const userLevels = window.stateManager ? window.stateManager.getCustomLevels() : [];
    
    // Integrar niveles del usuario con los niveles predeterminados de la comunidad
    const allLevels = [
      ...userLevels.map(l => ({ ...l, isUser: true })),
      ...defaultCommunityLevels.filter(def => !userLevels.some(u => u.id === def.id))
    ];

    // Asegurar métricas de dificultad para cada nivel
    allLevels.forEach(lvl => {
      if (!lvl.difficulty || !lvl.difficultyLabel) {
        const diff = this.calculateCustomLevelDifficulty(lvl);
        lvl.difficulty = diff.level;
        lvl.difficultyLabel = diff.label;
        lvl.difficultyColor = diff.colorClass;
        lvl.stars = diff.stars;
        lvl.mechanicsSummary = diff.mechanicsSummary;
      }
    });

    // Filtrar según la pestaña seleccionada
    let filtered = allLevels;
    if (this.currentCommunityFilter !== 'all') {
      filtered = allLevels.filter(l => l.difficulty === this.currentCommunityFilter);
    }

    this.updateCommunityBadgeCount(userLevels.length);

    if (filtered.length === 0) {
      listCont.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs">
          No hay niveles en esta categoría de dificultad aún.
        </div>
      `;
      return;
    }

    filtered.forEach(lvl => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md hover:border-purple-500/50 transition-all';
      
      const badgeClass = lvl.difficultyColor || 'text-amber-300 bg-amber-500/15 border-amber-400/30';
      const badgeStars = lvl.stars || '⭐';
      const badgeLabel = lvl.difficultyLabel || 'Intermedio';
      const movesText = lvl.moves ? `🎯 Récord: ${lvl.moves} movs` : '🎯 Sin récord';
      const featuresText = lvl.mechanicsSummary || `${lvl.tubes?.length || 5} Frascos`;

      card.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h4 class="text-sm font-black text-white truncate max-w-[200px]">${lvl.name}</h4>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
              ${badgeStars} ${badgeLabel}
            </span>
            ${lvl.isUser ? '<span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">Tu Creación</span>' : '<span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">Oficial</span>'}
          </div>
          <p class="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Por: <strong class="text-slate-200">${lvl.creator}</strong></span>
            <span>•</span>
            <span class="font-mono text-sky-300 font-bold">${movesText}</span>
          </p>
          <p class="text-[10px] text-purple-300/90 font-medium mt-0.5 truncate">
            ${featuresText}
          </p>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button class="btn-interactive px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md" onclick="window.game.playPublishedCustomLevel('${lvl.id}')">
            <i data-lucide="play" class="w-3.5 h-3.5 fill-white"></i>
            <span>Jugar</span>
          </button>
          ${lvl.isUser ? `
            <button class="btn-interactive p-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs transition-colors" title="Eliminar nivel" onclick="window.game.deletePublishedCustomLevel('${lvl.id}')">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      `;
      listCont.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  updateCommunityBadgeCount(count = null) {
    const badge = document.getElementById('lbl-community-levels-badge');
    if (!badge) return;
    const total = count !== null ? count : (window.stateManager ? window.stateManager.getCustomLevels().length : 0);
    badge.textContent = `${total} Creado${total === 1 ? '' : 's'}`;
  }

  playPublishedCustomLevel(id) {
    const userLevels = window.stateManager ? window.stateManager.getCustomLevels() : [];
    let found = userLevels.find(l => l.id === id);
    if (!found) {
      const defaultCommunityLevels = [
        {
          id: 'comm_default_1',
          name: 'Iniciación de Mercurio',
          creator: 'Hermes Alquimista',
          moves: 9,
          tubes: [
            { id: 0, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
            { id: 1, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
            { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }] },
            { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [] },
            { id: 4, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
          ]
        },
        {
          id: 'comm_default_2',
          name: 'El Cerrojo del Zafiro',
          creator: 'Adepto Zafiro',
          moves: 21,
          tubes: [
            { id: 0, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }] },
            { id: 1, capacity: 4, isLocked: true, keyColor: '#3b82f6', keyColorName: 'Azul', isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
            { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
            { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
            { id: 4, capacity: 1, isLocked: false, isNarrow: true, liquids: [] },
            { id: 5, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
          ]
        },
        {
          id: 'comm_default_3',
          name: 'La Fragua del Fénix',
          creator: 'Gran Alquimista Flamel',
          moves: 35,
          tubes: [
            { id: 0, capacity: 6, isLocked: false, isNarrow: false, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#ef4444', name: 'Rojo', shape: '●' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#a855f7', name: 'Morado', shape: '◆' }] },
            { id: 1, capacity: 4, isLocked: true, keyColor: '#ef4444', keyColorName: 'Rojo', isNarrow: false, liquids: [{ color: '#a855f7', name: 'Morado', shape: '◆' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#10b981', name: 'Verde', shape: '■' }, { color: '#eab308', name: 'Amarillo', shape: '★' }] },
            { id: 2, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#a855f7', name: 'Morado', shape: '◆', isMystery: true }, { color: '#10b981', name: 'Verde', shape: '■', isMystery: true }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#3b82f6', name: 'Azul', shape: '▲' }] },
            { id: 3, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲' }, { color: '#eab308', name: 'Amarillo', shape: '★' }, { color: '#a855f7', name: 'Morado', shape: '◆' }, { color: '#10b981', name: 'Verde', shape: '■' }] },
            { id: 4, capacity: 4, isLocked: false, isNarrow: false, isGlued: true, liquids: [{ color: '#06b6d4', name: 'Cian', shape: '✚' }] },
            { id: 5, capacity: 4, isLocked: false, isNarrow: false, liquids: [{ color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#06b6d4', name: 'Cian', shape: '✚' }, { color: '#ef4444', name: 'Rojo', shape: '●' }] },
            { id: 6, capacity: 4, isLocked: false, isNarrow: false, liquids: [] },
            { id: 7, capacity: 4, isLocked: false, isNarrow: false, liquids: [] }
          ]
        }
      ];
      found = defaultCommunityLevels.find(l => l.id === id);
    }
    if (!found) return;

    this.closeCommunityLevelsModal();
    this.closeExtrasModal();
    if (this.modalEditor) this.closeEditorModal();

    const customData = {
      level: 999,
      isCommunityPlay: true,
      tubes: JSON.parse(JSON.stringify(found.tubes)),
      optimalMoves: found.moves || 15,
      mechanicTag: `Comunidad • ${found.creator}`,
      name: found.name,
      creator: found.creator
    };
    this.loadLevel(1, 0, customData);
  }

  deletePublishedCustomLevel(id) {
    if (confirm('¿Deseas eliminar este nivel personalizado de tu biblioteca?')) {
      if (window.stateManager) {
        window.stateManager.deleteCustomLevel(id);
        this.renderCommunityLevelsList();
        this.renderSavedCustomLevels();
        this.updateCommunityBadgeCount();
      }
    }
  }

  publishCustomLevel() {
    this.openPublishLevelModal({
      tubes: this.editorLevel.tubes,
      moves: 12,
      name: this.editorLevel.name,
      creator: this.editorLevel.creator
    });
  }

  renderSavedCustomLevels() {
    this.renderCommunityLevelsList();
  }

  // --- DESAFÍOS DE HONOR DE SECCIÓN Y MEDALLAS DE MAESTRÍA ---
  startHonorChallenge(sectionId, seedVariation = 0, bypassUnlock = false) {
    if (!window.HonorManager || !window.stateManager) return;

    const sec = window.HonorManager.getSection(sectionId);
    if (!sec) return;

    // 1. Verificar si está desbloqueado (3 estrellas y desafíos en toda la sección)
    const unlockStatus = window.HonorManager.checkSectionUnlockStatus(sectionId, bypassUnlock);
    if (!unlockStatus.unlocked) {
      const missingStarsStr = unlockStatus.missingStars.length > 0
        ? `Niveles sin 3★: ${unlockStatus.missingStars.join(', ')}`
        : '';
      const missingChalStr = unlockStatus.missingChallenges.length > 0
        ? `Niveles con desafíos pendientes: ${unlockStatus.missingChallenges.join(', ')}`
        : '';
      alert(`⚔️ Este Desafío de Honor está bloqueado.\n\nPara desbloquearlo debes completar con 3 estrellas y todos los desafíos los Niveles ${sec.levelsRange[0]} a ${sec.levelsRange[1]}.\n\n${missingStarsStr}\n${missingChalStr}`);
      return;
    }

    // 2. Verificar vidas de honor y bloqueo diario
    const honorState = window.stateManager.getHonorChallengeState(sectionId);
    if (!honorState.canPlayToday) {
      alert(`⏳ Has agotado tus 3 vidas en este Desafío de Honor por el día de hoy.\n\nPuedes continuar con los niveles ordinarios sin problemas. El desafío volverá a estar disponible mañana a medianoche con 3 nuevas vidas.`);
      return;
    }

    // 3. Cerrar modales abiertos
    const modals = [this.modalMap, this.modalVictory, this.modalRoulette, this.modalLeaderboard, this.modalSettings, this.modalHome, this.modalShop, this.modalHonorVictory, this.modalHonorDefeat];
    modals.forEach(m => m && this.hideModal(m));

    // 4. Configurar estado de Modo de Honor
    this.isHonorMode = true;
    this.honorSectionId = sectionId;
    this.seedVariation = seedVariation;
    this.moves = 0;
    this.moveHistory = [];
    this.selectedTubeIndex = null;
    this.lastInvalidTargetIdx = null;
    this.extraTubesUsed = 0;
    this.activeHint = null;
    this.hintsUsedInLevel = 0;
    this.isPouringAnimation = false;

    // 5. Generar nivel de honor
    this.levelData = window.HonorManager.generateHonorLevel(sectionId, seedVariation);
    this.tubes = JSON.parse(JSON.stringify(this.levelData.tubes));
    this.customLevelTesting = null;
    this.levelChallenges = [];

    this.honorMovesLimit = this.levelData.maxMoves;
    this.honorMovesRemaining = this.levelData.maxMoves;
    this.honorTimeRemaining = this.levelData.timeLimitSecs || 300;

    // 6. Detener timer estándar y arrancar cronómetro regresivo de 5 minutos
    if (window.leaderboardManager) {
      window.leaderboardManager.stopTimer();
    }
    this.startHonorTimer(this.honorTimeRemaining);

    // 7. Audio y música
    if (window.audio) {
      window.audio.playMusic('level');
      window.audio.playReveal();
    }

    // 8. Renderizar UI
    this.updateHeaderUI();
    this.updateMovesUI();
    this.renderTubes();
    this.updateButtonsUI();
    this.renderChallengesHUD();
    this.updateLivesHUD();

    const boardWrap = document.getElementById('game-board-container') || document.body;
    if (boardWrap) boardWrap.classList.add('honor-hud-active');
  }

  startHonorTimer(totalSecs = 300) {
    this.stopHonorTimer();
    this.honorTimeRemaining = totalSecs;
    this.updateHonorTimerDisplay();

    this.honorTimerInterval = setInterval(() => {
      this.honorTimeRemaining--;
      this.updateHonorTimerDisplay();

      if (this.honorTimeRemaining <= 30 && this.honorTimeRemaining > 0) {
        if (window.audio && typeof window.audio.playHonorTimerTick === 'function') {
          window.audio.playHonorTimerTick();
        }
      }

      if (this.honorTimeRemaining <= 0) {
        this.stopHonorTimer();
        this.handleHonorDefeat('time');
      }
    }, 1000);
  }

  stopHonorTimer() {
    if (this.honorTimerInterval) {
      clearInterval(this.honorTimerInterval);
      this.honorTimerInterval = null;
    }
    if (this.lblTimer) {
      this.lblTimer.classList.remove('timer-countdown-warning');
    }
    const boardWrap = document.getElementById('game-board-container') || document.body;
    if (boardWrap) boardWrap.classList.remove('honor-hud-active');
  }

  updateHonorTimerDisplay() {
    if (!this.lblTimer) return;
    const s = Math.max(0, this.honorTimeRemaining);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    this.lblTimer.textContent = `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    if (s <= 60) {
      this.lblTimer.classList.add('timer-countdown-warning');
    } else {
      this.lblTimer.classList.remove('timer-countdown-warning');
    }
  }

  handleHonorDefeat(reason = 'moves') {
    this.stopHonorTimer();
    if (window.audio) window.audio.playChallengeFail();

    const remainingLives = window.stateManager
      ? window.stateManager.consumeHonorLife(this.honorSectionId)
      : 0;

    const modal = document.getElementById('modal-honor-defeat');
    const reasonEl = document.getElementById('honor-defeat-reason');
    const livesDisp = document.getElementById('honor-defeat-lives-display');
    const subtextEl = document.getElementById('honor-defeat-subtext');
    const actionsRetry = document.getElementById('honor-defeat-actions-retry');
    const actionsLocked = document.getElementById('honor-defeat-actions-locked');

    if (reasonEl) {
      if (reason === 'moves') {
        reasonEl.textContent = `Has superado los ${this.honorMovesLimit} movimientos permitidos para este desafío.`;
      } else {
        reasonEl.textContent = 'El tiempo límite de 5 minutos (05:00) ha expirado.';
      }
    }

    if (livesDisp) {
      let heartsHtml = '';
      for (let i = 0; i < 3; i++) {
        heartsHtml += (i < remainingLives) ? '<span class="text-rose-500">❤️</span>' : '<span class="text-slate-600">🖤</span>';
      }
      livesDisp.innerHTML = heartsHtml;
    }

    if (remainingLives > 0) {
      if (actionsRetry) actionsRetry.classList.remove('hidden');
      if (actionsLocked) actionsLocked.classList.add('hidden');
      if (subtextEl) {
        subtextEl.textContent = `Te quedan ${remainingLives} vidas de honor para este desafío hoy.`;
        subtextEl.className = 'text-xs font-bold text-amber-300 mt-1';
      }
    } else {
      if (actionsRetry) actionsRetry.classList.add('hidden');
      if (actionsLocked) actionsLocked.classList.remove('hidden');
      if (subtextEl) {
        subtextEl.textContent = 'Has agotado las 3 vidas para este desafío hoy. Podrás volver a intentarlo mañana a medianoche con 3 nuevas vidas.';
        subtextEl.className = 'text-xs font-bold text-rose-400 mt-1';
      }
    }

    if (modal) this.showModal(modal);
    if (window.lucide) lucide.createIcons();
  }

  handleHonorVictory() {
    this.stopHonorTimer();

    const sec = window.HonorManager ? window.HonorManager.getSection(this.honorSectionId) : null;
    if (!sec) return;

    if (window.stateManager) {
      window.stateManager.awardHonorMedal(this.honorSectionId);
    }
    const rewardCoins = this.levelData.coinsReward || 50;
    this.addCoins(rewardCoins);

    // Calcular combo consecutivo en Honor (desde posición 1 / índice 0)
    let honorConsecutive = 0;
    for (let i = 0; i < this.tubes.length; i++) {
      const t = this.tubes[i];
      if (t.liquids.length === 0 || !this.isTubeComplete(t, { allowChameleon: true })) break;
      honorConsecutive++;
    }
    const honorCombo = honorConsecutive >= 2 ? honorConsecutive : 0;

    // Animación de corchos y combo
    const allHonorWrappers = this.tubesGrid.children;
    this.tubes.forEach((t, i) => {
      setTimeout(() => {
        const cork = document.getElementById(`cork-${i}`);
        const wrapper = allHonorWrappers[i];
        if (cork && t.liquids.length > 0) {
          cork.classList.add('sealed');
          if (window.audio) window.audio.playComboTone(i + 1);

          if (wrapper && honorCombo >= 2 && i < honorCombo) {
            const badge = document.createElement('div');
            badge.className = 'combo-pill-badge';
            badge.innerHTML = `<span>Combo x${i + 1} ⭐</span>`;
            wrapper.appendChild(badge);
          }
        }
      }, i * 220);
    });

    const elapsed = 300 - this.honorTimeRemaining;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const st = window.stateManager ? window.stateManager.getHonorChallengeState(this.honorSectionId) : { lives: 3 };

    setTimeout(() => {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 } });
          confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 } });
        }, 300);
      }
      if (window.audio && typeof window.audio.playHonorVictory === 'function') {
        window.audio.playHonorVictory();
      } else if (window.audio) {
        window.audio.playWinFanfare();
      }

      const modal = document.getElementById('modal-honor-victory');
      const secNameEl = document.getElementById('honor-vic-section');
      const timeEl = document.getElementById('honor-vic-time');
      const movesEl = document.getElementById('honor-vic-moves');
      const livesEl = document.getElementById('honor-vic-lives');
      const coinsEl = document.getElementById('honor-vic-coins');

      if (secNameEl) secNameEl.textContent = `Sección ${sec.id}: ${sec.name} (${sec.mechanicTitle})`;
      if (timeEl) timeEl.textContent = timeFormatted;
      if (movesEl) movesEl.textContent = `${this.moves} / ${this.honorMovesLimit} max`;
      if (livesEl) livesEl.textContent = `${st.lives}/3 ❤️ conservadas`;
      if (coinsEl) coinsEl.textContent = `+${rewardCoins} 🪙`;

      // Desbloqueo de cinemática de historia por victoria de Desafío de Honor
      let isNewCinematic = false;
      let unlockedChapterIndex = null;
      if (this.honorSectionId >= 1 && this.honorSectionId <= 10) {
        unlockedChapterIndex = this.honorSectionId - 1;
        if (window.stateManager) {
          isNewCinematic = window.stateManager.unlockStoryChapter(unlockedChapterIndex);
        }
      }
      this.pendingHonorCinematicIndex = (isNewCinematic || (unlockedChapterIndex !== null && window.stateManager?.isStoryChapterUnlocked(unlockedChapterIndex)))
        ? unlockedChapterIndex
        : null;

      const cinematicBox = document.getElementById('honor-vic-cinematic-box');
      const cinematicTag = document.getElementById('honor-vic-cinematic-ch-tag');
      if (cinematicBox) {
        if (this.pendingHonorCinematicIndex !== null) {
          if (cinematicTag) cinematicTag.textContent = `Capítulo ${this.pendingHonorCinematicIndex + 1}`;
          cinematicBox.classList.remove('hidden');
        } else {
          cinematicBox.classList.add('hidden');
        }
      }

      if (modal) this.showModal(modal);
      if (window.lucide) lucide.createIcons();
    }, this.tubes.length * 220 + 350);
  }

  // --- MAPA DE NIVELES ORGANIZADO EN 10 SECCIONES Y MEDALLAS DE HONOR ---
  openMapModal() {
    const levelsGrid = document.getElementById('levels-grid');
    if (!levelsGrid) return;
    levelsGrid.innerHTML = '';

    // El estandarte de honor SOLO debe verse al completar todos los 100 niveles con estrellas
    const hasCompletedAll100 = this.hasAllLevelsAtLeastOneStar();
    if (window.stateManager) {
      window.stateManager.state.progress.hasCompletedAll100 = hasCompletedAll100;
      window.stateManager.saveState();
    }

    if (hasCompletedAll100) {
      const completionBanner = document.createElement('div');
      completionBanner.className = 'w-full mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-500/25 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-left';
      completionBanner.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl shadow-md text-slate-950">
            👑
          </div>
          <div>
            <h4 class="text-sm font-black text-amber-300 uppercase tracking-wide">¡Supremo Gran Maestro Alquimista!</h4>
            <p class="text-xs text-slate-200">Has conquistado todos los niveles de la campaña principal.</p>
          </div>
        </div>
        <button id="btn-reopen-completion-banner" class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs shadow-md transition-all whitespace-nowrap">
          Ver Decreto de Consagración 📜
        </button>
      `;
      levelsGrid.appendChild(completionBanner);

      setTimeout(() => {
        const btnReopen = document.getElementById('btn-reopen-completion-banner');
        if (btnReopen) {
          btnReopen.onclick = () => {
            const mapModal = document.getElementById('modal-levels');
            if (mapModal) mapModal.classList.add('hidden');
            this.showGameCompletionModal();
          };
        }
      }, 0);
    }

    const sections = window.HonorManager ? window.HonorManager.getSections() : [];
    sections.forEach(sec => {
      const [startLvl, endLvl] = sec.levelsRange;

      // Sección 1 siempre visible. Sección K solo visible si el último nivel de la sección anterior está superado:
      const isSectionVisible = (sec.id === 1) || this.isLevelUnlocked(startLvl);
      if (!isSectionVisible) {
        return; // Ocultar secciones futuras: permanecen secretas e invisibles hasta que se completen las anteriores
      }

      const unlockStatus = window.HonorManager.checkSectionUnlockStatus(sec.id);
      const honorState = window.stateManager ? window.stateManager.getHonorChallengeState(sec.id) : { completed: false, lives: 3, canPlayToday: true };

      // Contar estrellas obtenidas en esta sección
      let sectionStarsEarned = 0;
      for (let lvl = startLvl; lvl <= endLvl; lvl++) {
        const rec = window.leaderboardManager ? window.leaderboardManager.getRecord(lvl) : null;
        if (rec) sectionStarsEarned += rec.stars;
      }
      const totalStarsPossible = (endLvl - startLvl + 1) * 3;

      const card = document.createElement('div');
      card.className = `section-map-card ${honorState.completed ? 'is-medal-won' : (unlockStatus.unlocked ? 'is-unlocked-honor' : '')}`;

      // Header de la Sección
      let medalBadgeHtml = '';
      if (honorState.completed) {
        medalBadgeHtml = `
          <span class="flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/50 px-2.5 py-1 rounded-full shadow-md shadow-amber-500/20">
            🏅 Medalla Ganada
          </span>
        `;
      } else if (unlockStatus.unlocked && honorState.canPlayToday) {
        medalBadgeHtml = `
          <span class="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-full animate-pulse">
            ⚔️ Desafío Listo
          </span>
        `;
      } else if (!honorState.canPlayToday) {
        medalBadgeHtml = `
          <span class="text-[10px] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full font-bold">
            ⏳ Vidas Agotadas
          </span>
        `;
      } else {
        medalBadgeHtml = `
          <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
            <i data-lucide="lock" class="w-3 h-3 text-slate-500"></i>
            <span>Desafío Bloqueado</span>
          </span>
        `;
      }

      card.innerHTML = `
        <div class="section-header-title">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 text-sm font-black">
              ${sec.id}
            </div>
            <div>
              <h3 class="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>${sec.name}</span>
                <span class="text-[10px] text-sky-400 font-mono font-normal">Niveles ${startLvl}-${endLvl}</span>
              </h3>
              <p class="text-[11px] text-slate-400">${sec.mechanicTitle}</p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
            <div class="flex items-center gap-2 text-[11px] text-slate-300">
              <span class="flex items-center gap-1 text-amber-300 font-bold" title="Estrellas en la sección">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400 text-amber-400"></i>
                <span>${sectionStarsEarned}/${totalStarsPossible}</span>
              </span>
              <span class="flex items-center gap-1 text-purple-300 font-bold" title="Niveles con todos los desafíos completados">
                <i data-lucide="target" class="w-3 h-3 text-purple-400"></i>
                <span>${unlockStatus.levelsCompletedWithAllChallenges}/${unlockStatus.totalLevels}</span>
              </span>
            </div>
            ${medalBadgeHtml}
          </div>
        </div>
      `;

      // Grilla de niveles de esta sección (10 niveles)
      const secGrid = document.createElement('div');
      secGrid.className = 'grid grid-cols-5 sm:grid-cols-10 gap-2 mb-2';

      for (let i = startLvl; i <= endLvl; i++) {
        const isUnlocked = this.isLevelUnlocked(i);
        const rec = window.leaderboardManager ? window.leaderboardManager.getRecord(i) : null;
        const chalRec = window.stateManager ? window.stateManager.getLevelChallenges(i) : null;
        const isCurrent = (i === this.currentLevel && !this.isHonorMode);
        const isDone = !!rec;

        const btn = document.createElement('button');
        const currentLives = window.stateManager ? window.stateManager.getLives() : 3;

        if (!isUnlocked) {
          btn.className = 'p-2 rounded-xl text-xs font-bold bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50 flex flex-col items-center justify-center gap-0.5';
          btn.innerHTML = `
            <span class="text-xs font-bold text-slate-500">${i}</span>
            <span class="text-[9px] text-slate-600">🔒</span>
          `;
          this.bindTapOrClick(btn, () => {
            if (window.audio) window.audio.playFailSound();
            alert(`El Nivel ${i} está bloqueado. Supera el Nivel ${i - 1} primero.`);
          });
        } else if (currentLives <= 0) {
          // Bloqueado por falta de vidas: mostrar candado y corazón roto (🔒💔)
          btn.className = 'p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 relative bg-slate-900/80 text-rose-400 border border-rose-500/30 hover:border-rose-500/70 shadow-inner cursor-pointer';
          btn.innerHTML = `
            <span class="text-xs font-bold text-slate-400">${i}</span>
            <span class="text-[9px] leading-none" title="Sin vidas disponibles">🔒💔</span>
          `;
          this.bindTapOrClick(btn, () => {
            if (window.audio) window.audio.playFailSound();
            btn.classList.remove('map-level-fail-shake');
            void btn.offsetWidth; // forzar reflow para reiniciar animación
            btn.classList.add('map-level-fail-shake');
            setTimeout(() => btn.classList.remove('map-level-fail-shake'), 650);
            this.showNoLivesMapModal();
          });
        } else {
          btn.className = `p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 relative ${
            isCurrent
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-300 scale-105 z-10'
              : isDone
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/60'
          }`;

          let starIcon = isDone ? '★'.repeat(rec.stars) : '•';
          const hasAllChal = chalRec && chalRec.completedCount >= chalRec.totalCount;

          btn.innerHTML = `
            <span class="text-xs font-black">${i}</span>
            <span class="text-[9px] text-amber-400 leading-none">${starIcon}</span>
            ${hasAllChal ? '<span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-sm" title="Desafíos completados"></span>' : ''}
          `;

          this.bindTapOrClick(btn, () => {
            if (this.modalMap) this.hideModal(this.modalMap);
            if (window.audio) window.audio.playMusic('level');
            this.isHonorMode = false;
            this.loadLevel(i);
          });
        }

        secGrid.appendChild(btn);
      }
      card.appendChild(secGrid);

      // Tarjeta de Desafío de Honor de la sección
      const honorCard = document.createElement('div');
      if (honorState.completed) {
        honorCard.className = 'honor-challenge-card state-completed';
        honorCard.innerHTML = `
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 text-lg shadow-md">
              🏅
            </div>
            <div>
              <h4 class="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>Medalla de Honor: ${sec.honorChallenge.title}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">CONSEGUIDA</span>
              </h4>
              <p class="text-[11px] text-slate-300">${sec.honorChallenge.desc}</p>
            </div>
          </div>
          <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40" onclick="window.game.startHonorChallenge(${sec.id})">
            Repetir Desafío
          </button>
        `;
      } else if (unlockStatus.unlocked) {
        if (honorState.canPlayToday) {
          honorCard.className = 'honor-challenge-card state-ready';
          honorCard.innerHTML = `
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 text-lg shadow-md animate-bounce">
                ⚔️
              </div>
              <div>
                <h4 class="text-xs font-black text-white flex items-center gap-1.5">
                  <span>${sec.honorChallenge.title}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">${honorState.lives}/3 ❤️</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">5:00</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">${sec.honorChallenge.maxMoves} movs</span>
                </h4>
                <p class="text-[11px] text-amber-100/90">${sec.honorChallenge.desc}</p>
              </div>
            </div>
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 flex items-center gap-1.5" onclick="window.game.startHonorChallenge(${sec.id})">
              <span>Jugar Desafío</span>
              <span class="text-[10px] bg-slate-950/20 px-1 rounded font-mono">+${sec.honorChallenge.coinsReward}🪙</span>
            </button>
          `;
        } else {
          honorCard.className = 'honor-challenge-card state-failed-today';
          honorCard.innerHTML = `
            <div class="flex items-center gap-2.5 text-xs text-slate-400">
              <span class="text-lg">⏳</span>
              <div>
                <span class="font-bold text-rose-300">3 Vidas de honor agotadas por hoy</span>
                <p class="text-[11px] text-slate-400">Podrás volver a intentar la Medalla de Honor mañana a medianoche con 3 nuevas vidas.</p>
              </div>
            </div>
          `;
        }
      } else {
        honorCard.className = 'honor-challenge-card state-locked';
        const missingStarsCount = unlockStatus.missingStars.length;
        const missingChallengesCount = unlockStatus.missingChallenges.length;
        honorCard.innerHTML = `
          <div class="flex items-center gap-2.5 text-xs text-slate-400">
            <i data-lucide="lock" class="w-4 h-4 text-slate-500"></i>
            <div>
              <span class="font-bold text-slate-300">Desafío de Honor Bloqueado</span>
              <p class="text-[11px] text-slate-400">
                Completa con 3★ y todos los desafíos los Niveles ${startLvl}-${endLvl}.
                <span class="text-amber-400 font-medium">(Faltan: ${missingStarsCount > 0 ? `${missingStarsCount} con 3★` : ''}${missingStarsCount > 0 && missingChallengesCount > 0 ? ', ' : ''}${missingChallengesCount > 0 ? `${missingChallengesCount} desafíos` : ''})</span>
              </p>
            </div>
          </div>
        `;
      }
      card.appendChild(honorCard);

      levelsGrid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
    if (this.modalMap) this.showModal(this.modalMap);
  }

  // --- MODAL DE GRAN CONSAGRACIÓN Y FELICITACIONES (100 NIVELES) ---
  showGameCompletionModal() {
    const modal = document.getElementById('modal-completion');
    if (!modal) return;

    const hasAllStars = this.hasAllLevelsAtLeastOneStar();
    if (window.stateManager) {
      if (hasAllStars) {
        window.stateManager.state.progress.hasCompletedAll100 = true;
        // Recompensa de 999.999.999 monedas por consagración de campaña (si no se reclamó)
        const lblCoins = document.getElementById('completion-coins-award-lbl');
        if (!window.stateManager.state.progress.all100BonusClaimed) {
          window.stateManager.state.progress.all100BonusClaimed = true;
          this.addCoins(999999999);
          if (lblCoins) lblCoins.textContent = '✓ ¡+999.999.999 🪙 Monedas Otorgadas!';
        } else {
          if (lblCoins) lblCoins.textContent = '✓ Recompensa de +999.999.999 🪙 ya reclamada';
        }
      } else {
        window.stateManager.state.progress.hasCompletedAll100 = false;
        const lblCoins = document.getElementById('completion-coins-award-lbl');
        if (lblCoins) lblCoins.textContent = '🔒 Requiere completar los 100 niveles con ★';
      }
      window.stateManager.saveState();
    }

    const endingTheater = document.getElementById('completion-ending-theater');
    const lockedNotice = document.getElementById('completion-epilogue-locked-notice');

    // Calcular estadísticas totales de la campaña
    const stats = (window.leaderboardManager && typeof window.leaderboardManager.getStats === 'function')
      ? window.leaderboardManager.getStats()
      : ((window.leaderboardManager && typeof window.leaderboardManager.getGlobalStats === 'function')
          ? window.leaderboardManager.getGlobalStats()
          : { totalStars: 0, totalScore: 0 });
    
    const totalStars = stats.totalStars || 0;
    const totalPossibleStars = 300;
    const starRatio = totalStars / totalPossibleStars;
    const starPct = (starRatio * 100).toFixed(1);

    const starsEl = document.getElementById('completion-total-stars');
    if (starsEl) starsEl.textContent = `${totalStars} / ${totalPossibleStars} ⭐ (${starPct}%)`;

    // Contar medallas de honor ganadas
    let honorMedalsCount = 0;
    if (window.stateManager && window.stateManager.state.progress.honorMastery) {
      const mastery = window.stateManager.state.progress.honorMastery;
      Object.keys(mastery).forEach(secId => {
        if (mastery[secId] && mastery[secId].completed) honorMedalsCount++;
      });
    }
    const honorEl = document.getElementById('completion-honor-medals');
    if (honorEl) honorEl.textContent = `${honorMedalsCount} / 10 🏅`;

    if (!hasAllStars) {
      if (endingTheater) endingTheater.classList.add('hidden');
      if (lockedNotice) lockedNotice.classList.remove('hidden');
    } else {
      if (lockedNotice) lockedNotice.classList.add('hidden');
      if (endingTheater) endingTheater.classList.remove('hidden');

      // Regla de Epílogo:
      // < 50% estrellas: Final Malo
      // 50% a 99% estrellas: Final Normal / Regular
      // 100% estrellas (300/300): Final Bueno
      let autoEnding = 'bad';
      if (totalStars >= 300) {
        autoEnding = 'good';
      } else if (starRatio >= 0.50) {
        autoEnding = 'regular';
      } else {
        autoEnding = 'bad';
      }
      this.renderEndingCinematic(autoEnding, stats.totalScore || 0);
    }

    // Comprobar si el gran Easter Egg del Final Especial de Naza está desbloqueado
    const btnEndingSecret = document.getElementById('btn-ending-secret');
    if (btnEndingSecret) {
      if (window.stateManager && window.stateManager.isSecretEndingUnlocked()) {
        btnEndingSecret.classList.remove('hidden');
      } else {
        btnEndingSecret.classList.add('hidden');
      }
    }

    // Gran torrente de fuegos artificiales de confeti
    if (typeof confetti === 'function') {
      const end = Date.now() + 4500;
      const colors = ['#f59e0b', '#fde047', '#38bdf8', '#a855f7', '#ec4899', '#10b981', '#ffffff'];
      (function frame() {
        confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0 }, colors: colors });
        confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1 }, colors: colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }

    if (window.audio) {
      window.audio.playWinFanfare();
      setTimeout(() => window.audio.playCrowdCheer(), 450);
    }

    if (window.lucide) lucide.createIcons();
    this.showModal(modal);
  }

  // --- RENDER DE CINEMÁTICAS CÓMICAS DE FINAL (MALO / REGULAR / BUENO CON GIRO) ---
  renderEndingCinematic(endingType, forcedScore = null) {
    const stats = (window.leaderboardManager && typeof window.leaderboardManager.getStats === 'function')
      ? window.leaderboardManager.getStats()
      : ((window.leaderboardManager && typeof window.leaderboardManager.getGlobalStats === 'function')
          ? window.leaderboardManager.getGlobalStats()
          : { totalStars: 0, totalScore: 0 });
    const scoreVal = forcedScore !== null ? forcedScore : (stats.totalScore || 0);

    const endingBadge = document.getElementById('ending-badge');
    const endingScoreLbl = document.getElementById('ending-score-lbl');
    const endingTitle = document.getElementById('ending-title');
    const endingDesc = document.getElementById('ending-desc');
    const endingLooper = document.getElementById('ending-looper-container');
    const btnBad = document.getElementById('btn-ending-bad');
    const btnReg = document.getElementById('btn-ending-regular');
    const btnGood = document.getElementById('btn-ending-good');

    if (endingScoreLbl) {
      endingScoreLbl.textContent = `Puntaje Total: ${scoreVal.toLocaleString()} pts (${stats.totalStars || 0}★)`;
    }

    // Limpiar temporizador previo del giro inesperado si estaba activo
    if (this._endingTwistTimer) {
      clearTimeout(this._endingTwistTimer);
      this._endingTwistTimer = null;
    }
    document.body.classList.remove('screen-apocalypse-rumble');

    // Estilos de botones activos
    const updateActiveBtn = (activeBtn) => {
      [btnBad, btnReg, btnGood].forEach(b => {
        if (!b) return;
        b.classList.remove('ring-2', 'ring-white', 'scale-105');
      });
      if (activeBtn) activeBtn.classList.add('ring-2', 'ring-white', 'scale-105');
    };

    if (endingType === 'bad') {
      updateActiveBtn(btnBad);
      if (endingBadge) {
        endingBadge.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black';
        endingBadge.textContent = '💥 FINAL MALO • RANGO ALQUÍMICO C';
      }
      if (endingTitle) {
        endingTitle.className = 'text-sm sm:text-base font-black text-rose-300 mb-1.5 flex items-center gap-1.5';
        endingTitle.innerHTML = '<span>💥 La Pifia Alquímica (Tu Laboratorio Vuela por los Aires)</span>';
      }
      if (endingDesc) {
        endingDesc.innerHTML = 'Tu fórmula molecular fue tan inestable que el laboratorio entero se convirtió en fuegos artificiales. Tu póliza de seguro no cubre <em>"negligencia por combinación de fluidos prohibidos"</em>.<br><strong class="text-rose-400">¡Al menos no te explotó el planeta entero!</strong>';
      }
      if (endingLooper) {
        endingLooper.innerHTML = this.getBadEndingSvg();
      }
      if (window.audio && typeof window.audio.playLabExplosion === 'function') {
        window.audio.playLabExplosion();
      }
    } else if (endingType === 'regular') {
      updateActiveBtn(btnReg);
      if (endingBadge) {
        endingBadge.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black';
        endingBadge.textContent = '🍌 FINAL REGULAR • RANGO ALQUÍMICO B';
      }
      if (endingTitle) {
        endingTitle.className = 'text-sm sm:text-base font-black text-amber-300 mb-1.5 flex items-center gap-1.5';
        endingTitle.innerHTML = '<span>🍌 La Cura Milagrosa... con Platanofobia Extrema</span>';
      }
      if (endingDesc) {
        endingDesc.innerHTML = '¡Creaste el fertilizante más vigoroso de la historia y el laboratorio floreció con exuberancia vegetal! El único problema: resultó ser una cepa hiperactiva de plátanos mutantes... y descubriste de la peor manera tu alergia severa al plátano.<br><strong class="text-amber-300">¡¡ACHÍÍÍS!! 🤧 ¡SOY ALÉRGICO!</strong>';
      }
      if (endingLooper) {
        endingLooper.innerHTML = this.getRegularEndingSvg();
      }
      if (window.audio && typeof window.audio.playBananaSneeze === 'function') {
        window.audio.playBananaSneeze();
      }
    } else if (endingType === 'good') {
      updateActiveBtn(btnGood);
      // FASE 1: Dejar al usuario creer que es el final feliz de prosperidad absoluta
      if (endingBadge) {
        endingBadge.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-black animate-pulse';
        endingBadge.textContent = '🌟 FINAL BUENO • SUPREMO MAESTRO ALQUIMISTA 🌟';
      }
      if (endingTitle) {
        endingTitle.className = 'text-sm sm:text-base font-black text-emerald-300 mb-1.5 flex items-center gap-1.5';
        endingTitle.innerHTML = '<span>💰 ¡Árboles de Oro Infinito y Prosperidad Suprema!</span>';
      }
      if (endingDesc) {
        endingDesc.innerHTML = '¡La Gran Obra Alquímica ha triunfado! De la tierra brotan majestuosos árboles dorados con monedas y cofres de gemas relucientes. ¡Riqueza y abundancia incalculable para toda la eternidad!...';
      }
      if (endingLooper) {
        endingLooper.innerHTML = this.getGoodEndingMoneyTreeSvg();
      }
      if (window.audio) {
        window.audio.playWinFanfare();
      }

      // FASE 2: GIRO INESPERADO TRAS 3.6 SEGUNDOS (¡PERO EXPLOTA EL MUNDO!)
      this._endingTwistTimer = setTimeout(() => {
        document.body.classList.add('screen-apocalypse-rumble');
        if (window.audio && typeof window.audio.playWorldExplosion === 'function') {
          window.audio.playWorldExplosion();
        }

        if (endingBadge) {
          endingBadge.className = 'text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500 animate-pulse font-black';
          endingBadge.textContent = '☣️ ¡GIRO INESPERADO ALQUÍMICO! ☣️';
        }
        if (endingTitle) {
          endingTitle.className = 'text-sm sm:text-base font-black text-rose-400 mb-1.5 flex items-center gap-1.5 animate-bounce';
          endingTitle.innerHTML = '<span>🌍💥 ¡EL PLANETA HA COLAPSADO POR EL PESO DEL ORO!</span>';
        }
        if (endingDesc) {
          endingDesc.innerHTML = '¡¡ERES ASQUEROSAMENTE RICO!! ...Lástima que miles de millones de toneladas de oro acumularon un sobrepeso monumental que fracturó la corteza terrestre en el magma.<br><strong class="text-rose-400">¡EL MUNDO HA EXPLOTADO! 🌍💥 (¿Valió la pena tanto dinero? Al menos moriste millonario 🪙✨)</strong>';
        }
        if (endingLooper) {
          endingLooper.innerHTML = this.getGoodEndingApocalypseSvg();
        }

        setTimeout(() => {
          document.body.classList.remove('screen-apocalypse-rumble');
        }, 1100);
      }, 3600);
    }
  }

  // --- PLANTILLAS SVG DE LOS FINALES CÓMICOS ---
  getBadEndingSvg() {
    return `
      <svg viewBox="0 0 240 160" class="w-full h-full bad-ending-svg">
        <rect x="0" y="0" width="240" height="160" fill="#090d16" />
        <rect x="25" y="32" width="190" height="4" fill="#334155" />
        <rect x="40" y="16" width="12" height="16" rx="2" fill="#38bdf8" opacity="0.6"/>
        <rect x="60" y="14" width="10" height="18" rx="2" fill="#ec4899" opacity="0.6"/>
        <rect x="170" y="16" width="14" height="16" rx="3" fill="#10b981" opacity="0.6"/>
        <rect x="25" y="112" width="190" height="10" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
        <rect x="35" y="122" width="8" height="30" fill="#451a03"/>
        <rect x="197" y="122" width="8" height="30" fill="#451a03"/>
        <g class="bad-alchemist-normal">
          <path d="M 50 112 L 62 78 L 78 78 L 90 112 Z" fill="#2563eb" />
          <circle cx="70" cy="65" r="10" fill="#fed7aa" />
          <circle cx="73" cy="64" r="1.5" fill="#0f172a" />
          <polygon points="56,60 70,30 84,60" fill="#1d4ed8" />
          <circle cx="70" cy="30" r="3" fill="#facc15" />
        </g>
        <g class="bad-flask-group">
          <path d="M 115 72 L 115 84 L 98 112 L 142 112 L 125 84 L 125 72 Z" fill="rgba(255,255,255,0.08)" stroke="#cbd5e1" stroke-width="2"/>
          <path d="M 101 110 L 139 110 L 124 88 L 116 88 Z" fill="#a855f7" />
          <circle cx="118" cy="98" r="3" fill="#c084fc" />
          <circle cx="123" cy="104" r="2.5" fill="#f43f5e" />
          <circle cx="114" cy="106" r="2" fill="#e879f9" />
        </g>
        <g class="bad-soot-cloud">
          <polygon points="120,40 135,72 170,65 142,90 165,115 130,108 120,138 110,108 75,115 98,90 70,65 105,72" fill="#ef4444" opacity="0.9"/>
          <circle cx="120" cy="85" r="38" fill="#18181b" stroke="#27272a" stroke-width="2"/>
          <circle cx="95" cy="78" r="28" fill="#27272a"/>
          <circle cx="145" cy="78" r="28" fill="#27272a"/>
          <circle cx="120" cy="55" r="26" fill="#3f3f46"/>
          <circle cx="120" cy="85" r="18" fill="#fbbf24"/>
          <text x="120" y="92" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">¡¡KABOOM!!</text>
        </g>
        <g class="bad-alchemist-soot">
          <path d="M 105 140 L 112 105 L 128 105 L 135 140 Z" fill="#27272a" stroke="#18181b"/>
          <circle cx="120" cy="92" r="12" fill="#18181b" />
          <circle cx="116" cy="90" r="3" fill="#ffffff" />
          <circle cx="116" cy="90" r="1.5" fill="#000000" />
          <circle cx="124" cy="90" r="3" fill="#ffffff" />
          <circle cx="124" cy="90" r="1.5" fill="#000000" />
          <ellipse cx="120" cy="98" rx="2.5" ry="3" fill="#000000" />
          <path d="M 110 84 L 105 72 L 112 76 L 115 65 L 120 74 L 125 65 L 128 76 L 135 72 L 130 84 Z" fill="#18181b"/>
          <path class="bad-flask-clink" d="M 116 66 L 124 66 L 122 75 L 118 75 Z" fill="rgba(255,255,255,0.3)" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="145" y="70" fill="#facc15" font-size="10" font-weight="900">¡CLINK!</text>
        </g>
      </svg>
    `;
  }

  getRegularEndingSvg() {
    return `
      <svg viewBox="0 0 240 160" class="w-full h-full regular-ending-svg">
        <rect x="0" y="0" width="240" height="160" fill="#0c1322" />
        <path d="M 0 135 Q 120 120 240 135 L 240 160 L 0 160 Z" fill="#14532d" />
        <rect x="80" y="60" width="80" height="70" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"/>
        <polygon points="74,62 120,30 166,62" fill="#334155" stroke="#475569" stroke-width="1.5"/>
        <rect x="106" y="90" width="28" height="40" rx="3" fill="#0f172a" />
        <rect x="90" y="72" width="18" height="18" rx="2" fill="#fef08a" opacity="0.8"/>
        <g class="banana-vines-group">
          <path d="M 75 130 Q 60 90 76 60 Q 90 40 115 32" stroke="#10b981" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M 165 130 Q 180 85 164 58 Q 150 40 125 32" stroke="#059669" stroke-width="5" fill="none" stroke-linecap="round"/>
          <circle cx="70" cy="80" r="7" fill="#10b981" />
          <circle cx="170" cy="75" r="7" fill="#059669" />
          <circle cx="120" cy="28" r="9" fill="#34d399" />
        </g>
        <g class="banana-bunch-pop">
          <g transform="translate(62, 50)">
            <path d="M 5 0 C 15 5 18 20 8 28 C 3 20 2 8 5 0 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1"/>
            <path d="M 0 4 C 10 10 12 25 2 32 C -3 24 -2 12 0 4 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1"/>
            <path d="M 8 2 C 20 6 22 22 14 30 C 8 22 8 10 8 2 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1"/>
            <text x="5" y="-3" font-size="12">🍌</text>
          </g>
          <g transform="translate(112, 10)">
            <text x="0" y="10" font-size="18">🍌🍌</text>
          </g>
          <g transform="translate(160, 52)">
            <text x="0" y="10" font-size="16">🍌🍌</text>
          </g>
          <text x="40" y="110" font-size="13">🍌</text>
          <text x="190" y="115" font-size="13">🍌</text>
        </g>
        <g class="allergic-alchemist-face">
          <path d="M 112 128 L 120 102 L 132 102 L 140 128 Z" fill="#3b82f6" />
          <circle cx="126" cy="92" r="13" fill="#f87171" stroke="#ef4444" stroke-width="1.5"/>
          <circle cx="120" cy="88" r="2.5" fill="#b91c1c" />
          <circle cx="132" cy="89" r="2" fill="#b91c1c" />
          <circle cx="124" cy="99" r="2.5" fill="#b91c1c" />
          <path d="M 119 91 L 123 93 M 123 91 L 119 93" stroke="#7f1d1d" stroke-width="1.8" />
          <path d="M 129 91 L 133 93 M 133 91 L 129 93" stroke="#7f1d1d" stroke-width="1.8" />
          <circle cx="126" cy="94" r="3.5" fill="#dc2626" />
          <circle cx="115" cy="94" r="1.5" fill="#38bdf8" />
          <circle cx="137" cy="94" r="1.5" fill="#38bdf8" />
          <circle cx="126" cy="98" r="4" fill="#fed7aa" />
        </g>
        <g class="sneeze-speech-bubble">
          <rect x="135" y="38" width="98" height="32" rx="10" fill="#ffffff" stroke="#ef4444" stroke-width="2"/>
          <polygon points="145,70 138,78 152,70" fill="#ffffff"/>
          <text x="184" y="52" fill="#dc2626" font-size="10" font-weight="900" text-anchor="middle">¡¡ACHÍÍÍS!! 🤧</text>
          <text x="184" y="64" fill="#7f1d1d" font-size="8" font-weight="bold" text-anchor="middle">¡SOY ALÉRGICO!</text>
        </g>
      </svg>
    `;
  }

  getGoodEndingMoneyTreeSvg() {
    return `
      <svg viewBox="0 0 240 160" class="w-full h-full good-money-tree-svg">
        <rect x="0" y="0" width="240" height="160" fill="#090d16" />
        <circle cx="35" cy="25" r="1.5" fill="#fde047" opacity="0.8"/>
        <circle cx="210" cy="30" r="1.5" fill="#fde047" opacity="0.8"/>
        <circle cx="180" cy="18" r="1" fill="#ffffff" opacity="0.6"/>
        <circle cx="65" cy="40" r="1" fill="#ffffff" opacity="0.6"/>
        <path d="M 0 138 Q 120 128 240 138 L 240 160 L 0 160 Z" fill="#065f46" />
        <g class="money-tree-grow">
          <path d="M 112 140 Q 114 95 102 70 Q 120 85 124 140 Z" fill="#d97706" stroke="#f59e0b" stroke-width="1.5"/>
          <path d="M 120 88 Q 135 75 142 62" stroke="#d97706" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="120" cy="52" r="32" fill="#059669" opacity="0.9" />
          <circle cx="98" cy="56" r="22" fill="#10b981" opacity="0.9" />
          <circle cx="142" cy="56" r="22" fill="#10b981" opacity="0.9" />
          <circle cx="120" cy="36" r="22" fill="#34d399" opacity="0.95" />
          <circle cx="102" cy="42" r="7" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5" />
          <text x="102" y="45" font-size="7" font-weight="900" fill="#78350f" text-anchor="middle">🪙</text>
          <circle cx="138" cy="42" r="7" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5" />
          <text x="138" y="45" font-size="7" font-weight="900" fill="#78350f" text-anchor="middle">🪙</text>
          <circle cx="120" cy="62" r="8" fill="#fde047" stroke="#f59e0b" stroke-width="1.5" />
          <text x="120" y="65" font-size="8" font-weight="900" fill="#78350f" text-anchor="middle">🪙</text>
          <circle cx="85" cy="64" r="6.5" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.2" />
          <text x="85" y="67" font-size="6.5" font-weight="900" fill="#78350f" text-anchor="middle">🪙</text>
          <circle cx="155" cy="64" r="6.5" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.2" />
          <text x="155" y="67" font-size="6.5" font-weight="900" fill="#78350f" text-anchor="middle">🪙</text>
        </g>
        <g class="coin-rain-item coin-c1"><text x="70" y="40" font-size="12">🪙</text></g>
        <g class="coin-rain-item coin-c2"><text x="165" y="35" font-size="14">🪙</text></g>
        <g class="coin-rain-item coin-c3"><text x="95" y="20" font-size="11">🪙</text></g>
        <g class="coin-rain-item coin-c4"><text x="140" y="25" font-size="13">🪙</text></g>
        <g class="coin-rain-item coin-c5"><text x="185" y="55" font-size="12">🪙</text></g>
        <g transform="translate(170, 118)">
          <rect x="0" y="6" width="30" height="20" rx="3" fill="#854d0e" stroke="#ca8a04" stroke-width="1.5"/>
          <path d="M 0 6 Q 15 -4 30 6 Z" fill="#a16207" stroke="#ca8a04" stroke-width="1.5"/>
          <circle cx="15" cy="14" r="3" fill="#facc15" />
          <text x="4" y="5" font-size="10">💎</text>
          <text x="16" y="5" font-size="10">🪙</text>
        </g>
        <g transform="translate(42, 95)">
          <path d="M 8 38 L 14 16 L 26 16 L 32 38 Z" fill="#2563eb" />
          <circle cx="20" cy="8" r="9" fill="#fed7aa" />
          <polygon points="10,4 20,-16 30,4" fill="#1d4ed8" />
          <circle cx="20" cy="-16" r="2.5" fill="#facc15" />
          <path d="M 17 10 Q 20 14 23 10" stroke="#78350f" stroke-width="1.5" fill="none" />
          <text x="24" y="-2" font-size="10">🪙</text>
        </g>
      </svg>
    `;
  }

  getGoodEndingApocalypseSvg() {
    return `
      <svg viewBox="0 0 240 160" class="w-full h-full apocalypse-earth-svg">
        <g class="apocalypse-stars">
          <circle cx="20" cy="25" r="1.5" fill="#ffffff" opacity="0.8"/>
          <circle cx="45" cy="80" r="1" fill="#93c5fd" opacity="0.6"/>
          <circle cx="30" cy="135" r="1.2" fill="#ffffff" opacity="0.7"/>
          <circle cx="95" cy="20" r="1" fill="#fde047" opacity="0.9"/>
          <circle cx="150" cy="18" r="1.5" fill="#ffffff" opacity="0.8"/>
          <circle cx="215" cy="30" r="1.2" fill="#93c5fd" opacity="0.7"/>
          <circle cx="225" cy="85" r="1" fill="#ffffff" opacity="0.6"/>
          <circle cx="205" cy="135" r="1.5" fill="#fde047" opacity="0.9"/>
          <circle cx="130" cy="148" r="1" fill="#ffffff" opacity="0.7"/>
          <circle cx="70" cy="145" r="1.2" fill="#93c5fd" opacity="0.8"/>
        </g>
        <circle cx="120" cy="80" r="43" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.4" class="earth-atmosphere" />
        <g class="apocalypse-earth-body">
          <g class="earth-chunk-tl">
            <path d="M 120 80 L 120 40 A 40 40 0 0 0 80 80 Z" fill="#0284c7" />
            <path d="M 92 56 Q 102 52 110 60 Q 112 70 102 75 Q 90 70 92 56 Z" fill="#10b981" />
            <path d="M 85 70 Q 88 64 94 65 Q 96 76 89 78 Z" fill="#059669" />
          </g>
          <g class="earth-chunk-tr">
            <path d="M 120 80 L 160 80 A 40 40 0 0 0 120 40 Z" fill="#0284c7" />
            <path d="M 125 50 Q 140 46 150 58 Q 146 72 135 68 Q 125 72 125 50 Z" fill="#10b981" />
            <circle cx="145" cy="65" r="4" fill="#059669" />
          </g>
          <g class="earth-chunk-bl">
            <path d="M 120 80 L 80 80 A 40 40 0 0 0 120 120 Z" fill="#0284c7" />
            <path d="M 98 85 Q 112 88 108 102 Q 102 114 96 106 Q 94 92 98 85 Z" fill="#10b981" />
          </g>
          <g class="earth-chunk-br">
            <path d="M 120 80 L 120 120 A 40 40 0 0 0 160 80 Z" fill="#0284c7" />
            <path d="M 126 84 Q 140 86 142 98 Q 135 110 128 105 Q 124 94 126 84 Z" fill="#10b981" />
          </g>
        </g>
        <g class="magma-fissures">
          <path d="M 120 40 L 120 80 L 160 80 M 120 80 L 80 80 M 120 80 L 120 120" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M 120 40 L 118 60 L 122 75 L 120 80 L 140 82 L 160 80" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" fill="none" />
        </g>
        <circle cx="120" cy="80" r="10" fill="none" stroke="#fef08a" stroke-width="4" class="apocalypse-shockwave-1" />
        <circle cx="120" cy="80" r="15" fill="none" stroke="#f97316" stroke-width="3" class="apocalypse-shockwave-2" />
        <g class="apocalypse-fireball">
          <circle cx="120" cy="80" r="28" fill="#fbbf24" opacity="0.9" />
          <polygon points="120,42 128,68 155,62 134,80 152,98 126,92 120,118 114,92 88,98 106,80 85,62 112,68" fill="#ef4444" />
          <circle cx="120" cy="80" r="16" fill="#ffffff" />
        </g>
        <g class="flying-debris">
          <circle cx="65" cy="38" r="4" fill="#ea580c"/>
          <circle cx="178" cy="42" r="3.5" fill="#f97316"/>
          <circle cx="185" cy="115" r="4.5" fill="#ea580c"/>
          <circle cx="58" cy="118" r="3" fill="#f59e0b"/>
          <circle cx="120" cy="22" r="3" fill="#ef4444"/>
          <circle cx="120" cy="140" r="3.5" fill="#f97316"/>
        </g>
        <g class="boom-text-group">
          <rect x="75" y="65" width="90" height="30" rx="8" fill="#dc2626" stroke="#fef08a" stroke-width="2"/>
          <text x="120" y="86" fill="#fef08a" font-size="16" font-weight="900" font-family="'Inter', sans-serif" text-anchor="middle" letter-spacing="1.5">💥 BOOM!</text>
        </g>
      </svg>
    `;
  }

  setupCompletionModalEvents() {
    const modal = document.getElementById('modal-completion');
    const btnMap = document.getElementById('btn-completion-map');
    const btnHonor = document.getElementById('btn-completion-honor');
    const btnEditor = document.getElementById('btn-completion-editor');
    const btnReplay = document.getElementById('btn-completion-replay');

    const btnBad = document.getElementById('btn-ending-bad');
    const btnReg = document.getElementById('btn-ending-regular');
    const btnGood = document.getElementById('btn-ending-good');
    const btnSecret = document.getElementById('btn-ending-secret');

    if (btnBad) this.bindTapOrClick(btnBad, () => this.renderEndingCinematic('bad'));
    if (btnReg) this.bindTapOrClick(btnReg, () => this.renderEndingCinematic('regular'));
    if (btnGood) this.bindTapOrClick(btnGood, () => this.renderEndingCinematic('good'));
    if (btnSecret) {
      this.bindTapOrClick(btnSecret, () => {
        if (modal) this.hideModal(modal);
        if (window.storyManager) window.storyManager.triggerSecretEndingCinematic();
      });
    }

    const btnHomeEndings = document.getElementById('btn-home-endings');
    if (btnHomeEndings) {
      this.bindTapOrClick(btnHomeEndings, () => {
        this.navigationSource = 'home';
        this.hideModal(this.modalHome);
        if (this.modalExtras) this.hideModal(this.modalExtras);
        this.showGameCompletionModal();
      });
    }

    const btnMapEndings = document.getElementById('btn-map-endings');
    if (btnMapEndings) {
      this.bindTapOrClick(btnMapEndings, () => {
        this.hideModal(this.modalMap);
        this.showGameCompletionModal();
      });
    }

    const btnCloseCompletion = document.getElementById('btn-close-completion');
    if (btnCloseCompletion) {
      this.bindTapOrClick(btnCloseCompletion, () => {
        if (modal) this.hideModal(modal);
        if (this.navigationSource === 'home') {
          this.openHomeModal();
        }
      });
    }

    if (btnMap) {
      this.bindTapOrClick(btnMap, () => {
        if (modal) this.hideModal(modal);
        this.openMapModal();
      });
    }

    if (btnHonor) {
      this.bindTapOrClick(btnHonor, () => {
        if (modal) this.hideModal(modal);
        this.openMapModal();
      });
    }

    if (btnEditor) {
      this.bindTapOrClick(btnEditor, () => {
        if (modal) this.hideModal(modal);
        this.openEditorModal();
      });
    }

    const btnStory = document.getElementById('btn-completion-story');
    if (btnStory) {
      this.bindTapOrClick(btnStory, () => {
        if (modal) this.hideModal(modal);
        if (window.storyManager) window.storyManager.openGalleryModal();
      });
    }

    if (btnReplay) {
      this.bindTapOrClick(btnReplay, () => {
        if (modal) this.hideModal(modal);
        this.loadLevel(100);
      });
    }
  }

  // --- EASTER EGG CIENTÍFICO ABURRIDO (9999 SEGUNDOS / CALAVERITA) ---
  triggerBoredScientistModal() {
    // 1. Desbloquear logro oculto "Aburridoooooo"
    if (window.achievementManager) {
      window.achievementManager.unlock('bored_scientist_9999');
    }

    // 2. Sonido cómico de misterio
    if (window.audio && typeof window.audio.playChallengeFail === 'function') {
      window.audio.playChallengeFail();
    }

    // 3. Abrir modal
    const modal = document.getElementById('modal-bored-scientist');
    if (modal) {
      this.showModal(modal);
      if (window.lucide) lucide.createIcons();
    }
  }

  testBoredScientist() {
    this.triggerBoredScientistModal();
  }

  testBuyStoryChapters() {
    if (this.coins < 999999999) {
      this.addCoins(999999999);
    }
    if (window.storyManager) {
      window.storyManager.openGalleryModal();
    }
  }

  // --- COFRE DIARIO (RECOMPENSA DE 50 MONEDAS - 24 HORAS DESDE LAS 12 DE LA NOCHE / 00:00 HS) ---
  initDailyChest() {
    this.dailyChestBar = document.getElementById('daily-chest-bar');
    this.btnDailyChest = document.getElementById('btn-daily-chest');
    this.modalDailyChest = document.getElementById('modal-daily-chest');
    this.btnCloseDailyChest = document.getElementById('btn-close-daily-chest');
    this.dailyChestModalBody = document.getElementById('daily-chest-modal-body');

    if (this.btnDailyChest) {
      this.bindTapOrClick(this.btnDailyChest, () => this.showDailyChestModal(false));
    }

    if (this.btnCloseDailyChest && this.modalDailyChest) {
      this.bindTapOrClick(this.btnCloseDailyChest, () => this.hideModal(this.modalDailyChest));
      this.setupBackdropClose(this.modalDailyChest, () => this.hideModal(this.modalDailyChest));
    }

    // Iniciar loop de actualización en tiempo real cada 1 segundo (actualiza cuenta regresiva y habilita cofre a las 00:00)
    if (this.dailyChestInterval) {
      clearInterval(this.dailyChestInterval);
    }
    this.dailyChestInterval = setInterval(() => this.updateDailyChestBarUI(), 1000);
    this.updateDailyChestBarUI();

    // Recompensa al entrar cada día: si hoy no ha reclamado sus 50 monedas, presentar el cofre de bienvenida
    if (window.stateManager && window.stateManager.canClaimDailyReward()) {
      setTimeout(() => {
        // Solo abrir si no hay otro modal crítico como victoria o epílogo
        const isVictoryOpen = this.modalVictory && !this.modalVictory.classList.contains('hidden');
        if (!isVictoryOpen) {
          this.showDailyChestModal(true);
        }
      }, 700);
    }
  }

  formatDailyCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  updateDailyChestBarUI() {
    if (!this.btnDailyChest || !window.stateManager) return;

    const canClaim = window.stateManager.canClaimDailyReward();

    if (canClaim) {
      this.btnDailyChest.className = 'btn-interactive w-full py-2 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between gap-3 border shadow-lg transition-all duration-300 relative overflow-hidden group daily-chest-ready cursor-pointer';
      this.btnDailyChest.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/30 border border-amber-400/60 flex items-center justify-center text-xl shadow-sm daily-chest-icon">
            🎁
          </div>
          <div class="text-left">
            <div class="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <span>Cofre Diario</span>
              <span class="px-1.5 py-0.2 bg-amber-400/20 text-amber-200 text-[10px] rounded-md border border-amber-400/30">¡Disponible!</span>
            </div>
            <div class="text-xs font-bold text-amber-100 flex items-center gap-1">
              <span>Entraste hoy • Reclama</span>
              <span class="text-amber-300 font-black">+75 🪙</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 animate-pulse">
            <span>¡Abrir!</span>
            <span class="text-sm">🪙</span>
          </span>
        </div>
      `;
    } else {
      const msUntilMidnight = window.stateManager.getMsUntilMidnight();
      const countdown = this.formatDailyCountdown(msUntilMidnight);

      this.btnDailyChest.className = 'btn-interactive w-full py-2 px-3.5 sm:px-4 rounded-2xl flex items-center justify-between gap-3 border shadow-sm transition-all duration-300 relative overflow-hidden group daily-chest-cooldown cursor-pointer';
      this.btnDailyChest.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-lg text-slate-400">
            🔒
          </div>
          <div class="text-left">
            <div class="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Cofre Diario Reclamado</span>
              <span class="text-[10px] text-slate-500 font-mono">12:00 AM</span>
            </div>
            <div class="text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <span class="text-slate-400">Próximo a las 00:00:</span>
              <span id="lbl-daily-chest-countdown-bar" class="text-amber-400 font-bold tracking-wider">${countdown}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center">
          <span class="px-2.5 py-1 bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/60 font-semibold text-[11px] rounded-xl transition">
            +75 🪙 cada 24hs
          </span>
        </div>
      `;

      // Si el modal está abierto mostrando el cooldown, actualizar también la cuenta regresiva en el modal
      const modalCountdown = document.getElementById('lbl-daily-chest-countdown-modal');
      if (modalCountdown) {
        modalCountdown.textContent = countdown;
      }
    }
  }

  showDailyChestModal(autoPrompt = false) {
    if (!this.modalDailyChest || !this.dailyChestModalBody || !window.stateManager) return;

    const canClaim = window.stateManager.canClaimDailyReward();
    const streak = window.stateManager.state.dailyReward?.streak || 0;
    const totalClaimed = window.stateManager.state.dailyReward?.totalClaimed || 0;

    // Resetear posición de la tapa en el SVG
    const chestLid = document.getElementById('daily-chest-lid');
    if (chestLid) {
      chestLid.style.transform = 'translate(0px, 0px) rotate(0deg)';
      chestLid.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }

    if (canClaim) {
      this.dailyChestModalBody.innerHTML = `
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
            <span>✨</span>
            <span>${autoPrompt ? '¡Bienvenido de vuelta, Alquimista!' : '¡Cofre Listo para Abrir!'}</span>
          </div>
          <h3 class="text-base sm:text-lg font-black text-white">
            ${autoPrompt ? '¡Premio por entrar hoy al juego!' : 'Tu cofre diario de hoy está listo'}
          </h3>
          <p class="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Cada día al entrar a AquaSort te recompensamos con monedas mágicas. Ábrelo ahora para sumar <strong class="text-amber-300 font-bold">75 monedas</strong> a tu reserva.
          </p>
        </div>

        <!-- Tarjeta de Recompensa -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/25 to-amber-500/15 border border-amber-400/50 flex items-center justify-between shadow-inner">
          <div class="text-left">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Recompensa Diaria</span>
            <span class="text-xl font-black text-amber-300 font-mono">+75 Monedas</span>
          </div>
          <div class="text-3xl animate-bounce">🪙</div>
        </div>

        <div class="text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span>🔄 Se habilita cada 24 horas desde las 12 de la noche (00:00 hs)</span>
        </div>

        <div class="flex flex-col gap-2 pt-1">
          <button id="btn-claim-daily-reward" class="btn-interactive w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-95">
            <span class="text-lg">🎁</span>
            <span>¡Abrir Cofre (+75 🪙)!</span>
          </button>
          <button id="btn-dismiss-daily-modal" class="py-2 text-xs text-slate-400 hover:text-slate-200 transition">
            Guardar para más tarde
          </button>
        </div>
      `;

      const btnClaim = document.getElementById('btn-claim-daily-reward');
      if (btnClaim) {
        this.bindTapOrClick(btnClaim, () => this.claimDailyRewardAction());
      }
      const btnDismiss = document.getElementById('btn-dismiss-daily-modal');
      if (btnDismiss) {
        this.bindTapOrClick(btnDismiss, () => this.hideModal(this.modalDailyChest));
      }
    } else {
      const msUntilMidnight = window.stateManager.getMsUntilMidnight();
      const countdown = this.formatDailyCountdown(msUntilMidnight);

      this.dailyChestModalBody.innerHTML = `
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
            <span>🔒</span>
            <span>Cofre reclamado por hoy</span>
          </div>
          <h3 class="text-base sm:text-lg font-black text-white">
            ¡Ya reclamaste tus 75 monedas de hoy!
          </h3>
          <p class="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            El cofre se renueva automáticamente cada 24 horas a partir de las <strong>12 de la noche (00:00 hs)</strong>.
          </p>
        </div>

        <!-- Tarjeta de Cuenta Regresiva -->
        <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-center gap-1 shadow-inner">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Próximo cofre disponible en:</span>
          <span id="lbl-daily-chest-countdown-modal" class="text-2xl font-black text-amber-400 font-mono tracking-widest">${countdown}</span>
          <span class="text-[11px] text-slate-500">Se desbloquea exactamente a medianoche (00:00 hs)</span>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around text-xs text-slate-300">
          <div>🔥 Racha: <strong class="text-amber-300">${streak} días</strong></div>
          <div class="h-4 w-px bg-slate-700"></div>
          <div>🏆 Reclamados: <strong class="text-sky-300">${totalClaimed} veces</strong></div>
        </div>

        <div class="pt-1">
          <button id="btn-close-daily-chest-ok" class="btn-interactive w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition">
            ¡Entendido!
          </button>
        </div>
      `;

      const btnOk = document.getElementById('btn-close-daily-chest-ok');
      if (btnOk) {
        this.bindTapOrClick(btnOk, () => this.hideModal(this.modalDailyChest));
      }
    }

    this.showModal(this.modalDailyChest);
    if (window.lucide) lucide.createIcons();
  }

  claimDailyRewardAction() {
    if (!window.stateManager) return;
    const res = window.stateManager.claimDailyReward();

    if (!res.success) {
      this.showDailyChestModal(false);
      return;
    }

    // 1. Agregar 50 monedas al saldo y actualizar HUD
    this.addCoins(res.coinsAwarded);

    // 2. Audio de fanfarria o éxito
    if (window.audio && typeof window.audio.playWinFanfare === 'function') {
      window.audio.playWinFanfare();
    } else if (window.audio && typeof window.audio.playSuccess === 'function') {
      window.audio.playSuccess();
    }

    // 3. Animación de confeti festivo
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#38bdf8', '#10b981']
      });
    }

    // 4. Animación del cofre abriéndose en el SVG
    const chestLid = document.getElementById('daily-chest-lid');
    if (chestLid) {
      chestLid.style.transform = 'translate(-5px, -15px) rotate(-30deg)';
      chestLid.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }

    // 5. Actualizar cuerpo del modal con felicitaciones y cierre
    if (this.dailyChestModalBody) {
      this.dailyChestModalBody.innerHTML = `
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black animate-pulse">
            <span>🎉</span>
            <span>¡Recompensa Reclamada con Éxito!</span>
          </div>
          <h3 class="text-xl font-black text-amber-300">
            ¡+50 Monedas Agregadas!
          </h3>
          <p class="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Has recibido tus 50 monedas de hoy. El próximo cofre estará listo mañana a las <strong>12 de la noche (00:00 hs)</strong>.
          </p>
        </div>

        <div class="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/20 to-emerald-500/15 border border-emerald-400/50 flex items-center justify-between shadow-inner">
          <div class="text-left">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Nuevo Saldo</span>
            <span class="text-xl font-black text-white font-mono">${(this.coins || 0).toLocaleString()} 🪙</span>
          </div>
          <div class="text-3xl">✨🪙✨</div>
        </div>

        <div class="pt-2">
          <button id="btn-daily-claimed-close" class="btn-interactive w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition text-sm">
            ¡Genial, gracias!
          </button>
        </div>
      `;

      const btnClose = document.getElementById('btn-daily-claimed-close');
      if (btnClose) {
        this.bindTapOrClick(btnClose, () => this.hideModal(this.modalDailyChest));
      }
    }

    // 6. Actualizar la barra inferior inmediatamente
    this.updateDailyChestBarUI();
  }

  testDailyChest() {
    if (window.stateManager) {
      window.stateManager.resetDailyRewardForTesting();
    }
    this.updateDailyChestBarUI();
    this.showDailyChestModal(false);
  }
}

window.GameController = GameController;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameController;
}

// Iniciar aplicación al cargar el documento
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  if (window.rouletteEngine) window.rouletteEngine.initDOM();
  window.game = new GameController();

  // Atajo de prueba de Victoria (Alt+V) para desarrollador y pruebas
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'v' || e.key === 'V')) {
      if (window.game) {
        window.game.showVictoryModal(22, 3, 3, null);
      }
    }
    // Atajo para ver la consagración y finales (Alt+E)
    if (e.altKey && (e.key === 'e' || e.key === 'E')) {
      if (window.game) {
        window.game.showGameCompletionModal();
      }
    }
    // Atajo para científico aburrido / límite 9999s (Alt+B)
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      if (window.game) {
        window.game.testBoredScientist();
      }
    }
    // Atajo para compra de crónicas de historia con monedas (Alt+S)
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      if (window.game) {
        window.game.testBuyStoryChapters();
      }
    }
    // Atajo para cofre diario (Alt+C)
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      if (window.game) {
        window.game.testDailyChest();
      }
    }
  });

  if (window.location.search.includes('testBored=1')) {
    setTimeout(() => {
      if (window.game) window.game.testBoredScientist();
    }, 600);
  }

  if (window.location.search.includes('testStoryBuy=1')) {
    setTimeout(() => {
      if (window.game) window.game.testBuyStoryChapters();
    }, 600);
  }

  if (window.location.search.includes('testDaily=1')) {
    setTimeout(() => {
      if (window.game) window.game.testDailyChest();
    }, 600);
  }
});


