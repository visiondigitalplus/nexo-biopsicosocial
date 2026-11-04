import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from './session.js';
import { config } from '../config.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

/** Metricas agregadas del embudo (sin datos clinicos). */
adminRouter.get('/metrics', async (req, res) => {
  const { repos } = await getDb();
  const [profiles, screenings, invites] = await Promise.all([
    repos.profiles.countAll(),
    repos.screenings.countAll(),
    repos.invites.list(),
  ]);
  const { driver } = await getDb();
  const users = await driver.select('users', {});
  const logs = await driver.select('daily_progress_logs', {});
  const byStatus = users.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});
  res.json({
    users: users.length,
    byStatus,
    assessmentsCompleted: profiles,
    clinicalRecords: screenings,
    invites: invites.length,
    invitesActive: invites.filter((i) => !i.revoked && i.uses < i.max_uses).length,
    dailyLogs: logs.length,
    conversionQuiz: users.length ? Math.round((profiles / users.length) * 100) : 0,
  });
});

/** Gestion de enlaces de acceso: cada persona recibe un codigo. */
adminRouter.get('/invites', async (req, res) => {
  const { repos } = await getDb();
  const invites = await repos.invites.list();
  res.json({
    invites: invites.map((i) => ({
      id: i.id,
      code: i.code,
      label: i.label,
      uses: i.uses,
      maxUses: i.max_uses,
      revoked: i.revoked,
      expiresAt: i.expires_at,
      link: `${config.publicBaseUrl}/?invite=${i.code}`,
    })),
  });
});

adminRouter.post('/invites', async (req, res) => {
  const { label = null, maxUses = 1, days = null } = req.body || {};
  const { repos } = await getDb();
  const expiresAt = days ? new Date(Date.now() + Number(days) * 86400_000).toISOString() : null;
  const invite = await repos.invites.create({ label, maxUses: Number(maxUses), expiresAt });
  res.json({ invite, link: `${config.publicBaseUrl}/?invite=${invite.code}` });
});

adminRouter.post('/invites/:id/revoke', async (req, res) => {
  const { repos } = await getDb();
  const invite = await repos.invites.revoke(req.params.id);
  res.json({ invite });
});

/** Backoffice: items y vectores del test maestro. */
adminRouter.put('/items/:id', async (req, res) => {
  const { repos } = await getDb();
  const { id } = req.params;
  const existing = (await repos.items.listAll()).find((i) => i.id === id);
  if (!existing) return res.status(404).json({ error: 'Item no encontrado' });
  const updated = await repos.items.upsertItem({
    ...existing,
    prompt: req.body.prompt ?? existing.prompt,
    helper: req.body.helper ?? existing.helper,
    is_active: req.body.isActive ?? existing.is_active,
    version: Number(existing.version) + 1,
  });
  res.json({ item: updated });
});

adminRouter.put('/vectors/:itemId/:optionId', async (req, res) => {
  const { repos } = await getDb();
  const { itemId, optionId } = req.params;
  const vector = await repos.items.upsertVector(itemId, optionId, req.body.vector || {});
  res.json({ vector });
});
