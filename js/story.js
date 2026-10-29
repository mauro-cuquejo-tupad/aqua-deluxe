/* ==========================================================================
   AQUASORT MASTER DELUXE - MODO HISTORIA & CRÓNICAS DEL ALQUIMISTA
   Narrativa progresiva del científico, capítulos ilustrados y
   Easter Egg Secreto con los 7 nombres ocultos (5s tap) -> Final Especial de Naza y Mascotas
   ========================================================================== */

class StoryManager {
  constructor() {
    this.currentChapterIndex = 0;
    this.holdTimer = null;
    this.holdDurationMs = 5000; // 5 segundos o toque directo
    this.activeHoldingEl = null;
    this.openedFromGallery = false;
    this.selectedScienceEnding = 'regular'; // 'bad' | 'regular' | 'good'
  }

  isSecretBranchUnlocked() {
    const discovered = window.stateManager?.state?.secretEasterEgg?.discoveredNames || [];
    const validNames = ['mirko', 'tom', 'nina', 'matilda', 'bianca', 'zoila', 'freya'];
    const hasAll7 = validNames.every(name => discovered.includes(name));
    return hasAll7 || !!window.stateManager?.state?.secretEasterEgg?.allDiscovered;
  }

  get chapters() {
    return this.getAllChapters();
  }

  getAllChapters() {
    const isLove = this.isSecretBranchUnlocked();
    const commonChapters = [
      {
        id: 0,
        title: "Prólogo: La Chispa Infantil",
        subtitle: "Los Inicios de una Mente Inquieta",
        secretWord: null,
        svg: this.getPrologueChildhoodSvg(),
        text: "Desde sus primeros meses de vida, el pequeño alquimista ya no era un bebé convencional. En su cuna, mientras jugaba inocentemente con sonajeros y cubos de madera, una chispa mágica desprendió de sus deditos... ¡y su osito de trapo estalló en confeti y chispas de luz ante la sorpresa de sus padres! Años más tarde, sentado a la mesa, intentó condensar la salsa de su comida mezclando jugos misteriosos, provocando que el puré explotara cómicamente contra el techo entre humo dorado. Fue entonces cuando, admirando el horizonte desde la colina del pueblo, divisó las altas agujas y vidrieras relucientes del gran Colegio de Alquimia. Con el corazón latiendo a mil por hora, supo de inmediato cuál era su verdadero destino."
      },
      {
        id: 1,
        title: "Capítulo 1: El Desastre Escolar",
        subtitle: "Laboratorio de Ciencias del Colegio",
        secretWord: "mirko",
        svg: this.getSchoolExplosionSvg(),
        text: "Tras descubrir su vocación por la alquimia, ingresó finalmente al prestigioso colegio. Pero sus inicios fueron tan explosivos como prometedores: mientras los demás practicaban transmutaciones básicas de hojas secas, él intentó acelerar la fórmula suprema en el aula magna. Mezcló reactivos volátiles y... ¡PUM! Hizo encoger cómicamente todo el laboratorio escolar entre humo púrpura y chispas mágicas. Su fiel perrito mirko lo esperaba afuera moviendo la cola, completamente acostumbrado a sus brillantes pero caóticos desastres."
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
        title: "Capítulo 7: Ecos en la Noche",
        subtitle: "El Dilema del Corazón",
        secretWord: "freya",
        svg: this.getNightReflectionSvg(),
        text: "Tras escuchar a Zoila, el alquimista pasó noches enteras en vela mirando las estrellas desde su balcón. ¿Cómo hacerle caso al consejo de su mentora si toda su vida sólo había conocido probetas y ecuaciones? Se sentó frente a su escritorio, dudando de cada fórmula. Pero entre sus pensamientos, no podía borrar de su mente el recuerdo fugaz de freya, aquella chica de mirada dulce que una vez vio en el mercado y que hizo latir su pecho sin explicación alguna. ¿Sería ella la respuesta que buscaba?"
      }
    ];

    if (isLove) {
      return [
        ...commonChapters,
        {
          id: 8,
          branch: "love",
          title: "Capítulo 8: El Flechazo Inesperado",
          subtitle: "La Chispa del Destino",
          svg: this.getLoveAtFirstSightSvg(),
          text: "Decidido a seguir el llamado de su corazón, salió por fin de su encierro hacia los jardines de la ciudad. Y allí estaba ella: Freya, cuidando las flores del botánico con una sonrisa que opacaba al sol. Al mirarse a los ojos, el tiempo se detuvo. Ninguna reacción química había generado jamás semejante energía en su pecho. El científico sintió cómo sus mejillas ardían en rojo carmesí: se había enamorado perdidamente a primera vista."
        },
        {
          id: 9,
          branch: "love",
          title: "Capítulo 9: Torpeza y Ternura",
          subtitle: "El Deseo de Impresionar",
          svg: this.getClumsyMagicSvg(),
          text: "Para ganarse su admiración, quiso demostrarle que era un mago extraordinario. Intentó crear con su varita un ramillete de fuegos artificiales de colores y mariposas de luz... pero calculó mal la mezcla y ¡PUF! Su sombrero se chamuscó, su manga echó humo y quedó tosiendo brillantina violeta. Lejos de asustarse, Freya soltó una carcajada encantadora y le limpió el hollín con ternura. Su torpeza no la alejó: la enamoró por completo."
        },
        {
          id: 10,
          branch: "love",
          title: "Capítulo 10: La Mayor Revelación",
          subtitle: "El Más Hermoso de los Destinos",
          svg: this.getHeartRevelationSvg(),
          text: "Frente al matraz definitivo, el científico intentó dibujar un corazón con magia para Freya... aunque a ella le pareció una manzana 🍎. Comprendió que no era muy buen artista, pero que el mayor misterio del universo no era pintar perfecto, sino construir un hogar lleno de amor, risas y compartir la vida juntos."
        }
      ];
    } else {
      return [
        ...commonChapters,
        {
          id: 8,
          branch: "science",
          title: "Capítulo 8: La Fórmula Universal",
          subtitle: "Una Causa Para la Humanidad",
          svg: this.getWorldFormulaSvg(),
          text: "Sin encontrar aún el secreto de las palabras de Zoila, el alquimista decidió que si no podía descifrar su propio corazón, dedicaría su existencia a sanar el mundo entero. Se propuso sintetizar el 'Agua de la Vida': un fluido puro capaz de purificar cualquier río contaminado, saciar el hambre de los pueblos y traer prosperidad a todos los reinos."
        },
        {
          id: 9,
          branch: "science",
          title: "Capítulo 9: El Ensayo del Caos",
          subtitle: "Cien Intentos Fallidos",
          svg: this.getExplosiveTestsSvg(),
          text: "La teoría era hermosa, pero la práctica fue un auténtico terremoto. Mezcló extractos de algas lunares: ¡BOOM! Probó condensar vapor solar: ¡CATAPLÚM! Cada pócima de ayuda humanitaria terminaba en una explosión multicolor que tiñó las paredes de verde, amarillo y naranja. Con la cara tiznada de carbón y las cejas chamuscadas, no se rindió: estaba a un paso de la mezcla final."
        },
        {
          id: 10,
          branch: "science",
          hasMultipleEndings: true,
          title: "Capítulo 10: El Gran Desenlace",
          subtitle: "El Destino de la Gran Obra",
          svg: this.getScienceEndingSvg(this.selectedScienceEnding || 'regular'),
          text: this.getScienceEndingText(this.selectedScienceEnding || 'regular')
        }
      ];
    }
  }

  // --- SVGS ILUSTRATIVOS DE LA HISTORIA (ESTILO MINIMALISTA Y ACOGEDOR CON ANIMACIÓN CINEMÁTICA ÚNICA) ---
  getPrologueChildhoodSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Suelo general -->
        <line x1="10" y1="152" x2="310" y2="152" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3"/>

        <!-- SEPARADORES DE VIÑETAS / PANELES CÓMICOS -->
        <line x1="106" y1="15" x2="106" y2="155" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
        <line x1="214" y1="15" x2="214" y2="155" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>

        <!-- ========================================== -->
        <!-- VIÑETA 1: ALQUIMISTA BEBÉ Y JUGUETE EXPLOSIVO -->
        <!-- ========================================== -->
        <g class="story-anim-ch0-panel-1">
          <!-- Etiqueta superior -->
          <rect x="22" y="16" width="62" height="14" rx="7" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
          <text x="53" y="26" font-size="7" font-weight="900" fill="#38bdf8" text-anchor="middle">👶 1. EL BEBÉ</text>

          <!-- Cuna / alfombra -->
          <ellipse cx="53" cy="148" rx="35" ry="6" fill="#1e293b" opacity="0.6"/>
          <rect x="25" y="118" width="56" height="28" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <!-- Barrotes cuna -->
          <line x1="33" y1="118" x2="33" y2="146" stroke="#475569" stroke-width="1.5"/>
          <line x1="43" y1="118" x2="43" y2="146" stroke="#475569" stroke-width="1.5"/>
          <line x1="53" y1="118" x2="53" y2="146" stroke="#475569" stroke-width="1.5"/>
          <line x1="63" y1="118" x2="63" y2="146" stroke="#475569" stroke-width="1.5"/>
          <line x1="73" y1="118" x2="73" y2="146" stroke="#475569" stroke-width="1.5"/>

          <!-- Bebé Alquimista -->
          <g class="story-anim-ch0-baby" transform="translate(38, 92)">
            <!-- Gorrito / pañuelo azul de bebé -->
            <ellipse cx="14" cy="12" rx="10" ry="11" fill="#fed7aa"/>
            <path d="M 6 8 Q 14 -2 22 8 Z" fill="#38bdf8"/>
            <circle cx="14" cy="-2" r="2.5" fill="#facc15"/>
            <!-- Ojos sonrientes pillos -->
            <path d="M 10 11 Q 12 8 14 11" stroke="#0f172a" stroke-width="1.5" fill="none"/>
            <path d="M 16 11 Q 18 8 20 11" stroke="#0f172a" stroke-width="1.5" fill="none"/>
            <!-- Chupete / sonrisa -->
            <circle cx="15" cy="17" r="3" fill="#f43f5e"/>
            <!-- Manitas mágicas -->
            <circle cx="6" cy="22" r="3.5" fill="#fed7aa"/>
            <circle cx="24" cy="20" r="3.5" fill="#fed7aa"/>
            <!-- Destellitos de chispa saliendo del dedito -->
            <circle cx="27" cy="18" r="2" fill="#facc15"/>
          </g>

          <!-- Osito de peluche / Juguete explotando en confeti -->
          <g transform="translate(70, 118)">
            <!-- Restos del juguete chamuscado -->
            <circle cx="6" cy="12" r="5" fill="#78350f" stroke="#0f172a" stroke-width="1"/>
            <circle cx="2" cy="7" r="2.5" fill="#78350f"/>
            <circle cx="10" cy="7" r="2.5" fill="#78350f"/>
          </g>

