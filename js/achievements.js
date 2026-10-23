/* ==========================================================================
   AQUASORT MASTER DELUXE - ACHIEVEMENTS ENGINE (SISTEMA DE LOGROS)
   Hitos de largo plazo, estadísticas progresivas, notificaciones flotantes
   y sincronización con Cloud Firestore.
   ========================================================================== */

const ACHIEVEMENTS_CATALOG = [
  {
    id: 'first_shatter',
    title: '¡Frágil Alquimia!',
    description: 'Sobrecarga o rompe tu primer frasco de cristal por exceso de presión o mezcla.',
    category: 'Mecánicas',
    icon: 'flask-conical',
    badge: '💥',
    max: 1,
    reward: 100
  },
  {
    id: 'perfect_spins_100',
    title: 'Maestro del Pulso',
    description: 'Acierta 100 tiros o giros perfectos en la diana o ruleta de la fortuna.',
    category: 'Destreza',
    icon: 'target',
    badge: '🎯',
    max: 100,
    reward: 500
  },
  {
    id: 'chemical_master_10',
    title: 'Reacción Deliberada',
    description: 'Provoca 10 reacciones químicas deliberadas usando el tubo estrecho 1x1.',
    category: 'Alquimia',
    icon: 'zap',
    badge: '⚡',
    max: 10,
    reward: 250
  },
  {
    id: 'daily_streak_7',
    title: 'Hábito de Sabio',
    description: 'Completa 7 Desafíos Diarios mundiales con medalla dorada.',
    category: 'Desafío',
    icon: 'crown',
    badge: '👑',
    max: 7,
    reward: 400
  },
  {
    id: 'stars_150',
    title: 'Cielos Estrellados',
    description: 'Acumula 150 estrellas doradas en la campaña principal.',
    category: 'Campaña',
    icon: 'star',
    badge: '⭐',
    max: 150,
    reward: 600
  },
  {
    id: 'visual_comfort_win',
    title: 'Mirada Protegida',
    description: 'Completa cualquier nivel con el Modo Descanso Visual activado.',
    category: 'Accesibilidad',
    icon: 'glasses',
    badge: '👓',
    max: 1,
    reward: 150
  },
  {
    id: 'easter_egg_master',
    title: 'Compañeros Alquímicos',
    description: 'Descubre a los 7 compañeros secretos con toque sostenido en el tablero.',
    category: 'Secretos',
    icon: 'heart',
    badge: '🐾',
    max: 7,
    reward: 350
  },
  {
    id: 'combo_streak_5',
    title: 'Cascada Imparable',
    description: 'Logra una racha de combo x5 o superior en un solo nivel.',
    category: 'Destreza',
    icon: 'flame',
    badge: '🔥',
    max: 1,
    reward: 200
  },
  {
    id: 'time_attack_survivor',
    title: 'Superviviente del Tiempo',
    description: 'Supera los 10,000 puntos en el Modo Contrarreloj (Alquimia Viva).',
    category: 'Contrarreloj',
    icon: 'hourglass',
    badge: '⏳',
    max: 1,
    reward: 300
  },
  {
    id: 'casual_explorer_10',
    title: 'Alquimia Libre',
    description: 'Supera 10 niveles en el Modo Casual Infinito personalizado.',
    category: 'Casual',
    icon: 'infinity',
    badge: '🎲',
    max: 10,
    reward: 200
  },
  {
    id: 'no_undo_master',
    title: 'Decisión Firme',
    description: 'Supera 5 niveles seguidos sin usar Deshacer ni Botellas Extra.',
    category: 'Maestría',
    icon: 'check-circle',
    badge: '🛡️',
    max: 5,
    reward: 300
  },
  {
    id: 'chapter_1_complete',
    title: 'Iniciado de los Frascos',
    description: 'Supera los primeros 10 niveles de la campaña alquímica.',
    category: 'Campaña',
    icon: 'award',
    badge: '📜',
    max: 1,
    reward: 150
  },
  {
    id: 'flawless_win',
    title: 'Perfección Alquímica',
    description: 'Gana un nivel con 3 estrellas en menos de 25 segundos y sin errores.',
    category: 'Maestría',
    icon: 'trophy',
    badge: '💎',
    max: 1,
    reward: 250
  }
];

