/* ==========================================================================
   AQUASORT MASTER DELUXE - MINIGAME ENGINE (RULETA, DIANA Y DIANAS MÓVILES)
   - Ruleta: Multiplicadores directos en sectores, barra de timing con zona dorada
     reducida (8%) y jitter aleatorio (+-5%), toque en cualquier parte para girar.
   - Diana: Slingshot táctil desde cualquier posición de pantalla, tensión calibrada,
     tiro al centro 100% garantizado y viento real que desvía el vuelo.
   - Dianas Móviles: 3 dianas flotantes en movimiento continuo para ganar el bonus.
   - Cartas Alquímicas: Cajón colapsable para optimizar espacio en celulares.
   ========================================================================== */

class MinigameEngine {
  constructor() {
    this.currentMode = 'diana'; // 'diana' | 'moving_targets' | 'roulette'
    this.selectedFreeMode = 'random'; // 'roulette' | 'diana' | 'moving_targets' | 'random'
    this.currentBet = 0; // 0 | 25 | 50
    this.fromVictory = false;
    this.isTrainingMode = true;
    this.finalizeTimer = null;

    // --- CARTAS ALQUÍMICAS ---
    this.activeCard = null; // 'dianaFavor' | 'rouletteFavor' | 'doubleOrNothing' | 'calmAtmosphere'
    this.extraShotAvailable = false;
    this.calmAtmosphereBenefit = null; // 'noWind' | 'slowMeter' | 'extraShot'

    // --- RULETA (MULTIPLICADORES DIRECTOS Y TIMING ACTIVO) ---
    this.numSlices = 6;
    this.sliceAngle = 360 / this.numSlices; // 60 grados
    this.sliceValues = [];
    this.isSpinning = false;
    this.currentAngle = 0;

    // Oscilación de aguja de timing en ruleta
    this.timingPos = 0.5; // 0.0 a 1.0
    this.timingDirection = 1;
    this.timingSpeed = 0.95; // Ciclo ~1.1s
    this.timingActive = false;
    this.timingAnimId = null;
    this.lastTimingNow = 0;
    this.goldCenter = 0.50; // Jitter +-5% (0.45 a 0.55)
    this.goldWidth = 0.10;   // 10% en el centro (+2% sumado desde el azul)
    this.innerRedSpan = 0.05; // 5% de zona roja a izquierda y derecha del oro
    this.blueSpan = 0.19;     // 19% de zona azul a cada lado (-1% cedido al oro)

    // --- DIANA DE DARDOS (SLINGSHOT / RESORTE TÁCTIL) ---
    this.windSpeed = 2.8; // m/s
    this.windAngle = 45;  // grados
    this.isDartFlying = false;
    this.isDraggingSlingshot = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.currentDartPos = { x: 150, y: 315 };
    this.currentImpactPoint = { x: 150, y: 140 };
    this.isReverseShot = false;

    // --- DIANAS MÓVILES (3 DIANAS FLOTANTES EN MOVIMIENTO) ---
    this.movingTargets = [];
    this.movingTargetsAnimId = null;
    this.movingDartsLeft = 3;
    this.movingHitsCount = 0;

    // Elementos DOM
    this.wheelContainer = null;
    this.dianaContainer = null;
    this.movingContainer = null;
    this.wheelGroup = null;
    this.needleWrapper = null;
    this.timingNeedle = null;
    this.timingFeedbackLbl = null;
    this.btnSpin = null;
    this.dianaSvg = null;
    this.slingshotDart = null;
    this.slingshotBandLeft = null;
    this.slingshotBandRight = null;
    this.slingshotTrajectory = null;
    this.trajectoryAimDot = null;
    this._domInitialized = false;
    this.openTimestamp = 0;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initDOM());
    } else {
      setTimeout(() => this.initDOM(), 0);
    }
  }

  initDOM() {
    if (this._domInitialized) return;
    this._domInitialized = true;
    this.wheelContainer = document.getElementById('roulette-view');
    this.dianaContainer = document.getElementById('diana-view');
    this.movingContainer = document.getElementById('moving-targets-view');
    this.wheelGroup = document.getElementById('wheel-group');
    this.needleWrapper = document.getElementById('roulette-needle');
    this.timingNeedle = document.getElementById('timing-needle');
    this.timingFeedbackLbl = document.getElementById('timing-feedback-lbl');
    this.btnSpin = document.getElementById('btn-spin-wheel');

    this.dianaSvg = document.getElementById('diana-svg');
    this.slingshotDart = document.getElementById('slingshot-dart');
    this.slingshotBandLeft = document.getElementById('slingshot-band-left');
    this.slingshotBandRight = document.getElementById('slingshot-band-right');
    this.slingshotTrajectory = document.getElementById('slingshot-trajectory');
    this.trajectoryAimDot = document.getElementById('trajectory-aim-dot');

    this.setupModeTabs();
    this.setupBetButtons();
    this.setupCardsDrawerUI();
    this.setupRouletteEvents();
    this.setupSlingshotEvents();
    this.setupMovingTargetsEvents();
    this.initRound();
  }

  // Configuración del recuadro de apuesta en modo libre (0, 25, 50 monedas)
  setupBetButtons() {
    const betButtons = document.querySelectorAll('.btn-minigame-bet');
    betButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.fromVictory) return;
        const isMovingInProgress = (this.currentMode === 'moving_targets' && this.movingDartsLeft < (this.activeCard === 'movingSlow' ? 4 : 3) && !this.isRoundOver);
        if (this.isSpinning || this.isDartFlying || isMovingInProgress) return;

        const betVal = parseInt(btn.getAttribute('data-bet'), 10);
        if (isNaN(betVal)) return;

        const wallet = window.game ? window.game.getCoins() : 0;
        if (betVal > wallet) return;

        this.currentBet = betVal;
        if (window.audio) window.audio.playSelect();
        this.updateBetUI();
        this.resetBonusScoreboardUI();
      });
    });
  }

  updateBetUI() {
    const betBox = document.getElementById('minigame-bet-box');
    if (!betBox) return;

    const wallet = window.game ? window.game.getCoins() : 0;
    if (this.currentBet > wallet) {
      this.currentBet = 0;
    }

    const hintEl = document.getElementById('lbl-bet-mode-hint');
    if (hintEl) {
      if (this.currentBet === 0) {
        hintEl.textContent = 'Diversión (Sin riesgo)';
        hintEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      } else {
        hintEl.textContent = `Apostando ${this.currentBet} 🪙`;
        hintEl.className = 'text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse';
      }
    }

    const isMovingInProgress = (this.currentMode === 'moving_targets' && this.movingDartsLeft < 4 && !this.isRoundOver);
    const isBusy = this.isSpinning || this.isDartFlying || isMovingInProgress;

    const betButtons = document.querySelectorAll('.btn-minigame-bet');
    betButtons.forEach(btn => {
      const val = parseInt(btn.getAttribute('data-bet'), 10);
      const canAfford = (val === 0) || (wallet >= val);
      const isSelected = (this.currentBet === val);

      btn.disabled = !canAfford || isBusy;

      if (isSelected) {
        btn.className = 'btn-minigame-bet flex-1 py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-2 border-amber-300 shadow-md shadow-amber-500/25 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer scale-[1.02]';
      } else if (!canAfford) {
        btn.className = 'btn-minigame-bet flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-900/50 text-slate-600 border border-slate-800 transition-all flex flex-col items-center justify-center gap-0.5 opacity-45 cursor-not-allowed';
      } else {
        btn.className = 'btn-minigame-bet flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer';
      }
    });
  }

  // Inicializa o reinicia la ronda
  initRound() {
    if (this.fromVictory) {
      this.rollRandomMode();
    } else {
      if (this.selectedFreeMode === 'random') {
        const modes = ['roulette', 'diana', 'moving_targets'];
        const nextMode = modes[Math.floor(Math.random() * modes.length)];
        this.setMode(nextMode, false);
      } else {
        this.setMode(this.selectedFreeMode || 'roulette', false);
      }
    }
    this.shuffleSlices();
    this.generateNewWind();
    this.renderWheel();
    this.resetDianaTarget();
    this.resetMovingTargets();
    this.updateCardsUI();
    this.updateBetUI();
    this.updateRulesText();
    this.updateTrainingModeUI();
    this.resetBonusScoreboardUI();
    const touchHint = document.getElementById('roulette-touch-hint');
    if (touchHint) touchHint.classList.remove('hidden');
    if (this.currentMode === 'roulette') {
      this.startTimingBar();
    }
  }

  // Selección aleatoria desde la bolsa alquímica
  rollRandomMode() {
    if (!window.stateManager) {
      const modes = ['diana', 'roulette', 'moving_targets'];
      this.setMode(modes[Math.floor(Math.random() * modes.length)], true);
      return;
    }

    const drawResult = window.stateManager.drawMinigameToken();
    this.lastBagDraw = drawResult;
    this.setMode(drawResult.chosen, true, drawResult);
    this.updateBagIndicatorUI(drawResult);
  }

  setMode(mode, fromRandom = false, bagInfo = null) {
    this.currentMode = mode;
    const tabRoulette = document.getElementById('tab-game-roulette');
    const tabDiana = document.getElementById('tab-game-diana');
    const tabMoving = document.getElementById('tab-game-moving');
    const titleEl = document.getElementById('minigame-title');
    const bannerEl = document.getElementById('minigame-assigned-banner');

    const defaultTabClass = 'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all text-center';
    const activeRouletteClass = 'flex-1 py-1.5 px-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md transition-all text-center';
    const activeDianaClass = 'flex-1 py-1.5 px-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md transition-all text-center';
    const activeMovingClass = 'flex-1 py-1.5 px-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md transition-all text-center';

    if (tabRoulette) tabRoulette.className = defaultTabClass;
    if (tabDiana) tabDiana.className = defaultTabClass;
    if (tabMoving) tabMoving.className = defaultTabClass;

    if (this.wheelContainer) this.wheelContainer.classList.add('hidden');
    if (this.dianaContainer) this.dianaContainer.classList.add('hidden');
    if (this.movingContainer) this.movingContainer.classList.add('hidden');
    this.stopTimingBar();
    this.stopMovingTargetsAnim();

    if (mode === 'roulette') {
      if (tabRoulette) tabRoulette.className = activeRouletteClass;
      if (this.wheelContainer) this.wheelContainer.classList.remove('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="disc" class="w-5 h-5 text-amber-400"></i> Ruleta de la Fortuna';
      if (bannerEl && fromRandom) {
        bannerEl.innerHTML = '🎲 ¡Extraído de la Bolsa: <strong>Ruleta Alquímica</strong>!';
      }
      this.startTimingBar();
    } else if (mode === 'moving_targets') {
      if (tabMoving) tabMoving.className = activeMovingClass;
      if (this.movingContainer) this.movingContainer.classList.remove('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="crosshair" class="w-5 h-5 text-purple-400"></i> Tiro al Blanco Móvil';
      if (bannerEl && fromRandom) {
        bannerEl.innerHTML = '🎲 ¡Extraído de la Bolsa: <strong>Tiro al Blanco</strong>!';
      }
      this.startMovingTargetsAnim();
      if (window.audio && fromRandom) window.audio.playWindGust();
    } else {
      if (tabDiana) tabDiana.className = activeDianaClass;
      if (this.dianaContainer) this.dianaContainer.classList.remove('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="target" class="w-5 h-5 text-sky-400"></i> Diana de Dardos Clásica';
      if (bannerEl && fromRandom) {
        bannerEl.innerHTML = '🎲 ¡Extraído de la Bolsa: <strong>Diana de Dardos</strong>!';
      }
      if (window.audio && fromRandom) window.audio.playWindGust();
    }

    if (window.lucide) window.lucide.createIcons();
    this.updateRulesText();
  }

  updateBagIndicatorUI(drawInfo = null) {
    const bag = window.stateManager ? window.stateManager.getMinigameBag() : null;
    if (!bag) return;

    const dianaCount = drawInfo ? drawInfo.remainingDiana : bag.tokens.filter(t => t === 'diana').length;
    const movingCount = drawInfo && typeof drawInfo.remainingMoving === 'number'
      ? drawInfo.remainingMoving
      : bag.tokens.filter(t => t === 'moving_targets').length;
    const rouletteCount = drawInfo ? drawInfo.remainingRoulette : bag.tokens.filter(t => t === 'roulette').length;

    const elDiana = document.getElementById('bag-count-diana');
    const elMoving = document.getElementById('bag-count-moving');
    const elRoulette = document.getElementById('bag-count-roulette');
    if (elDiana) elDiana.textContent = `🎯 ${dianaCount}`;
    if (elMoving) elMoving.textContent = `🎪 ${movingCount}`;
    if (elRoulette) elRoulette.textContent = `🎡 ${rouletteCount}`;
  }

  // --- ACORDEÓN / CAJÓN DE CARTAS ALQUÍMICAS ---
  setupCardsDrawerUI() {
    const btnToggle = document.getElementById('btn-toggle-cards-drawer');
    const drawerBody = document.getElementById('alchemy-cards-drawer-body');
    const drawerArrow = document.getElementById('cards-drawer-arrow');

    if (btnToggle && drawerBody) {
      btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = drawerBody.classList.contains('drawer-collapsed');
        if (isCollapsed) {
          drawerBody.classList.remove('drawer-collapsed');
          if (drawerArrow) drawerArrow.textContent = '▲';
        } else {
          drawerBody.classList.add('drawer-collapsed');
          if (drawerArrow) drawerArrow.textContent = '▼';
        }
      });
    }

    document.querySelectorAll('.btn-alchemy-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = e.currentTarget.getAttribute('data-card');
        this.toggleCard(cardId);
      });
    });
  }

  toggleCard(cardId) {
    const isMovingInProgress = (this.currentMode === 'moving_targets' && this.movingDartsLeft < 3 && !this.isRoundOver);
    if (this.isSpinning || this.isDartFlying || isMovingInProgress) return;
    if (window.audio) window.audio.init();

    const stateMgr = window.stateManager;
    if (!stateMgr) return;
    const bag = stateMgr.getMinigameBag();

    const isFavorCard = (cardId === 'dianaFavor' || cardId === 'rouletteFavor' || cardId === 'movingFavor');

    // Comprobar si ya está activa para desactivar
    if (this.activeCard === cardId || (bag && bag.activeCard === cardId)) {
      if (isFavorCard) {
        stateMgr.deactivateBonusFavorCard();
        if (window.audio) window.audio.playSelect();
        this.updateCardsUI();
        this.updateBagIndicatorUI();
        return;
      }
      this.activeCard = null;
      this.calmAtmosphereBenefit = null;
      this.extraShotAvailable = false;
      if (window.audio) window.audio.playSelect();
      this.shuffleSlices();
      this.generateNewWind();
      this.renderWheel();
      this.resetDianaTarget();
      this.resetMovingTargets();
      this.updateCardsUI();
      this.updateRulesText();
      if (this.currentMode === 'roulette') this.startTimingBar();
      if (this.currentMode === 'moving_targets') this.startMovingTargetsAnim();
      return;
    }

    // Verificar si el jugador tiene la carta en inventario
    const cards = stateMgr.getCards();
    if (!cards[cardId] || cards[cardId] <= 0) {
      alert('No dispones de esta carta en tu inventario. Puedes adquirirla por 50 🪙 en la Tienda del Alquimista.');
      return;
    }

    if (isFavorCard) {
      const act = stateMgr.activateBonusFavorCard(cardId, 5);
      if (act.success) {
        if (window.audio) window.audio.playUnlock();
        this.updateCardsUI();
        this.updateBagIndicatorUI();
      }
      return;
    }

    stateMgr.consumeCard(cardId);
    this.activeCard = cardId;
    if (window.audio) window.audio.playUnlock();

    if (cardId === 'doubleOrNothing') {
      this.shuffleSlices();
      this.renderWheel();
    } else if (cardId === 'goldenEye') {
      this.startTimingBar();
    } else if (cardId === 'calmAtmosphere') {
      this.windSpeed = 0.0;
      this.windAngle = 0;
      this.updateBreezeVisual();
      this.resetDianaTarget();
    } else if (cardId === 'trajectorySight') {
      this.resetDianaTarget();
    } else if (cardId === 'movingSlow') {
      this.resetMovingTargets();
      this.startMovingTargetsAnim();
    }

    this.updateCardsUI();
    this.updateRulesText();
  }

  updateCardsUI() {
    const stateMgr = window.stateManager;
    const cards = stateMgr ? stateMgr.getCards() : {};
    const bag = stateMgr ? stateMgr.getMinigameBag() : null;
    const pill = document.getElementById('active-card-pill');
    const countBadge = document.getElementById('lbl-cards-available-count');
    const favorStatusLbl = document.getElementById('lbl-active-favor-status');

    let applicableAvailable = 0;
    document.querySelectorAll('.btn-alchemy-card').forEach(btn => {
      const cardId = btn.getAttribute('data-card');
      const cardMinigame = btn.getAttribute('data-minigame');
      const countEl = btn.querySelector('.card-count');
      const count = cards[cardId] || 0;
      if (countEl) countEl.textContent = `x${count}`;

      // En Modo Historia: mostrar solo las cartas aplicables al minijuego actual + las 3 cartas de probabilidad (favor)
      const isApplicable = !cardMinigame || cardMinigame === 'favor' || cardMinigame === this.currentMode;
      if (isApplicable) {
        btn.classList.remove('hidden');
        applicableAvailable += count;
      } else {
        btn.classList.add('hidden');
      }

      const isBagActive = (bag && bag.activeCard === cardId && bag.cardUsesRemaining > 0);
      const isRoundActive = (this.activeCard === cardId);

      if (isBagActive || isRoundActive) {
        btn.classList.add('active-card');
      } else {
        btn.classList.remove('active-card');
      }
    });

    if (countBadge) {
      countBadge.textContent = `(${applicableAvailable} aplicables)`;
    }

    if (favorStatusLbl) {
      if (bag && bag.activeCard === 'dianaFavor' && bag.cardUsesRemaining > 0) {
        favorStatusLbl.textContent = `🎯 90% Diana (${bag.cardUsesRemaining}/5)`;
      } else if (bag && bag.activeCard === 'rouletteFavor' && bag.cardUsesRemaining > 0) {
        favorStatusLbl.textContent = `🎡 90% Ruleta (${bag.cardUsesRemaining}/5)`;
      } else if (bag && bag.activeCard === 'movingFavor' && bag.cardUsesRemaining > 0) {
        favorStatusLbl.textContent = `🎪 90% Móvil (${bag.cardUsesRemaining}/5)`;
      } else {
        favorStatusLbl.textContent = 'Sin favor activo';
      }
    }

    if (pill) {
      if (this.activeCard === 'doubleOrNothing') {
        pill.textContent = '⚡ Doble o Nada (x2)';
        pill.className = 'text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400';
      } else if (this.activeCard === 'goldenEye') {
        pill.textContent = '👁️ Ojo de Oro (Zona x2)';
        pill.className = 'text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400';
      } else if (this.activeCard === 'calmAtmosphere') {
        pill.textContent = '🍃 Sin Viento (0.0 m/s)';
        pill.className = 'text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400';
      } else if (this.activeCard === 'trajectorySight') {
        pill.textContent = '🔮 Guía Parábola Activa';
        pill.className = 'text-[10px] text-purple-300 font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400';
      } else if (this.activeCard === 'movingSlow') {
        pill.textContent = '⏳ Foco Móvil Activo';
        pill.className = 'text-[10px] text-purple-300 font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400';
      } else if (bag && bag.activeCard === 'dianaFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `🎯 90% Diana (${bag.cardUsesRemaining})`;
        pill.className = 'text-[10px] text-sky-300 font-bold px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 animate-pulse';
      } else if (bag && bag.activeCard === 'rouletteFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `🎡 90% Ruleta (${bag.cardUsesRemaining})`;
        pill.className = 'text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 animate-pulse';
      } else if (bag && bag.activeCard === 'movingFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `🎪 90% Móvil (${bag.cardUsesRemaining})`;
        pill.className = 'text-[10px] text-purple-300 font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 animate-pulse';
      } else {
        pill.textContent = '🃏 Toca para activar';
        pill.className = 'text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30';
      }
    }
  }

  // --- RULETA: SECTORES POR COLOR DISTRIBUIDOS ALEATORIAMENTE (11 PORCIONES) ---
  // Mantiene exactamente las proporciones reales pero divididas en ~10% y sólo con color:
  // • Negro  (-100% -> 💰x 0):  5% total = 1 porción de 5% (18°)
  // • Rojo   (-50%  -> 💰/ 2): 10% total = 1 porción de 10% (36°)
  // • Azul   (0%    -> 💰x 1): 40% total = 4 porciones de 10% (36° c/u)
  // • Verde  (2x    -> 💰x 2): 30% total = 3 porciones de 10% (36° c/u)
  // • Dorado (3x    -> 💰x 3): 15% total = 2 porciones de 7.5% (27° c/u)
  shuffleSlices() {
    const isDouble = (this.activeCard === 'doubleOrNothing');
    const pool = [
      // 1x Negro (5% = 18°) -> 💰x 0 (-100%)
      { id: 'skull_1', type: 'skull', label: '💰x 0', value: -1.0, spanDeg: 18, hex: '#09090b', isWin: false, isNegative: true },
      // 1x Rojo (10% = 36°) -> 💰/ 2 (-50%)
      { id: 'half_1', type: 'half', label: '💰/ 2', value: -0.5, spanDeg: 36, hex: '#dc2626', isWin: false, isNegative: true },
      // 4x Azul (4 x 10% = 40% = 144°) -> 💰x 1 (mantiene el monto)
      { id: 'keep_1', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
      { id: 'keep_2', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
      { id: 'keep_3', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
      { id: 'keep_4', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
      // 3x Verde (3 x 10% = 30% = 108°) -> 💰x 2 (duplica)
      { id: 'double_1', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
      { id: 'double_2', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
      { id: 'double_3', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
      // 2x Dorado (2 x 7.5% = 15% = 54°) -> 💰x 3 (triplica)
      { id: 'triple_1', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 27, hex: '#eab308', isWin: true, isNegative: false },
      { id: 'triple_2', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 27, hex: '#eab308', isWin: true, isNegative: false }
    ];

    const distributed = this.distributeSlicesAvoidingAdjacents(pool);
    this.assignSliceAngles(distributed);
    this.updateRouletteLegendUI(false);
    this.currentAngle = Math.floor(Math.random() * 360);
  }

  // Distribuye aleatoriamente las porciones evitando que queden pegadas dos del mismo color siempre que sea posible
  distributeSlicesAvoidingAdjacents(pool) {
    let bestOrder = [...pool];
    let bestConflicts = Infinity;

    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = [...pool];
      for (let i = candidate.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
      }

      let conflicts = 0;
      for (let i = 0; i < candidate.length; i++) {
        const next = candidate[(i + 1) % candidate.length];
        if (candidate[i].type === next.type) conflicts++;
      }

      if (conflicts === 0) {
        return candidate;
      }
      if (conflicts < bestConflicts) {
        bestConflicts = conflicts;
        bestOrder = candidate;
      }
    }
    return bestOrder;
  }

  assignSliceAngles(slices) {
    let cumDeg = 0;
    slices.forEach((s) => {
      s.startDeg = cumDeg;
      s.endDeg = cumDeg + s.spanDeg;
      cumDeg = s.endDeg;
    });
    this.sliceValues = slices;
    this.numSlices = slices.length;
  }

  updateRouletteLegendUI(isPerfectGold = false) {
    const legendEl = document.getElementById('roulette-sectors-legend');
    if (!legendEl) return;
    const isDouble = (this.activeCard === 'doubleOrNothing');
    const lblKeep = isDouble ? '💰x 2' : '💰x 1';
    const lblDouble = isDouble ? '💰x 4' : '💰x 2';
    const lblTriple = isDouble ? '💰x 6' : '💰x 3';

    if (isPerfectGold) {
      legendEl.className = 'grid grid-cols-3 gap-1.5 text-center font-black text-[11px]';
      legendEl.innerHTML = `
        <span class="py-1 px-1.5 rounded-lg bg-blue-600/35 text-sky-200 border border-blue-400/60" title="Azul: mantiene el monto">${lblKeep}</span>
        <span class="py-1 px-1.5 rounded-lg bg-emerald-600/35 text-emerald-200 border border-emerald-400/60" title="Verde: duplica el pozo">${lblDouble}</span>
        <span class="py-1 px-1.5 rounded-lg bg-amber-500/35 text-amber-200 border border-amber-400/70 animate-pulse" title="Dorado: triplica el pozo">${lblTriple}</span>
      `;
    } else {
      legendEl.className = 'grid grid-cols-5 gap-1 text-center font-black text-[10px] sm:text-[11px]';
      legendEl.innerHTML = `
        <span class="py-1 px-1 rounded-lg bg-zinc-950 text-white border border-slate-600 shadow-inner" title="Negro: pierde el 100% del pozo">💰x 0</span>
        <span class="py-1 px-1 rounded-lg bg-red-600/35 text-red-200 border border-red-500/60" title="Rojo: resta el 50% del pozo">💰/ 2</span>
        <span class="py-1 px-1 rounded-lg bg-blue-600/35 text-sky-200 border border-blue-400/60" title="Azul: mantiene el monto">${lblKeep}</span>
        <span class="py-1 px-1 rounded-lg bg-emerald-600/35 text-emerald-200 border border-emerald-400/60" title="Verde: duplica el pozo">${lblDouble}</span>
        <span class="py-1 px-1 rounded-lg bg-amber-500/35 text-amber-200 border border-amber-400/70" title="Dorado: triplica el pozo">${lblTriple}</span>
      `;
    }
  }

  setupModeTabs() {
    const tabRoulette = document.getElementById('tab-game-roulette');
    const tabDiana = document.getElementById('tab-game-diana');
    const tabMoving = document.getElementById('tab-game-moving');

    const handleTabClick = (mode) => {
      if (this.fromVictory) return; // En Modo Historia no se puede elegir el minijuego
      this.setMode(mode, false);
    };

    if (tabRoulette) tabRoulette.addEventListener('click', () => handleTabClick('roulette'));
    if (tabDiana) tabDiana.addEventListener('click', () => handleTabClick('diana'));
    if (tabMoving) tabMoving.addEventListener('click', () => handleTabClick('moving_targets'));
  }

  getWindDirectionArrow(deg) {
    if (deg >= 337.5 || deg < 22.5) return '➡️ Este';
    if (deg >= 22.5 && deg < 67.5) return '↘️ Sureste';
    if (deg >= 67.5 && deg < 112.5) return '⬇️ Sur';
    if (deg >= 112.5 && deg < 157.5) return '↙️ Suroeste';
    if (deg >= 157.5 && deg < 202.5) return '⬅️ Oeste';
    if (deg >= 202.5 && deg < 247.5) return '↖️ Noroeste';
    if (deg >= 247.5 && deg < 292.5) return '⬆️ Norte';
    return '↗️ Noreste';
  }

  updateRulesText() {
    const subLbl = document.getElementById('lbl-roulette-odds');
    if (!subLbl) return;

    if (this.currentMode === 'roulette') {
      subLbl.innerHTML = `🎡 Clava la aguja en la <strong>Zona Oro</strong> para eliminar <strong>Negro</strong> y <strong>Rojo</strong> • ¡Toca para girar!`;
    } else if (this.currentMode === 'moving_targets') {
      subLbl.innerHTML = `🎪 <strong>Tiro al Blanco:</strong> Anticipa el movimiento • <strong>1🎯=x1</strong> • <strong>2🎯=x2</strong> • <strong>3🎯=x3</strong> (0🎯 pierde el pozo)`;
    } else {
      const currentLvl = window.game ? (window.game.currentLevel || 1) : 1;
      const isSec1 = currentLvl <= 10;
      const hasCard = (this.activeCard === 'trajectorySight');

      let windNote = this.windSpeed <= 0.1
        ? ' • <span class="text-emerald-400 font-bold">¡Viento en calma total!</span>'
        : ` • <span class="text-sky-300 font-bold">Viento: ${this.windSpeed} m/s (${this.getWindDirectionArrow(this.windAngle)})</span>`;
      
      let trajNote = '';
      if (!isSec1) {
        trajNote = hasCard
          ? ' • <span class="text-purple-300 font-bold">👁️ Parábola activa *(Sin viento)*</span>'
          : ' • <span class="text-amber-300/80 font-bold">⚠️ Guía oculta (Tiro a ciegas)</span>';
      }

      subLbl.innerHTML = `🎯 <strong>Diana:</strong> Centro <strong>x3.0</strong> (Fuera pierde el pozo)${windNote}${trajNote}`;
    }
  }

  renderWheel() {
    if (!this.wheelGroup) return;
    this.wheelGroup.innerHTML = '';

    const cx = 150;
    const cy = 150;
    const radius = 130;

    for (let i = 0; i < this.sliceValues.length; i++) {
      const slice = this.sliceValues[i];
      const startDeg = slice.startDeg;
      const endDeg = slice.endDeg;
      const spanDeg = slice.spanDeg || (endDeg - startDeg);
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArcFlag = spanDeg > 180 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', slice.hex);
      path.setAttribute('stroke', '#0f172a');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('class', 'roulette-slice');
      path.setAttribute('id', `slice-${i}`);
      path.dataset.index = i;
      this.wheelGroup.appendChild(path);

      // En la rueda solo se dejan los colores puros (los multiplicadores se leen en las referencias de color inferiores)
      const peg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      peg.setAttribute('cx', x1);
      peg.setAttribute('cy', y1);
      peg.setAttribute('r', '5.5');
      peg.setAttribute('fill', 'url(#gold-peg-grad)');
      peg.setAttribute('stroke', '#ffffff');
      peg.setAttribute('stroke-width', '1.5');
      peg.setAttribute('class', 'roulette-peg');
      peg.setAttribute('id', `peg-${i}`);
      this.wheelGroup.appendChild(peg);
    }
  }

  // --- BARRA DE TIMING ACTIVO (ZONA DORADA 10% FLANQUEADA POR 5% ROJO INTERNO Y 19% AZUL) ---
  startTimingBar() {
    this.stopTimingBar();
    this.timingActive = true;
    this.timingPos = 0.5;
    this.timingDirection = 1;
    this.lastTimingNow = performance.now();

    // Jitter aleatorio de +-5% respecto del centro
    this.goldCenter = 0.50 + ((Math.random() - 0.5) * 0.10);
    // Carta Ojo de Oro duplica el margen del tiro perfecto y ralentiza la aguja
    const isEyeActive = (this.activeCard === 'goldenEye');
    this.goldWidth = isEyeActive ? 0.20 : 0.10;
    this.innerRedSpan = 0.05;
    this.blueSpan = 0.19;
    this.timingSpeed = isEyeActive ? 0.55 : 0.95;

    // Actualizar ancho y posición de las 7 zonas en el medidor
    this.updateTimingMeterSegments();

    if (this.timingNeedle) {
      this.timingNeedle.classList.remove('locked-gold', 'locked-red');
      this.timingNeedle.style.left = '50%';
    }
    if (this.timingFeedbackLbl) {
      this.timingFeedbackLbl.innerHTML = '¡Toca en <strong>CUALQUIER LUGAR</strong> de la pantalla para frenar la aguja en el centro!';
      this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-amber-300 mt-1 min-h-[16px] animate-pulse';
    }

    const loop = (now) => {
      if (!this.timingActive) return;
      const dt = Math.min((now - this.lastTimingNow) / 1000, 0.1);
      this.lastTimingNow = now;

      this.timingPos += this.timingDirection * this.timingSpeed * dt;
      if (this.timingPos >= 1) {
        this.timingPos = 1;
        this.timingDirection = -1;
      } else if (this.timingPos <= 0) {
        this.timingPos = 0;
        this.timingDirection = 1;
      }

      if (this.timingNeedle) {
        this.timingNeedle.style.left = `${this.timingPos * 100}%`;
      }

      this.timingAnimId = requestAnimationFrame(loop);
    };

    this.timingAnimId = requestAnimationFrame(loop);
  }

  updateTimingMeterSegments() {
    const innerRedSpan = this.innerRedSpan || 0.05;
    const blueSpan = this.blueSpan || 0.19;

    const goldMin = Math.max(0.28, this.goldCenter - (this.goldWidth / 2));
    const goldMax = Math.min(0.72, this.goldCenter + (this.goldWidth / 2));

    const innerRedLeftMin = Math.max(0.21, goldMin - innerRedSpan);
    const innerRedRightMax = Math.min(0.79, goldMax + innerRedSpan);

    const blueLeftMin = Math.max(0.02, innerRedLeftMin - blueSpan);
    const blueRightMax = Math.min(0.98, innerRedRightMax + blueSpan);

    const redLeftWidth = blueLeftMin;
    const blueLeftWidth = innerRedLeftMin - blueLeftMin;
    const innerRedLeftWidth = goldMin - innerRedLeftMin;
    const goldWidthActual = goldMax - goldMin;
    const innerRedRightWidth = innerRedRightMax - goldMax;
    const blueRightWidth = blueRightMax - innerRedRightMax;
    const redRightWidth = 1.0 - blueRightMax;

    const zRedLeft = document.getElementById('timing-zone-red-left');
    const zBlueLeft = document.getElementById('timing-zone-blue-left');
    const zRedInnerLeft = document.getElementById('timing-zone-red-inner-left');
    const zGold = document.getElementById('timing-zone-gold');
    const zRedInnerRight = document.getElementById('timing-zone-red-inner-right');
    const zBlueRight = document.getElementById('timing-zone-blue-right');
    const zRedRight = document.getElementById('timing-zone-red-right');

    if (zRedLeft) zRedLeft.style.width = `${redLeftWidth * 100}%`;
    if (zBlueLeft) zBlueLeft.style.width = `${blueLeftWidth * 100}%`;
    if (zRedInnerLeft) zRedInnerLeft.style.width = `${innerRedLeftWidth * 100}%`;
    if (zGold) zGold.style.width = `${goldWidthActual * 100}%`;
    if (zRedInnerRight) zRedInnerRight.style.width = `${innerRedRightWidth * 100}%`;
    if (zBlueRight) zBlueRight.style.width = `${blueRightWidth * 100}%`;
    if (zRedRight) zRedRight.style.width = `${redRightWidth * 100}%`;
  }

  stopTimingBar() {
    this.timingActive = false;
    if (this.timingAnimId) {
      cancelAnimationFrame(this.timingAnimId);
      this.timingAnimId = null;
    }
  }

  setupRouletteEvents() {
    // Botón directo ¡GIRAR!
    if (this.btnSpin) {
      this.btnSpin.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSpinning || !this.timingActive) return;
        this.onSpinButtonClicked();
      });
    }

    // Permitir presionar en CUALQUIER PARTE de la pantalla o del modal para frenar la aguja
    if (this.wheelContainer) {
      this.wheelContainer.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.target.closest('#alchemy-cards-drawer') || e.target.closest('#tab-minigame-selector')) {
          return;
        }
        if (this.openTimestamp && (Date.now() - this.openTimestamp < 400)) {
          return;
        }
        if (this.timingActive && !this.isSpinning) {
          this.onSpinButtonClicked();
        }
      });
    }
  }

  onSpinButtonClicked() {
    this.stopTimingBar();
    const touchHint = document.getElementById('roulette-touch-hint');
    if (touchHint) touchHint.classList.add('hidden');
    const pos = this.timingPos;

    const innerRedSpan = this.innerRedSpan || 0.05;
    const blueSpan = this.blueSpan || 0.19;

    const goldMin = Math.max(0.28, this.goldCenter - (this.goldWidth / 2));
    const goldMax = Math.min(0.72, this.goldCenter + (this.goldWidth / 2));
    const innerRedLeftMin = Math.max(0.21, goldMin - innerRedSpan);
    const innerRedRightMax = Math.min(0.79, goldMax + innerRedSpan);
    const blueLeftMin = Math.max(0.02, innerRedLeftMin - blueSpan);
    const blueRightMax = Math.min(0.98, innerRedRightMax + blueSpan);

    let timingResult = 'fail';
    if (pos >= goldMin && pos <= goldMax) {
      timingResult = 'perfect';
    } else if ((pos >= blueLeftMin && pos < innerRedLeftMin) || (pos > innerRedRightMax && pos <= blueRightMax)) {
      timingResult = 'normal';
    } else {
      timingResult = 'fail';
    }

    if (timingResult === 'perfect') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-gold');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⭐ <strong class="text-amber-300">¡TIRO PERFECTO!</strong> Eliminados Negro y Rojo • Más sectores Dorados y Verdes ⭐';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-amber-300 mt-1 min-h-[16px] animate-pulse';
      }
      
      // Animación especial al acertar al centro ANTES de girar la ruleta
      this.triggerPerfectCelebration("¡TIRO PERFECTO! 🌟", "¡Eliminados 💰x 0 y 💰/ 2! Mayor probabilidad de 💰x 3");

      // Al acertar en Zona Oro: se eliminan Negro y Rojo y se redistribuye en 10 porciones:
      // • Azul   (💰x 1, 25% total = 90°) : 3 porciones de 30° c/u
      // • Verde  (💰x 2, 30% total = 108°): 3 porciones de 36° c/u
      // • Dorado (💰x 3, 45% total = 162°): 4 porciones de 40.5° c/u
      const isDouble = (this.activeCard === 'doubleOrNothing');
      const goldPool = [
        // 3x Azul (25% total = 90°)
        { id: 'keep_g1', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 30, hex: '#2563eb', isWin: true, isNegative: false },
        { id: 'keep_g2', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 30, hex: '#2563eb', isWin: true, isNegative: false },
        { id: 'keep_g3', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 30, hex: '#2563eb', isWin: true, isNegative: false },
        // 3x Verde (30% total = 108°)
        { id: 'double_g1', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
        { id: 'double_g2', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
        { id: 'double_g3', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 36, hex: '#16a34a', isWin: true, isNegative: false },
        // 4x Dorado (45% total = 162°)
        { id: 'triple_g1', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 40.5, hex: '#eab308', isWin: true, isNegative: false },
        { id: 'triple_g2', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 40.5, hex: '#eab308', isWin: true, isNegative: false },
        { id: 'triple_g3', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 40.5, hex: '#eab308', isWin: true, isNegative: false },
        { id: 'triple_g4', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 40.5, hex: '#eab308', isWin: true, isNegative: false }
      ];
      const distributedGold = this.distributeSlicesAvoidingAdjacents(goldPool);
      this.assignSliceAngles(distributedGold);
      this.updateRouletteLegendUI(true);
      this.renderWheel();
    } else if (timingResult === 'fail') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-red');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⚠️ <strong class="text-rose-400">Zona Roja:</strong> +5% a cada sector negativo (-5% a 💰x 2 y 💰x 3) ⚠️';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-rose-400 mt-1 min-h-[16px]';
      }
      if (window.audio) window.audio.playFailSound();

      // Al caer en Zona Roja: cada sector negativo aumenta +5% (+10% en total),
      // restándole -5% a 💰x 2 (Verde) y -5% a 💰x 3 (Dorado):
      // • Negro  (💰x 0, 10% total = 36°) : 2 porciones de 18° c/u (5% c/u)
      // • Rojo   (💰/ 2, 15% total = 54°) : 2 porciones de 27° c/u (7.5% c/u)
      // • Azul   (💰x 1, 40% total = 144°): 4 porciones de 36° c/u (10% c/u)
      // • Verde  (💰x 2, 25% total = 90°) : 3 porciones de 30° c/u (8.33% c/u)
      // • Dorado (💰x 3, 10% total = 36°) : 1 porción de 36° (10%)
      const isDouble = (this.activeCard === 'doubleOrNothing');
      const failPool = [
        // 2x Negro (10% total = 36°)
        { id: 'bankrupt_f1', type: 'bankrupt', label: '💰x 0', value: -1.0, spanDeg: 18, hex: '#09090b', isWin: false, isNegative: true },
        { id: 'bankrupt_f2', type: 'bankrupt', label: '💰x 0', value: -1.0, spanDeg: 18, hex: '#09090b', isWin: false, isNegative: true },
        // 2x Rojo (15% total = 54°)
        { id: 'half_loss_f1', type: 'half_loss', label: isDouble ? '💰x 0' : '💰/ 2', value: isDouble ? -1.0 : -0.5, spanDeg: 27, hex: '#dc2626', isWin: false, isNegative: true },
        { id: 'half_loss_f2', type: 'half_loss', label: isDouble ? '💰x 0' : '💰/ 2', value: isDouble ? -1.0 : -0.5, spanDeg: 27, hex: '#dc2626', isWin: false, isNegative: true },
        // 4x Azul (40% total = 144°)
        { id: 'keep_f1', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
        { id: 'keep_f2', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
        { id: 'keep_f3', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
        { id: 'keep_f4', type: 'keep', label: isDouble ? '💰x 2' : '💰x 1', value: isDouble ? 2.0 : 1.0, spanDeg: 36, hex: '#2563eb', isWin: true, isNegative: false },
        // 3x Verde (25% total = 90°)
        { id: 'double_f1', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 30, hex: '#16a34a', isWin: true, isNegative: false },
        { id: 'double_f2', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 30, hex: '#16a34a', isWin: true, isNegative: false },
        { id: 'double_f3', type: 'double', label: isDouble ? '💰x 4' : '💰x 2', value: isDouble ? 4.0 : 2.0, spanDeg: 30, hex: '#16a34a', isWin: true, isNegative: false },
        // 1x Dorado (10% total = 36°)
        { id: 'triple_f1', type: 'triple', label: isDouble ? '💰x 6' : '💰x 3', value: isDouble ? 6.0 : 3.0, spanDeg: 36, hex: '#eab308', isWin: true, isNegative: false }
      ];
      const distributedFail = this.distributeSlicesAvoidingAdjacents(failPool);
      this.assignSliceAngles(distributedFail);
      this.renderWheel();
    } else {
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '🎯 <strong class="text-sky-300">Tiro Estándar:</strong> giro sin penalización';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-sky-300 mt-1 min-h-[16px]';
      }
      if (window.audio) window.audio.playSelect();
    }

    this.spinWheelWithTiming(timingResult);
  }

  getSliceIndexAtWheelAngle(wheelAngle) {
    const eff = ((270 - (wheelAngle % 360)) % 360 + 360) % 360;
    for (let i = 0; i < this.sliceValues.length; i++) {
      const s = this.sliceValues[i];
      if (eff >= s.startDeg && eff < s.endDeg) {
        return i;
      }
    }
    return 0;
  }

  spinWheelWithTiming(timingResult) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    if (this.btnSpin) this.btnSpin.disabled = true;

    // Seleccionar el ángulo de parada (eff en [0, 360)) 100% proporcional a los porcentajes actuales de la rueda (360°)
    let targetSector = 0;
    const randDeg = Math.random() * 360;
    for (let i = 0; i < this.sliceValues.length; i++) {
      if (randDeg >= this.sliceValues[i].startDeg && randDeg < this.sliceValues[i].endDeg) {
        targetSector = i;
        break;
      }
    }

    const chosenSlice = this.sliceValues[targetSector] || this.sliceValues[0];
    const margin = Math.min(3.5, chosenSlice.spanDeg * 0.2);
    const chosenEff = chosenSlice.startDeg + margin + (Math.random() * Math.max(1, chosenSlice.spanDeg - margin * 2));

    const baseSpins = 4;
    const currentMod = ((this.currentAngle % 360) + 360) % 360;
    const desiredFinalMod = ((270 - chosenEff) % 360 + 360) % 360;
    const deltaMod = ((desiredFinalMod - currentMod) % 360 + 360) % 360;
    const totalRotation = (360 * baseSpins) + deltaMod;

    const duration = timingResult === 'perfect' ? 2400 : 3200;
    const startTime = performance.now();
    const startAngle = this.currentAngle;
    let lastSliceIndex = this.getSliceIndexAtWheelAngle(startAngle);

    const animateWheel = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const angleNow = startAngle + totalRotation * ease;

      if (this.wheelGroup) {
        this.wheelGroup.style.transform = `rotate(${angleNow}deg)`;
      }

      const activeIdx = this.updateActiveSliceHighlight(angleNow);

      if (activeIdx !== lastSliceIndex) {
        lastSliceIndex = activeIdx;
        if (window.audio) window.audio.playPegClack();
        if (this.needleWrapper) {
          this.needleWrapper.classList.add('deflected-right');
          setTimeout(() => {
            if (this.needleWrapper) this.needleWrapper.classList.remove('deflected-right');
          }, 60);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        this.currentAngle = angleNow % 360;
        this.isSpinning = false;
        this.evaluateRouletteResult(activeIdx, timingResult);
      }
    };

    requestAnimationFrame(animateWheel);
  }

  updateActiveSliceHighlight(angle) {
    const activeIndex = this.getSliceIndexAtWheelAngle(angle);

    document.querySelectorAll('.roulette-slice').forEach((slice, idx) => {
      if (idx === activeIndex) {
        slice.classList.add('active-slice');
      } else {
        slice.classList.remove('active-slice');
      }
    });

    return activeIndex;
  }

  evaluateRouletteResult(sliceIndex, timingResult) {
    const landedSector = this.sliceValues[sliceIndex];
    const isWinner = landedSector.isWin;
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const winningSlice = document.getElementById(`slice-${sliceIndex}`);
    if (winningSlice) winningSlice.classList.add('winner-slice');

    const mult = landedSector.value;

    if (isWinner && mult >= 1.0) {
      if (window.audio) {
        window.audio.playWinFanfare();
        if (mult > 1.0) window.audio.playCrowdCheer();
      }
      if (mult > 1.0 && typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }

      this.applyAndAnimateBonusCoins(mult, false);

      if (this.timingFeedbackLbl) {
        if (mult === 1.0) {
          this.timingFeedbackLbl.innerHTML = `💰 ¡Mantienes tu pozo intacto (${landedSector.label})!`;
          this.timingFeedbackLbl.className = 'text-center text-sm font-black text-sky-300 mt-1';
        } else {
          this.timingFeedbackLbl.innerHTML = `🎉 ¡PREMIO ${landedSector.label}!`;
          this.timingFeedbackLbl.className = 'text-center text-sm font-black text-emerald-400 mt-1';
        }
      }
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager ? (typeof window.stateManager.hasRouletteBoost === 'function' ? window.stateManager.hasRouletteBoost() : window.stateManager.state.upgrades.rouletteBoost) : false;
      this.applyAndAnimateBonusCoins(mult, hasBoost);

      if (this.timingFeedbackLbl) {
        if (hasBoost) {
          this.timingFeedbackLbl.innerHTML = `🛡️ Cayó en ${landedSector.label} • ¡Seguro activo!`;
          this.timingFeedbackLbl.className = 'text-center text-xs font-black text-sky-300 mt-1';
        } else {
          this.timingFeedbackLbl.innerHTML = `❌ Cayó en ${landedSector.label}`;
          this.timingFeedbackLbl.className = 'text-center text-xs font-black text-rose-400 mt-1';
        }
      }
    }

    this.finalizeRound(winningSlice, modalBox);
  }

  // --- DIANA DE DARDOS: SLINGSHOT DESDE CUALQUIER LUGAR Y VIENTO AUTÉNTICO ---
  generateNewWind() {
    if (this.activeCard === 'calmAtmosphere') {
      this.windSpeed = 0.0;
      this.windAngle = 0;
    } else {
      this.windSpeed = +(Math.random() * 4.5 + 1.5).toFixed(1); // 1.5 a 6.0 m/s
      this.windAngle = Math.floor(Math.random() * 360); // Cualquier dirección de 0° a 359°
    }
    this.updateBreezeVisual();
  }

  updateBreezeVisual() {
    const breezeGroup = document.getElementById('diana-breeze-group');
    if (!breezeGroup) return;

    if (this.windSpeed <= 0.1) {
      breezeGroup.style.display = 'none';
    } else {
      breezeGroup.style.display = 'block';
      breezeGroup.style.transform = `rotate(${this.windAngle}deg)`;
      breezeGroup.style.transformOrigin = '150px 140px';

      // Variar la velocidad de la animación según la intensidad del viento
      const animDuration = Math.max(0.45, (3.2 / this.windSpeed) * 1.5).toFixed(2);
      document.querySelectorAll('.breeze-streak').forEach(streak => {
        streak.style.animationDuration = `${animDuration}s`;
      });
    }
  }

  resetDianaTarget() {
    this.isDartFlying = false;
    this.isDraggingSlingshot = false;
    this.isReverseShot = false;
    this.isDianaFinished = false;
    this.isRoundOver = false;
    this.currentDartPos = { x: 150, y: 315 };
    this.updateSlingshotVisuals(150, 315, 0, 0, false, false);

    const container = document.getElementById('diana-target-container');
    if (container) container.style.pointerEvents = 'auto';

    const impactsGroup = document.getElementById('diana-impacts-group');
    if (impactsGroup) impactsGroup.innerHTML = '';
    const dartsGroup = document.getElementById('diana-darts-group');
    if (dartsGroup) dartsGroup.innerHTML = '';

    const splatOverlay = document.getElementById('diana-face-splat-overlay');
    if (splatOverlay) splatOverlay.remove();

    const hintEl = document.getElementById('diana-gesture-hint');
    if (hintEl) {
      hintEl.textContent = '🎯 ¡Apunta y dispara arrastrando en cualquier parte!';
      hintEl.className = 'text-center text-[11px] font-bold text-sky-300 mt-1 mb-2 animate-pulse';
    }
  }

  setupSlingshotEvents() {
    const container = document.getElementById('diana-target-container');
    if (!container) return;

    const onPointerDown = (e) => {
      if (this.openTimestamp && (Date.now() - this.openTimestamp < 400)) return;
      if (this.isDartFlying || this.isDianaFinished || this.isRoundOver) return;
      if (e.target.closest('button') || e.target.closest('#alchemy-cards-drawer') || e.target.closest('#tab-minigame-selector')) {
        return;
      }
      if (window.audio) window.audio.init();

      // Permitir iniciar el swipe desde CUALQUIER posición de la pantalla
      this.isDraggingSlingshot = true;
      this.isReverseShot = false;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      container.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!this.isDraggingSlingshot || this.isDartFlying || this.isDianaFinished || this.isRoundOver) return;
      const rect = container.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 360 / rect.height;

      const dx = (e.clientX - this.dragStartPos.x) * scaleX;
      const dy = (e.clientY - this.dragStartPos.y) * scaleY;

      // Restricción de estiramiento del resorte: permite estirar hacia abajo (>0) o hacia arriba (<0 al revés)
      const clampedDx = Math.max(-70, Math.min(70, dx));
      const clampedDy = Math.max(-65, Math.min(85, dy));

      const dartX = 150 + clampedDx;
      const dartY = 315 + (clampedDy * 0.45);
      this.currentDartPos = { x: dartX, y: dartY };

      // Si el usuario arrastra hacia arriba (dy < -16), está estirando el resorte al revés
      const isReverse = (clampedDy < -16);
      this.isReverseShot = isReverse;

      this.updateSlingshotVisuals(dartX, dartY, clampedDx, clampedDy, true, isReverse);
    };

    const onPointerUp = (e) => {
      if (!this.isDraggingSlingshot) return;
      this.isDraggingSlingshot = false;
      try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}

      if (this.isDartFlying || this.isDianaFinished || this.isRoundOver) return;

      const pullDistance = Math.hypot(this.currentDartPos.x - 150, this.currentDartPos.y - 315);
      if (pullDistance > 10) {
        if (this.isReverseShot) {
          this.launchReverseSlingshotDart();
        } else {
          this.launchSlingshotDart();
        }
      } else {
        this.isReverseShot = false;
        this.updateSlingshotVisuals(150, 315, 0, 0, false, false);
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
  }

  updateSlingshotVisuals(dartX, dartY, pullX, pullY, isStretched, isReverse = false) {
    if (this.slingshotDart) {
      // Invertir rotación visual del dardo 180° si apunta al revés (hacia la cara del usuario)
      const dartRot = isReverse ? 'rotate(180)' : '';
      this.slingshotDart.setAttribute('transform', `translate(${dartX}, ${dartY}) ${dartRot}`);
    }

    if (this.slingshotBandLeft) {
      this.slingshotBandLeft.setAttribute('x2', dartX);
      this.slingshotBandLeft.setAttribute('y2', dartY);
    }
    if (this.slingshotBandRight) {
      this.slingshotBandRight.setAttribute('x2', dartX);
      this.slingshotBandRight.setAttribute('y2', dartY);
    }

    if (!isStretched) {
      if (this.slingshotTrajectory) this.slingshotTrajectory.setAttribute('opacity', '0');
      if (this.trajectoryAimDot) this.trajectoryAimDot.setAttribute('opacity', '0');
      if (this.slingshotDart) this.slingshotDart.setAttribute('transform', `translate(150, 315)`);
      return;
    }

    // SI ES TIRO AL REVÉS (AUTODISPARO A LA CARA)
    if (isReverse) {
      const downEndX = Math.round(150 + (pullX * 0.4));
      const downEndY = 368;
      if (this.slingshotTrajectory) {
        this.slingshotTrajectory.setAttribute('d', `M ${dartX} ${dartY} Q ${dartX} 340 ${downEndX} ${downEndY}`);
        this.slingshotTrajectory.setAttribute('opacity', '0.95');
        this.slingshotTrajectory.setAttribute('stroke', '#f43f5e');
      }
      if (this.trajectoryAimDot) {
        this.trajectoryAimDot.setAttribute('cx', downEndX);
        this.trajectoryAimDot.setAttribute('cy', 360);
        this.trajectoryAimDot.setAttribute('opacity', '0.95');
        this.trajectoryAimDot.setAttribute('fill', '#f43f5e');
      }
      const hintEl = document.getElementById('diana-gesture-hint');
      if (hintEl) {
        hintEl.innerHTML = '⚠️ <span class="text-rose-400 font-black">¡CUIDADO!</span> Estás apuntando directo a tu cara...';
        hintEl.className = 'text-center text-[11px] font-black text-rose-300 mt-1 mb-2 animate-bounce';
      }
      return;
    }

    // Calibración de fuerza para la Diana reducida (r=58, borde superior Y=82, borde inferior Y=198):
    // En condiciones sin viento:
    // - Al extender al máximo (pullY=85) -> impactY ≈ 50 (sale fuera de la diana por encima)
    // - Al tirar al mínimo (pullY=22) -> impactY ≈ 226 (sale fuera de la diana por debajo)
    // - En estiramiento medio (pullY≈52) -> impactY = 140 (centro de oro)
    const tensionX = 1.65;
    const tensionY = 2.85;
    const nominalPullY = 52; // Pull nominal que apunta directamente a Y=140 (centro)

    // Apuntado base (la fuerza y ángulo de tiro hacia adelante)
    const aimTargetX = 150 - (pullX * tensionX);
    const aimTargetY = 140 - ((pullY - nominalPullY) * tensionY);

    // Desvío por viento en tiempo real (empuje real sobre el dardo en la dirección que sople)
    const windRad = (this.windAngle * Math.PI) / 180;
    const windPushX = Math.cos(windRad) * (this.windSpeed * 11.5);
    const windPushY = Math.sin(windRad) * (this.windSpeed * 9.0);

    // El punto de impacto real sufre la desviación del viento (rango amplio para salir por encima o por debajo de la diana)
    const impactX = Math.round(Math.max(10, Math.min(290, aimTargetX + windPushX)));
    const impactY = Math.round(Math.max(12, Math.min(275, aimTargetY + windPushY)));
    this.currentImpactPoint = { x: impactX, y: impactY };

    // Punto de control de la curva para que la trayectoria se combe visiblemente con el viento
    const ctrlX = (dartX + impactX) / 2 + (windPushX * 0.8);
    const ctrlY = (dartY + impactY) / 2 + (windPushY * 0.8);
    this.currentCtrlPoint = { x: ctrlX, y: ctrlY };

    // Texto guía normal
    const hintEl = document.getElementById('diana-gesture-hint');
    if (hintEl && !this.isDartFlying) {
      hintEl.textContent = '🏹 Suelta para disparar a la diana';
      hintEl.className = 'text-center text-[11px] font-bold text-sky-300 mt-1 mb-2';
    }

    // Comprobar visibilidad de la trayectoria:
    // Sección 1 (niveles 1-10): siempre visible.
    // Sección 2+ (niveles > 10): oculta por defecto, visible SOLO con carta trajectorySight (sin viento)
    const currentLvl = window.game ? (window.game.currentLevel || 1) : 1;
    const isSection1 = currentLvl <= 10;
    const hasTrajectoryCard = (this.activeCard === 'trajectorySight');

    if (!isStretched || (!isSection1 && !hasTrajectoryCard)) {
      if (this.slingshotTrajectory) this.slingshotTrajectory.setAttribute('opacity', '0');
      if (this.trajectoryAimDot) this.trajectoryAimDot.setAttribute('opacity', '0');
      return;
    }

    // Si tiene la carta de trayectoria y está en sección > 1, la predicción NO contempla el viento:
    let lineEndX = impactX;
    let lineEndY = impactY;
    let lineCtrlX = ctrlX;
    let lineCtrlY = ctrlY;
    if (!isSection1 && hasTrajectoryCard) {
      lineEndX = Math.round(Math.max(20, Math.min(280, aimTargetX)));
      lineEndY = Math.round(Math.max(20, Math.min(265, aimTargetY)));
      lineCtrlX = (dartX + lineEndX) / 2;
      lineCtrlY = (dartY + lineEndY) / 2;
    }

    if (this.slingshotTrajectory) {
      this.slingshotTrajectory.setAttribute('d', `M ${dartX} ${dartY} Q ${lineCtrlX} ${lineCtrlY} ${lineEndX} ${lineEndY}`);
      this.slingshotTrajectory.setAttribute('opacity', '0.9');
      this.slingshotTrajectory.setAttribute('stroke', (!isSection1 && hasTrajectoryCard) ? '#c084fc' : '#fde047');
    }
    if (this.trajectoryAimDot) {
      this.trajectoryAimDot.setAttribute('cx', lineEndX);
      this.trajectoryAimDot.setAttribute('cy', lineEndY);
      this.trajectoryAimDot.setAttribute('opacity', '0.85');
      this.trajectoryAimDot.setAttribute('fill', (!isSection1 && hasTrajectoryCard) ? '#c084fc' : '#fde047');
    }
  }

  // Lanzamiento normal hacia adelante (diana)
  launchSlingshotDart() {
    if (this.isDartFlying || this.isDianaFinished || this.isRoundOver) return;
    this.isDartFlying = true;

    // Si no tiene tiro extra, bloquear inmediatamente para evitar tiros dobles rápidos
    if (!this.extraShotAvailable) {
      this.isDianaFinished = true;
      const container = document.getElementById('diana-target-container');
      if (container) container.style.pointerEvents = 'none';
    }

    if (window.audio) window.audio.playDartThrow();

    const startX = this.currentDartPos.x;
    const startY = this.currentDartPos.y;
    const hitX = this.currentImpactPoint.x;
    const hitY = this.currentImpactPoint.y;
    const ctrlX = this.currentCtrlPoint ? this.currentCtrlPoint.x : ((startX + hitX) / 2);
    const ctrlY = this.currentCtrlPoint ? this.currentCtrlPoint.y : ((startY + hitY) / 2);

    this.updateSlingshotVisuals(150, 315, 0, 0, false, false);

    const dartsGroup = document.getElementById('diana-darts-group');
    const startTime = performance.now();
    const duration = 340; // ms de vuelo

    const animateBall = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const invT = 1 - t;
      // Curva cuadrática Bézier que sigue la trayectoria combada por el viento
      const curX = (invT * invT * startX) + (2 * invT * t * ctrlX) + (t * t * hitX);
      const curY = (invT * invT * startY) + (2 * invT * t * ctrlY) + (t * t * hitY);
      const scale = 1.3 - (t * 0.45);

      if (dartsGroup) {
        dartsGroup.innerHTML = `
          <g transform="translate(${curX}, ${curY}) scale(${scale})">
            <!-- Estela difuminada -->
            <circle cx="0" cy="0" r="9" fill="rgba(253, 224, 71, 0.35)" filter="blur(2px)"/>
            <!-- Esfera proyectil de tiro -->
            <circle cx="0" cy="0" r="6" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
            <circle cx="-1.5" cy="-1.5" r="2" fill="#ffffff"/>
          </g>
        `;
      }

      if (t < 1) {
        requestAnimationFrame(animateBall);
      } else {
        if (window.audio) window.audio.playDartHit();
        if (dartsGroup) dartsGroup.innerHTML = '';

        // Dejar la marca 'X' en el lugar del impacto
        const impactsGroup = document.getElementById('diana-impacts-group');
        if (impactsGroup) {
          const xMark = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          xMark.setAttribute('transform', `translate(${hitX}, ${hitY})`);
          xMark.innerHTML = `
            <ellipse cx="2" cy="4" rx="7" ry="3.5" fill="rgba(0,0,0,0.7)"/>
            <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="8" y1="-8" x2="-8" y2="8" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="8" y1="-8" x2="-8" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="0" cy="0" r="3" fill="#fde047" stroke="#000000" stroke-width="1"/>
          `;
          impactsGroup.appendChild(xMark);
        }

        this.isDartFlying = false;
        this.evaluateDianaImpact(hitX, hitY);
      }
    };

    requestAnimationFrame(animateBall);
  }

  // --- EASTER EGG: LANZAMIENTO AL REVÉS (DISPARO DIRECTO A LA CARA) ---
  launchReverseSlingshotDart() {
    if (this.isDartFlying || this.isDianaFinished || this.isRoundOver) return;
    this.isDartFlying = true;
    this.isDianaFinished = true;

    const container = document.getElementById('diana-target-container');
    if (container) container.style.pointerEvents = 'none';

    if (window.audio) window.audio.playDartThrow();

    const startX = this.currentDartPos.x;
    const startY = this.currentDartPos.y;
    // Vuela hacia abajo directamente hacia la cámara y la cara del jugador
    const targetX = 150;
    const targetY = 380;

    this.updateSlingshotVisuals(150, 315, 0, 0, false, false);

    const dartsGroup = document.getElementById('diana-darts-group');
    const startTime = performance.now();
    const duration = 250; // ms de vuelo rápido hacia la cámara

    const animateReverseDart = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const curX = startX + (targetX - startX) * t;
      const curY = startY + (targetY - startY) * t;
      // Crece dramáticamente simulando aproximación 3D directa al usuario
      const scale = 1.0 + (t * 5.2);

      if (dartsGroup) {
        dartsGroup.innerHTML = `
          <g transform="translate(${curX}, ${curY}) scale(${scale})">
            <!-- Estela de peligro -->
            <circle cx="0" cy="0" r="14" fill="rgba(239, 68, 68, 0.45)" filter="blur(3px)"/>
            <!-- Dardo invertido apuntando a la cara -->
            <polygon points="0,16 -6,-6 0,-2 6,-6" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
            <polygon points="-6,-6 -10,-14 -3,-11" fill="#38bdf8"/>
            <polygon points="6,-6 10,-14 3,-11" fill="#38bdf8"/>
            <polygon points="0,16 -3,8 3,8" fill="#fde047"/>
          </g>
        `;
      }

      if (t < 1) {
        requestAnimationFrame(animateReverseDart);
      } else {
        if (dartsGroup) dartsGroup.innerHTML = '';
        this.triggerFaceSplatEasterEgg();
      }
    };

    requestAnimationFrame(animateReverseDart);
  }

  // Animación cómica de mancha en la cara ("La próxima apuntá para el otro lado")
  triggerFaceSplatEasterEgg() {
    // Sonidos cómicos: explosión de laboratorio (final malo) y decepción cómica
    if (window.audio && typeof window.audio.playLabExplosion === 'function') {
      window.audio.playLabExplosion();
    } else if (window.audio && typeof window.audio.playFailSound === 'function') {
      window.audio.playFailSound();
    }
    setTimeout(() => {
      if (window.audio && typeof window.audio.playDisappointedCrowd === 'function') {
        window.audio.playDisappointedCrowd();
      }
    }, 450);

    const container = document.getElementById('diana-target-container');
    if (!container) return;

    // Sacudida de pantalla de impacto
    container.classList.add('face-splat-shake');
    setTimeout(() => container.classList.remove('face-splat-shake'), 600);

    // Remover overlay previo si existiera
    const prevOverlay = document.getElementById('diana-face-splat-overlay');
    if (prevOverlay) prevOverlay.remove();

    // Crear el overlay cómico de mancha en la cara
    const overlay = document.createElement('div');
    overlay.id = 'diana-face-splat-overlay';
    overlay.className = 'face-splat-overlay';
    overlay.innerHTML = `
      <div class="relative w-full h-full flex flex-col items-center justify-between p-2 select-none">
        <!-- SVG Mancha de Hollín / Slime en la Pantalla -->
        <svg class="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 300 360">
          <defs>
            <radialGradient id="splat-ink-grad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#38184c"/>
              <stop offset="45%" stop-color="#18181b"/>
              <stop offset="100%" stop-color="#09090b"/>
            </radialGradient>
          </defs>

          <!-- Salpicaduras coloridas de alquimia y hollín -->
          <circle cx="35" cy="115" r="14" fill="#09090b"/>
          <circle cx="58" cy="72" r="10" fill="#a855f7" opacity="0.8"/>
          <circle cx="245" cy="88" r="16" fill="#09090b"/>
          <circle cx="265" cy="135" r="11" fill="#06b6d4" opacity="0.8"/>
          <circle cx="48" cy="225" r="13" fill="#09090b"/>
          <circle cx="250" cy="235" r="15" fill="#09090b"/>
          <circle cx="150" cy="35" r="12" fill="#09090b"/>
          <circle cx="185" cy="48" r="8" fill="#10b981" opacity="0.8"/>

          <!-- Mancha Gigante Central de Hollín / Tinta -->
          <path d="M 150 55
                   C 210 50, 260 85, 265 140
                   C 270 195, 235 220, 245 255
                   C 230 275, 195 270, 150 280
                   C 105 270, 70 275, 55 255
                   C 65 220, 30 195, 35 140
                   C 40 85, 90 50, 150 55 Z"
                fill="url(#splat-ink-grad)" stroke="#27272a" stroke-width="3"/>

          <!-- Gotas chorreando por el cristal -->
          <path class="splat-drip" d="M 95 260 Q 97 295 93 318 Q 91 326 95 329 Q 99 326 97 318 Z" fill="#09090b"/>
          <path class="splat-drip" d="M 150 275 Q 153 305 148 335 Q 146 342 150 346 Q 154 342 152 335 Z" fill="#09090b" style="animation-delay: 0.3s;"/>
          <path class="splat-drip" d="M 205 255 Q 207 290 203 312 Q 201 320 205 324 Q 209 320 207 312 Z" fill="#09090b" style="animation-delay: 0.6s;"/>

          <!-- Cara Cómica del Alquimista Manchado (Centrada en 150, 140) -->
          <g id="soot-face-group">
            <!-- Gorro chamuscado torcido con humo saliendo -->
            <polygon points="120,105 150,60 175,105" fill="#1e1b4b" stroke="#09090b" stroke-width="2"/>
            <polygon points="112,106 182,106 178,112 116,112" fill="#312e81"/>
            <text x="175" y="68" font-size="20">💨</text>
            <text x="110" y="78" font-size="14">💨</text>

            <!-- Cabeza negra tiznada de hollín -->
            <circle cx="150" cy="140" r="34" fill="#09090b" stroke="#27272a" stroke-width="2"/>

            <!-- Ojos grandes de dibujo animado con parpadeo -->
            <g class="splat-blink-eyes">
              <ellipse cx="136" cy="132" rx="10" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
              <circle cx="138" cy="134" r="5" fill="#000000"/>
              <circle cx="136" cy="131" r="2" fill="#ffffff"/>
              <ellipse cx="164" cy="132" rx="10" ry="12" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
              <circle cx="162" cy="134" r="5" fill="#000000"/>
              <circle cx="160" cy="131" r="2" fill="#ffffff"/>
            </g>

            <!-- Cejas inclinadas de desconcierto -->
            <line x1="126" y1="116" x2="144" y2="120" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="174" y1="116" x2="156" y2="120" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>

            <!-- Boca de sorpresa abierta "O" -->
            <ellipse cx="150" cy="158" rx="8" ry="10" fill="#000000" stroke="#3f3f46" stroke-width="1.5"/>
            <ellipse cx="150" cy="160" rx="5" ry="5.5" fill="#ef4444"/>
          </g>
        </svg>

        <!-- Cartel Bocadillo Cómico con el texto solicitado -->
        <div class="relative z-10 w-full max-w-[280px] bg-slate-900/95 border-2 border-amber-400 rounded-2xl p-2.5 shadow-2xl text-center transform -rotate-1 mb-2 mt-auto">
          <div class="text-[11px] font-black text-rose-400 tracking-wider uppercase flex items-center justify-center gap-1">
            <span>🎯💥 ¡¡SPLASH EN LA CARA!! 💥🎯</span>
          </div>
          <div class="text-xs sm:text-sm font-black text-white mt-0.5 leading-snug">
            "La próxima apuntá para el otro lado..."
          </div>
          <div id="splat-subtext" class="text-[10px] text-amber-300 font-semibold mt-0.5">
            (Te disparaste a vos mismo con la tirachinas)
          </div>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    const hintEl = document.getElementById('diana-gesture-hint');
    if (hintEl) {
      hintEl.innerHTML = '💥 <strong class="text-rose-400">¡AUCH!</strong> "La próxima apuntá para el otro lado..."';
      hintEl.className = 'text-center text-xs font-black text-rose-300 mt-1 mb-2 animate-pulse';
    }

    // Gestionar si tiene carta de Tiro Extra
    if (this.extraShotAvailable) {
      this.extraShotAvailable = false;
      this.updateCardsUI();
      const subtext = overlay.querySelector('#splat-subtext');
      if (subtext) {
        subtext.innerHTML = '✨ ¡Menos mal tenías <strong>Tiro Extra</strong>! Limpiate la cara y dispará hacia la diana...';
      }

      setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
          overlay.remove();
          this.isDartFlying = false;
          this.isReverseShot = false;
          if (hintEl) {
            hintEl.textContent = '🏹 ¡Ahora sí! Estira hacia abajo para lanzar a la diana';
            hintEl.className = 'text-center text-[11px] font-bold text-amber-300 mt-1 mb-2 animate-bounce';
          }
        }, 500);
      }, 3000);
    } else {
      // Sin tiro extra: finaliza la ronda perdiendo el monto en juego
      const modalBox = document.querySelector('#modal-roulette .modal-content');
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      const hasBoost = window.stateManager ? (typeof window.stateManager.hasRouletteBoost === 'function' ? window.stateManager.hasRouletteBoost() : window.stateManager.state.upgrades.rouletteBoost) : false;

      setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
          overlay.remove();
          this.isDartFlying = false;
          this.isReverseShot = false;
          this.applyAndAnimateBonusCoins(-1.0, hasBoost);
          if (hintEl) {
            if (hasBoost) {
              hintEl.innerHTML = '🛡️ ¡Autogolpe! • ¡Seguro activo!';
              hintEl.className = 'text-center text-xs font-black text-sky-300 mt-1 mb-2';
            } else {
              hintEl.innerHTML = '❌ "La próxima apuntá para el otro lado..." (Pierde el pozo)';
              hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
            }
          }
          this.finalizeRound(null, modalBox);
        }, 500);
      }, 3400);
    }
  }

  evaluateDianaImpact(x, y) {
    const cx = 150;
    const cy = 140;
    const dist = Math.hypot(x - cx, y - cy);
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const hintEl = document.getElementById('diana-gesture-hint');

    let multiplier = 0;
    let label = 'Fuera';

    // Diana con diámetro de bronce achicado un 50% (Centro: r=16, Plata: r=36, Bronce: r=58)
    if (dist <= 16) {
      multiplier = 3.0;
      label = '⭐ ¡CENTRO DE ORO! (x3.0)';
    } else if (dist <= 36) {
      multiplier = 1.5;
      label = '✨ ¡ANILLO DE PLATA! (x1.5)';
    } else if (dist <= 58) {
      multiplier = 1.2;
      label = '🎯 ¡ANILLO DE BRONCE! (x1.2)';
    } else {
      multiplier = 0;
      label = '❌ ¡TIRO FUERA DE LA DIANA! (Pierde el pozo)';
    }

    if (this.extraShotAvailable && multiplier < 1.5) {
      this.extraShotAvailable = false;
      this.isDianaFinished = false;
      this.isDartFlying = false;
      const container = document.getElementById('diana-target-container');
      if (container) container.style.pointerEvents = 'auto';

      if (hintEl) {
        hintEl.textContent = '¡Tiro extra de respaldo activo! ¡Vuelve a estirar el resorte!';
        hintEl.className = 'text-center text-xs font-black text-amber-300 mt-1 mb-2 animate-bounce';
      }
      this.updateCardsUI();
      return;
    }

    // Tiro final concluido: bloquear diana permanentemente
    this.isDianaFinished = true;
    this.isRoundOver = true;
    const dianaCont = document.getElementById('diana-target-container');
    if (dianaCont) dianaCont.style.pointerEvents = 'none';

    if (multiplier > 0) {
      if (dist <= 16 || multiplier >= 3.0) {
        this.triggerPerfectCelebration("¡DIANA DE ORO! 🎯", "¡Impacto Perfecto al Centro!");
      } else {
        if (window.audio) {
          window.audio.playWinFanfare();
          window.audio.playCrowdCheer();
        }
        if (typeof confetti === 'function') {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      }

      this.applyAndAnimateBonusCoins(multiplier, false);

      if (hintEl) {
        hintEl.innerHTML = `${label}`;
        hintEl.className = 'text-center text-sm font-black text-emerald-400 mt-1 mb-2';
      }
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager ? (typeof window.stateManager.hasRouletteBoost === 'function' ? window.stateManager.hasRouletteBoost() : window.stateManager.state.upgrades.rouletteBoost) : false;
      this.applyAndAnimateBonusCoins(-1.0, hasBoost);

      if (hintEl) {
        if (hasBoost) {
          hintEl.textContent = '🛡️ ¡Fuera de la diana! • ¡Seguro activo!';
          hintEl.className = 'text-center text-xs font-black text-sky-300 mt-1 mb-2';
        } else {
          hintEl.textContent = `${label}`;
          hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
        }
      }
    }

    this.finalizeRound(null, modalBox);
  }

  resetMovingTargets() {
    const hasSlowCard = (this.activeCard === 'movingSlow');
    this.movingDartsLeft = hasSlowCard ? 4 : 3;
    this.movingHitsCount = 0;
    this.isMovingFinished = false;
    this.isDartFlying = false;
    this.isRoundOver = false;

    const container = document.getElementById('moving-targets-container');
    if (container) container.style.pointerEvents = 'auto';

    const impactsGroup = document.getElementById('moving-impacts-group');
    if (impactsGroup) impactsGroup.innerHTML = '';
    const dartsGroup = document.getElementById('moving-darts-anim-group');
    if (dartsGroup) dartsGroup.innerHTML = '';
    const trajectoryEl = document.getElementById('moving-trajectory');
    if (trajectoryEl) trajectoryEl.setAttribute('opacity', '0');
    const trajectoryDot = document.getElementById('moving-trajectory-dot');
    if (trajectoryDot) trajectoryDot.setAttribute('opacity', '0');

    const dartEl = document.getElementById('moving-slingshot-dart');
    const bandLeft = document.getElementById('moving-band-left');
    const bandRight = document.getElementById('moving-band-right');
    if (dartEl) {
      dartEl.setAttribute('transform', 'translate(150, 315)');
      dartEl.style.opacity = '1';
    }
    if (bandLeft) { bandLeft.setAttribute('x2', '150'); bandLeft.setAttribute('y2', '315'); }
    if (bandRight) { bandRight.setAttribute('x2', '150'); bandRight.setAttribute('y2', '315'); }

    const hintEl = document.getElementById('moving-gesture-hint');
    if (hintEl) {
      hintEl.textContent = '🎯 Anticipa el recorrido: apunta adonde estará la diana al llegar la bola';
      hintEl.className = 'text-center text-[11px] font-bold text-slate-300 mt-1 mb-2';
    }

    // Aumentar un 10% adicional la velocidad base de las dianas móviles (1.05 * 1.10 = 1.155)
    // y mantener variación aleatoria de +/-5% a cada una para requerir tiro anticipado
    const slowFactor = hasSlowCard ? 0.65 : 1.0;
    const calcTargetSpeed = (baseSpeed, dirSign) => {
      const randVariation = 0.95 + (Math.random() * 0.10); // +/- 5% (0.95 a 1.05)
      return +(baseSpeed * 1.155 * randVariation * slowFactor * dirSign).toFixed(3);
    };

    const dir0 = Math.random() < 0.5 ? 1 : -1;
    const dir1 = -dir0;
    const dir2 = Math.random() < 0.5 ? 1 : -1;

    this.movingTargets = [
      { id: 0, x: 75 + Math.floor(Math.random() * 150), y: 65, r: 16, vx: calcTargetSpeed(1.3, dir0), minX: 45, maxX: 255, hit: false, mult: 3.0, name: 'Oro', color: '#facc15' },
      { id: 1, x: 70 + Math.floor(Math.random() * 160), y: 125, r: 20, vx: calcTargetSpeed(1.6, dir1), minX: 40, maxX: 260, hit: false, mult: 2.0, name: 'Plata', color: '#e2e8f0' },
      { id: 2, x: 65 + Math.floor(Math.random() * 170), y: 185, r: 24, vx: calcTargetSpeed(1.1, dir2), minX: 35, maxX: 265, hit: false, mult: 1.5, name: 'Bronce', color: '#f59e0b' }
    ];
    this.renderMovingTargetsDOM();
    this.updateMovingTargetsHUD();
  }

  renderMovingTargetsDOM() {
    const group = document.getElementById('moving-targets-group');
    if (!group) return;
    group.innerHTML = '';

    this.movingTargets.forEach(t => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.id = `moving-target-${t.id}`;
      g.setAttribute('transform', `translate(${t.x}, ${t.y})`);

      g.innerHTML = `
        <circle cx="0" cy="0" r="${t.r}" fill="${t.color}" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.7))"/>
        <circle cx="0" cy="0" r="${t.r * 0.5}" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
        <text x="0" y="3" font-size="${t.r * 0.6}" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">🎯</text>
      `;
      group.appendChild(g);
    });
  }

  startMovingTargetsAnim() {
    this.stopMovingTargetsAnim();

    const loop = () => {
      this.movingTargets.forEach(t => {
        if (t.hit) return;
        t.x += t.vx;
        if (t.x <= t.minX) {
          t.x = t.minX;
          t.vx = Math.abs(t.vx);
        } else if (t.x >= t.maxX) {
          t.x = t.maxX;
          t.vx = -Math.abs(t.vx);
        }

        const el = document.getElementById(`moving-target-${t.id}`);
        if (el) {
          el.setAttribute('transform', `translate(${t.x}, ${t.y})`);
        }
      });

      this.movingTargetsAnimId = requestAnimationFrame(loop);
    };

    this.movingTargetsAnimId = requestAnimationFrame(loop);
  }

  stopMovingTargetsAnim() {
    if (this.movingTargetsAnimId) {
      cancelAnimationFrame(this.movingTargetsAnimId);
      this.movingTargetsAnimId = null;
    }
  }

  setupMovingTargetsEvents() {
    const container = document.getElementById('moving-targets-container');
    if (!container) return;

    let isMovingDragging = false;
    let hasStretchedEnough = false;
    let movingStartPos = { x: 0, y: 0 };
    let currentMovingDartPos = { x: 150, y: 315 };
    let currentMovingImpact = { x: 150, y: 125 };
    let currentMovingCtrl = { x: 150, y: 205 };

    const dartEl = document.getElementById('moving-slingshot-dart');
    const bandLeft = document.getElementById('moving-band-left');
    const bandRight = document.getElementById('moving-band-right');
    const trajectoryEl = document.getElementById('moving-trajectory');
    const trajectoryDot = document.getElementById('moving-trajectory-dot');

    const updateVisuals = (dx, dy, isStretched) => {
      const dX = 150 + dx;
      const dY = 315 + (dy * 0.45);
      currentMovingDartPos = { x: dX, y: dY };

      if (dartEl) dartEl.setAttribute('transform', `translate(${dX}, ${dY})`);
      if (bandLeft) { bandLeft.setAttribute('x2', dX); bandLeft.setAttribute('y2', dY); }
      if (bandRight) { bandRight.setAttribute('x2', dX); bandRight.setAttribute('y2', dY); }

      if (!isStretched) {
        if (trajectoryEl) trajectoryEl.setAttribute('opacity', '0');
        if (trajectoryDot) trajectoryDot.setAttribute('opacity', '0');
        return;
      }

      const aimX = 150 - (dx * 1.45);
      const aimY = 125 - ((dy - 48) * 1.85);
      currentMovingImpact = {
        x: Math.max(25, Math.min(275, aimX)),
        y: Math.max(35, Math.min(240, aimY))
      };

      const ctrlX = (dX + currentMovingImpact.x) / 2;
      const ctrlY = ((dY + currentMovingImpact.y) / 2) - 18;
      currentMovingCtrl = { x: ctrlX, y: ctrlY };

      if (trajectoryEl) {
        trajectoryEl.setAttribute('d', `M ${dX} ${dY} Q ${ctrlX} ${ctrlY} ${currentMovingImpact.x} ${currentMovingImpact.y}`);
        trajectoryEl.setAttribute('opacity', '0.92');
      }
      if (trajectoryDot) {
        trajectoryDot.setAttribute('cx', currentMovingImpact.x);
        trajectoryDot.setAttribute('cy', currentMovingImpact.y);
        trajectoryDot.setAttribute('opacity', '0.95');
      }
    };

    container.addEventListener('pointerdown', (e) => {
      if (this.openTimestamp && (Date.now() - this.openTimestamp < 400)) return;
      if (this.isDartFlying || this.movingDartsLeft <= 0 || this.isMovingFinished || this.isRoundOver) return;
      if (e.target.closest('button')) return;
      if (window.audio) window.audio.init();

      isMovingDragging = true;
      hasStretchedEnough = false;
      movingStartPos = { x: e.clientX, y: e.clientY };
      container.setPointerCapture?.(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
      if (!isMovingDragging || this.isDartFlying || this.isMovingFinished || this.isRoundOver) return;
      const rect = container.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 360 / rect.height;

      const rawDx = (e.clientX - movingStartPos.x) * scaleX;
      const rawDy = (e.clientY - movingStartPos.y) * scaleY;

      if (Math.hypot(rawDx, rawDy) < 8) {
        hasStretchedEnough = false;
        updateVisuals(0, 0, false);
        return;
      }

      hasStretchedEnough = true;
      // Permitir arrastrar hacia abajo (clásico) o hacia arriba (inverso)
      const effectiveDy = rawDy >= 0 ? rawDy : Math.abs(rawDy);
      const effectiveDx = rawDy >= 0 ? rawDx : -rawDx;

      const clampedDx = Math.max(-75, Math.min(75, effectiveDx));
      const clampedDy = Math.max(12, Math.min(88, effectiveDy));
      updateVisuals(clampedDx, clampedDy, true);
    });

    const onPointerUp = (e) => {
      if (!isMovingDragging) return;
      isMovingDragging = false;
      try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}

      if (this.isDartFlying || this.movingDartsLeft <= 0 || this.isMovingFinished || this.isRoundOver) return;

      const shouldLaunch = hasStretchedEnough;
      hasStretchedEnough = false;
      const launchStart = { ...currentMovingDartPos };
      const launchImpact = { ...currentMovingImpact };
      const launchCtrl = { ...currentMovingCtrl };

      updateVisuals(0, 0, false);
      if (shouldLaunch) {
        this.launchMovingDart(launchStart, launchImpact, launchCtrl);
      }
    };

    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
  }

  launchMovingDart(startPos, hitPos, ctrlPos = null) {
    if (this.isDartFlying || this.movingDartsLeft <= 0 || this.isMovingFinished || this.isRoundOver) return;
    this.isDartFlying = true;
    this.movingDartsLeft--;
    this.updateMovingTargetsHUD();
    this.updateBetUI();

    // Si ya no quedan dardos, bloquear inmediatamente para evitar tiros dobles rápidos
    if (this.movingDartsLeft <= 0) {
      this.isMovingFinished = true;
      const container = document.getElementById('moving-targets-container');
      if (container) container.style.pointerEvents = 'none';
    }

    if (window.audio) window.audio.playDartThrow();

    const dartEl = document.getElementById('moving-slingshot-dart');
    if (dartEl) dartEl.style.opacity = '0.25';

    const cPos = ctrlPos || {
      x: (startPos.x + hitPos.x) / 2,
      y: ((startPos.y + hitPos.y) / 2) - 18
    };

    const dartsGroup = document.getElementById('moving-darts-anim-group');
    const impactsGroup = document.getElementById('moving-impacts-group');
    // Reducir la velocidad del proyectil un 50% (duplicando el tiempo de vuelo a 650ms)
    // para que el jugador deba anticipar con precisión por dónde pasará la diana
    const duration = 650;
    const startTime = performance.now();

    const finishShot = (hitTarget, finalX, finalY) => {
      if (dartsGroup) dartsGroup.innerHTML = '';
      if (dartEl) {
        dartEl.setAttribute('transform', 'translate(150, 315)');
        dartEl.style.opacity = this.movingDartsLeft > 0 ? '1' : '0.35';
      }
      this.isDartFlying = false;
      this.updateBetUI();

      const hintEl = document.getElementById('moving-gesture-hint');

      if (hitTarget) {
        hitTarget.hit = true;
        this.movingHitsCount++;
        if (window.audio) {
          window.audio.playDartHit();
          window.audio.playPop();
        }

        // Mostrar diana impactada clavada en el lugar exacto del golpe
        const el = document.getElementById(`moving-target-${hitTarget.id}`);
        if (el) {
          el.setAttribute('transform', `translate(${hitTarget.x}, ${hitTarget.y})`);
          el.classList.add('moving-target-hit');
          el.innerHTML = `
            <circle cx="0" cy="0" r="${hitTarget.r}" fill="${hitTarget.color}" stroke="#10b981" stroke-width="3" opacity="0.85"/>
            <circle cx="0" cy="0" r="${hitTarget.r * 0.55}" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="5" fill="#fde047" stroke="#0f172a" stroke-width="1.5"/>
            <path d="M -5 -5 L 5 5 M -5 5 L 5 -5" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
          `;
        }

        // Destello y onda expansiva de golpe real sobre el blanco móvil
        if (impactsGroup) {
          const burst = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          burst.setAttribute('transform', `translate(${hitTarget.x}, ${hitTarget.y})`);
          burst.innerHTML = `
            <circle cx="0" cy="0" r="${hitTarget.r + 6}" fill="none" stroke="#fde047" stroke-width="3" opacity="0.95"/>
            <circle cx="0" cy="0" r="${hitTarget.r + 13}" fill="none" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.85"/>
            <text x="0" y="${-hitTarget.r - 8}" fill="#fde047" font-size="11" font-weight="900" text-anchor="middle" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.9))">¡IMPACTO!</text>
          `;
          impactsGroup.appendChild(burst);
          setTimeout(() => {
            try { burst.remove(); } catch (_) {}
          }, 750);
        }

        if (hintEl) {
          hintEl.innerHTML = `⭐ ¡IMPACTO EN DIANA ${hitTarget.name.toUpperCase()}! (${this.movingHitsCount}/3 • x${this.movingHitsCount})`;
          hintEl.className = 'text-center text-xs font-black text-amber-300 mt-1 mb-2 animate-bounce';
        }

        this.updateMovingTargetsHUD();

        // Si acierta las 3, victoria total inmediata
        if (this.movingHitsCount >= 3) {
          this.evaluateMovingTargetsFinal(true);
          return;
        }
      } else {
        if (window.audio) window.audio.playDartHit();
        // Marca visual en el punto exacto donde cayó la pelota
        if (impactsGroup) {
          const missMark = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          missMark.setAttribute('transform', `translate(${finalX}, ${finalY})`);
          missMark.innerHTML = `
            <circle cx="0" cy="0" r="6" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.7"/>
            <path d="M -3.5 -3.5 L 3.5 3.5 M -3.5 3.5 L 3.5 -3.5" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
          `;
          impactsGroup.appendChild(missMark);
          setTimeout(() => {
            try { missMark.remove(); } catch (_) {}
          }, 550);
        }
        if (hintEl) {
          hintEl.innerHTML = `💨 ¡Pasó de largo! Anticipa el movimiento (Quedan ${this.movingDartsLeft} tiros)`;
          hintEl.className = 'text-center text-xs font-bold text-slate-400 mt-1 mb-2';
        }
      }

      // Si se quedaron sin dardos
      if (this.movingDartsLeft <= 0) {
        this.evaluateMovingTargetsFinal(false);
      }
    };

    const animateFlight = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Curva cuadrática de Bézier idéntica a la línea punteada de puntería
      const invT = 1 - t;
      const curX = (invT * invT * startPos.x) + (2 * invT * t * cPos.x) + (t * t * hitPos.x);
      const curY = (invT * invT * startPos.y) + (2 * invT * t * cPos.y) + (t * t * hitPos.y);
      const scale = 1.35 - (0.40 * t);

      if (dartsGroup) {
        dartsGroup.innerHTML = `
          <g transform="translate(${curX}, ${curY}) scale(${scale})">
            <circle cx="0" cy="0" r="8" fill="rgba(250, 204, 21, 0.3)"/>
            <circle cx="0" cy="0" r="5.5" fill="#fde047" stroke="#ffffff" stroke-width="1.8"/>
            <circle cx="-1.5" cy="-1.5" r="1.8" fill="#ffffff"/>
          </g>
        `;
      }

      if (t < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        // Solo evaluar impacto cuando la pelota llega exactamente al final de su camino (hitPos.x, hitPos.y).
        // Si el usuario tiró tarde, la diana ya habrá pasado de largo antes de que llegue la bola.
        let hitTarget = null;
        for (const target of this.movingTargets) {
          if (!target.hit) {
            const dist = Math.hypot(hitPos.x - target.x, hitPos.y - target.y);
            if (dist <= target.r + 5) {
              hitTarget = target;
              break;
            }
          }
        }
        finishShot(hitTarget, hitPos.x, hitPos.y);
      }
    };

    requestAnimationFrame(animateFlight);
  }

  updateMovingTargetsHUD() {
    const dartsBadge = document.getElementById('moving-darts-count-badge');
    const hitsBadge = document.getElementById('moving-hits-count-badge');

    if (dartsBadge) dartsBadge.textContent = `🏹 ${this.movingDartsLeft} Dardos`;
    if (hitsBadge) hitsBadge.textContent = `🎯 ${this.movingHitsCount}/3 Aciertos`;
  }

  evaluateMovingTargetsFinal(isPleno = false) {
    this.stopMovingTargetsAnim();
    this.isMovingFinished = true;
    this.isRoundOver = true;

    const container = document.getElementById('moving-targets-container');
    if (container) container.style.pointerEvents = 'none';

    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const hintEl = document.getElementById('moving-gesture-hint');

    // Reglas de multiplicador de Tiro al Blanco:
    // 0 aciertos -> pierde el pozo en juego (-1.0)
    // 1 acierto  -> mantiene el pozo en juego (x1.0)
    // 2 aciertos -> duplica el pozo en juego (x2.0)
    // 3 aciertos -> triplica el pozo en juego (x3.0)
    let mult = -1.0;
    if (isPleno || this.movingHitsCount >= 3) {
      mult = 3.0;
    } else if (this.movingHitsCount === 2) {
      mult = 2.0;
    } else if (this.movingHitsCount === 1) {
      mult = 1.0;
    } else {
      mult = -1.0;
    }

    if (this.movingHitsCount >= 1) {
      if (isPleno || this.movingHitsCount >= 3) {
        this.triggerPerfectCelebration("¡PLENO PERFECTO! 🎯", "¡3 de 3 Blancos Acertados! (x3.0)");
      } else if (this.movingHitsCount === 2) {
        if (window.audio) {
          window.audio.playWinFanfare();
          window.audio.playCrowdCheer();
        }
        if (typeof confetti === 'function') {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        }
      } else {
        if (window.audio) {
          window.audio.playSelect();
        }
      }

      this.applyAndAnimateBonusCoins(mult, false);

      if (hintEl) {
        if (this.movingHitsCount === 1) {
          hintEl.innerHTML = `🎯 1/3 Dianas acertadas • Mantienes el pozo (x1.0)`;
          hintEl.className = 'text-center text-xs font-black text-sky-300 mt-1 mb-2';
        } else {
          hintEl.innerHTML = `🏆 ¡${this.movingHitsCount}/3 DIANAS ACERTADAS! (x${mult}.0)`;
          hintEl.className = 'text-center text-sm font-black text-emerald-400 mt-1 mb-2';
        }
      }
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager ? (typeof window.stateManager.hasRouletteBoost === 'function' ? window.stateManager.hasRouletteBoost() : window.stateManager.state.upgrades.rouletteBoost) : false;
      this.applyAndAnimateBonusCoins(-1.0, hasBoost);

      if (hintEl) {
        if (hasBoost) {
          hintEl.textContent = `🛡️ 0/3 aciertos • ¡Seguro activo!`;
          hintEl.className = 'text-center text-xs font-black text-sky-300 mt-1 mb-2';
        } else {
          hintEl.textContent = `❌ 0/3 aciertos • Pierdes el pozo en juego`;
          hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
        }
      }
    }

    this.finalizeRound(null, modalBox);
  }

  // --- CELEBRACIÓN DE GIRO / TIRO PERFECTO ---
  triggerPerfectCelebration(title = "¡MAGISTRAL! 🌟", subtitle = "¡Giro de Precisión Absoluta!") {
    // 0. Registrar logro de tiros perfectos
    if (window.achievementManager) {
      window.achievementManager.increment('perfect_spins_100', 1);
    }

    // 1. Sonidos de victoria y júbilo
    if (window.audio) {
      window.audio.playWinFanfare();
      setTimeout(() => window.audio.playCrowdCheer(), 350);
    }

    // 2. Temblores en pantalla (Screen Shake)
    const shakeTarget = document.getElementById('modal-roulette') || document.body;
    shakeTarget.classList.remove('perfect-screen-shake');
    // Force reflow
    void shakeTarget.offsetWidth;
    shakeTarget.classList.add('perfect-screen-shake');
    setTimeout(() => shakeTarget.classList.remove('perfect-screen-shake'), 650);

    // 3. Lluvia explosiva de confeti multidireccional
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 110,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#ec4899', '#38bdf8', '#10b981', '#fef08a', '#a855f7']
      });
      setTimeout(() => {
        confetti({ particleCount: 65, angle: 60, spread: 60, origin: { x: 0.1, y: 0.6 } });
        confetti({ particleCount: 65, angle: 120, spread: 60, origin: { x: 0.9, y: 0.6 } });
      }, 250);
    }

    // 4. Banner flotante entusiasta (sin términos ajenos)
    const popup = document.createElement('div');
    popup.className = 'perfect-shot-popup';
    popup.innerHTML = `
      <div class="text-2xl sm:text-3xl font-black text-amber-200 tracking-wider">${title}</div>
      <div class="text-xs sm:text-sm font-bold text-white/90 mt-1">${subtitle}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1700);
  }

  updateTrainingModeUI() {
    const btnCashout = document.getElementById('btn-cashout-roulette');
    const bannerEl = document.getElementById('minigame-assigned-banner');
    const tabSelector = document.getElementById('tab-minigame-selector');
    const bagIndicator = document.getElementById('minigame-bag-indicator');
    const cardsDrawer = document.getElementById('alchemy-cards-drawer');
    const betBox = document.getElementById('minigame-bet-box');
    const stakeTitle = document.getElementById('lbl-bonus-stake-title');

    // Ocultar siempre el selector superior y el banner para ahorrar espacio vertical en celular
    if (tabSelector) tabSelector.classList.add('hidden');
    if (bannerEl) bannerEl.classList.add('hidden');

    if (this.fromVictory) {
      // En Modo Historia: mostrar bolsa y cartas, ocultar recuadro de apuesta
      if (bagIndicator) bagIndicator.classList.remove('hidden');
      if (cardsDrawer) cardsDrawer.classList.remove('hidden');
      if (betBox) betBox.classList.add('hidden');
      if (stakeTitle) stakeTitle.textContent = 'Ganado en el nivel:';

      if (btnCashout && !this.roundCompleted) {
        btnCashout.innerHTML = `
          <i data-lucide="fast-forward" class="w-4 h-4 text-slate-400"></i>
          <span>Omitir Bonus y Continuar</span>
        `;
      }
    } else {
      // En Modo Minijuegos (Libre / Apuesta): ocultar cartas y bolsa, mostrar recuadro de apuesta (0, 25, 50)
      if (bagIndicator) bagIndicator.classList.add('hidden');
      if (cardsDrawer) cardsDrawer.classList.add('hidden');
      if (betBox) betBox.classList.remove('hidden');
      if (stakeTitle) stakeTitle.textContent = 'Apuesta en juego:';

      if (btnCashout) {
        btnCashout.innerHTML = `
          <i data-lucide="arrow-left" class="w-4 h-4 text-rose-200"></i>
          <span>Volver al Menú de Minijuegos</span>
        `;
      }
      this.updateBetUI();
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- MARCADOR Y ANIMACIÓN DE MONEDAS DEL BONUS ---
  cancelCoinAnimation() {
    if (this._coinAnimFrame) {
      cancelAnimationFrame(this._coinAnimFrame);
      this._coinAnimFrame = null;
    }
    if (this._coinAnimTimer) {
      clearTimeout(this._coinAnimTimer);
      this._coinAnimTimer = null;
    }
  }

  resetBonusScoreboardUI() {
    this.cancelCoinAnimation();
    const levelEl = document.getElementById('bonus-level-coins-val');
    const totalEl = document.getElementById('bonus-total-coins-val');
    const deltaEl = document.getElementById('bonus-floating-delta');

    if (this.fromVictory) {
      const earned = (window.game && window.game.lastLevelEarnedCoins > 0) ? window.game.lastLevelEarnedCoins : (this.levelCoinsAtStake || 50);
      const walletBefore = (window.game && typeof window.game.lastLevelBaseWallet === 'number')
        ? window.game.lastLevelBaseWallet
        : Math.max(0, (window.game ? window.game.getCoins() : 0) - earned);
      this.levelCoinsAtStake = earned;
      this.walletBeforeBonus = walletBefore;
    } else {
      const walletTotal = window.game ? window.game.getCoins() : 0;
      const validBet = (this.currentBet <= walletTotal) ? (this.currentBet || 0) : 0;
      this.currentBet = validBet;
      this.levelCoinsAtStake = validBet;
      this.walletBeforeBonus = Math.max(0, walletTotal - validBet);
    }

    if (levelEl) {
      levelEl.textContent = this.levelCoinsAtStake;
      levelEl.className = 'text-base sm:text-lg font-black text-amber-300 font-mono tabular-nums transition-all duration-200';
    }
    if (totalEl) {
      totalEl.textContent = this.walletBeforeBonus;
      totalEl.className = 'text-base sm:text-lg font-black text-white font-mono tabular-nums transition-all duration-200';
    }
    if (deltaEl) {
      deltaEl.textContent = '';
      deltaEl.className = 'bonus-delta-badge hidden';
    }
  }

  applyAndAnimateBonusCoins(mult, hasBoost = false) {
    let coinRes = null;
    const effectiveMult = (hasBoost && mult < 1) ? 1.0 : mult;

    if (!this.isTrainingMode && window.game) {
      coinRes = window.game.multiplyCoins(effectiveMult);
    } else {
      const walletTotal = window.game ? window.game.getCoins() : 0;
      const base = (this.currentBet <= walletTotal) ? (this.currentBet || 0) : 0;
      const walletAfterStake = Math.max(0, walletTotal - base);

      if (base <= 0) {
        // Modo diversión / práctica sin apuesta (0 monedas)
        coinRes = {
          baseLevelCoins: 0,
          finalLevelCoins: 0,
          delta: 0,
          gained: 0,
          walletBefore: walletTotal,
          total: walletTotal,
          multiplier: effectiveMult
        };
      } else {
        let finalLvl;
        if (effectiveMult < 0) {
          const lossRatio = Math.min(1, Math.abs(effectiveMult));
          finalLvl = Math.max(0, Math.round(base * (1 - lossRatio)));
        } else {
          finalLvl = Math.round(base * effectiveMult);
        }

        const delta = finalLvl - base;
        const finalWalletTotal = Math.max(0, walletAfterStake + finalLvl);
        const netWalletDiff = finalWalletTotal - walletTotal;

        if (window.game) {
          if (netWalletDiff > 0) {
            window.game.addCoins(netWalletDiff);
          } else if (netWalletDiff < 0) {
            window.game.spendCoins(Math.abs(netWalletDiff));
          }
        }

        coinRes = {
          baseLevelCoins: base,
          finalLevelCoins: finalLvl,
          delta: delta,
          gained: finalLvl,
          walletBefore: walletAfterStake,
          total: window.game ? window.game.getCoins() : finalWalletTotal,
          multiplier: effectiveMult
        };
        this.updateBetUI();
      }
    }

    this.animateBonusCoinResult(coinRes);
    return coinRes;
  }

  animateBonusCoinResult(coinRes) {
    if (!coinRes) return;
    this.cancelCoinAnimation();

    const levelEl = document.getElementById('bonus-level-coins-val');
    const totalEl = document.getElementById('bonus-total-coins-val');
    const deltaEl = document.getElementById('bonus-floating-delta');
    if (!levelEl || !totalEl) return;

    const startLevel = coinRes.baseLevelCoins ?? this.levelCoinsAtStake ?? 0;
    const afterMultLevel = coinRes.finalLevelCoins ?? startLevel;
    const delta = coinRes.delta ?? (afterMultLevel - startLevel);
    const startTotal = coinRes.walletBefore ?? this.walletBeforeBonus ?? 0;
    const finalTotal = coinRes.total ?? Math.max(0, startTotal + afterMultLevel);

    levelEl.textContent = startLevel;
    totalEl.textContent = startTotal;

    // FASE 1: +(importe ganado) en verde hacia arriba o -(importe perdido) en rojo hacia abajo
    if (deltaEl && delta !== 0) {
      deltaEl.classList.remove('hidden', 'bonus-delta-up', 'bonus-delta-down');
      void deltaEl.offsetWidth;
      if (delta > 0) {
        deltaEl.textContent = `+${delta} 🪙`;
        deltaEl.classList.add('bonus-delta-up');
        levelEl.className = 'text-base sm:text-lg font-black text-emerald-400 font-mono tabular-nums scale-110 transition-all duration-200';
      } else {
        deltaEl.textContent = `${delta} 🪙`;
        deltaEl.classList.add('bonus-delta-down');
        levelEl.className = 'text-base sm:text-lg font-black text-rose-400 font-mono tabular-nums scale-110 transition-all duration-200';
      }
    }

    const phase1Duration = delta !== 0 ? 650 : 150;
    const phase1Start = performance.now();

    const stepPhase1 = (now) => {
      const elapsed = now - phase1Start;
      const t = Math.min(1, elapsed / phase1Duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentLvl = Math.round(startLevel + (afterMultLevel - startLevel) * eased);
      levelEl.textContent = currentLvl;

      if (t < 1) {
        this._coinAnimFrame = requestAnimationFrame(stepPhase1);
      } else {
        levelEl.textContent = afterMultLevel;
        this._coinAnimTimer = setTimeout(() => {
          if (deltaEl) {
            deltaEl.classList.add('hidden');
            deltaEl.classList.remove('bonus-delta-up', 'bonus-delta-down');
          }
          this.runPhase2Transfer(afterMultLevel, startTotal, finalTotal, levelEl, totalEl);
        }, 450);
      }
    };

    this._coinAnimFrame = requestAnimationFrame(stepPhase1);
  }

  runPhase2Transfer(afterMultLevel, startTotal, finalTotal, levelEl, totalEl) {
    if (afterMultLevel === 0 && startTotal === finalTotal) {
      levelEl.textContent = '0';
      levelEl.className = 'text-base sm:text-lg font-black text-slate-500 font-mono tabular-nums transition-all duration-200';
      totalEl.textContent = finalTotal;
      return;
    }

    const duration = 850;
    const startTime = performance.now();
    const isPositiveTransfer = finalTotal >= startTotal;

    totalEl.className = `text-base sm:text-lg font-black ${isPositiveTransfer ? 'text-emerald-400' : 'text-rose-400'} font-mono tabular-nums scale-110 transition-all duration-200`;

    const stepTransfer = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      const remLevel = Math.round(afterMultLevel * (1 - eased));
      const curTotal = Math.round(startTotal + (finalTotal - startTotal) * eased);

      levelEl.textContent = remLevel;
      totalEl.textContent = curTotal;

      if (t < 1) {
        this._coinAnimFrame = requestAnimationFrame(stepTransfer);
      } else {
        levelEl.textContent = '0';
        levelEl.className = 'text-base sm:text-lg font-black text-slate-500 font-mono tabular-nums transition-all duration-200';
        totalEl.textContent = finalTotal;
        this._coinAnimTimer = setTimeout(() => {
          if (totalEl) {
            totalEl.className = `text-base sm:text-lg font-black ${isPositiveTransfer ? 'text-emerald-300' : 'text-rose-300'} font-mono tabular-nums transition-all duration-200`;
          }
        }, 300);
      }
    };

    this._coinAnimFrame = requestAnimationFrame(stepTransfer);
  }

  cancelFinalizeTimer() {
    this.cancelCoinAnimation();
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    if (modalBox) modalBox.classList.remove('roulette-lose-glow');
    document.querySelectorAll('.roulette-slice.winner-slice').forEach(el => el.classList.remove('winner-slice'));
    if (this.btnSpin) this.btnSpin.disabled = false;
    this.stopTimingBar();
    this.stopMovingTargetsAnim();
    this.activeCard = null;
    this.calmAtmosphereBenefit = null;
    this.extraShotAvailable = false;
  }

  // --- CIERRE DE RONDA Y RETORNO AL JUEGO ---
  finalizeRound(winningSlice, modalBox) {
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }

    if (this.isTrainingMode) {
      // En Modo Entrenamiento / Libre: Dejar que disfrute el premio y permitir seguir jugando
      this.finalizeTimer = setTimeout(() => {
        this.finalizeTimer = null;
        if (modalBox) modalBox.classList.remove('roulette-lose-glow');
        if (winningSlice) winningSlice.classList.remove('winner-slice');
        if (this.btnSpin) this.btnSpin.disabled = false;

        this.stopTimingBar();
        this.stopMovingTargetsAnim();
        this.activeCard = null;
        this.calmAtmosphereBenefit = null;
        this.extraShotAvailable = false;

        // Reiniciar para la siguiente tirada libre
        this.initRound();

        if (this.timingFeedbackLbl) {
          this.timingFeedbackLbl.innerHTML = '🎯 ¡Tiro completado! Toca para seguir practicando o pulsa "Cobrar y Salir".';
          this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-emerald-300 mt-1 min-h-[16px] animate-pulse';
        }
      }, 3200);
      return;
    }

    // Modo Victoria: Detener animaciones y preparar el botón de confirmación manual
    this.roundCompleted = true;
    this.stopTimingBar();
    this.stopMovingTargetsAnim();
    this.activeCard = null;
    this.calmAtmosphereBenefit = null;
    this.extraShotAvailable = false;

    // Actualizar botón para confirmar la aceptación del premio y avance al siguiente nivel
    const btnCashout = document.getElementById('btn-cashout-roulette');
    if (btnCashout) {
      const nextLvlNum = window.game ? Math.min(window.game.maxLevels || 100, (window.game.currentLevel || 1) + 1) : '';
      btnCashout.className = 'btn-interactive w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/40 text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse';
      btnCashout.innerHTML = `
        <i data-lucide="check-circle-2" class="w-5 h-5 text-slate-950"></i>
        <span>Aceptar y Avanzar al Siguiente Nivel${nextLvlNum ? ' (Nivel ' + nextLvlNum + ')' : ''}</span>
        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-950"></i>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }

    // Modo Victoria: Sin temporizador de cierre automático.
    // La pantalla de bonus permanece abierta para que el usuario disfrute y verifique sus ganancias,
    // y solo avanzará al presionar el botón de Aceptar o Cancelar.
  }

  openModal(coins = 75, fromVictory = false, selectedMode = null) {
    this.cancelFinalizeTimer();
    this.fromVictory = Boolean(fromVictory);
    this.isTrainingMode = !this.fromVictory;
    if (!this.fromVictory) {
      if (selectedMode) {
        this.selectedFreeMode = selectedMode;
      }
      this.currentBet = 0; // Por defecto 0 (diversión sin riesgo) al abrir
    }
    this.roundCompleted = false;
    this.openTimestamp = Date.now();
    this.levelCoinsAtStake = this.fromVictory ? (coins > 0 ? coins : 50) : (this.currentBet || 0);
    if (!this.wheelGroup) this.initDOM();

    // Configurar estado inicial del botón de acción inferior
    const btnCashout = document.getElementById('btn-cashout-roulette');
    if (btnCashout) {
      if (this.fromVictory) {
        btnCashout.className = 'btn-interactive w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 active:scale-95 text-slate-300 hover:text-white font-bold rounded-2xl border border-slate-700 shadow-md text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer';
        btnCashout.innerHTML = `
          <i data-lucide="fast-forward" class="w-4 h-4 text-slate-400"></i>
          <span>Omitir Bonus y Continuar</span>
        `;
      } else {
        btnCashout.className = 'btn-interactive w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 active:scale-95 text-slate-200 hover:text-white font-bold rounded-2xl border border-slate-700 shadow-md text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer';
        btnCashout.innerHTML = `
          <i data-lucide="arrow-left" class="w-4 h-4 text-amber-300"></i>
          <span>Volver al Menú de Minijuegos</span>
        `;
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
    const modal = document.getElementById('modal-roulette');
    if (modal) {
      if (window.game && typeof window.game.showModal === 'function') {
        window.game.showModal(modal);
      } else {
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
      }
    }
    this.updateTrainingModeUI();
    this.initRound();
  }
}

// Instanciación y compatibilidad global
window.rouletteEngine = new MinigameEngine();
window.minigameEngine = window.rouletteEngine;
