/* ==========================================================================
   ALCHEMIX MASTER DELUXE - SISTEMA LIGERO DE INTERNACIONALIZACIÓN (i18n)
   ==========================================================================
   CÓMO CREAR O EDITAR UNA TRADUCCIÓN PERSONALIZADA:
   1. Puedes editar los textos de un idioma existente ('es', 'en') o agregar un
      nuevo código de idioma dentro de window.ALCHEMIX_LOCALES (ej: 'pt', 'fr', 'it').
   2. En el HTML, cualquier elemento con el atributo data-i18n="clave.subclave"
      reemplazará su texto automáticamente al cambiar de idioma.
      - Para atributos como title o placeholder, usa data-i18n-title="..." o
        data-i18n-placeholder="...".
   3. En JavaScript, puedes obtener cualquier texto llamando a:
      window.t('clave.subclave', { variable: valor }, 'Texto por defecto')
   ========================================================================== */

window.ALCHEMIX_LOCALES = {
  // ========================================================================
  // ESPAÑOL (IDIOMA BASE POR DEFECTO)
  // ========================================================================
  es: {
    meta: {
      name: 'Español',
      flag: '🇪🇸'
    },
    app: {
      title: 'AlcheMix',
      badge: 'DELUXE',
      subtitle: 'Desafío Alquímico de Clasificación de Fluidos',
      footer: 'AlcheMix Master Deluxe • Accesible y Dinámico'
    },
    hud: {
      level: 'Nivel',
      moves: 'Movs:',
      addTube: '+ Botella (❤️)',
      undoTitle: 'Deshacer último movimiento',
      addTubeTitle: 'Añadir una botella vacía auxiliar (cuesta 1 vida)',
      challengesTitle: 'Ver desafíos del nivel',
      pauseTitle: 'Pausar juego'
    },
    home: {
      currentLevel: 'Nivel Actual',
      coins: 'Monedas',
      extraBottle: 'Botella Extra',
      ready: 'Lista',
      cloudSave: '☁️ Guardar en Google',
      play: 'Jugar',
      levelMap: 'Mapa y Selección de Niveles',
      casualMode: 'Modo Casual Infinito (Sandbox) 🎲',
      timeAttackMode: 'Modo Contrarreloj (Alquimia Viva) ⏳',
      minigames: 'Minijuegos',
      extras: 'Extras, Desafíos y Logros ✨',
      shop: 'Tienda',
      settings: 'Ajustes'
    },
    minigames: {
      menuTitle: 'Minijuegos',
      menuSubtitle: 'Elige un desafío para practicar o apostar tus monedas',
      rouletteTitle: 'Ruleta',
      rouletteDesc: 'Aguja de precisión y multiplicadores',
      dianaTitle: 'Diana',
      dianaDesc: 'Tiro con honda y desvío por viento',
      movingTitle: 'Tiro al blanco',
      movingDesc: '3 blancos móviles en movimiento',
      randomTitle: 'Al azar',
      randomDesc: 'Rota entre los 3 juegos al azar',
      backHome: 'Volver al Menú Principal',
      betLabel: 'Apuesta de tu bolsa:',
      betFree: '0 🪙 (Libre)',
      betFunHint: 'Diversión (Sin riesgo)',
      fortuneCards: 'Cartas de Fortuna',
      tapToActivate: 'Toca para activar',
      stakeLevelEarned: 'Ganado en el nivel:',
      stakeTotalCoins: 'Total de monedas:',
      skipBonus: 'Omitir Bonus y Continuar'
    },
    victory: {
      title: '¡Nivel Completado!',
      subtitle: 'Todos los colores han sido clasificados con maestría.',
      scoreTitle: 'Puntaje Alquímico',
      timeSpent: 'Tiempo empleado:',
      movesMade: 'Movimientos realizados:',
      combo: 'Combo Consecutivo:',
      coinsEarned: 'Monedas Ganadas:',
      levelChallenges: 'Desafíos del Nivel',
      playBonusBtn: 'Jugar Minijuego de Bonus (🎯 / 🎡 / 🎪)',
      replayBtn: 'Rehacer Nivel',
      nextLevelBtn: 'Siguiente Nivel'
    },
    pause: {
      title: 'Juego en Pausa',
      coinsLabel: 'Monedas Alquímicas',
      challengesStatus: 'Estado de los Desafíos',
      resume: 'Reanudar Partida',
      restart: 'Reiniciar Nivel (-1 ❤️)',
      shop: 'Tienda de Mejoras',
      settings: 'Ajustes y Accesibilidad',
      exitMap: 'Salir al Mapa',
      exitHome: 'Salir al Menú Principal'
    },
    shop: {
      title: 'Tienda del Alquimista',
      subtitle: 'Mejoras permanentes, vidas y recargas con tus monedas ganadas.'
    },
    settings: {
      title: 'Opciones y Accesibilidad',
      subtitle: 'Configura modos para baja visión, idioma y personaliza todos los colores.',
      languageTitle: 'Idioma / Language',
      languageDesc: 'Cambia el idioma de la interfaz o usa este archivo (js/i18n.js) para crear tu propia traducción.',
      bgColorTitle: 'Color de Fondo de la Mesa',
      bgColorDesc: 'Personaliza el tono del laboratorio de alquimia a tu gusto.',
      resetBtn: 'Restablecer',
      lowVisionTitle: 'Modo Baja Visión',
      lowVisionDesc: 'Aumenta el tamaño, grosor de contornos y muestra nombres de colores.',
      highContrastTitle: 'Modo Alto Contraste',
      highContrastDesc: 'Fondo negro absoluto y contornos de máxima nitidez.',
      patternsTitle: 'Símbolos y Texturas en Líquidos',
      patternsDesc: 'Iconos y tramas en fluidos (Desactivado por defecto para líquidos puros y limpios).',
      lettersTitle: 'Identificar Colores con Letras',
      lettersDesc: 'Muestra letras legibles (A, R, N, L, etc.) en cada líquido para una distinción rápida sin ambigüedad cromática.',
      sepiaTitle: 'Modo Descanso Visual (Lentes Filtro Sepia)',
      customDiffTitle: 'Dificultad Personalizada',
      customDiffDesc: 'Activa o desactiva mecánicas desbloqueadas para jugar a tu propio ritmo.',
      soundtrackTitle: 'Banda Sonora y Temas Relajantes',
      cloudTitle: 'Guardado en la Nube con Google',
      manageBtn: 'Gestionar',
      resetAllTitle: 'Gestión de Partida',
      resetAllBtn: 'Reiniciar Todo el Progreso'
    },
    map: {
      title: 'Mapa de Niveles',
      subtitle: 'Selecciona cualquier nivel para jugar o superar tus récords anteriores.',
      cinematics: 'Cinemáticas 📜',
      endings: 'Finales 🎭'
    },
    extras: {
      title: 'Extras y Colecciones',
      subtitle: 'Modos secundarios, logros y utilidades',
      dailyChallenge: 'Desafío de Nivel Diario',
      storyLore: 'Crónicas del Alquimista (Lore)',
      endings: 'Epílogos y Finales',
      achievements: 'Salón de Logros',
      leaderboard: 'Tabla de Récords',
      tutorials: 'Guía y Tutoriales de Tubos',
      communityLevels: 'Niveles de la Comunidad',
      installApp: '📲 Instalar como App Móvil'
    }
  },

  // ========================================================================
  // ENGLISH (BASE TRANSLATION / PLANTILLA PARA OTROS IDIOMAS)
  // ========================================================================
  en: {
    meta: {
      name: 'English',
      flag: '🇺🇸'
    },
    app: {
      title: 'AlcheMix',
      badge: 'DELUXE',
      subtitle: 'Alchemical Fluid Sorting Challenge',
      footer: 'AlcheMix Master Deluxe • Accessible & Dynamic'
    },
    hud: {
      level: 'Level',
      moves: 'Moves:',
      addTube: '+ Bottle (❤️)',
      undoTitle: 'Undo last move',
      addTubeTitle: 'Add an extra empty bottle (costs 1 life)',
      challengesTitle: 'View level challenges',
      pauseTitle: 'Pause game'
    },
    home: {
      currentLevel: 'Current Level',
      coins: 'Coins',
      extraBottle: 'Extra Bottle',
      ready: 'Ready',
      cloudSave: '☁️ Save with Google',
      play: 'Play',
      levelMap: 'Level Map & Selection',
      casualMode: 'Infinite Casual Mode (Sandbox) 🎲',
      timeAttackMode: 'Time Attack Mode (Living Alchemy) ⏳',
      minigames: 'Minigames',
      extras: 'Extras, Challenges & Achievements ✨',
      shop: 'Shop',
      settings: 'Settings'
    },
    minigames: {
      menuTitle: 'Minigames',
      menuSubtitle: 'Choose a challenge to practice or bet your coins',
      rouletteTitle: 'Roulette',
      rouletteDesc: 'Precision needle & multipliers',
      dianaTitle: 'Bullseye',
      dianaDesc: 'Slingshot aim & wind drift',
      movingTitle: 'Moving Targets',
      movingDesc: '3 moving targets in motion',
      randomTitle: 'Random',
      randomDesc: 'Rotates randomly among all 3 games',
      backHome: 'Back to Main Menu',
      betLabel: 'Bet from your pouch:',
      betFree: '0 🪙 (Free)',
      betFunHint: 'Just for fun (No risk)',
      fortuneCards: 'Fortune Cards',
      tapToActivate: 'Tap to activate',
      stakeLevelEarned: 'Earned in level:',
      stakeTotalCoins: 'Total coins:',
      skipBonus: 'Skip Bonus & Continue'
    },
    victory: {
      title: 'Level Complete!',
      subtitle: 'All colors have been masterfully sorted.',
      scoreTitle: 'Alchemical Score',
      timeSpent: 'Time spent:',
      movesMade: 'Moves made:',
      combo: 'Streak Combo:',
      coinsEarned: 'Coins Earned:',
      levelChallenges: 'Level Challenges',
      playBonusBtn: 'Play Bonus Minigame (🎯 / 🎡 / 🎪)',
      replayBtn: 'Replay Level',
      nextLevelBtn: 'Next Level'
    },
    pause: {
      title: 'Game Paused',
      coinsLabel: 'Alchemical Coins',
      challengesStatus: 'Challenges Status',
      resume: 'Resume Game',
      restart: 'Restart Level (-1 ❤️)',
      shop: 'Upgrades Shop',
      settings: 'Settings & Accessibility',
      exitMap: 'Exit to Map',
      exitHome: 'Exit to Main Menu'
    },
    shop: {
      title: 'Alchemist Shop',
      subtitle: 'Permanent upgrades, lives, and refills with your earned coins.'
    },
    settings: {
      title: 'Settings & Accessibility',
      subtitle: 'Configure low-vision modes, language, and customize all colors.',
      languageTitle: 'Language / Idioma',
      languageDesc: 'Switch interface language or edit js/i18n.js to create your own custom translation.',
      bgColorTitle: 'Table Background Color',
      bgColorDesc: 'Customize the alchemy lab background tone to your liking.',
      resetBtn: 'Reset',
      lowVisionTitle: 'Low Vision Mode',
      lowVisionDesc: 'Increases size, border thickness, and displays color names.',
      highContrastTitle: 'High Contrast Mode',
      highContrastDesc: 'Pure black background and ultra-sharp borders.',
      patternsTitle: 'Liquid Symbols & Textures',
      patternsDesc: 'Icons and patterns on fluids (Off by default for clean liquids).',
      lettersTitle: 'Identify Colors with Letters',
      lettersDesc: 'Shows clear letters (A, R, N, L, etc.) on each liquid for quick distinction.',
      sepiaTitle: 'Eye Comfort Mode (Sepia Filter Glasses)',
      customDiffTitle: 'Custom Difficulty',
      customDiffDesc: 'Enable or disable unlocked mechanics to play at your own pace.',
      soundtrackTitle: 'Soundtrack & Relaxing Themes',
      cloudTitle: 'Google Cloud Save',
      manageBtn: 'Manage',
      resetAllTitle: 'Save Data Management',
      resetAllBtn: 'Reset All Progress'
    },
    map: {
      title: 'Level Map',
      subtitle: 'Select any level to play or beat your previous records.',
      cinematics: 'Cinematics 📜',
      endings: 'Endings 🎭'
    },
    extras: {
      title: 'Extras & Collections',
      subtitle: 'Secondary modes, achievements & utilities',
      dailyChallenge: 'Daily Level Challenge',
      storyLore: 'Alchemist Chronicles (Lore)',
      endings: 'Epilogues & Endings',
      achievements: 'Hall of Achievements',
      leaderboard: 'Leaderboard',
      tutorials: 'Tube Guide & Tutorials',
      communityLevels: 'Community Levels',
      installApp: '📲 Install as Mobile App'
    }
  }
};

