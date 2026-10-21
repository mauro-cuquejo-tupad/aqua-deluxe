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
    this.extraTubesUsed = 0;
    this.moveHistory = [];
    this.activeHint = null;
    this.isPouringAnimation = false;
    this.seedVariation = 0;
    this.customLevelTesting = null;
    this.levelChallenges = [];
    this.victoryAnimationTimers = [];

    // Accesibilidad y personalización
    this.isLowVision = false;
    this.isHighContrast = false;

    // Editor de Niveles
    this.editorLevel = {
      name: 'El Crisol del Titán',
      creator: 'Maestro Alquimista',
      tubeCount: 5,
      tubes: [],
      hasBeenPassed: false
    };
    this.activeBrush = { type: 'color', color: '#ef4444', name: 'Rojo', shape: '●' };

    // Canvas de chorro de agua
    this.pourCanvas = null;
    this.pourCtx = null;

    // Referencias DOM
    this.cacheDom();
    this.initEvents();
    this.initCanvas();
    this.initEditorWorkspace();

    // Sincronizar nivel desde parámetro URL o progreso guardado
    const urlParams = new URLSearchParams(window.location.search);
    const paramLevel = parseInt(urlParams.get('level'), 10);
    if (!isNaN(paramLevel) && paramLevel >= 1 && paramLevel <= this.maxLevels) {
      this.currentLevel = paramLevel;
      if (this.modalHome) this.modalHome.classList.add('hidden');
    } else if (window.stateManager && window.stateManager.state.progress.unlockedLevel) {
      this.currentLevel = window.stateManager.state.progress.unlockedLevel;
    }

    this.loadLevel(this.currentLevel);

    // Iniciar loop de vidas en tiempo real
    this.livesInterval = setInterval(() => this.updateLivesHUD(), 1000);
    this.updateLivesHUD();

    // Iniciar música relajante de nivel tras la primera interacción
    this.setupAudioUnlock();
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

    // Catálogo de Mecánicas y Guía de Tutoriales
    this.mechanicsCatalog = [
      { id: 'basic', title: 'Básico', fullName: 'Reglas Básicas de AquaSort', level: 1, icon: 'droplets' },
      { id: 'mystery', title: "Líquidos '?'", fullName: "Líquidos Ocultos '?'", level: 5, icon: 'help-circle' },
      { id: 'giant', title: 'Gigante', fullName: 'Frasco Gigante (Capacidad 6)', level: 10, icon: 'maximize-2' },
      { id: 'lock', title: 'Candado', fullName: 'Candado Alquímico con Llave', level: 15, icon: 'lock' },
      { id: 'narrow', title: 'Estrecho', fullName: 'Tubo Estrecho (1x1)', level: 20, icon: 'minimize-2' },
      { id: 'glued', title: 'En la Roca', fullName: 'Frasco Inamovible en la Roca', level: 25, icon: 'mountain' },
      { id: 'chameleon', title: 'Camaleón', fullName: 'Líquido Camaleón Multicolor', level: 30, icon: 'disc' },
      { id: 'fragile', title: 'Frágil', fullName: 'Cristal Frágil (3 Usos)', level: 35, icon: 'shield-alert' },
      { id: 'hybrid', title: 'Híbrido', fullName: 'Desafío Alquímico Híbrido', level: 40, icon: 'sparkles' }
    ];
    this.currentTutorialId = 'basic';

    // Elementos de la Tienda y Pantalla de Inicio
    this.shopItemsContainer = document.getElementById('shop-items-container');
    this.inputSaveFile = document.getElementById('input-save-file');
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

  setupAudioUnlock() {
    const unlock = () => {
      if (window.audio) {
        window.audio.init();
        if (window.audio.currentTrack === null) {
          window.audio.playMusic('level');
        }
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
  }

  // --- CARGA Y GENERACIÓN DE NIVELES ---
  loadLevel(lvl, seedVariation = 0, customLevelData = null) {
    this.currentLevel = Math.max(1, Math.min(lvl, this.maxLevels));
    this.moves = 0;
    this.moveHistory = [];
    this.selectedTubeIndex = null;
    this.lastInvalidTargetIdx = null;
    this.extraTubesUsed = 0;
    this.activeHint = null;
    this.hintsUsedInLevel = 0;
    this.isPouringAnimation = false;
    this.seedVariation = seedVariation;

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
      this.customLevelTesting = customLevelData;
    } else {
      this.customLevelTesting = null;
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

    // Iniciar temporizador en vivo
    if (window.leaderboardManager) {
      window.leaderboardManager.startTimer('lbl-timer');
    }

    // Actualizar música de fondo
    if (window.audio && !this.isModalOpen()) {
      window.audio.playMusic('level');
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
  }

  updateHeaderUI() {
    if (this.lblLevel) this.lblLevel.textContent = this.currentLevel;
    if (this.selLevelQuick) this.selLevelQuick.value = this.currentLevel;
    if (this.lblOptimalMoves) this.lblOptimalMoves.textContent = this.levelData.optimalMoves;
    if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.levelData.mechanicTag;
    this.updateCoinsUI();
  }

  updateMovesUI() {
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
    if (this.btnUndo) this.btnUndo.disabled = this.moveHistory.length === 0;
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
      if (lblAdd) lblAdd.textContent = '+ Botella';
      this.btnAddTube.title = 'Añadir una botella vacía auxiliar';
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

  updateCoinsUI() {
    const current = this.getCoins();
    if (this.lblCoins) this.lblCoins.textContent = current;
    const shopBal = document.getElementById('shop-coins-balance');
    if (shopBal) shopBal.textContent = current;
    const homeCoins = document.getElementById('home-stat-coins');
    if (homeCoins) homeCoins.textContent = `${current} 🪙`;
  }

  // --- RENDERIZADO VISUAL DE FRASCOS Y LÍQUIDOS ---
  renderTubes() {
    if (!this.tubesGrid) return;
    this.tubesGrid.innerHTML = '';

    this.tubes.forEach((tube, idx) => {
      const tubeEl = document.createElement('div');
      tubeEl.className = 'test-tube w-16 sm:w-20 relative';
      tubeEl.style.height = tube.capacity === 6 ? '250px' : '190px';
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
          if (liq.isChameleon) {
            segment.classList.add('liquid-chameleon');
          } else {
            segment.style.backgroundColor = liq.color;
            if (liq.pattern) segment.classList.add(liq.pattern);
          }

          // Burbujas ascendentes decorativas
          const bubble = document.createElement('div');
          bubble.className = 'bubble w-1.5 h-1.5 left-3';
          segment.appendChild(bubble);

          segment.innerHTML += `
            <span class="shape-icon" style="color: ${liq.textHex || '#fff'}; font-size: 1.15rem;">
              ${liq.shape}
            </span>
            <span class="color-text-label hidden font-mono">
              ${liq.name}
            </span>
          `;
        }
        glassEl.appendChild(segment);
      });

      tubeEl.appendChild(glassEl);

      // Indicadores especiales (Tubo estrecho 1x1, Gigante, Pegado, Frágil)
      if (tube.isNarrow) {
        const narrowTag = document.createElement('span');
        narrowTag.className = 'absolute -bottom-5 text-[10px] text-purple-300 font-bold tracking-wider';
        narrowTag.textContent = '1x1';
        tubeEl.appendChild(narrowTag);
      }
      if (tube.capacity === 6) {
        const giantTag = document.createElement('span');
        giantTag.className = 'absolute -bottom-5 text-[10px] text-sky-300 font-bold tracking-wider';
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
      if (tube.isFragile) {
        tubeEl.classList.add('tube-fragile');
        const fragileTag = document.createElement('span');
        fragileTag.className = 'absolute -bottom-5 text-[10px] text-rose-300 font-bold tracking-wider';
        fragileTag.textContent = `${tube.operationsRemaining ?? 3} 🛡️`;
        tubeEl.appendChild(fragileTag);
      }

      // Hover para mostrar tooltip del color
      tubeEl.addEventListener('mouseenter', () => this.showFluorBadge(tubeEl, tube));
      tubeEl.addEventListener('mouseleave', () => this.removeFluorBadge(tubeEl));

      // Click para selección o vertido
      tubeEl.addEventListener('click', (e) => this.handleTubeClick(idx, tubeEl, e));

      this.tubesGrid.appendChild(tubeEl);
    });

    if (window.lucide) lucide.createIcons();
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

  // --- LÓGICA DE MOVIMIENTOS Y VERTIDO CON ANIMACIONES COMPLETAS ---
  handleTubeClick(idx, tubeEl, event) {
    if (this.isPouringAnimation) return;
    if (window.audio) window.audio.init();

    const clickedTube = this.tubes[idx];

    // 1. Si no hay tubo seleccionado
    if (this.selectedTubeIndex === null) {
      // Mecánica: Frasco pegado (solo puede recibir líquido, nunca vaciarse)
      if (clickedTube.isGlued) {
        this.triggerInvalidMove(idx, '🪨 Solo recibe (no sale)');
        return;
      }

      // Mecánica: Frasco frágil sin operaciones
      if (clickedTube.isFragile && typeof clickedTube.operationsRemaining === 'number' && clickedTube.operationsRemaining <= 0) {
        this.triggerInvalidMove(idx, '🛡️ Sin usos restantes');
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
      if (this.isTubeComplete(clickedTube)) {
        this.triggerInvalidMove(idx, '✨ Tubo ya completado');
        return;
      }

      this.selectedTubeIndex = idx;
      this.lastInvalidTargetIdx = null;
      if (window.audio) window.audio.playSelect();
      this.renderTubes();
      return;
    }

    // 2. Si se hace clic en el mismo tubo: deseleccionar
    if (this.selectedTubeIndex === idx) {
      this.selectedTubeIndex = null;
      this.lastInvalidTargetIdx = null;
      if (window.audio) window.audio.playSelect();
      this.renderTubes();
      return;
    }

    // 3. Si se hace clic en otro tubo: intentar verter
    const fromIdx = this.selectedTubeIndex;
    const toIdx = idx;
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    // Desbloqueo de candado si se vierte la llave correcta
    if (toTube.isLocked) {
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      if (topFrom && topFrom.color === toTube.keyColor) {
        this.saveStateForUndo();
        toTube.isLocked = false;
        if (window.audio) window.audio.playUnlock();
        this.selectedTubeIndex = null;
        this.lastInvalidTargetIdx = null;
        this.moves++;
        this.renderTubes();
        this.updateButtonsUI();
        return;
      } else {
        this.triggerInvalidMove(toIdx, '🔒 Llave incorrecta');
        return;
      }
    }

    // REGLA DEL TUBO DE PRECISIÓN (1x1):
    // Solo permite ingresar un fluido de un solo elemento (1 cuarto aislado).
    // Si se intenta verter un fluido que combinó 2 o más cuartos juntos, se rechaza,
    // se vacía el tubo de origen y se esparcen sus fluidos en los demás tubos incompletos al azar (efecto químico inesperado).
    if (toTube.isNarrow) {
      let topBlockCount = 0;
      const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
      if (topFrom.isChameleon) {
        topBlockCount = 1; // El camaleón es siempre 1 unidad individual
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
        return;
      }
    }

    // Verificar si el vertido es válido
    if (this.canPour(fromIdx, toIdx)) {
      this.executePour(fromIdx, toIdx);
    } else {
      // Activar feedback de movimiento inválido (sonido de equivocación + sacudida con borde rojo + badge flotante)
      const reason = this.getInvalidPourReason(fromIdx, toIdx);
      this.triggerInvalidMove(toIdx, reason);
    }
  }

  // Identificar el motivo específico por el cual un vertido es inválido
  getInvalidPourReason(fromIdx, toIdx) {
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    if (!fromTube || !toTube) return '🚫 Movimiento inválido';

    if (toTube.isLocked) return '🔒 Llave requerida';
    if (toTube.liquids.length >= toTube.capacity) return '🚫 ¡Tubo lleno!';
    if (fromTube.isGlued) return '🪨 ¡Frasco inamovible!';
    if (toTube.isFragile && typeof toTube.operationsRemaining === 'number' && toTube.operationsRemaining <= 0) {
      return '🛡️ Tubo frágil agotado';
    }

    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (toTube.liquids.length > 0) {
      const topTo = toTube.liquids[toTube.liquids.length - 1];
      if (topFrom && topTo && topFrom.color !== topTo.color && !topFrom.isChameleon && !topTo.isChameleon) {
        return '🚫 ¡Color incompatible!';
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

  canPour(fromIdx, toIdx) {
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    if (toTube.isLocked || fromTube.liquids.length === 0) return false;
    if (toTube.liquids.length >= toTube.capacity) return false;

    // Un frasco pegado nunca puede verter
    if (fromTube.isGlued) return false;

    // Cristal frágil sin operaciones restantes
    if (fromTube.isFragile && typeof fromTube.operationsRemaining === 'number' && fromTube.operationsRemaining <= 0) return false;
    if (toTube.isFragile && typeof toTube.operationsRemaining === 'number' && toTube.operationsRemaining <= 0) return false;

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

    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (topFrom.isMystery) topFrom.isMystery = false;

    // Contar cuántos bloques contiguos se pueden mover:
    // EL LÍQUIDO CAMALEÓN ES INDIVIDUAL: Se mueve siempre solo (1 unidad)
    // y NUNCA arrastra el líquido que esté debajo.
    let count = 0;
    if (topFrom.isChameleon) {
      count = 1;
    } else {
      const matchColor = topFrom.color;
      for (let i = fromTube.liquids.length - 1; i >= 0; i--) {
        const item = fromTube.liquids[i];
        if (!item.isMystery && !item.isChameleon && item.color === matchColor) {
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

    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const isTargetToTheRight = tRect.left >= fRect.left;
    const tiltDeg = isTargetToTheRight ? 54 : -54;
    const offsetX = tRect.left - fRect.left + (isTargetToTheRight ? -24 : 24);
    const offsetY = tRect.top - fRect.top - 46;

    fromEl.style.zIndex = '70';

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
          const streamColor = topFrom.isChameleon ? '#ec4899' : (topFrom.color === 'chameleon' ? '#ec4899' : topFrom.color);
          this.drawPourStream(fRect, tRect, streamColor, isTargetToTheRight, totalPourTime + 80);

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
                incomingSeg.style.backgroundColor = matchColor;
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
                for (let u = 0; u < unitsToMove; u++) {
                  const item = fromTube.liquids.pop();
                  item.isMystery = false;

                  // Camaleón adopta color receptor si aplica
                  if (item.isChameleon) {
                    if (toTube.liquids.length > 0) {
                      const targetTop = toTube.liquids[toTube.liquids.length - 1];
                      if (!targetTop.isChameleon && targetTop.color !== 'chameleon') {
                        item.color = targetTop.color;
                        item.name = targetTop.name;
                        item.shape = targetTop.shape;
                        item.pattern = targetTop.pattern;
                        item.textHex = targetTop.textHex;
                        item.adaptedToColor = targetTop.color;
                      }
                    } else {
                      // Al vaciarse en un frasco limpio, vuelve a su estado comodín puro
                      item.color = 'chameleon';
                      item.name = 'Camaleón';
                      item.shape = '★';
                      item.pattern = null;
                      item.textHex = '#ffffff';
                      item.adaptedToColor = null;
                    }
                  }
                  toTube.liquids.push(item);
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

                // Desgaste de frascos frágiles por operación
                if (fromTube.isFragile && typeof fromTube.operationsRemaining === 'number') {
                  fromTube.operationsRemaining = Math.max(0, fromTube.operationsRemaining - 1);
                }
                if (toTube.isFragile && typeof toTube.operationsRemaining === 'number') {
                  toTube.operationsRemaining = Math.max(0, toTube.operationsRemaining - 1);
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

                // Comprobar victoria
                this.checkVictory();
              }, 250);
            }, 190);
          }, 520);
        }, 220);
      }, 290);
    }, 190);
  }

  // --- TRAZADO DEL CHORRO DE AGUA CON CANVAS Y FÍSICA PROCEDURAL ---
  drawPourStream(fRect, tRect, color, isToRight, duration) {
    if (!this.pourCanvas || !this.pourCtx) return;
    const ctx = this.pourCtx;
    const parentRect = this.pourCanvas.getBoundingClientRect();

    const startX = (isToRight ? fRect.right - 12 : fRect.left + 12) - parentRect.left;
    const startY = fRect.top + 20 - parentRect.top;
    const endX = (tRect.left + tRect.width / 2) - parentRect.left;
    const endY = (tRect.top + 32) - parentRect.top;

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
        const midX = (startX + endX) / 2 + (isToRight ? 16 : -16);
        const midY = Math.min(startY, endY) - 36;

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
  isTubeComplete(tube) {
    if (!tube || tube.liquids.length === 0) return false;
    if (tube.liquids.length !== tube.capacity) return false;
    if (tube.liquids.some(l => l.isMystery)) return false;

    // Obtener colores base de líquidos que no sean camaleón
    const baseColors = tube.liquids.filter(l => !l.isChameleon).map(l => l.color);
    if (baseColors.length === 0) {
      return true;
    }
    const targetColor = baseColors[0];
    return baseColors.every(c => c === targetColor);
  }

  triggerNarrowChemicalReaction(fromIdx, toIdx) {
    this.saveStateForUndo();
    this.isPouringAnimation = true;

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
      setTimeout(() => toEl.classList.remove('tube-overload-flash'), 800);
    }
    if (fromEl) {
      fromEl.classList.add('tube-boil-overflow');
      setTimeout(() => fromEl.classList.remove('tube-boil-overflow'), 800);
    }

    // Mostrar banner de reacción química inesperada
    this.showChemicalReactionBanner();

    // Vaciado del tubo y dispersión aleatoria en tubos incompletos
    const spilled = [...fromTube.liquids];
    fromTube.liquids = [];

    // Distribuir cada unidad en los demás tubos que NO estén completos y tengan espacio libre
    for (let i = 0; i < spilled.length; i++) {
      const item = spilled[i];
      item.isMystery = false; // Se revela por la reacción química

      const eligibleTubes = this.tubes.filter((t, idx) => {
        if (idx === fromIdx) return false;
        if (t.isLocked) return false;
        if (t.isNarrow) return false;
        if (this.isTubeComplete(t)) return false; // NUNCA alterar tubos completos
        return t.liquids.length < t.capacity;
      });

      if (eligibleTubes.length > 0) {
        const dest = eligibleTubes[Math.floor(Math.random() * eligibleTubes.length)];
        dest.liquids.push(item);
      } else {
        // Si ningún otro frasco tiene lugar, regresa al frasco origen
        fromTube.liquids.push(item);
      }
    }

    // Incrementar movimientos (penalización que retrasa y afecta el récord y monedas)
    this.moves++;
    if (window.stateManager) {
      window.stateManager.onMoveMade();
    }
    this.updateMovesUI();

    setTimeout(() => {
      this.selectedTubeIndex = null;
      this.clearHintHighlight();
      this.isPouringAnimation = false;
      this.renderTubes();
      this.updateButtonsUI();
      this.checkVictory();
    }, 750);
  }

  showChemicalReactionBanner() {
    let banner = document.getElementById('chemical-reaction-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chemical-reaction-banner';
      banner.className = 'chemical-banner animate-bounce';
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <div class="flex items-center justify-center gap-2 mb-1">
        <span class="text-base sm:text-lg">⚗️💥</span>
        <span class="text-amber-300 font-black tracking-wide text-xs sm:text-sm">¡EFECTO QUÍMICO INESPERADO!</span>
      </div>
      <span class="text-[10px] sm:text-[11px] block font-medium text-amber-100 leading-tight">
        El tubo de precisión (1x1) no admite fluidos combinados (2+ cuartos). ¡La sobrecarga desbordó el frasco y sus fluidos se esparcieron!
      </span>
    `;
    banner.style.display = 'block';

    if (this._chemBannerTimer) clearTimeout(this._chemBannerTimer);
    this._chemBannerTimer = setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 3800);
  }

  // --- COMPROBACIÓN DE VICTORIA Y SECUENCIA DE CORCHOS ---
  checkVictory() {
    let allDone = true;

    for (const tube of this.tubes) {
      if (tube.liquids.length === 0) continue;
      if (!this.isTubeComplete(tube)) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      this.triggerVictorySequence();
    }
  }

  triggerVictorySequence() {
    // Si estamos en modo de prueba de nivel personalizado
    if (this.customLevelTesting) {
      this.customLevelTesting.hasBeenPassed = true;
      this.editorLevel.hasBeenPassed = true;
      if (window.audio) window.audio.playWinFanfare();
      alert(`¡FELICITACIONES! Has superado con éxito tu nivel '${this.customLevelTesting.name}'. ¡Ya ha sido validado y puedes publicarlo en el Taller!`);
      this.openEditorModal('design');
      return;
    }

    const elapsedSecs = window.leaderboardManager ? window.leaderboardManager.stopTimer() : 0;

    // Calcular estrellas
    const starCount = this.moves <= this.levelData.optimalMoves ? 3 : (this.moves <= this.levelData.optimalMoves * 1.5 ? 2 : 1);

    // Guardar récord en el gestor de clasificaciones ÚNICAMENTE si no se usaron pistas
    let recordResult = null;
    const usedHints = (this.hintsUsedInLevel > 0);
    if (!usedHints && window.leaderboardManager) {
      recordResult = window.leaderboardManager.recordLevelCompletion(this.currentLevel, elapsedSecs, this.moves, starCount);
    }

    // Calcular combo consecutivo
    let combo = 0;
    for (let i = 0; i < this.tubes.length; i++) {
      const t = this.tubes[i];
      if (t.liquids.length === t.capacity) {
        combo++;
      }
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

          if (wrapper) {
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

      this.showVictoryModal(elapsedSecs, combo, starCount, recordResult);
    }, this.tubes.length * 320 + 400);
  }

  showVictoryModal(elapsedSecs, combo, stars, recordResult) {
    // Reajuste de economía alquímica: recompensas sostenibles (2 a 4 monedas base)
    let baseCoins = 2;
    if (this.moves <= this.levelData.optimalMoves) baseCoins = 4;
    else if (this.moves <= this.levelData.optimalMoves * 1.5) baseCoins = 3;

    let totalEarned = baseCoins + (combo > 2 ? 1 : 0);
    this.addCoins(totalEarned);

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

    if (movesEl) movesEl.textContent = this.moves;
    if (timeEl) timeEl.textContent = window.leaderboardManager ? window.leaderboardManager.formatTime(elapsedSecs) : `${elapsedSecs}s`;
    if (coinsEl) coinsEl.textContent = `${totalEarned} 🪙`;

    // Render de estrellas
    if (starsCont) {
      starsCont.innerHTML = '';
      for (let s = 0; s < 3; s++) {
        starsCont.innerHTML += `
          <i data-lucide="star" class="w-8 h-8 ${s < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}"></i>
        `;
      }
    }

    // Notificación de nuevo récord personal si aplica
    const recordBadge = document.getElementById('lbl-new-record-badge');
    if (recordBadge) {
      if (recordResult && (recordResult.isNewBestTime || recordResult.isNewBestMoves)) {
        recordBadge.classList.remove('hidden');
      } else {
        recordBadge.classList.add('hidden');
      }
    }

    // Evaluación y animación escalonada de desafíos del nivel
    this.animateVictoryChallenges(elapsedSecs, totalEarned);

    if (window.lucide) lucide.createIcons();
    if (this.modalVictory) this.modalVictory.classList.remove('hidden');
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

    // Evaluar cada desafío del nivel
    const results = this.levelChallenges.map(c => {
      const isCompleted = typeof c.check === 'function' ? c.check(this, elapsedSecs) : false;
      return { challenge: c, completed: isCompleted };
    });

    const bonusData = window.ChallengeManager
      ? window.ChallengeManager.calculateBonus(results)
      : { completedCount: 0, totalCount: results.length, totalCoins: 0, multiplier: 1 };

    // Guardar en la persistencia del jugador si aplica
    if (window.stateManager && typeof window.stateManager.recordLevelChallenges === 'function' && !this.customLevelTesting) {
      window.stateManager.recordLevelChallenges(this.currentLevel, bonusData);
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
    }, totalDelay);
    this.victoryAnimationTimers.push(finalTimer);
  }

  // --- RENDER Y ACTUALIZACIÓN EN VIVO DE DESAFÍOS EN EL HUD ---
  renderChallengesHUD() {
    if (!this.challengesHud) return;

    if (!this.levelChallenges || this.levelChallenges.length === 0) {
      this.challengesHud.innerHTML = '';
      this.challengesHud.classList.add('hidden');
      return;
    }

    this.challengesHud.classList.remove('hidden');
    this.challengesHud.innerHTML = '';

    // Título sutil
    const label = document.createElement('div');
    label.className = 'text-[11px] font-black text-amber-300/90 flex items-center gap-1 mr-1';
    label.innerHTML = `
      <i data-lucide="target" class="w-3.5 h-3.5 text-amber-400"></i>
      <span class="hidden sm:inline">Desafíos:</span>
    `;
    this.challengesHud.appendChild(label);

    this.levelChallenges.forEach((c, idx) => {
      const chip = document.createElement('div');
      chip.className = 'challenge-hud-pill';
      chip.id = `challenge-pill-${idx}`;
      chip.title = `${c.title} • Recompensa: +${c.coins || 3} 🪙`;

      let iconHtml = '';
      if (c.colorHex) {
        iconHtml = `<span class="challenge-color-dot" style="background-color: ${c.colorHex}; box-shadow: 0 0 6px ${c.colorHex};"></span>`;
      } else if (c.icon === 'zap') {
        iconHtml = `<i data-lucide="zap" class="w-3 h-3 text-amber-400"></i>`;
      } else if (c.icon === 'clock') {
        iconHtml = `<i data-lucide="clock" class="w-3 h-3 text-emerald-400"></i>`;
      } else if (c.icon === 'hash') {
        iconHtml = `<i data-lucide="hash" class="w-3 h-3 text-indigo-400"></i>`;
      } else if (c.icon === 'shield') {
        iconHtml = `<i data-lucide="shield" class="w-3 h-3 text-sky-400"></i>`;
      } else {
        iconHtml = `<i data-lucide="sparkles" class="w-3 h-3 text-purple-400"></i>`;
      }

      chip.innerHTML = `
        <span class="flex items-center gap-1">${iconHtml} <span>${c.shortTitle}</span></span>
        <span class="challenge-hud-badge" id="chal-prog-${idx}">...</span>
        <span class="challenge-hud-reward">+${c.coins || 3}🪙</span>
      `;
      this.challengesHud.appendChild(chip);
    });

    if (window.lucide) lucide.createIcons();
    this.updateChallengesHUD();
  }

  updateChallengesHUD() {
    if (!this.levelChallenges || this.levelChallenges.length === 0) return;
    const elapsedSecs = window.leaderboardManager ? window.leaderboardManager.getElapsedSeconds() : 0;

    this.levelChallenges.forEach((c, idx) => {
      const chip = document.getElementById(`challenge-pill-${idx}`);
      const prog = document.getElementById(`chal-prog-${idx}`);
      if (!chip || !prog) return;

      if (typeof c.getCurrentText === 'function') {
        prog.textContent = c.getCurrentText(this, elapsedSecs);
      }

      const isFailed = typeof c.isFailedLive === 'function' && c.isFailedLive(this, elapsedSecs);
      if (isFailed) {
        chip.classList.add('is-failed');
        chip.classList.remove('is-achieved');
      } else {
        chip.classList.remove('is-failed');
      }
    });
  }

  onTimerTick(elapsedSecs) {
    if (this.levelChallenges && this.levelChallenges.length > 0) {
      this.updateChallengesHUD();
    }
  }

  multiplyCoins(mult) {
    const current = this.getCoins();
    const updated = Math.round(current * mult);
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
    this.loadLevel(this.currentLevel + 1);
  }

  // --- DESHACER (UNDO) Y PISTAS (HINTS) ---
  saveStateForUndo() {
    this.moveHistory.push({
      tubes: JSON.parse(JSON.stringify(this.tubes)),
      moves: this.moves
    });
  }

  undo() {
    if (this.moveHistory.length === 0 || this.isPouringAnimation) return;
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
  }

  addAuxiliaryTube() {
    const cooldown = window.stateManager ? window.stateManager.getCooldownRemaining() : 0;
    if (cooldown > 0) {
      if (confirm(`La botella auxiliar está en enfriamiento (${cooldown} movimientos restantes). ¿Deseas ir a la Tienda de Mejoras para recargarla inmediatamente con 20🪙?`)) {
        this.openShopModal();
      }
      return;
    }

    if (this.extraTubesUsed >= 1) return;

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

  giveHint() {
    if (this.hintsRemaining <= 0) return;

    for (let i = 0; i < this.tubes.length; i++) {
      for (let j = 0; j < this.tubes.length; j++) {
        if (i !== j && this.canPour(i, j)) {
          this.hintsRemaining--;
          this.hintsUsedInLevel = (this.hintsUsedInLevel || 0) + 1; // Marca el nivel para exclusión del leaderboard
          if (this.lblHintsLeft) this.lblHintsLeft.textContent = this.hintsRemaining;
          this.activeHint = { from: i, to: j };

          const banner = document.getElementById('hint-banner');
          if (banner) banner.classList.remove('hidden');

          if (window.audio) window.audio.playSelect();
          this.renderTubes();
          this.updateChallengesHUD();
          return;
        }
      }
    }
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
    if (this.modalShop) this.modalShop.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeShopModal() {
    if (this.modalShop) this.modalShop.classList.add('hidden');
    this.updateAuxiliaryButtonUI();
    this.updateLivesHUD();
  }

  renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container || !window.stateManager) return;
    const state = window.stateManager.state;
    const coins = window.stateManager.getCoins();
    const lives = window.stateManager.getLives();
    const maxLives = window.stateManager.getMaxLives();

    const cdLvl = state.upgrades.cooldownReductionLevel || 1;
    const cdMs = { 1: 100, 2: 75, 3: 50, 4: 25 }[cdLvl] || 25;
    const nextCdMs = { 1: 75, 2: 50, 3: 25 }[cdLvl];
    const cdCost = { 1: 80, 2: 180, 3: 350 }[cdLvl];

    const hintsCap = state.upgrades.maxStoredHints || 3;
    const nextHintsCap = hintsCap === 3 ? 5 : (hintsCap === 5 ? 8 : null);
    const hintsCapCost = hintsCap === 3 ? 60 : (hintsCap === 5 ? 150 : null);

    const remCd = window.stateManager.getCooldownRemaining();

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
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-40" ${lives >= maxLives || coins < 25 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_life')">
            Comprar (25 🪙)
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
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">Pack Completo</span>
            </h4>
            <p class="text-xs text-slate-400">Restaura todas tus vidas al máximo de inmediato con precio de oferta.</p>
          </div>
        </div>
        <div>
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/20 disabled:opacity-40" ${lives >= maxLives || coins < 60 ? 'disabled' : ''} onclick="window.game.buyUpgrade('recharge_all_lives')">
            Restaurar Todo (60 🪙)
          </button>
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
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 disabled:opacity-40" ${remCd === 0 || coins < 40 ? 'disabled' : ''} onclick="window.game.buyUpgrade('recharge_bottle')">
            Recargar (40 🪙)
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
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-md shadow-purple-500/20 disabled:opacity-40" ${coins < 45 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_hints_pack')">
            Comprar (45 🪙)
          </button>
        </div>
      </div>

      <!-- 5. Seguro Permanente de Minijuego (Ruleta / Diana) -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Seguro de Minijuegos (Boost)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">Permanente</span>
            </h4>
            <p class="text-xs text-slate-400">Si fallas en la ruleta o en la diana con viento, conservas el 100% de tus monedas ganadas en lugar de perderlas.</p>
          </div>
        </div>
        <div>
          ${!state.upgrades.rouletteBoost ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-40" ${coins < 120 ? 'disabled' : ''} onclick="window.game.buyUpgrade('roulette_boost')">
              Activar (120 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Seguro Activo
            </span>
          `}
        </div>
      </div>

      <!-- 6. Cartas Alquímicas de Fortuna (Consumibles de Bonificación) -->
      <div class="mt-4 pt-4 border-t border-slate-700/80">
        <h3 class="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-2 mb-3">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
          Cartas Alquímicas de Fortuna (20 🪙 c/u)
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Favor de la Diana -->
          <div class="bg-slate-800/90 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>🎯 Favor de la Diana</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">x${(state.cards && state.cards.dianaFavor) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">80% de probabilidad de jugar la Diana de Dardos.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white shadow-sm disabled:opacity-40" ${coins < 20 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_dianaFavor')">
              20 🪙
            </button>
          </div>

          <!-- Giro del Destino -->
          <div class="bg-slate-800/90 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-xs text-white">
                <span>🎡 Giro del Destino</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">x${(state.cards && state.cards.rouletteFavor) || 0}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">80% de probabilidad de jugar la Ruleta Alquímica.</p>
            </div>
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-sm disabled:opacity-40" ${coins < 20 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_rouletteFavor')">
              20 🪙
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
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-sm disabled:opacity-40" ${coins < 20 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_doubleOrNothing')">
              20 🪙
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
            <button class="btn-interactive px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-sm disabled:opacity-40" ${coins < 20 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_card_calmAtmosphere')">
              20 🪙
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
      if (type === 'buy_life' || type === 'recharge_all_lives') {
        this.updateLivesHUD();
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
      playText.textContent = `Continuar Nivel ${this.currentLevel}`;
    }

    if (this.modalHome) this.modalHome.classList.remove('hidden');
    if (window.audio) window.audio.playMusic('level');
  }

  closeHomeModal() {
    if (this.modalHome) this.modalHome.classList.add('hidden');
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

  isModalOpen() {
    const modals = [this.modalMap, this.modalVictory, this.modalRoulette, this.modalLeaderboard, this.modalSettings, this.modalHome, this.modalShop];
    return modals.some(m => m && !m.classList.contains('hidden'));
  }

  // --- EVENT LISTENERS E INTERACTIVIDAD DE INTERFAZ ---
  initEvents() {
    // Acciones principales del HUD
    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
    if (this.btnRestart) this.btnRestart.addEventListener('click', () => this.openRestartConfirmModal());
    if (this.btnHint) this.btnHint.addEventListener('click', () => this.giveHint());
    if (this.btnAddTube) this.btnAddTube.addEventListener('click', () => this.addAuxiliaryTube());

    const btnCloseHint = document.getElementById('btn-close-hint');
    if (btnCloseHint) btnCloseHint.addEventListener('click', () => this.clearHintHighlight());

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
      btnOpenHome.addEventListener('click', () => this.openHomeModal());
    }

    const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
      btnOpenShop.addEventListener('click', () => this.openShopModal());
    }

    const btnOpenMinigame = document.getElementById('btn-open-minigame');
    if (btnOpenMinigame) {
      btnOpenMinigame.addEventListener('click', () => {
        if (window.minigameEngine) window.minigameEngine.openModal();
      });
    }

    // Botón Widget de Vidas -> Abre la tienda para recarga
    if (this.livesHud) {
      this.livesHud.addEventListener('click', () => this.openShopModal());
    }

    // Botón Taller de Creación en Header
    if (this.btnOpenEditor) {
      this.btnOpenEditor.addEventListener('click', () => this.openEditorModal('design'));
    }

    // Botón Taller de Creación en Home Screen
    const btnHomeEditor = document.getElementById('btn-home-editor');
    if (btnHomeEditor) {
      btnHomeEditor.addEventListener('click', () => {
        this.closeHomeModal();
        this.openEditorModal('design');
      });
    }

    // Modal Reinicio Confirmación
    const btnConfirmRestart = document.getElementById('btn-confirm-restart');
    if (btnConfirmRestart) {
      btnConfirmRestart.addEventListener('click', () => this.confirmRestartLevel());
    }
    const btnCancelRestart = document.getElementById('btn-cancel-restart');
    if (btnCancelRestart) {
      btnCancelRestart.addEventListener('click', () => this.closeRestartConfirmModal());
    }

    // Botón Ayuda y Guía de Tubos / Tutoriales en Header
    const btnOpenHelp = document.getElementById('btn-open-help');
    if (btnOpenHelp) {
      btnOpenHelp.addEventListener('click', () => this.openTutorialsHelp());
    }

    // Botón Rápido de Tutorial de Mecánica en Subtítulo de Nivel
    const btnQuickHelp = document.getElementById('btn-quick-help');
    if (btnQuickHelp) {
      btnQuickHelp.addEventListener('click', () => this.openTutorialsHelp(this.levelData?.primaryMechanicId));
    }

    // Botón Guía de Tubos en Pantalla de Inicio
    const btnHomeTutorials = document.getElementById('btn-home-tutorials');
    if (btnHomeTutorials) {
      btnHomeTutorials.addEventListener('click', () => {
        this.closeHomeModal();
        this.openTutorialsHelp();
      });
    }

    // Modal Tutorial (Cerrar, Cerrar X, Anterior, Siguiente)
    const btnCloseTut = document.getElementById('btn-close-tutorial');
    if (btnCloseTut) {
      btnCloseTut.addEventListener('click', () => this.closeTutorialModal());
    }
    const btnCloseTutX = document.getElementById('btn-close-tutorial-x');
    if (btnCloseTutX) {
      btnCloseTutX.addEventListener('click', () => this.closeTutorialModal());
    }
    const btnTutPrev = document.getElementById('btn-tut-prev');
    if (btnTutPrev) {
      btnTutPrev.addEventListener('click', () => this.navigateTutorial(-1));
    }
    const btnTutNext = document.getElementById('btn-tut-next');
    if (btnTutNext) {
      btnTutNext.addEventListener('click', () => this.navigateTutorial(1));
    }

    // Modal Editor de Niveles botones y pestañas
    const btnCloseEditor = document.getElementById('btn-close-editor');
    if (btnCloseEditor) {
      btnCloseEditor.addEventListener('click', () => this.closeEditorModal());
    }
    const tabDesign = document.getElementById('tab-editor-design');
    if (tabDesign) {
      tabDesign.addEventListener('click', () => this.switchEditorTab('design'));
    }
    const tabSaved = document.getElementById('tab-editor-saved');
    if (tabSaved) {
      tabSaved.addEventListener('click', () => this.switchEditorTab('saved'));
    }
    const btnTest = document.getElementById('btn-editor-test');
    if (btnTest) {
      btnTest.addEventListener('click', () => this.testCustomLevel());
    }
    const btnPublish = document.getElementById('btn-editor-publish');
    if (btnPublish) {
      btnPublish.addEventListener('click', () => this.publishCustomLevel());
    }
    const selTubeCount = document.getElementById('editor-tube-count');
    if (selTubeCount) {
      selTubeCount.addEventListener('change', (e) => {
        const count = parseInt(e.target.value);
        this.editorLevel.tubeCount = count;
        while (this.editorLevel.tubes.length < count) {
          this.editorLevel.tubes.push({ capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, operationsRemaining: null });
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
    if (btnCloseHome) btnCloseHome.addEventListener('click', () => this.closeHomeModal());

    const btnHomePlay = document.getElementById('btn-home-play');
    if (btnHomePlay) btnHomePlay.addEventListener('click', () => this.closeHomeModal());

    const btnHomeMap = document.getElementById('btn-home-map');
    if (btnHomeMap) {
      btnHomeMap.addEventListener('click', () => {
        this.closeHomeModal();
        this.openMapModal();
        if (window.audio) window.audio.playMusic('map');
      });
    }

    const btnHomeShop = document.getElementById('btn-home-shop');
    if (btnHomeShop) {
      btnHomeShop.addEventListener('click', () => {
        this.closeHomeModal();
        this.openShopModal();
      });
    }

    const btnHomeLeaderboard = document.getElementById('btn-home-leaderboard');
    if (btnHomeLeaderboard) {
      btnHomeLeaderboard.addEventListener('click', () => {
        this.closeHomeModal();
        const btnLB = document.getElementById('btn-open-leaderboard');
        if (btnLB) btnLB.click();
      });
    }

    const btnHomeSettings = document.getElementById('btn-home-settings');
    if (btnHomeSettings) {
      btnHomeSettings.addEventListener('click', () => {
        this.closeHomeModal();
        const btnSet = document.getElementById('btn-open-settings');
        if (btnSet) btnSet.click();
      });
    }

    // Guardado y Carga de Partida en Archivo (.json)
    const btnExportFile = document.getElementById('btn-export-file');
    if (btnExportFile) {
      btnExportFile.addEventListener('click', () => this.exportGameFile());
    }

    const btnImportFile = document.getElementById('btn-import-file');
    if (btnImportFile) {
      btnImportFile.addEventListener('click', () => {
        if (this.inputSaveFile) this.inputSaveFile.click();
      });
    }

    if (this.inputSaveFile) {
      this.inputSaveFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.importGameFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Modal Tienda botones internos
    const btnCloseShop = document.getElementById('btn-close-shop');
    if (btnCloseShop) btnCloseShop.addEventListener('click', () => this.closeShopModal());

    // Audio Mute Toggle
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
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
      btnFullscreen.addEventListener('click', () => {
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
      btnOpenMap.addEventListener('click', () => {
        this.openMapModal();
        if (window.audio) window.audio.playMusic('map');
      });
    }
    if (btnCloseMap) {
      btnCloseMap.addEventListener('click', () => {
        if (this.modalMap) this.modalMap.classList.add('hidden');
        if (window.audio) window.audio.playMusic('level');
      });
    }

    // Modal Clasificaciones / Leaderboard
    const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    if (btnOpenLeaderboard) {
      btnOpenLeaderboard.addEventListener('click', () => {
        if (window.leaderboardManager) {
          window.leaderboardManager.renderLeaderboardUI('leaderboard-table-container', 'completed');
        }
        if (this.modalLeaderboard) this.modalLeaderboard.classList.remove('hidden');
      });
    }
    if (btnCloseLeaderboard) {
      btnCloseLeaderboard.addEventListener('click', () => {
        if (this.modalLeaderboard) this.modalLeaderboard.classList.add('hidden');
      });
    }

    // Pestañas de filtrado de clasificaciones
    document.querySelectorAll('.tab-leaderboard').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-leaderboard').forEach(t => t.classList.remove('active', 'border-sky-400', 'text-sky-300'));
        e.currentTarget.classList.add('active', 'border-sky-400', 'text-sky-300');
        const filter = e.currentTarget.dataset.filter;
        if (window.leaderboardManager) {
          window.leaderboardManager.renderLeaderboardUI('leaderboard-table-container', filter);
        }
      });
    });

    // Modal Opciones y Personalización de Colores
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        if (window.paletteManager) {
          window.paletteManager.renderColorSettingsUI('color-pickers-list', () => {
            this.renderTubes();
          });
        }
        if (this.modalSettings) this.modalSettings.classList.remove('hidden');
      });
    }
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (this.modalSettings) this.modalSettings.classList.add('hidden');
      });
    }

    // Restablecer colores de paleta
    const btnResetColors = document.getElementById('btn-reset-palette-colors');
    if (btnResetColors) {
      btnResetColors.addEventListener('click', () => {
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

    // Modal Victoria: Siguiente Nivel y Ruleta
    const btnVicNext = document.getElementById('btn-vic-next');
    if (btnVicNext) {
      btnVicNext.addEventListener('click', () => {
        if (this.modalVictory) this.modalVictory.classList.add('hidden');
        this.loadLevel(this.currentLevel + 1);
      });
    }
    const btnVicRoulette = document.getElementById('btn-vic-roulette');
    if (btnVicRoulette) {
      btnVicRoulette.addEventListener('click', () => {
        if (this.modalVictory) this.modalVictory.classList.add('hidden');
        if (this.modalRoulette) this.modalRoulette.classList.remove('hidden');
        if (window.rouletteEngine) window.rouletteEngine.initRound();
        if (window.audio) window.audio.playMusic('roulette');
      });
    }

    // Salir de la ruleta sin girar
    const btnCashout = document.getElementById('btn-cashout-roulette');
    if (btnCashout) {
      btnCashout.addEventListener('click', () => {
        if (this.modalRoulette) this.modalRoulette.classList.add('hidden');
        if (window.audio) window.audio.playMusic('level');
        this.loadLevel(this.currentLevel + 1);
      });
    }

    // Selector de Color de Fondo
    const bgPicker = document.getElementById('bg-color-picker');
    if (bgPicker) {
      bgPicker.addEventListener('input', (e) => {
        document.body.style.backgroundColor = e.target.value;
      });
    }
    const btnResetBg = document.getElementById('btn-reset-bg');
    if (btnResetBg) {
      btnResetBg.addEventListener('click', () => {
        document.body.style.backgroundColor = '#0b1329';
        if (bgPicker) bgPicker.value = '#0b1329';
      });
    }

    // Cerrar modales con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = [this.modalMap, this.modalLeaderboard, this.modalSettings, this.modalHome, this.modalShop, this.modalRestartConfirm, this.modalTutorial, this.modalEditor];
        modals.forEach(m => m && m.classList.add('hidden'));
        if (window.audio && !this.isModalOpen()) {
          window.audio.playMusic('level');
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
    const timer = window.stateManager.getTimeToNextLife();

    if (this.livesCountText) {
      this.livesCountText.textContent = `${lives}/${maxLives}`;
    }

    if (this.livesHeartsDisplay) {
      this.livesHeartsDisplay.innerHTML = '';
      for (let i = 0; i < maxLives; i++) {
        if (i < lives) {
          this.livesHeartsDisplay.innerHTML += `
            <i data-lucide="heart" class="w-3.5 h-3.5 fill-rose-500 text-rose-500 heart-icon-full"></i>
          `;
        } else {
          this.livesHeartsDisplay.innerHTML += `
            <i data-lucide="heart" class="w-3.5 h-3.5 text-slate-600 heart-icon-empty"></i>
          `;
        }
      }
      if (window.lucide) lucide.createIcons();
    }

    if (this.livesTimerText) {
      if (timer && lives < maxLives) {
        this.livesTimerText.textContent = timer;
        this.livesTimerText.classList.remove('hidden');
      } else {
        this.livesTimerText.classList.add('hidden');
      }
    }
  }

  // --- MODAL DE CONFIRMACIÓN DE REINICIO CON SEED REROLL Y CONSUMO DE VIDA ---
  openRestartConfirmModal() {
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

    if (this.modalRestartConfirm) this.modalRestartConfirm.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeRestartConfirmModal() {
    if (this.modalRestartConfirm) this.modalRestartConfirm.classList.add('hidden');
  }

  confirmRestartLevel() {
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

    if (this.modalTutorial) this.modalTutorial.classList.remove('hidden');
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
                <text x="60" y="122" fill="#0f172a" font-size="14" font-weight="900" text-anchor="middle" class="demo-mystery-star">★</text>
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
              <text x="63" y="121" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">★</text>
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
        title: 'Cristal Frágil (3 Operaciones)',
        desc: 'Frasco de cristal templado inestable. Solo resiste un máximo de 3 operaciones de vertido o recepción antes de bloquearse definitivamente.',
        icon: 'shield-alert',
        svg: `
          <svg viewBox="0 0 220 160" class="w-full h-full">
            <g>
              <rect x="92" y="25" width="36" height="110" rx="14" fill="rgba(255,255,255,0.06)" stroke="#fb7185" stroke-width="2" stroke-dasharray="6,3"/>
              <rect x="95" y="103" width="30" height="28" rx="8" fill="#fb7185"/>
              <path d="M 98 40 L 108 55 L 102 70 L 115 85" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
              <rect x="80" y="12" width="60" height="18" rx="9" fill="#f43f5e"/>
              <text x="110" y="25" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">USOS: 3 / 3 🛡️</text>
            </g>
            <text x="110" y="152" fill="#fb7185" font-size="10" font-weight="bold" text-anchor="middle">Máximo 3 movimientos antes de romperse</text>
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
    if (btnNext) btnNext.disabled = currentIndex < 0 || currentIndex >= unlocked.length - 1;

    if (window.lucide) lucide.createIcons();
  }

  closeTutorialModal() {
    if (this.modalTutorial) this.modalTutorial.classList.add('hidden');
  }

  // --- TALLER DE CREACIÓN DE NIVELES (LEVEL EDITOR) ---
  initEditorWorkspace() {
    this.editorLevel.tubes = [
      { capacity: 4, liquids: [{ color: '#ef4444', name: 'Rojo', shape: '●', isMystery: false }, { color: '#3b82f6', name: 'Azul', shape: '▲', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, operationsRemaining: null },
      { capacity: 4, liquids: [{ color: '#3b82f6', name: 'Azul', shape: '▲', isMystery: false }, { color: '#ef4444', name: 'Rojo', shape: '●', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, operationsRemaining: null },
      { capacity: 4, liquids: [{ color: '#10b981', name: 'Verde', shape: '■', isMystery: false }], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, operationsRemaining: null },
      { capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: false, isFragile: false, operationsRemaining: null },
      { capacity: 4, liquids: [], isLocked: false, keyColor: null, isNarrow: false, isGlued: true, isFragile: false, operationsRemaining: null }
    ];
  }

  openEditorModal(tab = 'design') {
    this.switchEditorTab(tab);
    this.renderEditorBrushes();
    this.renderEditorTubes();
    this.updateEditorValidation();
    if (this.modalEditor) this.modalEditor.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeEditorModal() {
    if (this.modalEditor) this.modalEditor.classList.add('hidden');
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
        <option value="normal" ${!tube.isGlued && !tube.isLocked && !tube.isNarrow && !tube.isFragile ? 'selected' : ''}>Normal</option>
        <option value="glued" ${tube.isGlued ? 'selected' : ''}>Inamovible (Roca) 🪨</option>
        <option value="lock" ${tube.isLocked ? 'selected' : ''}>Candado 🔒</option>
        <option value="narrow" ${tube.isNarrow ? 'selected' : ''}>Estrecho 1x1</option>
        <option value="fragile" ${tube.isFragile ? 'selected' : ''}>Frágil 🛡️</option>
      `;
      selectType.onchange = (e) => {
        const val = e.target.value;
        tube.isGlued = (val === 'glued');
        tube.isLocked = (val === 'lock');
        tube.isNarrow = (val === 'narrow');
        tube.isFragile = (val === 'fragile');
        if (tube.isNarrow) tube.capacity = 1;
        if (tube.isFragile) tube.operationsRemaining = 3;
        this.editorLevel.hasBeenPassed = false;
        this.updateEditorValidation();
        this.renderEditorTubes();
      };
      card.appendChild(selectType);

      // Selector de capacidad (4 o 6)
      if (!tube.isNarrow) {
        const capBtn = document.createElement('button');
        capBtn.className = 'text-[10px] text-slate-400 hover:text-white font-mono underline';
        capBtn.textContent = `Capacidad: ${tube.capacity} (Cambiar)`;
        capBtn.onclick = () => {
          tube.capacity = tube.capacity === 4 ? 6 : 4;
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

  publishCustomLevel() {
    if (!this.editorLevel.hasBeenPassed) {
      alert('Debes ganar el nivel al menos una vez en Modo Prueba antes de publicarlo.');
      return;
    }

    const levelObj = {
      id: `custom_${Date.now()}`,
      name: this.editorLevel.name,
      creator: this.editorLevel.creator,
      tubes: JSON.parse(JSON.stringify(this.editorLevel.tubes)),
      createdAt: new Date().toLocaleDateString(),
      optimalMoves: 12
    };

    if (window.stateManager) {
      window.stateManager.saveCustomLevel(levelObj);
    }

    if (window.audio) window.audio.playWinFanfare();
    alert(`¡Éxito! Tu nivel '${levelObj.name}' creado por '${levelObj.creator}' ha sido publicado.`);
    this.switchEditorTab('saved');
  }

  renderSavedCustomLevels() {
    const listCont = document.getElementById('editor-saved-list');
    const countEl = document.getElementById('editor-saved-count');
    if (!listCont) return;
    listCont.innerHTML = '';

    const levels = window.stateManager ? window.stateManager.getCustomLevels() : [];
    if (countEl) countEl.textContent = levels.length;

    if (levels.length === 0) {
      listCont.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs">
          Aún no has publicado ningún nivel. ¡Diseña uno, supéralo y publícalo!
        </div>
      `;
      return;
    }

    levels.forEach(lvl => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-3';
      card.innerHTML = `
        <div>
          <h4 class="text-sm font-black text-white flex items-center gap-2">
            ${lvl.name}
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">${lvl.tubes.length} Frascos</span>
          </h4>
          <p class="text-xs text-slate-400">Por: <strong class="text-sky-300">${lvl.creator}</strong> • Publicado: ${lvl.createdAt || 'Reciente'}</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-interactive px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs" onclick="window.game.playPublishedCustomLevel('${lvl.id}')">
            Jugar
          </button>
          <button class="btn-interactive px-2 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-xl text-xs" onclick="window.game.deletePublishedCustomLevel('${lvl.id}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
      listCont.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  playPublishedCustomLevel(id) {
    const levels = window.stateManager ? window.stateManager.getCustomLevels() : [];
    const found = levels.find(l => l.id === id);
    if (!found) return;

    this.closeEditorModal();
    const customData = {
      level: 999,
      tubes: JSON.parse(JSON.stringify(found.tubes)),
      optimalMoves: found.optimalMoves || 14,
      mechanicTag: `Comunidad • ${found.creator}`,
      name: found.name,
      creator: found.creator
    };
    this.loadLevel(1, 0, customData);
  }

  deletePublishedCustomLevel(id) {
    if (confirm('¿Deseas eliminar este nivel personalizado?')) {
      if (window.stateManager) {
        window.stateManager.deleteCustomLevel(id);
        this.renderSavedCustomLevels();
      }
    }
  }

  openMapModal() {
    const levelsGrid = document.getElementById('levels-grid');
    if (!levelsGrid) return;
    levelsGrid.innerHTML = '';

    for (let i = 1; i <= this.maxLevels; i++) {
      const rec = window.leaderboardManager ? window.leaderboardManager.getRecord(i) : null;
      const isCurrent = i === this.currentLevel;
      const isDone = !!rec;

      const btn = document.createElement('button');
      btn.className = `p-2.5 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 ${
        isCurrent
          ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-300 scale-105'
          : isDone
          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700'
          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/60'
      }`;

      let starIcon = isDone ? '★'.repeat(rec.stars) : '•';
      btn.innerHTML = `
        <span class="text-sm">${i}</span>
        <span class="text-[9px] text-amber-400">${starIcon}</span>
      `;

      btn.addEventListener('click', () => {
        if (this.modalMap) this.modalMap.classList.add('hidden');
        if (window.audio) window.audio.playMusic('level');
        this.loadLevel(i);
      });

      levelsGrid.appendChild(btn);
    }

    if (this.modalMap) this.modalMap.classList.remove('hidden');
  }
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
  });
});

