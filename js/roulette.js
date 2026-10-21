/* ==========================================================================
   AQUASORT MASTER DELUXE - MINIGAME ENGINE (RULETA ALEATORIA Y DIANA CON VIENTO)
   - Ruleta con orden aleatorio de sectores, ángulo inicial aleatorio y penalización (50% con 1 color, 100% con 2).
   - Diana de dardos con cálculo balístico de viento (fuerza, velocidad y desvío vectorial).
   ========================================================================== */

class MinigameEngine {
  constructor() {
    this.currentMode = 'roulette'; // 'roulette' | 'diana'

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

    // --- DIANA DE DARDOS CON VIENTO ---
    this.windSpeed = 3.2; // m/s
    this.windAngle = 45; // grados (0 = este, 90 = sur, 180 = oeste, 270 = norte)
    this.aimX = 150;
    this.aimY = 150;
    this.isAiming = false;
    this.isDartFlying = false;

    // Elementos DOM
    this.wheelContainer = null;
    this.dianaContainer = null;
    this.wheelGroup = null;
    this.needleWrapper = null;
    this.powerBar = null;
    this.btnAction = null;
  }

  initDOM() {
    this.wheelContainer = document.getElementById('roulette-view') || document.getElementById('wheel-container');
    this.dianaContainer = document.getElementById('diana-view') || document.getElementById('diana-container');
    this.wheelGroup = document.getElementById('wheel-group');
    this.needleWrapper = document.getElementById('roulette-needle');
    this.powerBar = document.getElementById('power-bar');
    this.btnAction = document.getElementById('btn-spin-wheel');

    this.setupModeTabs();
    this.setupEvents();
    this.setupDianaEvents();
    this.initRound();
  }

  // Inicializa o reinicia la ronda con sectores aleatorios y nuevo viento
  initRound() {
    this.shuffleSlices();
    this.generateNewWind();
    this.renderWheel();
    this.renderDiana();
    this.updateRulesText();
  }

  // Mezcla aleatoriamente los 6 sectores para romper memoria muscular
  shuffleSlices() {
    const pool = [
      { id: 'red', name: 'Rojo', hex: '#ef4444' },
      { id: 'blue', name: 'Azul', hex: '#3b82f6' },
      { id: 'green', name: 'Verde', hex: '#10b981' },
      { id: 'red', name: 'Rojo', hex: '#ef4444' },
      { id: 'blue', name: 'Azul', hex: '#3b82f6' },
      { id: 'green', name: 'Verde', hex: '#10b981' }
    ];
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
    this.windSpeed = (Math.random() * 4.8 + 1.2).toFixed(1); // 1.2 a 6.0 m/s
    this.windAngle = Math.floor(Math.random() * 360);

    const windSpeedLbl = document.getElementById('wind-speed-lbl') || document.getElementById('diana-wind-speed');
    const windArrow = document.getElementById('wind-arrow') || document.getElementById('diana-wind-arrow');
    if (windSpeedLbl) windSpeedLbl.textContent = `Viento: ${this.windSpeed} m/s`;
    if (windArrow) windArrow.style.transform = `rotate(${this.windAngle}deg)`;
  }

  setupModeTabs() {
    const tabRoulette = document.getElementById('tab-game-roulette') || document.getElementById('tab-minigame-roulette');
    const tabDiana = document.getElementById('tab-game-diana') || document.getElementById('tab-minigame-diana');
    const titleEl = document.getElementById('minigame-title');

    if (tabRoulette && tabDiana) {
      tabRoulette.addEventListener('click', () => {
        this.currentMode = 'roulette';
        tabRoulette.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md transition-all';
        tabDiana.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all';

        if (this.wheelContainer) this.wheelContainer.classList.remove('hidden');
        if (this.dianaContainer) this.dianaContainer.classList.add('hidden');
        const colorPickerCont = document.getElementById('roulette-colors-selector') || document.getElementById('roulette-color-picker');
        if (colorPickerCont && colorPickerCont.parentElement) colorPickerCont.parentElement.classList.remove('hidden');
        if (titleEl) titleEl.innerHTML = '<i data-lucide="disc" class="w-5 h-5 text-amber-400"></i> Ruleta de la Fortuna';
        if (window.lucide) window.lucide.createIcons();
        this.updateRulesText();
      });

      tabDiana.addEventListener('click', () => {
        this.currentMode = 'diana';
        tabDiana.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md transition-all';
        tabRoulette.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-all';

        if (this.wheelContainer) this.wheelContainer.classList.add('hidden');
        if (this.dianaContainer) this.dianaContainer.classList.remove('hidden');
        const colorPickerCont = document.getElementById('roulette-colors-selector') || document.getElementById('roulette-color-picker');
        if (colorPickerCont && colorPickerCont.parentElement) colorPickerCont.parentElement.classList.add('hidden');
        if (titleEl) titleEl.innerHTML = '<i data-lucide="crosshair" class="w-5 h-5 text-sky-400"></i> Diana de Dardos Alquímica';
        if (window.lucide) window.lucide.createIcons();

        if (window.audio) window.audio.playWindGust();
        this.updateRulesText();
      });
    }
  }

