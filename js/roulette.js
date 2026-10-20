/* ==========================================================================
   AQUASORT MASTER DELUXE - ROULETTE ENGINE
   Iluminación en tiempo real del sector activo y colisión física con clavijas
   ========================================================================== */

class RouletteEngine {
  constructor() {
    this.numSlices = 6;
    this.sliceAngle = 360 / this.numSlices; // 60 grados por sector
    this.sliceColors = [
      { id: 'red', name: 'Rojo', hex: '#ef4444' },
      { id: 'blue', name: 'Azul', hex: '#3b82f6' },
      { id: 'green', name: 'Verde', hex: '#10b981' },
      { id: 'red', name: 'Rojo', hex: '#ef4444' },
      { id: 'blue', name: 'Azul', hex: '#3b82f6' },
      { id: 'green', name: 'Verde', hex: '#10b981' }
    ];

    this.selectedColors = ['blue']; // Selección de apuesta (1 o 2)
    this.isSpinning = false;
    this.isCharging = false;
    this.currentPower = 0;
    this.chargeInterval = null;
    this.currentAngle = 0;
    this.animFrameId = null;

    // Referencias a elementos
    this.wheelGroup = null;
    this.needleWrapper = null;
    this.powerBar = null;
    this.btnSpin = null;
  }

  initDOM() {
    this.wheelGroup = document.getElementById('wheel-group');
    this.needleWrapper = document.getElementById('roulette-needle');
    this.powerBar = document.getElementById('power-bar');
    this.btnSpin = document.getElementById('btn-spin-wheel');

    this.renderWheel();
    this.setupEvents();
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

      // Sector SVG
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

      // Texto de etiqueta de color en el sector
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

      // Clavijas / Pines circulares dorados exactamente en las líneas divisorias
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

    // Actualizar sector iluminado inicial bajo el cursor
    this.updateActiveSliceHighlight(this.currentAngle);
  }

  // --- CÁLCULO DE SECTOR Y COLISIÓN CON CLAVIJAS ---
  // El cursor está fijo arriba (12 en punto = 270 grados en coordenadas polares SVG)
  getEffectiveAngleAtPointer(rotationDeg) {
    let eff = (270 - (rotationDeg % 360)) % 360;
    if (eff < 0) eff += 360;
    return eff;
  }

  // Resalta en tiempo real la porción que está exactamente bajo el cursor
  updateActiveSliceHighlight(rotationDeg) {
    const effAngle = this.getEffectiveAngleAtPointer(rotationDeg);
    const sliceIndex = Math.floor(effAngle / this.sliceAngle) % this.numSlices;

    for (let i = 0; i < this.numSlices; i++) {
      const sliceEl = document.getElementById(`slice-${i}`);
      if (sliceEl) {
        if (i === sliceIndex) {
          sliceEl.classList.add('active-slice');
        } else {
          sliceEl.classList.remove('active-slice');
        }
      }
    }

    return sliceIndex;
  }

  // Evita colisión central: Si cae muy cerca de una clavija (línea divisoria),
  // la física de colisión del cursor redondeado resbala obligatoriamente a la izquierda o derecha.
  resolvePegCollision(targetAngle) {
    const effAngle = this.getEffectiveAngleAtPointer(targetAngle);
    const distToPeg = effAngle % this.sliceAngle; // Distancia al borde inferior del sector
    const deadzone = 8.5; // Umbral de colisión con la clavija circular (grados)

    let adjustedAngle = targetAngle;

    // Si está pegado al borde izquierdo del sector (cerca de 0)
    if (distToPeg < deadzone) {
      // Rebote hacia adentro del sector (+12 grados)
      adjustedAngle -= (deadzone - distToPeg + 6);
    }
    // Si está pegado al borde derecho del sector (cerca de 60)
    else if (distToPeg > (this.sliceAngle - deadzone)) {
      // Rebote hacia adentro del sector adyacente (+12 grados)
      adjustedAngle += (distToPeg - (this.sliceAngle - deadzone) + 6);
    }

    return adjustedAngle;
  }

