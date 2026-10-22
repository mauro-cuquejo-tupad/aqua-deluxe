/* ==========================================================================
   AQUASORT MASTER DELUXE - MINIGAME ENGINE (RULETA ALEATORIA Y DIANA BALÍSTICA)
   - Ruleta: Barra de Timing Activo (Riesgo vs. Recompensa) con 3 zonas (Roja, Azul, Dorada).
   - Diana: Arrastre hacia atrás (Slingshot / Resorte) con trayectoria curva en tiempo real
     que responde al viento ambiental y 3 anillos sólidos (Bronce x1.2, Plata x1.5, Oro x3.0).
   - Área de juego despejada, táctil e intuitiva para celular (iPhone XR / iPhone 14).
   ========================================================================== */

class MinigameEngine {
  constructor() {
    this.currentMode = 'diana'; // 'diana' | 'roulette'

    // --- CARTAS ALQUÍMICAS ---
    this.activeCard = null; // 'dianaFavor' | 'rouletteFavor' | 'doubleOrNothing' | 'calmAtmosphere'
    this.extraShotAvailable = false;
    this.calmAtmosphereBenefit = null; // 'noWind' | 'slowMeter' | 'extraShot'

    // --- RULETA (BARRA DE TIMING ACTIVO) ---
    this.numSlices = 6;
    this.sliceAngle = 360 / this.numSlices; // 60 grados
    this.baseColors = [
      { id: 'red', name: 'Rojo', hex: '#ef4444' },
      { id: 'blue', name: 'Azul', hex: '#3b82f6' },
      { id: 'green', name: 'Verde', hex: '#10b981' }
    ];
    this.sliceColors = [];
    this.selectedColors = ['blue']; // 1 o 2 colores
    this.isSpinning = false;
    this.currentAngle = 0;

    // Oscilación de aguja de timing en ruleta
    this.timingPos = 0.5; // 0.0 a 1.0
    this.timingDirection = 1;
    this.timingSpeed = 0.95; // Velocidad media-rápida (ciclo ~1.1s)
    this.timingActive = false;
    this.timingAnimId = null;
    this.lastTimingNow = 0;

    // --- DIANA DE DARDOS (SLINGSHOT / RESORTE TÁCTIL) ---
    this.windSpeed = 2.8; // m/s
    this.windAngle = 45;  // grados
    this.isDartFlying = false;
    this.isDraggingSlingshot = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.currentDartPos = { x: 150, y: 315 };
    this.currentImpactPoint = { x: 150, y: 140 };

    // Elementos DOM
    this.wheelContainer = null;
    this.dianaContainer = null;
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
    this.setupCardsUI();
    this.setupRouletteEvents();
    this.setupSlingshotEvents();
    this.initRound();
  }

  // Inicializa o reinicia la ronda
  initRound() {
    this.rollRandomMode();
    this.shuffleSlices();
    this.generateNewWind();
    this.renderWheel();
    this.resetDianaTarget();
    this.updateCardsUI();
    this.updateRulesText();
    this.startTimingBar();
  }

  // Selección aleatoria desde la bolsa alquímica (3 Diana y 3 Ruleta)
  rollRandomMode() {
    if (!window.stateManager) {
      this.setMode(Math.random() < 0.5 ? 'diana' : 'roulette', true);
      return;
    }

    const drawResult = window.stateManager.drawMinigameToken();
    this.lastBagDraw = drawResult;
    this.setMode(drawResult.chosen, true, drawResult);
    this.updateBagIndicatorUI(drawResult);
  }

