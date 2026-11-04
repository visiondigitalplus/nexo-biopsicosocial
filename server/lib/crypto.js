import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Cifrado a nivel de aplicacion para la tabla clinica segregada.
 * AES-256-GCM con AAD = userId, de modo que un blob no puede reutilizarse
 * para otro usuario (defensa ante swaps de fila).
 */
export function encryptJson(obj, aad) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.clinicalKey, iv);
  cipher.setAAD(Buffer.from(String(aad)));
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Formato: [version(1) | iv(12) | tag(16) | ciphertext]
  return Buffer.concat([Buffer.from([1]), iv, tag, enc]);
}

export function decryptJson(buffer, aad) {
  // El driver de archivo serializa el Buffer como { type: 'Buffer', data: [...] }
  const buf = Buffer.isBuffer(buffer)
    ? buffer
    : buffer?.type === 'Buffer' && Array.isArray(buffer.data)
      ? Buffer.from(buffer.data)
      : Buffer.from(buffer);
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const data = buf.subarray(29);
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.clinicalKey, iv);
  decipher.setAAD(Buffer.from(String(aad)));
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(out.toString('utf8'));
}

/** Token opaco para enlaces de invitacion. */
export function inviteCode(bytes = 9) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Cookie de sesion firmada (HMAC-SHA256), sin dependencias. */
export function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
