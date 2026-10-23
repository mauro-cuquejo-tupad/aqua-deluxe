/* ==========================================================================
   AQUASORT MASTER DELUXE - MODO HISTORIA & CRÓNICAS DEL ALQUIMISTA
   Narrativa progresiva del científico, capítulos ilustrados y
   Easter Egg Secreto con los 7 nombres ocultos (5s tap) -> Final Especial de Naza y Mascotas
   ========================================================================== */

class StoryManager {
  constructor() {
    this.currentChapterIndex = 0;
    this.holdTimer = null;
    this.holdDurationMs = 5000; // 5 segundos requeridos por el usuario
    this.activeHoldingEl = null;

    this.chapters = [
      {
        id: 1,
        title: "Capítulo 1: El Desastre Escolar",
        subtitle: "Laboratorio de Ciencias de la Secundaria",
        secretWord: "mirko",
        svg: this.getSchoolExplosionSvg(),
        text: "Todo comenzó en sus primeros años de colegio. Mientras los demás jugaban al fútbol en el recreo, el joven alquimista intentó sintetizar la fórmula de la inmortalidad en el aula de química. Mezcló reactivos volátiles y... ¡PUM! Hizo volar el techo del laboratorio escolar por los aires entre humo púrpura. Su fiel perrito mirko lo esperaba afuera del colegio moviendo la cola, completamente acostumbrado a sus desastres."
      },
      {
        id: 2,
        title: "Capítulo 2: El Pabellón Universitario",
        subtitle: "Facultad de Ciencias Químicas",
        secretWord: "tom",
        svg: this.getCollegeExplosionSvg(),
        text: "Años después, ingresó a la universidad jurando ser más precavido. Pero una noche de desvelo y cafeína alteró las proporciones de una reacción exotérmica... ¡e hizo estallar todo el pabellón de investigación de la facultad! Entre cristales rotos y alarmas de incendio, su gato tom dormía plácidamente sobre los libros carbonizados sin inmutarse por el estruendo."
      },
      {
        id: 3,
        title: "Capítulo 3: La Noche con Amigos",
        subtitle: "Brindis Molecular en la Taberna",
        secretWord: "nina",
        svg: this.getFriendsBarExplosionSvg(),
        text: "Sus amigos quisieron sacarlo de la rutina y salieron a celebrar. Llevaba en el bolsillo un tubo con esencia burbujeante de alta densidad. Al chocar los vasos en el brindis, la vibración desató una reacción en cadena y... ¡explotó la mesa entre chispas esmeraldas y espuma fosforescente! Su gran amiga nina se reía a carcajadas mientras limpiaba la cerveza fluorescente de las paredes."
      },
      {
        id: 4,
        title: "Capítulo 4: El Sueño Iluminado",
        subtitle: "Madrugada en el Sillón Viejo",
        secretWord: "matilda",
        svg: this.getSleepingIdeaSvg(),
        text: "De regreso a su casa a las cuatro de la mañana, exhausto y con la cara negra por el hollín, se desplomó en su sillón favorito. Entre sueños y ronquidos, una idea brillante cruzó su mente como un rayo: la armonía perfecta de fluidos inmiscibles. A su lado, la dulce matilda le hacía compañía ronroneando suavemente en la almohada."
      },
      {
        id: 5,
        title: "Capítulo 5: El Cristal Titánico",
        subtitle: "Taller de Alquimia y Vidrio",
        secretWord: "bianca",
        svg: this.getGiantFlasksSvg(),
        text: "Despertó de un salto al amanecer: ¡necesitaba recipientes monumentales de cristal reforzado para contener tanta energía alquímica! Trabajó incansablemente junto a su colega bianca, forjando probetas gigantes y tubos de precisión milimétrica capaces de soportar cualquier sobrecarga sin fragmentarse."
      },
      {
        id: 6,
        title: "Capítulo 6: La Sabiduría del Corazón",
        subtitle: "El Consejo de la Maestra",
        secretWord: "zoila",
        svg: this.getMentorWisdomSvg(),
        text: "Con el laboratorio lleno de fluidos luminosos, las dudas golpearon su espíritu. Fue entonces cuando su mentora zoila le recordó una verdad fundamental: 'El verdadero propósito de la alquimia nunca fue dominar los elementos, sino descubrir qué es lo que de verdad le da sentido al corazón de una persona'."
      },
      {
        id: 7,
        title: "Capítulo 7: La Mayor Revelación",
        subtitle: "El Más Hermoso de los Destinos",
        secretWord: "freya",
        svg: this.getHeartRevelationSvg(),
        text: "Frente al matraz definitivo, el científico sintió que la soledad del laboratorio ya no le bastaba. Miró a freya a los ojos conmovido y comprendió que el mayor misterio del universo no estaba encerrado en frascos de vidrio, sino en construir un hogar lleno de amor y compartir la vida."
      }
    ];
  }

