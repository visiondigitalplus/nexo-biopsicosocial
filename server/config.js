import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Carga .env sin dependencias externas. */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv();

const isProd = process.env.NODE_ENV === 'production';

function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

export const config = {
  root: ROOT,
  isProd,
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-session-secret-change-me',
  // La clave clinica puede venir explicita o derivarse del secreto de sesion en dev.
  clinicalKey: deriveKey(process.env.CLINICAL_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'dev-only-clinical-key'),
  adminToken: process.env.ADMIN_TOKEN || 'dev-admin-token',
  databaseUrl: process.env.DATABASE_URL || '',
  pgSsl: String(process.env.PGSSL || 'false') === 'true',
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  // Si es true, cualquier visitante puede correr el test (demo publica).
  // En el despliegue privado se deja en false y se exige invite valido.
  openAccess: String(process.env.OPEN_ACCESS || 'false') === 'true',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    priceId: process.env.STRIPE_PRICE_ID || '',
  },
  pixels: {
    meta: process.env.META_PIXEL_ID || '',
    google: process.env.GOOGLE_ADS_ID || '',
    tiktok: process.env.TIKTOK_PIXEL_ID || '',
  },
};

if (isProd) {
  const weak = ['dev-only-insecure-session-secret-change-me', 'dev-only-clinical-key'];
  if (weak.includes(config.sessionSecret) || !process.env.CLINICAL_ENCRYPTION_KEY) {
    console.warn('[config] ADVERTENCIA: define SESSION_SECRET y CLINICAL_ENCRYPTION_KEY en produccion.');
  }
}