  setMode(mode, fromRandom = false, bagInfo = null) {
    this.currentMode = mode;
    const tabRoulette = document.getElementById('tab-game-roulette') || document.getElementById('tab-minigame-roulette');
    const tabDiana = document.getElementById('tab-game-diana') || document.getElementById('tab-minigame-diana');
    const titleEl = document.getElementById('minigame-title');
    const bannerEl = document.getElementById('minigame-assigned-banner');

    if (mode === 'roulette') {
      if (tabRoulette) tabRoulette.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md transition-all';
      if (tabDiana) tabDiana.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all';

      if (this.wheelContainer) this.wheelContainer.classList.remove('hidden');
      if (this.dianaContainer) this.dianaContainer.classList.add('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="disc" class="w-5 h-5 text-amber-400"></i> Ruleta de la Fortuna';
      if (bannerEl && fromRandom) {
        if (bagInfo) {
          const cardNote = bagInfo.activeCardName === 'rouletteFavor' ? ` • ✨ Favor Ruleta (${bagInfo.cardUsesRemaining} restantes)` : '';
          const refillNote = bagInfo.wasEmptied ? ' 🔄 (¡Bolsa rellenada!)' : '';
          bannerEl.innerHTML = `🎲 ¡Extraído de la Bolsa: <strong>Ruleta Alquímica</strong>!${cardNote}${refillNote}`;
        } else {
          bannerEl.innerHTML = '🎲 ¡Minijuego Asignado: Ruleta Alquímica!';
        }
      }
      this.startTimingBar();
    } else {
      if (tabDiana) tabDiana.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md transition-all';
      if (tabRoulette) tabRoulette.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all';

      if (this.wheelContainer) this.wheelContainer.classList.add('hidden');
      if (this.dianaContainer) this.dianaContainer.classList.remove('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="crosshair" class="w-5 h-5 text-sky-400"></i> Diana de Dardos Alquímica';
      if (bannerEl && fromRandom) {
        if (bagInfo) {
          const cardNote = bagInfo.activeCardName === 'dianaFavor' ? ` • ✨ Favor Diana (${bagInfo.cardUsesRemaining} restantes)` : '';
          const refillNote = bagInfo.wasEmptied ? ' 🔄 (¡Bolsa rellenada!)' : '';
          bannerEl.innerHTML = `🎲 ¡Extraído de la Bolsa: <strong>Diana de Dardos</strong>!${cardNote}${refillNote}`;
        } else {
          bannerEl.innerHTML = '🎲 ¡Minijuego Asignado: Diana de Dardos!';
        }
      }
      this.stopTimingBar();
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

  // --- GESTIÓN DE CARTAS ALQUÍMICAS ---
  setupCardsUI() {
    document.querySelectorAll('.btn-alchemy-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
        this.setMode(cardId === 'dianaFavor' ? 'diana' : 'roulette', false);
        this.updateCardsUI();
        this.updateBagIndicatorUI();
      }
      return;
    }

    stateMgr.consumeCard(cardId);
    this.activeCard = cardId;
    if (window.audio) window.audio.playUnlock();

    if (cardId === 'doubleOrNothing') {
      this.setMode('roulette', false);
      this.shuffleSlices();
    } else if (cardId === 'calmAtmosphere') {
      this.setMode('diana', false);
      const benefits = ['noWind', 'slowMeter', 'extraShot'];
      this.calmAtmosphereBenefit = benefits[Math.floor(Math.random() * benefits.length)];
      if (this.calmAtmosphereBenefit === 'noWind') {
        this.windSpeed = 0.0;
        this.windAngle = 0;
        this.updateBreezeVisual();
      } else if (this.calmAtmosphereBenefit === 'slowMeter') {
        this.timingSpeed = 0.45;
      } else if (this.calmAtmosphereBenefit === 'extraShot') {
        this.extraShotAvailable = true;
      }
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

    document.querySelectorAll('.btn-alchemy-card').forEach(btn => {
      const cardId = btn.getAttribute('data-card');
      const countEl = btn.querySelector('.card-count');
      const count = cards[cardId] || 0;
      if (countEl) countEl.textContent = `x${count}`;

      const isBagActive = (bag && bag.activeCard === cardId && bag.cardUsesRemaining > 0);
      const isRoundActive = (this.activeCard === cardId);

      if (isBagActive || isRoundActive) {
        btn.classList.add('active-card');
      } else {
        btn.classList.remove('active-card');
      }
    });

    if (pill) {
      if (bag && bag.activeCard === 'dianaFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `✨ Favor Diana Activo (${bag.cardUsesRemaining} bonuses)`;
        pill.className = 'text-[10px] text-sky-300 font-bold px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 animate-pulse';
      } else if (bag && bag.activeCard === 'rouletteFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `✨ Favor Ruleta Activo (${bag.cardUsesRemaining} bonuses)`;
        pill.className = 'text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 animate-pulse';
      } else if (this.activeCard === 'doubleOrNothing') {
        pill.textContent = '✨ Doble o Nada (Ruleta 2 colores x2.0)';
        pill.className = 'text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400';
      } else if (this.activeCard === 'calmAtmosphere') {
        const desc = this.calmAtmosphereBenefit === 'noWind'
          ? 'Brisa Inerte (Sin Viento)'
          : (this.calmAtmosphereBenefit === 'slowMeter' ? 'Medidor Lento (Máxima Precisión)' : 'Tiro Extra de Respaldo');
        pill.textContent = `✨ ${desc}`;
        pill.className = 'text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400';
      } else {
        pill.textContent = 'Toca una carta para activarla';
        pill.className = 'text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30';
      }
    }
  }

  // --- RULETA: LÓGICA DE SECTORES ---
  shuffleSlices() {
    let pool = [];
    if (this.activeCard === 'doubleOrNothing') {
      pool = [
        { id: 'red', name: 'Rojo', hex: '#ef4444' },
        { id: 'red', name: 'Rojo', hex: '#ef4444' },
        { id: 'red', name: 'Rojo', hex: '#ef4444' },
        { id: 'blue', name: 'Azul', hex: '#3b82f6' },
        { id: 'blue', name: 'Azul', hex: '#3b82f6' },
        { id: 'blue', name: 'Azul', hex: '#3b82f6' }
      ];
    } else {
      pool = [
        { id: 'red', name: 'Rojo', hex: '#ef4444' },
        { id: 'blue', name: 'Azul', hex: '#3b82f6' },
        { id: 'green', name: 'Verde', hex: '#10b981' },
        { id: 'red', name: 'Rojo', hex: '#ef4444' },
        { id: 'blue', name: 'Azul', hex: '#3b82f6' },
        { id: 'green', name: 'Verde', hex: '#10b981' }
      ];
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.sliceColors = pool;
    this.currentAngle = Math.floor(Math.random() * 360);
  }

  setupModeTabs() {
    const tabRoulette = document.getElementById('tab-game-roulette') || document.getElementById('tab-minigame-roulette');
    const tabDiana = document.getElementById('tab-game-diana') || document.getElementById('tab-minigame-diana');
    if (tabRoulette && tabDiana) {
      tabRoulette.addEventListener('click', () => this.setMode('roulette', false));
      tabDiana.addEventListener('click', () => this.setMode('diana', false));
    }
  }

  updateRulesText() {
    const subLbl = document.getElementById('lbl-roulette-odds');
    const betModeLbl = document.getElementById('roulette-bet-mode-lbl');
    if (!subLbl) return;

    if (this.currentMode === 'roulette') {
      if (this.activeCard === 'doubleOrNothing') {
        subLbl.innerHTML = `⚖️ <strong>Doble o Nada:</strong> 50% probabilidad • Ganas <strong>x2.0</strong> • Si fallas pierdes tus monedas.`;
        if (betModeLbl) betModeLbl.innerHTML = 'Doble o Nada: x2.0';
      } else {
        const isOne = this.selectedColors.length === 1;
        subLbl.innerHTML = `Clava la aguja en la <strong>Zona Dorada</strong> para ventaja • Ganas <strong>${isOne ? 'x2.0' : 'x1.5'}</strong>`;
        if (betModeLbl) betModeLbl.innerHTML = isOne ? '1 color: x2.0' : '2 colores: x1.5';
      }
    } else {
      let benefitNote = '';
      if (this.activeCard === 'calmAtmosphere') {
        if (this.calmAtmosphereBenefit === 'noWind') benefitNote = ' • <span class="text-emerald-400 font-bold">¡Sin Viento!</span>';
        if (this.calmAtmosphereBenefit === 'extraShot') benefitNote = ' • <span class="text-emerald-400 font-bold">¡Tiro Extra!</span>';
      }
      subLbl.innerHTML = `🎯 <strong>Diana Slingshot:</strong> Arrastra hacia atrás y suelta para lanzar • Centro: <strong>x3.0</strong>, Anillos: <strong>x1.5 / x1.2</strong>${benefitNote}`;
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
      path.setAttribute('fill', this.sliceColors[i].hex);
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
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '900');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('pointer-events', 'none');
      text.textContent = this.sliceColors[i].name.toUpperCase();
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

  // --- BARRA DE TIMING ACTIVO (RIESGO VS RECOMPENSA) ---
  startTimingBar() {
    this.stopTimingBar();
    this.timingActive = true;
    this.timingPos = 0.5;
    this.timingDirection = 1;
    this.lastTimingNow = performance.now();

    if (this.timingNeedle) {
      this.timingNeedle.classList.remove('locked-gold', 'locked-red');
      this.timingNeedle.style.left = '50%';
    }
    if (this.timingFeedbackLbl) {
      this.timingFeedbackLbl.innerHTML = '¡Toca <strong class="text-amber-400">"¡GIRAR!"</strong> para clavar la aguja en el centro dorado!';
      this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-slate-400 mt-1 min-h-[16px]';
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

  stopTimingBar() {
    this.timingActive = false;
    if (this.timingAnimId) {
      cancelAnimationFrame(this.timingAnimId);
      this.timingAnimId = null;
    }
  }

  setupRouletteEvents() {
    // Selección de color apostado
    document.querySelectorAll('.btn-color-pick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        this.toggleColorBet(color, e.currentTarget);
      });
    });

    // Botón instantáneo ¡GIRAR!
    if (this.btnSpin) {
      this.btnSpin.addEventListener('click', () => {
        if (this.isSpinning || !this.timingActive) return;
        this.onSpinButtonClicked();
      });
    }
  }

  toggleColorBet(color, element) {
    if (this.isSpinning) return;
    if (window.audio) {
      window.audio.init();
      window.audio.playPegClack();
    }

    if (this.selectedColors.includes(color)) {
      if (this.selectedColors.length > 1) {
        this.selectedColors = this.selectedColors.filter(c => c !== color);
        element.classList.remove('active-choice');
      }
    } else {
      if (this.selectedColors.length >= 2) {
        this.selectedColors.shift();
        document.querySelectorAll('.btn-color-pick').forEach(b => b.classList.remove('active-choice'));
      }
      this.selectedColors.push(color);
      element.classList.add('active-choice');
    }

    this.updateRulesText();
  }

  onSpinButtonClicked() {
    this.stopTimingBar();
    const pos = this.timingPos;

    // Clasificación de zonas:
    // Zona Dorada (Centro 15%): [0.425, 0.575]
    // Zona Azul / Normal (50%): [0.175, 0.425) y (0.575, 0.825]
    // Zona Roja (Fallo 35%): < 0.175 o > 0.825
    let timingResult = 'normal';
    if (pos >= 0.425 && pos <= 0.575) {
      timingResult = 'perfect';
    } else if (pos < 0.175 || pos > 0.825) {
      timingResult = 'fail';
    }

    if (timingResult === 'perfect') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-gold');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⭐ <strong class="text-amber-300">¡TIRO PERFECTO!</strong> Ventaja Dorada: eliminando sector perdedor ⭐';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-amber-300 mt-1 min-h-[16px] animate-pulse';
      }
      if (window.audio) window.audio.playWinFanfare();

      // Ventaja inmediata visible: convertir los sectores perdedores en el color elegido del jugador
      const myColorId = this.selectedColors[0] || 'blue';
      const myColorObj = this.baseColors.find(c => c.id === myColorId) || this.baseColors[1];
      this.sliceColors = this.sliceColors.map(c => this.selectedColors.includes(c.id) ? c : myColorObj);
      this.renderWheel();
    } else if (timingResult === 'fail') {
      if (this.timingNeedle) this.timingNeedle.classList.add('locked-red');
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '⚠️ <strong class="text-rose-400">Tiro Fallido:</strong> penalización por reflejo ⚠️';
        this.timingFeedbackLbl.className = 'text-center text-[11px] font-black text-rose-400 mt-1 min-h-[16px]';
      }
      if (window.audio) window.audio.playFailSound();
    } else {
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = '🎯 <strong class="text-sky-300">Tiro Estándar:</strong> giro clásico sin ventajas ni penalizaciones';
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
      // Garantizar acierto en sector del jugador
      const winIndices = [];
      this.sliceColors.forEach((c, idx) => {
        if (this.selectedColors.includes(c.id)) winIndices.push(idx);
      });
      targetSector = winIndices.length > 0 ? winIndices[Math.floor(Math.random() * winIndices.length)] : 0;
    } else if (timingResult === 'fail') {
      // 80% probabilidad de caer en un sector que NO eligió el jugador
      const loseIndices = [];
      this.sliceColors.forEach((c, idx) => {
        if (!this.selectedColors.includes(c.id)) loseIndices.push(idx);
      });
      if (loseIndices.length > 0 && Math.random() < 0.8) {
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
    const landedColor = this.sliceColors[sliceIndex];
    const isWinner = this.selectedColors.includes(landedColor.id);
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const winningSlice = document.getElementById(`slice-${sliceIndex}`);
    if (winningSlice) winningSlice.classList.add('winner-slice');

    const isDoubleOrNothing = (this.activeCard === 'doubleOrNothing');

    if (isWinner) {
      let mult = isDoubleOrNothing ? 2.0 : (this.selectedColors.length === 1 ? 2.0 : 1.5);
      if (timingResult === 'perfect') {
        mult = Math.round(mult * 1.5 * 10) / 10; // Bonus por tiro perfecto
      }

      if (window.audio) {
        window.audio.playWinFanfare();
        window.audio.playCrowdCheer();
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      if (this.timingFeedbackLbl) {
        this.timingFeedbackLbl.innerHTML = `🎉 ¡ACIERTO EN ${landedColor.name.toUpperCase()}! GANAS ${mult}x 🪙`;
        this.timingFeedbackLbl.className = 'text-center text-sm font-black text-emerald-400 mt-1';
      }
      if (window.game) window.game.multiplyCoins(mult);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager && window.stateManager.state.upgrades.rouletteBoost;
      if (!hasBoost && window.game) {
        const lossMult = isDoubleOrNothing ? 0 : (this.selectedColors.length === 1 ? 0.5 : 0);
        window.game.multiplyCoins(lossMult);
      }

      if (this.timingFeedbackLbl) {
        const msg = hasBoost
          ? `Cayó en ${landedColor.name}. ¡Seguro activo! Conservas tus monedas.`
          : `Cayó en ${landedColor.name}. Pierdes parte de las monedas.`;
        this.timingFeedbackLbl.innerHTML = `❌ ${msg}`;
        this.timingFeedbackLbl.className = 'text-center text-xs font-black text-rose-400 mt-1';
      }
    }

    this.finalizeRound(winningSlice, modalBox);
  }

  // --- DIANA DE DARDOS: SLINGSHOT / RESORTE TÁCTIL ---
  generateNewWind() {
    if (this.activeCard === 'calmAtmosphere' && this.calmAtmosphereBenefit === 'noWind') {
      this.windSpeed = 0.0;
      this.windAngle = 0;
    } else {
      this.windSpeed = +(Math.random() * 2.8 + 1.8).toFixed(1); // 1.8 a 4.6 m/s
      // Ángulos principales: horizontal izquierda/derecha con leve inclinación
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
      // Orientar las ráfagas según la dirección del viento
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
      hintEl.textContent = '🏹 Toca el dardo, arrastra hacia abajo y suelta para lanzar';
      hintEl.className = 'text-center text-[11px] font-bold text-sky-300 mt-1 mb-2 animate-pulse';
    }
  }

  setupSlingshotEvents() {
    const container = document.getElementById('diana-target-container');
    if (!container) return;

    const getSvgCoords = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 360 / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onPointerDown = (e) => {
      if (this.isDartFlying) return;
      if (window.audio) window.audio.init();

      const coords = getSvgCoords(e.clientX, e.clientY);
      // Permitir iniciar el arrastre tocando en la zona inferior (resorte)
      if (coords.y >= 240) {
        this.isDraggingSlingshot = true;
        this.dragStartPos = coords;
        container.setPointerCapture?.(e.pointerId);
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDraggingSlingshot || this.isDartFlying) return;
      const coords = getSvgCoords(e.clientX, e.clientY);

      const dx = coords.x - this.dragStartPos.x;
      const dy = coords.y - this.dragStartPos.y;

      // Restricción de estiramiento del resorte
      const clampedDx = Math.max(-65, Math.min(65, dx));
      const clampedDy = Math.max(0, Math.min(42, dy)); // Arrastre hacia abajo

      const dartX = 150 + clampedDx;
      const dartY = 315 + clampedDy;
      this.currentDartPos = { x: dartX, y: dartY };

      this.updateSlingshotVisuals(dartX, dartY, clampedDx, clampedDy, true);
    };

    const onPointerUp = (e) => {
      if (!this.isDraggingSlingshot) return;
      this.isDraggingSlingshot = false;
      try { container.releasePointerCapture?.(e.pointerId); } catch (_) {}

      const pullDistance = Math.hypot(this.currentDartPos.x - 150, this.currentDartPos.y - 315);
      if (pullDistance > 14) {
        // Disparo efectuado con fuerza suficiente
        this.launchSlingshotDart();
      } else {
        // Devolver dardo a su reposo
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

    // Cálculo balístico intuitivo (el estiramiento hacia atrás dispara en sentido opuesto)
    const aimTargetX = 150 - (pullX * 1.6);
    const aimTargetY = 140 - (pullY * 2.8);

    // Desvío por viento en tiempo real
    const windRad = (this.windAngle * Math.PI) / 180;
    const windPushX = Math.cos(windRad) * (this.windSpeed * 6.8);
    const windPushY = Math.sin(windRad) * (this.windSpeed * 3.5);

    const impactX = Math.round(Math.max(25, Math.min(275, aimTargetX + windPushX)));
    const impactY = Math.round(Math.max(25, Math.min(265, aimTargetY + windPushY)));
    this.currentImpactPoint = { x: impactX, y: impactY };

    // Punto de control de la curva para que la trayectoria se doble visualmente con el viento
    const ctrlX = (dartX + impactX) / 2 + (windPushX * 0.7);
    const ctrlY = (dartY + impactY) / 2 + (windPushY * 0.7);

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

    // Resorte vuelve a posición neutral
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

    // 3 aros con multiplicadores claros
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

    // Tiro extra por Carta Calma Atmosférica
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
        window.game.multiplyCoins(0.5); // Pierde 50%
      }

      if (hintEl) {
        const msg = hasBoost ? '¡Desviado! Seguro activo: sin pérdida.' : '¡Desviado! Pierdes el 50% de las monedas.';
        hintEl.textContent = `${label} • ${msg}`;
        hintEl.className = 'text-center text-xs font-black text-rose-400 mt-1 mb-2';
      }
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