class AchievementManager {
  constructor() {
    this.catalog = ACHIEVEMENTS_CATALOG;
    this.toastQueue = [];
    this.isToastShowing = false;
    this.currentFilter = 'all'; // 'all' | 'unlocked' | 'locked'
  }

  getCatalog() {
    return this.catalog;
  }

  getAchievement(id) {
    return this.catalog.find(a => a.id === id) || null;
  }

  isUnlocked(id) {
    if (!window.stateManager) return false;
    return window.stateManager.isAchievementUnlocked(id);
  }

  getProgress(id) {
    if (!window.stateManager) return 0;
    return window.stateManager.getAchievementProgress(id);
  }

  getUnlockedCount() {
    return this.catalog.filter(a => this.isUnlocked(a.id)).length;
  }

  getTotalRewardsClaimed() {
    let sum = 0;
    this.catalog.forEach(a => {
      if (this.isUnlocked(a.id)) sum += a.reward;
    });
    return sum;
  }

  /**
   * Actualiza el valor actual y desbloquea si alcanza el máximo
   */
  check(id, currentVal) {
    const ach = this.getAchievement(id);
    if (!ach) return;
    if (this.isUnlocked(id)) return;

    if (window.stateManager) {
      window.stateManager.setAchievementProgress(id, currentVal);
      if (currentVal >= ach.max) {
        this.unlock(id);
      }
    }
  }

  /**
   * Incrementa el progreso de un logro acumulativo
   */
  increment(id, by = 1) {
    const ach = this.getAchievement(id);
    if (!ach) return;
    if (this.isUnlocked(id)) return;

    if (window.stateManager) {
      const cur = window.stateManager.incrementAchievementProgress(id, by);
      if (cur >= ach.max) {
        this.unlock(id);
      }
    }
  }

  /**
   * Desbloquea un logro, entrega monedas, reproduce sonido y lanza el toast animado
   */
  unlock(id) {
    const ach = this.getAchievement(id);
    if (!ach) return;
    if (this.isUnlocked(id)) return;

    if (window.stateManager) {
      const wasNew = window.stateManager.unlockAchievement(id);
      if (!wasNew) return;

      // Otorgar recompensa en monedas
      if (ach.reward > 0) {
        window.stateManager.addCoins(ach.reward);
        if (window.game && typeof window.game.updateCoinsUI === 'function') {
          window.game.updateCoinsUI();
        }
      }

      // Sonido de victoria / fanfarria
      if (window.audio && typeof window.audio.playFanfare === 'function') {
        window.audio.playFanfare();
      }

      // Encolar y mostrar notificación flotante
      this.enqueueToast(ach);

      // Sincronizar en la nube si hay usuario activo
      if (window.cloudSyncManager && window.cloudSyncManager.currentUser) {
        window.cloudSyncManager.scheduleAutoSave();
      }
    }
  }

  enqueueToast(ach) {
    this.toastQueue.push(ach);
    if (!this.isToastShowing) {
      this.showNextToast();
    }
  }

  showNextToast() {
    if (this.toastQueue.length === 0) {
      this.isToastShowing = false;
      return;
    }

    this.isToastShowing = true;
    const ach = this.toastQueue.shift();

    let toastContainer = document.getElementById('achievement-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'achievement-toast-container';
      toastContainer.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto w-full bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 border-2 border-amber-400/90 rounded-2xl p-3.5 shadow-2xl shadow-amber-500/30 flex items-center gap-3 transform -translate-y-8 opacity-0 transition-all duration-300';
    toast.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center text-2xl shadow-md border border-yellow-200 shrink-0 animate-bounce">
        ${ach.badge}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-black uppercase tracking-wider text-amber-300">¡LOGRO DESBLOQUEADO!</span>
          <span class="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-400/30">+${ach.reward} 🪙</span>
        </div>
        <div class="text-sm font-black text-white truncate">${ach.title}</div>
        <div class="text-[11px] text-slate-300 line-clamp-1">${ach.description}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.classList.remove('-translate-y-8', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Despedida
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('-translate-y-8', 'opacity-0');
      setTimeout(() => {
        toast.remove();
        this.showNextToast();
      }, 350);
    }, 4200);
  }

