# AquaSort Master Deluxe — Documento de Especificación de Requerimientos (SRS)

---

## 1. Visión General del Producto

**AquaSort Master Deluxe** es un videojuego web de puzzles de clasificación de fluidos basado en lógica y paciencia, sin penalizaciones por vidas ni estados de bloqueo irreversibles. El usuario interactúa con frascos cilíndricos transparentes que contienen líquidos segmentados de distintos colores y símbolos, con el objetivo de consolidar cada sustancia en frascos monocromáticos uniformes mediante una serie finita de transferencias ordenadas.

El diseño prioriza la accesibilidad cognitiva y visual (daltonismo y baja visión), una curva de dificultad progresiva estructurada en 100 niveles deterministas garantizados como resolubles mediante simulación matemática, física procedural de fluidos en canvas/SVG y una economía de juego balanceada complementada por minijuegos de riesgo calculado.

---

## 2. Requerimientos Funcionales y Mecánicas de Juego

### 2.1. Reglas Fundamentales de Clasificación
1. **Capacidad y Segmentación:**
   - La capacidad estándar ($C$) de un tubo convencional es de 4 unidades discretas.
   - Cada tubo contiene entre 0 y $C$ unidades de líquido.
2. **Condiciones de Vertido (Pour):**
   - El trasvase desde un tubo origen $T_A$ hacia un tubo destino $T_B$ solo es legal si y solo si:
     - $T_A$ contiene al menos una unidad de líquido ($|T_A| > 0$).
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
   - **Excepción Tubo Estrecho:** En tubos estrechos, el caudal máximo por movimiento es $\Delta V = 1$, independientemente de cuántas unidades del mismo color haya contiguas.

---

### 2.2. Curva de Dificultad Progresiva (100 Niveles)

El juego escala mecánicas cada 5 niveles para renovar el reto cognitivo:

| Rango de Niveles | Denominación de Mecánica | Regla Específica de Comportamiento |
| :--- | :--- | :--- |
| **1 – 4** | **Básico / Fundamentos** | 3 a 4 colores estándar, 2 botellas vacías de amortiguación, visibilidad total al 100%. |
| **5 – 9** | **Líquidos Misterio (`?`)** | Las capas inferiores a la superficie se representan con textura opaca y el glifo `?`. Al liberar la capa superior que las cubre, se descubre permanentemente su color real. |
| **10 – 14** | **Botella Gigante (Capacidad 6)** | Se introduce al menos un tubo con $C = 6$. Exige al jugador acumular 6 unidades de un color específico disperso en el tablero. |
| **15 – 19** | **Candado con Llave Oculta** | Un tubo se encuentra sellado por un candado de color $K$. No recibe ni emite líquidos hasta verter sobre él una unidad del color $K$. **Regla de integridad:** La llave $K$ debe existir obligatoriamente en un tubo no bloqueado y debe estar sepultada debajo de al menos otra capa de color distinto (dos puzzles en uno: rescate y ordenamiento). |
| **20 – 24** | **Tubo Angosto (1x1)** | Frasco de diámetro reducido que restringe el trasvase a una sola unidad ($\Delta V = 1$) por interacción, forzando múltiples maniobras secuenciales. |
| **25 – 100** | **Líquido Camaleón y Modos Híbridos** | Unidades que adoptan el color del líquido receptor. Actúan como frontera estricta: nunca se transfieren accidentalmente junto a bloques superiores. Sólo al quedar en el tope, el jugador decide conscientemente su destino. |

---

### 2.3. Sistema de Combos y Cierre de Nivel
1. **Evaluación de Frascos Consecutivos:**
   - Tras la última jugada legal que completa el tablero, se evalúa la hilera de frascos de izquierda a derecha comenzando estrictamente en el índice 0.
   - Por cada frasco lleno con un único color sin capas de misterio, se incrementa el multiplicador de combo ($+1$).
   - Si se detecta un tubo vacío o incompleto antes de otros tubos llenos, la racha de combo se detiene inmediatamente.
2. **Animación de Tapones de Corcho:**
   - Cada tubo validado en el combo recibe secuencialmente un tapón de madera biselado con animación elástica de sellado vertical y un tono armónico ascendente en la escala pentatónica.
   - Aparece un distintivo flotante neón (`Combo xN ⭐`) sobre cada tubo completado.

