/* ==========================================================================
   AQUASORT MASTER DELUXE - LEVEL GENERATOR (100 NIVELES)
   Generación determinista y progresión de mecánicas
   ========================================================================== */

class LevelGenerator {
  static generate(levelNum) {
    const level = Math.max(1, Math.min(100, levelNum));

    // Progresión de cantidad de colores
    let colorCount = 3 + Math.floor((level - 1) / 10);
    colorCount = Math.min(colorCount, 8); // Máximo 8 colores simultáneos
    const emptyCount = 2;
    const capacity = 4;

    // Etiquetas y mecánicas activas
    const hasMystery = level >= 5;
    const hasGiant = level >= 10;
    const hasLock = level >= 15;
    const hasNarrow = level >= 20;
    const hasChameleon = level >= 25;

    let mechanicTag = 'Básico';
    if (hasChameleon) mechanicTag = 'Camaleón + Candado + Misterio';
    else if (hasNarrow) mechanicTag = 'Tubo Estrecho (1x1)';
    else if (hasLock) mechanicTag = 'Candado con Llave';
    else if (hasGiant) mechanicTag = 'Misterio + Tubo Gigante';
    else if (hasMystery) mechanicTag = "Misterio '?'";

    // Obtener paleta actual (personalizable por el usuario)
    const currentPalette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = currentPalette.slice(0, colorCount);

    let tubes = [];

    // 1. Crear tubos llenos uniformes
    for (let i = 0; i < colorCount; i++) {
      const col = activeColors[i];
      const isThisGiant = (hasGiant && i === 0);
      const cap = isThisGiant ? 6 : capacity;

      let tubeLiquids = [];
      for (let k = 0; k < cap; k++) {
        tubeLiquids.push({
          colorIndex: col.id,
          color: col.hex,
          name: col.name,
          shape: col.shape,
          pattern: col.pattern,
          textHex: col.textHex,
          isMystery: (hasMystery && k < cap - 1),
          isChameleon: (hasChameleon && i === 1 && k === 1)
        });
      }

      tubes.push({
        id: i,
        capacity: cap,
        liquids: tubeLiquids,
        isLocked: false,
        keyColor: null,
        isNarrow: (hasNarrow && i === 2)
      });
    }

    // 2. Agregar frascos vacíos de trabajo
    for (let i = 0; i < emptyCount; i++) {
      tubes.push({
        id: colorCount + i,
        capacity: capacity,
        liquids: [],
        isLocked: false,
        keyColor: null,
        isNarrow: false
      });
    }

    // 3. Aplicar candado si corresponde
    if (hasLock && tubes.length > 0) {
      const lastTube = tubes[tubes.length - 1];
      lastTube.isLocked = true;
      lastTube.keyColor = activeColors[0].hex;
      lastTube.keyColorName = activeColors[0].name;
    }

    // 4. Mezclar deterministamente según la semilla del nivel
    this.shuffleDeterministically(tubes, level);

    // 5. Cálculo de movimientos óptimos estimados para estrellas
    const optimalMoves = colorCount * 3 + Math.floor(level / 4) + (hasMystery ? 2 : 0) + (hasLock ? 2 : 0);

    return {
      level,
      tubes,
      colorCount,
      mechanicTag,
      optimalMoves,
      hasMystery,
      hasGiant,
      hasLock,
      hasNarrow,
      hasChameleon
    };
  }

  static shuffleDeterministically(tubes, seed) {
    let s = (seed * 1103515245 + 12345) & 0x7fffffff;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const steps = 30 + (seed % 15);
    for (let step = 0; step < steps; step++) {
      const fromIdx = Math.floor(rnd() * (tubes.length - 2));
      const toIdx = Math.floor(rnd() * tubes.length);

      if (fromIdx !== toIdx) {
        const fromT = tubes[fromIdx];
        const toT = tubes[toIdx];

        if (fromT.liquids.length > 1 && toT.liquids.length < toT.capacity && !toT.isLocked) {
          const popped = fromT.liquids.pop();
          toT.liquids.push(popped);
        }
      }
    }
  }
}

window.LevelGenerator = LevelGenerator;
