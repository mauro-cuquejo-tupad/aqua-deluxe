/* ==========================================================================
   AQUASORT MASTER DELUXE - LEVEL GENERATOR (100 NIVELES)
   Generación determinista, progresión escalonada de mecánicas cada 5 niveles,
   variación de semillas al reiniciar (seed reroll) y revelación de bloques contiguos.
   ========================================================================== */

class LevelGenerator {
  static generate(levelNum, seedVariation = 0) {
    const level = Math.max(1, Math.min(100, levelNum));

    // Progresión de cantidad de colores
    let colorCount = 3 + Math.floor((level - 1) / 12);
    colorCount = Math.min(colorCount, 8); // Máximo 8 colores simultáneos
    const emptyCount = 2;
    const capacity = 4;

    // Activación progresiva de mecánicas
    const hasMystery = level >= 5;
    const hasGiant = (level >= 10 && level < 15) || (level >= 40 && level % 3 === 0);
    const hasLock = (level >= 15 && level < 20) || (level >= 45 && level % 4 === 0);
    const hasNarrow = (level >= 20 && level < 25) || (level >= 50 && level % 5 === 0);
    const hasGlued = (level >= 25 && level < 30) || (level >= 55 && level % 4 === 1);
    const hasChameleon = (level >= 30 && level < 35) || (level >= 60 && level % 3 === 1);
    const hasFragile = (level >= 35 && level < 40) || (level >= 65 && level % 5 === 2);

    let mechanicTag = 'Básico';
    let primaryMechanicId = 'basic';

    if (level >= 40) {
      mechanicTag = 'Desafío Alquímico Híbrido';
      primaryMechanicId = 'hybrid';
    } else if (hasFragile) {
      mechanicTag = 'Cristal Frágil (3 Usos)';
      primaryMechanicId = 'fragile';
    } else if (hasChameleon) {
      mechanicTag = 'Líquido Camaleón';
      primaryMechanicId = 'chameleon';
    } else if (hasGlued) {
      mechanicTag = 'Frasco Pegado (Solo Recibe)';
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
        isNarrow: (hasNarrow && i === 2),
        isGlued: false,
        isFragile: (hasFragile && i === 0),
        operationsRemaining: (hasFragile && i === 0 ? 3 : null)
      });
    }

    // 2. Agregar frascos vacíos de trabajo o frasco inamovible (en la roca)
    for (let i = 0; i < emptyCount; i++) {
      const isGluedTube = (hasGlued && i === 0);
      let initialGluedLiquids = [];

      // REGLA USUARIO: Las botellas inamovibles deben tener como máximo 1/4 de líquido (1 unidad)
      // y SOLO de líquido normal (nunca misterio). El nivel garantiza que sea 100% resoluble.
      if (isGluedTube) {
        const startWithQuarter = (seedVariation % 2 === 0);
        if (startWithQuarter && tubes.length > 0 && tubes[0].liquids.length > 1) {
          const sample = tubes[0].liquids.pop();
          initialGluedLiquids.push({
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

      tubes.push({
        id: colorCount + i,
        capacity: capacity,
        liquids: initialGluedLiquids,
        isLocked: false,
        keyColor: null,
        isNarrow: false,
        isGlued: isGluedTube, // Frasco inamovible: solo puede recibir líquidos
        isFragile: false,
        operationsRemaining: null
      });
    }

    // 3. Mezclar deterministamente según la semilla del nivel + variación por reintentos
    const effectiveSeed = level * 7919 + seedVariation * 1337 + 12345;
    this.shuffleDeterministically(tubes, effectiveSeed);

    // 4. Aplicar candado si corresponde
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

  static shuffleDeterministically(tubes, seed) {
    let s = (seed * 1103515245 + 12345) & 0x7fffffff;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const steps = 32 + (seed % 17);
    for (let step = 0; step < steps; step++) {
      const fromIdx = Math.floor(rnd() * (tubes.length - 2));
      const toIdx = Math.floor(rnd() * tubes.length);

      if (fromIdx !== toIdx) {
        const fromT = tubes[fromIdx];
        const toT = tubes[toIdx];

        // Ni origen ni destino pueden ser un frasco inamovible (mantiene su 1/4 o vacío puro)
        if (fromT.liquids.length > 1 && toT.liquids.length < toT.capacity && !toT.isLocked && !fromT.isGlued && !toT.isGlued) {
          const popped = fromT.liquids.pop();
          toT.liquids.push(popped);
        }
      }
    }
  }
}

window.LevelGenerator = LevelGenerator;
