/**
 * CATALOGO DEL TEST MAESTRO (18 items, 3 bloques)
 * ---------------------------------------------------------------------------
 * Cada opcion de los items situacionales (1-6) porta un vector de pesos
 * cruzados que el motor suma en tiempo real:
 *
 *   w_k = [dVak, dGardner, dRiasec, dTki, dEjecutivo, dEysenck, dCloninger]
 *
 * Este objeto es la fuente semilla: en PostgreSQL vive en las tablas
 * assessment_items + option_weight_vectors y es editable desde el backoffice.
 */

const V = (V_ = 0, A = 0, K = 0) => ({ V: V_, A, K });
const G = (o = {}) => ({ ling: 0, logmat: 0, esp: 0, mus: 0, kin: 0, inter: 0, intra: 0, nat: 0, ...o });
const R = (o = {}) => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...o });
const T = (o = {}) => ({ comp: 0, colab: 0, comprom: 0, evit: 0, acom: 0, ...o });
const X = (o = {}) => ({ shift: 0, focus: 0, inhib: 0, ...o });
const E = (E_ = 0, N = 0, P = 0) => ({ E: E_, N, P });
const C = (o = {}) => ({ NS: 0, HA: 0, RD: 0, PS: 0, SD: 0, CO: 0, ST: 0, ...o });

const vector = ({ vak, gardner, riasec, tki, ejecutivo, eysenck, cloninger }) => ({
  vak: V(vak?.[0] || 0, vak?.[1] || 0, vak?.[2] || 0),
  gardner: G(gardner),
  riasec: R(riasec),
  tki: T(tki),
  ejecutivo: X(ejecutivo),
  eysenck: E(eysenck?.[0] || 0, eysenck?.[1] || 0, eysenck?.[2] || 0),
  cloninger: C(cloninger),
});

/* =========================================================================
 * BLOQUE 1 - Juicio situacional multirrasgo y temperamental (items 1-6)
 * ========================================================================= */