---

### 2.4. Desafíos Especiales Opcionales (+10 🪙)
- En cada nivel generado, se deduce mediante resolución heurística un objetivo secundario factible garantizado (ej. *"Completar en $\le M$ movimientos"*, *"Consolidar el color Verde en el primer frasco"*, o *"Resolver sin utilizar botellas auxiliares"*).
- El desafío se exhibe en una tarjeta lateral persistente durante la partida.
- Su cumplimiento otorga 10 monedas directas reflejadas en el balance final del nivel.

---

### 2.5. Minijuego: Ruleta de la Fortuna (Multiplicador de Recompensas)
- **Acceso:** Disponible al finalizar con victoria, opcional y configurable en ajustes (se puede omitir para cobro directo seguro).
- **Estructura Física del Disco:**
  - 6 sectores angulares idénticos ($60^\circ$ c/u).
  - 3 colores distribuidos alternadamente: Rojo (2 sectores), Azul (2 sectores), Verde (2 sectores).
  - 6 clavijas metálicas doradas (*pegs*) ubicadas exactamente en los radios divisorios.
  - Marcador de lectura superior centrado a $270^\circ$ con clacker flexible animado.
- **Mecánica de Selección:**
  - **1 Color:** Multiplicador $\times 2.0$.
  - **2 Colores:** Multiplicador $\times 1.5$.
- **Medidor de Fuerza de Giro:**
  - Control por pulsación continua (`mousedown` / `touchstart`).
  - La barra de potencia incrementa de 0% a 100%. A mayor carga, mayor velocidad inicial y cantidad de revoluciones angulares.
  - **Zona de Sobrepresión (Fallo):** Si la potencia supera el 95%, el tiro se invalida por sobrecarga con alerta acústica y se reinicia la barra.
- **Aterrizaje y Compensación:**
  - El algoritmo de detención garantiza que la aguja se sitúe siempre en el interior del arco del sector ($\pm 5^\circ$ respecto a la bisectriz), imposibilitando detenciones ambiguas sobre la clavija divisoria.
  - **Resultado Favorable:** Se acredita el premio multiplicado y suena una fanfarria con aplausos.
  - **Resultado No Coincidente:** El jugador conserva el 50% de las monedas base acumuladas en el nivel.

---

### 2.6. Asistencias al Jugador
1. **Deshacer Ilimitado (Undo):**
   - Pila de estados históricos en memoria que registra matrices completas de tubos.
   - Revierte vertidos, estado de candados y decrementa el contador de movimientos.
2. **Botella Auxiliar (+ Botella):**
   - Permite invocar temporalmente un tubo vacío adicional de capacidad 4.
   - Máximo 1 botella auxiliar activa a la vez.
   - Entra en enfriamiento (*cooldown*) de 100 movimientos de juego real antes de habilitarse de nuevo (o se reactiva de inmediato en la tienda de mejoras).
3. **Pistas Guiadas de 3 Movimientos:**
   - Motor de búsqueda en anchura (BFS) heurístico que analiza jugadas válidas hacia la resolución óptima.
   - Resalta el tubo de origen en **Dorado Neón** (`tube-hint-source`) con insignia `1. ORIGEN 👆` y el tubo destino en **Verde Esmeralda** (`tube-hint-dest`) con insignia `2. DESTINO 🎯`.
   - Si el usuario ejecuta un movimiento no contemplado por la pista, el sistema recalcula en tiempo real las referencias visuales.
4. **Semilla y Simplificación (Reroll Suave):**
   - El botón *Reiniciar* restaura el puzzle exactamente a partir de la misma semilla pseudoaleatoria.
   - El botón *Simplificar* (coste: 15 monedas) regenera una variante donde la llave del candado se ubica más cerca de la superficie o se reducen fragmentaciones de color.

---

### 2.7. Editor de Niveles y Modo Post-Juego (Caos)
1. **Taller de Creación (Editor):**
   - Configuración de cantidad de tubos (hasta 10), capacidades (4 o 6), propiedades de candado/llave y capas con estados misterio o camaleón.
   - **Protocolo de Validación Estricto:** Un nivel creado no puede ser publicado en el mapa comunitario hasta que su autor lo juegue y complete al 100% en el entorno de pruebas.
