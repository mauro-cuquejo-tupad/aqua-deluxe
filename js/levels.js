/* ==========================================================================
   AQUASORT MASTER DELUXE - LEVEL GENERATOR (100 NIVELES)
   Generación determinista, progresión escalonada de mecánicas cada 5 niveles,
   variación de semillas al reiniciar (seed reroll) y revelación de bloques contiguos.
   ========================================================================== */

class LevelGenerator {
  static generate(levelNum, seedVariation = 0) {
    const level = Math.max(1, Math.min(100, levelNum));

    // Progresión de cantidad de colores (hasta 12 colores en los niveles finales)
    let colorCount = 3 + Math.floor((level - 1) / 10);
    colorCount = Math.min(colorCount, 12);
    const emptyCount = 2;
    const capacity = 4;

    // Activación progresiva y espaciada de mecánicas cada 10 niveles
    const rawHasMystery = (level >= 11 && level <= 20) || (level >= 81 && level % 3 === 0) || (level >= 91 && level % 2 === 1);
    const rawHasGiant = (level >= 21 && level <= 30) || (level >= 81 && level % 3 === 1) || (level >= 91 && level % 3 === 0);
    const rawHasSuperGiant = (level >= 85 && level % 4 === 0) || (level >= 98); // Frasco Súper Largo (Max 8)
    const rawHasLock = (level >= 31 && level <= 40) || (level >= 81 && level % 3 === 2) || (level >= 92 && level % 2 === 0);
    const rawHasNarrow = (level >= 41 && level <= 50) || (level >= 93 && level % 3 === 1);
    const rawHasGlued = (level >= 51 && level <= 60) || (level >= 94 && level % 4 === 2);
    const rawHasChameleon = (level >= 61 && level <= 70) || (level >= 85 && level % 4 === 1) || (level >= 95);
    const rawHasFragile = (level >= 71 && level <= 80) || (level >= 88 && level % 4 === 3) || (level >= 96);
    const rawIsSuperFragile = (level >= 88 && level % 4 === 3) || (level >= 97); // Súper Frágil / Volátil (1 Uso)

    // Filtro por configuración de dificultad personalizada del usuario
    const sm = window.stateManager;
    const hasMystery = rawHasMystery && !(sm && sm.isMechanicDisabled('mystery'));
    const hasGiant = rawHasGiant && !(sm && sm.isMechanicDisabled('giant'));
    const hasSuperGiant = rawHasSuperGiant && !(sm && sm.isMechanicDisabled('giant'));
    const hasLock = rawHasLock && !(sm && sm.isMechanicDisabled('lock'));
    const hasNarrow = rawHasNarrow && !(sm && sm.isMechanicDisabled('narrow'));
    const hasGlued = rawHasGlued && !(sm && sm.isMechanicDisabled('glued'));
    const hasChameleon = rawHasChameleon && !(sm && sm.isMechanicDisabled('chameleon'));
    const hasFragile = rawHasFragile && !(sm && sm.isMechanicDisabled('fragile'));
    const isSuperFragile = rawIsSuperFragile && !(sm && sm.isMechanicDisabled('fragile'));

    let mechanicTag = 'Básico';
    let primaryMechanicId = 'basic';

    if (level >= 91 && (hasMystery || hasGiant || hasLock || hasNarrow || hasGlued || hasChameleon || hasFragile)) {
      mechanicTag = 'La Gran Obra Magna';
      primaryMechanicId = 'magna';
    } else if (level >= 81 && (hasSuperGiant || hasMystery || hasGiant || hasLock || hasNarrow || hasGlued || hasChameleon || hasFragile)) {
      mechanicTag = hasSuperGiant ? 'Frasco Súper Largo (Max 8)' : 'Conjunción Híbrida';
      primaryMechanicId = 'hybrid';
    } else if (hasFragile) {
      if (isSuperFragile) {
        mechanicTag = 'Cristal Volátil (1 Uso)';
        primaryMechanicId = 'super_fragile';
      } else {
        mechanicTag = 'Cristal de Afinidad (3 Usos)';
        primaryMechanicId = 'fragile';
      }
    } else if (hasChameleon) {
      mechanicTag = 'Líquido Camaleón';
      primaryMechanicId = 'chameleon';
    } else if (hasGlued) {
      mechanicTag = 'Frasco en Roca (Solo Recibe)';
      primaryMechanicId = 'glued';
    } else if (hasNarrow) {
      mechanicTag = 'Tubo Estrecho (1x1)';
      primaryMechanicId = 'narrow';
    } else if (hasLock) {
      mechanicTag = 'Candado con Llave Oculta';
      primaryMechanicId = 'lock';
    } else if (hasGiant) {
      mechanicTag = 'Frasco Gigante (Max 6)';
      primaryMechanicId = 'giant';
    } else if (hasMystery) {
      mechanicTag = "Líquidos Misterio '?'";
      primaryMechanicId = 'mystery';
    }

    // Obtener paleta actual (personalizable por el usuario)
    const currentPalette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = currentPalette.slice(0, colorCount);

    let tubes = [];

    // 1. Crear frascos llenos uniformes
    for (let i = 0; i < colorCount; i++) {
      const col = activeColors[i];
      const isThisSuper = (hasSuperGiant && i === 1);
      const isThisGiant = (hasGiant && i === 0);
      const cap = isThisSuper ? 8 : (isThisGiant ? 6 : capacity);

      let tubeLiquids = [];
      for (let k = 0; k < cap; k++) {
        const isCham = (hasChameleon && i === 1 && k === 1 && !isThisSuper);
        tubeLiquids.push({
          colorIndex: isCham ? 'chameleon' : col.id,
          color: isCham ? 'chameleon' : col.hex,
          name: isCham ? 'Camaleón' : col.name,
          shape: isCham ? '★' : col.shape,
          pattern: isCham ? null : col.pattern,
          textHex: isCham ? '#ffffff' : col.textHex,
          isMystery: (hasMystery && k < cap - 1 && !isCham),
          isChameleon: isCham
        });
      }

      tubes.push({
        id: i,
        capacity: cap,
        liquids: tubeLiquids,
        isLocked: false,
        keyColor: null,
        isNarrow: (hasNarrow && i === 2),
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

    // 2. Mezclar semilla determinista
    const effectiveSeed = level * 7919 + seedVariation * 1337 + 12345;

    // 3. Agregar frascos vacíos de trabajo o frasco inamovible (en la roca) o frasco de afinidad
    for (let i = 0; i < emptyCount; i++) {
      const isGluedTube = (hasGlued && i === 0);
      // REGLA DEL USUARIO: Los frascos de afinidad SIEMPRE inician vacíos para evitar problemas
      const isAffinityTube = (hasFragile && (hasGlued ? i === 1 : i === 0));

      // Si es frasco de afinidad elemental, seleccionar determinísticamente 2 colores afines
      let allowedColors = [];
      let allowedColorNames = [];
      if (isAffinityTube && activeColors.length >= 2) {
        const c1 = activeColors[Math.abs(effectiveSeed) % activeColors.length];
        const c2 = activeColors[Math.abs(effectiveSeed + 1) % activeColors.length];
        allowedColors = [c1.hex, c2.hex];
        allowedColorNames = [c1.name, c2.name];
      }

      const tubeObj = {
        id: 0,
        capacity: capacity,
        liquids: [], // Se inicializa vacío; si es glued, distributeAndShuffle le asigna 1 muestra estándar
        isLocked: false,
        keyColor: null,
        isNarrow: false,
        isGlued: isGluedTube, // Frasco inamovible: solo puede recibir líquidos (debe ir en posición 1)
        isFragile: isAffinityTube,
        isAffinity: isAffinityTube,
        isSuperFragile: isAffinityTube && isSuperFragile,
        maxCracks: isAffinityTube ? (isSuperFragile ? 1 : 3) : null,
        cracks: 0,
        isBroken: false,
        allowedColors: allowedColors,
        allowedColorNames: allowedColorNames
      };

      // REGLA DEL USUARIO: Si hay un tubo clavado en piedra (isGlued), DEBE generarse en la primera posición
      // del layout (posición 1 / índice 0) para no cortar la cadena consecutiva de combos al ser completado.
      // Los tubos de trabajo vacíos se posicionan al final.
      if (isGluedTube) {
        tubes.unshift(tubeObj);
      } else {
        tubes.push(tubeObj);
      }
    }

    // Reasignar identificadores secuenciales 0..tubes.length-1
    tubes.forEach((t, idx) => {
      t.id = idx;
    });

    // 4. Distribuir y mezclar inteligentemente:
    // REGLA DEL USUARIO: En la cadena de líquidos distribuidos NO debe haber más de dos del mismo tipo
    // desde el inicio ni dar botellas ya resueltas.
    this.distributeAndShuffle(tubes, effectiveSeed);

    // 5. Aplicar candado si corresponde
    // REGLAS ESTRICTAS DEL USUARIO:
    // a) El tubo con candado NUNCA debe estar vacío (debe tener entre 2 y 4 unidades de líquido).
    //    Esto hace que sea 100% obligatorio desbloquearlo para completar el nivel.
    // b) Minipuzzle de desbloqueo: NUNCA puede abrirse en el primer movimiento.
    //    La llave debe requerir obligatoriamente entre 2 y 3 movimientos previos para ser alcanzada.
    //    Por lo tanto: NINGÚN tubo accesible puede tener la llave en la superficie superior al inicio.
    //    La llave debe estar enterrada debajo de 1 o 2 capas de otros líquidos en otro tubo.
    if (hasLock && tubes.length > 0) {
      // 4.1 Seleccionar el tubo a bloquear: debe tener líquidos (al menos 2 unidades) y no ser inamovible ni estrecho
      const lockCandidates = tubes.filter(t => !t.isGlued && !t.isNarrow && t.liquids.length >= 2 && t.liquids.length <= t.capacity);
      if (lockCandidates.length > 0) {
        const lockIndex = Math.abs(effectiveSeed) % lockCandidates.length;
        const lockTube = lockCandidates[lockIndex];
        lockTube.isLocked = true;

        // 4.2 Seleccionar el color de la llave
        const keyColorObj = activeColors[Math.abs(effectiveSeed + 3) % activeColors.length];
        lockTube.keyColor = keyColorObj.hex;
        lockTube.keyColorName = keyColorObj.name;

        // 4.3 Garantizar que la llave esté presente en un tubo accesible, pero ENTERRADA (a 1 o 2 capas bajo el tope)
        const sourceCandidates = tubes.filter(t => !t.isLocked && !t.isGlued && !t.isNarrow && t.liquids.length >= 2);
        if (sourceCandidates.length > 0) {
          const keySourceTube = sourceCandidates[Math.abs(effectiveSeed + 7) % sourceCandidates.length];
          // coverCount = 1 o 2 capas por encima de la llave
          const coverCount = keySourceTube.liquids.length >= 3 ? 2 : 1;
          const keyPos = keySourceTube.liquids.length - 1 - coverCount;

          // Colocar la llave en keyPos
          let foundKey = false;
          for (let ti = 0; ti < tubes.length; ti++) {
            if (tubes[ti] === lockTube) continue;
            for (let li = 0; li < tubes[ti].liquids.length; li++) {
              if (tubes[ti].liquids[li].color === lockTube.keyColor) {
                const temp = keySourceTube.liquids[keyPos];
                keySourceTube.liquids[keyPos] = tubes[ti].liquids[li];
                tubes[ti].liquids[li] = temp;
                foundKey = true;
                break;
              }
            }
            if (foundKey) break;
          }

          // Si todas las unidades de keyColor estaban en lockTube, intercambiar una unidad hacia keyPos
          if (!foundKey) {
            for (let li = 0; li < lockTube.liquids.length; li++) {
              if (lockTube.liquids[li].color === lockTube.keyColor) {
                const temp = keySourceTube.liquids[keyPos];
                keySourceTube.liquids[keyPos] = lockTube.liquids[li];
                lockTube.liquids[li] = temp;
                foundKey = true;
                break;
              }
            }
          }

          // Asegurar que las capas que cubren la llave (desde keyPos + 1 hasta el tope) sean de un color DIFERENTE a keyColor
          for (let c = keyPos + 1; c < keySourceTube.liquids.length; c++) {
            if (keySourceTube.liquids[c].color === lockTube.keyColor) {
              for (let ti = 0; ti < tubes.length; ti++) {
                if (tubes[ti] === lockTube) continue;
                for (let li = 0; li < tubes[ti].liquids.length - 1; li++) {
                  if (tubes[ti].liquids[li].color !== lockTube.keyColor) {
                    const swap = keySourceTube.liquids[c];
                    keySourceTube.liquids[c] = tubes[ti].liquids[li];
                    tubes[ti].liquids[li] = swap;
                    break;
                  }
                }
                if (keySourceTube.liquids[c].color !== lockTube.keyColor) break;
              }
            }
          }
        }

        // 4.4 REGLA CRUCIAL: NINGÚN tubo accesible puede tener la llave en la superficie (tope) al inicio
        // Si algún tubo no bloqueado tiene keyColor en el tope, intercambiarlo con un bloque interior no-keyColor
        tubes.forEach(t => {
          if (!t.isLocked && t.liquids.length > 0) {
            const topIdx = t.liquids.length - 1;
            if (t.liquids[topIdx].color === lockTube.keyColor) {
              for (let innerT of tubes) {
                if (innerT.isLocked) continue;
                for (let li = 0; li < innerT.liquids.length - 1; li++) {
                  if (innerT.liquids[li].color !== lockTube.keyColor) {
                    const temp = t.liquids[topIdx];
                    t.liquids[topIdx] = innerT.liquids[li];
                    innerT.liquids[li] = temp;
                    break;
                  }
                }
                if (t.liquids[topIdx].color !== lockTube.keyColor) break;
              }
            }
          }
        });
      }
    }

    // 5. Aplicar estados de misterio: La superficie SIEMPRE está descubierta
    // REGLA: Si hay bloques consecutivos ocultos del mismo color bajo la superficie, se desbloquean juntos.
    // Los frascos inamovibles NUNCA tienen líquido misterioso.
    if (hasMystery) {
      tubes.forEach(tube => {
        if (tube.isGlued) {
          tube.liquids.forEach(liq => {
            liq.isMystery = false;
          });
          return;
        }

        tube.liquids.forEach((liq, idx) => {
          if (idx < tube.liquids.length - 1) {
            liq.isMystery = true;
          } else {
            liq.isMystery = false;
          }
        });

        // Desbloqueo consecutivo del mismo color bajo el tope
        if (tube.liquids.length >= 2) {
          const topColor = tube.liquids[tube.liquids.length - 1].color;
          for (let k = tube.liquids.length - 2; k >= 0; k--) {
            if (tube.liquids[k].color === topColor) {
              tube.liquids[k].isMystery = false;
            } else {
              break;
            }
          }
        }
      });
    } else {
      tubes.forEach(tube => {
        tube.liquids.forEach(liq => {
          liq.isMystery = false;
        });
      });
    }

    // 6. Cálculo de movimientos óptimos estimados para estrellas
    const optimalMoves = colorCount * 3 + Math.floor(level / 4) + (hasMystery ? 2 : 0) + (hasLock ? 2 : 0) + (hasGlued ? 2 : 0);

    // Verificación final de normalización para asegurar que la colocación de la llave
    // no haya dejado rachas mayores a 2 ni frascos resueltos
    const mainUnlocked = tubes.filter(t => !t.isGlued && !t.isAffinity && !t.isLocked && t.liquids.length > 0);
    this.normalizeTubes(mainUnlocked, hasLock ? tubes.find(t => t.isLocked)?.keyColor : null);

    return {
      level,
      seedVariation,
      tubes,
      colorCount,
      mechanicTag,
      primaryMechanicId,
      optimalMoves,
      hasMystery,
      hasGiant,
      hasLock,
      hasNarrow,
      hasGlued,
      hasChameleon,
      hasFragile
    };
  }

  // --- DISTRIBUCIÓN INTELIGENTE DE LÍQUIDOS (MÁXIMO 2 DEL MISMO TIPO, NINGUNO RESUELTO) ---
  static distributeAndShuffle(tubes, seed) {
    let s = (seed * 1103515245 + 12345) & 0x7fffffff;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const gluedTube = tubes.find(t => t.isGlued);
    const mainTubes = tubes.filter(t => !t.isGlued && !t.isAffinity && t.capacity >= 4);

    // 1. Extraer todos los líquidos de los tubos principales a un pool común
    const pool = [];
    mainTubes.forEach(t => {
      pool.push(...t.liquids);
      t.liquids = [];
    });

    // 2. Si hay frasco atrapado en roca (gluedTube), asignarle 1 unidad de un color estándar (capacidad 4)
    // para que el jugador sepa cuál color debe completar en la roca, garantizando que haya 4 unidades en total.
    if (gluedTube) {
      const colorCounts = {};
      pool.forEach(l => {
        if (!l.isChameleon) colorCounts[l.color] = (colorCounts[l.color] || 0) + 1;
      });
      const standardColors = Object.keys(colorCounts).filter(c => colorCounts[c] === 4);
      if (standardColors.length > 0) {
        const chosenColor = standardColors[Math.abs(seed) % standardColors.length];
        const sampleIdx = pool.findIndex(l => l.color === chosenColor);
        if (sampleIdx !== -1) {
          const sample = pool.splice(sampleIdx, 1)[0];
          sample.isMystery = false;
          sample.isChameleon = false;
          gluedTube.liquids = [sample];
        }
      }
    }

    // 3. Mezclar determinísticamente con Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    // 4. Llenar los mainTubes según su capacidad
    let pIdx = 0;
    mainTubes.forEach(t => {
      while (t.liquids.length < t.capacity && pIdx < pool.length) {
        t.liquids.push(pool[pIdx++]);
      }
    });

    // 5. Aplicar la regla de oro solicitada por el usuario:
    // "verificar que en la cadena de liquidos que distribuis no hayan más de dos del mismo tipo desde el inicio?
    // Solo si no existe otra distribucion posible, hay que tratar de no darle resuelto al usuario una botella"
    this.normalizeTubes(mainTubes);
  }

  static normalizeTubes(mainTubes, forbiddenTopColor = null) {
    for (let pass = 0; pass < 350; pass++) {
      let violation = false;
      for (let t1 = 0; t1 < mainTubes.length; t1++) {
        const tube1 = mainTubes[t1];
        if (tube1.isLocked || tube1.liquids.length === 0) continue;

        const counts1 = {};
        tube1.liquids.forEach(item => counts1[item.color] = (counts1[item.color] || 0) + 1);

        // a) Ningún tubo debe comenzar resuelto al 100%
        const isSolved = (Object.keys(counts1).length === 1 && tube1.liquids.length === tube1.capacity && tube1.capacity > 1);
        let badColor = null;
        let badIdx = -1;

        if (isSolved) {
          badColor = tube1.liquids[0].color;
          badIdx = tube1.liquids.length - 1;
        } else {
          // b) No más de 2 del mismo color en frascos estándar de 4
          if (tube1.capacity === 4) {
            for (let c in counts1) {
              if (counts1[c] > 2) {
                badColor = c;
                break;
              }
            }
          }
          // c) No más de 2 consecutivos del mismo color en la cadena vertical
          if (badColor === null) {
            for (let i = 0; i < tube1.liquids.length - 2; i++) {
              if (tube1.liquids[i].color === tube1.liquids[i+1].color && tube1.liquids[i].color === tube1.liquids[i+2].color) {
                badColor = tube1.liquids[i].color;
                badIdx = i + 1;
                break;
              }
            }
          }
        }

        if (badColor !== null) {
          violation = true;
          if (badIdx === -1) {
            badIdx = tube1.liquids.findLastIndex(l => l.color === badColor);
          }

          let swapped = false;
          for (let t2 = 0; t2 < mainTubes.length && !swapped; t2++) {
            if (t1 === t2) continue;
            const tube2 = mainTubes[t2];
            if (tube2.isLocked || tube2.liquids.length === 0) continue;

            const counts2 = {};
            tube2.liquids.forEach(l => counts2[l.color] = (counts2[l.color] || 0) + 1);

            const maxAllowedInT2 = tube2.capacity > 4 ? 3 : 2;
            if ((counts2[badColor] || 0) < maxAllowedInT2) {
              for (let i2 = 0; i2 < tube2.liquids.length; i2++) {
                const swapItem = tube2.liquids[i2];
                // Evitar poner forbiddenTopColor en el tope
                if (forbiddenTopColor && badIdx === tube1.liquids.length - 1 && swapItem.color === forbiddenTopColor) continue;
                if (forbiddenTopColor && i2 === tube2.liquids.length - 1 && badColor === forbiddenTopColor) continue;

                if (swapItem.color !== badColor && (counts1[swapItem.color] || 0) < 2) {
                  const temp = tube1.liquids[badIdx];
                  tube1.liquids[badIdx] = tube2.liquids[i2];
                  tube2.liquids[i2] = temp;
                  swapped = true;
                  break;
                }
              }
            }
          }

          if (!swapped) {
            for (let t2 = 0; t2 < mainTubes.length && !swapped; t2++) {
              if (t1 === t2) continue;
              const tube2 = mainTubes[t2];
              if (tube2.isLocked || tube2.liquids.length === 0) continue;

              for (let i2 = 0; i2 < tube2.liquids.length; i2++) {
                if (tube2.liquids[i2].color !== badColor) {
                  if (forbiddenTopColor && badIdx === tube1.liquids.length - 1 && tube2.liquids[i2].color === forbiddenTopColor) continue;
                  if (forbiddenTopColor && i2 === tube2.liquids.length - 1 && badColor === forbiddenTopColor) continue;

                  const temp = tube1.liquids[badIdx];
                  tube1.liquids[badIdx] = tube2.liquids[i2];
                  tube2.liquids[i2] = temp;
                  swapped = true;
                  break;
                }
              }
            }
          }
        }
      }
      if (!violation) break;
    }
  }

  static shuffleDeterministically(tubes, seed) {
    this.distributeAndShuffle(tubes, seed);
  }

  /**
   * Genera el nivel único del Desafío Diario basado en la fecha YYYY-MM-DD.
   * Determinista para todos los jugadores el mismo día.
   */
  static generateDailyLevel(dateStr = null) {
    const now = new Date();
    const dStr = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let hash = 0;
    for (let i = 0; i < dStr.length; i++) {
      hash = (hash << 5) - hash + dStr.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);
    const pseudoLevel = (absHash % 75) + 15; // Entre nivel 15 y 90 (mecánicas interesantes)
    const seedVariation = (absHash % 9999) + 100;

    const data = this.generate(pseudoLevel, seedVariation);
    data.level = 'daily';
    data.dateStr = dStr;
    data.title = `Desafío Diario • ${dStr}`;
    data.isDaily = true;
    return data;
  }

  /**
   * Genera un nivel casual sandbox totalmente personalizable e infinito.
   * @param {Object} options
   * @param {number} options.tubeCount - Total de tubos (4 a 12, defecto 7)
   * @param {number} options.colorCount - Total de colores (3 a 10, defecto 5)
   * @param {Object} options.mechanics - { mystery, giant, lock, narrow, glued, chameleon, fragile }
   * @param {number} options.seed - Semilla opcional
   */
  static generateCasualSandbox({ tubeCount = 7, colorCount = 5, mechanics = {}, seed = null } = {}) {
    const totalTubes = Math.max(4, Math.min(12, parseInt(tubeCount) || 7));
    // Los colores no pueden superar totalTubes - 1 (mínimo 1 tubo vacío, idealmente 2)
    const maxColors = Math.max(2, totalTubes - 2);
    const numColors = Math.max(2, Math.min(maxColors, Math.min(10, parseInt(colorCount) || 5)));
    const emptyCount = totalTubes - numColors;

    const currentPalette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = currentPalette.slice(0, numColors);

    const hasMystery = !!mechanics.mystery;
    const hasGiant = !!mechanics.giant;
    const hasLock = !!mechanics.lock;
    const hasNarrow = !!mechanics.narrow;
    const hasGlued = !!mechanics.glued;
    const hasChameleon = !!mechanics.chameleon;
    const hasFragile = !!mechanics.fragile;

    const tubes = [];
    const capacity = 4;

    for (let i = 0; i < numColors; i++) {
      const col = activeColors[i];
      const isGiant = (hasGiant && i === 0);
      const cap = isGiant ? 6 : capacity;
      const tubeLiquids = [];

      for (let k = 0; k < cap; k++) {
        const isCham = (hasChameleon && i === 1 && k === 1 && !isGiant);
        tubeLiquids.push({
          colorIndex: isCham ? 'chameleon' : col.id,
          color: isCham ? 'chameleon' : col.hex,
          name: isCham ? 'Camaleón' : col.name,
          shape: isCham ? '★' : col.shape,
          pattern: isCham ? null : col.pattern,
          textHex: isCham ? '#ffffff' : col.textHex,
          isMystery: (hasMystery && k < cap - 1 && !isCham),
          revealed: false
        });
      }

      tubes.push({
        id: i,
        capacity: cap,
        liquids: tubeLiquids,
        isGlued: (hasGlued && i === numColors - 1),
        isLocked: (hasLock && i === 0),
        fragileUses: (hasFragile && i === 2) ? 3 : null,
        isNarrow: false
      });
    }

    // Tubos vacíos
    for (let j = 0; j < emptyCount; j++) {
      const tubeIndex = numColors + j;
      const isNarrow = (hasNarrow && j === emptyCount - 1);
      tubes.push({
        id: tubeIndex,
        capacity: isNarrow ? 1 : capacity,
        liquids: [],
        isGlued: false,
        isLocked: false,
        fragileUses: null,
        isNarrow: isNarrow
      });
    }

    const actualSeed = (seed !== null && seed !== undefined) ? seed : Math.floor(Math.random() * 9999999);
    this.distributeAndShuffle(tubes, actualSeed);

    const activeMechanicNames = [];
    if (hasMystery) activeMechanicNames.push('Misterio');
    if (hasGiant) activeMechanicNames.push('Gigante');
    if (hasLock) activeMechanicNames.push('Candado');
    if (hasNarrow) activeMechanicNames.push('Tubo 1x1');
    if (hasGlued) activeMechanicNames.push('En Roca');
    if (hasChameleon) activeMechanicNames.push('Camaleón');
    if (hasFragile) activeMechanicNames.push('Frágil');

    return {
      level: 'casual_sandbox',
      isCasualSandbox: true,
      title: `Modo Casual (${totalTubes} Tubos, ${numColors} Colores)`,
      mechanicTag: activeMechanicNames.length > 0 ? activeMechanicNames.join(' • ') : 'Puro y Relajante',
      optimalMoves: numColors * 3 + 4,
      totalTubes: totalTubes,
      totalColors: numColors,
      tubes: tubes,
      config: { tubeCount: totalTubes, colorCount: numColors, mechanics, seed: actualSeed }
    };
  }
}

window.LevelGenerator = LevelGenerator;