export const SITUATIONAL_ITEMS = [
  {
    id: 'SIT_01',
    block: 1,
    position: 1,
    kind: 'situational',
    dimension: 'VAK',
    prompt: 'Arrancas un proyecto nuevo. ¿Cuál es tu primer movimiento?',
    helper: 'No lo pienses demasiado: elige lo que harías de verdad.',
    options: [
      {
        id: 'A',
        label: 'Dibujo un mapa o boceto del plan antes de hablar con nadie.',
        vector: vector({
          vak: [2, 0, 1], gardner: { esp: 2, logmat: 1 }, riasec: { I: 1, C: 1, A: 1 },
          tki: { evit: 1, colab: 1 }, ejecutivo: { focus: 1 }, eysenck: [0, 0, 0], cloninger: { NS: 1, HA: 1, PS: 1 },
        }),
      },
      {
        id: 'B',
        label: 'Lo explico en voz alta y busco aliados para contárselo.',
        vector: vector({
          vak: [0, 2, 0], gardner: { ling: 2, inter: 1 }, riasec: { S: 1, E: 1 },
          tki: { acom: 1, colab: 1 }, ejecutivo: { focus: 1 }, eysenck: [2, 0, 0], cloninger: { RD: 2, NS: 1 },
        }),
      },
      {
        id: 'C',
        label: 'Empiezo a probar cosas con las manos: aprenderé haciendo.',
        vector: vector({
          vak: [0, 0, 2], gardner: { kin: 2, nat: 1 }, riasec: { R: 1, E: 1 },
          tki: { comp: 1 }, ejecutivo: { focus: 1 }, eysenck: [2, 0, 1], cloninger: { NS: 2, PS: 1 },
        }),
      },
      {
        id: 'D',
        label: 'Armo una estructura: listas, plazos, números y riesgos.',
        vector: vector({
          vak: [1, 0, 0], gardner: { logmat: 2, intra: 1 }, riasec: { C: 2, I: 1 },
          tki: { evit: 1, comp: 1 }, ejecutivo: { inhib: 1, focus: 1 }, eysenck: [0, 1, 0], cloninger: { HA: 2, PS: 1 },
        }),
      },
    ],
  },
  {
    id: 'SIT_02',
    block: 1,
    position: 2,
    kind: 'situational',
    dimension: 'TKI',
    prompt: 'En una negociación de venta el cliente presiona y quiere bajar el precio. ¿Qué haces?',
    helper: 'Elige tu reacción más probable, no la más elegante.',
    options: [
      {
        id: 'A',
        label: 'Sostengo el precio y el valor: si no le gusta, hay otros clientes.',
        vector: vector({
          vak: [0, 1, 0], gardner: { ling: 1, logmat: 1 }, riasec: { E: 2, C: 1 },
          tki: { comp: 2 }, ejecutivo: { focus: 1 }, eysenck: [2, 1, 1], cloninger: { NS: 2, PS: 1 },
        }),
      },
      {
        id: 'B',
        label: 'Busco el problema real detrás del precio y diseño una salida conjunta.',
        vector: vector({
          vak: [0, 1, 1], gardner: { inter: 2, logmat: 1 }, riasec: { S: 1, E: 1, I: 1 },
          tki: { colab: 2 }, ejecutivo: { shift: 1, focus: 1 }, eysenck: [1, 0, 0], cloninger: { RD: 1, CO: 2, ST: 1 },
        }),
      },
      {
        id: 'C',
        label: 'Parto la diferencia: algo es algo, prefiero cerrar hoy.',
        vector: vector({
          vak: [0, 1, 0], gardner: { inter: 1, logmat: 1 }, riasec: { E: 1, S: 1 },
          tki: { comprom: 2 }, ejecutivo: { shift: 1 }, eysenck: [1, 1, 0], cloninger: { RD: 1, HA: 1 },
        }),
      },
      {
        id: 'D',
        label: 'Me retiro del tema: dejo que lo piense y evito el roce.',
        vector: vector({
          vak: [1, 0, 0], gardner: { intra: 1 }, riasec: { C: 1, R: 1 },
          tki: { evit: 2 }, ejecutivo: { inhib: 1 }, eysenck: [-2, 1, 0], cloninger: { HA: 2, NS: -1 },
        }),
      },
    ],
  },
  {
    id: 'SIT_03',
    block: 1,
    position: 3,
    kind: 'situational',
    dimension: 'CLONINGER',
    prompt: 'Hay tensión fuerte en tu familia. ¿Cómo se manifiesta en ti esa tensión?',
    helper: 'Piensa en la última vez que pasó de verdad.',
    options: [
      {
        id: 'A',
        label: 'Se me va al cuerpo: estómago, pecho, cuello, insomnio.',
        vector: vector({
          vak: [0, 0, 1], gardner: { intra: 2 }, riasec: { S: 1, C: 1 },
          tki: { evit: 1, acom: 1 }, ejecutivo: { inhib: 1 }, eysenck: [-1, 2, 0], cloninger: { HA: 3 },
        }),
      },
      {
        id: 'B',
        label: 'Lo hablo de frente, quiero resolverlo ya.',
        vector: vector({
          vak: [0, 1, 0], gardner: { ling: 2, inter: 1 }, riasec: { E: 1, S: 1 },
          tki: { comp: 1, colab: 1 }, ejecutivo: { focus: 1 }, eysenck: [2, 1, 0], cloninger: { NS: 2, PS: 1 },
        }),
      },
      {
        id: 'C',
        label: 'Me lo trago, cedo y luego me quedo rumiando horas.',
        vector: vector({
          vak: [0, 1, 0], gardner: { intra: 2 }, riasec: { S: 1, C: 1 },
          tki: { acom: 2 }, ejecutivo: { inhib: 1 }, eysenck: [-1, 2, 0], cloninger: { HA: 2, RD: 1 },
        }),
      },
      {
        id: 'D',
        label: 'Hago de mediador: bajo la temperatura y cuido a todos.',
        vector: vector({
          vak: [0, 1, 0], gardner: { inter: 2 }, riasec: { S: 2 },
          tki: { colab: 1, acom: 1 }, ejecutivo: { shift: 1 }, eysenck: [1, -1, 0], cloninger: { RD: 2, CO: 2 },
        }),
      },
    ],
  },
  {
    id: 'SIT_04',
    block: 1,
    position: 4,
    kind: 'situational',
    dimension: 'RIASEC',
    prompt: 'Estás en flow total, tan concentrado que se te va el tiempo. ¿Qué estabas haciendo?',
    helper: 'Ese momento en que levantas la cabeza y han pasado tres horas.',
    options: [
      {
        id: 'A',
        label: 'Construyendo, reparando o armando algo con las manos.',
        vector: vector({
          vak: [0, 0, 2], gardner: { kin: 2, nat: 1, esp: 1 }, riasec: { R: 3 },
          tki: { comp: 1 }, ejecutivo: { focus: 2 }, eysenck: [1, -1, 1], cloninger: { NS: 1, PS: 2 },
        }),
      },
      {
        id: 'B',
        label: 'Investigando, leyendo, entendiendo cómo funciona algo.',
        vector: vector({
          vak: [1, 0, 0], gardner: { logmat: 2, ling: 1 }, riasec: { I: 3 },
          tki: { evit: 1 }, ejecutivo: { focus: 2 }, eysenck: [-1, 1, 0], cloninger: { HA: 1, PS: 2 },
        }),
      },
      {
        id: 'C',
        label: 'Creando, escribiendo, diseñando o componiendo algo nuevo.',
        vector: vector({
          vak: [1, 1, 0], gardner: { esp: 1, mus: 1, ling: 1 }, riasec: { A: 3 },
          tki: { evit: 1, comprom: 1 }, ejecutivo: { shift: 2 }, eysenck: [1, 1, 1], cloninger: { NS: 2, ST: 2 },
        }),
      },
      {
        id: 'D',
        label: 'Enseñando, acompañando o resolviéndole algo a otra persona.',
        vector: vector({
          vak: [0, 2, 0], gardner: { inter: 2, ling: 1 }, riasec: { S: 3 },
          tki: { acom: 1, colab: 1 }, ejecutivo: { focus: 1 }, eysenck: [1, 0, 0], cloninger: { RD: 3, CO: 2 },
        }),
      },
    ],
  },
  {
    id: 'SIT_05',
    block: 1,
    position: 5,
    kind: 'situational',
    dimension: 'ASRS',
    prompt: 'Demasiadas pestañas abiertas: mensajes, ruido, tareas. ¿Qué te pasa?',
    helper: 'Sobrecarga y caos sensorial.',
    options: [
      {
        id: 'A',
        label: 'Me bloqueo: no sé por dónde empezar y no hago nada.',
        vector: vector({
          vak: [1, 0, 0], gardner: { intra: 1 }, riasec: { C: 1, A: 1 },
          tki: { evit: 2 }, ejecutivo: { shift: -2, focus: -2 }, eysenck: [0, 2, 0], cloninger: { HA: 2, NS: -1 },
        }),
      },
      {
        id: 'B',
        label: 'Hiperfoco: me engancho a una cosa y olvido el resto.',
        vector: vector({
          vak: [0, 0, 1], gardner: { logmat: 1, esp: 1 }, riasec: { I: 1, R: 1 },
          tki: { evit: 1 }, ejecutivo: { focus: 2, shift: -1 }, eysenck: [1, 1, 1], cloninger: { NS: 2, PS: 2 },
        }),
      },
      {
        id: 'C',
        label: 'Corto el ruido: silencio, orden visual y una sola cosa a la vez.',
        vector: vector({
          vak: [2, 0, 0], gardner: { intra: 2 }, riasec: { C: 2 },
          tki: { evit: 1, comp: 1 }, ejecutivo: { inhib: 2 }, eysenck: [-1, 1, 0], cloninger: { HA: 2, PS: 1 },
        }),
      },
      {
        id: 'D',
        label: 'Externalizo: escribo todo en una lista y delego lo que puedo.',
        vector: vector({
          vak: [1, 1, 0], gardner: { logmat: 1, inter: 1 }, riasec: { E: 2, C: 1 },
          tki: { comp: 1, colab: 1 }, ejecutivo: { shift: 1, focus: 1 }, eysenck: [2, 0, 0], cloninger: { NS: 1, SD: 1, CO: 1 },
        }),
      },
    ],
  },
  {
    id: 'SIT_06',
    block: 1,
    position: 6,
    kind: 'situational',
    dimension: 'AQ10',
    prompt: 'Alguien te cuenta un problema con una historia larga y confusa. ¿Cómo lo decodificas?',
    helper: 'Lectura social y empatía.',
    options: [
      {
        id: 'A',
        label: 'Percibo el clima emocional y respondo a eso, aunque no entienda los detalles.',
        vector: vector({
          vak: [0, 1, 1], gardner: { inter: 2, intra: 1 }, riasec: { S: 2 },
          tki: { acom: 1, colab: 1 }, ejecutivo: { shift: 1 }, eysenck: [1, 0, 0], cloninger: { RD: 3 },
        }),
      },
      {
        id: 'B',
        label: 'Pregunto datos concretos: qué pasó, quién, cuándo y qué necesitas.',
        vector: vector({
          vak: [1, 0, 0], gardner: { logmat: 2 }, riasec: { I: 1, C: 1 },
          tki: { comp: 1 }, ejecutivo: { inhib: 1 }, eysenck: [0, 0, 1], cloninger: { HA: 1, PS: 1 },
        }),
      },
      {
        id: 'C',
        label: 'Me pierdo: no sé qué se espera de mí y me quedo callado.',
        vector: vector({
          vak: [0, 0, 1], gardner: { intra: 2 }, riasec: { C: 1, R: 1 },
          tki: { evit: 2 }, ejecutivo: { shift: -1 }, eysenck: [-2, 2, 0], cloninger: { HA: 2, RD: 1 },
        }),
      },
      {
        id: 'D',
        label: 'Me pongo en su lugar y le doy una respuesta cálida, aunque sea obvia.',
        vector: vector({
          vak: [0, 1, 0], gardner: { inter: 2, ling: 1 }, riasec: { S: 2, A: 1 },
          tki: { acom: 2 }, ejecutivo: { shift: 1 }, eysenck: [1, 0, 0], cloninger: { RD: 2, CO: 2 },
        }),
      },
    ],
  },
];