  updateRulesText() {
    const subLbl = document.getElementById('lbl-roulette-odds');
    if (!subLbl) return;

    if (this.currentMode === 'roulette') {
      const isOne = this.selectedColors.length === 1;
      const mult = isOne ? 'x2.0' : 'x1.5';
      const penalty = isOne ? 'pierdes el 50%' : 'pierdes el 100% (Todo)';
      subLbl.innerHTML = `Puedes elegir hasta 2 colores • <strong>${this.selectedColors.length} elegido(s)</strong> (Ganas ${mult} / Si fallas ${penalty})`;
    } else {
      subLbl.innerHTML = `🎯 <strong>Diana de Tiro:</strong> Compensa la fuerza y el viento (Centro: <strong>x3.0</strong>, Anillos: <strong>x2.0 / x1.5 / x1.2</strong>)`;
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

      // Texto
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

      // Clavijas
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
  }

  setupDianaEvents() {
    const dianaWrapper = document.getElementById('diana-target-container') || document.getElementById('diana-svg');
    if (!dianaWrapper) return;

    const moveCrosshair = (clientX, clientY) => {
      if (this.isDartFlying) return;
      const rect = dianaWrapper.getBoundingClientRect();
      const scaleX = 300 / rect.width;
      const scaleY = 300 / rect.height;
      this.aimX = Math.max(15, Math.min(285, (clientX - rect.left) * scaleX));
      this.aimY = Math.max(15, Math.min(285, (clientY - rect.top) * scaleY));

      const crossDiv = document.querySelector('div.diana-crosshair');
      if (crossDiv) {
        crossDiv.style.left = `${clientX - rect.left}px`;
        crossDiv.style.top = `${clientY - rect.top}px`;
      }
      const crossSvg = document.querySelector('g#diana-crosshair');
      if (crossSvg) {
        crossSvg.setAttribute('transform', `translate(${this.aimX}, ${this.aimY})`);
      }
    };

    dianaWrapper.addEventListener('mousemove', (e) => moveCrosshair(e.clientX, e.clientY));
    dianaWrapper.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        moveCrosshair(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  setupEvents() {
    // Selección de colores en ruleta (hasta 2)
    document.querySelectorAll('.btn-color-pick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        this.toggleColorBet(color, e.currentTarget);
      });
    });

    // Carga de fuerza
    if (this.btnAction) {
      const startCharge = (e) => {
        e.preventDefault();
        this.startCharging();
      };
      const stopCharge = (e) => {
        e.preventDefault();
        this.releaseCharge();
      };

      this.btnAction.addEventListener('mousedown', startCharge);
      window.addEventListener('mouseup', stopCharge);
      this.btnAction.addEventListener('touchstart', startCharge, { passive: false });
      window.addEventListener('touchend', stopCharge);
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

  startCharging() {
    if (this.isSpinning || this.isCharging || this.isDartFlying) return;
    this.isCharging = true;
    this.currentPower = 0;

    if (this.btnAction) {
      this.btnAction.textContent = this.currentMode === 'roulette' ? '¡CARGANDO FUERZA DE GIRO!...' : '¡TENSANDO DARDO!...';
    }

    clearInterval(this.chargeInterval);
    this.chargeInterval = setInterval(() => {
      this.currentPower += 2.2;
      if (this.powerBar) {
        this.powerBar.style.width = `${Math.min(this.currentPower, 100)}%`;
      }

      // Sobrecarga / Fallo si supera el 95%
      if (this.currentPower >= 95) {
        clearInterval(this.chargeInterval);
        this.currentPower = 0;
        this.isCharging = false;
        if (this.powerBar) this.powerBar.style.width = '0%';
        if (window.audio) window.audio.playFailSound();
        if (this.btnAction) {
          this.btnAction.textContent = '¡SOBRECARGA! TIRO ANULADO';
          this.btnAction.classList.add('bg-rose-600');
          setTimeout(() => {
            if (this.btnAction) {
              this.btnAction.classList.remove('bg-rose-600');
              this.btnAction.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
            }
          }, 800);
        }
      }
    }, 28);
  }

  releaseCharge() {
    if (!this.isCharging) return;
    clearInterval(this.chargeInterval);
    this.isCharging = false;

    if (this.currentPower > 10) {
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

    if (isWinner) {
      const mult = this.selectedColors.length === 1 ? 2.0 : 1.5;
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
        // Regla: 1 color = pierde el 50%; 2 colores = pierde el 100% (todo el premio del nivel)
        const lossMult = this.selectedColors.length === 1 ? 0.5 : 0;
        window.game.multiplyCoins(lossMult);
      }

      if (this.btnAction) {
        const msg = hasBoost
          ? `Cayó en ${landedColor.name}. ¡Seguro activo! Conservas tus monedas.`
          : (this.selectedColors.length === 1
            ? `Cayó en ${landedColor.name}. Pierdes 50% de las monedas.`
            : `Cayó en ${landedColor.name}. Pierdes 100% de las monedas apostadas.`);
        this.btnAction.textContent = msg;
        this.btnAction.classList.add('bg-rose-700');
      }
    }

    this.finalizeRound(winningSlice, modalBox);
  }

  // --- EJECUCIÓN DE DIANA DE DARDOS CON FÍSICA DE VIENTO ---
  throwDart(power) {
    if (this.isDartFlying) return;
    this.isDartFlying = true;
    if (this.btnAction) this.btnAction.disabled = true;

    if (window.audio) window.audio.playDartThrow();

    // Desvío por viento: Delta = Velocidad * Factor + Dispersión por potencia
    const windRad = (this.windAngle * Math.PI) / 180;
    const windPush = parseFloat(this.windSpeed) * 8.5;
    const powerJitter = ((100 - power) / 100) * 14 * (Math.random() - 0.5);

    const hitX = this.aimX + Math.cos(windRad) * windPush + powerJitter;
    const hitY = this.aimY + Math.sin(windRad) * windPush + powerJitter;

    const dartsGroup = document.getElementById('diana-darts-group');

    // Animación visual de vuelo del dardo hacia el punto de impacto
    setTimeout(() => {
      if (window.audio) window.audio.playDartHit();

      if (dartsGroup) {
        const dartEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        dartEl.setAttribute('transform', `translate(${hitX}, ${hitY})`);
        dartEl.innerHTML = `
          <!-- Sombra de impacto -->
          <ellipse cx="2" cy="4" rx="5" ry="2.5" fill="rgba(0,0,0,0.6)"/>
          <!-- Dardo clavado -->
          <circle cx="0" cy="0" r="4.5" fill="#eab308" stroke="#ffffff" stroke-width="1.5"/>
          <line x1="0" y1="0" x2="-14" y2="-18" stroke="#ffffff" stroke-width="2.5"/>
          <polygon points="-14,-18 -18,-15 -11,-12" fill="#ef4444"/>
          <polygon points="-14,-18 -15,-22 -12,-15" fill="#3b82f6"/>
        `;
        dartsGroup.appendChild(dartEl);
      }

      this.isDartFlying = false;
      this.evaluateDianaResult(hitX, hitY);
    }, 450);
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
        this.btnAction.classList.remove('bg-emerald-500', 'bg-rose-700', 'bg-slate-700');
        this.btnAction.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
      }
      if (this.powerBar) this.powerBar.style.width = '0%';

      // Limpiar dardos previos
      const dartsGroup = document.getElementById('diana-darts-group');
      if (dartsGroup) dartsGroup.innerHTML = '';

      if (window.game) {
        window.game.onRouletteClosed();
      }
    }, 2800);
  }
}

// Instancia global
window.rouletteEngine = new MinigameEngine();
