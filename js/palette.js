/* ==========================================================================
   AQUASORT MASTER DELUXE - PALETTE & COLOR CUSTOMIZATION
   Permite personalizar todos los colores en opciones para baja visión y gusto
   ========================================================================== */

const DEFAULT_PALETTE = [
  { id: 0, name: 'Rojo Carmesí', hex: '#ef4444', shape: '●', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 1, name: 'Azul Océano', hex: '#3b82f6', shape: '▲', pattern: 'pattern-dots', textHex: '#ffffff' },
  { id: 2, name: 'Verde Esmeralda', hex: '#10b981', shape: '■', pattern: 'pattern-grid', textHex: '#ffffff' },
  { id: 3, name: 'Amarillo Sol', hex: '#eab308', shape: '★', pattern: 'pattern-diagonal-left', textHex: '#000000' },
  { id: 4, name: 'Morado Místico', hex: '#a855f7', shape: '◆', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 5, name: 'Naranja Fuego', hex: '#f97316', shape: '✚', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 6, name: 'Rosa Neón', hex: '#ec4899', shape: '♥', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 7, name: 'Cian Glaciar', hex: '#06b6d4', shape: '✦', pattern: 'pattern-zigzag', textHex: '#000000' },
  { id: 8, name: 'Marrón Tierra', hex: '#854d0e', shape: '⬟', pattern: 'pattern-checker', textHex: '#ffffff' },
  { id: 9, name: 'Lima Radioactiva', hex: '#84cc16', shape: '⬢', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 10, name: 'Violeta Profundo', hex: '#6366f1', shape: '✿', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 11, name: 'Ámbar Alquímico', hex: '#f59e0b', shape: '❄', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 12, name: 'Turquesa Mar', hex: '#14b8a6', shape: '✪', pattern: 'pattern-horizontal', textHex: '#000000' },
  { id: 13, name: 'Rubí Carmín', hex: '#be123c', shape: '⯁', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 14, name: 'Coral Solar', hex: '#fb7185', shape: '🞛', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 15, name: 'Zafiro Real', hex: '#1d4ed8', shape: '🞗', pattern: 'pattern-zigzag', textHex: '#ffffff' },
  { id: 16, name: 'Jade Imperial', hex: '#047857', shape: '🞖', pattern: 'pattern-checker', textHex: '#ffffff' },
  { id: 17, name: 'Amatista Noble', hex: '#7e22ce', shape: '🞙', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 18, name: 'Bronce Antiguo', hex: '#a16207', shape: '🞘', pattern: 'pattern-dots', textHex: '#ffffff' },
  { id: 19, name: 'Menta Fría', hex: '#2dd4bf', shape: '🞚', pattern: 'pattern-grid', textHex: '#000000' },
  { id: 20, name: 'Fucsia Astral', hex: '#d946ef', shape: '🞜', pattern: 'pattern-horizontal', textHex: '#ffffff' },
  { id: 21, name: 'Azul Cobalto', hex: '#2563eb', shape: '🞝', pattern: 'pattern-vertical', textHex: '#ffffff' },
  { id: 22, name: 'Oliva Silvestre', hex: '#65a30d', shape: '🞞', pattern: 'pattern-cross', textHex: '#ffffff' },
  { id: 23, name: 'Cobre Alquímico', hex: '#b45309', shape: '🞟', pattern: 'pattern-zigzag', textHex: '#ffffff' },
  { id: 24, name: 'Índigo Astral', hex: '#4f46e5', shape: '🞠', pattern: 'pattern-checker', textHex: '#ffffff' },
  { id: 25, name: 'Orquídea Real', hex: '#c026d3', shape: '🞡', pattern: 'pattern-stripes', textHex: '#ffffff' },
  { id: 26, name: 'Esmeralda Clara', hex: '#34d399', shape: '🞢', pattern: 'pattern-dots', textHex: '#000000' },
  { id: 27, name: 'Púrpura Nocturno', hex: '#581c87', shape: '🞣', pattern: 'pattern-grid', textHex: '#ffffff' }
];

const AVAILABLE_SHAPES = ['●', '▲', '■', '★', '◆', '✚', '♥', '✦', '⬟', '⬢', '✿', '❄', '✪', '⯁', '🞛', '🞗', '🞖', '🞙', '🞘', '🞚', '🞜', '🞝', '🞞', '🞟', '🞠', '🞡', '🞢', '🞣'];

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

  resetDefaults() {
    this.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
    this.savePalette();
  }

  getContrastColor(hexColor) {
    // Calcular luminosidad relativa para determinar si el texto debe ser blanco o negro
    const c = hexColor.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 140) ? '#000000' : '#ffffff';
  }

  // Renderizar el gestor de personalización de colores en el modal de Opciones
  renderColorSettingsUI(containerId, onColorChanged) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    this.palette.forEach((col, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 gap-3';

      row.innerHTML = `
        <div class="flex items-center gap-3">
          <!-- Muestra de color con patrón y forma -->
          <div id="preview-col-${idx}" class="w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md ${col.pattern}"
               style="background-color: ${col.hex}; color: ${col.textHex};">
            <span class="text-base">${col.shape}</span>
          </div>
          <div>
            <div class="text-xs font-bold text-white">${col.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">Slot #${idx + 1}</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Selector de color -->
          <input type="color" id="input-hex-${idx}" value="${col.hex}"
                 class="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent" title="Cambiar color">

          <!-- Selector de forma / símbolo para accesibilidad -->
          <select id="select-shape-${idx}" class="bg-slate-900 text-xs text-sky-200 border border-slate-700 rounded-lg p-1.5 focus:outline-none">
            ${AVAILABLE_SHAPES.map(s => `<option value="${s}" ${s === col.shape ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      `;

      // Eventos de cambio en tiempo real
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

      container.appendChild(row);
    });
  }
}

// Instancia global
window.paletteManager = new PaletteManager();
