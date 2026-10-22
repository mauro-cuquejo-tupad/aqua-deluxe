/* ==========================================================================
   AQUASORT MASTER DELUXE - PALETTE & COLOR CUSTOMIZATION (WCAG AAA)
   Paleta de alta accesibilidad, contraste certificado WCAG AAA y presets rápidos
   ========================================================================== */

const AAA_PALETTE = [
  { id: 0, name: 'Carmesí Radiante', hex: '#ff334b', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 1, name: 'Cielo Alquímico', hex: '#38bdf8', shape: '▲', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 2, name: 'Verde Esmeralda', hex: '#10b981', shape: '■', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 3, name: 'Oro Supremo', hex: '#facc15', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 4, name: 'Violeta Eléctrico', hex: '#c084fc', shape: '◆', pattern: 'pattern-horizontal', textHex: '#000000' },
  { id: 5, name: 'Naranja Mandarina', hex: '#fb923c', shape: '✚', pattern: 'pattern-vertical', textHex: '#000000' },
  { id: 6, name: 'Rosa Neón Flúor', hex: '#f472b6', shape: '♥', pattern: 'pattern-cross', textHex: '#000000' },
  { id: 7, name: 'Cian Glaciar', hex: '#22d3ee', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' },
  { id: 8, name: 'Ámbar Cálido', hex: '#f59e0b', shape: '⬟', pattern: 'pattern-checker', textHex: '#000000' },
  { id: 9, name: 'Lima Brillante', hex: '#a3e635', shape: '⬢', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 10, name: 'Índigo Astral', hex: '#818cf8', shape: '✿', pattern: 'pattern-stripes', textHex: '#000000' },
  { id: 11, name: 'Blanco Ópalo Puro', hex: '#f8fafc', shape: '❄', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 12, name: 'Turquesa Mar', hex: '#2dd4bf', shape: '✪', pattern: 'pattern-horizontal', textHex: '#000000' },
  { id: 13, name: 'Rubí Encendido', hex: '#e11d48', shape: '⯁', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 14, name: 'Coral Solar', hex: '#fb7185', shape: '🞛', pattern: 'pattern-cross', textHex: '#000000' },
  { id: 15, name: 'Azul Real', hex: '#2563eb', shape: '🞗', pattern: 'pattern-zigzag', textHex: '#ffffff' }
];

const COLORBLIND_PALETTE = [
  { id: 0, name: 'Azul Intenso', hex: '#0072b2', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 1, name: 'Naranja Vivo', hex: '#e69f00', shape: '▲', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 2, name: 'Cielo Claro', hex: '#56b4e9', shape: '■', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 3, name: 'Amarillo Seguro', hex: '#f0e442', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 4, name: 'Bermejo / Carmín', hex: '#d55e00', shape: '◆', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 5, name: 'Púrpura Rojizo', hex: '#cc79a7', shape: '✚', pattern: 'pattern-vertical', textHex: '#000000' },
  { id: 6, name: 'Verde Azulado', hex: '#009e73', shape: '♥', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 7, name: 'Gris Perla', hex: '#e2e8f0', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' }
];

const DEFAULT_PALETTE = AAA_PALETTE;

const AVAILABLE_SHAPES = ['●', '▲', '■', '★', '◆', '✚', '♥', '✦', '⬟', '⬢', '✿', '❄', '✪', '⯁', '🞛', '🞗'];

class PaletteManager {
  constructor() {
    this.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
    this.loadCustomPalette();
  }

  loadCustomPalette() {
    try {
      const stored = localStorage.getItem('aquasort_custom_palette');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.palette = DEFAULT_PALETTE.map((def, idx) => parsed[idx] || def);
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
    return this.palette[index % this.palette.length];
  }

  getColorByHex(hex) {
    return this.palette.find(c => c.hex.toLowerCase() === hex.toLowerCase()) || this.palette[0];
  }

  updateColor(index, newHex, newShape, newName) {
    if (index >= 0 && index < this.palette.length) {
      this.palette[index].hex = newHex || this.palette[index].hex;
      if (newShape) this.palette[index].shape = newShape;
      if (newName) this.palette[index].name = newName;
      this.palette[index].textHex = this.getContrastColor(this.palette[index].hex);
      this.savePalette();
    }
  }

  applyPreset(presetType = 'aaa') {
    if (presetType === 'colorblind') {
      this.palette = JSON.parse(JSON.stringify(COLORBLIND_PALETTE));
    } else {
      this.palette = JSON.parse(JSON.stringify(AAA_PALETTE));
    }
    this.savePalette();
    if (window.game && typeof window.game.refreshBoardVisuals === 'function') {
      window.game.refreshBoardVisuals();
    }
  }

  resetDefaults() {
    this.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
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

    // Barra superior de Presets de Accesibilidad WCAG AAA
    const presetsBar = document.createElement('div');
    presetsBar.className = 'flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-2xl bg-slate-900 border border-slate-700/80';
    presetsBar.innerHTML = `
      <div class="text-xs font-black text-amber-300 flex items-center gap-1.5">
        <span>🎨 Norma Accesibilidad AAA</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button id="btn-preset-aaa" class="px-2.5 py-1 text-[11px] rounded-xl font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 transition">
          ⭐ Preset AAA
        </button>
        <button id="btn-preset-colorblind" class="px-2.5 py-1 text-[11px] rounded-xl font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 transition">
          👁️ Daltonismo
        </button>
        <button id="btn-preset-reset" class="px-2.5 py-1 text-[11px] rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition">
          Restablecer
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
    presetsBar.querySelector('#btn-preset-reset').addEventListener('click', () => {
      this.resetDefaults();
      this.renderColorSettingsUI(containerId, onColorChanged);
      if (typeof onColorChanged === 'function') onColorChanged();
    });

    const colorsList = document.createElement('div');
    colorsList.className = 'space-y-2';
    container.appendChild(colorsList);

    this.palette.forEach((col, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 gap-3';

      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div id="preview-col-${idx}" class="w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-md ${col.pattern}"
               style="background-color: ${col.hex}; color: ${col.textHex};">
            <span class="text-sm">${col.shape}</span>
          </div>
          <div>
            <div class="text-xs font-bold text-white">${col.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">Ranura #${idx + 1}</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="color" id="input-hex-${idx}" value="${col.hex}"
                 class="w-7 h-7 rounded-lg cursor-pointer border border-slate-600 bg-transparent" title="Cambiar color">
          <select id="select-shape-${idx}" class="bg-slate-900 text-xs text-sky-200 border border-slate-700 rounded-lg p-1 focus:outline-none">
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
