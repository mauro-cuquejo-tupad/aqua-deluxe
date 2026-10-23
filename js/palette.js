/* ==========================================================================
   AQUASORT MASTER DELUXE - PALETTE & COLOR CUSTOMIZATION (WCAG AAA)
   Paleta de alta accesibilidad, contraste certificado WCAG AAA y presets rápidos
   ========================================================================== */

const AAA_PALETTE = [
  { id: 0, name: 'Carmesí Radiante', hex: '#ff334b', letter: 'R', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 1, name: 'Cielo Alquímico', hex: '#38bdf8', letter: 'C', shape: '▲', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 2, name: 'Verde Esmeralda', hex: '#10b981', letter: 'V', shape: '■', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 3, name: 'Oro Supremo', hex: '#facc15', letter: 'A', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 4, name: 'Violeta Eléctrico', hex: '#c084fc', letter: 'P', shape: '◆', pattern: 'pattern-horizontal', textHex: '#000000' },
  { id: 5, name: 'Naranja Mandarina', hex: '#fb923c', letter: 'N', shape: '✚', pattern: 'pattern-vertical', textHex: '#000000' },
  { id: 6, name: 'Rosa Neón Flúor', hex: '#f472b6', letter: 'F', shape: '♥', pattern: 'pattern-cross', textHex: '#000000' },
  { id: 7, name: 'Cian Glaciar', hex: '#22d3ee', letter: 'G', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' },
  { id: 8, name: 'Ámbar Cálido', hex: '#f59e0b', letter: 'X', shape: '⬟', pattern: 'pattern-checker', textHex: '#000000' },
  { id: 9, name: 'Lima Brillante', hex: '#a3e635', letter: 'L', shape: '⬢', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 10, name: 'Índigo Astral', hex: '#818cf8', letter: 'I', shape: '✿', pattern: 'pattern-stripes', textHex: '#000000' },
  { id: 11, name: 'Blanco Ópalo Puro', hex: '#f8fafc', letter: 'B', shape: '❄', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 12, name: 'Turquesa Mar', hex: '#2dd4bf', letter: 'T', shape: '✪', pattern: 'pattern-horizontal', textHex: '#000000' },
  { id: 13, name: 'Rubí Encendido', hex: '#e11d48', letter: 'U', shape: '⯁', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 14, name: 'Coral Solar', hex: '#fb7185', letter: 'S', shape: '🞛', pattern: 'pattern-cross', textHex: '#000000' },
  { id: 15, name: 'Azul Real', hex: '#2563eb', letter: 'Z', shape: '🞗', pattern: 'pattern-zigzag', textHex: '#ffffff' }
];

const COLORBLIND_PALETTE = [
  { id: 0, name: 'Azul Intenso', hex: '#0072b2', letter: 'A', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 1, name: 'Naranja Vivo', hex: '#e69f00', letter: 'N', shape: '▲', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 2, name: 'Cielo Claro', hex: '#56b4e9', letter: 'C', shape: '■', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 3, name: 'Amarillo Seguro', hex: '#f0e442', letter: 'Y', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 4, name: 'Bermejo / Carmín', hex: '#d55e00', letter: 'R', shape: '◆', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 5, name: 'Púrpura Rojizo', hex: '#cc79a7', letter: 'P', shape: '✚', pattern: 'pattern-vertical', textHex: '#000000' },
  { id: 6, name: 'Verde Azulado', hex: '#009e73', letter: 'V', shape: '♥', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 7, name: 'Gris Perla', hex: '#e2e8f0', letter: 'G', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' }
];

// PALETA DESCANSO VISUAL (Calibrada para Lentes con Filtro Sepia / Bloqueo de Luz Azul)
// Bajo lentes sepia, los tonos cálidos (amarillo, naranja, rojo) y oscuros (negro, marrón, grafito)
// mantienen máxima nitidez y contraste, mientras que los azules y violetas se atenúan.
const VISUAL_COMFORT_PALETTE = [
  { id: 0, name: 'Amarillo Oro Solar', hex: '#fbbf24', letter: 'A', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 1, name: 'Rojo Escarlata Vivo', hex: '#dc2626', letter: 'R', shape: '▲', pattern: 'pattern-dots', textHex: '#ffffff' },
  { id: 2, name: 'Negro Ónix Profundo', hex: '#09090b', letter: 'N', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 3, name: 'Verde Lima Eléctrico', hex: '#84cc16', letter: 'L', shape: '■', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 4, name: 'Naranja Mandarina', hex: '#ea580c', letter: 'F', shape: '◆', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 5, name: 'Marrón Chocolate Café', hex: '#451a03', letter: 'M', shape: '✚', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 6, name: 'Rojo Carmesí Rubí', hex: '#991b1b', letter: 'C', shape: '♥', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 7, name: 'Mostaza Ocre Dorado', hex: '#ca8a04', letter: 'O', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' },
  { id: 8, name: 'Gris Carbón Grafito', hex: '#27272a', letter: 'G', shape: '⬟', pattern: 'pattern-checker', textHex: '#ffffff' },
  { id: 9, name: 'Terracota Teja Cálido', hex: '#c2410c', letter: 'T', shape: '⬢', pattern: 'pattern-dots', textHex: '#ffffff' },
  { id: 10, name: 'Verde Oliva Cálido', hex: '#4d7c0f', letter: 'V', shape: '✿', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 11, name: 'Ámbar Cálido Intenso', hex: '#f59e0b', letter: 'X', shape: '❄', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 12, name: 'Marrón Bronce Rústico', hex: '#78350f', letter: 'B', shape: '✪', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 13, name: 'Vino Borgoña Oscuro', hex: '#701a75', letter: 'P', shape: '⯁', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 14, name: 'Amarillo Limón Brillante', hex: '#fde047', letter: 'Y', shape: '🞛', pattern: 'pattern-cross', textHex: '#000000' },
  { id: 15, name: 'Café Espresso Profundo', hex: '#1c1007', letter: 'E', shape: '🞗', pattern: 'pattern-zigzag', textHex: '#ffffff' }
];

const DEFAULT_PALETTE = AAA_PALETTE;

const AVAILABLE_SHAPES = ['●', '▲', '■', '★', '◆', '✚', '♥', '✦', '⬟', '⬢', '✿', '❄', '✪', '⯁', '🞛', '🞗'];
const AVAILABLE_LETTERS = ['A', 'R', 'N', 'L', 'F', 'M', 'C', 'O', 'G', 'T', 'V', 'X', 'B', 'P', 'Y', 'E'];

class PaletteManager {
  constructor() {
    this.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
    this.loadCustomPalette();
  }

  loadCustomPalette() {
    if (window.stateManager && window.stateManager.isVisualComfortMode()) {
      this.palette = JSON.parse(JSON.stringify(VISUAL_COMFORT_PALETTE));
      return;
    }
    try {
      const stored = localStorage.getItem('aquasort_custom_palette');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.palette = DEFAULT_PALETTE.map((def, idx) => {
            const p = parsed[idx] || {};
            return {
              ...def,
              ...p,
              letter: (p.letter && !AVAILABLE_SHAPES.includes(p.letter)) ? p.letter : (def.letter || AVAILABLE_LETTERS[idx % AVAILABLE_LETTERS.length])
            };
          });
        }
      }
    } catch (e) {
      console.warn('Error loading custom palette:', e);
    }
  }

  savePalette() {
    try {
      localStorage.setItem('aquasort_custom_palette', JSON.stringify(this.palette));
    } catch (e) {}
  }

  getPalette() {
    return this.palette;
  }

  getColor(index) {
    if (index === 'chameleon') {
      return { id: 'chameleon', name: 'Camaleón', hex: 'chameleon', shape: '★', letter: '★', pattern: null, textHex: '#ffffff' };
    }
    const idx = typeof index === 'number' ? index : parseInt(index, 10);
    if (!isNaN(idx) && idx >= 0) {
      const col = this.palette[idx % this.palette.length];
      if (col && (!col.letter || AVAILABLE_SHAPES.includes(col.letter))) {
        col.letter = AVAILABLE_LETTERS[idx % AVAILABLE_LETTERS.length] || 'A';
      }
      return col;
    }
    return this.palette[0];
  }

  getColorByHex(hex) {
    const found = this.palette.find(c => c.hex.toLowerCase() === hex?.toLowerCase());
    if (found) {
      if (!found.letter || AVAILABLE_SHAPES.includes(found.letter)) {
        found.letter = AVAILABLE_LETTERS[found.id % AVAILABLE_LETTERS.length] || 'A';
      }
      return found;
    }
    return this.palette[0];
  }

  updateColor(index, newHex, newShape, newName, newLetter) {
    if (index >= 0 && index < this.palette.length) {
      this.palette[index].hex = newHex || this.palette[index].hex;
      if (newShape) this.palette[index].shape = newShape;
      if (newName) this.palette[index].name = newName;
      if (newLetter) this.palette[index].letter = newLetter;
      this.palette[index].textHex = this.getContrastColor(this.palette[index].hex);
      this.savePalette();
    }
  }

  applyPreset(presetType = 'aaa') {
    if (presetType === 'colorblind') {
      this.palette = JSON.parse(JSON.stringify(COLORBLIND_PALETTE));
      if (window.stateManager) window.stateManager.setVisualComfortMode(false);
    } else if (presetType === 'visual_comfort') {
      this.palette = JSON.parse(JSON.stringify(VISUAL_COMFORT_PALETTE));
      if (window.stateManager) window.stateManager.setVisualComfortMode(true);
    } else {
      this.palette = JSON.parse(JSON.stringify(AAA_PALETTE));
      if (window.stateManager) window.stateManager.setVisualComfortMode(false);
    }
    this.savePalette();
    if (window.game && typeof window.game.refreshBoardVisuals === 'function') {
      window.game.refreshBoardVisuals();
    }
  }

  resetDefaults() {
    this.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
    if (window.stateManager) window.stateManager.setVisualComfortMode(false);
    this.savePalette();
  }

  getContrastColor(hexColor) {
    // Calcular luminosidad relativa para WCAG AAA (determinar si texto debe ser blanco o negro)
    const c = hexColor.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 135) ? '#000000' : '#ffffff';
  }

  // Renderizar el gestor de personalización de colores en el modal de Opciones
  renderColorSettingsUI(containerId, onColorChanged) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Barra superior de Presets de Accesibilidad WCAG AAA y Filtro Lentes
    const isVisualComfort = window.stateManager ? window.stateManager.isVisualComfortMode() : false;
    const presetsBar = document.createElement('div');
    presetsBar.className = 'flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-2xl bg-slate-900 border border-slate-700/80';
    presetsBar.innerHTML = `
      <div class="text-xs font-black text-amber-300 flex items-center gap-1.5">
        <span>🎨 Presets de Visión</span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <button id="btn-preset-aaa" class="px-2.5 py-1 text-[11px] rounded-xl font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 transition">
          ⭐ AAA
        </button>
        <button id="btn-preset-colorblind" class="px-2.5 py-1 text-[11px] rounded-xl font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 transition">
          👁️ Daltonismo
        </button>
        <button id="btn-preset-visual-comfort" class="px-2.5 py-1 text-[11px] rounded-xl font-bold ${isVisualComfort ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-md' : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40'} transition flex items-center gap-1" title="Colores diferenciados para lentes de protección con filtro amarillo/naranja">
          <span>👓</span>
          <span>Descanso Visual</span>
        </button>
        <button id="btn-preset-reset" class="px-2 py-1 text-[11px] rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition">
          Reiniciar
        </button>
      </div>
    `;
    container.appendChild(presetsBar);

    presetsBar.querySelector('#btn-preset-aaa').addEventListener('click', () => {
      this.applyPreset('aaa');
      this.renderColorSettingsUI(containerId, onColorChanged);
      if (typeof onColorChanged === 'function') onColorChanged();
    });
    presetsBar.querySelector('#btn-preset-colorblind').addEventListener('click', () => {
      this.applyPreset('colorblind');
      this.renderColorSettingsUI(containerId, onColorChanged);
      if (typeof onColorChanged === 'function') onColorChanged();
    });
    presetsBar.querySelector('#btn-preset-visual-comfort').addEventListener('click', () => {
      this.applyPreset('visual_comfort');
      this.renderColorSettingsUI(containerId, onColorChanged);
      if (typeof onColorChanged === 'function') onColorChanged();
    });
    presetsBar.querySelector('#btn-preset-reset').addEventListener('click', () => {
      this.resetDefaults();
      this.renderColorSettingsUI(containerId, onColorChanged);
      if (typeof onColorChanged === 'function') onColorChanged();
    });

    const colorsList = document.createElement('div');
    colorsList.className = 'space-y-2';
    container.appendChild(colorsList);

    const isLetters = window.stateManager ? window.stateManager.isAccessibilityLettersMode() : false;

    this.palette.forEach((col, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 gap-3';
      const displayChar = isLetters ? (col.letter || col.shape) : col.shape;

      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div id="preview-col-${idx}" class="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black shadow-md ${col.pattern}"
               style="background-color: ${col.hex}; color: ${col.textHex};">
            <span class="text-sm font-black">${displayChar}</span>
          </div>
          <div>
            <div class="text-xs font-bold text-white">${col.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">Ranura #${idx + 1} • Letra: <strong class="text-amber-300">${col.letter || col.shape}</strong></div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="color" id="input-hex-${idx}" value="${col.hex}"
                 class="w-7 h-7 rounded-lg cursor-pointer border border-slate-600 bg-transparent" title="Cambiar color">
          <select id="select-shape-${idx}" class="bg-slate-900 text-xs text-sky-200 border border-slate-700 rounded-lg p-1 focus:outline-none" title="Cambiar símbolo">
            ${AVAILABLE_SHAPES.map(s => `<option value="${s}" ${s === col.shape ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      `;

      const hexInput = row.querySelector(`#input-hex-${idx}`);
      const shapeSelect = row.querySelector(`#select-shape-${idx}`);
      const preview = row.querySelector(`#preview-col-${idx}`);

      const applyChange = () => {
        const newHex = hexInput.value;
        const newShape = shapeSelect.value;
        this.updateColor(idx, newHex, newShape);

        preview.style.backgroundColor = newHex;
        preview.style.color = this.palette[idx].textHex;
        preview.querySelector('span').textContent = newShape;

        if (typeof onColorChanged === 'function') {
          onColorChanged();
        }
      };

      hexInput.addEventListener('input', applyChange);
      shapeSelect.addEventListener('change', applyChange);

      colorsList.appendChild(row);
    });
  }
}

// Instancia global
window.paletteManager = new PaletteManager();
