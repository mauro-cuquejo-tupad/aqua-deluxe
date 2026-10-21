/* ==========================================================================
   AQUASORT MASTER DELUXE - HONOR MASTERY CHALLENGES & SECTION SYSTEM
   10 Secciones temáticas espaciadas cada 10 niveles, Medallas de Honor,
   3 vidas por desafío, límite de 5:00, movimientos contados y sin deshacer.
   ========================================================================== */

const SECTIONS_CONFIG = [
  {
    id: 1,
    name: 'Fundamentos Alquímicos',
    levelsRange: [1, 10],
    primaryMechanicId: 'basic',
    mechanicTitle: 'Reglas Básicas',
    icon: 'droplets',
    honorChallenge: {
      title: 'El Crisol de los Fundamentos',
      desc: 'Demuestra tu dominio absoluto de la clasificación elemental pura con frascos justos y sin botellas auxiliares.',
      colorCount: 5,
      capacity: 4,
      emptyCount: 1, // Solo 1 frasco vacío para mayor desafío táctico
      maxMoves: 20,
      timeLimitSecs: 300, // 5 minutos exactos
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: false,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 2,
    name: 'El Velo Arcano',
    levelsRange: [11, 20],
    primaryMechanicId: 'mystery',
    mechanicTitle: "Líquidos Misterio '?'",
    icon: 'help-circle',
    honorChallenge: {
      title: 'La Noche de las Sombras Arcanas',
      desc: 'Todas las capas inferiores están cubiertas por la niebla del misterio. Descubre y organiza los fluidos antes de que se agote el tiempo.',
      colorCount: 6,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 26,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: true,
      hasGiant: false,
      hasLock: false,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 3,
    name: 'El Matraz Titánico',
    levelsRange: [21, 30],
    primaryMechanicId: 'giant',
    mechanicTitle: 'Frascos Gigantes (Capacidad 6)',
    icon: 'maximize-2',
    honorChallenge: {
      title: 'La Sobrecarga Titánica',
      desc: 'Dos frascos gigantes de 6 unidades junto a frascos normales de 4. Planifica con precisión el intercambio de volúmenes asimétricos.',
      colorCount: 6,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 28,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: true,
      hasLock: false,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 4,
    name: 'Los Sellos Rúnicos',
    levelsRange: [31, 40],
    primaryMechanicId: 'lock',
    mechanicTitle: 'Candado con Llave Oculta',
    icon: 'lock',
    honorChallenge: {
      title: 'La Bóveda de los Dos Candados',
      desc: 'Dos frascos sellados con candados mágicos cuyas llaves están sepultadas bajo capas de otros elementos. Libéralas metódicamente.',
      colorCount: 6,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 30,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: true,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 5,
    name: 'La Alquimia de Precisión',
    levelsRange: [41, 50],
    primaryMechanicId: 'narrow',
    mechanicTitle: 'Tubo Estrecho (1x1)',
    icon: 'git-commit',
    honorChallenge: {
      title: 'La Aguja del Alquimista',
      desc: 'Utiliza el tubo de precisión (1x1) como canal de un solo cuarto para transferir fluidos sin provocar una reacción en cadena.',
      colorCount: 6,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 32,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: false,
      hasNarrow: true,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 6,
    name: 'La Roca Filosofal',
    levelsRange: [51, 60],
    primaryMechanicId: 'glued',
    mechanicTitle: 'Frasco Inamovible (Solo Recibe)',
    icon: 'anchor',
    honorChallenge: {
      title: 'El Monolito Inamovible',
      desc: 'El frasco incrustado en la roca contiene 1 cuarto inicial y jamás puede vaciarse. Debe convertirse en tu recipiente definitivo de ese color.',
      colorCount: 6,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 30,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: false,
      hasNarrow: false,
      hasGlued: true,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 7,
    name: 'La Esencia Camaleónica',
    levelsRange: [61, 70],
    primaryMechanicId: 'chameleon',
    mechanicTitle: 'Líquido Camaleón Multicolor',
    icon: 'disc',
    honorChallenge: {
      title: 'La Danza del Camaleón',
      desc: 'El fluido comodín se desplaza en solitario adaptándose al color destino. Úsalo como puente maestro para desarmar atascos.',
      colorCount: 7,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 32,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: false,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: true,
      hasFragile: false
    }
  },
  {
    id: 8,
    name: 'El Cristal de Afinidad',
    levelsRange: [71, 80],
    primaryMechanicId: 'fragile',
    mechanicTitle: 'Cristal de Afinidad (3 Usos)',
    icon: 'shield-alert',
    honorChallenge: {
      title: 'El Santuario de Afinidad',
      desc: 'Un frasco vacío con afinidad elemental específica. Admite otros colores en emergencia, pero al 3º vertido incompatible estalla.',
      colorCount: 7,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 34,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: false,
      hasGiant: false,
      hasLock: false,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: true
    }
  },
  {
    id: 9,
    name: 'Conjunción de Elementos',
    levelsRange: [81, 90],
    primaryMechanicId: 'hybrid',
    mechanicTitle: 'Fusión Alquímica Híbrida',
    icon: 'layers',
    honorChallenge: {
      title: 'La Conjunción Astral',
      desc: 'Fusión de Candado Rúnico, Frasco Gigante y Líquidos Misteriosos en un único tablero de alta complejidad.',
      colorCount: 7,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 36,
      timeLimitSecs: 300,
      coinsReward: 50,
      hasMystery: true,
      hasGiant: true,
      hasLock: true,
      hasNarrow: false,
      hasGlued: false,
      hasChameleon: false,
      hasFragile: false
    }
  },
  {
    id: 10,
    name: 'La Gran Obra Magna',
    levelsRange: [91, 100],
    primaryMechanicId: 'magna',
    mechanicTitle: 'La Gran Obra Alquímica',
    icon: 'award',
    honorChallenge: {
      title: 'El Crisol del Archialquimista Supremo',
      desc: 'La prueba suprema del juego. Integra Camaleón, Cristal Frágil, Candado y Precisión 1x1. Solo los verdaderos Maestros obtienen la Medalla Suprema.',
      colorCount: 8,
      capacity: 4,
      emptyCount: 2,
      maxMoves: 40,
      timeLimitSecs: 300,
      coinsReward: 100,
      hasMystery: true,
      hasGiant: true,
      hasLock: true,
      hasNarrow: true,
      hasGlued: false,
      hasChameleon: true,
      hasFragile: true
    }
  }
];

class HonorManager {
  static getSections() {
    return SECTIONS_CONFIG;
  }

  static getSection(sectionId) {
    return SECTIONS_CONFIG.find(s => s.id === sectionId) || SECTIONS_CONFIG[0];
  }

  static getSectionForLevel(level) {
    const lvl = Math.max(1, Math.min(100, level));
    return SECTIONS_CONFIG.find(s => lvl >= s.levelsRange[0] && lvl <= s.levelsRange[1]) || SECTIONS_CONFIG[0];
  }

  /**
   * Comprueba si la sección tiene desbloqueado el Desafío de Honor.
   * Regla: Todos los niveles de la sección deben tener 3 estrellas Y todos sus desafíos completados.
   */
  static checkSectionUnlockStatus(sectionId, bypass = false) {
    const sec = this.getSection(sectionId);
    if (!sec) return { unlocked: false, reason: 'Sección no encontrada' };

    if (bypass || window.__debugUnlockHonor) {
      return {
        unlocked: true,
        totalLevels: 10,
        missingStars: [],
        missingChallenges: [],
        levelsCompletedWith3Stars: 10,
        levelsCompletedWithAllChallenges: 10
      };
    }

    const [startLvl, endLvl] = sec.levelsRange;
    const missingStars = [];
    const missingChallenges = [];

    for (let lvl = startLvl; lvl <= endLvl; lvl++) {
      // 1. Verificar 3 estrellas
      const rec = window.leaderboardManager ? window.leaderboardManager.getRecord(lvl) : null;
      if (!rec || rec.stars < 3) {
        missingStars.push(lvl);
      }

      // 2. Verificar desafíos completados
      const chalRecord = window.stateManager ? window.stateManager.getLevelChallenges(lvl) : null;
      if (!chalRecord || chalRecord.completedCount < chalRecord.totalCount) {
        missingChallenges.push(lvl);
      }
    }

    const isUnlocked = missingStars.length === 0 && missingChallenges.length === 0;

    return {
      unlocked: isUnlocked,
      totalLevels: endLvl - startLvl + 1,
      missingStars,
      missingChallenges,
      levelsCompletedWith3Stars: (endLvl - startLvl + 1) - missingStars.length,
      levelsCompletedWithAllChallenges: (endLvl - startLvl + 1) - missingChallenges.length
    };
  }

  /**
   * Obtiene la fecha de hoy en formato AAAA-MM-DD para control de reintentos diarios.
   */
  static getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Genera el objeto de nivel para el Desafío de Honor de una sección.
   */
  static generateHonorLevel(sectionId, seedVariation = 0) {
    const sec = this.getSection(sectionId);
    const cfg = sec.honorChallenge;

    const palette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = palette.slice(0, cfg.colorCount);

    let tubes = [];

    // 1. Frascos de colores
    for (let i = 0; i < cfg.colorCount; i++) {
      const col = activeColors[i];
      const isGiant = (cfg.hasGiant && (i === 0 || i === 1));
      const cap = isGiant ? 6 : cfg.capacity;

      let tubeLiquids = [];
      for (let k = 0; k < cap; k++) {
        const isCham = (cfg.hasChameleon && i === 1 && k === 1);
        tubeLiquids.push({
          colorIndex: isCham ? 'chameleon' : col.id,
          color: isCham ? 'chameleon' : col.hex,
          name: isCham ? 'Camaleón' : col.name,
          shape: isCham ? '★' : col.shape,
          pattern: isCham ? null : col.pattern,
          textHex: isCham ? '#ffffff' : col.textHex,
          isMystery: (cfg.hasMystery && k < cap - 1 && !isCham),
          isChameleon: isCham
        });
      }

      tubes.push({
        id: i,
        capacity: cap,
        liquids: tubeLiquids,
        isLocked: false,
        keyColor: null,
        isNarrow: (cfg.hasNarrow && i === 2),
        isGlued: false,
        isFragile: false,
        isAffinity: false,
        isSuperFragile: false,
        cracks: 0,
        maxCracks: null,
        isBroken: false,
        allowedColors: [],
        allowedColorNames: []
      });
    }

    // 2. Frascos vacíos
    for (let e = 0; e < cfg.emptyCount; e++) {
      const isGlued = (cfg.hasGlued && e === 0);
      const isAffinity = (cfg.hasFragile && (isGlued ? e === 1 : e === 0));
      let initialGlued = [];
      if (isGlued) {
        const validSources = tubes.filter(t => !t.isNarrow && t.capacity === 4 && t.liquids.length > 1);
        if (validSources.length > 0) {
          const sample = validSources[0].liquids.pop();
          initialGlued.push({
            colorIndex: sample.colorIndex,
            color: sample.color,
            name: sample.name,
            shape: sample.shape,
            pattern: sample.pattern,
            textHex: sample.textHex,
            isMystery: false,
            isChameleon: false
          });
        }
      }

      let allowedColors = [];
      let allowedColorNames = [];
      if (isAffinity && activeColors.length >= 2) {
        allowedColors = [activeColors[0].hex, activeColors[1].hex];
        allowedColorNames = [activeColors[0].name, activeColors[1].name];
      }

      const tubeObj = {
        id: 0,
        capacity: cfg.capacity,
        liquids: initialGlued,
        isLocked: false,
        keyColor: null,
        isNarrow: false,
        isGlued: isGlued,
        isFragile: isAffinity,
        isAffinity: isAffinity,
        isSuperFragile: false,
        maxCracks: isAffinity ? 3 : null,
        cracks: 0,
        isBroken: false,
        allowedColors: allowedColors,
        allowedColorNames: allowedColorNames
      };

      if (isGlued) {
        tubes.unshift(tubeObj);
      } else {
        tubes.push(tubeObj);
      }
    }

    // Reasignar identificadores secuenciales 0..tubes.length-1
    tubes.forEach((t, idx) => {
      t.id = idx;
    });

    // 3. Mezcla determinista con semilla especial de honor
    const honorSeed = sectionId * 98765 + seedVariation * 1337 + 4321;
    if (window.LevelGenerator) {
      window.LevelGenerator.shuffleDeterministically(tubes, honorSeed);
    }

    // 4. Bloqueo de candado si aplica
    if (cfg.hasLock && tubes.length > 0) {
      const lockCand = tubes.filter(t => !t.isGlued && !t.isNarrow && t.liquids.length >= 2);
      if (lockCand.length > 0) {
        const lockTube = lockCand[0];
        lockTube.isLocked = true;
        const keyColorObj = activeColors[2 % activeColors.length];
        lockTube.keyColor = keyColorObj.hex;
        lockTube.keyColorName = keyColorObj.name;

        // Asegurar que la llave esté en otro tubo accesible
        const sourceCand = tubes.filter(t => !t.isLocked && !t.isGlued && t.liquids.length >= 2);
        if (sourceCand.length > 0) {
          const srcTube = sourceCand[0];
          const pos = Math.max(0, srcTube.liquids.length - 2); // enterrada 1 capa
          srcTube.liquids[pos] = {
            colorIndex: keyColorObj.id,
            color: keyColorObj.hex,
            name: keyColorObj.name,
            shape: keyColorObj.shape,
            pattern: keyColorObj.pattern,
            textHex: keyColorObj.textHex,
            isMystery: false,
            isChameleon: false
          };
        }
      }
    }

    return {
      isHonorChallenge: true,
      sectionId: sectionId,
      sectionName: sec.name,
      level: `Honor ${sectionId}`,
      title: cfg.title,
      desc: cfg.desc,
      tubes: tubes,
      colorCount: cfg.colorCount,
      mechanicTag: `🏅 Desafío de Honor: ${sec.name}`,
      primaryMechanicId: sec.primaryMechanicId,
      optimalMoves: cfg.maxMoves - 4,
      maxMoves: cfg.maxMoves,
      timeLimitSecs: cfg.timeLimitSecs,
      coinsReward: cfg.coinsReward,
      hasMystery: cfg.hasMystery,
      hasGiant: cfg.hasGiant,
      hasLock: cfg.hasLock,
      hasNarrow: cfg.hasNarrow,
      hasGlued: cfg.hasGlued,
      hasChameleon: cfg.hasChameleon,
      hasFragile: cfg.hasFragile
    };
  }
}

window.HonorManager = HonorManager;
