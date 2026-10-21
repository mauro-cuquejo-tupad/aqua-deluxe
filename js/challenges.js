/* ==========================================================================
   AQUASORT MASTER DELUXE - LEVEL CHALLENGES SYSTEM (DESAFÍOS DE NIVEL)
   Generador determinista de 1 a 3 desafíos por nivel, seguimiento en vivo,
   validación de victoria, recompensas en monedas y multiplicadores alquímicos.
   ========================================================================== */

class ChallengeManager {
  /**
   * Genera entre 1 y 3 desafíos deterministas para el nivel actual.
   * @param {Object} levelData Datos del nivel (nivel, frascos, colores, movimientos óptimos)
   * @returns {Array<Object>} Lista de desafíos configurados
   */
  static getChallengesForLevel(levelData) {
    if (!levelData) return [];
    const level = levelData.level || 1;
    const tubes = levelData.tubes || [];
    const colorCount = levelData.colorCount || 3;
    const optimalMoves = levelData.optimalMoves || 10;

    // Cantidad de desafíos: 1 para nivel 1, 2 para niveles 2 a 4, 2 o 3 para niveles 5+
    let challengeCount = 2;
    if (level === 1) {
      challengeCount = 1;
    } else if (level >= 5) {
      // Alternar determinísticamente entre 2 y 3 desafíos
      challengeCount = (level % 2 === 0 || level % 3 === 0) ? 3 : 2;
    }

    // Obtener paleta de colores activa
    const palette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = palette.slice(0, colorCount);

    // Generador de números pseudoaleatorios determinista por nivel
    let seed = level * 7919 + 54321;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Identificar frascos estándar aptos para el desafío de color específico
    // (capacidad 4, ni estrecho 1x1, ni pegado/roca, ni candado)
    const validTubesForColor = [];
    tubes.forEach((t, idx) => {
      if (t.capacity === 4 && !t.isNarrow && !t.isGlued && !t.isLocked) {
        validTubesForColor.push(idx);
      }
    });

    const candidates = [];

    // ------------------------------------------------------------------------
    // TIPO 1: Límite de Movimientos ("Terminar en menos de X movimientos")
    // ------------------------------------------------------------------------
    const maxMoves = Math.round(optimalMoves * 1.3) + (level <= 3 ? 2 : 1);
    candidates.push({
      type: 'moves_limit',
      id: `moves_${maxMoves}`,
      icon: 'zap',
      title: `Completar en ≤ ${maxMoves} movimientos`,
      shortTitle: `≤ ${maxMoves} movs`,
      coins: 3,
      targetValue: maxMoves,
      check: (game) => game.moves <= maxMoves,
      getCurrentText: (game) => `${game.moves}/${maxMoves} movs`,
      isFailedLive: (game) => game.moves > maxMoves
    });

    // ------------------------------------------------------------------------
    // TIPO 2: Límite de Tiempo ("Terminar en menos de X tiempo")
    // ------------------------------------------------------------------------
    const timeLimitSecs = Math.max(30, colorCount * 14 + Math.min(30, level * 2));
    candidates.push({
      type: 'time_limit',
      id: `time_${timeLimitSecs}`,
      icon: 'clock',
      title: `Terminar en menos de ${timeLimitSecs}s`,
      shortTitle: `< ${timeLimitSecs}s`,
      coins: 4,
      targetValue: timeLimitSecs,
      check: (game, elapsedSecs) => (elapsedSecs || 0) <= timeLimitSecs,
      getCurrentText: (game, elapsedSecs) => `${elapsedSecs || 0}s / ${timeLimitSecs}s`,
      isFailedLive: (game, elapsedSecs) => (elapsedSecs || 0) > timeLimitSecs
    });

    // ------------------------------------------------------------------------
    // TIPO 3: Color en Tubo Específico ("Llenar con [color] el [X] tubo")
    // ------------------------------------------------------------------------
    if (validTubesForColor.length > 0 && activeColors.length > 0) {
      // Elegir determinísticamente un tubo y un color
      const tubeIndexInValid = Math.floor(rnd() * validTubesForColor.length);
      const chosenTubeIdx = validTubesForColor[tubeIndexInValid];
      const colorIndex = Math.floor(rnd() * activeColors.length);
      const chosenColor = activeColors[colorIndex];
      const humanPos = chosenTubeIdx + 1; // 1-indexed para el usuario: "1º", "2º", "3º"...

      candidates.push({
        type: 'specific_tube_color',
        id: `tube_${chosenTubeIdx}_${chosenColor.id}`,
        icon: 'flask-conical',
        title: `Llenar el ${humanPos}º tubo con ${chosenColor.name}`,
        shortTitle: `Tubo ${humanPos}: ${chosenColor.name}`,
        colorHex: chosenColor.hex,
        colorName: chosenColor.name,
        targetTubeIdx: chosenTubeIdx,
        coins: 4,
        check: (game) => {
          const t = game.tubes[chosenTubeIdx];
          if (!t || t.liquids.length !== t.capacity) return false;
          return t.liquids.every(l => l.color === chosenColor.hex);
        },
        getCurrentText: (game) => {
          const t = game.tubes[chosenTubeIdx];
          const matches = t ? t.liquids.filter(l => l.color === chosenColor.hex).length : 0;
          return `${matches}/${t ? t.capacity : 4}`;
        },
        isFailedLive: () => false
      });
    }

    // ------------------------------------------------------------------------
    // TIPO 4: Llenar Tubos Pares ("Llenar tubos pares")
    // ------------------------------------------------------------------------
    // Índices pares en 1-based: tubos 2, 4, 6... (índices 0-based: 1, 3, 5...)
    const evenTubeIndices = tubes.map((_, i) => i).filter(i => (i + 1) % 2 === 0);
    if (evenTubeIndices.length >= 1 && colorCount >= evenTubeIndices.length) {
      const evenStr = evenTubeIndices.map(i => `${i + 1}º`).join(', ');
      candidates.push({
        type: 'even_tubes_filled',
        id: 'even_tubes',
        icon: 'hash',
        title: `Llenar todos los tubos pares (${evenStr})`,
        shortTitle: `Tubos pares llenos`,
        coins: 5,
        check: (game) => {
          return evenTubeIndices.every(idx => {
            const t = game.tubes[idx];
            return t && t.liquids.length === t.capacity;
          });
        },
        getCurrentText: (game) => {
          const filledCount = evenTubeIndices.filter(idx => {
            const t = game.tubes[idx];
            return t && t.liquids.length === t.capacity;
          }).length;
          return `${filledCount}/${evenTubeIndices.length}`;
        },
        isFailedLive: () => false
      });
    }

    // ------------------------------------------------------------------------
    // TIPO 5: Alquimia Pura: Sin Botella Auxiliar
    // ------------------------------------------------------------------------
    candidates.push({
      type: 'no_auxiliary',
      id: 'no_auxiliary',
      icon: 'shield',
      title: 'Completar sin botellas auxiliares',
      shortTitle: 'Sin botellas extra',
      coins: 3,
      check: (game) => (game.extraTubesUsed || 0) === 0,
      getCurrentText: (game) => ((game.extraTubesUsed || 0) > 0 ? 'Usada ✕' : 'Activo ✓'),
      isFailedLive: (game) => (game.extraTubesUsed || 0) > 0
    });

    // ------------------------------------------------------------------------
    // TIPO 6: Claridad Mental: Sin Pistas Alquímicas
    // ------------------------------------------------------------------------
    candidates.push({
      type: 'no_hints',
      id: 'no_hints',
      icon: 'sparkles',
      title: 'Superar sin usar ninguna pista',
      shortTitle: 'Sin pistas',
      coins: 3,
      check: (game) => (game.hintsUsedInLevel || 0) === 0,
      getCurrentText: (game) => ((game.hintsUsedInLevel || 0) > 0 ? 'Usada ✕' : 'Activo ✓'),
      isFailedLive: (game) => (game.hintsUsedInLevel || 0) > 0
    });

    // ------------------------------------------------------------------------
    // TIPO 7: Pureza Cristalina: Sin fisuras en frasco de afinidad
    // ------------------------------------------------------------------------
    if (tubes.some(t => t.isAffinity && !t.isSuperFragile)) {
      candidates.push({
        type: 'preserve_affinity',
        id: 'preserve_affinity',
        icon: 'gem',
        title: 'Pureza Cristalina: Sin fisuras en frasco de afinidad',
        shortTitle: 'Sin fisuras',
        coins: 5,
        check: (game) => game.tubes.every(t => !t.isAffinity || (t.cracks || 0) === 0),
        getCurrentText: (game) => {
          const aff = game.tubes.find(t => t.isAffinity && !t.isSuperFragile);
          if (!aff) return 'Puro ✓';
          return (aff.cracks || 0) === 0 ? 'Puro ✓' : `${aff.cracks} fisura${aff.cracks > 1 ? 's' : ''} ✕`;
        },
        isFailedLive: (game) => game.tubes.some(t => t.isAffinity && !t.isSuperFragile && (t.cracks || 0) > 0)
      });
    }

    // ------------------------------------------------------------------------
    // TIPO 8: Sobrecarga Volátil: Romper el frasco súper frágil (bonus)
    // ------------------------------------------------------------------------
    if (tubes.some(t => t.isSuperFragile)) {
      candidates.push({
        type: 'break_super_fragile',
        id: 'break_super_fragile',
        icon: 'flame',
        title: 'Sobrecarga Volátil: Rompe el frasco súper frágil',
        shortTitle: 'Romper frasco volátil',
        coins: 6,
        check: (game) => game.tubes.some(t => t.isSuperFragile && t.isBroken),
        getCurrentText: (game) => {
          const sf = game.tubes.find(t => t.isSuperFragile);
          if (!sf) return 'Pendiente';
          return sf.isBroken ? 'Estallado ✓' : 'Intacto ⏳';
        },
        isFailedLive: () => false
      });
    }

    // ------------------------------------------------------------------------
    // SELECCIÓN SEGÚN NIVEL
    // ------------------------------------------------------------------------
    // Nivel 1: Introducción suave con límite de movimientos
    if (level === 1) {
      return [candidates.find(c => c.type === 'moves_limit') || candidates[0]];
    }

    // Nivel 2: Desafío de color en tubo + movimientos
    if (level === 2) {
      const c1 = candidates.find(c => c.type === 'specific_tube_color');
      const c2 = candidates.find(c => c.type === 'moves_limit');
      if (c1 && c2) return [c1, c2];
    }

    // Nivel 3: Desafío de tubos pares + tiempo
    if (level === 3) {
      const c1 = candidates.find(c => c.type === 'even_tubes_filled') || candidates[0];
      const c2 = candidates.find(c => c.type === 'time_limit') || candidates[1];
      return [c1, c2];
    }

    // Nivel 4: Tubo específico + Sin pistas
    if (level === 4) {
      const c1 = candidates.find(c => c.type === 'specific_tube_color') || candidates[0];
      const c2 = candidates.find(c => c.type === 'no_hints') || candidates[1];
      return [c1, c2];
    }

    // Niveles 5+: Ordenar determinísticamente los candidatos para este nivel y seleccionar `challengeCount`
    const selected = [];
    const usedTypes = new Set();

    // Priorizar mecánicas temáticas activas si existen
    if (tubes.some(t => t.isSuperFragile)) {
      const bsf = candidates.find(c => c.type === 'break_super_fragile');
      if (bsf) {
        selected.push(bsf);
        usedTypes.add(bsf.type);
      }
    } else if (tubes.some(t => t.isAffinity)) {
      const pa = candidates.find(c => c.type === 'preserve_affinity');
      if (pa) {
        selected.push(pa);
        usedTypes.add(pa.type);
      }
    }

    // Evitar duplicar el mismo tipo
    const shuffled = [...candidates].sort((a, b) => {
      const scoreA = (a.type.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 37 + level * 13) % 100;
      const scoreB = (b.type.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 37 + level * 13) % 100;
      return scoreA - scoreB;
    });

    for (const c of shuffled) {
      if (!usedTypes.has(c.type)) {
        usedTypes.add(c.type);
        selected.push(c);
        if (selected.length >= challengeCount) break;
      }
    }

    return selected;
  }