/* =========================================================================
 * BLOQUE 2 - TIPI / Big Five (items 7-11). Dos declaraciones por factor:
 * el par inverso se recodifica con (8 - x) segun el algoritmo.
 * ========================================================================= */
export const TIPI_ITEMS = [
  {
    id: 'TIPI_07',
    block: 2,
    position: 7,
    kind: 'likert',
    dimension: 'TIPI',
    scoring_key: 'E',
    prompt: 'Extraversión: ¿cuánto te representa cada frase?',
    helper: '1 = nada, 7 = totalmente.',
    pairs: [
      { id: 'a', text: 'Me considero una persona extravertida, entusiasta.', reverse: false },
      { id: 'b', text: 'Soy reservado/a y tiendo a callarme en grupo.', reverse: true },
    ],
    config: { min: 1, max: 7, step: 1 },
  },
  {
    id: 'TIPI_08',
    block: 2,
    position: 8,
    kind: 'likert',
    dimension: 'TIPI',
    scoring_key: 'A',
    prompt: 'Amabilidad: ¿cuánto te representa cada frase?',
    helper: '1 = nada, 7 = totalmente.',
    pairs: [
      { id: 'a', text: 'Soy comprensivo/a y cálido/a con los demás.', reverse: false },
      { id: 'b', text: 'Suelo ser crítico/a y discutidor/a.', reverse: true },
    ],
    config: { min: 1, max: 7, step: 1 },
  },
  {
    id: 'TIPI_09',
    block: 2,
    position: 9,
    kind: 'likert',
    dimension: 'TIPI',
    scoring_key: 'C',
    prompt: 'Responsabilidad: ¿cuánto te representa cada frase?',
    helper: '1 = nada, 7 = totalmente.',
    pairs: [
      { id: 'a', text: 'Soy organizado/a y cumplo lo que prometo.', reverse: false },
      { id: 'b', text: 'Tiendo a ser desordenado/a y a postergar.', reverse: true },
    ],
    config: { min: 1, max: 7, step: 1 },
  },
  {
    id: 'TIPI_10',
    block: 2,
    position: 10,
    kind: 'likert',
    dimension: 'TIPI',
    scoring_key: 'ES',
    prompt: 'Estabilidad emocional: ¿cuánto te representa cada frase?',
    helper: '1 = nada, 7 = totalmente.',
    pairs: [
      { id: 'a', text: 'Me mantengo calmado/a y estable bajo presión.', reverse: false },
      { id: 'b', text: 'Me altero con facilidad y me preocupo mucho.', reverse: true },
    ],
    config: { min: 1, max: 7, step: 1 },
  },
  {
    id: 'TIPI_11',
    block: 2,
    position: 11,
    kind: 'likert',
    dimension: 'TIPI',
    scoring_key: 'O',
    prompt: 'Apertura: ¿cuánto te representa cada frase?',
    helper: '1 = nada, 7 = totalmente.',
    pairs: [
      { id: 'a', text: 'Soy curioso/a, imaginativo/a y abierto/a a lo nuevo.', reverse: false },
      { id: 'b', text: 'Prefiero la rutina y las ideas convencionales.', reverse: true },
    ],
    config: { min: 1, max: 7, step: 1 },
  },
];

