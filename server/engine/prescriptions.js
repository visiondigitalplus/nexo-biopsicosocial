/**
 * PRESCRIPCIONES: MODULOS B, C y D del informe
 * ---------------------------------------------------------------------------
 * - B: orientacion vocacional (RIASEC x Gardner x Temperamento) + tacticas
 *      de comunicacion, ventas y relaciones.
 * - C: dietoterapia temperamental Unani/Waldorf (Ley de Compensacion
 *      Alopatica) + regulacion del estilo de vida + protocolos de sanacion.
 * - D: motor de microhabitos BJ Fogg (B = M·A·P) con Version de Baja Energia.
 */

export const CAREERS = [
  // R - Realista
  { name: 'Ingeniería de proyectos', riasec: ['R', 'C', 'I'], gardner: ['logmat', 'esp', 'kin'], bio: ['C', 'F'] },
  { name: 'Mecánica y mantenimiento industrial', riasec: ['R', 'C'], gardner: ['kin', 'esp'], bio: ['C', 'M'] },
  { name: 'Agronomía y producción de campo', riasec: ['R', 'I'], gardner: ['nat', 'kin'], bio: ['F', 'M'] },
  { name: 'Seguridad e higiene industrial', riasec: ['R', 'C'], gardner: ['logmat', 'kin'], bio: ['C', 'F'] },
  { name: 'Entrenamiento físico y kinesiología', riasec: ['R', 'S'], gardner: ['kin', 'inter'], bio: ['S', 'C'] },
  // I - Investigador
  { name: 'Investigación científica', riasec: ['I', 'R'], gardner: ['logmat', 'ling'], bio: ['M', 'F'] },
  { name: 'Psicología clínica y psicoterapia', riasec: ['I', 'S', 'A'], gardner: ['ling', 'inter', 'intra'], bio: ['M', 'S'] },
  { name: 'Medicina y especialidades clínicas', riasec: ['I', 'S'], gardner: ['logmat', 'inter'], bio: ['M', 'C'] },
  { name: 'Análisis de datos y ciencia de datos', riasec: ['I', 'C'], gardner: ['logmat', 'esp'], bio: ['M', 'F'] },
  { name: 'Auditoría forense y control de fraude', riasec: ['I', 'C'], gardner: ['logmat', 'intra'], bio: ['M', 'F'] },
  // A - Artístico
  { name: 'Diseño de producto y UX/UI', riasec: ['A', 'I', 'R'], gardner: ['esp', 'ling'], bio: ['M', 'S'] },
  { name: 'Comunicación audiovisual y contenido', riasec: ['A', 'E'], gardner: ['ling', 'esp', 'mus'], bio: ['S', 'C'] },
  { name: 'Escritura, guion y copywriting', riasec: ['A', 'I'], gardner: ['ling', 'intra'], bio: ['M', 'S'] },
  { name: 'Música y producción sonora', riasec: ['A', 'R'], gardner: ['mus', 'esp'], bio: ['M', 'S'] },
  { name: 'Arquitectura y diseño de espacios', riasec: ['A', 'R', 'I'], gardner: ['esp', 'logmat', 'kin'], bio: ['M', 'C'] },
  // S - Social
  { name: 'Docencia y formación de adultos', riasec: ['S', 'A'], gardner: ['ling', 'inter'], bio: ['S', 'F'] },
  { name: 'Recursos humanos y desarrollo de talento', riasec: ['S', 'E', 'C'], gardner: ['inter', 'ling'], bio: ['S', 'F'] },
  { name: 'Enfermería y cuidado asistencial', riasec: ['S', 'R'], gardner: ['inter', 'kin'], bio: ['F', 'M'] },
  { name: 'Trabajo social y programas comunitarios', riasec: ['S', 'E'], gardner: ['inter', 'nat'], bio: ['F', 'S'] },
  { name: 'Coaching y consultoría de desarrollo', riasec: ['S', 'E'], gardner: ['inter', 'ling', 'intra'], bio: ['S', 'C'] },
  // E - Emprendedor
  { name: 'Dirección comercial y ventas consultivas', riasec: ['E', 'S'], gardner: ['ling', 'inter'], bio: ['C', 'S'] },
  { name: 'Emprendimiento y nuevos negocios', riasec: ['E', 'R'], gardner: ['logmat', 'inter'], bio: ['C', 'S'] },
  { name: 'Marketing de crecimiento y performance', riasec: ['E', 'A', 'I'], gardner: ['logmat', 'ling'], bio: ['C', 'S'] },
  { name: 'Bienes raíces e inversión inmobiliaria', riasec: ['E', 'C'], gardner: ['inter', 'esp'], bio: ['C', 'S'] },
  { name: 'Dirección general y estrategia', riasec: ['E', 'C'], gardner: ['logmat', 'inter', 'intra'], bio: ['C', 'F'] },
  // C - Convencional
  { name: 'Finanzas, banca y control de gestión', riasec: ['C', 'I'], gardner: ['logmat'], bio: ['M', 'F'] },
  { name: 'Contabilidad y auditoría', riasec: ['C', 'I'], gardner: ['logmat', 'intra'], bio: ['M', 'F'] },
  { name: 'Logística y cadena de suministro', riasec: ['C', 'R'], gardner: ['logmat', 'esp'], bio: ['F', 'C'] },
  { name: 'Administración y operaciones', riasec: ['C', 'S'], gardner: ['logmat', 'inter'], bio: ['F', 'C'] },
  { name: 'Compliance y gestión de riesgos', riasec: ['C', 'I'], gardner: ['logmat', 'ling'], bio: ['M', 'F'] },
];

