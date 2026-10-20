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
    this.moves = 0;
    this.coins = 0;
    this.hintsRemaining = 3;
    this.extraTubesUsed = 0;
    this.moveHistory = [];
    this.activeHint = null;
    this.isPouringAnimation = false;

    // Accesibilidad y personalización
    this.isLowVision = false;
    this.isHighContrast = false;

    // Canvas de chorro de agua
    this.pourCanvas = null;
    this.pourCtx = null;

    // Referencias DOM
    this.cacheDom();
    this.initEvents();
    this.initCanvas();
    this.loadLevel(this.currentLevel);

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

    // Botones
    this.btnUndo = document.getElementById('btn-undo');
    this.btnHint = document.getElementById('btn-hint');
    this.btnAddTube = document.getElementById('btn-add-tube');
    this.btnRestart = document.getElementById('btn-restart');

    // Modales
    this.modalMap = document.getElementById('modal-map');
    this.modalVictory = document.getElementById('modal-victory');
    this.modalRoulette = document.getElementById('modal-roulette');
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
    this.modalSettings = document.getElementById('modal-settings');
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
  loadLevel(lvl) {
    this.currentLevel = Math.max(1, Math.min(lvl, this.maxLevels));
    this.moves = 0;
    this.moveHistory = [];
    this.selectedTubeIndex = null;
    this.extraTubesUsed = 0;
    this.activeHint = null;
    this.isPouringAnimation = false;

    // Generar datos de nivel
    this.levelData = window.LevelGenerator.generate(this.currentLevel);
    this.tubes = this.levelData.tubes;

    // Iniciar temporizador en vivo
    if (window.leaderboardManager) {
      window.leaderboardManager.startTimer('lbl-timer');
    }

    // Actualizar música de fondo
    if (window.audio && !this.isModalOpen()) {
      window.audio.playMusic('level');
    }

    this.updateHeaderUI();
    this.renderTubes();
    this.updateButtonsUI();
  }

  updateHeaderUI() {
    if (this.lblLevel) this.lblLevel.textContent = this.currentLevel;
    if (this.selLevelQuick) this.selLevelQuick.value = this.currentLevel;
    if (this.lblMoves) this.lblMoves.textContent = this.moves;
    if (this.lblOptimalMoves) this.lblOptimalMoves.textContent = this.levelData.optimalMoves;
    if (this.lblCoins) this.lblCoins.textContent = this.coins;
    if (this.lblMechanicTag) this.lblMechanicTag.textContent = this.levelData.mechanicTag;
  }

  updateButtonsUI() {
    if (this.btnUndo) this.btnUndo.disabled = this.moveHistory.length === 0;
    if (this.btnAddTube) {
      this.btnAddTube.disabled = this.extraTubesUsed >= 2;
      const lblAdd = document.getElementById('lbl-add-tube-text');
      if (lblAdd) lblAdd.textContent = this.extraTubesUsed >= 2 ? 'Límite (+2)' : '+ Botella';
    }
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
          segment.style.backgroundColor = liq.color;
          if (liq.pattern) segment.classList.add(liq.pattern);
          if (liq.isChameleon) segment.classList.add('liquid-chameleon');

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

      // Indicadores especiales (Tubo estrecho 1x1, Gigante)
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

    // 1. Si no hay tubo seleccionado
    if (this.selectedTubeIndex === null) {
      if (this.tubes[idx].liquids.length === 0 || this.tubes[idx].isLocked) {
        if (window.audio) window.audio.playFailSound();
        return;
      }
      this.selectedTubeIndex = idx;
      if (window.audio) window.audio.playSelect();
      this.renderTubes();
      return;
    }

    // 2. Si se hace clic en el mismo tubo: deseleccionar
    if (this.selectedTubeIndex === idx) {
      this.selectedTubeIndex = null;
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
        this.moves++;
        this.renderTubes();
        this.updateButtonsUI();
        return;
      } else {
        if (window.audio) window.audio.playFailSound();
        this.selectedTubeIndex = null;
        this.renderTubes();
        return;
      }
    }

    // Verificar si el vertido es válido
    if (this.canPour(fromIdx, toIdx)) {
      this.executePour(fromIdx, toIdx);
    } else {
      // Si el destino tiene líquido, seleccionarlo como nuevo origen
      if (toTube.liquids.length > 0 && !toTube.isLocked) {
        this.selectedTubeIndex = toIdx;
        if (window.audio) window.audio.playSelect();
      } else {
        this.selectedTubeIndex = null;
        if (window.audio) window.audio.playFailSound();
      }
      this.renderTubes();
    }
  }

  canPour(fromIdx, toIdx) {
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    if (toTube.isLocked || fromTube.liquids.length === 0) return false;
    if (toTube.liquids.length >= toTube.capacity) return false;

    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    if (topFrom.isMystery) return false;

    if (toTube.liquids.length === 0) return true; // Tubo vacío

    const topTo = toTube.liquids[toTube.liquids.length - 1];
    if (topTo.isMystery) return false;

    // Coincidencia de color o camaleón
    return (topFrom.color === topTo.color || topFrom.isChameleon || topTo.isChameleon);
  }

  executePour(fromIdx, toIdx) {
    this.saveStateForUndo();
    this.isPouringAnimation = true;

    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];
    const topFrom = fromTube.liquids[fromTube.liquids.length - 1];
    const matchColor = topFrom.color;

    // Contar cuántos bloques contiguos se pueden mover
    let count = 0;
    for (let i = fromTube.liquids.length - 1; i >= 0; i--) {
      const item = fromTube.liquids[i];
      if (!item.isMystery && (item.color === matchColor || item.isChameleon)) {
        count++;
      } else {
        break;
      }
    }

    // Si algún tubo es estrecho, sólo se mueve 1 unidad
    if (fromTube.isNarrow || toTube.isNarrow) {
      count = 1;
    }

    const space = toTube.capacity - toTube.liquids.length;
    const unitsToMove = Math.min(count, space);

    // Obtener coordenadas en pantalla para animar el vuelo y la inclinación
    const allTubeEls = this.tubesGrid.querySelectorAll('.test-tube');
    const fromEl = allTubeEls[fromIdx];
    const toEl = allTubeEls[toIdx];

    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const isTargetToTheRight = tRect.left >= fRect.left;
    const tiltDeg = isTargetToTheRight ? 50 : -50;
    const offsetX = tRect.left - fRect.left + (isTargetToTheRight ? -22 : 22);
    const offsetY = tRect.top - fRect.top - 40;

    // Vuelo e inclinación del tubo seleccionado
    fromEl.classList.add('is-pouring');
    fromEl.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tiltDeg}deg)`;

    if (window.audio) window.audio.playPourSound();

    // Animación de chorro en el canvas
    this.drawPourStream(fRect, tRect, matchColor, isTargetToTheRight, 420);

    setTimeout(() => {
      // Transferir unidades en memoria
      for (let u = 0; u < unitsToMove; u++) {
        const item = fromTube.liquids.pop();
        item.isMystery = false;

        // Si cae sobre otro color y era camaleón, adopta el color destino
        if (toTube.liquids.length > 0) {
          const targetTop = toTube.liquids[toTube.liquids.length - 1];
          if (item.isChameleon && !targetTop.isChameleon) {
            item.color = targetTop.color;
            item.name = targetTop.name;
            item.shape = targetTop.shape;
          }
        }
        toTube.liquids.push(item);
      }

      // Revelar misterio si la nueva capa superior era oculta
      let mysteryRevealed = false;
      if (fromTube.liquids.length > 0) {
        const newTop = fromTube.liquids[fromTube.liquids.length - 1];
        if (newTop.isMystery) {
          newTop.isMystery = false;
          mysteryRevealed = true;
        }
      }

      if (mysteryRevealed && window.audio) {
        window.audio.playReveal();
      }

      this.moves++;
      this.selectedTubeIndex = null;
      this.clearHintHighlight();

      // Restaurar transformación del tubo
      fromEl.style.transform = '';
      fromEl.classList.remove('is-pouring', 'selected');

      this.isPouringAnimation = false;
      this.renderTubes();
      this.updateButtonsUI();

      // Comprobar victoria
      this.checkVictory();
    }, 450);
  }

  // --- TRAZADO DEL CHORRO DE AGUA CON CANVAS ---
  drawPourStream(fRect, tRect, color, isToRight, duration) {
    if (!this.pourCanvas || !this.pourCtx) return;
    const ctx = this.pourCtx;
    const parentRect = this.pourCanvas.getBoundingClientRect();

    const startX = (isToRight ? fRect.right - 10 : fRect.left + 10) - parentRect.left;
    const startY = fRect.top + 18 - parentRect.top;
    const endX = (tRect.left + tRect.width / 2) - parentRect.left;
    const endY = (tRect.top + 40) - parentRect.top;

    const start = performance.now();

    // Partículas de salpicadura al caer
    const splashes = [];
    for (let i = 0; i < 12; i++) {
      splashes.push({
        x: endX,
        y: endY,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4 - 1.5,
        radius: Math.random() * 2.5 + 1,
        alpha: 1
      });
    }

    const render = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, this.pourCanvas.width, this.pourCanvas.height);

      if (progress < 1) {
        ctx.save();

        // Núcleo del chorro
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const midX = (startX + endX) / 2 + (isToRight ? 10 : -10);
        const midY = Math.min(startY, endY) - 30;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Reflejo blanco central
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Salpicaduras en destino
        if (progress > 0.3) {
          splashes.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25; // Gravedad
            p.alpha -= 0.03;
            if (p.alpha > 0) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.globalAlpha = Math.max(0, p.alpha);
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

  // --- COMPROBACIÓN DE VICTORIA Y SECUENCIA DE CORCHOS ---
  checkVictory() {
    let allDone = true;

    for (const tube of this.tubes) {
      if (tube.liquids.length === 0) continue;

      if (tube.liquids.length !== tube.capacity) {
        allDone = false;
        break;
      }

      const firstCol = tube.liquids[0].color;
      const isUniform = tube.liquids.every(l => l.color === firstCol && !l.isMystery);
      if (!isUniform) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      this.triggerVictorySequence();
    }
  }

  triggerVictorySequence() {
    const elapsedSecs = window.leaderboardManager ? window.leaderboardManager.stopTimer() : 0;

    // Calcular estrellas
    const starCount = this.moves <= this.levelData.optimalMoves ? 3 : (this.moves <= this.levelData.optimalMoves * 1.5 ? 2 : 1);

    // Guardar récord en el gestor de clasificaciones
    let recordResult = null;
    if (window.leaderboardManager) {
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
    let baseCoins = 5;
    if (this.moves <= this.levelData.optimalMoves) baseCoins = 15;
    else if (this.moves <= this.levelData.optimalMoves * 1.5) baseCoins = 10;

    let totalEarned = baseCoins + (combo > 1 ? combo * 2 : 0);
    this.coins += totalEarned;
    if (this.lblCoins) this.lblCoins.textContent = this.coins;

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

    if (window.lucide) lucide.createIcons();
    if (this.modalVictory) this.modalVictory.classList.remove('hidden');
  }

  multiplyCoins(mult) {
    this.coins = Math.round(this.coins * mult);
    if (this.lblCoins) this.lblCoins.textContent = this.coins;
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
    this.updateButtonsUI();
  }

  addAuxiliaryTube() {
    if (this.extraTubesUsed >= 2) return;
    this.saveStateForUndo();
    this.extraTubesUsed++;

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
  }

  giveHint() {
    if (this.hintsRemaining <= 0) return;

    for (let i = 0; i < this.tubes.length; i++) {
      for (let j = 0; j < this.tubes.length; j++) {
        if (i !== j && this.canPour(i, j)) {
          this.hintsRemaining--;
          if (this.lblHintsLeft) this.lblHintsLeft.textContent = this.hintsRemaining;
          this.activeHint = { from: i, to: j };

          const banner = document.getElementById('hint-banner');
          if (banner) banner.classList.remove('hidden');

          if (window.audio) window.audio.playSelect();
          this.renderTubes();
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
    const modals = [this.modalMap, this.modalVictory, this.modalRoulette, this.modalLeaderboard, this.modalSettings];
    return modals.some(m => m && !m.classList.contains('hidden'));
  }

  // --- EVENT LISTENERS E INTERACTIVIDAD DE INTERFAZ ---
  initEvents() {
    // Acciones principales del HUD
    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
    if (this.btnRestart) this.btnRestart.addEventListener('click', () => this.loadLevel(this.currentLevel));
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
        const modals = [this.modalMap, this.modalLeaderboard, this.modalSettings];
        modals.forEach(m => m && m.classList.add('hidden'));
        if (window.audio && !this.isModalOpen()) {
          window.audio.playMusic('level');
        }
      }
    });
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
});