  /**
   * Calcula el bono de monedas y multiplicador según los desafíos completados.
   * @param {Array<{challenge: Object, completed: boolean}>} results
   */
  static calculateBonus(results) {
    if (!results || results.length === 0) {
      return { completedCount: 0, totalCount: 0, baseBonus: 0, multiplier: 1.0, multiplierLabel: '', totalCoins: 0 };
    }

    const completedCount = results.filter(r => r.completed).length;
    const totalCount = results.length;

    let baseBonus = 0;
    results.forEach(r => {
      if (r.completed) baseBonus += (r.challenge.coins || 3);
    });

    let multiplier = 1.0;
    let multiplierLabel = '';

    if (totalCount === 1) {
      if (completedCount === 1) {
        multiplier = 1.0;
        multiplierLabel = '¡Desafío Cumplido!';
      }
    } else if (totalCount === 2) {
      if (completedCount === 2) {
        multiplier = 1.5;
        multiplierLabel = '¡Doble Desafío Alquímico! (+50% bonus)';
      } else if (completedCount === 1) {
        multiplier = 1.0;
        multiplierLabel = '1/2 Desafíos Cumplidos';
      }
    } else if (totalCount === 3) {
      if (completedCount === 3) {
        multiplier = 2.0;
        multiplierLabel = '¡PLENO ALQUÍMICO TOTAL! (x2.0 Doble Monedas)';
      } else if (completedCount === 2) {
        multiplier = 1.25;
        multiplierLabel = '¡2 de 3 Desafíos! (+25% bonus)';
      } else if (completedCount === 1) {
        multiplier = 1.0;
        multiplierLabel = '1/3 Desafíos Cumplidos';
      }
    }

    const totalCoins = Math.round(baseBonus * multiplier);

    return {
      completedCount,
      totalCount,
      baseBonus,
      multiplier,
      multiplierLabel,
      totalCoins
    };
  }
}

window.ChallengeManager = ChallengeManager;
