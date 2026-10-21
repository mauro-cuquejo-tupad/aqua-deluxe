# AquaSort Master Deluxe — Documento de Especificación de Requerimientos (SRS)

---

## 1. Visión General del Producto

**AquaSort Master Deluxe** es un videojuego web de puzzles de clasificación de fluidos basado en lógica, paciencia y estrategia. El usuario interactúa con frascos cilíndricos transparentes que contienen sustancias alquímicas segmentadas de distintos colores y símbolos, con el objetivo de consolidar cada sustancia en frascos monocromáticos uniformes mediante una serie finita de transferencias ordenadas.

El diseño prioriza la accesibilidad cognitiva y visual (daltonismo y baja visión), una curva de dificultad progresiva estructurada en 100 niveles deterministas garantizados como resolubles mediante simulación matemática, física procedural de fluidos en canvas/SVG, un sistema de vidas con regeneración temporal, una economía balanceada y minijuegos de riesgo calculado (Diana Balística y Ruleta Aleatorizada).

---

## 2. Requerimientos Funcionales y Mecánicas de Juego

### 2.1. Reglas Fundamentales de Clasificación
1. **Capacidad y Segmentación:**
   - La capacidad estándar ($C$) de un tubo convencional es de 4 unidades discretas.
   - Cada tubo contiene entre 0 y $C$ unidades de líquido.
2. **Condiciones de Vertido (Pour):**
   - El trasvase desde un tubo origen $T_A$ hacia un tubo destino $T_B$ es legal si y solo si:
     - $T_A$ contiene al menos una unidad de líquido ($|T_A| > 0$).
     - $T_A$ **no es un Frasco Pegado** (los frascos pegados solo admiten entrada de fluido, jamás emisión).
     - $T_B$ no ha alcanzado su capacidad máxima ($|T_B| < C_B$).
     - $T_B$ no está bloqueado por candado.
     - Se cumple una de las siguientes:
       - $T_B$ está completamente vacío ($|T_B| = 0$).
       - El líquido superior de $T_A$ coincide en color con el líquido superior de $T_B$.
       - Uno de los dos líquidos superiores posee la propiedad especial **Camaleón**.
3. **Cálculo de Volumen Transferido:**
   - Se trasladan todas las unidades contiguas superiores del mismo color presentes en $T_A$, hasta agotar el espacio libre disponible en $T_B$:
     $$\Delta V = \min(\text{consecutivas}(T_A, \text{color\_tope}), C_B - |T_B|)$$
   - Si no caben todas las unidades del grupo, solo se vierte la porción máxima admitida y el remanente permanece en $T_A$.
   - **Excepción Tubo Estrecho:** En tubos estrechos, el caudal máximo por movimiento es $\Delta V = 1$.
4. **Desbloqueo de Líquidos Misteriosos Consecutivos:**
   - Cuando una capa misteriosa (`?`) es descubierta en la superficie tras un vertido, el sistema analiza en cascada las capas inmediatamente inferiores.
   - Si una o más capas ocultas contiguas comparten el mismo color que la capa recién revelada, **se desbloquean todas en simultáneo**, ahorrando movimientos repetitivos al jugador.

---

### 2.2. Curva de Dificultad Progresiva (100 Niveles)

El juego distribuye mecánicas cada 5 a 10 niveles para mantener la frescura del puzzle:

| Rango de Niveles | Denominación de Mecánica | Regla Específica de Comportamiento |
| :--- | :--- | :--- |
| **1 – 4** | **Básico / Fundamentos** | 3 a 4 colores estándar, 2 botellas vacías de amortiguación, visibilidad total al 100%. |
| **5 – 9** | **Líquidos Misterio (`?`)** | Capas inferiores con textura opaca y el glifo `?`. Al descubrir la superficie, revela su color real. Si hay capas ocultas consecutivas del mismo color, se desbloquean juntas. |
| **10 – 14** | **Botella Gigante (Capacidad 5/6)** | Tubos con $C = 5$ o $C = 6$. Exigen acumular más unidades del mismo color en un único recipiente. |
| **15 – 19** | **Candado con Llave Oculta** | Tubo sellado por un candado de color $K$. No recibe ni emite fluidos hasta verter sobre él una unidad del color $K$. La llave se encuentra enterrada bajo otras capas. |
| **20 – 24** | **Tubo Angosto (1x1)** | Frasco de diámetro reducido que restringe el trasvase a una sola unidad ($\Delta V = 1$) por interacción. |
| **25 – 29** | **Frasco Inamovible (En la Roca)** | Tubo enterrado en la piedra como la espada de Excalibur. Contiene a lo sumo 1/4 de líquido normal (nunca misterio) o parte vacío. Puede recibir líquidos normales coincidentes o camaleón, pero **nunca puede vaciarse**. Si el jugador comete un error vertiendo líquido incompatible, queda obligado a reiniciar. |
| **30 – 34** | **Líquido Camaleón** | Unidades cromáticas que adoptan el color del líquido receptor. Actúan como frontera estricta y transmutan dinámicamente. |
| **35 – 39** | **Frascos Frágiles** | Tubos que sufren desgaste por transferencia de reactivos. Tras un número determinado de operaciones, se fisuran e inhabilitan. |
| **40 – 100** | **Modos Híbridos y Desafíos Maestros** | Combinaciones cruzadas de múltiples mecánicas en tableros de 7 a 10 frascos, garantizados como resolubles mediante solver algorítmico. |

---

### 2.3. Sistema de Vidas y Regeneración Temporal

1. **Capacidad Máxima:** El jugador dispone de un máximo de **3 vidas** ($\heartsuit\heartsuit\heartsuit$).
2. **Regeneración Automática:**
   - Cada vida perdida tarda **10 minutos (600 segundos)** en regenerarse automáticamente.
   - El tiempo transcurre de forma continua en tiempo real mediante estampas de tiempo (`lastLifeLostTimestamp`) persistidas en `localStorage`.
   - El encabezado del juego exhibe un contador dinámico decreciente: `+1 en MM:SS`.
3. **Consumo de Vidas:**
   - Se consume 1 vida al reiniciar un nivel desde el diálogo de confirmación.
4. **Compra en el Mercado:**
   - El jugador puede reponer vidas en la Tienda Alquímica:
     - **+1 Vida Inmediata:** 25🪙
     - **Recarga Completa (3 Vidas):** 60🪙

---

### 2.4. Economía Rebalanceada y Tienda de Mejoras

Para evitar la inflación rápida y dar valor al progreso, la economía se ha ajustado estrictamente:
- **Recompensas por Nivel:**
  - Victoria en tiempo y movimientos estándar: **2 a 4 monedas base** 🪙.
  - Desafíos secundarios: bonificación calculada.
- **Costes de Mejoras en la Tienda:**
  - Reducción de Enfriamiento de Botella Auxiliar: Nivel 1 (80🪙) • Nivel 2 (180🪙) • Nivel 3 (350🪙).
  - Almacén de Pistas Máximas: Nivel 1 (60🪙) • Nivel 2 (150🪙).
  - Paquete de 3 Pistas Guiadas: 45🪙.
  - Recarga Instantánea de Botella: 40🪙.
  - Seguro Protector de Fortuna (Anti-pérdida en Ruleta/Diana): 120🪙.

---

### 2.5. Minijuegos de Fortuna: Diana Alquímica y Ruleta Aleatorizada

Disponible al ganar un nivel para multiplicar las monedas obtenidas. Sin textos de ayuda obvia (*"Fuerza óptima"* eliminado para fomentar la destreza del jugador).