/* =========================================================================
 * BLOQUE 2 - Cribados clinicos abreviados (items 12-14)
 * ========================================================================= */
export const SCREENING_ITEMS = [
  {
    id: 'SCR_12',
    block: 2,
    position: 12,
    kind: 'binary',
    dimension: 'AQ10',
    prompt: 'Percibes el mundo social de forma algo distinta. ¿Te reconoces?',
    helper: 'Cribado tipo AQ-10. Responde Sí o No por frase. No es un diagnóstico.',
    statements: [
      { id: 'aq1', text: 'A menudo noto sonidos o detalles que otros no perciben.' },
      { id: 'aq2', text: 'Me resulta difícil adivinar las intenciones de los demás.' },
      { id: 'aq3', text: 'Las conversaciones sociales me cansan más de lo normal.' },
    ],
    config: { yesScores: 1 },
  },
  {
    id: 'SCR_13',
    block: 2,
    position: 13,
    kind: 'scale4',
    dimension: 'ASRS',
    prompt: 'Atención y organización en el último mes.',
    helper: 'Escala 0 (nunca) a 4 (muy frecuentemente). Cribado tipo ASRS.',
    statements: [
      { id: 'as1', text: 'Dejo tareas a medias porque me distraigo.' },
      { id: 'as2', text: 'Me cuesta organizar y priorizar lo que tengo que hacer.' },
      { id: 'as3', text: 'Me levanto o muevo cuando debería estar quieto/a.' },
    ],
    labels: ['Nunca', 'Rara vez', 'A veces', 'Frecuente', 'Muy frecuente'],
  },
  {
    id: 'SCR_14',
    block: 2,
    position: 14,
    kind: 'scale4',
    dimension: 'CATQ',
    prompt: 'Enmascaramiento social: ¿qué tanto te adaptas para encajar?',
    helper: 'Escala 0 a 4. Índice de enmascaramiento (CAT-Q abreviado).',
    statements: [
      { id: 'cat1', text: 'Imito gestos y expresiones para encajar en el grupo.' },
      { id: 'cat2', text: 'Ensayo conversaciones en mi cabeza antes de tenerlas.' },
      { id: 'cat3', text: 'Oculto mi cansancio social detrás de una máscara amable.' },
    ],
    labels: ['Nunca', 'Casi nunca', 'A veces', 'Casi siempre', 'Siempre'],
  },
];

