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

  // --- REINICIAR Y LIMPIAR TODOS LOS RÉCORDS ---
  clearAllRecords() {
    this.records = {};
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('aquasort_leaderboard');
      localStorage.removeItem('aquasort_leaderboard_records');
    } catch (e) {
      console.warn('Error borrando récords:', e);
    }
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
  recordLevelCompletion(level, timeSeconds, moves, stars, scoreData = null, combo = 0, usedHints = false) {
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
        usedHints: usedHints,
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
      if (prev.usedHints !== undefined) {
        prev.usedHints = prev.usedHints && usedHints;
      }
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

  // --- IDENTIFICADOR Y NOMBRE PARA LA TABLA MUNDIAL ---
  getPlayerId() {
    if (window.cloudSyncManager?.currentUser?.uid) {
      return window.cloudSyncManager.currentUser.uid;
    }
    let anon = localStorage.getItem('aquasort_player_uuid');
    if (!anon) {
      anon = 'alchemist_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('aquasort_player_uuid', anon);
    }
    return anon;
  }

  getPlayerDisplayName() {
    if (window.cloudSyncManager?.currentUser?.displayName) {
      return window.cloudSyncManager.currentUser.displayName;
    }
    if (window.stateManager?.state?.player?.name && window.stateManager.state.player.name !== 'Alquimista') {
      return window.stateManager.state.player.name;
    }
    return 'Alquimista';
  }

  // --- INTEGRACIÓN FIREBASE: TABLA MUNDIAL DEL DESAFÍO DIARIO ---
  /**
   * Guarda el resultado del Desafío Diario en Firestore.
   * Colección: daily_leaderboards/{YYYY-MM-DD}/entries/{userId}
   */
  async submitDailyScoreToGlobal(dailyData) {
    if (!window.cloudSyncManager?.db) {
      console.log('Firebase no disponible para registrar score diario global');
      return false;
    }
    try {
      const db = window.cloudSyncManager.db;
      const todayStr = dailyData.dateStr || new Date().toISOString().slice(0, 10);
      const uid = this.getPlayerId();
      const user = window.cloudSyncManager.currentUser;
      const entry = {
        userId: uid,
        displayName: this.getPlayerDisplayName(),
        photoURL: user?.photoURL || null,
        score: dailyData.score || 0,
        moves: dailyData.moves || 0,
        time: dailyData.time || 0,
        combo: dailyData.combo || 0,
        stars: dailyData.stars || 3,
        dateStr: todayStr,
        submittedAt: new Date().toISOString()
      };
      await db.collection('daily_leaderboards')
        .doc(todayStr)
        .collection('entries')
        .doc(uid)
        .set(entry, { merge: true });
      console.log('Score del Desafío Diario registrado en la Tabla Mundial de Firebase!');
      return true;
    } catch (err) {
      console.warn('Error enviando score diario a Firebase:', err);
      return false;
    }
  }

  /**
   * Obtiene las mejores puntuaciones globales del Desafío Diario de hoy o fecha dada
   */
  async fetchGlobalDailyLeaderboard(dateStr = null) {
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);
    if (!window.cloudSyncManager?.db) {
      return { success: false, entries: [], dateStr: targetDate, error: 'Firebase no inicializado' };
    }
    try {
      const db = window.cloudSyncManager.db;
      const snap = await db.collection('daily_leaderboards')
        .doc(targetDate)
        .collection('entries')
        .orderBy('score', 'desc')
        .limit(30)
        .get();

      const entries = [];
      snap.forEach(doc => entries.push(doc.data()));
      return { success: true, entries, dateStr: targetDate };
    } catch (err) {
      console.warn('Error leyendo tabla diaria de Firebase:', err);
      return { success: false, entries: [], dateStr: targetDate, error: err.message };
    }
  }

  // --- INTEGRACIÓN FIREBASE: SALÓN DE LA FAMA GLOBAL ---
  async submitHallOfFameScore() {
    if (!window.cloudSyncManager?.db) return false;
    try {
      const db = window.cloudSyncManager.db;
      const uid = this.getPlayerId();
      const stats = this.getGlobalStats();
      const user = window.cloudSyncManager.currentUser;
      const medals = Object.values(window.stateManager?.state?.progress?.dailyChallenges || {})
        .filter(d => d.completed).length;

      const entry = {
        userId: uid,
        displayName: this.getPlayerDisplayName(),
        photoURL: user?.photoURL || null,
        stars: stats.totalStars || 0,
        completedLevels: stats.completedLevels || 0,
        totalScore: stats.totalScore || 0,
        medals: medals,
        achievementsUnlocked: window.achievementManager ? window.achievementManager.getUnlockedCount() : 0,
        updatedAt: new Date().toISOString()
      };
      await db.collection('hall_of_fame').doc(uid).set(entry, { merge: true });
      return true;
    } catch (err) {
      console.warn('Error registrando Salón de la Fama:', err);
      return false;
    }
  }

  async fetchGlobalHallOfFame() {
    if (!window.cloudSyncManager?.db) {
      return { success: false, entries: [], error: 'Firebase no inicializado' };
    }
    try {
      const db = window.cloudSyncManager.db;
      const snap = await db.collection('hall_of_fame')
        .orderBy('stars', 'desc')
        .limit(30)
        .get();
      const entries = [];
      snap.forEach(doc => entries.push(doc.data()));
      return { success: true, entries };
    } catch (err) {
      console.warn('Error leyendo Salón de la Fama:', err);
      return { success: false, entries: [], error: err.message };
    }
  }

  // --- RENDERIZADO DE LA TABLA DE CLASIFICACIONES ---
  renderLeaderboardUI(tableContainerId, filter = 'score', mainTab = null) {
    const container = document.getElementById(tableContainerId);
    if (!container) return;

    if (mainTab) {
      this.activeMainTab = mainTab;
    } else if (!this.activeMainTab) {
      this.activeMainTab = 'local';
    }

    // Actualizar tarjetas de estadísticas globales
    const stats = this.getGlobalStats();
    const statCompleted = document.getElementById('stat-completed-levels');
    const statStars = document.getElementById('stat-total-stars');
    const statAvgMoves = document.getElementById('stat-avg-moves');
    const statBestTime = document.getElementById('stat-best-time');
    const statTotalScore = document.getElementById('stat-total-score');

    if (statCompleted) statCompleted.textContent = stats.completedLevels;
    if (statStars) statStars.textContent = `${stats.totalStars} ⭐`;
    if (statAvgMoves) statAvgMoves.textContent = stats.avgMoves;
    if (statBestTime) statBestTime.textContent = stats.bestTimeStr;
    if (statTotalScore) statTotalScore.textContent = `${stats.totalScoreStr} pts`;

    // Conectar botones de pestañas principales si existen en el modal
    this.setupMainTabs(tableContainerId, filter);

    if (this.activeMainTab === 'daily_global') {
      this.renderGlobalDailyUI(container);
      return;
    }

    if (this.activeMainTab === 'hall_of_fame') {
      this.renderHallOfFameUI(container);
      return;
    }

    // --- PESTAÑA LOCAL: MIS RÉCORDS ---
    let rowsHTML = '';
    const recordsList = [];
    const maxUnlocked = window.stateManager?.state?.progress?.unlockedLevel || 1;
    const maxRecorded = Object.keys(this.records).reduce((max, k) => Math.max(max, parseInt(k, 10) || 1), 1);
    const maxVisibleLevel = Math.max(1, maxUnlocked, maxRecorded);

    for (let i = 1; i <= maxVisibleLevel; i++) {
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

    const dailyRec = window.stateManager ? window.stateManager.getDailyChallengeRecord() : null;
    const todayStr = new Date().toISOString().slice(0, 10);
    let dailyBannerHTML = '';

    if (dailyRec && dailyRec.completed) {
      dailyBannerHTML = `
        <div class="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md border border-yellow-200">
              👑
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-amber-200 uppercase tracking-wide">Desafío Diario • ${todayStr}</span>
                <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">MEDALLA DEL DÍA</span>
              </div>
              <div class="text-[11px] text-emerald-300 font-bold">¡Completado con Éxito! Registrado en la Tabla Mundial 🌍</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-black text-amber-300 font-mono">${(dailyRec.score || 0).toLocaleString()} pts</div>
            <div class="text-[10px] text-slate-300 font-mono">⏱️ ${this.formatTime(dailyRec.time || 0)} • 👣 ${dailyRec.moves || 0} movs</div>
          </div>
        </div>
      `;
    } else {
      dailyBannerHTML = `
        <div class="mb-3.5 p-3 rounded-2xl bg-slate-800/80 border border-amber-500/40 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-base border border-amber-500/30">
              👑
            </div>
            <div>
              <div class="text-xs font-black text-white">Desafío Diario • ${todayStr}</div>
              <div class="text-[10px] text-amber-300/90 font-semibold">¡Todos compiten hoy en el mismo nivel idéntico en Firebase!</div>
            </div>
          </div>
          <button id="btn-leaderboard-play-daily" class="btn-interactive px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all">
            Jugar Reto
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      ${dailyBannerHTML}
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

    const btnPlayDaily = container.querySelector('#btn-leaderboard-play-daily');
    if (btnPlayDaily) {
      btnPlayDaily.addEventListener('click', () => {
        const modalLeaderboard = document.getElementById('modal-leaderboard');
        if (modalLeaderboard) modalLeaderboard.classList.add('hidden');
        if (window.game && typeof window.game.launchDailyChallenge === 'function') {
          window.game.launchDailyChallenge();
        }
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  // --- RENDERIZADO: TABLA MUNDIAL DEL DESAFÍO DIARIO (FIREBASE) ---
  async renderGlobalDailyUI(container) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const myId = this.getPlayerId();

    container.innerHTML = `
      <div class="p-6 text-center text-slate-300">
        <div class="inline-block animate-spin text-2xl mb-2">⏳</div>
        <div class="text-xs">Consultando Tabla Mundial en Firebase...</div>
      </div>
    `;

    const res = await this.fetchGlobalDailyLeaderboard(todayStr);

    let contentHTML = `
      <div class="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/20 to-sky-500/15 border border-sky-400/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-black text-lg border border-sky-400/30">
            🌍
          </div>
          <div>
            <div class="text-xs font-black text-white flex items-center gap-1.5">
              <span>Desafío Diario Mundial</span>
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">${todayStr}</span>
            </div>
            <div class="text-[10px] text-slate-300">Nivel idéntico y determinista para todos los jugadores del mundo.</div>
          </div>
        </div>
        <button id="btn-refresh-global-daily" class="btn-interactive px-2.5 py-1 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold transition flex items-center gap-1">
          <span>🔄</span>
          <span>Actualizar</span>
        </button>
      </div>
    `;

    if (!res.success || !res.entries || res.entries.length === 0) {
      const isConfigured = !!window.cloudSyncManager?.isConfigured;
      contentHTML += `
        <div class="p-8 text-center text-slate-400 text-xs bg-slate-800/40 rounded-2xl border border-slate-700/60">
          <div class="text-3xl mb-2">👑</div>
          <div class="font-bold text-white mb-1">¡Aún no hay récords mundiales registrados hoy!</div>
          <p class="text-[11px] text-slate-400 max-w-md mx-auto mb-4">
            ${isConfigured
              ? 'Sé el primer alquimista de todo el planeta en completar el desafío de hoy para liderar el Top 1.'
              : 'Conecta Firebase o juega el reto diario para subir tus puntuaciones a la nube.'}
          </p>
          <button id="btn-play-global-daily-now" class="btn-interactive px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all">
            Jugar Desafío Diario Ahora
          </button>
        </div>
      `;
      container.innerHTML = contentHTML;

      const btnPlay = container.querySelector('#btn-play-global-daily-now');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          const modalLeaderboard = document.getElementById('modal-leaderboard');
          if (modalLeaderboard) modalLeaderboard.classList.add('hidden');
          if (window.game) window.game.launchDailyChallenge();
        });
      }
      const btnRefresh = container.querySelector('#btn-refresh-global-daily');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => this.renderGlobalDailyUI(container));
      }
      return;
    }

    let rows = '';
    res.entries.forEach((e, idx) => {
      const rank = idx + 1;
      const isMe = (e.userId === myId);
      let rankBadge = `${rank}`;
      if (rank === 1) rankBadge = '🥇';
      else if (rank === 2) rankBadge = '🥈';
      else if (rank === 3) rankBadge = '🥉';

      rows += `
        <tr class="border-b border-slate-800/80 ${isMe ? 'bg-sky-500/15 font-black text-white' : 'hover:bg-slate-800/40 text-slate-200'} transition">
          <td class="py-2 px-3 font-bold text-xs text-center w-12">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg ${rank <= 3 ? 'bg-amber-400/20 text-amber-300 font-black' : 'text-slate-400'}">
              ${rankBadge}
            </span>
          </td>
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              ${e.photoURL
                ? `<img src="${e.photoURL}" class="w-6 h-6 rounded-full object-cover border border-slate-600" alt="Avatar">`
                : `<div class="w-6 h-6 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] font-bold">⚗️</div>`
              }
              <span class="text-xs font-bold ${isMe ? 'text-sky-300 underline' : 'text-slate-200'}">${e.displayName || 'Alquimista'}${isMe ? ' (Tú)' : ''}</span>
            </div>
          </td>
          <td class="py-2 px-3 font-mono text-amber-300 font-black text-xs text-right">
            ${(e.score || 0).toLocaleString()} pts
          </td>
          <td class="py-2 px-3 font-mono text-emerald-300 text-xs text-right">
            ⏱️ ${this.formatTime(e.time || 0)}
          </td>
          <td class="py-2 px-3 text-slate-300 text-xs text-right">
            👣 ${e.moves || 0}
          </td>
        </tr>
      `;
    });

    contentHTML += `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/80 bg-slate-900/50">
            <th class="py-2 px-3 text-center">Rango</th>
            <th class="py-2 px-3">Alquimista</th>
            <th class="py-2 px-3 text-right text-amber-300">Puntaje</th>
            <th class="py-2 px-3 text-right">Tiempo</th>
            <th class="py-2 px-3 text-right">Movs</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.innerHTML = contentHTML;

    const btnRefresh = container.querySelector('#btn-refresh-global-daily');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.renderGlobalDailyUI(container));
    }
  }

  // --- RENDERIZADO: SALÓN DE LA FAMA GLOBAL ---
  async renderHallOfFameUI(container) {
    const myId = this.getPlayerId();

    container.innerHTML = `
      <div class="p-6 text-center text-slate-300">
        <div class="inline-block animate-spin text-2xl mb-2">⏳</div>
        <div class="text-xs">Cargando Salón de la Fama Alquímico...</div>
      </div>
    `;

    // Sincronizar mis propias estrellas antes de leer
    await this.submitHallOfFameScore();

    const res = await this.fetchGlobalHallOfFame();

    let contentHTML = `
      <div class="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/50 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-lg border border-amber-400/40">
            🏆
          </div>
          <div>
            <div class="text-xs font-black text-amber-200">Salón de la Fama Mundial</div>
            <div class="text-[10px] text-slate-300">Los alquimistas con mayor número de Estrellas, Medallas y Logros.</div>
          </div>
        </div>
      </div>
    `;

    if (!res.success || !res.entries || res.entries.length === 0) {
      contentHTML += `
        <div class="p-8 text-center text-slate-400 text-xs bg-slate-800/40 rounded-2xl border border-slate-700/60">
          <div class="text-3xl mb-2">✨</div>
          <div class="font-bold text-white mb-1">Salón de la Fama en Preparación</div>
          <p class="text-[11px] text-slate-400 max-w-md mx-auto">
            ¡Sigue acumulando estrellas en la campaña y medallas en el Desafío Diario para figurar en la cumbre!
          </p>
        </div>
      `;
      container.innerHTML = contentHTML;
      return;
    }

    let rows = '';
    res.entries.forEach((e, idx) => {
      const rank = idx + 1;
      const isMe = (e.userId === myId);
      let rankBadge = `${rank}`;
      if (rank === 1) rankBadge = '👑';
      else if (rank === 2) rankBadge = '🥈';
      else if (rank === 3) rankBadge = '🥉';

      rows += `
        <tr class="border-b border-slate-800/80 ${isMe ? 'bg-amber-500/15 font-black text-white' : 'hover:bg-slate-800/40 text-slate-200'} transition">
          <td class="py-2.5 px-3 font-bold text-xs text-center w-12">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg ${rank <= 3 ? 'bg-amber-400/20 text-amber-300 font-black' : 'text-slate-400'}">
              ${rankBadge}
            </span>
          </td>
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              ${e.photoURL
                ? `<img src="${e.photoURL}" class="w-6 h-6 rounded-full object-cover border border-amber-400/60" alt="Avatar">`
                : `<div class="w-6 h-6 rounded-full bg-slate-700 text-amber-300 flex items-center justify-center text-[10px] font-bold">✨</div>`
              }
              <div>
                <div class="text-xs font-bold ${isMe ? 'text-amber-300 underline' : 'text-slate-100'}">${e.displayName || 'Alquimista'}${isMe ? ' (Tú)' : ''}</div>
                <div class="text-[10px] text-slate-400 font-mono">${e.completedLevels || 0} niveles superados</div>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-3 font-mono text-amber-300 font-black text-xs text-right">
            ${e.stars || 0} ⭐
          </td>
          <td class="py-2.5 px-3 font-mono text-amber-400 text-xs text-right">
            ${e.medals || 0} 🎖️
          </td>
          <td class="py-2.5 px-3 font-mono text-sky-300 text-xs text-right">
            ${e.achievementsUnlocked || 0} 🎖️
          </td>
        </tr>
      `;
    });

    contentHTML += `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/80 bg-slate-900/50">
            <th class="py-2 px-3 text-center">Rango</th>
            <th class="py-2 px-3">Gran Alquimista</th>
            <th class="py-2 px-3 text-right text-amber-300">Estrellas</th>
            <th class="py-2 px-3 text-right text-amber-400">Medallas</th>
            <th class="py-2 px-3 text-right text-sky-300">Logros</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.innerHTML = contentHTML;
  }

  setupMainTabs(tableContainerId, filter) {
    const tabLocal = document.getElementById('tab-leaderboard-local');
    const tabDaily = document.getElementById('tab-leaderboard-daily');
    const tabHof = document.getElementById('tab-leaderboard-hof');
    const filterBar = document.getElementById('leaderboard-filters-bar');
    const statsGrid = document.getElementById('leaderboard-stats-grid');

    const updateTabStyles = () => {
      const activeClass = 'bg-sky-500 text-white font-black shadow-md';
      const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-800 font-bold';

      if (tabLocal) {
        tabLocal.className = `flex-1 py-1.5 px-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 ${this.activeMainTab === 'local' ? activeClass : inactiveClass}`;
      }
      if (tabDaily) {
        tabDaily.className = `flex-1 py-1.5 px-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 ${this.activeMainTab === 'daily_global' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : inactiveClass}`;
      }
      if (tabHof) {
        tabHof.className = `flex-1 py-1.5 px-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 ${this.activeMainTab === 'hall_of_fame' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md' : inactiveClass}`;
      }

      if (filterBar) {
        filterBar.style.display = (this.activeMainTab === 'local') ? 'flex' : 'none';
      }
      if (statsGrid) {
        statsGrid.style.display = (this.activeMainTab === 'local') ? 'grid' : 'none';
      }
    };

    if (tabLocal && !tabLocal.dataset.bound) {
      tabLocal.dataset.bound = 'true';
      tabLocal.addEventListener('click', () => {
        this.activeMainTab = 'local';
        updateTabStyles();
        this.renderLeaderboardUI(tableContainerId, filter, 'local');
      });
    }

    if (tabDaily && !tabDaily.dataset.bound) {
      tabDaily.dataset.bound = 'true';
      tabDaily.addEventListener('click', () => {
        this.activeMainTab = 'daily_global';
        updateTabStyles();
        this.renderLeaderboardUI(tableContainerId, filter, 'daily_global');
      });
    }

    if (tabHof && !tabHof.dataset.bound) {
      tabHof.dataset.bound = 'true';
      tabHof.addEventListener('click', () => {
        this.activeMainTab = 'hall_of_fame';
        updateTabStyles();
        this.renderLeaderboardUI(tableContainerId, filter, 'hall_of_fame');
      });
    }

    updateTabStyles();
  }
}

// Instancia global
window.leaderboardManager = new LeaderboardManager();

