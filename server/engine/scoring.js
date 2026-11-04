/**
 * MOTOR PSICOMETRICO UNIFICADO
 * ---------------------------------------------------------------------------
 * Ejecuta en una sola pasada las transacciones vectoriales del test maestro:
 *   1. VAK / Gardner / RIASEC / TKI (suma de vectores JSONB)
 *   2. Big Five (TIPI con recodificacion inversa 8 - x)
 *   3. Biopsicosocial: Littauer + Eysenck + Cloninger
 *   4. Neurobiologia Fisher (FTI)
 *   5. Cribados cl inicos abreviados (AQ-10, ASRS, CAT-Q) + triaje
 *
 * Entrada: `answers` (objeto plano) y los vectores de opcion.
 * Salida:  `profile` puro y determinista (testeable sin base de datos).
 */
import {
  BIO_LABELS,
  BLOCK3_ITEMS,
  LITTAUER_STRENGTHS,
  LITTAUER_WEAKNESSES,
  SCREENING_ITEMS,
  SITUATIONAL_ITEMS,
  TIPI_ITEMS,
} from './catalog.js';

const VAK_KEYS = ['V', 'A', 'K'];
const GARDNER_KEYS = ['ling', 'logmat', 'esp', 'mus', 'kin', 'inter', 'intra', 'nat'];
const RIASEC_KEYS = ['R', 'I', 'A', 'S', 'E', 'C'];
const TKI_KEYS = ['comp', 'colab', 'comprom', 'evit', 'acom'];
const CLO_KEYS = ['NS', 'HA', 'RD', 'PS', 'SD', 'CO', 'ST'];
const TIPI_KEYS = ['E', 'A', 'C', 'ES', 'O'];

const RIASEC_NAMES = {
  R: 'Realista', I: 'Investigador', A: 'Artístico', S: 'Social', E: 'Emprendedor', C: 'Convencional',
};
const GARDNER_NAMES = {
  ling: 'Lingüística', logmat: 'Lógico-Matemática', esp: 'Espacial', mus: 'Musical',
  kin: 'Kinestésica', inter: 'Interpersonal', intra: 'Intrapersonal', nat: 'Naturalista',
};
const TKI_NAMES = {
  comp: 'Tiburón (competitivo)', colab: 'Búho (colaborativo)', comprom: 'Zorro (compromiso)',
  evit: 'Tortuga (evitativo)', acom: 'Oso (complaciente)',
};
const VAK_NAMES = { V: 'Visual', A: 'Auditivo', K: 'Kinestésico' };

const zeros = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round = (n, d = 0) => Number(Number(n).toFixed(d));

/** Normaliza un vector de sumas a 0-100 respecto de su maximo positivo. */
function normalize(raw, keys) {
  const max = Math.max(...keys.map((k) => Number(raw[k]) || 0), 0);
  const out = {};
  for (const k of keys) {
    const v = Number(raw[k]) || 0;
    out[k] = max > 0 ? clamp(Math.round((Math.max(v, 0) / max) * 100), 0, 100) : 0;
    out[`${k}_raw`] = round(v, 2);
  }
  return out;
}