  openModal() {
    const modal = document.getElementById('modal-achievements');
    if (!modal) return;
    this.renderAchievementsUI();
    modal.classList.remove('hidden');
    if (window.audio) window.audio.playSelect();
  }

  closeModal() {
    const modal = document.getElementById('modal-achievements');
    if (!modal) return;
    modal.classList.add('hidden');
    if (window.audio) window.audio.playSelect();
  }

  renderAchievementsUI() {
    const container = document.getElementById('achievements-catalog-list');
    if (!container) return;

    const unlockedCount = this.getUnlockedCount();
    const totalCount = this.catalog.length;
    const pct = Math.round((unlockedCount / totalCount) * 100);

    // Resumen en la cabecera del modal
    const lblCount = document.getElementById('achievements-stat-unlocked');
    const lblCoins = document.getElementById('achievements-stat-coins');
    const barProgress = document.getElementById('achievements-bar-progress');

    if (lblCount) lblCount.textContent = `${unlockedCount} / ${totalCount}`;
    if (lblCoins) lblCoins.textContent = `+${this.getTotalRewardsClaimed()} 🪙`;
    if (barProgress) barProgress.style.width = `${pct}%`;

    // Filtros
    let list = this.catalog;
    if (this.currentFilter === 'unlocked') {
      list = list.filter(a => this.isUnlocked(a.id));
    } else if (this.currentFilter === 'locked') {
      list = list.filter(a => !this.isUnlocked(a.id));
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          <i data-lucide="award" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
          No hay logros en esta categoría.
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let cardsHTML = '';
    list.forEach(ach => {
      const isUn = this.isUnlocked(ach.id);
      const cur = Math.min(ach.max, this.getProgress(ach.id));
      const achPct = Math.round((cur / ach.max) * 100);

      const unlockDate = isUn && window.stateManager?.state?.achievements?.unlocked?.[ach.id]
        ? new Date(window.stateManager.state.achievements.unlocked[ach.id]).toLocaleDateString()
        : null;

      cardsHTML += `
        <div class="p-3.5 rounded-2xl border transition-all ${
          isUn
            ? 'bg-gradient-to-r from-amber-500/15 via-slate-800/90 to-amber-500/10 border-amber-400/60 shadow-md shadow-amber-500/10'
            : 'bg-slate-800/60 border-slate-700/60 opacity-85'
        }">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
              isUn
                ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-md border border-yellow-200'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }">
              ${isUn ? ach.badge : '🔒'}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black ${isUn ? 'text-amber-300' : 'text-white'}">${ach.title}</span>
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-mono">${ach.category}</span>
                </div>
                <span class="text-[11px] font-bold ${isUn ? 'text-emerald-400' : 'text-amber-400'} font-mono shrink-0">
                  +${ach.reward} 🪙
                </span>
              </div>

              <p class="text-xs text-slate-300 mt-1 leading-relaxed">${ach.description}</p>

              <!-- Barra de progreso o sello completado -->
              <div class="mt-2.5 flex items-center justify-between gap-3 text-[11px]">
                <div class="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div class="h-full rounded-full transition-all duration-500 ${
                    isUn ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-sky-500'
                  }" style="width: ${isUn ? 100 : achPct}%"></div>
                </div>
                <div class="font-mono text-[10px] shrink-0 ${isUn ? 'text-amber-300 font-bold' : 'text-slate-400'}">
                  ${isUn ? `Completado ✓ (${unlockDate || 'Hoy'})` : `${cur} / ${ach.max}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = cardsHTML;
    if (window.lucide) lucide.createIcons();
  }
}

// Instancia global
window.achievementManager = new AchievementManager();
