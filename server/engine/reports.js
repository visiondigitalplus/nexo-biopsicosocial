/**
 * INFORME INTEGRADO (Modulos A, B, C, D)
 * Convierte el `profile` calculado por el motor en un documento listo para
 * renderizar y descargar en PDF, sin exponer jamas el detalle clinico crudo.
 */
import {
  BIO_NAME,
  COMMUNICATION_PLAYBOOK,
  DIET_PLANS,
  TKI_GUIDE,
  VAK_ADAPTATION,
  buildHabitPlan,
  matchCareers,
} from './prescriptions.js';

const pct = (n) => `${Math.round(n)}%`;

function archetypeName(profile) {
  const bio = profile.littauer.flatProfile ? 'Flemático Polifacético' : `${profile.littauer.dominantName}-${profile.littauer.secondaryName}`;
  const riasec = profile.riasec.top3[0]?.name || 'Sin código';
  return `${bio} · ${riasec} · ${profile.vak.dominantName}`;
}

function headline(profile) {
  const { littauer, eysenck, riasec, fisher } = profile;
  const base = littauer.flatProfile
    ? 'Tu distribución es plana: un perfil polifacético que se adapta a cualquier entorno, con riesgo de no tener un centro definido.'
    : `Tu biotipo dominante es ${littauer.dominantName} con ${littauer.secondaryName} de apoyo: ${eysenck.reactivity}`;
  return `${base} Tu vocación se inclina hacia ${riasec.top3.map((t) => t.name).join(' · ')} y tu eje neuroquímico dominante es ${fisher.dominantLabel.split('·')[1]?.trim() || fisher.dominantLabel}.`;
}

/* ------------------------------ MODULO A ------------------------------ */
export function moduleA(profile) {
  const { eysenck, littauer, fisher, cloninger, riasec, vak, gardner, tki, tipi, screenings, flags } = profile;
  return {
    id: 'A',
    title: 'Diagnóstico integral',
    archetype: archetypeName(profile),
    summary: headline(profile),
    eysenck: {
      coordinates: { extraversion: eysenck.x, stability: eysenck.y, neuroticism: eysenck.neuroticism },
      quadrant: eysenck.quadrant,
      biotype: eysenck.biotype,
      biotypeName: eysenck.biotypeName,
      mizaj: eysenck.mizaj,
      reactivity: eysenck.reactivity,
      bigFive: tipi.percent,
      consistency: flags.mixedProfile
        ? `Coherencia mixta: Eysenck sugiere ${eysenck.biotypeName} y la matriz Littauer sugiere ${littauer.dominantName}. Perfil adaptativo: lee ambos.`
        : `Coherencia alta: ambos marcos apuntan a ${littauer.dominantName}.`,
    },
    temperament: {
      dominant: littauer.dominant,
      dominantName: littauer.dominantName,
      secondary: littauer.secondary,
      secondaryName: littauer.secondaryName,
      flatProfile: littauer.flatProfile,
      matrix: littauer.ranking,
      strengths: littauer.labels.strengths,
      weaknesses: littauer.labels.weaknesses,
      regulationRatio: littauer.ratio,
      regulationIndex: littauer.regulationIndex,
      characterDeficit: littauer.characterDeficit,
      deficits: littauer.deficits,
    },
    neurochemistry: {
      axes: fisher.axes,
      cloninger: cloninger,
      interpretation: {
        dopamina: 'Búsqueda de novedad y recompensa inmediata: tu motor de arranque.',
        serotonina: 'Estabilidad, rutina y lealtad: tu ancla de continuidad.',
        testosterona: 'Dominancia y decisión: tu capacidad de imponer dirección.',
        oxitocina: 'Vínculo y confianza: tu moneda relacional.',
      },
    },
    vocational: { riasec, gardner, code: riasec.code, top2: gardner.top2 },
    channel: { vak, adaptation: VAK_ADAPTATION[vak.dominant] },
    conflict: { tki, guide: TKI_GUIDE[tki.style] },
    flags: {
      neurodivergentSupport: flags.neurodivergent,
      highMasking: flags.highMasking,
      characterDeficit: flags.characterDeficit,
      aq10: { score: screenings.aq10.score, percent: screenings.aq10.percent, flagged: screenings.aq10.flag },
      asrs: { score: screenings.asrs.score, percent: screenings.asrs.percent, flagged: screenings.asrs.flag },
      catq: screenings.catq,
      triage: screenings.triage.flags,
    },
    disclaimers: screenings.disclaimers,
  };
}