function ranked(vector, keys) {
  return keys
    .map((k) => ({ key: k, score: Number(vector[k]) || 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

/* ------------------------------------------------------------------ */
/* 1. Bloques situacionales: suma vectorial de pesos cruzados          */
/* ------------------------------------------------------------------ */
export function accumulateVectors(answers, vectorsByOption) {
  const acc = {
    vak: zeros(VAK_KEYS),
    gardner: zeros(GARDNER_KEYS),
    riasec: zeros(RIASEC_KEYS),
    tki: zeros(TKI_KEYS),
    ejecutivo: zeros(['shift', 'focus', 'inhib']),
    eysenck: zeros(['E', 'N', 'P']),
    cloninger: zeros(CLO_KEYS),
  };
  for (const item of SITUATIONAL_ITEMS) {
    const choice = answers[item.id];
    if (!choice) continue;
    const vec = vectorsByOption[`${item.id}:${choice}`];
    if (!vec) continue;
    for (const group of Object.keys(acc)) {
      for (const key of Object.keys(acc[group])) {
        acc[group][key] += Number(vec[group]?.[key]) || 0;
      }
    }
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/* 2. Big Five / TIPI con recodificacion inversa                       */
/* ------------------------------------------------------------------ */
export function scoreTipi(answers) {
  const raw = {};
  const detail = {};
  for (const item of TIPI_ITEMS) {
    const entry = answers[item.id] || {};
    const parts = item.pairs.map((pair) => {
      const value = clamp(Number(entry[pair.id] ?? 4), 1, 7);
      const recoded = pair.reverse ? 8 - value : value; // Score_recodificado = 8 - x
      return { id: pair.id, value, reverse: pair.reverse, recoded };
    });
    const mean = parts.reduce((s, p) => s + p.recoded, 0) / parts.length;
    raw[item.scoring_key] = round(mean, 2);
    detail[item.id] = parts;
  }
  const pct = {};
  for (const k of TIPI_KEYS) pct[k] = Math.round(((raw[k] - 1) / 6) * 100);
  return {
    raw, // escala 1-7
    percent: pct, // 0-100
    // Neuroticismo derivado del polo de estabilidad emocional (Eysenck N)
    neuroticismRaw: round(8 - raw.ES, 2),
    neuroticismPercent: Math.round(((8 - raw.ES - 1) / 6) * 100),
    detail,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Eysenck: coordenadas y cuadrante                                 */
/* ------------------------------------------------------------------ */
export function scoreEysenck(tipi) {
  const x = tipi.percent.E; // extraversion
  const stability = tipi.percent.ES;
  const N = tipi.neuroticismPercent;
  let bio;
  if (x >= 50 && stability >= 50) bio = 'S';
  else if (x >= 50 && stability < 50) bio = 'C';
  else if (x < 50 && stability >= 50) bio = 'F';
  else bio = 'M';
  const reactivity = {
    S: 'Reactividad inmediata, espontánea y efímera (dopamina alta, umbral bajo).',
    C: 'Reactividad inmediata, enérgica y duradera (dopamina + testosterona, alta activación).',
    M: 'Reactividad retardada, profunda y duradera (serotonina/HA, procesamiento lento y denso).',
    F: 'Reactividad retardada, medida y efímera (equilibrio serotoninérgico, baja activación).',
  }[bio];
  return {
    x, // 0-100 extraversion
    y: stability, // 0-100 estabilidad (polo opuesto a N)
    neuroticism: N,
    quadrant: `${x >= 50 ? 'Extravertido' : 'Introvertido'} + ${stability >= 50 ? 'Estable' : 'Inestable'}`,
    biotype: bio,
    biotypeName: BIO_LABELS[bio].name,
    mizaj: BIO_LABELS[bio].mizaj,
    reactivity,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Littauer: matriz de 40 adjetivos -> tipologia dual + ratio       */
/* ------------------------------------------------------------------ */
export function scoreLittauer(strengths = [], weaknesses = []) {
  const sSet = new Set(strengths);
  const wSet = new Set(weaknesses);
  const F = { S: 0, C: 0, M: 0, F: 0 };
  const D = { S: 0, C: 0, M: 0, F: 0 };
  for (const adj of LITTAUER_STRENGTHS) if (sSet.has(adj.id)) F[adj.bio] += 1;
  for (const adj of LITTAUER_WEAKNESSES) if (wSet.has(adj.id)) D[adj.bio] += 1;

  const totalS = Object.values(F).reduce((a, b) => a + b, 0);
  const totalW = Object.values(D).reduce((a, b) => a + b, 0);
  const totals = Object.fromEntries(['S', 'C', 'M', 'F'].map((b) => [b, F[b] + D[b]]));
  const order = ['S', 'C', 'M', 'F']
    .map((b) => ({ bio: b, total: totals[b], F: F[b], D: D[b] }))
    .sort((a, b) => b.total - a.total || b.F - a.F);

  const spread = order[0].total - order[3].total;
  // Distribucion plana -> Flematico Polifacetico (perfil equilibrado)
  const flatProfile = spread <= 1 && order[0].total <= Math.ceil((totalS + totalW) / 4) + 1;

  const dominant = flatProfile ? 'F' : order[0].bio;
  const secondary = flatProfile ? (order[1].bio === 'F' ? order[2].bio : order[1].bio) : order[1].bio;

  // Densidad normalizada: evita el sesgo por marcar mas palabras de un bloque
  const densityF = totalS > 0 ? totalS / 20 : 0;
  const densityD = totalW > 0 ? totalW / 20 : 0;
  const ratio = totalW > 0 ? round((totalS / Math.max(totalS + totalW, 1)) / (totalW / Math.max(totalS + totalW, 1)), 3) : 2;
  const regulationIndex = totalS + totalW > 0 ? round(totalS / (totalS + totalW), 3) : 0.5;

  // Deficit por biotipo: D_i > F_i
  const deficits = ['S', 'C', 'M', 'F']
    .filter((b) => D[b] > F[b])
    .map((b) => BIO_LABELS[b].name);

  return {
    strengths: { S: F.S, C: F.C, M: F.M, F: F.F },
    weaknesses: { S: D.S, C: D.C, M: D.M, F: D.F },
    totals,
    totalMarked: totalS + totalW,
    strengthCount: totalS,
    weaknessCount: totalW,
    dominant,
    dominantName: BIO_LABELS[dominant].name,
    secondary,
    secondaryName: BIO_LABELS[secondary].name,
    flatProfile,
    spread,
    ratio,
    regulationIndex,
    density: { strengths: round(densityF, 3), weaknesses: round(densityD, 3) },
    deficits,
    // D_i > F_i global -> deficit en Autodireccion (SD) y Cooperacion (CO)
    characterDeficit: totalW > totalS,
    ranking: order.map((o) => ({
      bio: o.bio,
      name: BIO_LABELS[o.bio].name,
      total: o.total,
      strengths: o.F,
      weaknesses: o.D,
    })),
    labels: {
      strengths: LITTAUER_STRENGTHS.filter((a) => sSet.has(a.id)).map((a) => a.label),
      weaknesses: LITTAUER_WEAKNESSES.filter((a) => wSet.has(a.id)).map((a) => a.label),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 5. Cloninger TCI + Fisher FTI                                      */
/* ------------------------------------------------------------------ */
export function scoreCloninger(vectors, littauer, tipi) {
  const norm = normalize(vectors.cloninger, ['NS', 'HA', 'RD', 'PS']);
  const regulation = littauer.regulationIndex;
  const SD = Math.round(0.55 * regulation * 100 + 0.45 * tipi.percent.C);
  const CO = Math.round(0.45 * regulation * 100 + 0.35 * tipi.percent.A + 0.2 * norm.RD);
  const ST = Math.round(0.5 * tipi.percent.O + 0.5 * norm.PS);
  return {
    temperament: { NS: norm.NS, HA: norm.HA, RD: norm.RD, PS: norm.PS },
    temperamentRaw: { NS: norm.NS_raw, HA: norm.HA_raw, RD: norm.RD_raw, PS: norm.PS_raw },
    character: { SD: clamp(SD, 0, 100), CO: clamp(CO, 0, 100), ST: clamp(ST, 0, 100) },
    notes: {
      NS: 'Búsqueda de novedad — dopamina, exploración, impulsividad.',
      HA: 'Evitación del daño — serotonina, ansiedad anticipatoria, inhibición.',
      RD: 'Dependencia de recompensa — oxitocina, vínculo, aprobación.',
      PS: 'Persistencia — esfuerzo sostenido, perfeccionismo.',
      SD: 'Autodirección: responsabilidad, metas propias, regulación.',
      CO: 'Cooperación: empatía, tolerancia, trabajo con otros.',
      ST: 'Autotrascendencia: sentido, espiritualidad, apertura.',
    },
  };
}

export function scoreFisher(cloninger, tipi, tkiPercent, littauer) {
  const NS = cloninger.temperament.NS;
  const PS = cloninger.temperament.PS;
  const RD = cloninger.temperament.RD;
  const dopamina = Math.round(0.75 * NS + 0.25 * tipi.percent.O);
  const serotonina = Math.round(0.6 * (100 - NS) + 0.4 * PS);
  const testosterona = Math.round(0.45 * (tkiPercent.comp || 0) + 0.3 * tipi.percent.E + 0.25 * cloninger.character.SD);
  const oxitocina = Math.round(0.5 * RD + 0.3 * tipi.percent.A + 0.2 * cloninger.character.CO);
  const axes = [
    { key: 'dopamina', label: 'Dopamina · Explorador', value: clamp(dopamina, 0, 100) },
    { key: 'serotonina', label: 'Serotonina · Constructor', value: clamp(serotonina, 0, 100) },
    { key: 'testosterona', label: 'Testosterona · Director', value: clamp(testosterona, 0, 100) },
    { key: 'oxitocina', label: 'Estrógeno/Oxitocina · Negociador', value: clamp(oxitocina, 0, 100) },
  ].sort((a, b) => b.value - a.value);
  return {
    axes,
    dominant: axes[0].key,
    dominantLabel: axes[0].label,
    secondary: axes[1].key,
    secondaryLabel: axes[1].label,
    biotypeHint: littauer.dominant,
  };
}

/* ------------------------------------------------------------------ */
/* 6. Cribados clinicos y triaje afectivo                             */
/* ------------------------------------------------------------------ */
export function scoreScreenings(answers) {
  const aqItem = SCREENING_ITEMS.find((i) => i.dimension === 'AQ10');
  const asItem = SCREENING_ITEMS.find((i) => i.dimension === 'ASRS');
  const catItem = SCREENING_ITEMS.find((i) => i.dimension === 'CATQ');

  const aqAnswers = answers[aqItem.id] || {};
  const aqScore = aqItem.statements.reduce((s, st) => s + (Number(aqAnswers[st.id]) ? 1 : 0), 0);
  const aqMax = aqItem.statements.length;
  const aqFlag = aqScore / aqMax >= 0.6; // equivalente al corte >= 6/10 del AQ-10

  const asAnswers = answers[asItem.id] || {};
  const asrsScore = asItem.statements.reduce((s, st) => s + clamp(Number(asAnswers[st.id]) || 0, 0, 4), 0);
  const asrsMax = asItem.statements.length * 4;
  const asrsFlag = asrsScore / asrsMax >= 0.5; // equivalente al corte 4/6 del ASRS parte A

  const catAnswers = answers[catItem.id] || {};
  const catScore = catItem.statements.reduce((s, st) => s + clamp(Number(catAnswers[st.id]) || 0, 0, 4), 0);
  const catMax = catItem.statements.length * 4;

  const goals = Array.isArray(answers.TRG_15) ? answers.TRG_15 : [];
  const symptoms = (Array.isArray(answers.TRG_16) ? answers.TRG_16 : []).filter((s) => s !== 'ninguno');
  const future = answers.TRG_17 && typeof answers.TRG_17 === 'object'
    ? answers.TRG_17
    : { choice: answers.TRG_17 || null, text: '' };
  const commitment = answers.TRG_18 || 'min15';
  const minutes = { min5: 5, min15: 15, min30: 30 }[commitment] || 15;

  const triageFlags = [];
  if (goals.includes('ansiedad') || symptoms.includes('rumiacion')) triageFlags.push('anxiety_priority');
  if (goals.includes('depresion') || symptoms.includes('fatiga')) triageFlags.push('mood_priority');
  if (symptoms.includes('insomnio')) triageFlags.push('sleep_disruption');
  if (symptoms.length >= 3) triageFlags.push('functional_impact');
  if (aqFlag) triageFlags.push('neurodivergent_support');
  if (asrsFlag) triageFlags.push('executive_support');
  if (catScore / catMax >= 0.65) triageFlags.push('masking_load');

  const disclaimers = [
    'Este perfil es una herramienta de bienestar y autoconocimiento; no constituye diagnóstico médico ni psicológico.',
  ];
  if (aqFlag) {
    disclaimers.push(
      'Tu cribado tipo AQ-10 salió elevado. Es una señal para conversar con un profesional de salud mental, no una etiqueta diagnóstica.',
    );
  }
  if (asrsFlag) {
    disclaimers.push(
      'Tu cribado tipo ASRS sugiere carga ejecutiva alta. Vale la pena una evaluación profesional si interfiere con tu vida diaria.',
    );
  }
  if (triageFlags.includes('mood_priority') || triageFlags.includes('anxiety_priority')) {
    disclaimers.push(
      'Si aparece desesperanza persistente o ansiedad que limita tu día a día, busca acompañamiento profesional. En crisis, contacta a tu línea local de emergencia.',
    );
  }

  return {
    aq10: {
      score: aqScore,
      max: aqMax,
      percent: Math.round((aqScore / aqMax) * 100),
      projected10: Math.round((aqScore / aqMax) * 10),
      cutEquivalence: '≥ 6/10',
      flag: aqFlag,
    },
    asrs: {
      score: asrsScore,
      max: asrsMax,
      percent: Math.round((asrsScore / asrsMax) * 100),
      projected6: Math.round((asrsScore / asrsMax) * 24),
      cutEquivalence: '≥ 4/6 ítems sombreados (parte A)',
      flag: asrsFlag,
    },
    catq: {
      score: catScore,
      max: catMax,
      maskingIndex: Math.round((catScore / catMax) * 100),
    },
    triage: { goals, symptoms, future, commitment, minutes, flags: triageFlags },
    disclaimers,
  };
}

/* ------------------------------------------------------------------ */
/* 7. Orquestador                                                     */
/* ------------------------------------------------------------------ */
export function buildProfile(answers, vectorsByOption = indexVectors()) {
  const vectors = accumulateVectors(answers, vectorsByOption);
  const vakNorm = normalize(vectors.vak, VAK_KEYS);
  const gardnerNorm = normalize(vectors.gardner, GARDNER_KEYS);
  const riasecNorm = normalize(vectors.riasec, RIASEC_KEYS);
  const tkiNorm = normalize(vectors.tki, TKI_KEYS);

  const vakOrder = ranked(vakNorm, VAK_KEYS);
  const gardnerOrder = ranked(gardnerNorm, GARDNER_KEYS);
  const riasecOrder = ranked(riasecNorm, RIASEC_KEYS);
  const tkiOrder = ranked(tkiNorm, TKI_KEYS);

  const tipi = scoreTipi(answers);
  const eysenck = scoreEysenck(tipi);
  const littauer = scoreLittauer(answers.LIT_F || [], answers.LIT_D || []);
  const cloninger = scoreCloninger(vectors, littauer, tipi);
  const fisher = scoreFisher(cloninger, tipi, tkiNorm, littauer);
  const screenings = scoreScreenings(answers);

  const vak = {
    scores: Object.fromEntries(VAK_KEYS.map((k) => [k, vakNorm[k]])),
    dominant: vakOrder[0].key,
    dominantName: VAK_NAMES[vakOrder[0].key],
    ranking: vakOrder.map((o) => ({ key: o.key, name: VAK_NAMES[o.key], score: o.score })),
    mix: vakOrder.map((o) => o.key).join(''),
  };

  const gardner = {
    scores: Object.fromEntries(GARDNER_KEYS.map((k) => [k, gardnerNorm[k]])),
    top2: gardnerOrder.slice(0, 2).map((o) => ({ key: o.key, name: GARDNER_NAMES[o.key], score: o.score })),
    ranking: gardnerOrder.map((o) => ({ key: o.key, name: GARDNER_NAMES[o.key], score: o.score })),
  };

  const riasec = {
    scores: Object.fromEntries(RIASEC_KEYS.map((k) => [k, riasecNorm[k]]),
    ),
    code: riasecOrder.slice(0, 3).map((o) => o.key).join(''),
    top3: riasecOrder.slice(0, 3).map((o) => ({ key: o.key, name: RIASEC_NAMES[o.key], score: o.score })),
    ranking: riasecOrder.map((o) => ({ key: o.key, name: RIASEC_NAMES[o.key], score: o.score })),
  };

  const tki = {
    scores: Object.fromEntries(TKI_KEYS.map((k) => [k, tkiNorm[k]])),
    raw: Object.fromEntries(TKI_KEYS.map((k) => [k, tkiNorm[`${k}_raw`]]),
    ),
    style: tkiOrder[0].key,
    styleName: TKI_NAMES[tkiOrder[0].key],
    secondary: tkiOrder[1].key,
    secondaryName: TKI_NAMES[tkiOrder[1].key],
    ranking: tkiOrder.map((o) => ({ key: o.key, name: TKI_NAMES[o.key], score: o.score })),
  };

  // Perfil mixto: Eysenck y Littauer no coinciden
  const mixedProfile = eysenck.biotype !== littauer.dominant;

  return {
    version: '1.0.0',
    computedAt: new Date().toISOString(),
    vectors,
    executive: {
      shift: Math.round(normalize(vectors.ejecutivo, ['shift', 'focus', 'inhib']).shift || 0),
      focus: Math.round(normalize(vectors.ejecutivo, ['shift', 'focus', 'inhib']).focus || 0),
      inhib: Math.round(normalize(vectors.ejecutivo, ['shift', 'focus', 'inhib']).inhib || 0),
    },
    vak,
    gardner,
    riasec,
    tki,
    tipi,
    eysenck,
    littauer,
    cloninger,
    fisher,
    screenings,
    flags: {
      mixedProfile,
      neurodivergent: screenings.aq10.flag || screenings.asrs.flag,
      characterDeficit: littauer.characterDeficit,
      highMasking: screenings.catq.maskingIndex >= 65,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Indice de vectores para el motor (item:opcion -> vector)            */
/* ------------------------------------------------------------------ */
export function indexVectors() {
  const index = {};
  for (const item of SITUATIONAL_ITEMS) {
    for (const option of item.options) {
      index[`${item.id}:${option.id}`] = option.vector;
    }
  }
  return index;
}

/**
 * Saneamiento tolerante del payload.
 * Un wellness test no debe perderse porque un deslizador quedo sin mover:
 * se corrige el valor (neutro o dentro de rango) y se deja constancia.
 * Solo se rechazan los bloques esenciales que de verdad faltan.
 */
export function sanitizeAnswers(raw = {}) {
  const answers = { ...raw };
  const notes = [];

  // TIPI: cualquier par ausente o fuera de rango se fija en el punto neutro (4)
  for (const item of TIPI_ITEMS) {
    const entry = answers[item.id] && typeof answers[item.id] === 'object' ? { ...answers[item.id] } : {};
    for (const pair of item.pairs) {
      const value = Number(entry[pair.id]);
      if (!Number.isFinite(value)) {
        entry[pair.id] = 4;
        notes.push(`${item.id}.${pair.id}: sin respuesta → 4 (neutro)`);
      } else {
        const clamped = Math.min(7, Math.max(1, Math.round(value)));
        if (clamped !== value) notes.push(`${item.id}.${pair.id}: ${value} → ${clamped}`);
        entry[pair.id] = clamped;
      }
    }
    answers[item.id] = entry;
  }

  // Matriz Littauer: descarta ids desconocidos
  const validS = new Set(LITTAUER_STRENGTHS.map((a) => a.id));
  const validW = new Set(LITTAUER_WEAKNESSES.map((a) => a.id));
  if (Array.isArray(answers.LIT_F)) answers.LIT_F = [...new Set(answers.LIT_F.filter((id) => validS.has(id)))];
  if (Array.isArray(answers.LIT_D)) answers.LIT_D = [...new Set(answers.LIT_D.filter((id) => validW.has(id)))];

  // Cribados: valores enteros 0-4, preguntas ausentes = 0
  for (const item of SCREENING_ITEMS) {
    const entry = answers[item.id] && typeof answers[item.id] === 'object' ? answers[item.id] : {};
    const clean = {};
    for (const statement of item.statements) {
      const value = Number(entry[statement.id]);
      clean[statement.id] = Number.isFinite(value) ? Math.min(4, Math.max(0, Math.round(value))) : 0;
    }
    answers[item.id] = clean;
  }

  // Triaje: normaliza multiseleccion y compromiso
  const triage = BLOCK3_ITEMS.find((i) => i.id === 'TRG_15');
  const symptoms = BLOCK3_ITEMS.find((i) => i.id === 'TRG_16');
  if (Array.isArray(answers.TRG_15)) {
    const valid = new Set(triage.options.map((o) => o.id));
    answers.TRG_15 = answers.TRG_15.filter((id) => valid.has(id));
  }
  if (Array.isArray(answers.TRG_16)) {
    const valid = new Set(symptoms.options.map((o) => o.id));
    const filtered = answers.TRG_16.filter((id) => valid.has(id));
    answers.TRG_16 = filtered.length ? filtered : ['ninguno'];
  }
  if (answers.TRG_17 && typeof answers.TRG_17 === 'string') answers.TRG_17 = { choice: answers.TRG_17, text: '' };
  if (!answers.TRG_18) {
    answers.TRG_18 = 'min15';
    notes.push('TRG_18: sin respuesta → min15');
  }

  return { answers, notes };
}

/* Validacion de payload de respuestas (server-side, defensa en profundidad) */
export function validateAnswers(answers) {
  const errors = [];
  if (!answers || typeof answers !== 'object') return ['Payload invalido'];
  for (const item of SITUATIONAL_ITEMS) {
    if (!answers[item.id]) errors.push(`Falta ${item.id}`);
    else if (!item.options.some((o) => o.id === answers[item.id])) errors.push(`Opcion invalida en ${item.id}`);
  }
  for (const item of TIPI_ITEMS) {
    const entry = answers[item.id];
    if (!entry || typeof entry !== 'object') errors.push(`Falta ${item.id}`);
    else {
      for (const pair of item.pairs) {
        const v = Number(entry[pair.id]);
        if (!Number.isFinite(v) || v < 1 || v > 7) errors.push(`Valor invalido en ${item.id}.${pair.id}`);
      }
    }
  }
  const s = answers.LIT_F;
  const w = answers.LIT_D;
  if (!Array.isArray(s) || s.length < 4) errors.push('Selecciona al menos 4 fortalezas');
  if (!Array.isArray(w) || w.length < 3) errors.push('Selecciona al menos 3 debilidades');
  for (const item of SCREENING_ITEMS) {
    if (!answers[item.id] || typeof answers[item.id] !== 'object') errors.push(`Falta ${item.id}`);
  }
  if (!Array.isArray(answers.TRG_15) || answers.TRG_15.length < 1) errors.push('Elige al menos una prioridad (TRG_15)');
  if (!Array.isArray(answers.TRG_16) || answers.TRG_16.length < 1) errors.push('Elige al menos una opción en TRG_16');
  if (!answers.TRG_17) errors.push('Falta TRG_17');
  if (!answers.TRG_18) errors.push('Falta TRG_18');
  return errors;
}

export const VOCAB = { RIASEC_NAMES, GARDNER_NAMES, TKI_NAMES, VAK_NAMES, BIO_LABELS, BLOCK3_ITEMS };
