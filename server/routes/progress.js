import { Router } from 'express';
import { getDb } from '../db/index.js';
import { collapseToLowEnergy } from '../engine/prescriptions.js';
import { rateLimit, requireSession } from './session.js';

export const progressRouter = Router();

/** Registro diario de ánimo/energía con conmutador de baja energía. */
progressRouter.post('/progress', requireSession, rateLimit({ max: 30 }), async (req, res) => {
  const { mood, energy, sleepHours = null, habitsDone = 0, habitsPlanned = 0, lowEnergy = false, notes = null } = req.body || {};
  if (!Number.isFinite(Number(mood)) || !Number.isFinite(Number(energy))) {
    return res.status(422).json({ error: 'Indica ánimo y energía (1-5).' });
  }
  const { repos } = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const log = await repos.progress.upsertLog({
    userId: req.session.uid,
    logDate: today,
    mood: Number(mood),
    energy: Number(energy),
    sleepHours: sleepHours === null ? null : Number(sleepHours),
    habitsDone: Number(habitsDone),
    habitsPlanned: Number(habitsPlanned),
    lowEnergy: Boolean(lowEnergy),
    notes,
  });
  const history = await repos.progress.history(req.session.uid, 30);
  res.json({
    log,
    history,
    streak: log.streak,
    lowEnergyApplied: Boolean(lowEnergy) || Number(energy) <= 2,
    message:
      Boolean(lowEnergy) || Number(energy) <= 2
        ? 'Día de baja energía detectado: tus hábitos se contraen a su versión mínima viable. La racha se mantiene.'
        : 'Registro guardado. La constancia vale más que la intensidad.',
  });
});

/** Plan del día: versión completa o versión de baja energía ya colapsada. */
progressRouter.get('/progress/today', requireSession, async (req, res) => {
  const { repos } = await getDb();
  const [profile, history] = await Promise.all([
    repos.profiles.latestForUser(req.session.uid),
    repos.progress.history(req.session.uid, 30),
  ]);
  if (!profile) return res.status(404).json({ error: 'Completa primero el test maestro.' });
  const report = profile.report_snapshot || profile.raw_answers?.report || {};
  const moduleD = (report.modules || []).find((m) => m.id === 'D');
  const latest = history[0] || null;
  const lowEnergy = Boolean(latest?.low_energy_mode) || Number(latest?.energy || 5) <= 2;
  res.json({
    lowEnergyMode: lowEnergy,
    streak: latest?.streak || 0,
    habits: moduleD?.habits || [],
    habitsLowEnergy: lowEnergy ? collapseToLowEnergy(moduleD?.habits || []) : moduleD?.lowEnergySwitch?.collapsed || [],
    doList: moduleD?.doList || [],
    dontList: moduleD?.dontList || [],
    history,
  });
});

/** Embudo Web2App: evento comercial generico. Nunca datos de salud. */
const ALLOWED_EVENTS = new Set(['Quiz_Started', 'Quiz_Completed', 'Report_Viewed', 'Paywall_Viewed', 'Purchase', 'Daily_Checkin']);

export const trackingRouter = Router();

trackingRouter.post('/track', rateLimit({ max: 120 }), async (req, res) => {
  const { event, value = null } = req.body || {};
  if (!ALLOWED_EVENTS.has(event)) return res.status(422).json({ error: 'Evento no permitido' });
  // FTC Privacy Firewall: solo payloads genericos. Nada clinico, nada demografico.
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, value, scope: 'commercial_generic' }));
  res.json({ ok: true, event, forwarded: Boolean(process.env.META_PIXEL_ID || process.env.GOOGLE_ADS_ID) });
});