/* =========================================================================
 * BLOQUE 3 - Triaje afectivo, estado futuro y escalada de compromiso
 * ========================================================================= */
export const BLOCK3_ITEMS = [
  {
    id: 'TRG_15',
    block: 3,
    position: 15,
    kind: 'multi',
    dimension: 'TRIAGE',
    prompt: '¿Qué necesita atención primero en tu vida?',
    helper: 'Elige hasta 2. Esto orienta el informe, no etiqueta nada.',
    options: [
      { id: 'ansiedad', label: 'Ansiedad / mente acelerada' },
      { id: 'depresion', label: 'Desánimo o falta de sentido' },
      { id: 'ventas', label: 'Ventas y comunicación' },
      { id: 'relaciones', label: 'Relaciones y familia' },
      { id: 'vocacion', label: 'Vocación y trabajo' },
    ],
    config: { minSelect: 1, maxSelect: 2 },
  },
  {
    id: 'TRG_16',
    block: 3,
    position: 16,
    kind: 'multi',
    dimension: 'SOMATIZATION',
    prompt: '¿El cuerpo te está cobrando factura?',
    helper: 'Marca todo lo que reconoces en las últimas 2 semanas.',
    options: [
      { id: 'insomnio', label: 'Insomnio o sueño roto' },
      { id: 'digestivo', label: 'Molestias digestivas' },
      { id: 'rumiacion', label: 'Rumiación mental' },
      { id: 'tension', label: 'Tensión muscular o mandíbula' },
      { id: 'fatiga', label: 'Fatiga sin causa aparente' },
      { id: 'ninguno', label: 'Ninguno / estoy bien', exclusive: true },
    ],
    config: { minSelect: 1, maxSelect: 3 },
  },
  {
    id: 'TRG_17',
    block: 3,
    position: 17,
    kind: 'choice',
    dimension: 'FUTURE',
    prompt: 'Mira tu vida dentro de 6 semanas. ¿Qué te gustaría poder decir?',
    helper: 'Esta frase ancla tus microhábitos.',
    options: [
      { id: 'control', label: '“Tengo el control de mi energía y mis horarios.”' },
      { id: 'calma', label: '“Estoy más calmado/a y duermo mejor.”' },
      { id: 'ingresos', label: '“Cierro mejor mis ventas y comunico con claridad.”' },
      { id: 'vinculos', label: '“Mis relaciones están más claras y menos tensas.”' },
      { id: 'rumbo', label: '“Sé hacia dónde va mi vida y por qué.”' },
    ],
    config: { allowText: true, textPlaceholder: 'Opcional: escribe tu frase exacta…' },
  },
  {
    id: 'TRG_18',
    block: 3,
    position: 18,
    kind: 'choice',
    dimension: 'COMMITMENT',
    prompt: '¿Cuánto tiempo real puedes darte al día?',
    helper: 'Sé honesto: el sistema se adapta a tu realidad.',
    options: [
      { id: 'min5', label: '5 minutos — quiero microhábitos mínimos' },
      { id: 'min15', label: '15 minutos — puedo sostener algo más' },
      { id: 'min30', label: '30 minutos — estoy comprometido/a' },
    ],
  },
];

