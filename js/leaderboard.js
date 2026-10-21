/* ==========================================================================
   AQUASORT MASTER DELUXE - LEADERBOARD & TIME / MOVES RECORDS
   Tabla de clasificaciones por tiempo y movimientos con persistencia
   ========================================================================== */

class LeaderboardManager {
  constructor() {
    this.storageKey = 'aquasort_leaderboard_records';
    this.records = this.loadRecords();

    // Temporizador en vivo durante el juego
    this.timerStartTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.isTimerRunning = false;
  }

  loadRecords() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveRecords() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    } catch (e) {}
  }

  // --- CONTROL DEL TEMPORIZADOR EN VIVO ---
  startTimer(displayElementId = 'lbl-timer') {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.timerStartTime = Date.now();
    this.isTimerRunning = true;

    const displayEl = document.getElementById(displayElementId);
    if (displayEl) displayEl.textContent = '00:00';

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.timerStartTime) / 1000);
      if (displayEl) {
        displayEl.textContent = this.formatTime(this.elapsedSeconds);
      }
      if (window.game && typeof window.game.onTimerTick === 'function') {
        window.game.onTimerTick(this.elapsedSeconds);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
    return this.elapsedSeconds;
  }

  getElapsedSeconds() {
    return this.elapsedSeconds;
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- CÁLCULO DE PUNTUACIÓN ALQUÍMICA ACUMULATIVA ---
  /**
   * Sistema de Puntuación Alquímica Acumulativa (Score):
   * - Nivel completado (base fija): 1,000 pts
   * - Bonificación por movimientos (eficiencia): hasta +600 pts (+25 pts por mov bajo el par)
   * - Bonificación por tiempo (rapidez): hasta +600 pts (+10 pts por seg ahorrado)
   * - Bonificación por combos consecutivos (si combo >= 2): combo * 250 pts (+500 si combo >= 5)
   * - Bonificación por desafíos secundarios: 300 pts c/u (+400 bono Pleno Alquímico)
   * - Multiplicador por estrellas: 3★ = x1.25, 2★ = x1.0, 1★ = x0.85
   */
  calculateScore({ level, elapsedSecs, moves, optimalMoves = 15, combo = 0, challengesCompleted = 0, totalChallenges = 0, stars = 3 }) {
    const baseScore = 1000;

    // 1. Eficiencia en movimientos
    let movesBonus = 100;
    if (moves <= optimalMoves) {
      movesBonus = 600 + Math.max(0, optimalMoves - moves) * 25;
    } else if (moves <= optimalMoves * 1.5) {
      movesBonus = 350;
    } else if (moves <= optimalMoves * 2) {
      movesBonus = 200;
    }

    // 2. Rapidez en tiempo
    const targetTime = Math.max(30, optimalMoves * 4);
    let timeBonus = 50;
    if (elapsedSecs <= targetTime) {
      timeBonus = Math.min(600, 400 + Math.max(0, targetTime - elapsedSecs) * 10);
    } else if (elapsedSecs <= targetTime * 1.5) {
      timeBonus = 250;
    } else if (elapsedSecs <= targetTime * 2) {
      timeBonus = 120;
    }

    // 3. Combo consecutivo (REGLA: sólo si combo >= 2; si es 1 no hay combo)
    let comboBonus = 0;
    if (combo >= 2) {
      comboBonus = combo * 250;
      if (combo >= 5) {
        comboBonus += 500; // Gran racha de alquimista maestro
      }
    }

    // 4. Desafíos secundarios cumplidos
    let challengesBonus = challengesCompleted * 300;
    if (totalChallenges > 0 && challengesCompleted === totalChallenges) {
      challengesBonus += 400; // Bono "Pleno Alquímico"
    }

    const subtotal = baseScore + movesBonus + timeBonus + comboBonus + challengesBonus;

    // 5. Multiplicador por Estrellas
    let starMultiplier = 1.0;
    if (stars >= 3) starMultiplier = 1.25;
    else if (stars === 2) starMultiplier = 1.0;
    else starMultiplier = 0.85;

    const totalScore = Math.round(subtotal * starMultiplier);

    return {
      totalScore,
      baseScore,
      movesBonus,
      timeBonus,
      comboBonus,
      challengesBonus,
      starMultiplier,
      subtotal,
      combo,
      challengesCompleted,
      totalChallenges
    };
  }

  // --- REGISTRO Y ACTUALIZACIÓN DE RÉCORDS ---
  recordLevelCompletion(level, timeSeconds, moves, stars, scoreData = null, combo = 0) {
    const key = String(level);
    const prev = this.records[key];
    let isNewBestTime = false;
    let isNewBestMoves = false;
    let isNewBestScore = false;

    const newScore = scoreData ? scoreData.totalScore : 0;

    if (!prev) {
      this.records[key] = {
        level: level,
        bestTime: timeSeconds,
        bestMoves: moves,
        stars: stars,
        bestScore: newScore,
        bestCombo: combo,
        scoreData: scoreData,
        date: new Date().toLocaleDateString()
      };
      isNewBestTime = true;
      isNewBestMoves = true;
      isNewBestScore = true;
    } else {
      if (timeSeconds < prev.bestTime) {
        prev.bestTime = timeSeconds;
        isNewBestTime = true;
      }
      if (moves < prev.bestMoves) {
        prev.bestMoves = moves;
        isNewBestMoves = true;
      }
      if (!prev.bestScore || newScore > prev.bestScore) {
        prev.bestScore = newScore;
        prev.scoreData = scoreData;
        isNewBestScore = true;
      }
      prev.bestCombo = Math.max(prev.bestCombo || 0, combo);
      prev.stars = Math.max(prev.stars, stars);
      prev.date = new Date().toLocaleDateString();
    }

    this.saveRecords();
    return { isNewBestTime, isNewBestMoves, isNewBestScore, currentBest: this.records[key] };
  }

  getRecord(level) {
    return this.records[String(level)] || null;
  }

  getGlobalStats() {
    const completedLevels = Object.keys(this.records).length;
    let totalStars = 0;
    let totalMoves = 0;
    let totalScore = 0;
    let bestTimeRecord = Infinity;

    Object.values(this.records).forEach(rec => {
      totalStars += (rec.stars || 0);
      totalMoves += (rec.bestMoves || 0);
      totalScore += (rec.bestScore || 0);
      if (rec.bestTime < bestTimeRecord) {
        bestTimeRecord = rec.bestTime;
      }
    });

    const avgMoves = completedLevels > 0 ? (totalMoves / completedLevels).toFixed(1) : 0;
    const bestTimeStr = bestTimeRecord !== Infinity ? this.formatTime(bestTimeRecord) : '--:--';
    const totalScoreStr = totalScore.toLocaleString();

    return {
      completedLevels,
      totalStars,
      avgMoves,
      bestTimeStr,
      totalScore,
      totalScoreStr
    };
  }

  getStats() {
    return this.getGlobalStats();
  }

  // --- RENDERIZADO DE LA TABLA DE CLASIFICACIONES ---
  renderLeaderboardUI(tableContainerId, filter = 'score') {
    const container = document.getElementById(tableContainerId);
    if (!container) return;

    // Actualizar tarjetas de estadísticas globales
    const stats = this.getGlobalStats();
    const statCompleted = document.getElementById('stat-completed-levels');
    const statStars = document.getElementById('stat-total-stars');
    const statAvgMoves = document.getElementById('stat-avg-moves');
    const statBestTime = document.getElementById('stat-best-time');
    const statTotalScore = document.getElementById('stat-total-score');

    if (statCompleted) statCompleted.textContent = `${stats.completedLevels}/100`;
    if (statStars) statStars.textContent = `${stats.totalStars} ⭐`;
    if (statAvgMoves) statAvgMoves.textContent = stats.avgMoves;
    if (statBestTime) statBestTime.textContent = stats.bestTimeStr;
    if (statTotalScore) statTotalScore.textContent = `${stats.totalScoreStr} pts`;

    // Generar filas de la tabla
    let rowsHTML = '';
    const recordsList = [];

    for (let i = 1; i <= 100; i++) {
      const rec = this.getRecord(i);
      if (filter === 'completed' && !rec) continue;
      recordsList.push({ level: i, record: rec });
    }

    if (filter === 'score') {
      recordsList.sort((a, b) => {
        const scoreA = a.record && a.record.bestScore ? a.record.bestScore : 0;
        const scoreB = b.record && b.record.bestScore ? b.record.bestScore : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.level - b.level;
      });
    } else if (filter === 'fastest') {
      recordsList.sort((a, b) => {
        const timeA = a.record ? a.record.bestTime : Infinity;
        const timeB = b.record ? b.record.bestTime : Infinity;
        return timeA - timeB;
      });
    }

    if (recordsList.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          <i data-lucide="award" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
          Aún no tienes niveles completados en esta vista. ¡Juega para establecer tus récords!
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    recordsList.forEach(({ level, record }) => {
      const isCompleted = !!record;
      const scoreStr = isCompleted && record.bestScore ? `${record.bestScore.toLocaleString()} pts` : '--';
      const comboStr = isCompleted && record.bestCombo && record.bestCombo >= 2 ? `x${record.bestCombo} ⭐` : '--';
      const timeStr = isCompleted ? this.formatTime(record.bestTime) : '--:--';
      const movesStr = isCompleted ? `${record.bestMoves} movs` : '--';
      const starsCount = isCompleted ? record.stars : 0;

      let starsHTML = '';
      for (let s = 0; s < 3; s++) {
        starsHTML += `<span class="${s < starsCount ? 'text-amber-400' : 'text-slate-600'}">★</span>`;
      }

      rowsHTML += `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-3 font-bold text-sky-300">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs">
              ${level}
            </span>
          </td>
          <td class="py-2.5 px-3 font-mono text-amber-300 font-black text-xs">
            ${scoreStr}
          </td>
          <td class="py-2.5 px-3 text-xs font-semibold ${comboStr !== '--' ? 'text-amber-400 font-black' : 'text-slate-500'}">
            ${comboStr}
          </td>
          <td class="py-2.5 px-3 font-mono text-emerald-300 text-xs font-semibold">
            ⏱️ ${timeStr}
          </td>
          <td class="py-2.5 px-3 text-slate-200 text-xs font-semibold">
            👣 ${movesStr}
          </td>
          <td class="py-2.5 px-3 text-sm tracking-wider">
            ${starsHTML}
          </td>
          <td class="py-2.5 px-3 text-right">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-500'
            }">
              ${isCompleted ? 'Completado' : 'Pendiente'}
            </span>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/80 bg-slate-900/50">
            <th class="py-2 px-3">Nivel</th>
            <th class="py-2 px-3 text-amber-300 font-black">Puntaje 🏆</th>
            <th class="py-2 px-3 text-amber-400">Combo ⭐</th>
            <th class="py-2 px-3">Mejor Tiempo</th>
            <th class="py-2 px-3">Menos Movs</th>
            <th class="py-2 px-3">Estrellas</th>
            <th class="py-2 px-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;

    if (window.lucide) lucide.createIcons();
  }
}

// Instancia global
window.leaderboardManager = new LeaderboardManager();