class I18nManager {
  constructor() {
    this.storageKey = 'alchemix_lang';
    this.locales = window.ALCHEMIX_LOCALES || {};
    this.currentLang = this.loadSavedLanguage();
  }

  loadSavedLanguage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && this.locales[saved]) return saved;
    } catch (e) {
      // Ignorar errores de almacenamiento
    }
    return 'es';
  }

  getLanguage() {
    return this.currentLang;
  }

  getAvailableLanguages() {
    return Object.keys(this.locales).map((code) => ({
      code,
      name: this.locales[code]?.meta?.name || code.toUpperCase(),
      flag: this.locales[code]?.meta?.flag || '🌐'
    }));
  }

  setLanguage(langCode) {
    if (!this.locales[langCode]) return false;
    this.currentLang = langCode;
    try {
      localStorage.setItem(this.storageKey, langCode);
    } catch (e) {
      // Ignorar errores de almacenamiento
    }
    if (document.documentElement) {
      document.documentElement.lang = langCode;
    }
    this.applyDomTranslations();
    window.dispatchEvent(new CustomEvent('alchemix:languageChanged', { detail: { lang: langCode } }));
    return true;
  }

  /**
   * Obtiene una traducción por clave (ej: 'home.play') con interpolación opcional {var}
   */
  t(key, params = null, fallback = null) {
    if (!key) return fallback || '';
    const parts = String(key).split('.');

    const resolveFrom = (langObj) => {
      let cur = langObj;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
          cur = cur[p];
        } else {
          return undefined;
        }
      }
      return typeof cur === 'string' ? cur : undefined;
    };

    let str = resolveFrom(this.locales[this.currentLang]);
    if (str === undefined && this.currentLang !== 'es') {
      str = resolveFrom(this.locales.es);
    }
    if (str === undefined) {
      str = fallback !== null ? fallback : key;
    }

    if (params && typeof params === 'object') {
      return str.replace(/\{(\w+)\}/g, (match, k) => (params[k] !== undefined ? params[k] : match));
    }
    return str;
  }

  /**
   * Traduce automáticamente todos los nodos del DOM que tengan atributos data-i18n
   */
  applyDomTranslations(root = document) {
    if (!root) return;

    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key, null, null);
      if (val && val !== key) {
        el.textContent = val;
      }
    });

    const titled = root.querySelectorAll('[data-i18n-title]');
    titled.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const val = this.t(key, null, null);
      if (val && val !== key) {
        el.setAttribute('title', val);
      }
    });

    const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this.t(key, null, null);
      if (val && val !== key) {
        el.setAttribute('placeholder', val);
      }
    });

    const selectEl = document.getElementById('sel-game-language');
    if (selectEl) {
      this.populateLanguageSelect(selectEl);
    }
    this.renderLanguageButtons();
  }

  renderLanguageButtons() {
    const groupEl = document.getElementById('language-buttons-group');
    if (!groupEl) return;

    const langs = this.getAvailableLanguages();
    groupEl.innerHTML = '';

    langs.forEach((l) => {
      const isSelected = l.code === this.currentLang;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `btn-lang-${l.code}`;
      btn.setAttribute('data-lang', l.code);
      btn.className = isSelected
        ? 'btn-lang-choice btn-interactive py-2 px-3 rounded-xl text-xs font-black bg-sky-500 text-slate-950 border border-sky-300 shadow-md flex items-center justify-center gap-1.5 transition-all'
        : 'btn-lang-choice btn-interactive py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center gap-1.5 transition-all';
      btn.innerHTML = `<span>${l.flag}</span><span>${l.name}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && typeof window.audio.playSelect === 'function') {
          window.audio.playSelect();
        }
        this.setLanguage(l.code);
      });
      groupEl.appendChild(btn);
    });
  }

  populateLanguageSelect(selectEl) {
    if (!selectEl) return;
    const langs = this.getAvailableLanguages();
    const existingCodes = Array.from(selectEl.options).map((o) => o.value).join(',');
    const targetCodes = langs.map((l) => l.code).join(',');

    if (existingCodes !== targetCodes) {
      selectEl.innerHTML = '';
      langs.forEach((l) => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = `${l.flag} ${l.name}`;
        selectEl.appendChild(opt);
      });
    }
    selectEl.value = this.currentLang;
  }

  init() {
    this.applyDomTranslations();
    const selectEl = document.getElementById('sel-game-language');
    if (selectEl) {
      this.populateLanguageSelect(selectEl);
      selectEl.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }
    this.renderLanguageButtons();
  }
}

window.i18n = new I18nManager();
window.t = (key, params, fallback) => window.i18n.t(key, params, fallback);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.i18n.init());
} else {
  window.i18n.init();
}

