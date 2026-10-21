/* ==========================================================================
   AQUASORT MASTER DELUXE - MINIGAME ENGINE (RULETA ALEATORIA Y DIANA BALÍSTICA)
   - Bonus asignado al azar con cartas alquímicas (Favor Diana, Favor Ruleta, Doble o Nada, Calma Atmosférica).
   - Diana estilo Magic Darts (NES): Posicionamiento horizontal libre y fuerza ascendente vertical con aceleración no lineal.
   - Marcado de impacto con una 'X' visible en la diana.
   - Ruleta con sectores barajados y soporte para modo Doble o Nada (50% prob, x2.0, 100% pérdida).
   ========================================================================== */

class MinigameEngine {
  constructor() {
    this.currentMode = 'diana'; // 'diana' | 'roulette'

    // --- CARTAS ALQUÍMICAS ---
    this.activeCard = null; // 'dianaFavor' | 'rouletteFavor' | 'doubleOrNothing' | 'calmAtmosphere'
    this.extraShotAvailable = false;
    this.verticalSpeedModifier = 1.0;
    this.calmAtmosphereBenefit = null; // 'noWind' | 'slowMeter' | 'extraShot'

    // --- RULETA ---
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
    this.isCharging = false;
    this.currentPower = 0;
    this.chargeInterval = null;
    this.currentAngle = 0;

    // --- DIANA DE DARDOS (MAGIC DARTS STYLE) ---
    this.windSpeed = 2.4; // m/s
    this.windAngle = 45; // grados (0 = este, 90 = sur, 180 = oeste, 270 = norte)
    this.aimX = 150; // Horizontal (40 a 260)
    this.aimY = 270; // Vertical ascendente (270 abajo -> 30 arriba)
    this.isDartFlying = false;

    // Elementos DOM
    this.wheelContainer = null;
    this.dianaContainer = null;
    this.wheelGroup = null;
    this.needleWrapper = null;
    this.powerBar = null;
    this.btnAction = null;
    this.dianaXSlider = null;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initDOM());
    } else {
      setTimeout(() => this.initDOM(), 0);
    }
  }

  initDOM() {
    this.wheelContainer = document.getElementById('roulette-view') || document.getElementById('wheel-container');
    this.dianaContainer = document.getElementById('diana-view') || document.getElementById('diana-container');
    this.wheelGroup = document.getElementById('wheel-group');
    this.needleWrapper = document.getElementById('roulette-needle');
    this.powerBar = document.getElementById('power-bar');
    this.btnAction = document.getElementById('btn-spin-wheel');
    this.dianaXSlider = document.getElementById('diana-x-slider');

    this.setupModeTabs();
    this.setupCardsUI();
    this.setupEvents();
    this.setupDianaEvents();
    this.initRound();
  }

  // Inicializa o reinicia la ronda
  initRound() {
    this.rollRandomMode();
    this.shuffleSlices();
    this.generateNewWind();
    this.renderWheel();
    this.renderDiana();
    this.updateCardsUI();
    this.updateRulesText();
  }

  // Selección aleatoria del bonus mediante la bolsa alquímica (3 Diana y 3 Ruleta sin reemplazo)
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
      const colorPickerCont = document.getElementById('roulette-colors-selector') || document.getElementById('roulette-color-picker');
      if (colorPickerCont && colorPickerCont.parentElement) colorPickerCont.parentElement.classList.remove('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="disc" class="w-5 h-5 text-amber-400"></i> Ruleta de la Fortuna';
      if (bannerEl && fromRandom) {
        if (bagInfo) {
          const cardNote = bagInfo.activeCardName === 'rouletteFavor' ? ` • ✨ Favor Ruleta (${bagInfo.cardUsesRemaining} restantes)` : '';
          const refillNote = bagInfo.wasEmptied ? ' 🔄 (¡Bolsa vaciada y rellenada!)' : '';
          bannerEl.innerHTML = `🎲 ¡Extraído de la Bolsa: <strong>Ruleta Alquímica</strong>!${cardNote}${refillNote}`;
        } else {
          bannerEl.innerHTML = '🎲 ¡Minijuego Asignado desde la Bolsa: Ruleta Alquímica!';
        }
      }
    } else {
      if (tabDiana) tabDiana.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md transition-all';
      if (tabRoulette) tabRoulette.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all';

      if (this.wheelContainer) this.wheelContainer.classList.add('hidden');
      if (this.dianaContainer) this.dianaContainer.classList.remove('hidden');
      const colorPickerCont = document.getElementById('roulette-colors-selector') || document.getElementById('roulette-color-picker');
      if (colorPickerCont && colorPickerCont.parentElement) colorPickerCont.parentElement.classList.add('hidden');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="crosshair" class="w-5 h-5 text-sky-400"></i> Diana de Dardos Alquímica';
      if (bannerEl && fromRandom) {
        if (bagInfo) {
          const cardNote = bagInfo.activeCardName === 'dianaFavor' ? ` • ✨ Favor Diana (${bagInfo.cardUsesRemaining} restantes)` : '';
          const refillNote = bagInfo.wasEmptied ? ' 🔄 (¡Bolsa vaciada y rellenada!)' : '';
          bannerEl.innerHTML = `🎲 ¡Extraído de la Bolsa: <strong>Diana de Dardos</strong>!${cardNote}${refillNote}`;
        } else {
          bannerEl.innerHTML = '🎲 ¡Minijuego Asignado desde la Bolsa: Diana de Dardos!';
        }
      }
      if (window.audio) window.audio.playWindGust();
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
    if (this.isSpinning || this.isCharging || this.isDartFlying) return;
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
      this.verticalSpeedModifier = 1.0;
      if (window.audio) window.audio.playSelect();
      this.initRound();
      return;
    }

    // Verificar si el jugador tiene la carta en inventario
    const cards = stateMgr.getCards();
    if (!cards[cardId] || cards[cardId] <= 0) {
      alert('No dispones de esta carta en tu inventario. Puedes adquirirla en la Tienda Alquímica por 20 monedas.');
      return;
    }

    // ACTIVACIÓN DE CARTAS DE FAVOR DE LA BOLSA (5 bonuses con más chances)
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

    // ACTIVACIÓN DE CARTAS TÁCTICAS DE RONDA INDIVIDUAL
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
        this.updateWindUI();
      } else if (this.calmAtmosphereBenefit === 'slowMeter') {
        this.verticalSpeedModifier = 0.5;
      } else if (this.calmAtmosphereBenefit === 'extraShot') {
        this.extraShotAvailable = true;
      }
    }

    this.updateCardsUI();
    this.updateRulesText();
    this.renderWheel();
    this.renderDiana();
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
        pill.textContent = `✨ Favor Diana Activo (${bag.cardUsesRemaining} bonuses restantes)`;
        pill.className = 'text-[10px] text-sky-300 font-bold px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 animate-pulse';
      } else if (bag && bag.activeCard === 'rouletteFavor' && bag.cardUsesRemaining > 0) {
        pill.textContent = `✨ Favor Ruleta Activo (${bag.cardUsesRemaining} bonuses restantes)`;
        pill.className = 'text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 animate-pulse';
      } else if (this.activeCard === 'doubleOrNothing') {
        pill.textContent = '✨ Activa: Doble o Nada (Ruleta 2 colores x2.0)';
        pill.className = 'text-[10px] text-rose-300 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400';
      } else if (this.activeCard === 'calmAtmosphere') {
        const desc = this.calmAtmosphereBenefit === 'noWind'
          ? 'Brisa Inerte (0.0 m/s)'
          : (this.calmAtmosphereBenefit === 'slowMeter' ? 'Medidor Lento (Máxima Precisión)' : 'Tiro Extra de Respaldo');
        pill.textContent = `✨ Activa: ${desc}`;
        pill.className = 'text-[10px] text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400';
      } else {
        pill.textContent = 'Toca una carta para activarla';
        pill.className = 'text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30';
      }
    }

    this.updateBagIndicatorUI();
  }

  // Mezcla aleatoriamente los sectores
  shuffleSlices() {
    let pool = [];
    if (this.activeCard === 'doubleOrNothing') {
      // Doble o Nada: solo 2 colores (50% de probabilidad cada uno)
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

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.sliceColors = pool;

    // Ángulo inicial aleatorio de partida
    this.currentAngle = Math.floor(Math.random() * 360);
    if (this.wheelGroup) {
      this.wheelGroup.style.transform = `rotate(${this.currentAngle}deg)`;
    }
  }

  // Genera viento procedural aleatorio
  generateNewWind() {
    if (this.activeCard === 'calmAtmosphere' && this.calmAtmosphereBenefit === 'noWind') {
      this.windSpeed = 0.0;
      this.windAngle = 0;
    } else {
      // Ocasionalmente puede no haber viento de manera natural (20% de probabilidad)
      const rollCalm = Math.random() < 0.20;
      this.windSpeed = rollCalm ? 0.0 : parseFloat((Math.random() * 4.2 + 1.2).toFixed(1));
      this.windAngle = Math.floor(Math.random() * 360);
    }

    this.updateWindUI();
  }

  // Actualiza la interfaz del viento con 0, 1, 2 o 3 flechas animadas en la dirección exacta
  updateWindUI() {
    const windHud = document.getElementById('wind-hud');
    const windSpeedLbl = document.getElementById('wind-speed-lbl') || document.getElementById('diana-wind-speed');
    const arrowsStream = document.getElementById('wind-arrows-stream');

    // Determinar nivel de intensidad: 0, 1, 2 o 3 flechas según solicitud del usuario
    let arrowCount = 0;
    let intensityName = 'Calmo';
    let pillClass = 'wind-calm';

    if (this.windSpeed === 0.0) {
      arrowCount = 0;
      intensityName = 'Calmo';
      pillClass = 'wind-calm';
    } else if (this.windSpeed <= 2.2) {
      arrowCount = 1;
      intensityName = 'Suave';
      pillClass = 'wind-light';
    } else if (this.windSpeed <= 3.8) {
      arrowCount = 2;
      intensityName = 'Moderado';
      pillClass = 'wind-moderate';
    } else {
      arrowCount = 3;
      intensityName = 'Fuerte';
      pillClass = 'wind-strong';
    }

    // Dirección cardinal en 8 rumbos (0° = Este / Derecha balística en SVG)
    const compassDirections = ['Este ➔', 'Sureste ↘', 'Sur ⬇', 'Suroeste ↙', 'Oeste ⬅', 'Noroeste ↖', 'Norte ⬆', 'Noreste ↗'];
    const compassIdx = Math.round(this.windAngle / 45) % 8;
    const compassName = compassDirections[compassIdx];

    if (windHud) {
      windHud.className = `wind-indicator-pill mb-2 ${pillClass}`;
    }

    if (windSpeedLbl) {
      if (this.windSpeed === 0.0) {
        windSpeedLbl.textContent = 'Viento: Calmo (0.0 m/s) • Sin Desvío';
      } else {
        windSpeedLbl.textContent = `Viento: ${this.windSpeed} m/s • ${compassName} (${intensityName})`;
      }
    }

    if (arrowsStream) {
      // Rotación geométrica exacta del contenedor según el ángulo balístico (0° = Derecha/Este)
      arrowsStream.style.transform = `rotate(${this.windAngle}deg)`;
      arrowsStream.innerHTML = '';

      if (arrowCount === 0) {
        arrowsStream.innerHTML = `<span class="text-xs">🍃</span>`;
      } else {
        const chevronColor = arrowCount === 3 ? '#fb923c' : (arrowCount === 2 ? '#818cf8' : '#38bdf8');
        for (let i = 0; i < arrowCount; i++) {
          const chevron = document.createElement('span');
          chevron.className = 'wind-chevron';
          chevron.textContent = '➤';
          chevron.style.color = chevronColor;
          arrowsStream.appendChild(chevron);
        }
      }
    }
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
        subLbl.innerHTML = `⚖️ <strong>Doble o Nada:</strong> 2 colores (50% prob) • Ganas <strong>x2.0</strong> • Si fallas <strong>pierdes el 100%</strong> de tus monedas.`;
        if (betModeLbl) betModeLbl.innerHTML = 'Doble o Nada: x2.0 (-100% si fallas)';
      } else {
        const isOne = this.selectedColors.length === 1;
        const mult = isOne ? 'x2.0' : 'x1.5';
        const penalty = isOne ? 'pierdes el 50%' : 'pierdes el 100% (Todo)';
        subLbl.innerHTML = `Puedes elegir hasta 2 colores • <strong>${this.selectedColors.length} elegido(s)</strong> (Ganas ${mult} / Si fallas ${penalty})`;
        if (betModeLbl) betModeLbl.innerHTML = '1 color: x2.0 (-50%) • 2 colores: x1.5 (-100%)';
      }
    } else {
      let benefitNote = '';
      if (this.activeCard === 'calmAtmosphere') {
        if (this.calmAtmosphereBenefit === 'noWind') benefitNote = ' • <span class="text-emerald-400 font-bold">¡Sin Viento Activo!</span>';
        if (this.calmAtmosphereBenefit === 'slowMeter') benefitNote = ' • <span class="text-emerald-400 font-bold">¡Medidor Lento Activo!</span>';
        if (this.calmAtmosphereBenefit === 'extraShot') benefitNote = ' • <span class="text-emerald-400 font-bold">¡Tiro Extra Activo!</span>';
      }
      subLbl.innerHTML = `🎯 <strong>Diana Magic Darts:</strong> Mueve horizontalmente y mantén presionado para regular altura (Centro: <strong>x3.0</strong>, Anillos: <strong>x2.0 / x1.5 / x1.2</strong>)${benefitNote}`;
    }
  }

  // --- RENDER DE RULETA ---
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

      // Texto del sector
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

      // Clavija dorada
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

  // --- RENDER DE DIANA ---
  renderDiana() {
    const dartsGroup = document.getElementById('diana-darts-group');
    if (dartsGroup) dartsGroup.innerHTML = '';
    const impactsGroup = document.getElementById('diana-impacts-group');
    if (impactsGroup) impactsGroup.innerHTML = '';

    // Restablecer posición X e Y
    this.aimX = 150;
    this.aimY = 270;
    if (this.dianaXSlider) this.dianaXSlider.value = 150;

    const xLbl = document.getElementById('diana-x-lbl');
    if (xLbl) xLbl.textContent = 'X: 150 (Centro)';

    const xGuide = document.getElementById('diana-x-guide');
    if (xGuide) {
      xGuide.setAttribute('x1', '150');
      xGuide.setAttribute('x2', '150');
    }

    const yGuide = document.getElementById('diana-y-guide');
    if (yGuide) {
      yGuide.setAttribute('y1', '270');
      yGuide.setAttribute('y2', '270');
    }

    const crossSvg = document.getElementById('diana-crosshair-svg');
    if (crossSvg) {
      crossSvg.setAttribute('transform', 'translate(150, 270)');
    }
  }

  // Configuración de apuntado Magic Darts (Horizontal slider y arrastre)
  setupDianaEvents() {
    const dianaWrapper = document.getElementById('diana-target-container');
    if (this.dianaXSlider) {
      this.dianaXSlider.addEventListener('input', (e) => {
        if (this.isDartFlying || this.isCharging) return;
        this.aimX = parseInt(e.target.value);
        this.updateAimXDisplay();
      });
    }

    if (dianaWrapper) {
      const handleHorizontalMove = (clientX) => {
        if (this.isDartFlying || this.isCharging) return;
        const rect = dianaWrapper.getBoundingClientRect();
        const scaleX = 300 / rect.width;
        this.aimX = Math.round(Math.max(40, Math.min(260, (clientX - rect.left) * scaleX)));
        if (this.dianaXSlider) this.dianaXSlider.value = this.aimX;
        this.updateAimXDisplay();
      };

      dianaWrapper.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) handleHorizontalMove(e.clientX);
      });
      dianaWrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) handleHorizontalMove(e.touches[0].clientX);
      }, { passive: true });
    }
  }

  updateAimXDisplay() {
    const xLbl = document.getElementById('diana-x-lbl');
    if (xLbl) {
      const side = this.aimX === 150 ? 'Centro' : (this.aimX < 150 ? 'Izquierda' : 'Derecha');
      xLbl.textContent = `X: ${this.aimX} (${side})`;
    }
    const xGuide = document.getElementById('diana-x-guide');
    if (xGuide) {
      xGuide.setAttribute('x1', this.aimX);
      xGuide.setAttribute('x2', this.aimX);
    }
    const crossSvg = document.getElementById('diana-crosshair-svg');
    if (crossSvg) {
      crossSvg.setAttribute('transform', `translate(${this.aimX}, ${this.aimY})`);
    }
  }

  setupEvents() {
    // Selección de colores en ruleta (hasta 2)
    document.querySelectorAll('.btn-color-pick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        this.toggleColorBet(color, e.currentTarget);
      });
    });

    // Carga de fuerza / altura
    if (this.btnAction) {
      const startCharge = (e) => {
        if (e.cancelable) e.preventDefault();
        this.startCharging();
      };
      const stopCharge = (e) => {
        if (e.cancelable) e.preventDefault();
        this.releaseCharge();
      };

      this.btnAction.addEventListener('mousedown', startCharge);
      window.addEventListener('mouseup', stopCharge);
      this.btnAction.addEventListener('touchstart', startCharge, { passive: false });
      window.addEventListener('touchend', stopCharge);
      this.btnAction.addEventListener('pointerdown', startCharge);
      window.addEventListener('pointerup', stopCharge);

      // Si se produce un click simple sin hold prolongado
      this.btnAction.addEventListener('click', (e) => {
        if (!this.isCharging && !this.isSpinning && !this.isDartFlying && this.currentPower === 0) {
          this.currentPower = 52;
          if (this.currentMode === 'diana') {
            this.aimY = 145;
            this.throwDart(52);
          } else {
            this.spinWheel(52);
          }
        }
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

  // Carga de fuerza con aceleración no lineal estilo Magic Darts (NES)
  startCharging() {
    if (this.isSpinning || this.isCharging || this.isDartFlying) return;
    this.isCharging = true;
    this.currentPower = 0;
    this.aimY = 270;

    if (this.btnAction) {
      this.btnAction.textContent = this.currentMode === 'roulette'
        ? '¡CARGANDO FUERZA DE GIRO!...'
        : '¡SUBIENDO ALTURA! SUELTA EN EL CENTRO';
    }

    clearInterval(this.chargeInterval);

    // Bucle de subida con aceleración progresiva (primera mitad lenta, luego acelera)
    this.chargeInterval = setInterval(() => {
      // Cálculo de incremento: primera mitad más lenta, luego acelera progresivamente
      const p = this.currentPower;
      let stepInc = 1.35;
      if (p >= 48) {
        // Aceleración no lineal cuadrática
        const factor = (p - 48) / 52;
        stepInc = 1.35 + (factor * factor) * 3.6;
      }
      this.currentPower += stepInc * this.verticalSpeedModifier;

      if (this.powerBar) {
        this.powerBar.style.width = `${Math.min(this.currentPower, 100)}%`;
      }

      // Si estamos en modo diana, subimos la mira desde Y=270 (abajo) hasta Y=30 (arriba)
      if (this.currentMode === 'diana') {
        const norm = Math.min(this.currentPower / 100, 1);
        this.aimY = Math.round(270 - norm * 240); // 270 -> 30

        const yGuide = document.getElementById('diana-y-guide');
        if (yGuide) {
          yGuide.setAttribute('y1', this.aimY);
          yGuide.setAttribute('y2', this.aimY);
        }
        const crossSvg = document.getElementById('diana-crosshair-svg');
        if (crossSvg) {
          crossSvg.setAttribute('transform', `translate(${this.aimX}, ${this.aimY})`);
        }
      }

      // Sobrecarga / Fallo si supera el 96%
      if (this.currentPower >= 96) {
        clearInterval(this.chargeInterval);
        this.currentPower = 0;
        this.isCharging = false;
        if (this.powerBar) this.powerBar.style.width = '0%';
        if (window.audio) window.audio.playFailSound();
        if (this.btnAction) {
          this.btnAction.textContent = '¡SOBRECARGA / FUERA! TIRO PERDIDO';
          this.btnAction.classList.add('bg-rose-600');
          setTimeout(() => {
            if (this.btnAction) {
              this.btnAction.classList.remove('bg-rose-600');
              this.btnAction.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
            }
          }, 800);
        }
      }
    }, 24);
  }

  releaseCharge() {
    if (!this.isCharging) return;
    clearInterval(this.chargeInterval);
    this.isCharging = false;

    if (this.currentPower > 8) {
      if (this.currentMode === 'roulette') {
        this.spinWheel(this.currentPower);
      } else {
        this.throwDart(this.currentPower);
      }
    } else {
      if (this.powerBar) this.powerBar.style.width = '0%';
      if (this.btnAction) this.btnAction.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
    }
  }

  // --- EJECUCIÓN DE RULETA ---
  spinWheel(power) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    if (this.btnAction) this.btnAction.disabled = true;

    const baseSpins = 4;
    const extraSpins = Math.floor((power / 100) * 5);
    const targetSector = Math.floor(Math.random() * this.numSlices);
    const sectorCenterOffset = this.sliceAngle / 2;
    const deadzone = 8;
    const randomInSector = (Math.random() - 0.5) * (this.sliceAngle - deadzone * 2);

    const targetAngle = 360 * (baseSpins + extraSpins) + (targetSector * this.sliceAngle) + sectorCenterOffset + randomInSector;
    const duration = 2800 + (power / 100) * 1400;
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

      // Claqueo de clavija
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
        this.evaluateRouletteResult(activeIdx);
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

  evaluateRouletteResult(sliceIndex) {
    const landedColor = this.sliceColors[sliceIndex];
    const isWinner = this.selectedColors.includes(landedColor.id);
    const modalBox = document.querySelector('#modal-roulette .modal-content');
    const winningSlice = document.getElementById(`slice-${sliceIndex}`);
    if (winningSlice) winningSlice.classList.add('winner-slice');

    const isDoubleOrNothing = (this.activeCard === 'doubleOrNothing');

    if (isWinner) {
      const mult = isDoubleOrNothing ? 2.0 : (this.selectedColors.length === 1 ? 2.0 : 1.5);
      if (window.audio) {
        window.audio.playWinFanfare();
        window.audio.playCrowdCheer();
      }
      if (typeof confetti === 'function') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      if (this.btnAction) {
        this.btnAction.textContent = `¡ACIERTO! GANAS ${mult}x 🪙`;
        this.btnAction.classList.add('bg-emerald-500');
      }
      if (window.game) window.game.multiplyCoins(mult);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager && window.stateManager.state.upgrades.rouletteBoost;
      if (!hasBoost && window.game) {
        // En Doble o Nada, se pierde el 100%. En ruleta normal: 1 color pierde 50%, 2 colores pierde 100%.
        const lossMult = isDoubleOrNothing ? 0 : (this.selectedColors.length === 1 ? 0.5 : 0);
        window.game.multiplyCoins(lossMult);
      }

      if (this.btnAction) {
        let msg = '';
        if (hasBoost) {
          msg = `Cayó en ${landedColor.name}. ¡Seguro activo! Conservas tus monedas.`;
        } else if (isDoubleOrNothing) {
          msg = `¡Fallaste en Doble o Nada! Pierdes el 100% de tus monedas.`;
        } else {
          msg = this.selectedColors.length === 1
            ? `Cayó en ${landedColor.name}. Pierdes 50% de las monedas.`
            : `Cayó en ${landedColor.name}. Pierdes 100% de las monedas.`;
        }
        this.btnAction.textContent = msg;
        this.btnAction.classList.add('bg-rose-700');
      }
    }

    this.finalizeRound(winningSlice, modalBox);
  }

  // --- EJECUCIÓN DE DIANA DE DARDOS (ESTILO MAGIC DARTS) ---
  throwDart(power) {
    if (this.isDartFlying) return;
    this.isDartFlying = true;
    if (this.btnAction) this.btnAction.disabled = true;

    if (window.audio) window.audio.playDartThrow();

    // Desvío por viento balístico
    const windRad = (this.windAngle * Math.PI) / 180;
    const windPush = parseFloat(this.windSpeed) * 6.5;

    const hitX = Math.round(Math.max(20, Math.min(280, this.aimX + Math.cos(windRad) * windPush)));
    const hitY = Math.round(Math.max(20, Math.min(280, this.aimY + Math.sin(windRad) * windPush)));

    const impactsGroup = document.getElementById('diana-impacts-group');
    const dartsGroup = document.getElementById('diana-darts-group');

    // Visualizar estela de vuelo balístico guiada por el viento
    if (dartsGroup) {
      dartsGroup.innerHTML = `
        <line x1="${this.aimX}" y1="${this.aimY}" x2="${hitX}" y2="${hitY}" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/>
        <g id="flying-dart" transform="translate(${this.aimX}, ${this.aimY})">
          <circle cx="0" cy="0" r="4.5" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
        </g>
      `;
      const flyingEl = document.getElementById('flying-dart');
      if (flyingEl && flyingEl.animate) {
        flyingEl.animate([
          { transform: `translate(${this.aimX}px, ${this.aimY}px) scale(1.4)`, opacity: 0.9 },
          { transform: `translate(${hitX}px, ${hitY}px) scale(0.85)`, opacity: 1 }
        ], {
          duration: 380,
          easing: 'ease-out',
          fill: 'forwards'
        });
      }
    }

    // Animación de vuelo y marcado de impacto con 'X'
    setTimeout(() => {
      if (window.audio) window.audio.playDartHit();
      if (dartsGroup) dartsGroup.innerHTML = '';

      // REGLA USUARIO: Visualizar el dardo con una 'X' clara en el punto de impacto
      if (impactsGroup) {
        const xMark = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        xMark.setAttribute('transform', `translate(${hitX}, ${hitY})`);
        xMark.innerHTML = `
          <!-- Sombra de impacto -->
          <ellipse cx="2" cy="4" rx="7" ry="3.5" fill="rgba(0,0,0,0.7)"/>
          <!-- Cruz 'X' luminosa de impacto de dardo -->
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
          <line x1="8" y1="-8" x2="-8" y2="8" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="8" y1="-8" x2="-8" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="3" fill="#fde047" stroke="#000000" stroke-width="1"/>
        `;
        impactsGroup.appendChild(xMark);
      }

      this.isDartFlying = false;
      this.evaluateDianaResult(hitX, hitY);
    }, 400);
  }

  evaluateDianaResult(x, y) {
    const dx = x - 150;
    const dy = y - 150;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const modalBox = document.querySelector('#modal-roulette .modal-content');

    let multiplier = 0;
    let label = 'Fuera';

    if (dist <= 18) {
      multiplier = 3.0;
      label = '¡DIANA PERFECTA! (x3.0)';
    } else if (dist <= 65) {
      multiplier = 2.0;
      label = '¡ANILLO INTERIOR! (x2.0)';
    } else if (dist <= 95) {
      multiplier = 1.5;
      label = '¡ANILLO MEDIO! (x1.5)';
    } else if (dist <= 125) {
      multiplier = 1.2;
      label = '¡ANILLO EXTERIOR! (x1.2)';
    } else {
      multiplier = 0;
      label = '¡FUERA DE LA DIANA!';
    }

    // Carta Calma Atmosférica con beneficio de Tiro Extra si no acertó multiplicador alto
    if (this.extraShotAvailable && multiplier < 2.0) {
      this.extraShotAvailable = false;
      if (this.btnAction) {
        this.btnAction.disabled = false;
        this.btnAction.classList.remove('bg-emerald-500', 'bg-rose-700');
        this.btnAction.classList.add('bg-amber-500');
        this.btnAction.textContent = '¡TIRO EXTRA DE RESPALDO! APUNTA Y DISPARA';
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
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      if (this.btnAction) {
        this.btnAction.textContent = `${label} • GANAS ${multiplier}x 🪙`;
        this.btnAction.classList.add('bg-emerald-500');
      }
      if (window.game) window.game.multiplyCoins(multiplier);
    } else {
      if (modalBox) modalBox.classList.add('roulette-lose-glow');
      if (window.audio) window.audio.playDisappointedCrowd();

      const hasBoost = window.stateManager && window.stateManager.state.upgrades.rouletteBoost;
      if (!hasBoost && window.game) {
        window.game.multiplyCoins(0.5); // Pierde 50%
      }

      if (this.btnAction) {
        this.btnAction.textContent = hasBoost
          ? '¡Tiro desviado! Pero tu seguro protege tus monedas.'
          : '¡Tiro desviado por el viento! Pierdes el 50% de tus monedas.';
        this.btnAction.classList.add('bg-rose-700');
      }
    }

    this.finalizeRound(null, modalBox);
  }

  finalizeRound(winningSlice, modalBox) {
    setTimeout(() => {
      const modal = document.getElementById('modal-roulette');
      if (modal) modal.classList.add('hidden');

      if (modalBox) modalBox.classList.remove('roulette-lose-glow');
      if (winningSlice) winningSlice.classList.remove('winner-slice');
      if (this.btnAction) {
        this.btnAction.disabled = false;
        this.btnAction.classList.remove('bg-emerald-500', 'bg-rose-700', 'bg-amber-500');
        this.btnAction.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
      }
      if (this.powerBar) this.powerBar.style.width = '0%';

      // Limpiar impactos y resetear modificadores de ronda
      const impactsGroup = document.getElementById('diana-impacts-group');
      if (impactsGroup) impactsGroup.innerHTML = '';
      this.activeCard = null;
      this.calmAtmosphereBenefit = null;
      this.extraShotAvailable = false;
      this.verticalSpeedModifier = 1.0;

      if (window.game) {
        window.game.onRouletteClosed();
      }
    }, 2800);
  }

  openModal(coins = 50) {
    if (!this.btnAction) this.initDOM();
    const modal = document.getElementById('modal-roulette');
    if (modal) modal.classList.remove('hidden');
    this.initRound();
    if (window.audio) window.audio.playMusic('roulette');
    if (window.lucide) lucide.createIcons();
  }

  closeModal() {
    const modal = document.getElementById('modal-roulette');
    if (modal) modal.classList.add('hidden');
    if (window.audio) window.audio.playMusic('level');
  }
}

// Instancia global
window.rouletteEngine = new MinigameEngine();
window.minigameEngine = window.rouletteEngine;
