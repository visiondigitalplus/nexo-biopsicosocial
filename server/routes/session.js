import { signSession, verifySession } from '../lib/crypto.js';
import { config } from '../config.js';

export const COOKIE_NAME = 'nexo_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

/**
 * La sesion viaja en cookie httpOnly (principal) y ademas se devuelve como
 * token para que el cliente pueda enviarla en la cabecera `x-nexo-token`.
 * Esto mantiene la app funcionando cuando el navegador bloquea cookies de
 * terceros (vistas embebidas, modo privado, Safari ITP).
 */
export function setSession(req, res, payload) {
  const token = signSession({ ...payload, exp: Date.now() + MAX_AGE_MS });
  const https =
    req?.secure || String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
  return token;
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function readSession(req) {
  const header = req.get?.('x-nexo-token');
  const cookie = req.cookies?.[COOKIE_NAME];
  return verifySession(header || cookie);
}

export function requireSession(req, res, next) {
  const session = readSession(req);
  if (!session?.uid) return res.status(401).json({ error: 'Sesión no válida. Abre tu enlace de acceso.' });
  req.session = session;
  return next();
}

export function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token') || req.query.token;
  if (token !== config.adminToken) return res.status(401).json({ error: 'Token de administración inválido' });
  return next();
}

/* Rate limit simple en memoria (por proceso) */
const buckets = new Map();
export function rateLimit({ windowMs = 60_000, max = 20, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const k = `${key(req)}:${req.path}`;
    const now = Date.now();
    const entry = buckets.get(k) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    buckets.set(k, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
    return next();
  };
}
