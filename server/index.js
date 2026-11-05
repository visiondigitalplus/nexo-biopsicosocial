import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { seed } from './db/seed.js';
import { migrate } from './db/migrate.js';
import { accessRouter } from './routes/access.js';
import { assessmentRouter } from './routes/assessment.js';
import { progressRouter, trackingRouter } from './routes/progress.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Cabeceras de seguridad y politica de privacidad tecnica
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' https:; connect-src 'self'; frame-ancestors 'self' https:",
  );
  next();
});

app.get('/health', async (req, res) => {
  const { driver } = await getDb();
  res.json({ ok: true, db: driver.kind, uptime: Math.round(process.uptime()) });
});

app.use('/api', accessRouter);
app.use('/api', assessmentRouter);
app.use('/api', progressRouter);
app.use('/api', trackingRouter);
app.use('/api/admin', adminRouter);

app.use(
  express.static(path.join(config.root, 'public'), {
    extensions: ['html'],
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store, must-revalidate'),
  }),
);
// Motor psicometrico servido al navegador: permite generar el informe en el
// dispositivo si la conexion con el servidor falla (misma fuente de verdad).
app.use(
  '/engine',
  express.static(path.join(config.root, 'server', 'engine'), {
    etag: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store, must-revalidate'),
  }),
);

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(config.root, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function boot() {
  // Despliegue de un clic: el esquema y la semilla se aplican solos si faltan.
  // Ambos son idempotentes, asi que reiniciar no duplica nada.
  if (config.databaseUrl) {
    await migrate({ quiet: true });
  }
  const { repos } = await getDb();
  const items = await repos.items.listAll();
  if (items.length === 0) {
    console.log('[boot] Base vacía: ejecutando semilla inicial…');
    const summary = await seed({ quiet: true });
    if (summary.inviteCode) {
      console.log(`[boot] Enlace de acceso inicial: ${config.publicBaseUrl}/?invite=${summary.inviteCode}`);
    }
  }
  if (config.isProd) {
    const weak = !process.env.SESSION_SECRET || !process.env.CLINICAL_ENCRYPTION_KEY;
    if (weak) console.warn('[boot] Faltan SESSION_SECRET o CLINICAL_ENCRYPTION_KEY: define ambas antes de dar el servicio a terceros.');
  }
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[nexo] Escuchando en http://0.0.0.0:${config.port} (${config.isProd ? 'producción' : 'desarrollo'})`);
    console.log(`[nexo] Acceso libre: ${config.openAccess ? 'sí (demo)' : 'no — requiere invitación'}`);
  });
}

boot().catch((err) => {
  console.error('[boot] Fallo al iniciar:', err);
  process.exit(1);
});
