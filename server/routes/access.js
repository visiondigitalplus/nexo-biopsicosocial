import { Router } from 'express';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { rateLimit, readSession, setSession } from './session.js';

/**
 * Control de acceso por enlace.
 * El repositorio es privado y la app vive detras de invitaciones: sin codigo
 * valido (o sesion previa) no se puede correr el test.
 */
export const accessRouter = Router();

accessRouter.get('/status', async (req, res) => {
  const session = readSession(req);
  if (!session?.uid) {
    return res.json({
      authenticated: false,
      openAccess: config.openAccess,
      brand: 'Nexo Biopsicosocial',
    });
  }
  const { repos } = await getDb();
  const user = await repos.users.findById(session.uid);
  if (!user) return res.json({ authenticated: false, openAccess: config.openAccess });
  const profile = await repos.profiles.latestForUser(user.id);
  return res.json({
    authenticated: true,
    user: { id: user.id, displayName: user.display_name, status: user.status },
    hasProfile: Boolean(profile),
    profileId: profile?.id || null,
  });
});

accessRouter.post('/access', rateLimit({ max: 20, windowMs: 60_000 }), async (req, res) => {
  const { inviteCode, displayName = null, utm = {} } = req.body || {};
  const { repos } = await getDb();

  let invite = null;
  if (!config.openAccess) {
    if (!inviteCode) return res.status(400).json({ error: 'Falta el código de invitación.' });
    const result = await repos.invites.redeem(String(inviteCode).trim());
    if (!result.ok) {
      const messages = {
        not_found: 'Ese enlace no es válido. Pide uno nuevo a quien te lo compartió.',
        revoked: 'Ese enlace fue revocado.',
        expired: 'Ese enlace expiró.',
        exhausted: 'Ese enlace ya alcanzó su número máximo de usos.',
      };
      return res.status(403).json({ error: messages[result.reason] || 'Acceso denegado.' });
    }
    invite = result.invite;
  }

  const safeUtm = {
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_content: utm.utm_content || null,
    utm_term: utm.utm_term || null,
    referrer: utm.referrer || null,
    invite_label: invite?.label || null,
  };

  const user = await repos.users.create({ displayName, utm: safeUtm });
  const token = setSession(req, res, { uid: user.id });

  // El token permite operar aunque el navegador bloquee cookies de terceros.
  res.json({ ok: true, token, user: { id: user.id, displayName: user.display_name }, hasProfile: false });
});