  // --- SVGS ILUSTRATIVOS DE LA HISTORIA (ESTILO MINIMALISTA Y ACOGEDOR) ---
  getSchoolExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <rect x="20" y="70" width="120" height="80" rx="4" fill="#334155" stroke="#64748b" stroke-width="2"/>
        <polygon points="20,70 80,30 140,70" fill="#475569" stroke="#64748b" stroke-width="2"/>
        <text x="80" y="95" font-size="20" text-anchor="middle">🏫</text>
        <!-- Nube de explosión cómica púrpura -->
        <circle cx="120" cy="50" r="30" fill="#a855f7" opacity="0.8"/>
        <circle cx="150" cy="40" r="35" fill="#c084fc" opacity="0.75"/>
        <circle cx="180" cy="55" r="28" fill="#e879f9" opacity="0.8"/>
        <text x="150" y="52" font-size="22" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="1">💥 ¡BOOM!</text>
        <!-- Científico con bata tiznada -->
        <g transform="translate(195, 95)">
          <circle cx="15" cy="15" r="10" fill="#fed7aa"/>
          <path d="M 8 25 L 22 25 L 26 55 L 4 55 Z" fill="#e2e8f0"/>
          <circle cx="11" cy="13" r="2" fill="#0f172a"/>
          <circle cx="19" cy="13" r="2" fill="#0f172a"/>
          <!-- Manchas de hollín -->
          <circle cx="17" cy="18" r="3" fill="#334155" opacity="0.8"/>
          <text x="15" y="48" font-size="12" text-anchor="middle">🧪</text>
        </g>
        <!-- Perrito Mirko esperando afuera moviendo la cola -->
        <g transform="translate(250, 115)">
          <ellipse cx="20" cy="22" rx="14" ry="10" fill="#94a3b8"/>
          <circle cx="10" cy="14" r="8" fill="#94a3b8"/>
          <circle cx="8" cy="12" r="1.5" fill="#0f172a"/>
          <ellipse cx="6" cy="10" rx="3" ry="6" fill="#64748b"/>
          <path d="M 32 20 Q 42 12 36 6" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" fill="none"/>
          <text x="20" y="40" font-size="9" font-weight="900" fill="#cbd5e1" text-anchor="middle">🐶 Mirko</text>
        </g>
      </svg>
    `;
  }

  getCollegeExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <!-- Fachada de la facultad con columnas -->
        <rect x="30" y="80" width="130" height="70" rx="3" fill="#1e293b" stroke="#475569" stroke-width="2"/>
        <line x1="50" y1="80" x2="50" y2="150" stroke="#94a3b8" stroke-width="4"/>
        <line x1="80" y1="80" x2="80" y2="150" stroke="#94a3b8" stroke-width="4"/>
        <line x1="110" y1="80" x2="110" y2="150" stroke="#94a3b8" stroke-width="4"/>
        <line x1="140" y1="80" x2="140" y2="150" stroke="#94a3b8" stroke-width="4"/>
        <text x="95" y="65" font-size="20" text-anchor="middle">🎓</text>
        <!-- Nube de humo esmeralda y fuego -->
        <circle cx="140" cy="45" r="32" fill="#10b981" opacity="0.8"/>
        <circle cx="175" cy="35" r="38" fill="#34d399" opacity="0.75"/>
        <circle cx="210" cy="50" r="30" fill="#6ee7b7" opacity="0.8"/>
        <text x="175" y="48" font-size="20" font-weight="900" fill="#fef08a" text-anchor="middle">💥 ¡KABOOM!</text>
        <!-- Gato Tom durmiendo plácidamente -->
        <g transform="translate(230, 115)">
          <ellipse cx="25" cy="22" rx="16" ry="11" fill="#334155"/>
          <circle cx="12" cy="18" r="9" fill="#334155"/>
          <polygon points="6,12 10,5 14,12" fill="#475569"/>
          <polygon points="12,12 16,5 20,12" fill="#475569"/>
          <path d="M 9 19 Q 12 21 15 19" stroke="#94a3b8" stroke-width="1.5" fill="none"/>
          <path d="M 38 24 Q 48 20 44 12" stroke="#334155" stroke-width="3" stroke-linecap="round" fill="none"/>
          <text x="25" y="40" font-size="9" font-weight="900" fill="#cbd5e1" text-anchor="middle">🐱 Tom (zzZ)</text>
        </g>
      </svg>
    `;
  }

  getFriendsBarExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <text x="50" y="55" font-size="28">🍻</text>
        <rect x="70" y="110" width="180" height="15" rx="4" fill="#78350f" stroke="#b45309" stroke-width="2"/>
        <line x1="90" y1="125" x2="90" y2="160" stroke="#78350f" stroke-width="4"/>
        <line x1="230" y1="125" x2="230" y2="160" stroke="#78350f" stroke-width="4"/>
        <!-- Destello y salpicaduras de colores -->
        <circle cx="160" cy="85" r="32" fill="#f59e0b" opacity="0.85"/>
        <circle cx="135" cy="70" r="22" fill="#38bdf8" opacity="0.8"/>
        <circle cx="185" cy="70" r="22" fill="#ec4899" opacity="0.8"/>
        <text x="160" y="88" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">✨ ¡PLASH! ✨</text>
        <!-- Amiga Nina riendo -->
        <g transform="translate(40, 85)">
          <circle cx="18" cy="18" r="11" fill="#fed7aa"/>
          <path d="M 10 30 Q 18 26 26 30 L 30 65 L 6 65 Z" fill="#ec4899"/>
          <text x="18" y="12" font-size="12" text-anchor="middle">💇‍♀️</text>
          <text x="18" y="75" font-size="9" font-weight="900" fill="#f472b6" text-anchor="middle">Nina 😂</text>
        </g>
        <!-- Científico disculpándose -->
        <g transform="translate(245, 85)">
          <circle cx="18" cy="18" r="11" fill="#fed7aa"/>
          <path d="M 10 30 L 26 30 L 28 65 L 8 65 Z" fill="#38bdf8"/>
          <circle cx="18" cy="22" r="3" fill="#1e293b"/>
          <text x="18" y="75" font-size="9" font-weight="900" fill="#7dd3fc" text-anchor="middle">Ups! 😅</text>
        </g>
      </svg>
    `;
  }

  getSleepingIdeaSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <!-- Sillón cálido -->
        <path d="M 60 145 L 60 95 Q 60 75 90 75 L 180 75 Q 210 75 210 95 L 210 145 Z" fill="#831843" stroke="#be185d" stroke-width="2"/>
        <!-- Científico durmiendo -->
        <g transform="translate(90, 80)">
          <circle cx="25" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 20 22 Q 25 24 30 22" stroke="#475569" stroke-width="2" fill="none"/>
          <rect x="10" y="32" width="60" height="30" rx="8" fill="#0284c7"/>
          <text x="75" y="15" font-size="14" fill="#93c5fd">zzZ</text>
        </g>
        <!-- Bombilla brillante de idea -->
        <g transform="translate(180, 25)">
          <circle cx="20" cy="20" r="18" fill="#facc15" filter="drop-shadow(0 0 10px #facc15)"/>
          <text x="20" y="27" font-size="22" text-anchor="middle">💡</text>
        </g>
        <!-- Gatita Matilda ronroneando -->
        <g transform="translate(225, 115)">
          <ellipse cx="20" cy="20" rx="14" ry="10" fill="#e2e8f0"/>
          <circle cx="10" cy="14" r="8" fill="#cbd5e1"/>
          <polygon points="5,8 9,2 13,8" fill="#94a3b8"/>
          <polygon points="11,8 15,2 19,8" fill="#94a3b8"/>
          <text x="20" y="38" font-size="9" font-weight="900" fill="#f1f5f9" text-anchor="middle">🐾 Matilda</text>
        </g>
      </svg>
    `;
  }

  getGiantFlasksSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <!-- Probetas gigantes de laboratorio -->
        <g transform="translate(60, 30)">
          <rect x="10" y="10" width="35" height="110" rx="10" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="2.5"/>
          <rect x="12" y="55" width="31" height="63" rx="8" fill="#0284c7"/>
          <text x="27" y="135" font-size="9" font-weight="900" fill="#38bdf8" text-anchor="middle">Max 6</text>
        </g>
        <g transform="translate(125, 15)">
          <rect x="10" y="10" width="42" height="130" rx="12" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" stroke-width="2.5"/>
          <rect x="12" y="60" width="38" height="78" rx="10" fill="#d97706"/>
          <text x="31" y="152" font-size="9" font-weight="900" fill="#f59e0b" text-anchor="middle">Titán 8</text>
        </g>
        <!-- Tubo fino 1x1 con burbujitas -->
        <g transform="translate(195, 45)">
          <rect x="10" y="10" width="18" height="90" rx="6" fill="rgba(168, 85, 247, 0.3)" stroke="#c084fc" stroke-width="2"/>
          <rect x="11" y="60" width="16" height="38" rx="5" fill="#9333ea"/>
          <circle cx="19" cy="45" r="2.5" fill="#f3e8ff"/>
          <circle cx="19" cy="30" r="2" fill="#f3e8ff"/>
          <text x="19" y="115" font-size="8" font-weight="900" fill="#d8b4fe" text-anchor="middle">1x1 ✨</text>
        </g>
        <!-- Bianca supervisando -->
        <g transform="translate(245, 75)">
          <circle cx="18" cy="18" r="11" fill="#fed7aa"/>
          <path d="M 8 30 L 28 30 L 32 70 L 4 70 Z" fill="#10b981"/>
          <text x="18" y="12" font-size="12" text-anchor="middle">👓</text>
          <text x="18" y="82" font-size="9" font-weight="900" fill="#34d399" text-anchor="middle">Bianca 📐</text>
        </g>
      </svg>
    `;
  }

  getMentorWisdomSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <!-- Cielo estrellado y constelaciones -->
        <circle cx="50" cy="35" r="1.5" fill="#fef08a"/>
        <circle cx="120" cy="25" r="2" fill="#ffffff"/>
        <circle cx="220" cy="30" r="1.5" fill="#fef08a"/>
        <circle cx="280" cy="45" r="2" fill="#ffffff"/>
        <!-- Corazón alquímico resplandeciente -->
        <g transform="translate(140, 45)">
          <circle cx="20" cy="20" r="26" fill="rgba(244, 63, 94, 0.2)" filter="blur(6px)"/>
          <text x="20" y="28" font-size="28" text-anchor="middle">💖</text>
        </g>
        <!-- Mentora Zoila -->
        <g transform="translate(60, 80)">
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 8 32 L 32 32 L 36 75 L 4 75 Z" fill="#6366f1"/>
          <text x="20" y="14" font-size="12" text-anchor="middle">🧓</text>
          <text x="20" y="88" font-size="9" font-weight="900" fill="#a5b4fc" text-anchor="middle">Zoila ⭐</text>
        </g>
        <!-- Científico escuchando atentamente -->
        <g transform="translate(220, 80)">
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 8 32 L 32 32 L 34 75 L 6 75 Z" fill="#0284c7"/>
          <text x="20" y="88" font-size="9" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 📖</text>
        </g>
      </svg>
    `;
  }

  getHeartRevelationSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2">
        <!-- Rayos de luz dorada celestial -->
        <circle cx="160" cy="40" r="45" fill="rgba(251, 191, 36, 0.15)" filter="blur(10px)"/>
        <text x="160" y="55" font-size="34" text-anchor="middle">✨</text>
        <!-- El científico y Freya contemplando el horizonte -->
        <g transform="translate(100, 75)">
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 8 32 L 32 32 L 34 80 L 6 80 Z" fill="#0284c7"/>
        </g>
        <g transform="translate(180, 75)">
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 8 32 L 32 32 L 36 80 L 4 80 Z" fill="#ec4899"/>
          <text x="20" y="14" font-size="12" text-anchor="middle">🌸</text>
          <text x="20" y="94" font-size="9" font-weight="900" fill="#f472b6" text-anchor="middle">Freya 💕</text>
        </g>
        <path d="M 132 110 Q 160 120 188 110" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="4 3" fill="none"/>
      </svg>
    `;
  }

  // --- SVG DEL GRAN FINAL ESPECIAL: NAZA, PERROS Y GATOS ---
  getSpecialEndingFamilySvg() {
    return `
      <svg viewBox="0 0 360 230" class="w-full h-full rounded-3xl bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950/90 p-2 shadow-2xl">
        <!-- Hogar cálido de fondo -->
        <rect x="25" y="40" width="310" height="170" rx="16" fill="rgba(30, 41, 59, 0.7)" stroke="#64748b" stroke-width="1.5"/>
        <!-- Ventana al jardín soleado con flores -->
        <rect x="50" y="55" width="60" height="55" rx="8" fill="#38bdf8" opacity="0.3" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="80" y1="55" x2="80" y2="110" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="50" y1="82" x2="110" y2="82" stroke="#94a3b8" stroke-width="1.5"/>
        <circle cx="80" cy="70" r="7" fill="#fbbf24"/>
        <text x="70" y="105" font-size="10">🌸</text>
        <text x="90" y="105" font-size="10">🌿</text>

        <!-- Cuadro con la bata de laboratorio colgada (Adiós laboratorio) -->
        <rect x="250" y="55" width="55" height="50" rx="6" fill="#1e293b" stroke="#ca8a04" stroke-width="1.5"/>
        <text x="277" y="78" font-size="16" text-anchor="middle">🥼</text>
        <text x="277" y="96" font-size="7" font-weight="900" fill="#fde047" text-anchor="middle">JUBILADO</text>

        <!-- Corazón central brillante -->
        <circle cx="180" cy="55" r="22" fill="rgba(244, 63, 94, 0.25)" filter="blur(8px)"/>
        <text x="180" y="65" font-size="28" text-anchor="middle">💖</text>

        <!-- El Científico (feliz y sonriente, con ropa cómoda) -->
        <g transform="translate(130, 85)">
          <circle cx="20" cy="20" r="14" fill="#fed7aa"/>
          <path d="M 14 18 Q 20 22 26 18" stroke="#78350f" stroke-width="2" fill="none"/>
          <circle cx="16" cy="16" r="2" fill="#0f172a"/>
          <circle cx="24" cy="16" r="2" fill="#0f172a"/>
          <path d="M 8 34 L 32 34 L 36 82 L 4 82 Z" fill="#0284c7"/>
          <text x="20" y="95" font-size="9" font-weight="900" fill="#93c5fd" text-anchor="middle">Mauro</text>
        </g>

        <!-- Chica Naza (hermosa, sonriente, tomada de la mano) -->
        <g transform="translate(190, 85)">
          <circle cx="20" cy="20" r="14" fill="#fed7aa"/>
          <!-- Cabello bonito castaño/dorado -->
          <path d="M 6 22 Q 6 4 20 4 Q 34 4 34 22 Q 35 34 32 38 Q 28 22 20 22 Q 12 22 8 38 Z" fill="#92400e"/>
          <path d="M 14 19 Q 20 23 26 19" stroke="#78350f" stroke-width="2" fill="none"/>
          <circle cx="16" cy="17" r="2" fill="#0f172a"/>
          <circle cx="24" cy="17" r="2" fill="#0f172a"/>
          <path d="M 8 34 L 32 34 L 38 82 L 2 82 Z" fill="#ec4899"/>
          <text x="20" y="95" font-size="9" font-weight="900" fill="#f472b6" text-anchor="middle">Naza ❤️</text>
        </g>

        <!-- ================= MASCOTAS ADORADAS ================= -->
        <!-- 1. CANICHE GRIS CON COPITO BLANCO EN LA CABEZA -->
        <g transform="translate(60, 145)">
          <!-- Cuerpo rizado gris -->
          <ellipse cx="25" cy="22" rx="16" ry="12" fill="#94a3b8"/>
          <!-- Cabeza rizada gris -->
          <circle cx="14" cy="13" r="11" fill="#94a3b8"/>
          <!-- Hocico -->
          <ellipse cx="8" cy="15" rx="5" ry="4" fill="#cbd5e1"/>
          <circle cx="6" cy="14" r="1.5" fill="#0f172a"/>
          <circle cx="11" cy="11" r="1.8" fill="#0f172a"/>
          <!-- Orejas rizadas grises -->
          <ellipse cx="18" cy="16" rx="4" ry="7" fill="#64748b"/>
          <!-- EL COPITO BLANCO EN LA CABEZA (SOLICITADO) -->
          <circle cx="14" cy="4" r="6.5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
          <circle cx="12" cy="3" r="3.5" fill="#ffffff"/>
          <circle cx="16" cy="3" r="3.5" fill="#ffffff"/>
          <!-- Patitas y cola rizada con pompón -->
          <circle cx="16" cy="32" r="3.5" fill="#94a3b8"/>
          <circle cx="28" cy="32" r="3.5" fill="#94a3b8"/>
          <circle cx="40" cy="14" r="5" fill="#ffffff"/>
          <text x="25" y="44" font-size="8" font-weight="900" fill="#e2e8f0" text-anchor="middle">Caniche Gris 🐩</text>
        </g>

        <!-- 2. GATO 1 BLANCO Y NEGRO (Tuxedo Cat 1) -->
        <g transform="translate(130, 160)">
          <ellipse cx="16" cy="16" rx="13" ry="9" fill="#0f172a"/>
          <!-- Pecho blanco -->
          <ellipse cx="11" cy="16" rx="6" ry="6" fill="#ffffff"/>
          <circle cx="8" cy="11" r="7" fill="#0f172a"/>
          <!-- Mancha blanca en la cara -->
          <polygon points="8,8 6,15 10,15" fill="#ffffff"/>
          <polygon points="3,6 6,1 9,6" fill="#0f172a"/>
          <polygon points="7,6 10,1 13,6" fill="#0f172a"/>
          <circle cx="6" cy="10" r="1.2" fill="#22c55e"/>
          <circle cx="9" cy="10" r="1.2" fill="#22c55e"/>
          <path d="M 27 18 Q 36 12 32 4" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <text x="16" y="32" font-size="7" font-weight="900" fill="#cbd5e1" text-anchor="middle">B&N 🐱</text>
        </g>

        <!-- 3. GATO 2 BLANCO Y NEGRO (Tuxedo Cat 2 jugando) -->
        <g transform="translate(235, 155)">
          <ellipse cx="18" cy="18" rx="14" ry="9" fill="#ffffff"/>
          <!-- Manchas negras tuxedo -->
          <path d="M 12 10 Q 18 6 24 10 L 26 18 L 8 18 Z" fill="#0f172a"/>
          <circle cx="10" cy="12" r="7" fill="#0f172a"/>
          <polygon points="5,7 8,2 11,7" fill="#0f172a"/>
          <polygon points="9,7 12,2 15,7" fill="#0f172a"/>
          <!-- Hojos verdes curiosos -->
          <circle cx="8" cy="11" r="1.2" fill="#22c55e"/>
          <circle cx="11" cy="11" r="1.2" fill="#22c55e"/>
          <path d="M 30 20 Q 38 18 36 10" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <!-- Ovillo de lana jugando -->
          <circle cx="2" cy="22" r="4.5" fill="#ec4899"/>
          <text x="18" y="34" font-size="7" font-weight="900" fill="#cbd5e1" text-anchor="middle">B&N 🐱</text>
        </g>

        <!-- 4. GATO ATIGRADO GRIS Y NEGRO (Grey & Black Tabby Cat) -->
        <g transform="translate(285, 145)">
          <!-- Cuerpo grisáceo con rayas atigradas negras -->
          <ellipse cx="18" cy="20" rx="15" ry="10" fill="#64748b"/>
          <!-- Rayas atigradas -->
          <path d="M 10 13 L 13 25 M 17 11 L 20 27 M 24 13 L 26 25" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="8" cy="14" r="8" fill="#64748b"/>
          <path d="M 6 8 L 8 13 M 10 8 L 11 13" stroke="#1e293b" stroke-width="1.5"/>
          <polygon points="3,8 6,2 9,8" fill="#475569"/>
          <polygon points="8,8 11,2 14,8" fill="#475569"/>
          <circle cx="6" cy="13" r="1.2" fill="#facc15"/>
          <circle cx="10" cy="13" r="1.2" fill="#facc15"/>
          <path d="M 31 22 Q 40 18 36 10" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <text x="18" y="38" font-size="7" font-weight="900" fill="#94a3b8" text-anchor="middle">Atigrado 🐾</text>
        </g>
      </svg>
    `;
  }

  // --- ABRIR MODAL DEL MODO HISTORIA ---
  openStoryModal(chapterIndex = 0) {
    this.currentChapterIndex = Math.max(0, Math.min(chapterIndex, this.chapters.length - 1));
    const modal = document.getElementById('modal-story-chapter');
    if (!modal) return;

    this.renderCurrentChapter();
    modal.classList.remove('hidden');
    if (window.game && typeof window.game.showModal === 'function') {
      window.game.showModal(modal);
    }
  }

  closeStoryModal() {
    const modal = document.getElementById('modal-story-chapter');
    if (!modal) return;
    this.cancelSecretHold();
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }
  }

  // --- RENDERIZADO DEL CAPÍTULO ACTUAL ---
  renderCurrentChapter() {
    const chap = this.chapters[this.currentChapterIndex];
    if (!chap) return;

    const titleEl = document.getElementById('story-chapter-title');
    const subEl = document.getElementById('story-chapter-subtitle');
    const svgCont = document.getElementById('story-chapter-svg');
    const textCont = document.getElementById('story-chapter-text');
    const navCounter = document.getElementById('story-nav-counter');
    const btnPrev = document.getElementById('btn-story-prev');
    const btnNext = document.getElementById('btn-story-next');

    if (titleEl) titleEl.textContent = chap.title;
    if (subEl) subEl.textContent = chap.subtitle;
    if (svgCont) svgCont.innerHTML = chap.svg;
    if (navCounter) navCounter.textContent = `${this.currentChapterIndex + 1} / ${this.chapters.length}`;

    if (btnPrev) btnPrev.disabled = (this.currentChapterIndex === 0);
    if (btnNext) btnNext.disabled = (this.currentChapterIndex === this.chapters.length - 1);

    // Renderizar texto insertando el span interactivo para la palabra secreta
    if (textCont) {
      const secret = chap.secretWord;
      const discovered = window.stateManager?.state?.secretEasterEgg?.discoveredNames || [];
      const isAlreadyFound = discovered.includes(secret);

      // Reemplazo regex sensible pero preservando el flujo del texto
      const regex = new RegExp(`\\b(${secret})\\b`, 'gi');
      const formattedText = chap.text.replace(regex, (match) => {
        return `<span class="story-secret-keyword ${isAlreadyFound ? 'found-secret' : ''}" data-word="${secret}" title="${isAlreadyFound ? '⭐ Activado' : ''}">${match}${isAlreadyFound ? ' ⭐' : ''}</span>`;
      });

      textCont.innerHTML = formattedText;
      this.attachSecretHoldListeners(textCont);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- NAVEGACIÓN DE CAPÍTULOS ---
  prevChapter() {
    if (this.currentChapterIndex > 0) {
      this.currentChapterIndex--;
      this.renderCurrentChapter();
    }
  }

  nextChapter() {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      this.currentChapterIndex++;
      this.renderCurrentChapter();
    }
  }

  // --- INTERACCIÓN SECRETA: MANTENER PRESIONADO POR 5 SEGUNDOS ---
  attachSecretHoldListeners(container) {
    const secretEls = container.querySelectorAll('.story-secret-keyword');
    secretEls.forEach(el => {
      const word = el.getAttribute('data-word');

      const startHold = (e) => {
        // Ignorar clics con botón derecho
        if (e.button && e.button !== 0) return;
        this.cancelSecretHold();

        this.activeHoldingEl = el;
        el.classList.add('holding-secret');

        // Temporizador de 5000 ms exactos
        this.holdTimer = setTimeout(() => {
          this.onSecretWordTriggered(word, el);
        }, this.holdDurationMs);
      };

      const endHold = () => {
        this.cancelSecretHold();
      };

      el.addEventListener('pointerdown', startHold);
      el.addEventListener('pointerup', endHold);
      el.addEventListener('pointercancel', endHold);
      el.addEventListener('pointerleave', endHold);
    });
  }

  cancelSecretHold() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    if (this.activeHoldingEl) {
      this.activeHoldingEl.classList.remove('holding-secret');
      this.activeHoldingEl = null;
    }
  }

  // --- AL ACTIVAR EL NOMBRE SECRETO TRAS 5 SEGUNDOS ---
  onSecretWordTriggered(word, element) {
    this.cancelSecretHold();

    // 1. Sonido especial misterioso y mágico
    if (window.audio && typeof window.audio.playMysteryChime === 'function') {
      window.audio.playMysteryChime();
    } else if (window.audio) {
      window.audio.playComboTone(7);
    }

    // 2. Vibración háptica en teléfonos si está disponible
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 120]);
    }

    // 3. Efecto visual en la palabra (destello dorado)
    if (element) {
      element.classList.add('found-secret', 'secret-burst-sparkle');
      if (!element.textContent.includes('⭐')) {
        element.innerHTML += ' ⭐';
      }
    }

    // 4. Registrar en el estado del jugador
    let result = { isNew: false, completed: false, total: 0 };
    if (window.stateManager && typeof window.stateManager.recordDiscoveredSecretName === 'function') {
      result = window.stateManager.recordDiscoveredSecretName(word);
    }

    // Pequeño confeti sutil de estrellas sobre la palabra
    if (typeof confetti === 'function') {
      const rect = element.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { x: x, y: y },
        colors: ['#f59e0b', '#c084fc', '#38bdf8', '#f43f5e']
      });
    }

    // 5. ¿Completó los 7 nombres secretos? (mirko, tom, nina, matilda, bianca, zoila, freya)
    if (result.completed) {
      setTimeout(() => {
        this.closeStoryModal();
        this.triggerSecretEndingCinematic();
      }, 1200);
    }
  }

  // --- DISPARAR EL FINAL ESPECIAL DE NAZA Y LAS MASCOTAS ---
  triggerSecretEndingCinematic() {
    const modal = document.getElementById('modal-special-ending-naza');
    if (!modal) return;

    // Fanfarria grandiosa
    if (window.audio) {
      window.audio.playWinFanfare();
      setTimeout(() => window.audio.playCrowdCheer(), 500);
    }

    // Lluvia de confeti de corazones y estrellas
    if (typeof confetti === 'function') {
      const end = Date.now() + 4500;
      const colors = ['#f43f5e', '#fbbf24', '#38bdf8', '#c084fc', '#ffffff'];
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors: colors });
        confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors: colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }

    // Renderizar ilustración SVG
    const svgCont = document.getElementById('special-ending-svg-container');
    if (svgCont) {
      svgCont.innerHTML = this.getSpecialEndingFamilySvg();
    }

    modal.classList.remove('hidden');
    if (window.game && typeof window.game.showModal === 'function') {
      window.game.showModal(modal);
    }
  }

  closeSpecialEndingModal() {
    const modal = document.getElementById('modal-special-ending-naza');
    if (!modal) return;
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }
  }
}

// Instancia global
window.storyManager = new StoryManager();