2. **Modo Maestro Caos (Post-Nivel 100):**
   - Se desbloquea tras superar los 100 niveles del modo historia.
   - Añade mecánicas como:
     - **Vórtice Cromático:** Transmutación de las capas base cada 5 turnos.
     - **Cerrojo Resonante:** Tubos sellados que se liberan únicamente cuando un frasco de color determinado se completa y tapa por completo.
     - **Presión Temporal:** Temporizadores de estabilidad de 90 segundos con bonificación por velocidad.

---

## 3. Requerimientos de Accesibilidad y Diseño Visual

### 3.1. Identificación Multimodal para Daltonismo
Ningún elemento del juego debe depender exclusivamente del tono cromático para ser diferenciado:

| Denominación | Valor Hexadecimal | Símbolo Geométrico | Contraste de Texto |
| :--- | :--- | :---: | :--- |
| **Rojo** | `#EF4444` | ● (Círculo) | Blanco (`#FFFFFF`) |
| **Azul** | `#3B82F6` | ▲ (Triángulo) | Blanco (`#FFFFFF`) |
| **Verde** | `#10B981` | ■ (Cuadrado) | Blanco (`#FFFFFF`) |
| **Amarillo**| `#EAB308` | ★ (Estrella) | Negro (`#000000`) |
| **Morado** | `#A855F7` | ◆ (Rombo) | Blanco (`#FFFFFF`) |
| **Naranja** | `#F97316` | ✚ (Cruz) | Blanco (`#FFFFFF`) |
| **Rosa** | `#EC4899` | ♥ (Corazón) | Blanco (`#FFFFFF`) |
| **Cian** | `#06B6D4` | ✦ (Destello) | Negro (`#000000`) |
| **Marrón** | `#854D0E` | ⬟ (Pentágono) | Blanco (`#FFFFFF`) |

### 3.2. Lupa / Indicador Flúor Flotante
- Al pasar el cursor (`hover`) o enfocar una botella táctilmente, emerge sobre el cuello del frasco una insignia neón brillante que detalla el símbolo en tamaño grande y el nombre textual del líquido superior (ej. `★ Amarillo`).

### 3.3. Fondo Personalizable con Salvaguarda Visual
- Selector libre de color de fondo (`<input type="color">`).
- Las botellas poseen un reborde translúcido blanco de 3px y fondo interno oscuro con `backdrop-filter: blur(8px)`, garantizando contraste constante contra fondos claros, oscuros o saturados.

---

## 4. Requerimientos de Animación y Simulación de Fluidos

1. **Secuencia Cinemática de Vertido en 6 Pasos:**
   El trasvase físico entre botellas sigue una coreografía continua y fluida de 6 fases:
   - **Paso 1: Levantar botella origen:** Elevación vertical suave de la botella seleccionada ($-36\text{ px}$).
   - **Paso 2: Acercar botella origen a destino:** Desplazamiento translacional hacia la boca del frasco receptor con elevación en $z$-index.
   - **Paso 3: Inclinar botella origen:** Rotación angular precisa ($\pm 54^\circ$) orientada en función de si el frasco destino se ubica a la izquierda o derecha.
   - **Paso 4: Derramar líquido en destino:** Trazo parabólico en Canvas con curva cuadrática Bezier, núcleo especular blanco y emisión de microgotas con gravedad estocástica ($g = 0.28\text{ px/frame}^2$). Acompañado de audio glug-glug.
   - **Paso 5: Vaciado y llenado sincronizado:** El bloque superior de la botella origen reduce su altura CSS a $0\%$ mientras que en la botella destino nace y se expande fluidamente la capa receptora equivalente.
   - **Paso 6: Vuelta de botella origen:** Enderezamiento angular a $0^\circ$ y retorno cinemático a su posición de reposo inicial en la cuadrícula.

2. **Chorro Parabólico y Microgotas en Canvas:**
   - Curva dinámica con descenso gravitacional según la distancia relativa entre labios de frascos.
   - Gotas de salpicadura en la boca receptora con velocidad inicial divergente, desvanecimiento alfa y destellos especulares.

3. **Ondas Superficiales y Efervescencia:**
   - Menisco oscilante con brillo reflejado (`surfaceGlint`).
   - Microburbujas translúcidas con ascenso continuo dentro de cada sustancia.

