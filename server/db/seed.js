/**
 * Semilla idempotente: items, vectores de pesos, catalogo de microhabitos,
 * assets multimedia y un codigo de invitacion inicial.
 */
import { config } from '../config.js';
import { getDb } from './index.js';
import {
  ALL_ITEMS,
  BLOCK3_ITEMS,
  LITTAUER_ITEMS,
  SCREENING_ITEMS,
  SITUATIONAL_ITEMS,
  TIPI_ITEMS,
} from '../engine/catalog.js';
import { DIET_PLANS, HABIT_CATALOG } from '../engine/prescriptions.js';

const MEDIA_SEED = [
  {
    kind: 'audio',
    title: 'Respiración coherente 4-7-8 (audio guiado)',
    description: 'Cinco minutos para bajar la activación autonómica antes de dormir.',
    url: '/media/audio/respiracion-478.mp3',
    vak_channel: 'A',
    temperament: 'any',
    duration_sec: 300,
    tags: ['ansiedad', 'sueño'],
  },
  {
    kind: 'audio',
    title: 'Ruido marrón para foco profundo',
    description: 'Fondo sonoro para bloques de trabajo sin interrupciones.',
    url: '/media/audio/ruido-marron.mp3',
    vak_channel: 'A',
    temperament: 'M',
    duration_sec: 2700,
    tags: ['foco', 'ejecutivo'],
  },
  {
    kind: 'video',
    title: 'Activación matutina en 5 minutos',
    description: 'Movilidad y respiración para subir dopamina sin café.',
    url: '/media/video/activacion-matutina.mp4',
    vak_channel: 'K',
    temperament: 'F',
    duration_sec: 300,
    tags: ['energia', 'movimiento'],
  },
  {
    kind: 'challenge',
    title: 'Reto visual: mapa de las 3 prioridades',
    description: 'Dibuja tus tres prioridades del día en una sola hoja.',
    url: '/media/challenge/mapa-3-prioridades',
    vak_channel: 'V',
    temperament: 'S',
    duration_sec: 180,
    tags: ['ventas', 'foco'],
  },
  {
    kind: 'guide',
    title: 'Guion de negociación sin perder el vínculo',
    description: 'PDF táctico para perfiles competitivos.',
    url: '/media/guide/negociacion-sin-perder-vinculo.pdf',
    vak_channel: 'any',
    temperament: 'C',
    duration_sec: 600,
    tags: ['ventas', 'relaciones'],
  },
  {
    kind: 'audio',
    title: 'Escaneo corporal con aceite templado (Waldorf)',
    description: 'Ritual de templanza para perfiles fríos y secos.',
    url: '/media/audio/escaneo-corporal.mp3',
    vak_channel: 'K',
    temperament: 'M',
    duration_sec: 480,
    tags: ['calma', 'sanación'],
  },
];

export async function seed({ quiet = false } = {}) {
  const { repos } = await getDb();
  const log = (...args) => !quiet && console.log(...args);

  // 1. Items del test maestro
  let items = 0;
  for (const item of ALL_ITEMS) {
    await repos.items.upsertItem({
      id: item.id,
      block: item.block,
      position: String(item.position),
      kind: item.kind,
      dimension: item.dimension,
      prompt: item.prompt,
      helper: item.helper || null,
      options: item.options || item.pairs || item.statements || item.adjectives || [],
      config: {
        ...(item.config || {}),
        labels: item.labels || null,
        scoring_key: item.scoring_key || null,
      },
      scoring_key: item.scoring_key || null,
      is_active: true,
      version: 1,
    });
    items += 1;
  }

  // 2. Vectores de pesos cruzados por opcion
  let vectors = 0;
  for (const item of SITUATIONAL_ITEMS) {
    for (const option of item.options) {
      await repos.items.upsertVector(item.id, option.id, option.vector);
      vectors += 1;
    }
  }

  // 3. Catalogo de microhabitos, dietas y directrices
  let habits = 0;
  for (const habit of HABIT_CATALOG) {
    await repos.habits.upsert({
      id: habit.id,
      temperament: habit.bio === 'any' ? 'any' : { S: 'sanguineo', C: 'colerico', M: 'melancolico', F: 'flematico' }[habit.bio],
      category: 'microhabit',
      vak_channel: habit.vak,
      title: habit.title,
      fogg_recipe: { anchor: habit.anchor, microAction: habit.microAction, celebration: habit.celebration },
      low_energy_recipe: habit.lowEnergy,
      rationale: habit.rationale,
      minutes: habit.minutes,
      payload: { goals: habit.goals },
      is_active: true,
    });
    habits += 1;
  }
  for (const [bio, plan] of Object.entries(DIET_PLANS)) {
    const temperament = { S: 'sanguineo', C: 'colerico', M: 'melancolico', F: 'flematico' }[bio];
    await repos.habits.upsert({
      id: `DIET_${bio}_IN`,
      temperament,
      category: 'diet_include',
      vak_channel: 'any',
      title: `Incluir — ${plan.biotype} (${plan.mizaj})`,
      fogg_recipe: {},
      low_energy_recipe: {},
      rationale: plan.principle,
      minutes: 0,
      payload: { items: plan.include, exercise: plan.exercise, sleep: plan.sleep },
      is_active: true,
    });
    await repos.habits.upsert({
      id: `DIET_${bio}_OUT`,
      temperament,
      category: 'diet_exclude',
      vak_channel: 'any',
      title: `Evitar — ${plan.biotype}`,
      fogg_recipe: {},
      low_energy_recipe: {},
      rationale: 'Ley de Compensación Alopática: se retira lo que refuerza el Mizaj dominante.',
      minutes: 0,
      payload: { items: plan.exclude, healing: plan.healing },
      is_active: true,
    });
    habits += 2;
  }

  // 4. Media
  let media = 0;
  const existingMedia = await repos.media.listActive();
  for (const asset of MEDIA_SEED) {
    if (existingMedia.some((m) => m.title === asset.title)) continue;
    await repos.media.upsert({ ...asset, is_active: true });
    media += 1;
  }

  // 5. Invitacion inicial (solo si no hay ninguna)
  let inviteCode = null;
  const invites = await repos.invites.list();
  if (invites.length === 0) {
    const created = await repos.invites.create({ label: 'Acceso inicial', maxUses: 50 });
    inviteCode = created.code;
  }

  const summary = { items, vectors, habits, media, inviteCode };
  log('[seed] Listo:', summary);
  return summary;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isDirectRun) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  });
}

export { MEDIA_SEED };