          <!-- Animación de Explosión del juguete -->
          <g class="story-anim-ch0-toy-boom">
            <circle cx="76" cy="122" r="14" fill="#f59e0b" opacity="0.9"/>
            <circle cx="76" cy="122" r="8" fill="#fef08a"/>
            <!-- Confeti y chispas -->
            <rect x="68" y="108" width="3" height="3" fill="#ef4444" transform="rotate(25 68 108)"/>
            <rect x="85" y="112" width="3" height="3" fill="#3b82f6" transform="rotate(-15 85 112)"/>
            <rect x="74" y="136" width="3" height="3" fill="#10b981" transform="rotate(40 74 136)"/>
            <rect x="86" y="130" width="3" height="3" fill="#a855f7" transform="rotate(10 86 130)"/>
            <text x="76" y="104" font-size="8" font-weight="900" fill="#fde047" text-anchor="middle">¡PUM! 🧸💥</text>
          </g>
        </g>

        <!-- ========================================== -->
        <!-- VIÑETA 2: ALQUIMISTA NIÑO HACIENDO EXPLOTAR LA COMIDA -->
        <!-- ========================================== -->
        <g class="story-anim-ch0-panel-2">
          <!-- Etiqueta superior -->
          <rect x="130" y="16" width="62" height="14" rx="7" fill="#0f172a" stroke="#f59e0b" stroke-width="1"/>
          <text x="161" y="26" font-size="7" font-weight="900" fill="#f59e0b" text-anchor="middle">👦 2. EL PURÉ</text>

          <!-- Silla y mesa -->
          <ellipse cx="160" cy="148" rx="35" ry="6" fill="#1e293b" opacity="0.6"/>
          <!-- Mesa del comedor -->
          <rect x="150" y="112" width="46" height="36" rx="2" fill="#334155" stroke="#475569" stroke-width="1.5"/>
          <rect x="146" y="108" width="54" height="6" rx="2" fill="#1e293b"/>

          <!-- Plato de comida en la mesa -->
          <ellipse cx="172" cy="110" rx="10" ry="3.5" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>

          <!-- Niño travieso sentado -->
          <g transform="translate(125, 96)">
            <!-- Cuerpo niño -->
            <rect x="8" y="24" width="16" height="24" rx="3" fill="#0284c7"/>
            <!-- Cabeza tiznada con sonrisa traviesa -->
            <circle cx="16" cy="12" rx="9" ry="9.5" fill="#fed7aa"/>
            <path d="M 8 10 Q 16 0 24 10 Z" fill="#64748b"/>
            <!-- Cara con mancha de hollín -->
            <circle cx="18" cy="11" r="3" fill="#1e293b" opacity="0.7"/>
            <circle cx="13" cy="11" r="1.5" fill="#0f172a"/>
            <circle cx="19" cy="11" r="1.5" fill="#0f172a"/>
            <!-- Sonrisa de orgullo travieso -->
            <path d="M 13 16 Q 16 20 20 16" stroke="#0f172a" stroke-width="1.5" fill="none"/>
            <!-- Cuchara / matraz infantil en mano -->
            <line x1="22" y1="20" x2="33" y2="12" stroke="#cbd5e1" stroke-width="2"/>
            <circle cx="34" cy="11" r="3" fill="#facc15"/>
          </g>

          <!-- Explosión cómica del puré salpicando hacia arriba -->
          <g class="story-anim-ch0-food-boom">
            <!-- Nube de sopa / puré dorado volando -->
            <circle cx="172" cy="98" r="12" fill="#facc15" opacity="0.95"/>
            <circle cx="166" cy="90" r="8" fill="#fbbf24"/>
            <circle cx="179" cy="92" r="7" fill="#fb923c"/>
            <!-- Salpicaduras en el techo -->
            <circle cx="172" cy="46" r="5" fill="#facc15"/>
            <circle cx="164" cy="52" r="3.5" fill="#fbbf24"/>
            <circle cx="180" cy="50" r="4" fill="#fb923c"/>
            <path d="M 172 100 Q 170 65 172 48" stroke="#facc15" stroke-width="3" stroke-linecap="round" fill="none"/>
            <text x="172" y="78" font-size="8" font-weight="900" fill="#fef08a" text-anchor="middle">¡CATAPLÚM! 🍲</text>
          </g>
        </g>

        <!-- ========================================== -->
        <!-- VIÑETA 3: DESCUBRIENDO EL COLEGIO DE ALQUIMIA -->
        <!-- ========================================== -->
        <g class="story-anim-ch0-panel-3">
          <!-- Etiqueta superior -->
          <rect x="234" y="16" width="70" height="14" rx="7" fill="#0f172a" stroke="#a855f7" stroke-width="1"/>
          <text x="269" y="26" font-size="7" font-weight="900" fill="#c084fc" text-anchor="middle">🏰 3. LA VOCACIÓN</text>

          <!-- Colina del mirador -->
          <path d="M 214 152 Q 245 135 275 142 Q 300 148 316 152 Z" fill="#1e293b"/>

          <!-- Niño admirando el colegio desde la colina con su mochila -->
          <g transform="translate(226, 114)">
            <!-- Mochila de aventuras -->
            <rect x="0" y="14" width="7" height="12" rx="2" fill="#78350f"/>
            <!-- Cuerpo de espaldas/perfil mirando al castillo -->
            <rect x="5" y="12" width="10" height="18" rx="2" fill="#0284c7"/>
            <circle cx="11" cy="6" r="6" fill="#fed7aa"/>
            <path d="M 6 5 Q 11 0 15 5 Z" fill="#64748b"/>
            <!-- Destello de emoción en sus ojos -->
            <circle cx="15" cy="5" r="1.5" fill="#fde047"/>
            <!-- Brazo señalando hacia el colegio -->
            <line x1="12" y1="16" x2="22" y2="10" stroke="#fed7aa" stroke-width="2" stroke-linecap="round"/>
          </g>