/* ------------------------------ MODULO B ------------------------------ */
export function moduleB(profile) {
  const playbook = COMMUNICATION_PLAYBOOK[profile.littauer.dominant];
  const secondary = COMMUNICATION_PLAYBOOK[profile.littauer.secondary];
  const tkiGuide = TKI_GUIDE[profile.tki.style];
  const vak = VAK_ADAPTATION[profile.vak.dominant];
  const careers = matchCareers(profile, 6);
  const goals = profile.screenings.triage.goals;

  const sales = [
    `Abre con una pregunta, no con una presentación (${profile.tki.styleName}).`,
    `Traduce tu propuesta al canal ${vak.label} del cliente: ${vak.toOther}`,
    `Tu palanca: ${playbook.lever}`,
    `Tu riesgo a vigilar: ${playbook.watchOut}`,
    ...playbook.scripts,
  ];

  const relations = [
    playbook.relationship,
    `Con un ${secondary.name} como interlocutor: ${secondary.relationship}`,
    tkiGuide.tactic,
    profile.flags.highMasking
      ? 'Alto índice de enmascaramiento: agenda pausas de recuperación social después de interacciones intensas.'
      : 'Dosifica la exposición social: cuida una pausa de recuperación después de bloques de interacción.',
  ];

  return {
    id: 'B',
    title: 'Matriz de recomendaciones tácticas',
    vocational: {
      headline: `${profile.riasec.code} + ${profile.gardner.top2.map((g) => g.name).join(' + ')} + ${profile.littauer.dominantName}`,
      careers,
      note: 'Intersección tripartita entre código RIASEC, inteligencias de Gardner y temperamento dominante.',
    },
    communication: {
      adaptiveSelf: `Tu temperamento ${playbook.name}: ${playbook.lever}`,
      playbook: {
        lever: playbook.lever,
        watchOut: playbook.watchOut,
        microGoal: playbook.microGoal,
        scripts: playbook.scripts,
      },
      vakAdaptation: vak,
      tki: { style: profile.tki.styleName, ...tkiGuide },
    },
    sales,
    relations,
    priority: goals,
  };
}

/* ------------------------------ MODULO C ------------------------------ */
export function moduleC(profile) {
  const plan = DIET_PLANS[profile.littauer.dominant];
  return {
    id: 'C',
    title: 'Dietoterapia temperamental y regulación del estilo de vida',
    framework: 'Ilaj bil Ghiza · Unani · Waldorf — Ley de Compensación Alopática',
    biotype: plan.biotype,
    mizaj: plan.mizaj,
    principle: plan.principle,
    include: plan.include,
    exclude: plan.exclude,
    exercise: plan.exercise,
    sleep: plan.sleep,
    healing: plan.healing,
    note: profile.littauer.characterDeficit
      ? 'Tu matriz marca más debilidades que fortalezas: añade fricción a los hábitos de desregulación y busca acompañamiento (déficit sugerido en Autodirección SD y Cooperación CO).'
      : 'Tu matriz marca más fortalezas que debilidades: usa esa capacidad de regulación para sostener el plan completo.',
  };
}

/* ------------------------------ MODULO D ------------------------------ */
export function moduleD(profile, media = []) {
  const plan = buildHabitPlan(profile);
  const compatibleMedia = media
    .filter((m) => m.vak_channel === 'any' || m.vak_channel === profile.vak.dominant)
    .filter((m) => !m.temperament || m.temperament === 'any' || m.temperament === profile.littauer.dominant)
    .slice(0, 6)
    .map((m) => ({ id: m.id, kind: m.kind, title: m.title, description: m.description, url: m.url, vak: m.vak_channel }));
  return {
    id: 'D',
    title: 'Motor de hábitos diarios (B = M · A · P)',
    model: 'Receta Tiny Habits: [ancla existente] + [micro-comportamiento] + [celebración inmediata]',
    minutesBudget: plan.minutesBudget,
    habits: plan.habits,
    lowEnergySwitch: {
      label: 'Versión de día de baja energía',
      description:
        'Cuando reportes fatiga o ánimo bajo en tu registro matutino, cada hábito se contrae a su expresión mínima viable para sostener la racha sin culpa.',
      collapsed: plan.habits.map((h) => ({ id: h.id, title: h.title, recipe: h.lowEnergy.recipe })),
    },
    doList: plan.doList,
    dontList: plan.dontList,
    media: compatibleMedia,
  };
}

export function buildReport(profile, media = []) {
  return {
    version: profile.version,
    generatedAt: new Date().toISOString(),
    profileMeta: {
      archetype: archetypeName(profile),
      code: `${profile.riasec.code}-${profile.littauer.dominant}-${profile.vak.dominant}`,
    },
    modules: [moduleA(profile), moduleB(profile), moduleC(profile), moduleD(profile, media)],
    disclaimers: profile.screenings.disclaimers,
    wellnessNotice:
      'Perfilado Neuro-Conductual y Ruta de Optimización Personal. Contenido de bienestar; no sustituye atención médica ni psicológica.',
  };
}

export { BIO_NAME };
