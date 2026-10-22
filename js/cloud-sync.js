/* ==========================================================================
   AQUASORT MASTER DELUXE - CLOUD SYNC MANAGER (FIREBASE & GOOGLE AUTH)
   Autenticación de Google y Guardado en la Nube con Cloud Firestore
   Sincronización multiplataforma automática (PC, Tablet y Móvil)
   ========================================================================== */

class CloudSyncManager {
  constructor() {
    this.firebaseApp = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.isConfigured = false;
    this.isSyncing = false;
    this.lastSyncTimestamp = localStorage.getItem('aquasort_last_cloud_sync') || null;
    this.autoSaveTimer = null;
    this.status = 'unconfigured'; // 'unconfigured' | 'logged_out' | 'synced' | 'syncing' | 'error'

    // Intentar inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      setTimeout(() => this.init(), 100);
    }
  }

  // --- INICIALIZACIÓN DE FIREBASE ---
  init() {
    if (this.isInitialized) return;

    // Verificar si el SDK de Firebase está cargado
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK no está disponible en este entorno.');
      this.status = 'error';
      this.updateUI();
      return;
    }

    const config = typeof window.getFirebaseConfig === 'function' ? window.getFirebaseConfig() : window.DEFAULT_FIREBASE_CONFIG;
    if (!config || !config.apiKey || !config.projectId) {
      this.isConfigured = false;
      this.status = 'unconfigured';
      this.updateUI();
      return;
    }

    try {
      // Inicializar Firebase si no existe una app activa
      if (!firebase.apps || firebase.apps.length === 0) {
        this.firebaseApp = firebase.initializeApp(config);
      } else {
        this.firebaseApp = firebase.app();
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.isConfigured = true;
      this.isInitialized = true;

      // Habilitar persistencia offline en Firestore si el navegador lo permite
      try {
        this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
          if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
            console.warn('Firestore offline persistence:', err);
          }
        });
      } catch (e) {}

      // Escuchar cambios de autenticación
      this.auth.onAuthStateChanged((user) => {
        this.onAuthStateChanged(user);
      });

      console.log('Firebase CloudSyncManager inicializado exitosamente.');
    } catch (err) {
      console.error('Error inicializando Firebase CloudSync:', err);
      this.isConfigured = false;
      this.status = 'error';
      this.updateUI();
    }
  }

  // --- MANEJO DEL ESTADO DE AUTENTICACIÓN ---
  async onAuthStateChanged(user) {
    this.currentUser = user;
    if (user) {
      this.status = 'synced';
      console.log('Usuario de Google autenticado:', user.displayName, user.email);
      
      // Sincronizar automáticamente al iniciar sesión
      await this.syncWithCloud(false);
    } else {
      this.status = 'logged_out';
      console.log('Ningún usuario de Google autenticado.');
    }
    this.updateUI();
  }

  // --- INICIO DE SESIÓN CON GOOGLE ---
  async loginWithGoogle() {
    if (!this.isConfigured) {
      this.openCloudModal(true); // Abrir modal enfocado en configuración
      return;
    }

    if (!this.auth) {
      alert('El servicio de autenticación no está listo. Verifica tu conexión a internet.');
      return;
    }

    try {
      this.status = 'syncing';
      this.updateUI();

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      // En móviles puede requerir redirect si el navegador bloquea popups
      try {
        await this.auth.signInWithPopup(provider);
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          console.warn('Popup bloqueado, intentando con redirección...');
          await this.auth.signInWithRedirect(provider);
        } else {
          throw popupErr;
        }
      }
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      this.status = this.currentUser ? 'synced' : 'logged_out';
      this.updateUI();
      
      let msg = 'No se pudo iniciar sesión con Google: ' + (err.message || err);
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Inicio de sesión cancelado.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Dominio no autorizado en Firebase. Agrega este dominio en la consola de Firebase (Authentication -> Settings -> Authorized domains).';
      }
      alert(msg);
    }
  }

  // --- CIERRE DE SESIÓN ---
  async logout() {
    if (!this.auth) return;
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.status = 'logged_out';
      this.updateUI();
      if (window.audio) window.audio.playSelect();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  // --- SERIALIZAR ESTADO ACTUAL DEL JUEGO ---
  serializeCurrentState() {
    const state = window.stateManager ? window.stateManager.state : null;
    const records = window.leaderboardManager ? window.leaderboardManager.records : {};
    const palette = window.paletteManager ? window.paletteManager.getPalette() : [];

    return {
      version: '1.2.0',
      updatedAt: new Date().toISOString(),
      device: navigator.userAgent.slice(0, 100),
      state: state || {},
      records: records || {},
      customPalette: palette || []
    };
  }

  // --- FUSIÓN INTELIGENTE DE PARTIDAS (SIN PÉRDIDA DE PROGRESO) ---
  mergeStates(localData, cloudData) {
    if (!cloudData || !cloudData.state) return localData;
    if (!localData || !localData.state) return cloudData;

    const localState = localData.state;
    const cloudState = cloudData.state;

    // 1. Nivel desbloqueado: el más alto de los dos
    const localUnlocked = localState.progress?.unlockedLevel || 1;
    const cloudUnlocked = cloudState.progress?.unlockedLevel || 1;
    const bestUnlocked = Math.max(localUnlocked, cloudUnlocked);

    // 2. Monedas: el monto más alto
    const localCoins = localState.player?.coins || 0;
    const cloudCoins = cloudState.player?.coins || 0;
    const bestCoins = Math.max(localCoins, cloudCoins);

    // 3. Fusión de niveles completados y estrellas
    const mergedCompletedLevels = { ...(localState.progress?.completedLevels || {}) };
    const cloudCompletedLevels = cloudState.progress?.completedLevels || {};

    Object.keys(cloudCompletedLevels).forEach((lvlKey) => {
      const cRec = cloudCompletedLevels[lvlKey];
      const lRec = mergedCompletedLevels[lvlKey];
      if (!lRec) {
        mergedCompletedLevels[lvlKey] = cRec;
      } else {
        mergedCompletedLevels[lvlKey] = {
          ...lRec,
          stars: Math.max(lRec.stars || 0, cRec.stars || 0),
          bestMoves: Math.min(lRec.bestMoves || Infinity, cRec.bestMoves || Infinity),
          bestTimeSec: Math.min(lRec.bestTimeSec || Infinity, cRec.bestTimeSec || Infinity),
          usedHints: (lRec.usedHints && cRec.usedHints) // Falso si en alguno no usó pistas
        };
      }
    });

    // 4. Fusión de récords del leaderboard
    const mergedRecords = { ...(localData.records || {}) };
    const cloudRecords = cloudData.records || {};
    Object.keys(cloudRecords).forEach((lvlKey) => {
      const cRec = cloudRecords[lvlKey];
      const lRec = mergedRecords[lvlKey];
      if (!lRec) {
        mergedRecords[lvlKey] = cRec;
      } else {
        mergedRecords[lvlKey] = {
          ...lRec,
          stars: Math.max(lRec.stars || 0, cRec.stars || 0),
          bestMoves: Math.min(lRec.bestMoves || Infinity, cRec.bestMoves || Infinity),
          bestTime: Math.min(lRec.bestTime || Infinity, cRec.bestTime || Infinity),
          bestScore: Math.max(lRec.bestScore || 0, cRec.bestScore || 0),
          bestCombo: Math.max(lRec.bestCombo || 0, cRec.bestCombo || 0)
        };
      }
    });

    // 5. Fusión de cartas de minijuegos (mayor cantidad)
    const mergedCards = { ...(localState.cards || {}) };
    const cloudCards = cloudState.cards || {};
    Object.keys(cloudCards).forEach((cKey) => {
      mergedCards[cKey] = Math.max(mergedCards[cKey] || 0, cloudCards[cKey] || 0);
    });

    // 6. Fusión de mejoras alquímicas
    const mergedUpgrades = {
      cooldownReductionLevel: Math.max(localState.upgrades?.cooldownReductionLevel || 1, cloudState.upgrades?.cooldownReductionLevel || 1),
      maxStoredHints: Math.max(localState.upgrades?.maxStoredHints || 3, cloudState.upgrades?.maxStoredHints || 3),
      rouletteBoost: (localState.upgrades?.rouletteBoost || cloudState.upgrades?.rouletteBoost || false)
    };

    // 7. Fusión de desafíos completados
    const mergedChallenges = { ...(localState.progress?.completedChallenges || {}) };
    const cloudChallenges = cloudState.progress?.completedChallenges || {};
    Object.keys(cloudChallenges).forEach((chKey) => {
      const cChal = cloudChallenges[chKey];
      const lChal = mergedChallenges[chKey];
      if (!lChal) {
        mergedChallenges[chKey] = cChal;
      } else {
        const mergedIds = Array.from(new Set([...(lChal.completedIds || []), ...(cChal.completedIds || [])]));
        mergedChallenges[chKey] = {
          ...lChal,
          completedIds: mergedIds,
          completedCount: mergedIds.length,
          totalCount: Math.max(lChal.totalCount || 0, cChal.totalCount || 0)
        };
      }
    });

    // 8. Fusión de niveles personalizados creados
    const localCustom = localState.customLevels || [];
    const cloudCustom = cloudState.customLevels || [];
    const customLevelsMap = new Map();
    localCustom.forEach(lvl => customLevelsMap.set(lvl.id || lvl.name, lvl));
    cloudCustom.forEach(lvl => customLevelsMap.set(lvl.id || lvl.name, lvl));

    // Estado integrado final
    const integratedState = {
      ...localState,
      player: {
        ...localState.player,
        coins: bestCoins,
        nickname: cloudState.player?.nickname || localState.player?.nickname || 'Alquimista'
      },
      upgrades: mergedUpgrades,
      cards: mergedCards,
      progress: {
        ...localState.progress,
        unlockedLevel: bestUnlocked,
        completedLevels: mergedCompletedLevels,
        completedChallenges: mergedChallenges,
        honorMastery: { ...(cloudState.progress?.honorMastery || {}), ...(localState.progress?.honorMastery || {}) }
      },
      customLevels: Array.from(customLevelsMap.values())
    };

    return {
      version: '1.2.0',
      updatedAt: new Date().toISOString(),
      device: navigator.userAgent.slice(0, 100),
      state: integratedState,
      records: mergedRecords,
      customPalette: localData.customPalette?.length > 0 ? localData.customPalette : (cloudData.customPalette || [])
    };
  }

  // --- SINCRONIZACIÓN CON LA NUBE ---
  async syncWithCloud(forceUpload = false) {
    if (!this.currentUser || !this.db) return false;

    this.isSyncing = true;
    this.status = 'syncing';
    this.updateUI();

    try {
      const userDocRef = this.db.collection('aquasort_saves').doc(this.currentUser.uid);
      const localData = this.serializeCurrentState();

      if (forceUpload) {
        // Subida forzada
        await userDocRef.set(localData, { merge: true });
        this.lastSyncTimestamp = new Date().toISOString();
        localStorage.setItem('aquasort_last_cloud_sync', this.lastSyncTimestamp);
        this.status = 'synced';
        this.updateUI();
        this.showToast('☁️ Progreso respaldado en Google Cloud');
        return true;
      }

      // Obtener copia en la nube
      const docSnap = await userDocRef.get();

      if (docSnap.exists) {
        const cloudData = docSnap.data();
        
        // Realizar fusión inteligente para nunca perder ni un solo nivel o estrella
        const merged = this.mergeStates(localData, cloudData);

        // Aplicar estado fusionado localmente
        if (window.stateManager) {
          window.stateManager.state = merged.state;
          window.stateManager.saveState();
        }
        if (window.leaderboardManager) {
          window.leaderboardManager.records = merged.records;
          window.leaderboardManager.saveRecords();
        }
        if (window.paletteManager && merged.customPalette?.length > 0) {
          window.paletteManager.palette = merged.customPalette;
          window.paletteManager.savePalette();
        }

        // Subir estado fusionado a Firestore
        merged.updatedAt = new Date().toISOString();
        await userDocRef.set(merged, { merge: true });

        // Actualizar el juego actual si hay nueva información
        if (window.game) {
          window.game.coins = merged.state.player.coins;
          window.game.updateCoinsHUD();
          window.game.updateLivesHUD();
          // Si el nivel actual era menor al desbloqueado, sincronizar
          if (window.game.currentLevel < merged.state.progress.unlockedLevel) {
            window.game.currentLevel = merged.state.progress.unlockedLevel;
            window.game.loadLevel(window.game.currentLevel);
          }
        }

        this.showToast('✨ Partida sincronizada con éxito');
      } else {
        // Primera vez en este usuario: subir la partida local
        await userDocRef.set(localData);
        this.showToast('🚀 Partida vinculada a tu cuenta de Google');
      }

      this.lastSyncTimestamp = new Date().toISOString();
      localStorage.setItem('aquasort_last_cloud_sync', this.lastSyncTimestamp);
      this.status = 'synced';
      this.updateUI();
      return true;
    } catch (err) {
      console.error('Error durante la sincronización en la nube:', err);
      this.status = 'error';
      this.updateUI();
      this.showToast('⚠️ Error al sincronizar con la nube');
      return false;
    } finally {
      this.isSyncing = false;
      this.updateUI();
    }
  }

  // --- AUTO-GUARDADO (DEBOUNCED) TRAS VICTORIA O COMPRAS ---
  triggerAutoSave() {
    if (!this.currentUser || !this.db) return;

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.syncWithCloud(true);
    }, 1800);
  }

  // --- RECONECTAR CON NUEVA CONFIGURACIÓN ---
  reconfigure(configJson) {
    let parsed = null;
    try {
      if (typeof configJson === 'string') {
        parsed = JSON.parse(configJson);
      } else {
        parsed = configJson;
      }
    } catch (e) {
      alert('El formato JSON no es válido.');
      return false;
    }

    if (!parsed || !parsed.apiKey || !parsed.projectId) {
      alert('La configuración debe incluir al menos "apiKey" y "projectId".');
      return false;
    }

    const saved = window.saveFirebaseConfig(parsed);
    if (saved) {
      alert('Configuración guardada. La página se recargará para conectar.');
      window.location.reload();
      return true;
    }
    return false;
  }

  // --- RESTABLECER CONFIGURACIÓN ---
  resetConfiguration() {
    if (confirm('¿Restablecer la configuración de Firebase a los valores predeterminados?')) {
      window.clearFirebaseConfig();
      window.location.reload();
    }
  }

  // --- MENSAJE FLOTANTE (TOAST) ---
  showToast(text) {
    let toast = document.getElementById('cloud-sync-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cloud-sync-toast';
      toast.className = 'fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-sky-500/50 text-white text-xs font-bold py-2 px-4 rounded-2xl shadow-2xl backdrop-blur-md z-50 transition-all opacity-0 pointer-events-none flex items-center gap-2';
      document.body.appendChild(toast);
    }
    toast.innerHTML = text;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, -8px)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 0)';
    }, 2800);
  }

  // --- FORMATEO DE TIEMPO TRANSCURRIDO ---
  formatLastSyncTime() {
    if (!this.lastSyncTimestamp) return 'Nunca sincronizado';
    try {
      const d = new Date(this.lastSyncTimestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
    } catch (e) {
      return 'Recientemente';
    }
  }

  // --- ACTUALIZACIÓN DE INTERFACES EN TODO EL JUEGO ---
  updateUI() {
    // 1. Botón del Header
    const btnHeader = document.getElementById('btn-open-cloud-sync');
    const headerAvatar = document.getElementById('cloud-header-avatar');
    const headerIcon = document.getElementById('cloud-header-icon');
    const headerDot = document.getElementById('cloud-header-dot');

    if (btnHeader) {
      if (this.currentUser) {
        if (headerAvatar && this.currentUser.photoURL) {
          headerAvatar.src = this.currentUser.photoURL;
          headerAvatar.classList.remove('hidden');
          if (headerIcon) headerIcon.classList.add('hidden');
        } else {
          if (headerAvatar) headerAvatar.classList.add('hidden');
          if (headerIcon) headerIcon.classList.remove('hidden');
        }
        if (headerDot) {
          headerDot.className = 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow-sm';
          headerDot.classList.remove('hidden');
        }
        btnHeader.title = `Conectado como ${this.currentUser.displayName || this.currentUser.email} (Sincronizado)`;
      } else {
        if (headerAvatar) headerAvatar.classList.add('hidden');
        if (headerIcon) headerIcon.classList.remove('hidden');
        if (headerDot) {
          if (!this.isConfigured) {
            headerDot.className = 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 shadow-sm';
            headerDot.classList.remove('hidden');
          } else {
            headerDot.classList.add('hidden');
          }
        }
        btnHeader.title = 'Guardado en la Nube con Google (Multiplataforma)';
      }
    }

    // 2. Elementos del Modal de Sincronización en la Nube
    const cardLoggedOut = document.getElementById('cloud-card-logged-out');
    const cardLoggedIn = document.getElementById('cloud-card-logged-in');
    const cardConfig = document.getElementById('cloud-card-config');
    const userPhoto = document.getElementById('cloud-user-photo');
    const userName = document.getElementById('cloud-user-name');
    const userEmail = document.getElementById('cloud-user-email');
    const lblLastSync = document.getElementById('cloud-lbl-last-sync');
    const syncStatusBadge = document.getElementById('cloud-sync-status-badge');

    if (cardLoggedOut && cardLoggedIn) {
      if (this.currentUser) {
        cardLoggedOut.classList.add('hidden');
        cardLoggedIn.classList.remove('hidden');

        if (userPhoto) {
          userPhoto.src = this.currentUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user';
        }
        if (userName) userName.textContent = this.currentUser.displayName || 'Alquimista de Google';
        if (userEmail) userEmail.textContent = this.currentUser.email || '';
        if (lblLastSync) lblLastSync.textContent = this.formatLastSyncTime();

        if (syncStatusBadge) {
          if (this.isSyncing) {
            syncStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse';
            syncStatusBadge.textContent = '🔄 Sincronizando...';
          } else {
            syncStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
            syncStatusBadge.textContent = '☁️ Nube al día';
          }
        }
      } else {
        cardLoggedIn.classList.add('hidden');
        cardLoggedOut.classList.remove('hidden');
      }
    }

    // Estado de configuración de Firebase en el modal
    const configNotice = document.getElementById('cloud-config-notice');
    if (configNotice) {
      if (!this.isConfigured) {
        configNotice.classList.remove('hidden');
      } else {
        configNotice.classList.add('hidden');
      }
    }

    // 3. Indicador en Pantalla de Inicio (Modal Home)
    const homeCloudPill = document.getElementById('home-cloud-status-pill');
    if (homeCloudPill) {
      if (this.currentUser) {
        homeCloudPill.innerHTML = `
          <div class="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Nube: ${this.currentUser.displayName ? this.currentUser.displayName.split(' ')[0] : 'Conectado'}</span>
          </div>
        `;
      } else {
        homeCloudPill.innerHTML = `
          <div class="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 cursor-pointer font-medium">
            <span>☁️ Guardar en Google</span>
          </div>
        `;
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- ABRIR / CERRAR MODAL DE SINCRONIZACIÓN ---
  openCloudModal(focusConfig = false) {
    const modal = document.getElementById('modal-cloud-sync');
    if (!modal) return;
    this.updateUI();

    const configBox = document.getElementById('cloud-config-box');
    if (configBox) {
      if (focusConfig || !this.isConfigured) {
        configBox.classList.remove('hidden');
      } else {
        configBox.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
    if (window.game && typeof window.game.showModal === 'function') {
      window.game.showModal(modal);
    }
  }

  closeCloudModal() {
    const modal = document.getElementById('modal-cloud-sync');
    if (!modal) return;
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }
  }
}

// Instancia global
window.cloudSyncManager = new CloudSyncManager();
