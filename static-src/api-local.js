/**
 * CAPA DE API LOCAL (versión estática para GitHub Pages)
 * ---------------------------------------------------------------------------
 * Reemplaza a `public/js/api.js` cuando la app se compila como sitio estático.
 * Misma interfaz (`status`, `access`, `test`, `submit`, `report`, `track`,
 * `logProgress`, `today`), pero todo se ejecuta en el navegador:
 *
 *   - El motor psicométrico es el mismo código del servidor
 *     (server/engine/*.js), compilado dentro del bundle.
 *   - Los datos viven en localStorage del propio dispositivo.
 *   - No hay red: nada se envía a ningún servidor.
 */
import {
  ALL_ITEMS,
  BLOCK3_ITEMS,
  LITTAUER_ITEMS,
  SCREENING_ITEMS,
  SITUATIONAL_ITEMS,
  TIPI_ITEMS,
} from '../engine/catalog.js';
import { buildProfile, indexVectors, sanitizeAnswers, validateAnswers } from '../engine/scoring.js';
import { buildReport } from '../engine/reports.js';

const CACHE_REPORT = 'nexo_report_cache';
const CACHE_HISTORY = 'nexo_report_history';
const CACHE_DAILY = 'nexo_daily_logs';

/* ----------------------------- almacenamiento ----------------------------- */
const memory = new Map();
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    memory.set(key, value);
  }
}

/* ----------------------------- catálogo del test -------------------------- */
export function localItems() {
  return ALL_ITEMS.map((item) => ({
    id: item.id,
    block: item.block,
    position: String(item.position),
    kind: item.kind,
    dimension: item.dimension,
    prompt: item.prompt,
    helper: item.helper || null,
    config: { ...(item.config || {}), labels: item.labels || null, scoring_key: item.scoring_key || null },
    // Se omiten los vectores de pesos: el cliente nunca los ve, igual que en el servidor
    options: (item.options || item.pairs || item.statements || item.adjectives || []).map((o) => {
      if (o.vector) {
        const { vector, ...rest } = o;
        void vector;
        return rest;
      }
      return o;
    }),
  })).sort((a, b) => a.block - b.block || Number(a.priority || 0) - Number(b.priority || 0));
}

/* ----------------------------- progreso diario ---------------------------- */
function logProgressLocal(payload) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const history = read(CACHE_DAILY, []);
  const priorSameDay = history.find((h) => h.log_date === today);
  const previous = history
    .filter((h) => h.log_date !== today)
    .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))[0];
  const streak = previous?.log_date === yesterday ? Number(previous.streak) + 1 : 1;
  const entry = {
    log_date: today,
    mood: Number(payload.mood),
    energy: Number(payload.energy),
    sleep_hours: payload.sleepHours ?? null,
    habits_done: Number(payload.habitsDone || 0),
    habits_planned: Number(payload.habitsPlanned || 0),
    low_energy_mode: Boolean(payload.lowEnergy) || Number(payload.energy) <= 2,
    streak,
    created_at: new Date().toISOString(),
  };
  const next = [entry, ...history.filter((h) => h.log_date !== today)].slice(0, 60);
  write(CACHE_DAILY, next);
  const low = entry.low_energy_mode;
  return {
    log: entry,
    history: next,
    streak,
    lowEnergyApplied: low,
    message: low
      ? 'Día de baja energía detectado: tus hábitos se contraen a su versión mínima viable. La racha se mantiene.'
      : 'Registro guardado en este navegador. La constancia vale más que la intensidad.',
    previousEntry: priorSameDay || null,
  };
}

/* ----------------------------- API pública -------------------------------- */
export const api = {
  async status() {
    return {
      authenticated: true,
      openAccess: true,
      hasProfile: Boolean(read(CACHE_REPORT, null)),
      mode: 'static',
      brand: 'Nexo Biopsicosocial',
    };
  },

  async access() {
    return { ok: true, mode: 'static' };
  },

  async test() {
    const items = localItems();
    return { items, meta: { total: items.length, estimatedMinutes: 5 } };
  },

  async submit(answers) {
    const { answers: clean } = sanitizeAnswers(answers);
    const errors = validateAnswers(clean);
    if (errors.length) {
      const error = new Error('Respuestas incompletas o inválidas');
      error.status = 422;
      error.body = { error: error.message, details: errors };
      throw error;
    }
    const profile = buildProfile(clean, indexVectors());
    const report = buildReport(profile, []);
    const assessmentId = `local-${Date.now()}`;
    write(CACHE_REPORT, report);
    const history = read(CACHE_HISTORY, []);
    write(CACHE_HISTORY, [{ assessmentId, completedAt: report.generatedAt, report }, ...history].slice(0, 10));
    return { ok: true, assessmentId, report, summary: report.profileMeta, mode: 'static' };
  },

  async report() {
    const cached = read(CACHE_REPORT, null);
    if (!cached) {
      const error = new Error('Todavía no tienes un informe guardado en este navegador.');
      error.status = 404;
      throw error;
    }
    return { assessmentId: 'local', completedAt: cached.generatedAt, report: cached };
  },

  async track() {
    // Sin servidor: no se envía nada a ninguna parte (privacy firewall total)
    return { ok: true, forwarded: false, mode: 'static' };
  },

  async logProgress(payload) {
    return logProgressLocal(payload);
  },

  async today() {
    const report = read(CACHE_REPORT, null);
    const moduleD = report?.modules?.find((m) => m.id === 'D');
    const history = read(CACHE_DAILY, []);
    const latest = history[0] || null;
    const lowEnergy = Boolean(latest?.low_energy_mode);
    return {
      lowEnergyMode: lowEnergy,
      streak: latest?.streak || 0,
      habits: moduleD?.habits || [],
      habitsLowEnergy: moduleD?.lowEnergySwitch?.collapsed || [],
      doList: moduleD?.doList || [],
      dontList: moduleD?.dontList || [],
      history,
    };
  },

  // utilidades de mantenimiento usadas por la interfaz estática
  reset() {
    [CACHE_REPORT, CACHE_HISTORY, CACHE_DAILY].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* noop */ }
      memory.delete(k);
    });
  },

  exportAll() {
    const report = read(CACHE_REPORT, null);
    const daily = read(CACHE_DAILY, []);
    return {
      generado: new Date().toISOString(),
      informe: report,
      registrosDiarios: daily,
    };
  },
};

export const storeToken = () => {};
export const getToken = () => null;

export function utmFromUrl() {
  return {};
}
