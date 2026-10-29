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

    // Activación progresiva y escalonada de mecánicas:
    // Los primeros 3 niveles de cada sección tienen ÚNICAMENTE la mecánica nueva introducida.
    // A partir del nivel 4, van sumando las mecánicas anteriores progresivamente.
    const rawMechanics = LevelGenerator.getMechanicsForLevel(level);
    const rawHasMystery = rawMechanics.rawHasMystery;
    const rawHasGiant = rawMechanics.rawHasGiant;
    const rawHasSuperGiant = rawMechanics.rawHasSuperGiant;
    const rawHasLock = rawMechanics.rawHasLock;
    const rawHasNarrow = rawMechanics.rawHasNarrow;
    const rawHasGlued = rawMechanics.rawHasGlued;
    const rawHasChameleon = rawMechanics.rawHasChameleon;
    const rawHasFragile = rawMechanics.rawHasFragile;
    const rawIsSuperFragile = rawMechanics.rawIsSuperFragile;

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

    const activeNames = [];
    if (hasSuperGiant) activeNames.push('Súper Tubo (Max 8)');
    else if (hasGiant) activeNames.push('Tubo Gigante (Max 6)');
    if (hasLock) activeNames.push('Candado');
    if (hasNarrow) activeNames.push('Tubo 1x1');
    if (hasGlued) activeNames.push('En Roca');
    if (hasChameleon) activeNames.push('Camaleón');
    if (hasFragile) activeNames.push(isSuperFragile ? 'Volátil (1)' : 'Afinidad');
    if (hasMystery) activeNames.push("Misterio '?'");

    let mechanicTag = 'Básico';
    let primaryMechanicId = 'basic';

    if (level >= 91) {
      mechanicTag = activeNames.length > 0 ? `Obra Magna: ${activeNames.slice(0, 2).join(' + ')}` : 'La Gran Obra Magna';
      primaryMechanicId = 'magna';
    } else if (level >= 81) {
      mechanicTag = hasSuperGiant && activeNames.length === 1 ? 'Frasco Súper Largo (Max 8)' : `Híbrido: ${activeNames.slice(0, 2).join(' + ')}`;
      primaryMechanicId = 'hybrid';
    } else if (activeNames.length === 0) {
      mechanicTag = 'Básico';
      primaryMechanicId = 'basic';
    } else if (activeNames.length === 1) {
      mechanicTag = activeNames[0];
      if (hasFragile) primaryMechanicId = isSuperFragile ? 'super_fragile' : 'fragile';
      else if (hasChameleon) primaryMechanicId = 'chameleon';
      else if (hasGlued) primaryMechanicId = 'glued';
      else if (hasNarrow) primaryMechanicId = 'narrow';
      else if (hasLock) primaryMechanicId = 'lock';
      else if (hasGiant) primaryMechanicId = 'giant';
      else if (hasMystery) primaryMechanicId = 'mystery';
    } else {
      mechanicTag = activeNames.length <= 2 ? activeNames.join(' + ') : `${activeNames[0]} + ${activeNames[1]} (+${activeNames.length - 2})`;
      if (hasFragile) primaryMechanicId = 'fragile';
      else if (hasChameleon) primaryMechanicId = 'chameleon';
      else if (hasGlued) primaryMechanicId = 'glued';
      else if (hasNarrow) primaryMechanicId = 'narrow';
      else if (hasLock) primaryMechanicId = 'lock';
      else if (hasGiant) primaryMechanicId = 'giant';
      else if (hasMystery) primaryMechanicId = 'mystery';
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
          letter: isCham ? '★' : (col.letter || col.shape),
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

    // 6. Cálculo de movimientos óptimos estimados para estrellas (+2 de margen adicional para alcanzar las 3★)
    const optimalMoves = colorCount * 3 + Math.floor(level / 4) + (hasMystery ? 2 : 0) + (hasLock ? 2 : 0) + (hasGlued ? 2 : 0) + 2;

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
   * @param {Object} options.mechanicCounts - { giant: 0..5, lock: 0..5, narrow: 0..6, fragile: 0..4 } (0 = Auto/Azar)
   * @param {number} options.seed - Semilla opcional
   */
  static generateCasualSandbox({ tubeCount = 7, colorCount = 5, mechanics = {}, mechanicCounts = {}, seed = null } = {}) {
    const totalTubes = Math.max(4, Math.min(12, parseInt(tubeCount) || 7));
    // Los colores no pueden superar totalTubes - 2 (mínimo 2 tubos vacíos para maniobrar)
    const maxColors = Math.max(2, totalTubes - 2);
    const numColors = Math.max(2, Math.min(maxColors, Math.min(10, parseInt(colorCount) || 5)));
    const emptyCount = totalTubes - numColors;

    const actualSeed = (seed !== null && seed !== undefined) ? seed : Math.floor(Math.random() * 9999999);
    let s = (Math.abs(actualSeed) * 1103515245 + 12345) & 0x7fffffff;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const currentPalette = window.paletteManager ? window.paletteManager.getPalette() : [];
    const activeColors = currentPalette.slice(0, numColors);

    const hasMystery = !!mechanics.mystery;
    const hasGiant = !!mechanics.giant;
    const hasLock = !!mechanics.lock;
    const hasNarrow = !!mechanics.narrow;
    const hasGlued = !!mechanics.glued;
    const hasChameleon = !!mechanics.chameleon;
    const hasFragile = !!mechanics.fragile;

    // Resolver la cantidad de tubos de cada tipo:
    // - Si el slider está en 0 (Auto / Por defecto): puede no aparecer (0) o aparecer múltiples veces al azar,
    //   respetando el máximo de tubos posibles.
    // - Si se eligió un número específico (> 0): aparece exactamente esa cantidad de tubos (limitado al máximo válido).
    const resolveCount = (isActive, rawSliderVal, maxAllowed, maxAutoRoll) => {
      if (!isActive || maxAllowed <= 0) return 0;
      const val = parseInt(rawSliderVal, 10) || 0;
      if (val > 0) {
        return Math.min(val, maxAllowed);
      }
      // En modo Auto (0): entre 0 y min(maxAllowed, maxAutoRoll)
      const capRoll = Math.min(maxAllowed, maxAutoRoll);
      return Math.floor(rnd() * (capRoll + 1));
    };

    const giantCount = resolveCount(hasGiant, mechanicCounts.giant, numColors, Math.min(3, numColors));
    const narrowCount = resolveCount(hasNarrow, mechanicCounts.narrow, totalTubes - 1, Math.min(4, totalTubes - 1));
    const fragileCount = resolveCount(hasFragile, mechanicCounts.fragile, emptyCount, emptyCount);
    const maxLockPossible = Math.max(0, numColors - 1);
    const lockCount = resolveCount(hasLock, mechanicCounts.lock, maxLockPossible, Math.min(2, maxLockPossible));

    const tubes = [];
    const capacity = 4;

    // Elegir al azar cuáles de los tubos con líquido serán Gigantes (capacidad 6)
    const colorIndices = Array.from({ length: numColors }, (_, idx) => idx);
    for (let i = colorIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [colorIndices[i], colorIndices[j]] = [colorIndices[j], colorIndices[i]];
    }
    const giantSet = new Set(colorIndices.slice(0, giantCount));

    // 1. Crear los numColors tubos con líquido
    for (let i = 0; i < numColors; i++) {
      const col = activeColors[i];
      const isGiant = giantSet.has(i);
      const cap = isGiant ? 6 : capacity;
      const tubeLiquids = [];

      for (let k = 0; k < cap; k++) {
        const isCham = (hasChameleon && i === 1 && k === 1 && !isGiant);
        tubeLiquids.push({
          colorIndex: isCham ? 'chameleon' : col.id,
          color: isCham ? 'chameleon' : col.hex,
          name: isCham ? 'Camaleón' : col.name,
          shape: isCham ? '★' : col.shape,
          letter: isCham ? '★' : (col.letter || col.shape),
          pattern: isCham ? null : col.pattern,
          textHex: isCham ? '#ffffff' : col.textHex,
          isMystery: (hasMystery && k < cap - 1 && !isCham),
          isChameleon: isCham,
          revealed: false
        });
      }

      tubes.push({
        id: i,
        capacity: cap, // SIEMPRE 4 (o 6 si es gigante), incluso si luego es tubo 1x1
        liquids: tubeLiquids,
        isGlued: (hasGlued && i === numColors - 1),
        isLocked: false,
        keyColor: null,
        keyColorName: null,
        isNarrow: false,
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

    // 2. Crear los emptyCount tubos vacíos (pueden incluir tubos frágiles/afinidad si corresponde)
    for (let j = 0; j < emptyCount; j++) {
      const tubeIndex = numColors + j;
      const isAffinityTube = (j < fragileCount);
      let allowedColors = [];
      let allowedColorNames = [];
      if (isAffinityTube && activeColors.length >= 2) {
        const c1 = activeColors[Math.floor(rnd() * activeColors.length)];
        let c2 = activeColors[Math.floor(rnd() * activeColors.length)];
        if (c2.hex === c1.hex && activeColors.length > 1) {
          c2 = activeColors[(activeColors.indexOf(c1) + 1) % activeColors.length];
        }
        allowedColors = [c1.hex, c2.hex];
        allowedColorNames = [c1.name, c2.name];
      }

      tubes.push({
        id: tubeIndex,
        capacity: capacity, // 4 líquidos de capacidad
        liquids: [],
        isGlued: false,
        isLocked: false,
        keyColor: null,
        keyColorName: null,
        isNarrow: false,
        isFragile: isAffinityTube,
        isAffinity: isAffinityTube,
        isSuperFragile: false,
        cracks: 0,
        maxCracks: isAffinityTube ? 3 : null,
        isBroken: false,
        allowedColors: allowedColors,
        allowedColorNames: allowedColorNames
      });
    }

    // 3. Asignar la propiedad Tubo 1x1 (isNarrow) a narrowCount tubos (todos mantienen capacidad de 4 líquidos, igual que en el modo historia)
    if (narrowCount > 0) {
      const narrowCandidates = tubes.filter(t => !t.isGlued && t.capacity === 4);
      for (let i = narrowCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [narrowCandidates[i], narrowCandidates[j]] = [narrowCandidates[j], narrowCandidates[i]];
      }
      const chosenNarrow = narrowCandidates.slice(0, Math.min(narrowCount, narrowCandidates.length));
      chosenNarrow.forEach(t => {
        t.isNarrow = true;
        t.capacity = 4; // Garantizar que el tubo 1x1 siempre tenga lugar para 4 líquidos
      });
    }

    // 4. Distribuir y mezclar los líquidos entre los tubos con líquido
    this.distributeAndShuffle(tubes, actualSeed);

    // 5. Aplicar candados con llave (lockCount) si corresponde
    if (lockCount > 0 && tubes.length > 0) {
      let lockCandidates = tubes.filter(t => !t.isGlued && !t.isNarrow && t.liquids.length >= 2);
      if (lockCandidates.length === 0) {
        lockCandidates = tubes.filter(t => !t.isGlued && t.liquids.length >= 2);
      }
      for (let i = lockCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [lockCandidates[i], lockCandidates[j]] = [lockCandidates[j], lockCandidates[i]];
      }
      const actualLocks = Math.min(lockCount, Math.max(0, lockCandidates.length - 1));
      for (let lIdx = 0; lIdx < actualLocks; lIdx++) {
        const lockTube = lockCandidates[lIdx];
        lockTube.isLocked = true;
        const keyColorObj = activeColors[Math.floor(rnd() * activeColors.length)];
        lockTube.keyColor = keyColorObj.hex;
        lockTube.keyColorName = keyColorObj.name;
      }

      // Asegurar que al menos una llave esté en un tubo accesible
      const unlockedWithLiquids = tubes.filter(t => !t.isLocked && !t.isGlued && t.liquids.length >= 2);
      if (unlockedWithLiquids.length > 0) {
        tubes.filter(t => t.isLocked).forEach((lockTube) => {
          const hasAccessibleKey = unlockedWithLiquids.some(ut => ut.liquids.some(l => l.color === lockTube.keyColor));
          if (!hasAccessibleKey) {
            const targetUnlocked = unlockedWithLiquids[Math.floor(rnd() * unlockedWithLiquids.length)];
            const swapIdx = Math.max(0, targetUnlocked.liquids.length - 2);
            for (let ti = 0; ti < tubes.length; ti++) {
              if (!tubes[ti].isLocked) continue;
              const li = tubes[ti].liquids.findIndex(l => l.color === lockTube.keyColor);
              if (li !== -1) {
                const temp = targetUnlocked.liquids[swapIdx];
                targetUnlocked.liquids[swapIdx] = tubes[ti].liquids[li];
                tubes[ti].liquids[li] = temp;
                break;
              }
            }
          }
        });
      }
    }

    // 6. Aplicar estados de misterio en Sandbox (la capa superior siempre descubierta)
    if (hasMystery) {
      tubes.forEach(tube => {
        if (tube.isGlued || tube.liquids.length === 0) return;
        tube.liquids.forEach((liq, idx) => {
          liq.isMystery = (idx < tube.liquids.length - 1) && !liq.isChameleon;
        });
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
        tube.liquids.forEach(liq => { liq.isMystery = false; });
      });
    }

    // 7. Mezclar el orden de las botellas en el tablero de forma aleatoria
    // (respetando las cantidades de tubos elegidas, de modo que vacíos, gigantes, 1x1, candados, etc. queden en posiciones aleatorias)
    for (let i = tubes.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [tubes[i], tubes[j]] = [tubes[j], tubes[i]];
    }
    tubes.forEach((t, idx) => {
      t.id = idx;
    });

    const activeMechanicNames = [];
    if (hasMystery) activeMechanicNames.push('Misterio');
    if (giantCount > 0) activeMechanicNames.push(`Gigante x${giantCount}`);
    if (lockCount > 0) activeMechanicNames.push(`Candado x${lockCount}`);
    if (narrowCount > 0) activeMechanicNames.push(`Tubo 1x1 x${narrowCount}`);
    if (hasGlued) activeMechanicNames.push('En Roca');
    if (hasChameleon) activeMechanicNames.push('Camaleón');
    if (fragileCount > 0) activeMechanicNames.push(`Frágil x${fragileCount}`);

    return {
      level: 'casual_sandbox',
      isCasualSandbox: true,
      title: `Modo Casual (${totalTubes} Tubos, ${numColors} Colores)`,
      name: `Alquimia Infinita #${actualSeed % 100000}`,
      mechanicTag: activeMechanicNames.length > 0 ? activeMechanicNames.join(' • ') : 'Puro y Relajante',
      optimalMoves: numColors * 3 + 6,
      totalTubes: totalTubes,
      totalColors: numColors,
      tubes: tubes,
      config: { tubeCount: totalTubes, colorCount: numColors, mechanics, mechanicCounts, seed: actualSeed }
    };
  }

  // --- ASIGNACIÓN ESCALONADA DE MECÁNICAS (PRIMEROS 3 NIVELES PUROS, DESPUÉS COMBINACIONES) ---
  static getMechanicsForLevel(levelNum) {
    const level = Math.max(1, Math.min(100, levelNum));
    const section = Math.floor((level - 1) / 10) + 1; // 1 a 10
    const step = ((level - 1) % 10) + 1; // 1 a 10 (primeros 3 puros de la nueva mecánica)

    let rawHasMystery = false;
    let rawHasGiant = false;
    let rawHasSuperGiant = false;
    let rawHasLock = false;
    let rawHasNarrow = false;
    let rawHasGlued = false;
    let rawHasChameleon = false;
    let rawHasFragile = false;
    let rawIsSuperFragile = false;

    if (section === 1) {
      // 1-10: Fundamentos (Básico)
    } else if (section === 2) {
      // 11-20: Líquidos Misterio '?'
      rawHasMystery = true;
    } else if (section === 3) {
      // 21-30: Frasco Gigante (Max 6)
      rawHasGiant = true;
      if (step >= 4) {
        // Sumar mecánica anterior: Misterio
        if (step === 5 || step === 7 || step === 8 || step === 10) {
          rawHasMystery = true;
        }
      }
    } else if (section === 4) {
      // 31-40: Candado con Llave Oculta
      rawHasLock = true;
      if (step >= 4) {
        // Sumar mecánicas anteriores: Misterio y Gigante
        if (step === 4 || step === 7 || step === 9 || step === 10) rawHasMystery = true;
        if (step === 5 || step === 8 || step === 9 || step === 10) rawHasGiant = true;
      }
    } else if (section === 5) {
      // 41-50: Tubo Estrecho (1x1)
      rawHasNarrow = true;
      if (step >= 4) {
        // Sumar mecánicas anteriores: Candado, Gigante, Misterio
        if (step === 4 || step === 7 || step === 8 || step === 10) rawHasMystery = true;
        if (step === 5 || step === 7 || step === 9 || step === 10) rawHasGiant = true;
        if (step === 6 || step === 8 || step === 9 || step === 10) rawHasLock = true;
      }
    } else if (section === 6) {
      // 51-60: Frasco en Roca (Inamovible)
      rawHasGlued = true;
      if (step >= 4) {
        // Sumar mecánicas anteriores: Estrecho, Candado, Gigante, Misterio
        if (step === 4 || step === 8 || step === 10) rawHasMystery = true;
        if (step === 5 || step === 8 || step === 10) rawHasGiant = true;
        if (step === 6 || step === 9) rawHasLock = true;
        if (step === 7 || step === 9 || step === 10) rawHasNarrow = true;
      }
    } else if (section === 7) {
      // 61-70: Líquido Camaleón
      rawHasChameleon = true;
      if (step >= 4) {
        // Sumar mecánicas anteriores: Roca, Estrecho, Candado, Gigante, Misterio
        if (step === 4 || step === 9 || step === 10) rawHasMystery = true;
        if (step === 5 || step === 9) rawHasGiant = true;
        if (step === 6 || step === 9) rawHasLock = true;
        if (step === 7 || step === 10) rawHasNarrow = true;
        if (step === 8 || step === 10) rawHasGlued = true;
      }
    } else if (section === 8) {
      // 71-80: Cristal de Afinidad / Frágil
      rawHasFragile = true;
      if (step >= 4) {
        // Sumar mecánicas anteriores: Camaleón, Roca, Estrecho, Candado, Gigante, Misterio
        if (step === 4 || step === 9) rawHasMystery = true;
        if (step === 5 || step === 10) rawHasGiant = true;
        if (step === 6 || step === 10) rawHasLock = true;
        if (step === 7) rawHasNarrow = true;
        if (step === 8 || step === 10) rawHasChameleon = true;
        if (step === 9) rawHasGlued = true;
      }
    } else if (section === 9) {
      // 81-90: Conjunción Híbrida / Súper Gigante (Max 8)
      if (step <= 3) {
        rawHasSuperGiant = true;
        if (step === 2) rawHasMystery = true;
        if (step === 3) rawHasLock = true;
      } else {
        if (step === 4) { rawHasSuperGiant = true; rawHasGlued = true; rawHasMystery = true; }
        else if (step === 5) { rawHasChameleon = true; rawHasNarrow = true; rawHasLock = true; }
        else if (step === 6) { rawHasSuperGiant = true; rawHasChameleon = true; rawHasLock = true; }
        else if (step === 7) { rawHasGlued = true; rawHasNarrow = true; rawHasFragile = true; rawIsSuperFragile = true; }
        else if (step === 8) { rawHasSuperGiant = true; rawHasNarrow = true; rawHasFragile = true; rawIsSuperFragile = true; }
        else if (step === 9) { rawHasSuperGiant = true; rawHasGlued = true; rawHasLock = true; rawHasChameleon = true; }
        else if (step === 10) { rawHasSuperGiant = true; rawHasNarrow = true; rawHasLock = true; rawHasChameleon = true; rawHasMystery = true; }
      }
    } else if (section === 10) {
      // 91-100: La Gran Obra Magna
      if (step === 1) { rawHasGiant = true; rawHasMystery = true; rawHasLock = true; }
      else if (step === 2) { rawHasNarrow = true; rawHasGlued = true; rawHasChameleon = true; }
      else if (step === 3) { rawHasSuperGiant = true; rawHasFragile = true; rawHasMystery = true; }
      else if (step === 4) { rawHasGlued = true; rawHasNarrow = true; rawHasLock = true; rawHasMystery = true; }
      else if (step === 5) { rawHasGiant = true; rawHasChameleon = true; rawHasFragile = true; rawHasLock = true; }
      else if (step === 6) { rawHasSuperGiant = true; rawHasGlued = true; rawHasNarrow = true; rawHasMystery = true; }
      else if (step === 7) { rawHasFragile = true; rawIsSuperFragile = true; rawHasChameleon = true; rawHasLock = true; rawHasGiant = true; }
      else if (step === 8) { rawHasSuperGiant = true; rawHasGlued = true; rawHasLock = true; rawHasMystery = true; rawHasChameleon = true; }
      else if (step === 9) { rawHasSuperGiant = true; rawHasFragile = true; rawIsSuperFragile = true; rawHasNarrow = true; rawHasGlued = true; rawHasLock = true; }
      else if (step === 10) {
        // Nivel 100 final supremo
        rawHasSuperGiant = true;
        rawHasChameleon = true;
        rawHasLock = true;
        rawHasNarrow = true;
        rawHasGlued = true;
        rawHasMystery = true;
      }
    }

    return {
      rawHasMystery,
      rawHasGiant,
      rawHasSuperGiant,
      rawHasLock,
      rawHasNarrow,
      rawHasGlued,
      rawHasChameleon,
      rawHasFragile,
      rawIsSuperFragile
    };
  }
}

window.LevelGenerator = LevelGenerator;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LevelGenerator;
}