/* =========================================================================
 * MATRIZ LITTAUER - 40 adjetivos (20 fortalezas / 20 debilidades)
 * Cada adjetivo pertenece a un biotipo: S / C / M / F
 * ========================================================================= */
export const LITTAUER_STRENGTHS = [
  { id: 'S1', label: 'Animado', bio: 'S' },
  { id: 'S2', label: 'Entusiasta', bio: 'S' },
  { id: 'S3', label: 'Sociable', bio: 'S' },
  { id: 'S4', label: 'Persuasivo', bio: 'S' },
  { id: 'S5', label: 'Espontáneo', bio: 'S' },
  { id: 'C1', label: 'Decidido', bio: 'C' },
  { id: 'C2', label: 'Competitivo', bio: 'C' },
  { id: 'C3', label: 'Líder', bio: 'C' },
  { id: 'C4', label: 'Productivo', bio: 'C' },
  { id: 'C5', label: 'Valiente', bio: 'C' },
  { id: 'M1', label: 'Analítico', bio: 'M' },
  { id: 'M2', label: 'Detallista', bio: 'M' },
  { id: 'M3', label: 'Perfeccionista', bio: 'M' },
  { id: 'M4', label: 'Sensible', bio: 'M' },
  { id: 'M5', label: 'Ordenado', bio: 'M' },
  { id: 'F1', label: 'Paciente', bio: 'F' },
  { id: 'F2', label: 'Leal', bio: 'F' },
  { id: 'F3', label: 'Diplomático', bio: 'F' },
  { id: 'F4', label: 'Sereno', bio: 'F' },
  { id: 'F5', label: 'Confiable', bio: 'F' },
];