  setupEvents() {
    // Selección de 1 o 2 colores
    document.querySelectorAll('.btn-color-pick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        this.toggleColorBet(color, e.currentTarget);
      });
    });

    // Carga de fuerza mediante presión sostenida
    if (this.btnSpin) {
      const startCharge = (e) => {
        e.preventDefault();
        this.startCharging();
      };
      const stopCharge = (e) => {
        e.preventDefault();
        this.releaseCharge();
      };

      this.btnSpin.addEventListener('mousedown', startCharge);
      window.addEventListener('mouseup', stopCharge);
      this.btnSpin.addEventListener('touchstart', startCharge, { passive: false });
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

    // Actualizar texto de multiplicador sugerido
    const multText = this.selectedColors.length === 1 ? 'Multiplicador x2.0' : 'Multiplicador x1.5';
    const subLbl = document.getElementById('lbl-roulette-odds');
    if (subLbl) subLbl.textContent = `${this.selectedColors.length} color(es) seleccionado(s) • ${multText}`;
  }

  startCharging() {
    if (this.isSpinning || this.isCharging) return;
    this.isCharging = true;
    this.currentPower = 0;

    if (this.btnSpin) this.btnSpin.textContent = '¡CARGANDO FUERZA!...';

    this.chargeInterval = setInterval(() => {
      this.currentPower += 2.5;
      if (this.powerBar) this.powerBar.style.width = `${Math.min(100, this.currentPower)}%`;

      // Sobrecalentamiento / Fallo al superar 92%
      if (this.currentPower >= 92) {
        if (window.audio) window.audio.playFailSound();
        this.overchargeFailure();
      }
    }, 25);
  }

  overchargeFailure() {
    this.isCharging = false;
    clearInterval(this.chargeInterval);

    if (this.btnSpin) {
      this.btnSpin.textContent = '¡SOBRECARGA! Demasiada fuerza';
      this.btnSpin.classList.add('bg-rose-600');
    }

    setTimeout(() => {
      this.currentPower = 0;
      if (this.powerBar) this.powerBar.style.width = '0%';
      if (this.btnSpin) {
        this.btnSpin.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
        this.btnSpin.classList.remove('bg-rose-600');
      }
    }, 1100);
  }

  releaseCharge() {
    if (!this.isCharging || this.isSpinning) return;
    this.isCharging = false;
    clearInterval(this.chargeInterval);

    if (this.currentPower > 10 && this.currentPower < 92) {
      this.spin(this.currentPower);
    } else {
      this.currentPower = 0;
      if (this.powerBar) this.powerBar.style.width = '0%';
      if (this.btnSpin) this.btnSpin.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
    }
  }

  spin(power) {
    this.isSpinning = true;
    if (this.btnSpin) {
      this.btnSpin.disabled = true;
      this.btnSpin.textContent = '¡GIRANDO RUEDA!...';
    }

    if (window.audio) window.audio.init();

    // Vueltas completas basadas en la potencia (4 a 8 vueltas completas)
    const extraTurns = 4 + Math.floor(power / 18);
    const randomAngle = Math.random() * 360;
    let targetAngle = this.currentAngle + (extraTurns * 360) + randomAngle;

    // APLICAR COLISIÓN: Garantizar que NUNCA termine sobre una clavija divisoria
    targetAngle = this.resolvePegCollision(targetAngle);

    const duration = 3800; // 3.8 segundos
    const startTime = performance.now();
    const startAngle = this.currentAngle;
    const totalRotation = targetAngle - startAngle;

    let lastPegIndex = -1;

    const animateWheel = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Curva de deceleración cúbica suave (easeOutCubic)
      const ease = 1 - Math.pow(1 - progress, 3);
      const angleNow = startAngle + totalRotation * ease;

      if (this.wheelGroup) {
        this.wheelGroup.style.transform = `rotate(${angleNow}deg)`;
      }

      // Iluminar en tiempo real la porción activa bajo el cursor
      const activeIdx = this.updateActiveSliceHighlight(angleNow);

      // Detectar paso por clavijas doradas para deflexión del cursor y claqueo sonoro
      const eff = this.getEffectiveAngleAtPointer(angleNow);
      const currentPeg = Math.floor(eff / this.sliceAngle);

      if (currentPeg !== lastPegIndex) {
        lastPegIndex = currentPeg;
        if (window.audio) window.audio.playPegClack();

        // Animar deflexión del cursor
        if (this.needleWrapper) {
          this.needleWrapper.classList.add('deflected-right');
          setTimeout(() => {
            if (this.needleWrapper) this.needleWrapper.classList.remove('deflected-right');
          }, 70);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        // Fin de giro
        this.currentAngle = targetAngle % 360;
        this.isSpinning = false;

        // Asentar cursor con snap
        if (this.needleWrapper) {
          this.needleWrapper.classList.add('snap-settle');
        }

        // Evaluar resultado
        this.evaluateResult(activeIdx);
      }
    };

    requestAnimationFrame(animateWheel);
  }

  evaluateResult(sliceIndex) {
    const landedColor = this.sliceColors[sliceIndex];
    const isWinner = this.selectedColors.includes(landedColor.id);

    const winningSlice = document.getElementById(`slice-${sliceIndex}`);
    if (winningSlice) winningSlice.classList.add('winner-slice');

    if (isWinner) {
      const mult = this.selectedColors.length === 1 ? 2.0 : 1.5;
      if (window.audio) {
        window.audio.playComboTone(7);
        window.audio.playWinFanfare();
      }

      if (typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }

      if (this.btnSpin) {
        this.btnSpin.textContent = `¡ACIERTO! GANAS ${mult}x 🪙`;
        this.btnSpin.classList.add('bg-emerald-500');
      }

      // Recompensa en juego principal
      if (window.game) {
        window.game.multiplyCoins(mult);
      }
    } else {
      if (window.audio) window.audio.playFailSound();

      if (this.btnSpin) {
        this.btnSpin.textContent = `Cayó en ${landedColor.name}. Conservas tus monedas.`;
        this.btnSpin.classList.add('bg-slate-700');
      }
    }

    setTimeout(() => {
      const modal = document.getElementById('modal-roulette');
      if (modal) modal.classList.add('hidden');

      if (winningSlice) winningSlice.classList.remove('winner-slice');
      if (this.btnSpin) {
        this.btnSpin.disabled = false;
        this.btnSpin.classList.remove('bg-emerald-500', 'bg-slate-700');
        this.btnSpin.textContent = 'MANTÉN PRESIONADO PARA REGULAR FUERZA';
      }

      if (window.game) {
        window.game.onRouletteClosed();
      }
    }, 2800);
  }
}

// Instancia global
window.rouletteEngine = new RouletteEngine();
