import crypto from 'node:crypto';
import { Router } from 'express';
import { getDb } from '../db/index.js';
import { buildProfile, indexVectors, sanitizeAnswers, validateAnswers } from '../engine/scoring.js';
import { buildReport } from '../engine/reports.js';
import { rateLimit, requireSession, setSession } from './session.js';

export const assessmentRouter = Router();

const CLINICAL_ITEM_IDS = ['SCR_12', 'SCR_13', 'SCR_14', 'TRG_15', 'TRG_16'];

/** Catalogo publico del test: items y opciones, SIN los vectores de pesos. */
assessmentRouter.get('/test', async (req, res) => {
  const { repos } = await getDb();
  const items = await repos.items.listActive();
  const payload = items
    .map((item) => ({
      id: item.id,
      block: Number(item.block),
      position: item.position,
      kind: item.kind,
      dimension: item.dimension,
      prompt: item.prompt,
      helper: item.helper,
      config: item.config || {},
      options: (item.options || []).map((o) => {
        // Nunca se envian los pesos al cliente: solo lo que la UI necesita.
        if (o.vector) {
          const { vector, ...rest } = o;
          void vector;
          return rest;
        }
        return o;
      }),
    }))
    .sort((a, b) => a.block - b.block || String(a.position).localeCompare(String(b.position)));
  res.json({ items: payload, meta: { total: payload.length, estimatedMinutes: 5 } });
});

assessmentRouter.post('/test/submit', requireSession, rateLimit({ max: 15, windowMs: 60_000 }), async (req, res) => {
  const { answers, notes } = sanitizeAnswers(req.body?.answers);
  if (notes.length) console.warn('[submit] saneado:', notes.join(' | '));
  const errors = validateAnswers(answers);
  if (errors.length) {
    console.warn('[submit] payload rechazado:', errors.join(' | '));
    return res.status(422).json({ error: 'Respuestas incompletas o inválidas', details: errors });
  }

  const { repos, driver } = await getDb();

  // Si la base se reinició y el usuario ya no existe, se recupera la sesión
  // en caliente para no perder el test que la persona acaba de completar.
  let userId = req.session.uid;
  const existingUser = await repos.users.findById(userId);
  if (!existingUser) {
    const recovered = await repos.users.create({ utm: { recovered: true } });
    userId = recovered.id;
    setSession(req, res, { uid: userId });
    console.warn('[submit] sesión recuperada para usuario nuevo:', userId);
  }

  // Vectores desde la base (editables desde el backoffice); fallback al codigo.
  let vectorsByOption = indexVectors();
  try {
    const rows = await driver.select('option_weight_vectors', {});
    if (rows.length) {
      vectorsByOption = Object.fromEntries(
        rows.map((r) => [`${r.item_id}:${r.option_id}`, {
          vak: r.vak, gardner: r.gardner, riasec: r.riasec, tki: r.tki,
          ejecutivo: r.ejecutivo, eysenck: r.eysenck, cloninger: r.cloninger,
        }]),
      );
    }
  } catch {
    /* usa el fallback */
  }

  const profile = buildProfile(answers, vectorsByOption);
  const media = await repos.media.listActive();
  const report = buildReport(profile, media);
  const assessmentId = crypto.randomUUID();

  // Respuestas no clinicas -> tabla psicometrica
  const safeAnswers = Object.fromEntries(
    Object.entries(answers).filter(([key]) => !CLINICAL_ITEM_IDS.includes(key)),
  );

  await repos.profiles.save({
    userId,
    assessmentId,
    profile,
    rawAnswers: { ...safeAnswers, report },
  });

  // Bloque clinico -> tabla segregada y cifrada
  await repos.screenings.save({
    userId,
    clinical: {
      aq10: answers.SCR_12 || {},
      asrs: answers.SCR_13 || {},
      catq: answers.SCR_14 || {},
      goals: answers.TRG_15 || [],
      symptoms: answers.TRG_16 || [],
      future: answers.TRG_17 || null,
      commitment: answers.TRG_18 || null,
      capturedAt: new Date().toISOString(),
    },
    aq10Score: profile.screenings.aq10.score,
    aq10Flag: profile.screenings.aq10.flag,
    asrsScore: profile.screenings.asrs.score,
    asrsFlag: profile.screenings.asrs.flag,
    triageFlags: profile.screenings.triage.flags,
  });

  await repos.users.markQuizCompleted(userId);

  return res.json({
    ok: true,
    assessmentId,
    report,
    // Resumen para gráficos, sin detalle clínico crudo
    summary: {
      archetype: report.profileMeta.archetype,
      code: report.profileMeta.code,
      vak: profile.vak,
      riasec: profile.riasec,
      gardner: profile.gardner,
      tki: profile.tki,
      tipi: profile.tipi.percent,
      eysenck: profile.eysenck,
      littauer: profile.littauer,
      cloninger: profile.cloninger,
      fisher: profile.fisher,
      flags: profile.flags,
      screening: {
        aq10: profile.screenings.aq10,
        asrs: profile.screenings.asrs,
        catq: profile.screenings.catq,
      },
    },
  });
});

/** Informe ya generado (para reabrir la app o descargar el PDF). */
assessmentRouter.get('/report', requireSession, async (req, res) => {
  const { repos } = await getDb();
  const row = await repos.profiles.latestForUser(req.session.uid);
  if (!row) return res.status(404).json({ error: 'Todavía no tienes un informe. Completa el test maestro.' });
  const report = row.raw_answers?.report || null;
  res.json({ assessmentId: row.assessment_id, completedAt: row.completed_at, report });
});

assessmentRouter.get('/media', async (req, res) => {
  const { repos } = await getDb();
  const media = await repos.media.listActive();
  res.json({
    media: media.map((m) => ({
      id: m.id, kind: m.kind, title: m.title, description: m.description, url: m.url,
      vak: m.vak_channel, temperament: m.temperament, durationSec: m.duration_sec, tags: m.tags,
    })),
  });
});