export const LITTAUER_WEAKNESSES = [
  { id: 'S6', label: 'Indisciplinado', bio: 'S' },
  { id: 'S7', label: 'Impulsivo', bio: 'S' },
  { id: 'S8', label: 'Desordenado', bio: 'S' },
  { id: 'S9', label: 'Exagerado', bio: 'S' },
  { id: 'S10', label: 'Olvidadizo', bio: 'S' },
  { id: 'C6', label: 'Mandón', bio: 'C' },
  { id: 'C7', label: 'Impaciente', bio: 'C' },
  { id: 'C8', label: 'Insensible', bio: 'C' },
  { id: 'C9', label: 'Terco', bio: 'C' },
  { id: 'C10', label: 'Sarcástico', bio: 'C' },
  { id: 'M6', label: 'Resentido', bio: 'M' },
  { id: 'M7', label: 'Negativo', bio: 'M' },
  { id: 'M8', label: 'Crítico', bio: 'M' },
  { id: 'M9', label: 'Suspicaz', bio: 'M' },
  { id: 'M10', label: 'Rígido', bio: 'M' },
  { id: 'F6', label: 'Apático', bio: 'F' },
  { id: 'F7', label: 'Indeciso', bio: 'F' },
  { id: 'F8', label: 'Pasivo', bio: 'F' },
  { id: 'F9', label: 'Temeroso', bio: 'F' },
  { id: 'F10', label: 'Testarudo', bio: 'F' },
];

export const LITTAUER_ITEMS = [
  {
    id: 'LIT_F',
    block: 2,
    position: '12a',
    kind: 'adjective',
    dimension: 'LITTAUER_STRENGTHS',
    prompt: 'Marcas de fortaleza: ¿cuáles te describen mejor?',
    helper: 'Toca las que reconozcas (mínimo 4, máximo 10). Sin pensar demasiado.',
    adjectives: LITTAUER_STRENGTHS,
    config: { minSelect: 4, maxSelect: 10 },
  },
  {
    id: 'LIT_D',
    block: 2,
    position: '12b',
    kind: 'adjective',
    dimension: 'LITTAUER_WEAKNESSES',
    prompt: 'Marcas de debilidad: ¿cuáles te cuestan más?',
    helper: 'Mínimo 3, máximo 10. Aquí nadie juzga: es material de trabajo.',
    adjectives: LITTAUER_WEAKNESSES,
    config: { minSelect: 3, maxSelect: 10 },
  },
];

export const BIO_LABELS = {
  S: { name: 'Sanguíneo', mizaj: 'Caliente y húmedo', eysenck: [1, -1] },
  C: { name: 'Colérico', mizaj: 'Caliente y seco', eysenck: [1, 1] },
  M: { name: 'Melancólico', mizaj: 'Frío y seco', eysenck: [-1, 1] },
  F: { name: 'Flemático', mizaj: 'Frío y húmedo', eysenck: [-1, -1] },
};

export const ALL_ITEMS = [
  ...SITUATIONAL_ITEMS,
  ...TIPI_ITEMS,
  ...LITTAUER_ITEMS,
  ...SCREENING_ITEMS,
  ...BLOCK3_ITEMS,
];