---

## 5. Especificación de Audio Procedural (Web Audio API)

El sistema de audio prescinde de archivos MP3/WAV externos, operando con nodos de osciladores, generadores de ruido y filtros en tiempo real:

1. **Desbloqueo de AudioContext:**
   - Escucha global inicial en `click`, `touchstart`, `keydown` y `pointerdown` para ejecutar `.resume()` y satisfacer las políticas de reproducción automática (*autoplay*) del navegador.
2. **Efecto de Vertido Acuático ("Glug-Glug"):**
   - Modulación de oscilador sinusoidal (320 Hz a 540 Hz) combinado con ráfagas de ruido estocástico pasabanda para imitar el burbujeo de aire y agua.
3. **Clavija de Ruleta (*Clacker Peg*):**
   - Onda triangular percusiva breve (800 Hz a 120 Hz en 40 ms) con decaimiento exponencial agudo y deflexión angular del marcador.
4. **Armonía de Sellado (Combo):**
   - Escala pentatónica mayor ($C_4, D_4, E_4, G_4, A_4, C_5, D_5, E_5$):
     $$\{261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25\}\text{ Hz}$$
   - Cada botella consecutiva incrementa el índice tonal, produciendo un efecto de euforia auditiva ascendente.
5. **Aplausos y Decepción de Multitud en la Ruleta:**
   - *Victoria en ruleta:* Acorde de sintetizador triunfal mayor combinado con textura densa de aplausos y vítores multicanal sintetizados mediante trenes estocásticos de impulsos filtrados en pasabanda.
   - *Fallo / No coincidencia:* Iluminación rojiza inmersiva del modal (`.roulette-lose-glow`) acompañada de un gemido descendente vocal sintetizado ("Aww..." colectivo: 260 Hz a 130 Hz con filtro resonante formante) y acorde suave en modo menor.

---

## 6. Modelo de Datos y Arquitectura de Persistencia

Toda la información se serializa bajo la clave `aquasort_state_v1` en `localStorage` y admite **Exportación e Importación en archivos físicos `.json`** para guardar partidas en disco y transferirlas entre equipos sin pérdida de progreso:

```json
{
  "player": {
    "nickname": "Alquimista",
    "coins": 45
  },
  "upgrades": {
    "cooldownReductionLevel": 1,
    "maxStoredHints": 3,
    "rouletteEnabled": true
  },
  "progress": {
    "unlockedLevel": 19,
    "completedLevels": {
      "1": { "stars": 3, "bestMoves": 6, "bestTimeSec": 12 },
      "2": { "stars": 2, "bestMoves": 14, "bestTimeSec": 28 }
    }
  },
  "customLevels": [
    {
      "id": "lvl_user_01",
      "author": "Alquimista",
      "verified": true,
      "tubeCount": 6,
      "tubes": []
    }
  ]
}
```

### Reglas de Recompensas Económicas
- **Primer pase:**
  - $\le 10$ movimientos: **10 monedas** 🪙
  - $11$ a $20$ movimientos: **5 monedas** 🪙
  - $> 20$ movimientos: **2 monedas** 🪙
- **Desafío secundario cumplido:** **+10 monedas** 🪙
- **Rejugabilidad:** Rejugar un nivel solo otorga monedas si el jugador **supera su marca histórica previa de movimientos**.

---

## 7. Criterios de Aceptación (Testing Checklist)

- [ ] **Generador Resoluble:** Ningún nivel generado al azar puede quedar en punto muerto sin solución; el solver BFS debe validar la existencia de al menos un camino ganador antes de presentarlo al usuario.
- [ ] **Aislamiento de la Llave:** La llave de un frasco bloqueado jamás puede generarse dentro de dicho frasco ni situarse en el tope accesible desde el primer movimiento.
- [ ] **Límite Camaleón:** Un líquido sobre un camaleón debe verterse de forma individual sin arrastrar al camaleón consigo en la misma acción.
- [ ] **Sincronización Ruleta:** El sector al que apunta físicamente el marcador al frenar debe corresponder al 100% con el color evaluado lógicamente por el sistema de premios.
- [ ] **Independencia Externa:** La aplicación debe ser completamente autónoma, funcional como archivo único HTML5/JS/CSS sin dependencias de red críticas para el audio o la lógica de juego.