#### Modo A: Diana de Dardos con Balística de Viento
- **Física Vectorial:** Un indicador meteorológico muestra la velocidad del viento ($1.2$ a $6.0\text{ m/s}$) y su dirección angular mediante brújula giratoria.
- **Apuntado y Compensación:** El jugador desplaza una retícula láser interactiva y carga la fuerza de disparo.
- **Desvío Balístico:** El dardo sufre una desviación proporcional a la velocidad y ángulo del viento:
  $$\Delta X = \cos(\theta_{\text{viento}}) \times (v \times 8.5) + \text{jitter}, \quad \Delta Y = \sin(\theta_{\text{viento}}) \times (v \times 8.5) + \text{jitter}$$
- **Multiplicadores Concéntricos:**
  - **Bullseye Dorado (Centro):** Multiplicador $\times 3.0$.
  - **Anillo Interior:** Multiplicador $\times 2.0$.
  - **Anillo Medio:** Multiplicador $\times 1.5$.
  - **Anillo Exterior:** Multiplicador $\times 1.2$.
  - **Fuera de la Diana:** Pierde el 50% del premio ganado (o protegido si posee Seguro).

#### Modo B: Ruleta Alquímica Aleatorizada
- **Anti-Memoria Muscular:** En cada ronda, el orden de los 6 sectores de color se reorganiza aleatoriamente mediante Fisher-Yates y la rueda parte desde un ángulo inicial estocástico.
- **Reglas de Apuesta:**
  - **1 Color Elegido:** Multiplicador $\times 2.0$. Si no acierta, **pierde el 50%** de las monedas del nivel.
  - **2 Colores Elegidos:** Multiplicador $\times 1.5$. Si no acierta, **pierde el 100% (todo el premio)** del nivel.

---

### 2.6. Pantallas de Tutorial Interactivo con Animación

Cada vez que el jugador alcanza por primera vez un nivel que introduce una mecánica nueva (Líquido Misterio, Botella Gigante, Candado y Llave, Tubo Angosto, Frasco Pegado, Camaleón o Frasco Frágil), se despliega automáticamente una ventana modal interactiva (`#modal-tutorial`):
- Muestra el nombre y descripción didáctica de la regla.
- Reproduce una **animación gráfica continua en bucle (CSS Looper)** que simula la interacción física del frasco y sus reactivos.
- Una vez visualizada, se registra en `state.seenTutorials` para no interrumpir partidas futuras.

---

### 2.7. Asistencias, Pistas y Penalización en Clasificaciones

1. **Pistas Guiadas (BFS Solver):**
   - Resalta el tubo de origen en Dorado Neón (`1. ORIGEN 👆`) y el destino en Verde Esmeralda (`2. DESTINO 🎯`).
2. **Penalización en Leaderboards por Uso de Pistas:**
   - Si el jugador utiliza una o más pistas durante un nivel (`hintsUsedInLevel > 0`), la partida queda **marcada con insignia de advertencia** (`⚠️ Con Pistas`).
   - El resultado **no clasifica ni se inscribe en la Tabla de Clasificaciones Global**, preservando la competitividad justa.
3. **Persistencia del Contador de Botella Auxiliar:**
   - El enfriamiento de 100 movimientos de la botella auxiliar se mantiene persistente en `state.auxiliaryCooldownRemaining`.
   - **Los reinicios de nivel o fallos jamás resetean este contador a cero.**
4. **Reinicio de Nivel con Variación de Semilla (Reroll Determinista):**
   - El botón Reiniciar abre un diálogo modal de confirmación.
   - Advierte al usuario que se consumirá 1 vida y que la semilla del nivel cambiará para impedir la memorización estática de movimientos.

---

### 2.8. Taller de Creación y Publicación de Niveles (Level Editor)

El juego incluye un taller integrado de diseño de niveles:
1. **Configuración de Frascos:**
   - Añadir o eliminar frascos (de 3 a 10 frascos).
   - Tipos de frascos disponibles: Normal, Pegado (Solo Entrada), Candado con Llave, Frasco Gigante (Capacidad 6), Frasco Angosto (1x1) y Frasco Frágil.
