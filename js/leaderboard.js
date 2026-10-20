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

  // --- REGISTRO Y ACTUALIZACIÓN DE RÉCORDS ---
  recordLevelCompletion(level, timeSeconds, moves, stars) {
    const key = String(level);
    const prev = this.records[key];
    let isNewBestTime = false;
    let isNewBestMoves = false;

    if (!prev) {
      this.records[key] = {
        level: level,
        bestTime: timeSeconds,
        bestMoves: moves,
        stars: stars,
        date: new Date().toLocaleDateString()
      };
      isNewBestTime = true;
      isNewBestMoves = true;
    } else {
      if (timeSeconds < prev.bestTime) {
        prev.bestTime = timeSeconds;
        isNewBestTime = true;
      }
      if (moves < prev.bestMoves) {
        prev.bestMoves = moves;
        isNewBestMoves = true;
      }
      prev.stars = Math.max(prev.stars, stars);
      prev.date = new Date().toLocaleDateString();
    }

    this.saveRecords();
    return { isNewBestTime, isNewBestMoves, currentBest: this.records[key] };
  }

  getRecord(level) {
    return this.records[String(level)] || null;
  }

  getGlobalStats() {
    const completedLevels = Object.keys(this.records).length;
    let totalStars = 0;
    let totalMoves = 0;
    let bestTimeRecord = Infinity;

    Object.values(this.records).forEach(rec => {
      totalStars += (rec.stars || 0);
      totalMoves += (rec.bestMoves || 0);
      if (rec.bestTime < bestTimeRecord) {
        bestTimeRecord = rec.bestTime;
      }
    });

    const avgMoves = completedLevels > 0 ? (totalMoves / completedLevels).toFixed(1) : 0;
    const bestTimeStr = bestTimeRecord !== Infinity ? this.formatTime(bestTimeRecord) : '--:--';

    return {
      completedLevels,
      totalStars,
      avgMoves,
      bestTimeStr
    };
  }

  // --- RENDERIZADO DE LA TABLA DE CLASIFICACIONES ---
  renderLeaderboardUI(tableContainerId, filter = 'completed') {
    const container = document.getElementById(tableContainerId);
    if (!container) return;

    // Actualizar tarjetas de estadísticas globales
    const stats = this.getGlobalStats();
    const statCompleted = document.getElementById('stat-completed-levels');
    const statStars = document.getElementById('stat-total-stars');
    const statAvgMoves = document.getElementById('stat-avg-moves');
    const statBestTime = document.getElementById('stat-best-time');

    if (statCompleted) statCompleted.textContent = `${stats.completedLevels}/100`;
    if (statStars) statStars.textContent = `${stats.totalStars} ⭐`;
    if (statAvgMoves) statAvgMoves.textContent = stats.avgMoves;
    if (statBestTime) statBestTime.textContent = stats.bestTimeStr;

    // Generar filas de la tabla
    let rowsHTML = '';
    const recordsList = [];

    for (let i = 1; i <= 100; i++) {
      const rec = this.getRecord(i);
      if (filter === 'completed' && !rec) continue;
      recordsList.push({ level: i, record: rec });
    }

    if (filter === 'fastest') {
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
