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
    this.coins = window.stateManager ? window.stateManager.getCoins() : 0;
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

    // Sincronizar nivel desbloqueado guardado si existe
    if (window.stateManager && window.stateManager.state.progress.unlockedLevel) {
      this.currentLevel = window.stateManager.state.progress.unlockedLevel;
    }

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

    // Botones del HUD
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
    this.modalHome = document.getElementById('modal-home');
    this.modalShop = document.getElementById('modal-shop');

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
  loadLevel(lvl) {
    this.currentLevel = Math.max(1, Math.min(lvl, this.maxLevels));
    this.moves = 0;
    this.moveHistory = [];
    this.selectedTubeIndex = null;
    this.extraTubesUsed = 0;
    this.activeHint = null;
    this.isPouringAnimation = false;

    // Actualizar nivel desbloqueado en el estado persistente
    if (window.stateManager) {
      if (this.currentLevel > (window.stateManager.state.progress.unlockedLevel || 1)) {
        window.stateManager.state.progress.unlockedLevel = this.currentLevel;
        window.stateManager.saveState();
      }
      this.coins = window.stateManager.getCoins();
    }

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
    this.updateMovesUI();
    this.renderTubes();
    this.updateButtonsUI();
    this.updateAuxiliaryButtonUI();
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
          if (window.audio) window.audio.playPourSound();
          this.drawPourStream(fRect, tRect, matchColor, isTargetToTheRight, 500);

          // PASO 5: Animación simultánea de vaciado en origen y llenado en destino
          const fromGlass = fromEl.querySelector('.tube-glass');
          const toGlass = toEl.querySelector('.tube-glass');

          // Vaciado en origen: el segmento superior reduce su altura a 0%
          if (fromGlass) {
            const topSegments = fromGlass.querySelectorAll('.liquid-segment');
            if (topSegments.length > 0) {
              const segToDrain = topSegments[topSegments.length - 1];
              segToDrain.style.transition = 'height 0.46s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
              segToDrain.style.height = '0%';
              segToDrain.style.opacity = '0.2';
            }
          }

          // Llenado en destino: crear elemento temporal de subida de nivel
          if (toGlass) {
            const incomingSeg = document.createElement('div');
            incomingSeg.className = 'liquid-segment top-liquid';
            incomingSeg.style.backgroundColor = matchColor;
            incomingSeg.style.height = '0%';
            incomingSeg.style.transition = 'height 0.48s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
            toGlass.appendChild(incomingSeg);
            requestAnimationFrame(() => {
              incomingSeg.style.height = `${(unitsToMove / toTube.capacity) * 100}%`;
            });
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

                // Revelar capa misteriosa si la nueva capa superior era oculta
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
    this.addCoins(totalEarned);

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

  // --- TIENDA DE MEJORAS (UPGRADES SHOP) ---
  openShopModal() {
    this.updateCoinsUI();
    this.renderShopItems();
    if (this.modalShop) this.modalShop.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeShopModal() {
    if (this.modalShop) this.modalShop.classList.add('hidden');
    this.updateAuxiliaryButtonUI();
  }

  renderShopItems() {
    const container = document.getElementById('shop-items-container');
    if (!container || !window.stateManager) return;
    const state = window.stateManager.state;
    const coins = window.stateManager.getCoins();

    const cdLvl = state.upgrades.cooldownReductionLevel || 1;
    const cdMs = { 1: 100, 2: 75, 3: 50, 4: 25 }[cdLvl] || 25;
    const nextCdMs = { 1: 75, 2: 50, 3: 25 }[cdLvl];
    const cdCost = { 1: 30, 2: 60, 3: 100 }[cdLvl];

    const hintsCap = state.upgrades.maxStoredHints || 3;
    const nextHintsCap = hintsCap === 3 ? 5 : (hintsCap === 5 ? 8 : null);
    const hintsCapCost = hintsCap === 3 ? 25 : (hintsCap === 5 ? 50 : null);

    const remCd = window.stateManager.getCooldownRemaining();

    container.innerHTML = `
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
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 disabled:opacity-40" ${remCd === 0 || coins < 20 ? 'disabled' : ''} onclick="window.game.buyUpgrade('recharge_bottle')">
            Recargar (20 🪙)
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
          <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-md shadow-purple-500/20 disabled:opacity-40" ${coins < 15 ? 'disabled' : ''} onclick="window.game.buyUpgrade('buy_hints_pack')">
            Comprar (15 🪙)
          </button>
        </div>
      </div>

      <!-- 5. Seguro Permanente de la Ruleta -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              Seguro de Ruleta (Boost)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">Permanente</span>
            </h4>
            <p class="text-xs text-slate-400">Si fallas en la ruleta de la fortuna, conservas el 100% de tus monedas del nivel en lugar de perder la mitad.</p>
          </div>
        </div>
        <div>
          ${!state.upgrades.rouletteBoost ? `
            <button class="btn-interactive px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-40" ${coins < 40 ? 'disabled' : ''} onclick="window.game.buyUpgrade('roulette_boost')">
              Activar (40 🪙)
            </button>
          ` : `
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              ✓ Seguro Activo
            </span>
          `}
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
      if (window.audio) window.audio.playWinFanfare();
      this.updateCoinsUI();
      this.renderShopItems();
      this.updateAuxiliaryButtonUI();
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

    // Botón Inicio y Botón Tienda en Header
    const btnOpenHome = document.getElementById('btn-open-home');
    if (btnOpenHome) {
      btnOpenHome.addEventListener('click', () => this.openHomeModal());
    }

    const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
      btnOpenShop.addEventListener('click', () => this.openShopModal());
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
        const modals = [this.modalMap, this.modalLeaderboard, this.modalSettings, this.modalHome, this.modalShop];
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