          <!-- Gran Colegio de Alquimia al fondo en el horizonte iluminado -->
          <g class="story-anim-ch0-school-glow" transform="translate(254, 55)">
            <!-- Resplandor místico celestial -->
            <circle cx="28" cy="40" r="32" fill="#a855f7" opacity="0.25" filter="blur(6px)"/>
            <!-- Muros y torreones -->
            <rect x="10" y="40" width="36" height="38" rx="2" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
            <!-- Torre central alta -->
            <rect x="22" y="18" width="12" height="42" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
            <polygon points="20,18 28,0 36,18" fill="#facc15" stroke="#fef08a" stroke-width="1.5"/>
            <circle cx="28" cy="26" r="3" fill="#38bdf8"/>
            <!-- Torre izquierda -->
            <rect x="6" y="28" width="10" height="26" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
            <polygon points="5,28 11,14 17,28" fill="#a855f7"/>
            <!-- Torre derecha -->
            <rect x="40" y="28" width="10" height="26" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
            <polygon points="39,28 45,14 51,28" fill="#a855f7"/>
            <!-- Gran vidriera alquímica circular luminosa -->
            <circle cx="28" cy="52" r="8" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5"/>
            <!-- Bandera ondeando en la cima -->
            <polygon points="28,0 36,3 28,6" fill="#38bdf8"/>
            <!-- Destello estelar en la aguja -->
            <text x="28" y="-3" font-size="9" fill="#fde047" text-anchor="middle">✨</text>
          </g>
          <text x="282" y="132" font-size="7" font-weight="900" fill="#a7f3d0" text-anchor="middle">¡Mi destino!</text>
        </g>
      </svg>
    `;
  }

  getSchoolExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Suelo del patio escolar -->
        <line x1="10" y1="150" x2="310" y2="150" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
        <rect x="10" y="150" width="300" height="22" fill="#0f172a" opacity="0.5"/>

        <!-- Edificio del Colegio / Laboratorio Escolar (Se encoge cómicamente con la explosión) -->
        <g class="story-anim-ch1-building">
          <!-- Sombra en la base -->
          <ellipse cx="75" cy="150" rx="55" ry="7" fill="#020617" opacity="0.6"/>
          <!-- Estructura principal de mampostería -->
          <rect x="25" y="75" width="100" height="75" rx="4" fill="#334155" stroke="#64748b" stroke-width="2"/>
          <!-- Zócalo de piedra -->
          <rect x="22" y="142" width="106" height="8" rx="2" fill="#1e293b"/>
          <!-- Techo a dos aguas con tejas -->
          <polygon points="18,75 75,30 132,75" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
          <line x1="75" y1="30" x2="75" y2="75" stroke="#334155" stroke-width="1.5" stroke-dasharray="2,2"/>
          
          <!-- Chimenea de ventilación química -->
          <rect x="104" y="24" width="12" height="20" rx="1.5" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
          <rect x="102" y="22" width="16" height="4" rx="1" fill="#475569"/>

          <!-- Torre del reloj / campana escolar -->
          <rect x="65" y="14" width="20" height="18" rx="2" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
          <polygon points="61,14 75,2 89,14" fill="#64748b" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="75" cy="23" r="4.5" fill="#fef08a" stroke="#334155" stroke-width="1"/>
          <!-- Banderita escolar ondeando -->
          <line x1="75" y1="2" x2="75" y2="-4" stroke="#cbd5e1" stroke-width="1.5"/>
          <polygon points="75,-4 83,-1 75,2" fill="#38bdf8"/>

          <!-- Ventana Izquierda (Laboratorio con líquido cian) -->
          <rect x="35" y="88" width="20" height="24" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
          <rect x="37" y="100" width="16" height="10" fill="#06b6d4" opacity="0.85"/>
          <line x1="45" y1="88" x2="45" y2="112" stroke="#64748b" stroke-width="1"/>
          <line x1="35" y1="100" x2="55" y2="100" stroke="#64748b" stroke-width="1"/>

          <!-- Ventana Derecha (Laboratorio con líquido púrpura) -->
          <rect x="95" y="88" width="20" height="24" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
          <rect x="97" y="100" width="16" height="10" fill="#a855f7" opacity="0.85"/>
          <line x1="105" y1="88" x2="105" y2="112" stroke="#64748b" stroke-width="1"/>
          <line x1="95" y1="100" x2="115" y2="100" stroke="#64748b" stroke-width="1"/>

          <!-- Buhardilla / Ventana circular superior -->
          <circle cx="75" cy="54" r="9" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
          <circle cx="75" cy="54" r="7" fill="#f59e0b" opacity="0.75"/>
          <line x1="75" y1="45" x2="75" y2="63" stroke="#64748b" stroke-width="1"/>
          <line x1="66" y1="54" x2="84" y2="54" stroke="#64748b" stroke-width="1"/>

          <!-- Puerta del colegio y cartel -->
          <rect x="65" y="112" width="20" height="30" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
          <circle cx="80" cy="127" r="1.5" fill="#facc15"/>
          <rect x="61" y="102" width="28" height="7" rx="1.5" fill="#f59e0b" opacity="0.95"/>
          <text x="75" y="107.5" font-size="4" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">LABORATORIO</text>

          <!-- Manchas cómicas de hollín -->
          <circle cx="50" cy="80" r="9" fill="#1e293b" opacity="0.6"/>
          <circle cx="102" cy="76" r="10" fill="#1e293b" opacity="0.6"/>
        </g>

        <!-- Bocadillo cómico tras encogerse -->
        <g class="story-anim-ch1-poof-bubble">
          <rect x="30" y="65" width="90" height="22" rx="11" fill="#0f172a" stroke="#a855f7" stroke-width="2" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))"/>
          <polygon points="71,87 79,87 75,93" fill="#0f172a"/>
          <text x="75" y="79" font-size="9" font-weight="900" fill="#fde047" text-anchor="middle">💥 ¡Se encogió! 😅</text>
        </g>

        <!-- Nube de explosión cómica púrpura animada -->
        <g class="story-anim-ch1-boom-cloud">
          <circle cx="65" cy="45" r="30" fill="#a855f7" opacity="0.9"/>
          <circle cx="95" cy="35" r="36" fill="#c084fc" opacity="0.85"/>
          <circle cx="125" cy="48" r="28" fill="#e879f9" opacity="0.9"/>
          <circle cx="45" cy="55" r="22" fill="#d946ef" opacity="0.85"/>
        </g>
        <g class="story-anim-ch1-boom-text">
          <text x="95" y="44" font-size="22" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="1">💥 ¡BOOM!</text>
        </g>

        <!-- Científico asustado con bata tiznada y frasco en mano -->
        <g class="story-anim-ch1-scientist" transform="translate(180, 95)">
          <!-- Cabeza y ojos sorprendidos -->
          <circle cx="15" cy="15" r="10" fill="#fed7aa"/>
          <path d="M 8 25 L 22 25 L 26 55 L 4 55 Z" fill="#e2e8f0"/>
          <!-- Ojos abiertos por el susto -->
          <circle cx="11" cy="13" r="2.5" fill="#ffffff"/>
          <circle cx="11" cy="13" r="1.5" fill="#0f172a"/>
          <circle cx="19" cy="13" r="2.5" fill="#ffffff"/>
          <circle cx="19" cy="13" r="1.5" fill="#0f172a"/>
          <!-- Boca abierta "O" -->
          <circle cx="15" cy="20" r="2" fill="#0f172a"/>
          <!-- Manchas de hollín en la cara y bata -->
          <circle cx="18" cy="18" r="3.5" fill="#334155" opacity="0.85"/>
          <circle cx="12" cy="35" r="4" fill="#334155" opacity="0.6"/>
          <!-- Frasco humeante en la mano -->
          <text x="15" y="48" font-size="12" text-anchor="middle">🧪</text>
          <!-- Mensaje cómico del científico -->
          <text x="15" y="-3" font-size="8.5" font-weight="900" fill="#93c5fd" text-anchor="middle">"¿Ups...?"</text>
        </g>

        <!-- Perrito Mirko esperando afuera moviendo la cola feliz -->
        <g class="story-anim-ch1-dog" transform="translate(245, 115)">
          <ellipse cx="20" cy="22" rx="14" ry="10" fill="#94a3b8"/>
          <circle cx="10" cy="14" r="8" fill="#94a3b8"/>
          <circle cx="8" cy="12" r="1.5" fill="#0f172a"/>
          <ellipse cx="6" cy="10" rx="3" ry="6" fill="#64748b"/>
          <path class="story-anim-ch1-tail" d="M 32 20 Q 42 12 36 6" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" fill="none"/>
          <text x="20" y="40" font-size="9" font-weight="900" fill="#cbd5e1" text-anchor="middle">🐶 Mirko</text>
        </g>
      </svg>
    `;
  }

  getCollegeExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Suelo de la facultad -->
        <line x1="15" y1="152" x2="305" y2="152" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3"/>

        <!-- Fachada de la facultad con columnas -->
        <g class="story-anim-ch2-building">
          <rect x="30" y="80" width="130" height="70" rx="3" fill="#1e293b" stroke="#475569" stroke-width="2"/>
          <line x1="50" y1="80" x2="50" y2="150" stroke="#94a3b8" stroke-width="4"/>
          <line x1="80" y1="80" x2="80" y2="150" stroke="#94a3b8" stroke-width="4"/>
          <line x1="110" y1="80" x2="110" y2="150" stroke="#94a3b8" stroke-width="4"/>
          <line x1="140" y1="80" x2="140" y2="150" stroke="#94a3b8" stroke-width="4"/>
          <text x="95" y="65" font-size="20" text-anchor="middle">🎓</text>
        </g>

        <!-- Nube de humo esmeralda y fuego animada -->
        <g class="story-anim-ch2-boom-cloud">
          <circle cx="140" cy="45" r="32" fill="#10b981" opacity="0.85"/>
          <circle cx="175" cy="35" r="38" fill="#34d399" opacity="0.8"/>
          <circle cx="210" cy="50" r="30" fill="#6ee7b7" opacity="0.85"/>
        </g>
        <g class="story-anim-ch2-boom-text">
          <text x="175" y="48" font-size="20" font-weight="900" fill="#fef08a" text-anchor="middle">💥 ¡KABOOM!</text>
        </g>

        <!-- Gente chiquita escapando en pánico -->
        <g class="story-anim-ch2-flee-1">
          <text x="0" y="0" font-size="16">🏃‍♂️</text>
          <text x="-9" y="-6" font-size="8">💨</text>
        </g>
        <g class="story-anim-ch2-flee-2">
          <text x="0" y="0" font-size="15">🏃‍♀️</text>
          <text x="-7" y="-7" font-size="7">📑</text>
        </g>
        <g class="story-anim-ch2-flee-3">
          <text x="0" y="0" font-size="15">😱</text>
        </g>
        <g class="story-anim-ch2-flee-bubble">
          <rect x="36" y="98" width="112" height="20" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="1.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"/>
          <text x="92" y="111" font-size="7.5" font-weight="900" fill="#a7f3d0" text-anchor="middle">¡SÁLVESE QUIEN PUEDA! 🏃💨</text>
        </g>

        <!-- Gato Tom durmiendo plácidamente con zzz -->
        <g class="story-anim-ch2-cat" transform="translate(230, 115)">
          <ellipse cx="25" cy="22" rx="16" ry="11" fill="#334155"/>
          <circle cx="12" cy="18" r="9" fill="#334155"/>
          <polygon points="6,12 10,5 14,12" fill="#475569"/>
          <polygon points="12,12 16,5 20,12" fill="#475569"/>
          <path d="M 9 19 Q 12 21 15 19" stroke="#94a3b8" stroke-width="1.5" fill="none"/>
          <path class="story-anim-ch2-cat-tail" d="M 38 24 Q 48 20 44 12" stroke="#334155" stroke-width="3" stroke-linecap="round" fill="none"/>
          <text class="story-anim-ch2-zzz" x="14" y="5" font-size="11" fill="#93c5fd" font-weight="bold">zzZ</text>
          <text x="25" y="40" font-size="9" font-weight="900" fill="#cbd5e1" text-anchor="middle">🐱 Tom (zzZ)</text>
        </g>
      </svg>
    `;
  }

  getFriendsBarExplosionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container">
        <!-- Brindis de vasos -->
        <g class="story-anim-ch3-toast">
          <text x="50" y="55" font-size="28">🍻</text>
        </g>
        <rect x="70" y="110" width="180" height="15" rx="4" fill="#78350f" stroke="#b45309" stroke-width="2"/>
        <line x1="90" y1="125" x2="90" y2="160" stroke="#78350f" stroke-width="4"/>
        <line x1="230" y1="125" x2="230" y2="160" stroke="#78350f" stroke-width="4"/>
        <!-- Destello y salpicaduras de colores -->
        <g class="story-anim-ch3-splash">
          <circle cx="160" cy="85" r="32" fill="#f59e0b" opacity="0.85"/>
          <circle cx="135" cy="70" r="22" fill="#38bdf8" opacity="0.85"/>
          <circle cx="185" cy="70" r="22" fill="#ec4899" opacity="0.85"/>
          <circle cx="120" cy="55" r="5" fill="#facc15" opacity="0.9"/>
          <circle cx="200" cy="55" r="6" fill="#38bdf8" opacity="0.9"/>
          <circle cx="160" cy="45" r="7" fill="#ec4899" opacity="0.9"/>
        </g>
        <g class="story-anim-ch3-text">
          <text x="160" y="88" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">✨ ¡PLASH! ✨</text>
        </g>
        <!-- Amiga Nina riendo -->
        <g class="story-anim-ch3-nina" transform="translate(40, 85)">
          <circle cx="18" cy="18" r="11" fill="#fed7aa"/>
          <path d="M 10 30 Q 18 26 26 30 L 30 65 L 6 65 Z" fill="#ec4899"/>
          <text x="18" y="12" font-size="12" text-anchor="middle">💇‍♀️</text>
          <text x="18" y="75" font-size="9" font-weight="900" fill="#f472b6" text-anchor="middle">Nina 😂</text>
        </g>
        <!-- Científico disculpándose -->
        <g class="story-anim-ch3-scientist" transform="translate(245, 85)">
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
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container">
        <!-- Sillón cálido -->
        <path d="M 60 145 L 60 95 Q 60 75 90 75 L 180 75 Q 210 75 210 95 L 210 145 Z" fill="#831843" stroke="#be185d" stroke-width="2"/>
        <!-- Científico durmiendo -->
        <g class="story-anim-ch4-scientist" transform="translate(90, 80)">
          <circle cx="25" cy="20" r="12" fill="#fed7aa"/>
          <path d="M 20 22 Q 25 24 30 22" stroke="#475569" stroke-width="2" fill="none"/>
          <rect x="10" y="32" width="60" height="30" rx="8" fill="#0284c7"/>
          <text class="story-anim-ch4-zzz" x="75" y="15" font-size="14" fill="#93c5fd" font-weight="bold">zzZ</text>
        </g>
        <!-- Bombilla brillante de idea -->
        <g class="story-anim-ch4-lightbulb" transform="translate(180, 25)">
          <circle cx="20" cy="20" r="18" fill="#facc15" filter="drop-shadow(0 0 12px #facc15)"/>
          <text x="20" y="27" font-size="22" text-anchor="middle">💡</text>
        </g>
        <!-- Gatita Matilda ronroneando -->
        <g class="story-anim-ch4-cat" transform="translate(225, 115)">
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
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container">
        <!-- Probetas gigantes de laboratorio -->
        <g class="story-anim-ch5-flasks">
          <g transform="translate(60, 30)">
            <rect x="10" y="10" width="35" height="110" rx="10" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="2.5"/>
            <rect class="story-anim-ch5-liquid1" x="12" y="55" width="31" height="63" rx="8" fill="#0284c7"/>
            <text x="27" y="135" font-size="9" font-weight="900" fill="#38bdf8" text-anchor="middle">Max 6</text>
          </g>
          <g transform="translate(125, 15)">
            <rect x="10" y="10" width="42" height="130" rx="12" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" stroke-width="2.5"/>
            <rect class="story-anim-ch5-liquid2" x="12" y="60" width="38" height="78" rx="10" fill="#d97706"/>
            <text x="31" y="152" font-size="9" font-weight="900" fill="#f59e0b" text-anchor="middle">Titán 8</text>
          </g>
          <!-- Tubo fino 1x1 con burbujitas -->
          <g transform="translate(195, 45)">
            <rect x="10" y="10" width="18" height="90" rx="6" fill="rgba(168, 85, 247, 0.3)" stroke="#c084fc" stroke-width="2"/>
            <rect class="story-anim-ch5-liquid3" x="11" y="60" width="16" height="38" rx="5" fill="#9333ea"/>
            <circle class="story-anim-ch5-bubble1" cx="19" cy="45" r="2.5" fill="#f3e8ff"/>
            <circle class="story-anim-ch5-bubble2" cx="19" cy="30" r="2" fill="#f3e8ff"/>
            <text x="19" y="115" font-size="8" font-weight="900" fill="#d8b4fe" text-anchor="middle">1x1 ✨</text>
          </g>
        </g>
        <!-- Bianca supervisando -->
        <g class="story-anim-ch5-bianca" transform="translate(245, 75)">
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
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Suelo místico -->
        <line x1="20" y1="156" x2="300" y2="156" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.45"/>

        <!-- Cielo estrellado y constelaciones -->
        <g class="story-anim-ch6-stars">
          <circle cx="50" cy="35" r="2" fill="#fef08a"/>
          <circle cx="120" cy="25" r="2.5" fill="#ffffff"/>
          <circle cx="220" cy="30" r="2" fill="#fef08a"/>
          <circle cx="280" cy="45" r="2.5" fill="#ffffff"/>
          <circle cx="170" cy="18" r="1.5" fill="#93c5fd"/>
        </g>

        <!-- Corazón alquímico resplandeciente central -->
        <g class="story-anim-ch6-heart" transform="translate(140, 48)">
          <circle cx="20" cy="20" r="26" fill="rgba(244, 63, 94, 0.25)" filter="blur(6px)"/>
          <text x="20" y="28" font-size="28" text-anchor="middle">💖</text>
        </g>

        <!-- Bocadillo de sabiduría de Zoila en el centro -->
        <g class="story-anim-ch6-wisdom-bubble">
          <rect x="75" y="22" width="170" height="24" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#ec4899" stroke-width="1.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"/>
          <text x="160" y="38" font-size="8.5" font-weight="900" fill="#fbcfe8" text-anchor="middle">"Escucha la verdad de tu corazón... 💖"</text>
        </g>

        <!-- Mentora Zoila (lado izquierdo, separada) -->
        <g transform="translate(50, 78)">
          <g class="story-anim-ch6-mentor-breathe">
            <circle cx="20" cy="20" r="13" fill="#fed7aa"/>
            <path d="M 6 32 L 34 32 L 38 75 L 2 75 Z" fill="#6366f1"/>
            <path d="M 6 20 Q 6 8 20 8 Q 34 8 34 20 Q 36 28 32 30 Q 28 20 20 20 Q 12 20 8 30 Z" fill="#cbd5e1"/>
            <circle cx="20" cy="7" r="5" fill="#94a3b8"/>
            <text x="20" y="15" font-size="11" text-anchor="middle">👓</text>
            <text class="story-secret-keyword" data-word="zoila" x="20" y="90" font-size="9" font-weight="900" fill="#a5b4fc" text-anchor="middle">Zoila</text>
          </g>
        </g>

        <!-- Científico escuchando atentamente (lado derecho, separado) -->
        <g transform="translate(230, 78)">
          <g class="story-anim-ch6-scientist-breathe">
            <circle cx="20" cy="20" r="13" fill="#fed7aa"/>
            <path d="M 6 32 L 34 32 L 38 75 L 2 75 Z" fill="#0284c7"/>
            <circle cx="16" cy="19" r="1.5" fill="#0f172a"/>
            <circle cx="24" cy="19" r="1.5" fill="#0f172a"/>
            <path d="M 16 25 Q 20 28 24 25" stroke="#78350f" stroke-width="1.2" fill="none"/>
            <text x="20" y="90" font-size="9" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 📖</text>
          </g>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 7: ECOS EN LA NOCHE (REFLEXIÓN DEL CONSEJO) ---
  getNightReflectionSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Ventana con cielo nocturno estrellado -->
        <rect x="20" y="15" width="280" height="90" rx="8" fill="#020617" stroke="#334155" stroke-width="1.5"/>
        <line x1="160" y1="15" x2="160" y2="105" stroke="#1e293b" stroke-width="2"/>
        <line x1="20" y1="60" x2="300" y2="60" stroke="#1e293b" stroke-width="2"/>
        <text x="50" y="45" font-size="16">🌙</text>
        <text x="110" y="35" font-size="10">✨</text>
        <text x="200" y="40" font-size="10">✨</text>
        <text x="265" y="35" font-size="12">⭐</text>

        <!-- Nube de pensamiento luminosa flotante con el recuerdo del consejo y de Freya -->
        <g class="story-anim-ch7refl-cloud">
          <ellipse cx="160" cy="48" rx="88" ry="30" fill="rgba(15, 23, 42, 0.95)" stroke="#c084fc" stroke-width="1.5" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))"/>
          <circle cx="160" cy="84" r="5" fill="#0f172a" stroke="#c084fc" stroke-width="1"/>
          <circle cx="152" cy="94" r="3" fill="#0f172a" stroke="#c084fc" stroke-width="1"/>
          
          <!-- Recuerdo de Zoila (Corazón palpitante) -->
          <g class="story-anim-ch7refl-heart" transform="translate(108, 48)">
            <text x="0" y="0" font-size="18" text-anchor="middle">💖</text>
            <text x="0" y="15" font-size="7" font-weight="900" fill="#f472b6" text-anchor="middle">Zoila</text>
          </g>

          <text x="148" y="46" font-size="12" font-weight="900" fill="#cbd5e1" text-anchor="middle">¿?</text>

          <!-- Recuerdo fugaz de Freya con destellos -->
          <g class="story-anim-ch7refl-freya" transform="translate(195, 48)">
            <text x="0" y="-3" font-size="18" text-anchor="middle">🌸</text>
            <text class="story-secret-keyword" data-word="freya" x="0" y="15" font-size="8" font-weight="900" fill="#f472b6" text-anchor="middle">Freya</text>
          </g>
        </g>

        <!-- Mesa de madera del alquimista -->
        <rect x="15" y="132" width="290" height="36" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <line x1="20" y1="140" x2="300" y2="140" stroke="#0f172a" stroke-width="1"/>

        <!-- Vela encendida en la mesa -->
        <g transform="translate(50, 112)">
          <rect x="0" y="10" width="8" height="18" rx="1.5" fill="#fef08a"/>
          <path class="story-anim-ch7refl-candle" d="M 4 2 Q 8 6 4 10 Q 0 6 4 2 Z" fill="#f59e0b"/>
          <circle cx="4" cy="5" r="9" fill="rgba(245, 158, 11, 0.25)" filter="blur(3px)"/>
        </g>

        <!-- Libro abierto y pluma -->
        <g transform="translate(80, 126)">
          <polygon points="0,6 18,2 36,6 36,16 18,12 0,16" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
          <line x1="18" y1="2" x2="18" y2="12" stroke="#94a3b8" stroke-width="1"/>
          <text x="38" y="8" font-size="10">🪶</text>
        </g>

        <!-- Alquimista pensativo con la mano en la barbilla -->
        <g transform="translate(195, 96)">
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
          <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
          <path d="M 16 24 Q 20 23 24 24" stroke="#78350f" stroke-width="1.2" fill="none"/>
          <text x="30" y="24" font-size="11">🤔</text>
          <path d="M 8 30 L 32 30 L 36 60 L 4 60 Z" fill="#0284c7"/>
          <text x="20" y="70" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 💭</text>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 8 (RUTA AMOR): EL FLECHAZO INESPERADO ---
  getLoveAtFirstSightSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Jardín Botánico: Cantero de flores y farola -->
        <line x1="15" y1="154" x2="305" y2="154" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3"/>
        <rect x="15" y="154" width="290" height="18" fill="#0f172a" opacity="0.6"/>

        <!-- Flores del cantero que se mecen suavemente -->
        <g class="story-anim-ch8love-flowers" transform="translate(130, 130)">
          <text x="0" y="20" font-size="18">🌸</text>
          <text x="20" y="22" font-size="16">🌷</text>
          <text x="38" y="19" font-size="17">🌺</text>
          <text x="56" y="21" font-size="16">🌼</text>
        </g>

        <!-- Mariposa mágica revoloteando -->
        <g transform="translate(160, 85)">
          <text x="0" y="0" font-size="14">🦋</text>
        </g>

        <!-- Corazoncitos que flotan desde el pecho del alquimista -->
        <g class="story-anim-ch8love-hearts" transform="translate(110, 95)">
          <text x="0" y="0" font-size="14" fill="#f43f5e">💖</text>
          <text x="12" y="-10" font-size="12" fill="#ec4899">💕</text>
          <text x="24" y="-20" font-size="10" fill="#f43f5e">💘</text>
        </g>

        <!-- Científico sonrojado y flechado (lado izquierdo) -->
        <g transform="translate(60, 82)">
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <circle cx="16" cy="17" r="2" fill="#0f172a"/>
          <circle cx="24" cy="17" r="2" fill="#0f172a"/>
          <circle cx="17" cy="16" r="0.8" fill="#ffffff"/>
          <circle cx="25" cy="16" r="0.8" fill="#ffffff"/>
          <circle class="story-anim-ch8love-blush" cx="13" cy="22" r="3.5" fill="#f43f5e" opacity="0.85"/>
          <circle class="story-anim-ch8love-blush" cx="27" cy="22" r="3.5" fill="#f43f5e" opacity="0.85"/>
          <path d="M 16 23 Q 20 27 24 23" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <path d="M 8 30 L 32 30 L 36 72 L 4 72 Z" fill="#0284c7"/>
          <text x="32" y="45" font-size="14">🌹</text>
          <text x="20" y="84" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 😳</text>
        </g>

        <!-- Freya cuidando el jardín (lado derecho) -->
        <g transform="translate(225, 82)">
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <path d="M 6 18 Q 6 4 20 4 Q 34 4 34 18 Q 35 28 32 31 Q 28 18 20 18 Q 12 18 8 31 Z" fill="#92400e"/>
          <text x="28" y="12" font-size="11" text-anchor="middle">🌸</text>
          <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
          <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
          <path d="M 16 22 Q 20 26 24 22" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <path d="M 8 30 L 32 30 L 36 72 L 4 72 Z" fill="#ec4899"/>
          <text x="6" y="45" font-size="14">🪴</text>
          <text x="20" y="84" font-size="8" font-weight="900" fill="#f472b6" text-anchor="middle">Freya 💕</text>
        </g>

        <!-- Globito cómico del flechazo -->
        <g transform="translate(90, 24)">
          <rect x="0" y="0" width="140" height="24" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#f43f5e" stroke-width="1.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"/>
          <text x="70" y="16" font-size="8.5" font-weight="900" fill="#fecdd3" text-anchor="middle">¡Reacción química a 1000°C! 💓</text>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 9 (RUTA AMOR): TORPEZA Y TERNURA ---
  getClumsyMagicSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <line x1="15" y1="154" x2="305" y2="154" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3"/>

        <!-- Humo cósmico y chispas violetas del truco fallido -->
        <g class="story-anim-ch9love-smoke" transform="translate(90, 75)">
          <circle cx="0" cy="0" r="14" fill="#a855f7" opacity="0.6"/>
          <circle cx="10" cy="-8" r="18" fill="#c084fc" opacity="0.5"/>
          <text x="6" y="-12" font-size="12">✨</text>
          <text x="-8" y="-16" font-size="10">💥</text>
        </g>

        <!-- Científico con sombrero chamuscado y carita con hollín -->
        <g transform="translate(75, 84)">
          <polygon points="12,4 28,4 34, -12 6,-2" fill="#1e293b" stroke="#7e22ce" stroke-width="1.5"/>
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <circle cx="15" cy="15" r="3" fill="#334155" opacity="0.75"/>
          <circle cx="24" cy="22" r="2.5" fill="#334155" opacity="0.75"/>
          <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
          <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
          <path d="M 16 24 Q 20 22 24 24" stroke="#78350f" stroke-width="1.2" fill="none"/>
          <path d="M 8 30 L 32 30 L 36 70 L 4 70 Z" fill="#0284c7"/>
          <line x1="32" y1="42" x2="52" y2="28" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/>
          <text x="56" y="26" font-size="10">✨</text>
          <text x="20" y="82" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 😅</text>
        </g>

        <!-- Freya riendo con ternura infinita y limpiándole el hollín -->
        <g class="story-anim-ch9love-freya" transform="translate(190, 84)">
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <path d="M 6 18 Q 6 4 20 4 Q 34 4 34 18 Q 35 28 32 31 Q 28 18 20 18 Q 12 18 8 31 Z" fill="#92400e"/>
          <text x="28" y="12" font-size="11" text-anchor="middle">🌸</text>
          <path d="M 14 17 Q 17 14 20 17" stroke="#0f172a" stroke-width="1.8" fill="none"/>
          <path d="M 22 17 Q 25 14 28 17" stroke="#0f172a" stroke-width="1.8" fill="none"/>
          <path d="M 17 22 Q 21 27 25 22" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <path d="M 8 30 L 32 30 L 36 70 L 4 70 Z" fill="#ec4899"/>
          <text x="-4" y="38" font-size="14">🧻</text>
          <text x="20" y="82" font-size="8" font-weight="900" fill="#f472b6" text-anchor="middle">Freya 🥰</text>
        </g>

        <!-- Globito cómplice y tierno de Freya -->
        <g class="story-anim-ch9love-bubble" transform="translate(125, 26)">
          <rect x="0" y="0" width="165" height="26" rx="12" fill="rgba(15, 23, 42, 0.95)" stroke="#ec4899" stroke-width="1.8" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"/>
          <text x="82" y="17" font-size="9" font-weight="900" fill="#fce7f3" text-anchor="middle">"¡Eres un desastre adorable! 💕"</text>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 8 (RUTA CIENCIA): LA FÓRMULA UNIVERSAL ---
  getWorldFormulaSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <!-- Pizarra del laboratorio llena de fórmulas benéficas -->
        <rect x="25" y="18" width="160" height="95" rx="5" fill="#064e3b" stroke="#047857" stroke-width="2"/>
        <text x="40" y="38" font-size="9" font-family="monospace" fill="#a7f3d0">H2O + ⚗️ = ∞ 💧</text>
        <text x="40" y="55" font-size="8" font-family="monospace" fill="#6ee7b7">Purificación Universal</text>
        <text x="40" y="72" font-size="8" font-family="monospace" fill="#6ee7b7">Salvar al Mundo = 100%</text>
        <text x="40" y="92" font-size="11">🌍 ✨ 🧪 💧</text>

        <!-- Matraz de energía pura luminosa en el centro -->
        <g class="story-anim-ch8sci-globe" transform="translate(160, 68)">
          <circle cx="0" cy="0" r="26" fill="rgba(56, 189, 248, 0.25)" filter="blur(6px)"/>
          <text x="0" y="8" font-size="28" text-anchor="middle">🌍</text>
        </g>

        <!-- Mesa con tubos de ensayo purificadores -->
        <rect x="15" y="135" width="290" height="30" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <g transform="translate(60, 116)">
          <rect x="0" y="0" width="8" height="22" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
          <rect class="story-anim-ch8sci-liquid" x="1.5" y="6" width="5" height="15" rx="2.5" fill="#38bdf8"/>
        </g>
        <g transform="translate(75, 116)">
          <rect x="0" y="0" width="8" height="22" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
          <rect class="story-anim-ch8sci-liquid" x="1.5" y="10" width="5" height="11" rx="2.5" fill="#10b981"/>
        </g>

        <!-- Científico señalando la fórmula con puntero -->
        <g transform="translate(225, 78)">
          <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
          <text x="20" y="15" font-size="11" text-anchor="middle">🥽</text>
          <path d="M 16 23 Q 20 26 24 23" stroke="#78350f" stroke-width="1.2" fill="none"/>
          <path d="M 8 30 L 32 30 L 36 72 L 4 72 Z" fill="#0284c7"/>
          <line x1="8" y1="45" x2="-35" y2="15" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
          <text x="20" y="84" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 🧪</text>
        </g>

        <!-- Banner superior -->
        <g transform="translate(160, 15)">
          <text x="0" y="0" font-size="8.5" font-weight="900" fill="#bae6fd" text-anchor="middle">OBJETIVO: ELIXIR HUMANITARIO 💧</text>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 9 (RUTA CIENCIA): EL ENSAYO DEL CAOS ---
  getExplosiveTestsSvg() {
    return `
      <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <line x1="15" y1="154" x2="305" y2="154" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3"/>

        <!-- 3 Explosiones en cadena: Púrpura, Verde y Naranja -->
        <g class="story-anim-ch9sci-boom1" transform="translate(60, 50)">
          <circle cx="0" cy="0" r="28" fill="#a855f7" opacity="0.85"/>
          <text x="0" y="6" font-size="16" font-weight="900" fill="#fef08a" text-anchor="middle">💥 ¡PUM!</text>
        </g>
        <g class="story-anim-ch9sci-boom2" transform="translate(160, 36)">
          <circle cx="0" cy="0" r="32" fill="#10b981" opacity="0.85"/>
          <text x="0" y="6" font-size="17" font-weight="900" fill="#ffffff" text-anchor="middle">💥 ¡BOOM!</text>
        </g>
        <g class="story-anim-ch9sci-boom3" transform="translate(260, 50)">
          <circle cx="0" cy="0" r="28" fill="#f97316" opacity="0.85"/>
          <text x="0" y="6" font-size="16" font-weight="900" fill="#fef08a" text-anchor="middle">💥 ¡ZAS!</text>
        </g>

        <!-- Manchas de pintura química en las paredes -->
        <circle cx="35" cy="85" r="12" fill="#a855f7" opacity="0.4"/>
        <circle cx="285" cy="90" r="14" fill="#f97316" opacity="0.4"/>
        <circle cx="120" cy="98" r="8" fill="#10b981" opacity="0.4"/>

        <!-- Científico en el centro, mareado y tiznado -->
        <g class="story-anim-ch9sci-scientist" transform="translate(140, 84)">
          <circle cx="20" cy="18" r="13" fill="#fed7aa"/>
          <text x="14" y="21" font-size="10" text-anchor="middle">😵‍💫</text>
          <circle cx="12" cy="14" r="3.5" fill="#1e293b" opacity="0.8"/>
          <circle cx="26" cy="19" r="4" fill="#1e293b" opacity="0.7"/>
          <path d="M 6 32 L 34 32 L 38 72 L 2 72 Z" fill="#0284c7"/>
          <text x="-4" y="50" font-size="14">🧪</text>
          <text x="32" y="50" font-size="14">🧪</text>
          <text x="20" y="85" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 😵‍💫</text>
        </g>

        <!-- Cartel cómico inferior -->
        <g transform="translate(160, 172)">
          <text x="0" y="0" font-size="8.5" font-weight="900" fill="#fde047" text-anchor="middle">"Prueba #99 fallida... pero la #100 será la buena." 😅</text>
        </g>
      </svg>
    `;
  }

  // --- CAPÍTULO 10 (RUTA CIENCIA): FINALES MALO, REGULAR Y BUENO ---
  getScienceEndingSvg(ending = 'regular') {
    if (ending === 'bad') {
      return `
        <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
          <rect x="20" y="20" width="280" height="75" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="6,4"/>
          <text x="80" y="45" font-size="12">⭐</text>
          <text x="240" y="40" font-size="12">🌙</text>
          <text x="160" y="35" font-size="10">✨</text>
          <text x="160" y="60" font-size="10" font-weight="900" fill="#f87171" text-anchor="middle">💥 ¡EL TECHO VOLÓ AL LAGO VECINO!</text>
          <line x1="20" y1="150" x2="300" y2="150" stroke="#334155" stroke-width="1.5"/>
          <g transform="translate(140, 85)">
            <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
            <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
            <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
            <path d="M 16 23 Q 20 20 24 23" stroke="#78350f" stroke-width="1.2" fill="none"/>
            <path d="M 8 30 L 32 30 L 36 65 L 4 65 Z" fill="#0284c7"/>
            <text x="32" y="55" font-size="18">🧹</text>
            <text x="-12" y="60" font-size="16">🪣</text>
            <text x="20" y="78" font-size="8" font-weight="900" fill="#94a3b8" text-anchor="middle">Alquimista 🧹😅</text>
          </g>
          <g transform="translate(160, 172)">
            <text x="0" y="0" font-size="8.5" font-weight="900" fill="#fca5a5" text-anchor="middle">FINAL MALO: "Al menos los cimientos siguen en pie..."</text>
          </g>
        </svg>
      `;
    } else if (ending === 'good') {
      return `
        <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
          <text x="40" y="45" font-size="20">🚩</text>
          <text x="280" y="45" font-size="20">🚩</text>
          <g class="story-anim-ch10end-crown" transform="translate(160, 52)">
            <circle cx="0" cy="0" r="28" fill="rgba(56, 189, 248, 0.3)" filter="blur(8px)"/>
            <text x="0" y="8" font-size="30" text-anchor="middle">💎</text>
            <text x="0" y="-18" font-size="16" text-anchor="middle">👑</text>
          </g>
          <text x="80" y="75" font-size="14">🎉</text>
          <text x="240" y="75" font-size="14">🎊</text>
          <g transform="translate(140, 85)">
            <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
            <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
            <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
            <path d="M 16 22 Q 20 27 24 22" stroke="#78350f" stroke-width="1.5" fill="none"/>
            <path d="M 8 30 L 32 30 L 36 72 L 4 72 Z" fill="#6366f1"/>
            <text x="20" y="10" font-size="14" text-anchor="middle">🌿</text>
            <text x="20" y="84" font-size="8" font-weight="900" fill="#a5b4fc" text-anchor="middle">Gran Maestro Alquimista 🏆</text>
          </g>
          <g transform="translate(160, 172)">
            <text x="0" y="0" font-size="8.5" font-weight="900" fill="#a7f3d0" text-anchor="middle">FINAL BUENO: "¡El Elixir Cristalino purificó todas las aguas del reino!" 🏆✨</text>
          </g>
        </svg>
      `;
    } else {
      // Regular ending (default)
      return `
        <svg viewBox="0 0 320 180" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
          <ellipse cx="100" cy="115" rx="42" ry="22" fill="#f59e0b" stroke="#fbbf24" stroke-width="2"/>
          <text x="100" y="112" font-size="28" text-anchor="middle">✨</text>
          <text x="65" y="90" font-size="14">✨</text>
          <text x="135" y="95" font-size="14">✨</text>
          <g class="story-anim-ch10end-soapbubble" transform="translate(100, 75)">
            <text x="-25" y="0" font-size="14">🫧</text>
            <text x="15" y="-12" font-size="18">🫧</text>
            <text x="-5" y="-25" font-size="12">🫧</text>
          </g>
          <g transform="translate(200, 75)">
            <circle cx="20" cy="18" r="12" fill="#fed7aa"/>
            <circle cx="16" cy="17" r="1.5" fill="#0f172a"/>
            <circle cx="24" cy="17" r="1.5" fill="#0f172a"/>
            <path d="M 16 22 Q 20 27 24 22" stroke="#78350f" stroke-width="1.5" fill="none"/>
            <path d="M 8 30 L 32 30 L 36 72 L 4 72 Z" fill="#0284c7"/>
            <text x="-16" y="55" font-size="20">💰</text>
            <text x="32" y="50" font-size="16">🧼</text>
            <text x="20" y="84" font-size="8" font-weight="900" fill="#facc15" text-anchor="middle">Alquimista 🪙🤑</text>
          </g>
          <g transform="translate(160, 172)">
            <text x="0" y="0" font-size="8.5" font-weight="900" fill="#fde047" text-anchor="middle">FINAL REGULAR: "¡Detergente Milagroso! Millonario limpiando calderos." 🧼✨</text>
          </g>
        </svg>
      `;
    }
  }

  getScienceEndingText(ending = 'regular') {
    if (ending === 'bad') {
      return "Agregó una gota de sulfuro incandescente y... ¡TODO VOLÓ POR LOS AIRES! El techo del laboratorio aterrizó en el lago vecino. No curó el mundo y ahora tiene que lavar cada tubo a mano desde cero. 'Bueno... al menos los cimientos siguen en pie 😅'.";
    } else if (ending === 'good') {
      return "¡Victoria alquímica! Los fluidos alcanzaron el equilibrio perfecto de separación molecular. La pócima cristalina purificó las aguas del reino y el rey lo nombró Gran Maestro Alquimista Supremo. La ciencia triunfó con gloria eterna... aunque en el fondo, una pequeña vocecita le recuerda que algún día deberá descubrir qué late más allá del laboratorio.";
    } else {
      return "La fórmula no otorgó vida eterna ni curó cosechas, pero al derramarse sobre la grasa del caldero... ¡lo dejó brillando como un espejo! Creó el detergente multiuso más vendido de la comarca. Ahora es millonario vendiendo jabón para sartenes. 'No es magia milenaria, pero las monedas no huelen mal 🪙'.";
    }
  }

  getHeartRevelationSvg() {
    return `
      <svg viewBox="0 0 320 195" class="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/70 p-2 story-svg-container select-none">
        <defs>
          <filter id="ch7-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        <!-- Suelo tenue -->
        <line x1="20" y1="162" x2="300" y2="162" stroke="#334155" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.45"/>

        <!-- Rayos de luz dorada celestial arriba -->
        <g class="story-anim-ch7-rays">
          <circle cx="160" cy="35" r="40" fill="rgba(251, 191, 36, 0.15)" filter="blur(10px)"/>
          <text x="160" y="44" font-size="22" text-anchor="middle">✨</text>
        </g>

        <!-- Corazón / Manzana alquímica que nace y se completa desde la línea roja inferior -->
        <g class="story-anim-ch7-heart-group">
          <!-- Relleno suave con resplandor que florece al completarse -->
          <path class="story-anim-ch7-heart-fill" d="M 160 120 C 142 118 126 110 120 96 C 112 78 116 60 132 50 C 144 42 156 48 160 60 C 164 48 176 42 188 50 C 204 60 208 78 200 96 C 194 110 178 118 160 120 Z" fill="rgba(244, 63, 94, 0.35)" filter="drop-shadow(0 0 14px rgba(244, 63, 94, 0.75))"/>
          <!-- Trazo izquierdo del corazón que nace de la línea inferior -->
          <path class="story-anim-ch7-heart-left" pathLength="100" d="M 160 120 C 142 118 126 110 120 96 C 112 78 116 60 132 50 C 144 42 156 48 160 60" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" fill="none"/>
          <!-- Trazo derecho del corazón que nace de la línea inferior -->
          <path class="story-anim-ch7-heart-right" pathLength="100" d="M 160 120 C 178 118 194 110 200 96 C 208 78 204 60 188 50 C 176 42 164 48 160 60" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" fill="none"/>
          <!-- Destello final en la cúspide de unión (parece el cabito / brillo de una manzana) -->
          <circle class="story-anim-ch7-heart-sparkle" cx="160" cy="60" r="3.5" fill="#fecdd3" filter="drop-shadow(0 0 6px #f43f5e)"/>
          <text class="story-anim-ch7-heart-sparkle" x="160" y="52" font-size="11" text-anchor="middle">✨</text>
        </g>

        <!-- El científico (posicionado más abajo y a la izquierda para dejar lugar a los globitos) -->
        <g class="story-anim-ch7-scientist" transform="translate(62, 88)">
          <!-- Cabeza -->
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <!-- Ojos -->
          <circle cx="16" cy="19" r="1.5" fill="#0f172a"/>
          <circle cx="24" cy="19" r="1.5" fill="#0f172a"/>
          <!-- Sonrisa inicial que luego se desilusiona con CSS -->
          <path class="story-anim-ch7-face-smile" d="M 16 23 Q 20 27 24 23" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <path class="story-anim-ch7-face-sad" d="M 16 26 Q 20 22 24 26" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <!-- Ropa de alquimista -->
          <path d="M 8 32 L 32 32 L 36 74 L 4 74 Z" fill="#0284c7"/>
          <!-- Etiqueta de nombre -->
          <text x="20" y="85" font-size="8" font-weight="900" fill="#7dd3fc" text-anchor="middle">Alquimista 🧪</text>
          <!-- Gota cómica de sudor que cae cuando ella le pregunta si es manzana -->
          <g class="story-anim-ch7-sweatdrop">
            <text x="32" y="15" font-size="12">💧</text>
          </g>
        </g>

        <!-- Freya (posicionada más abajo y a la derecha) -->
        <g class="story-anim-ch7-freya" transform="translate(218, 88)">
          <circle cx="20" cy="20" r="12" fill="#fed7aa"/>
          <!-- Cabello bonito castaño -->
          <path d="M 6 20 Q 6 6 20 6 Q 34 6 34 20 Q 35 30 32 33 Q 28 20 20 20 Q 12 20 8 33 Z" fill="#92400e"/>
          <!-- Flor decorativa en el pelo -->
          <text x="28" y="14" font-size="11" text-anchor="middle">🌸</text>
          <!-- Ojos curiosos -->
          <circle cx="16" cy="19" r="1.5" fill="#0f172a"/>
          <circle cx="24" cy="19" r="1.5" fill="#0f172a"/>
          <!-- Sonrisa curiosa / pícara -->
          <path d="M 16 23 Q 20 26 24 23" stroke="#78350f" stroke-width="1.5" fill="none"/>
          <!-- Vestido -->
          <path d="M 8 32 L 32 32 L 36 74 L 4 74 Z" fill="#ec4899"/>
          <!-- Etiqueta de nombre -->
          <text x="20" y="85" font-size="8" font-weight="900" fill="#f472b6" text-anchor="middle">Freya 💕</text>
        </g>

        <!-- ================= GLOBITOS DE CHARLA CÓMICOS ================= -->

        <!-- 1. Bocadillo de Freya (Aparece primero preguntándole si es una manzana 🍎🤔) -->
        <g class="story-anim-ch7-bubble-freya">
          <rect x="176" y="26" width="130" height="34" rx="12" fill="rgba(15, 23, 42, 0.95)" stroke="#ec4899" stroke-width="1.8" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))"/>
          <!-- Rabillo del bocadillo hacia Freya -->
          <polygon points="234,60 244,60 238,70" fill="rgba(15, 23, 42, 0.95)"/>
          <polyline points="234,60 238,70 244,60" stroke="#ec4899" stroke-width="1.8" fill="none"/>
          <text x="193" y="49" font-size="16" text-anchor="middle">🍎</text>
          <text x="249" y="48" font-size="10" font-weight="900" fill="#fce7f3" text-anchor="middle">¿Es una manzana? 🤔</text>
        </g>

        <!-- 2. Bocadillo del Alquimista: Fase 1 (Orgulloso: ¡Es un corazón! ❤️) -->
        <g class="story-anim-ch7-bubble-scientist-heart">
          <rect x="14" y="26" width="128" height="34" rx="12" fill="rgba(15, 23, 42, 0.95)" stroke="#38bdf8" stroke-width="1.8" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))"/>
          <!-- Rabillo hacia el científico -->
          <polygon points="74,60 84,60 80,70" fill="rgba(15, 23, 42, 0.95)"/>
          <polyline points="74,60 80,70 84,60" stroke="#38bdf8" stroke-width="1.8" fill="none"/>
          <text x="31" y="49" font-size="15" text-anchor="middle">❤️</text>
          <text x="83" y="48" font-size="10" font-weight="900" fill="#bae6fd" text-anchor="middle">¡No, es un corazón!</text>
        </g>

        <!-- 3. Bocadillo del Alquimista: Fase 2 (Desilusión: Corazón roto y carita triste 💔🥺) -->
        <g class="story-anim-ch7-bubble-scientist-sad">
          <rect x="16" y="26" width="124" height="34" rx="12" fill="rgba(15, 23, 42, 0.95)" stroke="#f43f5e" stroke-width="1.8" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))"/>
          <!-- Rabillo hacia el científico -->
          <polygon points="74,60 84,60 80,70" fill="rgba(15, 23, 42, 0.95)"/>
          <polyline points="74,60 80,70 84,60" stroke="#f43f5e" stroke-width="1.8" fill="none"/>
          <text x="40" y="49" font-size="15" text-anchor="middle">💔</text>
          <text x="64" y="49" font-size="15" text-anchor="middle">🥺</text>
          <text x="96" y="48" font-size="9.5" font-weight="900" fill="#fca5a5" text-anchor="middle">...snif 💧</text>
        </g>

        <!-- 4. Texto cómico inferior: "No era muy buen artista. Por eso se dedicó a la magia." -->
        <g class="story-anim-ch7-caption">
          <rect x="22" y="168" width="276" height="22" rx="11" fill="rgba(15, 23, 42, 0.92)" stroke="rgba(244, 63, 94, 0.45)" stroke-width="1.2" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"/>
          <text x="160" y="182.5" font-size="8.5" font-weight="900" fill="#fecdd3" text-anchor="middle" letter-spacing="0.2">
            "No era muy buen artista... por eso se dedicó a la magia." 🧙‍♂️✨
          </text>
        </g>
      </svg>
    `;
  }

  // --- SVG DEL GRAN FINAL ESPECIAL: NAZA, PERROS Y GATOS ---
  getSpecialEndingFamilySvg() {
    return `
      <svg viewBox="0 0 360 230" class="w-full h-full rounded-3xl bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950/90 p-2 shadow-2xl story-svg-container">
        <!-- Hogar cálido de fondo -->
        <rect x="25" y="40" width="310" height="170" rx="16" fill="rgba(30, 41, 59, 0.7)" stroke="#64748b" stroke-width="1.5"/>
        <!-- Ventana al jardín soleado con flores -->
        <g class="story-anim-fe-sun">
          <rect x="50" y="55" width="60" height="55" rx="8" fill="#38bdf8" opacity="0.35" stroke="#94a3b8" stroke-width="1.5"/>
          <line x1="80" y1="55" x2="80" y2="110" stroke="#94a3b8" stroke-width="1.5"/>
          <line x1="50" y1="82" x2="110" y2="82" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="80" cy="70" r="7" fill="#fbbf24"/>
          <text x="70" y="105" font-size="10">🌸</text>
          <text x="90" y="105" font-size="10">🌿</text>
        </g>

        <!-- Cuadro con la bata de laboratorio colgada (Adiós laboratorio) -->
        <g class="story-anim-fe-coat">
          <rect x="250" y="55" width="55" height="50" rx="6" fill="#1e293b" stroke="#ca8a04" stroke-width="1.5"/>
          <text x="277" y="78" font-size="16" text-anchor="middle">🥼</text>
          <text x="277" y="96" font-size="7" font-weight="900" fill="#fde047" text-anchor="middle">JUBILADO</text>
        </g>

        <!-- Corazón central brillante -->
        <g class="story-anim-fe-heart">
          <circle cx="180" cy="55" r="22" fill="rgba(244, 63, 94, 0.3)" filter="blur(8px)"/>
          <text x="180" y="65" font-size="28" text-anchor="middle">💖</text>
        </g>

        <!-- El Científico (feliz y sonriente, con ropa cómoda) -->
        <g class="story-anim-fe-mauro" transform="translate(130, 85)">
          <circle cx="20" cy="20" r="14" fill="#fed7aa"/>
          <path d="M 14 18 Q 20 22 26 18" stroke="#78350f" stroke-width="2" fill="none"/>
          <circle cx="16" cy="16" r="2" fill="#0f172a"/>
          <circle cx="24" cy="16" r="2" fill="#0f172a"/>
          <path d="M 8 34 L 32 34 L 36 82 L 4 82 Z" fill="#0284c7"/>
          <text x="20" y="95" font-size="9" font-weight="900" fill="#93c5fd" text-anchor="middle">Mauro</text>
        </g>

        <!-- Chica Naza (hermosa, sonriente, tomada de la mano) -->
        <g class="story-anim-fe-naza" transform="translate(190, 85)">
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
        <g class="story-anim-fe-poodle" transform="translate(60, 145)">
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
          <circle class="story-anim-fe-tail" cx="40" cy="14" r="5" fill="#ffffff"/>
          <text x="25" y="44" font-size="8" font-weight="900" fill="#e2e8f0" text-anchor="middle">Caniche Gris 🐩</text>
        </g>

        <!-- 2. GATO 1 BLANCO Y NEGRO (Tuxedo Cat 1) -->
        <g class="story-anim-fe-cat1" transform="translate(130, 160)">
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
        <g class="story-anim-fe-cat2" transform="translate(235, 155)">
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
          <circle class="story-anim-fe-yarn" cx="2" cy="22" r="4.5" fill="#ec4899"/>
          <text x="18" y="34" font-size="7" font-weight="900" fill="#cbd5e1" text-anchor="middle">B&N 🐱</text>
        </g>

        <!-- 4. GATO ATIGRADO GRIS Y NEGRO (Grey & Black Tabby Cat) -->
        <g class="story-anim-fe-tabby" transform="translate(285, 145)">
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

  // --- REPRODUCIR DE NUEVO LA ANIMACIÓN CINEMÁTICA ---
  replayAnimation() {
    const svgCont = document.getElementById('story-chapter-svg');
    if (!svgCont) return;
    const chap = this.chapters[this.currentChapterIndex];
    if (!chap) return;
    svgCont.innerHTML = '';
    void svgCont.offsetWidth; // Forzar reflow para reiniciar keyframes
    svgCont.innerHTML = chap.svg;
    if (window.audio && typeof window.audio.playMusic === 'function') {
      window.audio.playMusic('story');
    }
    if (window.audio && typeof window.audio.playPop === 'function') window.audio.playPop();
  }

  // --- ABRIR MODAL DEL MODO HISTORIA ---
  openStoryModal(chapterIndex = 0, fromGallery = false) {
    this.isOpen = true;
    this.openedFromGallery = !!fromGallery;
    this.currentChapterIndex = Math.max(0, Math.min(chapterIndex, this.chapters.length - 1));
    const modal = document.getElementById('modal-story-chapter');
    if (!modal) return;

    // Activar música animada y alegre especial para las cinemáticas/animaciones
    if (window.audio && typeof window.audio.playMusic === 'function') {
      window.audio.playMusic('story');
    }

    this.renderCurrentChapter();
    modal.classList.remove('hidden');
    if (window.game && typeof window.game.showModal === 'function') {
      window.game.showModal(modal);
    }
  }

  closeStoryModal() {
    this.isOpen = false;
    const modal = document.getElementById('modal-story-chapter');
    if (!modal) return;
    this.cancelSecretHold();
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }

    // Restaurar música ambiente según la pantalla de origen
    if (window.audio && typeof window.audio.playMusic === 'function') {
      if (this.openedFromGallery) {
        window.audio.playMusic('map');
      } else if (window.game && window.game.currentScreen === 'game') {
        window.audio.playMusic('level', window.game.currentLevel);
      } else {
        window.audio.playMusic('map');
      }
    }

    if (this.openedFromGallery) {
      this.openedFromGallery = false;
      this.openGalleryModal();
    } else if (window.game && window.game.pendingLevelToLoad) {
      // Si había un siguiente nivel esperando a que termine la animación, activarlo ahora
      const p = window.game.pendingLevelToLoad;
      window.game.pendingLevelToLoad = null;
      if (p.lvl) {
        window.game.loadLevel(p.lvl, p.seedVariation || 0, p.customLevelData || null);
      }
    }
  }

  // --- MODAL DE GALERÍA DE CINEMÁTICAS (ACCESIBLE DESDE EL MAPA, ESTILO LOGROS) ---
  openGalleryModal() {
    const modal = document.getElementById('modal-story-gallery');
    if (!modal) return;
    this.renderGalleryUI();
    modal.classList.remove('hidden');
    if (window.game && typeof window.game.showModal === 'function') {
      window.game.showModal(modal);
    }
    if (window.audio && typeof window.audio.playSelect === 'function') {
      window.audio.playSelect();
    }
  }

  closeGalleryModal() {
    const modal = document.getElementById('modal-story-gallery');
    if (!modal) return;
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }
  }

  getLockedChapters() {
    const locked = [];
    this.chapters.forEach((_, idx) => {
      const isUn = window.stateManager ? window.stateManager.isStoryChapterUnlocked(idx) : (idx === 0);
      if (!isUn) {
        locked.push(idx);
      }
    });
    return locked;
  }

  getChapterPrice(chapterIndex) {
    const locked = this.getLockedChapters();
    if (!locked.includes(chapterIndex)) return 0;
    const currentCoins = window.stateManager ? window.stateManager.getCoins() : 0;
    const totalSpent = window.stateManager?.state?.player?.totalCoinsSpent || 0;
    const remainingTarget = Math.max(0, 999999999 - totalSpent);

    // Si el usuario tiene saldo alto o está pagando con el tesoro supremo
    const pool = (currentCoins >= remainingTarget && remainingTarget > 0)
      ? remainingTarget
      : (currentCoins > 0 && currentCoins < remainingTarget && totalSpent > 0 ? currentCoins : 999999999);

    const lockedCount = Math.max(1, locked.length);
    const basePrice = Math.floor(pool / lockedCount);

    const isLastLocked = (locked[locked.length - 1] === chapterIndex);
    if (isLastLocked) {
      const others = basePrice * (lockedCount - 1);
      return Math.max(basePrice, pool - others);
    }
    return basePrice;
  }

  buyChapter(chapterIndex, price) {
    if (!window.stateManager) return;
    const currentCoins = window.stateManager.getCoins();
    if (currentCoins < price) {
      if (window.audio && typeof window.audio.playChallengeFail === 'function') {
        window.audio.playChallengeFail();
      }
      alert(`Necesitas ${price.toLocaleString('es-ES')} 🪙 monedas para adquirir esta crónica. ¡Completa los 100 niveles de la campaña para reclamar el tesoro supremo o supera el Desafío de Honor!`);
      return;
    }

    // Descontar monedas
    if (window.game && typeof window.game.spendCoins === 'function') {
      window.game.spendCoins(price);
    } else {
      window.stateManager.spendCoins(price);
    }

    // Desbloquear capítulo
    window.stateManager.unlockStoryChapter(chapterIndex);

    // Audio
    if (window.audio && typeof window.audio.playUpgrade === 'function') {
      window.audio.playUpgrade();
    }

    // Verificar logro oculto "Trabajo para esto" (999999999 monedas gastadas o todas desbloqueadas)
    const totalSpent = window.stateManager?.state?.player?.totalCoinsSpent || 0;
    if (totalSpent >= 999999999 || this.getLockedChapters().length === 0) {
      if (window.achievementManager) {
        window.achievementManager.unlock('work_for_this_999999999');
      }
    }

    // Refrescar vista
    this.renderGalleryUI();
  }

  buyAllLockedChapters() {
    if (!window.stateManager) return;
    const locked = this.getLockedChapters();
    if (locked.length === 0) return;

    const currentCoins = window.stateManager.getCoins();
    const totalSpent = window.stateManager?.state?.player?.totalCoinsSpent || 0;
    const remainingCost = Math.max(0, 999999999 - totalSpent);
    const effectiveCost = (remainingCost > 0) ? remainingCost : currentCoins;

    if (currentCoins < effectiveCost && currentCoins < 999999999) {
      if (window.audio && typeof window.audio.playChallengeFail === 'function') {
        window.audio.playChallengeFail();
      }
      alert(`Necesitas ${effectiveCost.toLocaleString('es-ES')} 🪙 monedas para desbloquear todo el archivo de crónicas. ¡Completa los 100 niveles de la campaña para reclamar el tesoro supremo o supera los Desafíos de Honor!`);
      return;
    }

    // Descontar monedas hasta consumir todo el saldo asignado
    const costToSpend = Math.min(currentCoins, effectiveCost > 0 ? effectiveCost : 999999999);
    if (window.game && typeof window.game.spendCoins === 'function') {
      window.game.spendCoins(costToSpend);
    } else {
      window.stateManager.spendCoins(costToSpend);
    }

    // Desbloquear todos los capítulos
    locked.forEach(idx => {
      window.stateManager.unlockStoryChapter(idx);
    });

    // Otorgar logro oculto "Trabajo para esto"
    if (window.achievementManager) {
      window.achievementManager.unlock('work_for_this_999999999');
    }

    // Fanfarria triunfal
    if (window.audio && typeof window.audio.playFanfare === 'function') {
      window.audio.playFanfare();
    }

    // Refrescar galería
    this.renderGalleryUI();
  }

  renderGalleryUI() {
    const container = document.getElementById('story-gallery-list');
    if (!container) return;

    let unlockedCount = 0;
    this.chapters.forEach((_, idx) => {
      if (window.stateManager && window.stateManager.isStoryChapterUnlocked(idx)) {
        unlockedCount++;
      }
    });

    const totalCount = this.chapters.length;
    const pct = Math.round((unlockedCount / totalCount) * 100);

    const lblCount = document.getElementById('story-gallery-stat-unlocked');
    const barProgress = document.getElementById('story-gallery-bar-progress');
    if (lblCount) lblCount.textContent = `${unlockedCount} / ${totalCount}`;
    if (barProgress) barProgress.style.width = `${pct}%`;

    const lockedList = this.getLockedChapters();
    const currentCoins = window.stateManager ? window.stateManager.getCoins() : 0;
    const totalSpent = window.stateManager?.state?.player?.totalCoinsSpent || 0;
    const remainingPool = Math.max(0, 999999999 - totalSpent);
    const canAffordAll = (currentCoins >= remainingPool && remainingPool > 0) || (currentCoins >= 999999999);

    let cardsHTML = '';

    // Banner de Galería (Ruta de amor secreta oculta hasta que se desbloquea)
    const isLoveRoute = this.isSecretBranchUnlocked();
    cardsHTML += `
      <div class="p-3 mb-3 rounded-2xl ${
        isLoveRoute
          ? 'bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-purple-500/20 border-2 border-pink-400/70 shadow-md shadow-pink-500/10'
          : 'bg-slate-800/80 border border-slate-700/80'
      } flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">${isLoveRoute ? '💕' : '🧪'}</span>
          <div>
            <div class="font-black ${isLoveRoute ? 'text-pink-300' : 'text-slate-200'}">
              ${isLoveRoute ? 'Ruta Especial: El Destino del Corazón (Para Naza 💕)' : 'Las Crónicas del Alquimista'}
            </div>
            <div class="text-[11px] ${isLoveRoute ? 'text-pink-200/80' : 'text-slate-400'}">
              ${isLoveRoute ? 'Has descubierto el amor verdadero entre las páginas de la alquimia.' : 'Explora la historia y completa los desafíos para desbloquear todos los capítulos.'}
            </div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full ${isLoveRoute ? 'bg-pink-500/30 text-pink-200 border border-pink-400/50' : 'bg-slate-700 text-slate-300'} text-[10px] font-mono font-bold shrink-0">
          ${isLoveRoute ? '💕 Ruta Amor' : '10 Capítulos'}
        </span>
      </div>
    `;

    // Banner de compra de archivo completo si hay capítulos pendientes
    if (lockedList.length > 0) {
      cardsHTML += `
        <div class="p-3.5 mb-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-amber-400/80 shadow-lg shadow-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center text-2xl shrink-0 font-black shadow-md">
              👑
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-xs font-black text-amber-300 uppercase tracking-wide">Comprar Archivo de Crónicas</h4>
                <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-bold">Tesoro de Campaña</span>
              </div>
              <p class="text-[11px] text-slate-200 mt-0.5">
                ¿No superaste los Desafíos de Honor? Puedes adquirir las crónicas pendientes con tu tesoro de Gran Maestro (+999.999.999 🪙).
              </p>
            </div>
          </div>
          <button id="btn-buy-all-story-chapters" class="btn-interactive w-full sm:w-auto px-4 py-2.5 rounded-xl ${
            canAffordAll
              ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black shadow-lg shadow-amber-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-amber-400/50'
          } text-xs shrink-0 flex items-center justify-center gap-1.5 transition-all active:scale-95">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-500"></i>
            <span>${canAffordAll ? 'Desbloquear Todo (999.999.999 🪙)' : 'Requiere 999.999.999 🪙'}</span>
          </button>
        </div>
      `;
    }

    this.chapters.forEach((chap, idx) => {
      const isUn = window.stateManager ? window.stateManager.isStoryChapterUnlocked(idx) : (idx === 0);
      const secret = chap.secretWord;
      const discovered = window.stateManager?.state?.secretEasterEgg?.discoveredNames || [];
      const isWordFound = secret ? discovered.includes(secret) : false;
      const price = this.getChapterPrice(idx);
      const canAffordThis = currentCoins >= price;
      const formattedPrice = price.toLocaleString('es-ES');

      const isLoveCard = chap.branch === 'love';
      cardsHTML += `
        <div class="p-3.5 rounded-2xl border transition-all ${
          isUn
            ? (isLoveCard
                ? 'bg-gradient-to-r from-pink-500/15 via-slate-800/90 to-purple-500/15 border-pink-400/60 shadow-md shadow-pink-500/10'
                : 'bg-gradient-to-r from-purple-500/15 via-slate-800/90 to-amber-500/10 border-purple-400/60 shadow-md shadow-purple-500/10')
            : 'bg-slate-800/60 border-slate-700/60 opacity-90'
        }">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
              isUn
                ? (isLoveCard
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md border border-pink-300'
                    : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md border border-purple-300')
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }">
              ${isUn ? (isLoveCard ? '💖' : '🎬') : '🔒'}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-black ${isUn ? 'text-amber-300' : 'text-slate-200'}">${chap.title}</span>
              </div>
              <p class="text-[11px] text-slate-400 truncate">${chap.subtitle}</p>
              <div class="mt-1">
                ${
                  isUn
                    ? '<span class="text-[10px] font-bold text-emerald-400 flex items-center gap-1">✓ Desbloqueado</span>'
                    : `<span class="text-[10px] font-medium text-amber-300/90 flex items-center gap-1">🪙 Desbloqueable con monedas o Desafío Sección ${chap.id}</span>`
                }
              </div>
            </div>

            <div class="shrink-0 flex items-center gap-2">
              ${
                isUn
                  ? `<button class="btn-story-play-individual px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 active:scale-95" data-chapter-index="${idx}">
                      <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                      <span>Ver</span>
                    </button>`
                  : `<button class="btn-story-buy-chapter px-3 py-1.5 rounded-xl ${
                      canAffordThis
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black shadow-md shadow-amber-500/20 active:scale-95'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-amber-400/50 font-bold'
                    } text-xs transition-all flex items-center gap-1" data-chapter-index="${idx}" data-price="${price}" title="Comprar este capítulo por ${formattedPrice} monedas">
                      <span class="font-black">🪙 Comprar</span>
                      <span class="font-mono text-[10px] font-bold">(${formattedPrice})</span>
                    </button>`
              }
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = cardsHTML;
    if (window.lucide) window.lucide.createIcons();

    // Vincular clics de botones individuales de reproducción
    const playButtons = container.querySelectorAll('.btn-story-play-individual');
    playButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chIdx = parseInt(btn.getAttribute('data-chapter-index'), 10);
        this.closeGalleryModal();
        this.openStoryModal(chIdx, true);
      });
    });

    // Vincular clics de compra individual de cada video
    const buyButtons = container.querySelectorAll('.btn-story-buy-chapter');
    buyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chIdx = parseInt(btn.getAttribute('data-chapter-index'), 10);
        const price = parseInt(btn.getAttribute('data-price'), 10);
        this.buyChapter(chIdx, price);
      });
    });

    // Vincular botón de comprar todo el archivo
    const btnBuyAll = document.getElementById('btn-buy-all-story-chapters');
    if (btnBuyAll) {
      btnBuyAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.buyAllLockedChapters();
      });
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

    if (titleEl) titleEl.textContent = chap.title;
    if (subEl) subEl.textContent = chap.subtitle;

    // Selector interactivo de finales (Malo, Regular, Bueno) para el Capítulo 10 de la Ruta de la Ciencia
    let endingSwitcher = document.getElementById('story-ending-switcher');
    if (chap.hasMultipleEndings) {
      if (!endingSwitcher && svgCont && svgCont.parentNode) {
        endingSwitcher = document.createElement('div');
        endingSwitcher.id = 'story-ending-switcher';
        endingSwitcher.className = 'flex items-center justify-center gap-2 mb-2 ending-switch-container';
        svgCont.parentNode.insertBefore(endingSwitcher, svgCont);
      }
      if (endingSwitcher) {
        endingSwitcher.classList.remove('hidden');
        endingSwitcher.innerHTML = `
          <button class="btn-ending-choice px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            this.selectedScienceEnding === 'bad' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }" data-ending="bad">💥 Final Malo</button>
          <button class="btn-ending-choice px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            this.selectedScienceEnding === 'regular' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }" data-ending="regular">🧼 Final Regular</button>
          <button class="btn-ending-choice px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            this.selectedScienceEnding === 'good' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }" data-ending="good">🏆 Final Bueno</button>
        `;
        endingSwitcher.querySelectorAll('.btn-ending-choice').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedScienceEnding = btn.getAttribute('data-ending');
            if (window.audio && typeof window.audio.playSelect === 'function') window.audio.playSelect();
            this.renderCurrentChapter();
          });
        });
      }
    } else if (endingSwitcher) {
      endingSwitcher.classList.add('hidden');
    }

    if (svgCont) svgCont.innerHTML = chap.svg;

    // Renderizar texto insertando el span interactivo para la palabra secreta
    if (textCont) {
      const secret = chap.secretWord;
      const discovered = window.stateManager?.state?.secretEasterEgg?.discoveredNames || [];
      const isAlreadyFound = secret ? discovered.includes(secret) : false;

      let formattedText = chap.text;
      if (secret) {
        const regex = new RegExp(`\\b(${secret})\\b`, 'gi');
        formattedText = chap.text.replace(regex, (match) => {
          return `<span class="story-secret-keyword" data-word="${secret}">${match}</span>`;
        });
      }

      textCont.innerHTML = formattedText;
      this.attachSecretHoldListeners(textCont);
    }

    // Vincular también clics en elementos con clase story-secret-keyword dentro del SVG
    if (svgCont) {
      const svgSecretEls = svgCont.querySelectorAll('.story-secret-keyword');
      svgSecretEls.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const word = el.getAttribute('data-word');
          if (word) this.onSecretWordTriggered(word, el);
        });
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- INTERACCIÓN SECRETA: TOQUE DIRECTO O MANTENER PRESIONADO ---
  attachSecretHoldListeners(container) {
    const secretEls = container.querySelectorAll('.story-secret-keyword');
    secretEls.forEach(el => {
      const word = el.getAttribute('data-word');

      // 1. Toque / clic directo inmediato
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSecretWordTriggered(word, el);
      });

      // 2. Soporte también para mantener presionado (long-press 5s)
      const startHold = (e) => {
        if (e.button && e.button !== 0) return;
        this.cancelSecretHold();

        this.activeHoldingEl = el;
        el.classList.add('holding-secret');

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

  // --- AL ACTIVAR EL NOMBRE SECRETO ---
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

    // 3. Efecto visual momentáneo en la palabra
    if (element) {
      element.classList.add('secret-burst-sparkle');
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
      if (window.achievementManager) {
        window.achievementManager.unlock('secret_names_unlocked_7');
      }
      
      // Toast / Notificación visual de desbloqueo de la Ruta del Amor
      if (typeof window.game?.showToast === 'function') {
        window.game.showToast('¡Has desbloqueado un secreto muy especial para Naza! 💕', 'success');
      }

      // Si está en el Capítulo 10 de la Ruta del Amor y lo completa, lanzar el gran final especial
      if (this.currentChapterIndex === 9) {
        setTimeout(() => {
          this.closeStoryModal();
          this.triggerSecretEndingCinematic();
        }, 1200);
      }
    }
  }

  // --- DISPARAR EL FINAL ESPECIAL DE NAZA Y LAS MASCOTAS ---
  triggerSecretEndingCinematic() {
    this.isOpen = true;
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
    this.isOpen = false;
    const modal = document.getElementById('modal-special-ending-naza');
    if (!modal) return;
    if (window.game && typeof window.game.hideModal === 'function') {
      window.game.hideModal(modal);
    } else {
      modal.classList.add('hidden');
    }

    if (window.game && window.game.pendingLevelToLoad) {
      const p = window.game.pendingLevelToLoad;
      window.game.pendingLevelToLoad = null;
      if (p.lvl) {
        window.game.loadLevel(p.lvl, p.seedVariation || 0, p.customLevelData || null);
      }
    }
  }
}

// Instancia global
window.storyManager = new StoryManager();