2. **Paleta Alquímica:**
   - Pincel de pintura para asignar colores a cada capa individual.
   - Conmutador para ocultar capas como Líquido Misterio (`?`).
3. **Condición de Publicación Obligatoria:**
   - El botón **"Publicar Nivel"** se encuentra estrictamente bloqueado.
   - El autor debe pulsar **"Probar Nivel"** y superarlo con éxito al menos una vez para certificar que el puzzle es matemáticamente resoluble.
4. **Metadatos y Autoría:**
   - Nombre personalizado del nivel.
   - Nombre o alias del creador.
   - Los niveles publicados quedan guardados en `localStorage` y disponibles en el gestor de niveles de la comunidad para jugar, editar o exportar.

---

## 3. Requerimientos de Accesibilidad y Diseño Visual

### 3.1. Identificación Multimodal para Daltonismo
Cada sustancia combina un color vibrante con un glifo geométrico distintivo:
- **Rojo:** ● (Círculo)
- **Azul:** ▲ (Triángulo)
- **Verde:** ■ (Cuadrado)
- **Amarillo:** ★ (Estrella)
- **Morado:** ◆ (Rombo)
- **Naranja:** ✚ (Cruz)
- **Rosa:** ♥ (Corazón)
- **Cian:** ✦ (Destello)
- **Marrón:** ⬟ (Pentágono)

### 3.2. Lupa Flotante e Indicador de Accesibilidad
- Al enfocar un tubo, emerge una tarjeta translúcida con el símbolo ampliado y el nombre textual del líquido superior.
- Compatible con lectores de pantalla y modo de alto contraste.

---

## 4. Persistencia y Exportación de Datos

El progreso se almacena localmente y puede exportarse/importarse en formato JSON:
```json
{
  "player": {
    "nickname": "Alquimista",
    "coins": 32,
    "lives": 3,
    "lastLifeLostTimestamp": null
  },
  "upgrades": {
    "cooldownReductionLevel": 0,
    "maxStoredHints": 3,
    "rouletteBoost": false
  },
  "seenTutorials": {
    "mystery": true,
    "glued": true
  },
  "customLevels": [
    {
      "id": "custom_1729465200000",
      "name": "Frascos Gemelos",
      "author": "Maestro Alquimista",
      "verified": true,
      "tubes": []
    }
  ]
}
```

---

## 5. Checklist de Verificación y Criterios de Aceptación

- [x] **Desbloqueo de Líquidos Misteriosos Consecutivos:** Si al revelar una capa `?` hay otra contigua del mismo color debajo, se revelan ambas simultáneamente.
- [x] **Diana de Dardos con Viento:** Cálculo balístico funcional con desvío en $X$ e $Y$ según ángulo y fuerza del viento.
- [x] **Ruleta Aleatorizada:** Sectores barajados y ángulo inicial estocástico sin cartel de fuerza óptima; penalizaciones de 50% con 1 color y 100% con 2 colores.
- [x] **Tutoriales Interactivos:** Modales explicativos con animaciones looper automáticos en la primera aparición de cada mecánica.
- [x] **Frasco Pegado:** Tubo fijado con insignia `SOLO ENTRADA ⬇` que bloquea intentos de vaciado con sonido de error y sacudida.
- [x] **Sistema de Vidas:** 3 vidas máximas, 10 min de recarga por vida, HUD con reloj y compra en tienda.
- [x] **Economía Rebalanceada:** 2–4 monedas por nivel y precios de mejoras acordes.
- [x] **Penalización de Pistas:** Partidas ganadas con pistas no ingresan a la tabla de líderes.
- [x] **Reinicio con Semilla Nueva:** Advierte al usuario, consume 1 vida y regenera una variante diferente del nivel.
- [x] **Enfriamiento Persistente:** Los reinicios nunca resetean el contador de movimientos de la botella auxiliar.
- [x] **Editor de Niveles Completo:** Creación de frascos con todas las mecánicas, validación de victoria obligatoria antes de publicar, nombre y autoría.