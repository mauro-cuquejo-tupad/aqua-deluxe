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
    this.goldWidth = 0.08;   // Achicado al 8% (más costoso)

    // --- DIANA DE DARDOS (SLINGSHOT / RESORTE TÁCTIL) ---
    this.windSpeed = 2.8; // m/s
    this.windAngle = 45;  // grados
    this.isDartFlying = false;
    this.isDraggingSlingshot = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.currentDartPos = { x: 150, y: 315 };
    this.currentImpactPoint = { x: 150, y: 140 };

    // --- DIANAS MÓVILES (3 DIANAS FLOTANTES EN MOVIMIENTO) ---
    this.movingTargets = [];
    this.movingTargetsAnimId = null;
    this.movingDartsLeft = 4;
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initDOM());
    } else {
      setTimeout(() => this.initDOM(), 0);
    }
  }

  initDOM() {
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
    this.setupCardsDrawerUI();
    this.setupRouletteEvents();
    this.setupSlingshotEvents();
    this.setupMovingTargetsEvents();
    this.initRound();
  }

  // Inicializa o reinicia la ronda
  initRound() {
    this.rollRandomMode();
    this.shuffleSlices();
    this.generateNewWind();
    this.renderWheel();
    this.resetDianaTarget();
    this.resetMovingTargets();
    this.updateCardsUI();
    this.updateRulesText();
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
      if (titleEl) titleEl.innerHTML = '<i data-lucide="crosshair" class="w-5 h-5 text-purple-400"></i> Dianas Alquímicas Móviles';
      if (bannerEl && fromRandom) {
        bannerEl.innerHTML = '🎲 ¡Extraído de la Bolsa: <strong>Dianas Móviles</strong>!';
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
    const rouletteCount = drawInfo ? drawInfo.remainingRoulette : bag.tokens.filter(t => t === 'roulette').length;

    const elDiana = document.getElementById('bag-count-diana');
    const elRoulette = document.getElementById('bag-count-roulette');
    if (elDiana) elDiana.textContent = `🎯 ${dianaCount} Diana`;
    if (elRoulette) elRoulette.textContent = `🎡 ${rouletteCount} Ruleta`;
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
    if (this.isSpinning || this.isDartFlying) return;
    if (window.audio) window.audio.init();

    const stateMgr = window.stateManager;
    if (!stateMgr) return;
    const bag = stateMgr.getMinigameBag();

    // Comprobar si ya está activa para desactivar
    if (this.activeCard === cardId || (bag && bag.activeCard === cardId)) {
      if (cardId === 'dianaFavor' || cardId === 'rouletteFavor') {
        stateMgr.deactivateBonusFavorCard();
      }
      this.activeCard = null;
      this.calmAtmosphereBenefit = null;
      this.extraShotAvailable = false;
      if (window.audio) window.audio.playSelect();
      this.initRound();
      return;
    }

    // Verificar si el jugador tiene la carta en inventario
    const cards = stateMgr.getCards();
    if (!cards[cardId] || cards[cardId] <= 0) {
      alert('No dispones de esta carta en tu inventario. Puedes adquirirla en la Tienda Alquímica.');
      return;
    }

    if (cardId === 'dianaFavor' || cardId === 'rouletteFavor') {
      const act = stateMgr.activateBonusFavorCard(cardId, 5);
      if (act.success) {
        this.activeCard = cardId;
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
    } else if (cardId === 'calmAtmosphere') {
      this.windSpeed = 0.0;
      this.windAngle = 0;
      this.updateBreezeVisual();
    }

    this.updateCardsUI();
    this.updateRulesText();
    this.renderWheel();
    this.resetDianaTarget();
  }

  updateCardsUI() {
    const stateMgr = window.stateManager;
    const cards = stateMgr ? stateMgr.getCards() : {};
    const bag = stateMgr ? stateMgr.getMinigameBag() : null;
    const pill = document.getElementById('active-card-pill');
    const countBadge = document.getElementById('lbl-cards-available-count');

    let totalAvailable = 0;
    document.querySelectorAll('.btn-alchemy-card').forEach(btn => {
      const cardId = btn.getAttribute('data-card');
      const countEl = btn.querySelector('.card-count');
      const count = cards[cardId] || 0;
      totalAvailable += count;
      if (countEl) countEl.textContent = `x${count}`;

      const isBagActive = (bag && bag.activeCard === cardId && bag.cardUsesRemaining > 0);
      const isRoundActive = (this.activeCard === cardId);

      if (isBagActive || isRoundActive) {
        btn.classList.add('active-card');
      } else {
        btn.classList.remove('active-card');
      }
    });

    if (countBadge) {
      countBadge.textContent = `(${totalAvailable} disponibles)`;
    }

    if (pill) {
      if (bag && bag.activeCard === 'dianaFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `✨ Favor Diana Activo (${bag.cardUsesRemaining})`;
        pill.className = 'text-[10px] text-sky-300 font-bold px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 animate-pulse';
      } else if (bag && bag.activeCard === 'rouletteFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `✨ Ojo Alquímico Activo (Margen x2)`;
        pill.className = 'text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 animate-pulse';
      } else if (this.activeCard === 'doubleOrNothing') {
        pill.textContent = '✨ Doble o Nada (Multiplicadores x2)';
        pill.className = 'text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400';
      } else if (this.activeCard === 'calmAtmosphere') {
        pill.textContent = '✨ Calma Viento (0.0 m/s)';
        pill.className = 'text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400';
      } else {
        pill.textContent = '🃏 Toca para activar';
        pill.className = 'text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30';
      }
    }
  }

  // --- RULETA: LÓGICA DE SECTORES CON VALORES DIRECTOS ---
  shuffleSlices() {
    let pool = [];
    if (this.activeCard === 'doubleOrNothing') {
      pool = [
        { id: 'mult2_4', label: 'x2.4', value: 2.4, hex: '#38bdf8', isWin: true },
        { id: 'mult4_0', label: 'x4.0', value: 4.0, hex: '#f59e0b', isWin: true },
        { id: 'mult0_0a', label: 'x0 ✕', value: 0.0, hex: '#475569', isWin: false },
        { id: 'mult3_0', label: 'x3.0', value: 3.0, hex: '#10b981', isWin: true },
        { id: 'mult6_0', label: 'x6.0 ★', value: 6.0, hex: '#c084fc', isWin: true },
        { id: 'mult0_0b', label: 'x0 ✕', value: 0.0, hex: '#475569', isWin: false }
      ];
    } else {
      pool = [
        { id: 'mult1_2', label: 'x1.2', value: 1.2, hex: '#38bdf8', isWin: true },
        { id: 'mult2_0', label: 'x2.0', value: 2.0, hex: '#f59e0b', isWin: true },
        { id: 'mult0_5', label: 'x0.5', value: 0.5, hex: '#ef4444', isWin: false },
        { id: 'mult1_5', label: 'x1.5', value: 1.5, hex: '#10b981', isWin: true },
        { id: 'mult3_0', label: 'x3.0 ★', value: 3.0, hex: '#8b5cf6', isWin: true },
        { id: 'mult0_0', label: 'x0 ✕', value: 0.0, hex: '#475569', isWin: false }
      ];
    }

    // Mezclar determinísticamente los sectores
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.sliceValues = pool;
    this.currentAngle = Math.floor(Math.random() * 360);
  }

  setupModeTabs() {
    const tabRoulette = document.getElementById('tab-game-roulette');
    const tabDiana = document.getElementById('tab-game-diana');
    const tabMoving = document.getElementById('tab-game-moving');

    if (tabRoulette) tabRoulette.addEventListener('click', () => this.setMode('roulette', false));
    if (tabDiana) tabDiana.addEventListener('click', () => this.setMode('diana', false));
    if (tabMoving) tabMoving.addEventListener('click', () => this.setMode('moving_targets', false));
  }

  updateRulesText() {
    const subLbl = document.getElementById('lbl-roulette-odds');
    if (!subLbl) return;

    if (this.currentMode === 'roulette') {
      subLbl.innerHTML = `🎡 Clava la aguja en la <strong>Zona Dorada</strong> para asegurar premio • ¡Toca en cualquier parte para girar!`;
    } else if (this.currentMode === 'moving_targets') {
      subLbl.innerHTML = `🎪 <strong>Dianas Móviles:</strong> Acierta las 3 dianas flotantes para llevarte el Gran Bono <strong>x3.5</strong>.`;
    } else {
      let windNote = this.windSpeed <= 0.1
        ? ' • <span class="text-emerald-400 font-bold">¡Viento en calma total!</span>'
        : ` • <span class="text-sky-300 font-bold">Viento: ${this.windSpeed} m/s (Compensa apuntando)</span>`;
      subLbl.innerHTML = `🎯 <strong>Diana Slingshot:</strong> Toca y arrastra hacia atrás • Centro: <strong>x3.0</strong>${windNote}`;
    }
  }

  renderWheel() {
    if (!this.wheelGroup) return;
    this.wheelGroup.innerHTML = '';

    const cx = 150;
    const cy = 150;
    const radius = 130;

    for (let i = 0; i < this.numSlices; i++) {
      const startDeg = i * this.sliceAngle;
      const endDeg = (i + 1) * this.sliceAngle;
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', this.sliceValues[i].hex);
      path.setAttribute('stroke', '#0f172a');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('class', 'roulette-slice');
      path.setAttribute('id', `slice-${i}`);
      path.dataset.index = i;
      this.wheelGroup.appendChild(path);

      const midRad = ((startDeg + endDeg) / 2) * (Math.PI / 180);
      const tx = cx + (radius * 0.65) * Math.cos(midRad);
      const ty = cy + (radius * 0.65) * Math.sin(midRad);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', tx);
      text.setAttribute('y', ty);
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '900');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('pointer-events', 'none');
      text.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))');
      text.textContent = this.sliceValues[i].label;
      this.wheelGroup.appendChild(text);

      const peg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      peg.setAttribute('cx', x1);
      peg.setAttribute('cy', y1);
      peg.setAttribute('r', '6');
      peg.setAttribute('fill', 'url(#gold-peg-grad)');
      peg.setAttribute('stroke', '#ffffff');
      peg.setAttribute('stroke-width', '1.5');
      peg.setAttribute('class', 'roulette-peg');
      peg.setAttribute('id', `peg-${i}`);
      this.wheelGroup.appendChild(peg);
    }
  }

  // --- BARRA DE TIMING ACTIVO (ZONA DORADA ACHICADA AL 8% CON JITTER +-5%) ---
  startTimingBar() {
    this.stopTimingBar();
    this.timingActive = true;
    this.timingPos = 0.5;
    this.timingDirection = 1;
    this.lastTimingNow = performance.now();

    // Jitter aleatorio de +-5% respecto del centro
    this.goldCenter = 0.50 + ((Math.random() - 0.5) * 0.10);
    // Carta Ojo Alquímico duplica el margen del tiro perfecto
    const isEyeActive = (this.activeCard === 'rouletteFavor' || (window.stateManager?.getMinigameBag()?.activeCard === 'rouletteFavor'));
    this.goldWidth = isEyeActive ? 0.16 : 0.08;
    this.timingSpeed = isEyeActive ? 0.55 : 0.95;

    // Actualizar ancho y posición de las 5 zonas en el medidor
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
    const goldMin = Math.max(0.08, this.goldCenter - (this.goldWidth / 2));
    const goldMax = Math.min(0.92, this.goldCenter + (this.goldWidth / 2));
    const blueSpan = 0.20;

    const blueLeftMin = Math.max(0.05, goldMin - blueSpan);
    const redLeftWidth = blueLeftMin;
    const blueLeftWidth = goldMin - blueLeftMin;
    const goldWidthActual = goldMax - goldMin;
    const blueRightMax = Math.min(0.95, goldMax + blueSpan);
    const blueRightWidth = blueRightMax - goldMax;
    const redRightWidth = 1.0 - blueRightMax;

    const zRedLeft = document.getElementById('timing-zone-red-left');
    const zBlueLeft = document.getElementById('timing-zone-blue-left');
    const zGold = document.getElementById('timing-zone-gold');
    const zBlueRight = document.getElementById('timing-zone-blue-right');
    const zRedRight = document.getElementById('timing-zone-red-right');

    if (zRedLeft) zRedLeft.style.width = `${redLeftWidth * 100}%`;
    if (zBlueLeft) zBlueLeft.style.width = `${blueLeftWidth * 100}%`;
    if (zGold) zGold.style.width = `${goldWidthActual * 100}%`;
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
        if (this.timingActive && !this.isSpinning) {
          this.onSpinButtonClicked();
        }
      });
    }
  }

  onSpinButtonClicked() {
    this.stopTimingBar();
    const pos = this.timingPos;

    const goldMin = this.goldCenter - (this.goldWidth / 2);
    const goldMax = this.goldCenter + (this.goldWidth / 2);
    const blueSpan = 0.20;
    const blueMin = goldMin - blueSpan;
    const blueMax = goldMax + blueSpan;

    let timingResult = 'normal';
    if (pos >= goldMin && pos <= goldMax) {
      timingResult = 'perfect';
    } else if (pos < blueMin || pos > blueMax) {
      timingResult = 'fail';
    }

    if (timingResult === 'perfect') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-gold');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⭐ <strong class="text-amber-300">¡TIRO PERFECTO!</strong> Eliminando sectores de quiebra x0 ⭐';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-amber-300 mt-1 min-h-[16px] animate-pulse';
      }
      if (window.audio) window.audio.playWinFanfare();

      // Ventaja inmediata: convertir x0 y x0.5 en sectores ganadores de x2.0 y x3.0
      this.sliceValues = this.sliceValues.map(s => {
        if (!s.isWin) {
          return { id: 'mult2_0_gold', label: 'x2.0 ★', value: 2.0, hex: '#f59e0b', isWin: true };
        }
        return s;
      });
      this.renderWheel();
    } else if (timingResult === 'fail') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-red');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⚠️ <strong class="text-rose-400">Tiro a Destiempo:</strong> riesgo elevado de quiebra ⚠️';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-rose-400 mt-1 min-h-[16px]';
      }
      if (window.audio) window.audio.playFailSound();
    } else {
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '🎯 <strong class="text-sky-300">Tiro Estándar:</strong> giro sin penalización';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-sky-300 mt-1 min-h-[16px]';
      }
      if (window.audio) window.audio.playSelect();
    }

    this.spinWheelWithTiming(timingResult);
  }

  spinWheelWithTiming(timingResult) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    if (this.btnSpin) this.btnSpin.disabled = true;

    // Determinar sector objetivo en base al timing
    let targetSector = 0;
    if (timingResult === 'perfect') {
      const topWins = [];
      this.sliceValues.forEach((s, idx) => {
        if (s.value >= 2.0) topWins.push(idx);
      });
      targetSector = topWins.length > 0 ? topWins[Math.floor(Math.random() * topWins.length)] : 0;
    } else if (timingResult === 'fail') {
      const loseIndices = [];
      this.sliceValues.forEach((s, idx) => {
        if (!s.isWin) loseIndices.push(idx);
      });
      if (loseIndices.length > 0 && Math.random() < 0.75) {
        targetSector = loseIndices[Math.floor(Math.random() * loseIndices.length)];
      } else {
        targetSector = Math.floor(Math.random() * this.numSlices);
      }
    } else {
      targetSector = Math.floor(Math.random() * this.numSlices);
    }

    const baseSpins = 4;
    const sectorCenterOffset = this.sliceAngle / 2;
    const deadzone = 8;
    const randomInSector = (Math.random() - 0.5) * (this.sliceAngle - deadzone * 2);
    const targetAngle = 360 * baseSpins + (targetSector * this.sliceAngle) + sectorCenterOffset + randomInSector;
    const duration = timingResult === 'perfect' ? 2400 : 3200;
    const startTime = performance.now();
    const startAngle = this.currentAngle;
    const totalRotation = targetAngle;
    let lastPegIndex = -1;

    const animateWheel = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const angleNow = startAngle + totalRotation * ease;

      if (this.wheelGroup) {
        this.wheelGroup.style.transform = `rotate(${angleNow}deg)`;
      }

      const activeIdx = this.updateActiveSliceHighlight(angleNow);
      const eff = (270 - (angleNow % 360) + 360) % 360;
      const currentPeg = Math.floor(eff / this.sliceAngle);

      if (currentPeg !== lastPegIndex) {
        lastPegIndex = currentPeg;
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
    const eff = (270 - (angle % 360) + 360) % 360;
    const activeIndex = Math.floor(eff / this.sliceAngle) % this.numSlices;

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

    if (isWinner && mult > 0) {
      if (window.audio) {
        window.audio.playWinFanfare();
        window.audio.playCrowdCheer();
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = `🎉 ¡PREMIO ${landedSector.label}! GANAS MULTIPLICADOR ${mult}x 🪙`;
        this.timingFeedbackLbl.className = 'text-center text-sm font-black text-emerald-400 mt-1';
      }
      if (window.game) window.game.multiplyCoins(mult);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager && window.stateManager.state.upgrades.rouletteBoost;
      if (!hasBoost && window.game) {
        window.game.multiplyCoins(mult); // Aplica x0.5 o x0
      }

      if (this.timingFeedbackLbl) {
        const msg = hasBoost
          ? `Cayó en ${landedSector.label}. ¡Seguro activo! Conservas tus monedas.`
          : `Cayó en ${landedSector.label}. Se reduce el bono.`;
        this.timingFeedbackLbl.innerHTML = `❌ ${msg}`;
        this.timingFeedbackLbl.className = 'text-center text-xs font-black text-rose-400 mt-1';
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
      this.windSpeed = +(Math.random() * 2.8 + 1.8).toFixed(1); // 1.8 a 4.6 m/s
      // Ángulos principales: horizontal izquierda/derecha
      const angles = [0, 15, 345, 180, 165, 195];
      this.windAngle = angles[Math.floor(Math.random() * angles.length)];
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
      const isBlowingLeft = (this.windAngle >= 90 && this.windAngle <= 270);
      breezeGroup.style.transform = isBlowingLeft ? 'scaleX(-1)' : 'scaleX(1)';
      breezeGroup.style.transformOrigin = '150px 140px';
    }
  }

  resetDianaTarget() {
    this.isDartFlying = false;
    this.isDraggingSlingshot = false;
    this.currentDartPos = { x: 150, y: 315 };
    this.updateSlingshotVisuals(150, 315, 0, 0, false);

    const impactsGroup = document.getElementById('diana-impacts-group');
    if (impactsGroup) impactsGroup.innerHTML = '';
    const dartsGroup = document.getElementById('diana-darts-group');
    if (dartsGroup) dartsGroup.innerHTML = '';

    const hintEl = document.getElementById('diana-gesture-hint');
    if (hintEl) {
      hintEl.textContent = '🏹 Toca en cualquier parte, arrastra hacia abajo y suelta para lanzar';
      hintEl.className = 'text-center text-[11px] font-bold text-sky-300 mt-1 mb-2 animate-pulse';
    }
  }

  setupSlingshotEvents() {
    const container = document.getElementById('diana-target-container');
    if (!container) return;

    const onPointerDown = (e) => {
      if (this.isDartFlying) return;
      if (e.target.closest('button') || e.target.closest('#alchemy-cards-drawer') || e.target.closest('#tab-minigame-selector')) {
        return;
      }
      if (window.audio) window.audio.init();

      // Permitir iniciar el swipe desde CUALQUIER posición de la pantalla
      this.isDraggingSlingshot = true;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      container.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!this.isDraggingSlingshot || this.isDartFlying) return;
      const rect = container.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 360 / rect.height;

      const dx = (e.clientX - this.dragStartPos.x) * scaleX;
      const dy = (e.clientY - this.dragStartPos.y) * scaleY;

      // Restricción de estiramiento del resorte
      const clampedDx = Math.max(-70, Math.min(70, dx));
      const clampedDy = Math.max(12, Math.min(85, dy)); // Arrastre hacia abajo para tensar

      const dartX = 150 + clampedDx;
      const dartY = 315 + (clampedDy * 0.45);
      this.currentDartPos = { x: dartX, y: dartY };

      this.updateSlingshotVisuals(dartX, dartY, clampedDx, clampedDy, true);
    };

    const onPointerUp = (e) => {
      if (!this.isDraggingSlingshot) return;
      this.isDraggingSlingshot = false;
      try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}

      const pullDistance = Math.hypot(this.currentDartPos.x - 150, this.currentDartPos.y - 315);
      if (pullDistance > 6) {
        this.launchSlingshotDart();
      } else {
        this.updateSlingshotVisuals(150, 315, 0, 0, false);
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
  }

  updateSlingshotVisuals(dartX, dartY, pullX, pullY, isStretched) {
    if (this.slingshotDart) {
      this.slingshotDart.setAttribute('transform', `translate(${dartX}, ${dartY})`);
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
      return;
    }

    // Tensión ligeramente incrementada (+3.5%) para requerir un gesto levemente más largo y controlado
    const tensionX = 1.35;
    const tensionY = 1.85;
    const nominalPullY = 48; // Pull nominal que apunta directamente a Y=140 (centro)

    // Apuntado base (la fuerza y ángulo de tiro)
    const aimTargetX = 150 - (pullX * tensionX);
    const aimTargetY = 140 - ((pullY - nominalPullY) * tensionY);

    // Desvío por viento en tiempo real (empuje real sobre el dardo)
    const windRad = (this.windAngle * Math.PI) / 180;
    const windPushX = Math.cos(windRad) * (this.windSpeed * 8.5);
    const windPushY = Math.sin(windRad) * (this.windSpeed * 4.2);

    // El punto de impacto real sufre la desviación del viento
    const impactX = Math.round(Math.max(20, Math.min(280, aimTargetX + windPushX)));
    const impactY = Math.round(Math.max(20, Math.min(265, aimTargetY + windPushY)));
    this.currentImpactPoint = { x: impactX, y: impactY };

    // Punto de control de la curva para que la trayectoria se combe visiblemente con el viento
    const ctrlX = (dartX + impactX) / 2 + (windPushX * 0.8);
    const ctrlY = (dartY + impactY) / 2 + (windPushY * 0.8);

    if (this.slingshotTrajectory) {
      this.slingshotTrajectory.setAttribute('d', `M ${dartX} ${dartY} Q ${ctrlX} ${ctrlY} ${impactX} ${impactY}`);
      this.slingshotTrajectory.setAttribute('opacity', '0.9');
    }
    if (this.trajectoryAimDot) {
      this.trajectoryAimDot.setAttribute('cx', impactX);
      this.trajectoryAimDot.setAttribute('cy', impactY);
      this.trajectoryAimDot.setAttribute('opacity', '0.85');
    }
  }

  launchSlingshotDart() {
    if (this.isDartFlying) return;
    this.isDartFlying = true;

    if (window.audio) window.audio.playDartThrow();

    const startX = this.currentDartPos.x;
    const startY = this.currentDartPos.y;
    const hitX = this.currentImpactPoint.x;
    const hitY = this.currentImpactPoint.y;

    this.updateSlingshotVisuals(150, 315, 0, 0, false);

    const dartsGroup = document.getElementById('diana-darts-group');
    if (dartsGroup) {
      dartsGroup.innerHTML = `
        <g id="flying-slingshot-dart" transform="translate(${startX}, ${startY})">
          <circle cx="0" cy="0" r="5" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
        </g>
      `;

      const flyingEl = document.getElementById('flying-slingshot-dart');
      if (flyingEl && flyingEl.animate) {
        flyingEl.animate([
          { transform: `translate(${startX}px, ${startY}px) scale(1.3)`, opacity: 1 },
          { transform: `translate(${hitX}px, ${hitY}px) scale(0.85)`, opacity: 1 }
        ], {
          duration: 320,
          easing: 'ease-out',
          fill: 'forwards'
        });
      }
    }

    setTimeout(() => {
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
    }, 330);
  }

  evaluateDianaImpact(x, y) {
    const cx = 150;
    const cy = 140;
    const dist = Math.hypot(x - cx, y - cy);
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const hintEl = document.getElementById('diana-gesture-hint');

    let multiplier = 0;
    let label = 'Fuera';

    if (dist <= 28) {
      multiplier = 3.0;
      label = '⭐ ¡CENTRO DE ORO! (x3.0)';
    } else if (dist <= 75) {
      multiplier = 1.5;
      label = '✨ ¡ANILLO DE PLATA! (x1.5)';
    } else if (dist <= 130) {
      multiplier = 1.2;
      label = '🎯 ¡ANILLO DE BRONCE! (x1.2)';
    } else {
      multiplier = 0;
      label = '❌ ¡TIRO FUERA DE LA DIANA!';
    }

    if (this.extraShotAvailable && multiplier < 1.5) {
      this.extraShotAvailable = false;
      if (hintEl) {
        hintEl.textContent = '¡Tiro extra de respaldo activo! ¡Vuelve a estirar el resorte!';
        hintEl.className = 'text-center text-xs font-black text-amber-300 mt-1 mb-2 animate-bounce';
      }
      this.updateCardsUI();
      return;
    }

    if (multiplier > 0) {
      if (window.audio) {
        window.audio.playWinFanfare();
        window.audio.playCrowdCheer();
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
      if (hintEl) {
        hintEl.innerHTML = `${label} • <strong class="text-amber-300">GANAS ${multiplier}x 🪙</strong>`;
        hintEl.className = 'text-center text-sm font-black text-emerald-400 mt-1 mb-2';
      }
      if (window.game) window.game.multiplyCoins(multiplier);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager && window.stateManager.state.upgrades.rouletteBoost;
      if (!hasBoost && window.game) {
        window.game.multiplyCoins(0.5);
      }

      if (hintEl) {
        const msg = hasBoost ? '¡Desviado! Seguro activo: sin pérdida.' : '¡Desviado! Pierdes el 50% de las monedas.';
        hintEl.textContent = `${label} • ${msg}`;
        hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
      }
    }

    this.finalizeRound(null, modalBox);
  }

  // --- DIANAS MÓVILES (MINIJUEGO 3: 3 BLANCOS FLOTANTES EN MOVIMIENTO) ---
  resetMovingTargets() {
    this.movingDartsLeft = 4;
    this.movingHitsCount = 0;
    this.movingTargets = [
      { id: 0, x: 150, y: 65, r: 16, vx: 1.3, minX: 45, maxX: 255, hit: false, mult: 3.0, name: 'Oro', color: '#facc15' },
      { id: 1, x: 100, y: 125, r: 20, vx: -1.6, minX: 40, maxX: 260, hit: false, mult: 2.0, name: 'Plata', color: '#e2e8f0' },
      { id: 2, x: 180, y: 185, r: 24, vx: 1.1, minX: 35, maxX: 265, hit: false, mult: 1.5, name: 'Bronce', color: '#f59e0b' }
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
    let movingStartPos = { x: 0, y: 0 };
    let currentMovingDartPos = { x: 150, y: 315 };
    let currentMovingImpact = { x: 150, y: 125 };

    const dartEl = document.getElementById('moving-slingshot-dart');
    const bandLeft = document.getElementById('moving-band-left');
    const bandRight = document.getElementById('moving-band-right');
    const trajectoryEl = document.getElementById('moving-trajectory');

    const updateVisuals = (dx, dy, isStretched) => {
      const dX = 150 + dx;
      const dY = 315 + (dy * 0.45);
      currentMovingDartPos = { x: dX, y: dY };

      if (dartEl) dartEl.setAttribute('transform', `translate(${dX}, ${dY})`);
      if (bandLeft) { bandLeft.setAttribute('x2', dX); bandLeft.setAttribute('y2', dY); }
      if (bandRight) { bandRight.setAttribute('x2', dX); bandRight.setAttribute('y2', dY); }

      if (!isStretched) {
        if (trajectoryEl) trajectoryEl.setAttribute('opacity', '0');
        return;
      }

      const aimX = 150 - (dx * 1.35);
      const aimY = 125 - ((dy - 48) * 1.85);
      currentMovingImpact = { x: Math.max(20, Math.min(280, aimX)), y: Math.max(30, Math.min(250, aimY)) };

      const ctrlX = (dX + currentMovingImpact.x) / 2;
      const ctrlY = (dY + currentMovingImpact.y) / 2;

      if (trajectoryEl) {
        trajectoryEl.setAttribute('d', `M ${dX} ${dY} Q ${ctrlX} ${ctrlY} ${currentMovingImpact.x} ${currentMovingImpact.y}`);
        trajectoryEl.setAttribute('opacity', '0.9');
      }
    };

    container.addEventListener('pointerdown', (e) => {
      if (this.isDartFlying || this.movingDartsLeft <= 0) return;
      if (e.target.closest('button')) return;
      if (window.audio) window.audio.init();

      isMovingDragging = true;
      movingStartPos = { x: e.clientX, y: e.clientY };
      container.setPointerCapture?.(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
      if (!isMovingDragging || this.isDartFlying) return;
      const rect = container.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 360 / rect.height;

      const dx = (e.clientX - movingStartPos.x) * scaleX;
      const dy = (e.clientY - movingStartPos.y) * scaleY;

      const clampedDx = Math.max(-70, Math.min(70, dx));
      const clampedDy = Math.max(12, Math.min(85, dy));
      updateVisuals(clampedDx, clampedDy, true);
    });

    const onPointerUp = (e) => {
      if (!isMovingDragging) return;
      isMovingDragging = false;
      try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}

      updateVisuals(0, 0, false);
      this.launchMovingDart(currentMovingDartPos, currentMovingImpact);
    };

    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
  }

  launchMovingDart(startPos, hitPos) {
    if (this.isDartFlying || this.movingDartsLeft <= 0) return;
    this.isDartFlying = true;
    this.movingDartsLeft--;
    this.updateMovingTargetsHUD();

    if (window.audio) window.audio.playDartThrow();

    const dartsGroup = document.getElementById('moving-darts-anim-group');
    if (dartsGroup) {
      dartsGroup.innerHTML = `
        <circle id="flying-moving-dart" cx="${startPos.x}" cy="${startPos.y}" r="5" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
      `;
      const flyingEl = document.getElementById('flying-moving-dart');
      if (flyingEl && flyingEl.animate) {
        flyingEl.animate([
          { transform: `translate(0, 0) scale(1.3)`, opacity: 1 },
          { transform: `translate(${hitPos.x - startPos.x}px, ${hitPos.y - startPos.y}px) scale(0.85)`, opacity: 1 }
        ], {
          duration: 320,
          easing: 'ease-out',
          fill: 'forwards'
        });
      }
    }

    setTimeout(() => {
      if (dartsGroup) dartsGroup.innerHTML = '';
      this.isDartFlying = false;

      // Evaluar impacto en alguna de las 3 dianas
      let hitTarget = null;
      for (const t of this.movingTargets) {
        if (!t.hit) {
          const dist = Math.hypot(hitPos.x - t.x, hitPos.y - t.y);
          if (dist <= t.r + 7) {
            hitTarget = t;
            break;
          }
        }
      }

      const hintEl = document.getElementById('moving-gesture-hint');

      if (hitTarget) {
        hitTarget.hit = true;
        this.movingHitsCount++;
        if (window.audio) {
          window.audio.playDartHit();
          window.audio.playPop();
        }

        const el = document.getElementById(`moving-target-${hitTarget.id}`);
        if (el) {
          el.classList.add('moving-target-hit');
        }

        if (hintEl) {
          hintEl.innerHTML = `⭐ ¡IMPACTO EN DIANA ${hitTarget.name.toUpperCase()}! (${this.movingHitsCount}/3)`;
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
        if (hintEl) {
          hintEl.innerHTML = `💨 ¡Dardo esquivado! Quedan ${this.movingDartsLeft} dardos`;
          hintEl.className = 'text-center text-xs font-bold text-slate-400 mt-1 mb-2';
        }
      }

      // Si se quedaron sin dardos
      if (this.movingDartsLeft <= 0) {
        this.evaluateMovingTargetsFinal(false);
      }
    }, 330);
  }

  updateMovingTargetsHUD() {
    const dartsBadge = document.getElementById('moving-darts-count-badge');
    const hitsBadge = document.getElementById('moving-hits-count-badge');

    if (dartsBadge) dartsBadge.textContent = `🏹 ${this.movingDartsLeft} Dardos`;
    if (hitsBadge) hitsBadge.textContent = `🎯 ${this.movingHitsCount}/3 Aciertos`;
  }

  evaluateMovingTargetsFinal(isPleno = false) {
    this.stopMovingTargetsAnim();
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const hintEl = document.getElementById('moving-gesture-hint');

    let mult = 1.0;
    if (isPleno || this.movingHitsCount >= 3) {
      mult = 3.5;
    } else if (this.movingHitsCount === 2) {
      mult = 2.0;
    } else if (this.movingHitsCount === 1) {
      mult = 1.4;
    } else {
      mult = 0.5;
    }

    if (mult >= 1.4) {
      if (window.audio) {
        window.audio.playWinFanfare();
        window.audio.playCrowdCheer();
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      if (hintEl) {
        hintEl.innerHTML = `🏆 ¡PLENO ALQUÍMICO! ${this.movingHitsCount}/3 DIANAS • GANAS ${mult}x 🪙`;
        hintEl.className = 'text-center text-sm font-black text-emerald-400 mt-1 mb-2';
      }
      if (window.game) window.game.multiplyCoins(mult);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();
      if (hintEl) {
        hintEl.textContent = `❌ ${this.movingHitsCount}/3 aciertos. Fin de dardos.`;
        hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
      }
      if (window.game) window.game.multiplyCoins(mult);
    }

    this.finalizeRound(null, modalBox);
  }

  // --- CIERRE DE RONDA Y RETORNO AL JUEGO ---
  finalizeRound(winningSlice, modalBox) {
    setTimeout(() => {
      const modal = document.getElementById('modal-roulette');
      if (modal) {
        if (window.game && typeof window.game.hideModal === 'function') {
          window.game.hideModal(modal);
        } else {
          modal.classList.add('hidden');
          modal.style.setProperty('display', 'none', 'important');
        }
      }

      if (modalBox) modalBox.classList.remove('roulette-lose-glow');
      if (winningSlice) winningSlice.classList.remove('winner-slice');
      if (this.btnSpin) this.btnSpin.disabled = false;

      this.stopTimingBar();
      this.stopMovingTargetsAnim();
      this.activeCard = null;
      this.calmAtmosphereBenefit = null;
      this.extraShotAvailable = false;

      if (window.game) {
        window.game.onRouletteClosed();
      }
    }, 2600);
  }

  openModal(coins = 50) {
    if (!this.wheelGroup) this.initDOM();
    const modal = document.getElementById('modal-roulette');
    if (modal) {
      if (window.game && typeof window.game.showModal === 'function') {
        window.game.showModal(modal);
      } else {
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
      }
    }
    this.initRound();
  }
}

// Instanciación y compatibilidad global
window.rouletteEngine = new MinigameEngine();
window.minigameEngine = window.rouletteEngine;