/** B.1 Orientacion vocacional: interseccion tripartita. */
export function matchCareers(profile, limit = 6) {
  const { riasec, gardner, littauer } = profile;
  const scored = CAREERS.map((career) => {
    const riasecScore =
      career.riasec.reduce((s, k, i) => s + (riasec.scores[k] || 0) * (i === 0 ? 1 : 0.7), 0) /
      career.riasec.length;
    const gardnerScore =
      career.gardner.reduce((s, k, i) => s + (gardner.scores[k] || 0) * (i === 0 ? 1 : 0.7), 0) /
      career.gardner.length;
    let bioBonus = 0;
    if (career.bio.includes(littauer.dominant)) bioBonus += 22;
    if (career.bio.includes(littauer.secondary)) bioBonus += 10;
    const total = riasecScore * 0.45 + gardnerScore * 0.3 + bioBonus;
    return { ...career, score: Math.round(total), riasecScore: Math.round(riasecScore), gardnerScore: Math.round(gardnerScore) };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((c) => ({
    name: c.name,
    score: c.score,
    fit: c.score >= 70 ? 'Alta' : c.score >= 50 ? 'Media-alta' : 'Media',
    why: `RIASEC ${c.riasec.join('·')} · Gardner ${c.gardner.map((g) => GARDNER_SHORT[g]).join('/')} · ${littauer.dominantName}`,
  }));
}

const GARDNER_SHORT = {
  ling: 'Lingüística', logmat: 'Lógica', esp: 'Espacial', mus: 'Musical',
  kin: 'Kinestésica', inter: 'Interpersonal', intra: 'Intrapersonal', nat: 'Naturalista',
};

/* =========================================================================
 * B.2 Comunicacion, ventas y relaciones por temperamento
 * ========================================================================= */
export const COMMUNICATION_PLAYBOOK = {
  S: {
    name: 'Sanguíneo',
    lever: 'Entusiasmo y contagio emocional. Vendes con energía y cercanía.',
    watchOut: 'Verborrea e interrupción: ocupas el 70% del aire de la conversación.',
    scripts: [
      'Cuando sientas que interrumpes: «Espera, cuéntame un poco más de eso» (cede el turno y luego retoma).',
      'Antes de presentar: escribe tus 3 puntos clave en una tarjeta. Si no están ahí, no lo dices.',
      'Cierre con micro-metas dopaminérgicas: divide la venta en 3 síes pequeños, no en un sí gigante.',
    ],
    microGoal: 'Dosificar la energía en tramos de 20 minutos con pausa de 2 minutos.',
    relationship: 'Tu calidez abre puertas; la constancia en el seguimiento las mantiene abiertas. Agenda recordatorios visuales.',
  },
  C: {
    name: 'Colérico',
    lever: 'Decisión y velocidad. Transmites seguridad y cierras rápido.',
    watchOut: 'Tono imperativo y baja escucha: la otra persona se siente atropellada.',
    scripts: [
      'Sustituye «Tienes que…» por «¿Cómo lo ves si…?»: misma dirección, otra puerta.',
      'Regla 2:1 — dos preguntas antes de cada afirmación en la negociación.',
      'Cuando quieras ganar: «Quiero entender antes de proponer» y pide una pausa de 10 minutos si la temperatura sube.',
    ],
    microGoal: 'Escucha activa: parafrasea lo que oíste antes de responder.',
    relationship: 'Tu fortaleza es la iniciativa; tu riesgo, la insensibilidad percibida. Nombra el logro del otro antes del tuyo.',
  },
  M: {
    name: 'Melancólico',
    lever: 'Profundidad, rigor y confianza que se construye con hechos.',
    watchOut: 'Parálisis por análisis: perfeccionismo que retrasa la entrega y el cierre.',
    scripts: [
      'Define el «ejercicio suficientemente bueno»: criterio de listo (3 puntos) escrito antes de empezar.',
      'Regla de los 80/20: entrega al 80% en el plazo y mejora después.',
      'En ventas: pon fecha y precio temprano; sin eso, el análisis se vuelve excusa.',
    ],
    microGoal: 'Cerrar y publicar algo imperfecto cada semana.',
    relationship: 'Tu lealtad es enorme; tu riesgo es el resentimiento acumulado. Di la molestia pequeña el mismo día.',
  },
  F: {
    name: 'Flemático',
    lever: 'Estabilidad, escucha y capacidad de sostener climas difíciles.',
    watchOut: 'Resistencia pasiva: dices sí con la boca y no con el calendario.',
    scripts: [
      'Frase de asertividad enlatada: «Puedo hacerlo, pero necesito mover X. ¿Cuál priorizamos?».',
      'Di que no en 12 palabras o menos, sin justificar tres veces.',
      'Toma la iniciativa una vez al día: propone tú la siguiente acción al final de cada reunión.',
    ],
    microGoal: 'Una acción de iniciativa y una negativa amable por día.',
    relationship: 'Tu paz sostiene vínculos; tu silencio acumula tensión. Nombra lo que necesitas antes de que explote.',
  },
};

/** Adaptacion al canal VAK del interlocutor. */
export const VAK_ADAPTATION = {
  V: {
    label: 'Visual',
    toSelf: 'Piensa en imágenes y esquemas; si no lo ves, no lo entiendes.',
    toOther: 'Usa listas, gráficos, capturas y comparativas visuales. Muestra antes de explicar.',
  },
  A: {
    label: 'Auditivo',
    toSelf: 'Procesas hablando y escuchando; el ruido te distrae.',
    toOther: 'Explica en voz alta, resume verbalmente, usa metáforas sonoras y pide que te lo repita.',
  },
  K: {
    label: 'Kinestésico',
    toSelf: 'Aprendes tocando, probando y moviéndote.',
    toOther: 'Ofrece demostraciones, pruebas gratuitas y experiencia directa; evita presentaciones largas.',
  },
};

/** Sesgo TKI propio y cómo leer el del interlocutor. */
export const TKI_GUIDE = {
  comp: {
    label: 'Tiburón (competitivo)',
    strength: 'Ganas terreno y defiendes valor.',
    risk: 'Ganas la discusión y pierdes la relación.',
    tactic: 'Antes de presionar, pregunta: «¿Qué tendría que pasar para que esto sea un sí para ambos?».',
  },
  colab: {
    label: 'Búho (colaborativo)',
    strength: 'Construyes acuerdos que duran.',
    risk: 'Sobrenegocias y retrasas decisiones simples.',
    tactic: 'Pon límite de tiempo: si no hay acuerdo en 15 minutos, decide con el 80% de la información.',
  },
  comprom: {
    label: 'Zorro (compromiso)',
    strength: 'Rapidez y pragmatismo.',
    risk: 'Cedes valor por cerrar hoy.',
    tactic: 'Fija tu mínimo antes de la conversación y no lo cruces sin contrapartida.',
  },
  evit: {
    label: 'Tortuga (evitativo)',
    strength: 'Evitas escaladas innecesarias.',
    risk: 'Los problemas pequeños se vuelven deudas grandes.',
    tactic: 'Regla de 24 h: ningún tema incómodo pasa más de un día sin nombrarse.',
  },
  acom: {
    label: 'Oso (complaciente)',
    strength: 'Cuida el vínculo y baja la tensión.',
    risk: 'Dices sí y luego te resentís.',
    tactic: 'Usa la pausa: «Lo pienso y te confirmo mañana a las 10». Nunca digas sí en caliente.',
  },
};

/* =========================================================================
 * C. DIETOTERAPIA TEMPERAMENTAL (Ilaj bil Ghiza / Unani / Waldorf)
 * Ley de Compensacion Alopatica: se prescribe la cualidad opuesta al Mizaj
 * ========================================================================= */
export const DIET_PLANS = {
  S: {
    biotype: 'Sanguíneo',
    mizaj: 'Caliente y húmedo',
    principle: 'Dieta FRÍA y SECA para compensar el exceso de calor y humedad.',
    include: ['Repollo y col', 'Coliflor', 'Frutos ácidos (limón, manzana verde, cítricos)', 'Legumbres', 'Cereales integrales', 'Verduras amargas (rúcula, achicoria, berro)'],
    exclude: ['Azúcares refinados', 'Carnes grasas en salsa', 'Alcohol', 'Frituras y repostería', 'Exceso de lácteos dulces'],
    exercise: 'Aeróbico moderado, 15-20 min diarios. Evita el sobreentrenamiento y las sesiones largas de alta intensidad.',
    sleep: '6-7 horas. No exceder 8 h: el exceso de sueño agrava la humedad.',
    healing: [
      'Regula el exceso de estímulo: una hora sin pantallas antes de dormir.',
      'Practica el silencio deliberado: 5 minutos diarios sin hablar ni escuchar nada.',
      'Cierra proyectos antes de abrir otros; tu sistema se dispersa con la novedad.',
    ],
  },
  C: {
    biotype: 'Colérico',
    mizaj: 'Caliente y seco',
    principle: 'Dieta FRÍA y HÚMEDA para enfriar y refrescar el exceso de calor seco.',
    include: ['Pepino', 'Lechuga', 'Sandía', 'Pera', 'Arroz', 'Avena', 'Lácteos frescos', 'Cilantro'],
    exclude: ['Carnes rojas asadas', 'Frituras', 'Exceso de sal', 'Chiles y picantes', 'Alcohol y café en exceso'],
    exercise: 'Ejercicio suave matutino o vespertino. Evita competir contigo mismo todos los días.',
    sleep: '7-8 horas con reposo de 45 min post-almuerzo (clave para tu sistema nervioso).',
    healing: [
      'Enfría la reacción: 4 respiraciones largas antes de responder cualquier correo tenso.',
      'Delegación semanal: una tarea que sueltas aunque la harías mejor.',
      'Ritual de cierre del día: escribe lo hecho, no lo pendiente.',
    ],
  },
  M: {
    biotype: 'Melancólico',
    mizaj: 'Frío y seco',
    principle: 'Dieta CALIENTE y HÚMEDA para templar y humectar el exceso de frío seco.',
    include: ['Avena', 'Cebada', 'Trigo integral', 'Espinaca cocida', 'Jengibre', 'Mango', 'Almendras y pistachos', 'Miel', 'Manzanilla y Shatavari'],
    exclude: ['Carnes pesadas', 'Alimentos secos y fríos', 'Cenas tardías', 'Exceso de café en ayunas'],
    exercise: 'Caminatas rítmicas y masajes con aceites templados. Movimiento suave y constante > intensidad.',
    sleep: '7-8 horas con horario fijo; la irregularidad dispara la rumiación nocturna.',
    healing: [
      'Ritual de templanza: baño tibio o ducha caliente al final del día.',
      'Rumia con horario: 15 minutos de preocupación programada y luego se cierra.',
      'Sol y contacto: 20 minutos de luz natural y una conversación humana al día.',
    ],
  },
  F: {
    biotype: 'Flemático',
    mizaj: 'Frío y húmedo',
    principle: 'Dieta CALIENTE y SECA para activar el metabolismo y disolver la humedad.',
    include: ['Ajo', 'Cebolla', 'Rábano picante', 'Arroz al curry', 'Huevo', 'Nueces', 'Azafrán', 'Infusiones de comino negro y menta'],
    exclude: ['Lácteos pesados', 'Sopas espesas', 'Plátano', 'Aguacate', 'Exceso de harinas refinadas'],
    exercise: 'Ejercicio vigoroso diario para activar dopamina: fuerza 3 veces por semana.',
    sleep: '7 horas y levantarse a la misma hora; no dormir siestas largas.',
    healing: [
      'Activación matutina: 10 minutos de movimiento antes del primer mensaje del día.',
      'Decide con fecha límite: escribe la decisión y la hora en que la tomarás.',
      'Expresión emocional: di una emoción por día en voz alta.',
    ],
  },
};

/* =========================================================================
 * D. MOTOR DE MICROHABITOS BJ FOGG (B = M · A · P)
 * ========================================================================= */
export const HABIT_CATALOG = [
  // --- Universales / ansiedad
  {
    id: 'HB_BREATH',
    bio: 'any',
    goals: ['ansiedad', 'calma'],
    vak: 'any',
    minutes: 1,
    title: 'Tres respiraciones de anclaje',
    anchor: 'Después de abrir la laptop por la mañana',
    microAction: 'Respiro hondo tres veces',
    celebration: 'Suelto los hombros y sonrío.',
    lowEnergy: { anchor: 'Al abrir la laptop', microAction: 'Una sola respiración larga', celebration: 'Digo «hecho».' },
    rationale: 'Baja la activación autonómica y crea un punto de control antes del ruido digital.',
  },
  {
    id: 'HB_RUMIA',
    bio: 'M',
    goals: ['ansiedad', 'depresion'],
    vak: 'V',
    minutes: 3,
    title: 'Rumiación con horario',
    anchor: 'Después de cenar',
    microAction: 'Escribo la preocupación',
    celebration: 'Cierro el cuaderno de golpe.',
    lowEnergy: { anchor: 'Al sentir la rumia', microAction: 'Nombro la emoción', celebration: 'Respiro y digo «visto».' },
    rationale: 'Contener la rumia en un espacio definido reduce su frecuencia y su intensidad.',
  },
  {
    id: 'HB_SLEEP',
    bio: 'any',
    goals: ['ansiedad', 'calma', 'depresion'],
    vak: 'A',
    minutes: 2,
    title: 'Bajada de revoluciones',
    anchor: 'Cuando apago la pantalla',
    microAction: 'Escucho un minuto de silencio',
    celebration: 'Apago la luz sonriendo.',
    lowEnergy: { anchor: 'Al apagar la pantalla', microAction: 'Exhalo largo una vez', celebration: 'Me digo «descanso».' },
    rationale: 'Ritual de cierre: señal de seguridad para el sistema nervioso antes del sueño.',
  },
  // --- Sanguíneo
  {
    id: 'HB_S_FOCO',
    bio: 'S',
    goals: ['ventas', 'vocacion'],
    vak: 'V',
    minutes: 2,
    title: 'Tarjeta de tres puntos',
    anchor: 'Antes de cada reunión o llamada',
    microAction: 'Escribo tres puntos clave',
    celebration: 'Palmada en el escritorio.',
    lowEnergy: { anchor: 'Antes de la llamada', microAction: 'Escribo una sola frase', celebration: 'Pulgar arriba.' },
    rationale: 'Externizar la estructura compensa la dispersión natural del sanguíneo.',
  },
  {
    id: 'HB_S_PAUSA',
    bio: 'S',
    goals: ['ventas', 'relaciones'],
    vak: 'K',
    minutes: 2,
    title: 'Pausa antes de interrumpir',
    anchor: 'Cuando siento que voy a interrumpir',
    microAction: 'Cuento hasta tres',
    celebration: 'Sonrío y asiento.',
    lowEnergy: { anchor: 'Al querer interrumpir', microAction: 'Cuento hasta uno', celebration: 'Respiro.' },
    rationale: 'Añade un micro-retraso entre impulso y palabra: la palanca más rentable del sanguíneo.',
  },
  // --- Colérico
  {
    id: 'HB_C_TONO',
    bio: 'C',
    goals: ['ventas', 'relaciones'],
    vak: 'A',
    minutes: 2,
    title: 'Suavizador de tono',
    anchor: 'Antes de enviar un mensaje tenso',
    microAction: 'Añado una pregunta',
    celebration: 'Digo «diplomacia».',
    lowEnergy: { anchor: 'Antes de enviar', microAction: 'Releo una vez', celebration: 'Exhalo.' },
    rationale: 'Convierte el impulso imperativo en apertura: mantiene la dirección y protege el vínculo.',
  },
  {
    id: 'HB_C_PAUSA45',
    bio: 'C',
    goals: ['ansiedad', 'calma'],
    vak: 'K',
    minutes: 5,
    title: 'Reposo post-almuerzo',
    anchor: 'Después de almorzar',
    microAction: 'Me siento y respiro cinco minutos',
    celebration: 'Bebo agua y sonrío.',
    lowEnergy: { anchor: 'Tras almorzar', microAction: 'Cierro los ojos un minuto', celebration: 'Suspiro.' },
    rationale: 'Regula el eje de estrés y evita el pico de cortisol de la tarde.',
  },
  // --- Melancólico
  {
    id: 'HB_M_SUFICIENTE',
    bio: 'M',
    goals: ['vocacion', 'depresion', 'ventas'],
    vak: 'V',
    minutes: 3,
    title: 'Criterio de suficientemente bueno',
    anchor: 'Antes de empezar una tarea',
    microAction: 'Defino tres criterios de listo',
    celebration: 'Marco la casilla.',
    lowEnergy: { anchor: 'Antes de empezar', microAction: 'Escribo «listo = hecho»', celebration: 'Respiro.' },
    rationale: 'Antídoto directo contra la parálisis por análisis.',
  },
  {
    id: 'HB_M_SOL',
    bio: 'M',
    goals: ['depresion', 'calma'],
    vak: 'K',
    minutes: 5,
    title: 'Luz y movimiento',
    anchor: 'Después de almorzar',
    microAction: 'Camino cinco minutos al sol',
    celebration: 'Levanto la cara al cielo.',
    lowEnergy: { anchor: 'Después de almorzar', microAction: 'Sal al balcón un minuto', celebration: 'Respiro profundo.' },
    rationale: 'Luz natural y movimiento: reguladores del estado de ánimo de primera línea.',
  },
  // --- Flemático
  {
    id: 'HB_F_INICIATIVA',
    bio: 'F',
    goals: ['vocacion', 'ventas'],
    vak: 'A',
    minutes: 1,
    title: 'Una iniciativa por día',
    anchor: 'Después de terminar una reunión',
    microAction: 'Propongo la siguiente acción',
    celebration: 'Digo «yo lideré».',
    lowEnergy: { anchor: 'Al final de la reunión', microAction: 'Escribo una acción', celebration: 'Sonrío.' },
    rationale: 'Entrena la asertividad en el momento de menor fricción.',
  },
  {
    id: 'HB_F_MOV',
    bio: 'F',
    goals: ['calma', 'vocacion', 'depresion'],
    vak: 'K',
    minutes: 5,
    title: 'Activación dopaminérgica',
    anchor: 'Después de levantarme',
    microAction: 'Muevo el cuerpo cinco minutos',
    celebration: 'Choco mis manos.',
    lowEnergy: { anchor: 'Al levantarme', microAction: 'Estiro los brazos', celebration: 'Digo «arranco».' },
    rationale: 'Sube dopamina y reduce la humedad/frialdad del flemático: energía y decisión.',
  },
  // --- Transversales
  {
    id: 'HB_ANY_RESP',
    bio: 'any',
    goals: ['ansiedad', 'calma', 'depresion'],
    vak: 'any',
    minutes: 3,
    title: 'Pausa de un minuto',
    anchor: 'Cuando siento que la mente se acelera',
    microAction: 'Respiro 4-7-8 una vez',
    celebration: 'Me digo «presente».',
    lowEnergy: { anchor: 'Al acelerarme', microAction: 'Exhalo largo', celebration: 'Suelto el aire.' },
    rationale: 'Meta-hábito universal: interrumpe la escalada antes de que tome el control.',
  },
  {
    id: 'HB_ANY_VENTA',
    bio: 'any',
    goals: ['ventas'],
    vak: 'A',
    minutes: 3,
    title: 'Guion de apertura',
    anchor: 'Antes de cada llamada comercial',
    microAction: 'Digo una pregunta abierta',
    celebration: 'Pulgar arriba al espejo.',
    lowEnergy: { anchor: 'Antes de llamar', microAction: 'Respiro y saludo', celebration: 'Sonrío.' },
    rationale: 'Abrir con pregunta en lugar de presentación duplica la escucha del cliente.',
  },
];

/** Motor de prescripcion: elige recetas Fogg segun perfil y presupuesto. */
export function buildHabitPlan(profile, options = {}) {
  const minutes = options.minutes || profile.screenings.triage.minutes || 15;
  const goals = profile.screenings.triage.goals.length ? profile.screenings.triage.goals : ['calma'];
  const bio = profile.littauer.dominant;
  const vak = profile.vak.dominant;

  const relevance = (habit) => {
    let score = 0;
    if (habit.bio === bio) score += 3;
    if (habit.bio === 'any') score += 1;
    if (habit.bio === profile.littauer.secondary) score += 1.5;
    score += habit.goals.filter((g) => goals.includes(g)).length * 2;
    if (habit.vak === vak) score += 1.5;
    if (habit.vak === 'any') score += 0.5;
    if (habit.minutes <= minutes) score += 0.5;
    return score;
  };

  const ranked = HABIT_CATALOG.map((h) => ({ ...h, relevance: relevance(h) })).sort(
    (a, b) => b.relevance - a.relevance,
  );

  // Numero de habitos segun compromiso: 5 min -> 2, 15 min -> 3, 30 min -> 5
  const target = minutes <= 5 ? 2 : minutes <= 15 ? 3 : 5;
  const chosen = [];
  let budget = minutes;
  for (const habit of ranked) {
    if (chosen.length >= target) break;
    if (habit.minutes > Math.max(budget, 1)) continue;
    chosen.push(habit);
    budget -= habit.minutes;
  }

  return {
    minutesBudget: minutes,
    target,
    identityAnchor: profile.screenings.triage.future,
    habits: chosen.map((h) => ({
      id: h.id,
      title: h.title,
      minutes: h.minutes,
      category: h.bio === 'any' ? 'universal' : `biotipo_${h.bio}`,
      recipe: `${h.anchor} + «${h.microAction}» + ${h.celebration}`,
      details: { anchor: h.anchor, microAction: h.microAction, celebration: h.celebration },
      lowEnergy: {
        recipe: `${h.lowEnergy.anchor} + «${h.lowEnergy.microAction}» + ${h.lowEnergy.celebration}`,
        details: h.lowEnergy,
      },
      rationale: h.rationale,
    })),
    doList: DIET_PLANS[bio].include,
    dontList: DIET_PLANS[bio].exclude,
  };
}

/** Version de dia de baja energia: contrae todo el plan a su minimo viable. */
export function collapseToLowEnergy(habits = []) {
  return habits.map((h) => ({
    id: h.id,
    title: h.title,
    recipe: h.lowEnergy.recipe,
    details: h.lowEnergy.details,
    minutes: 1,
    fallenBack: true,
  }));
}

export const BIO_NAME = { S: 'Sanguíneo', C: 'Colérico', M: 'Melancólico', F: 'Flemático' };
