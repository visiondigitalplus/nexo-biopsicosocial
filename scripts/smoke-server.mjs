#!/usr/bin/env node
/**
 * Prueba de humo del despliegue PRIVADO (servidor + PostgreSQL).
 *
 * Levanta el servidor real contra la base real y verifica:
 *   1. La puerta de invitación rechaza códigos inválidos.
 *   2. Con un código válido se pueden enviar las 18 respuestas del test maestro.
 *   3. El informe se calcula en el servidor y se puede recuperar después.
 *   4. El bloque clínico queda cifrado en la base (no se lee en claro).
 *   5. El registro diario funciona con el conmutador de baja energía.
 *   6. Un segundo uso del mismo enlace de un solo uso se rechaza.
 *
 * Uso:  npm run release && node scripts/smoke-server.mjs
 * Requiere DATABASE_URL en el entorno (o en .env apuntando a Postgres).
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { once } from 'node:events';

const PORT = Number(process.env.SMOKE_PORT || 3100);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label, ok, extra = '') => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`);
};

/* ---------------------------------- datos de prueba ---------------------------------- */
const { ALL_ITEMS, SITUATIONAL_ITEMS, TIPI_ITEMS, SCREENING_ITEMS } = await import('../server/engine/catalog.js');
const itemById = (id) => ALL_ITEMS.find((i) => i.id === id);

function buildAnswers({ lowScores = false } = {}) {
  const answers = {};
  for (const item of SITUATIONAL_ITEMS) answers[item.id] = item.options[0].id;
  for (const item of TIPI_ITEMS) {
    answers[item.id] = Object.fromEntries(item.pairs.map((p) => [p.id, lowScores ? 1 : 7]));
  }
  // Los adjetivos se toman del propio catalogo (ids reales, no inventados).
  answers.LIT_F = itemById('LIT_F').adjectives.slice(0, 5).map((a) => a.id);
  answers.LIT_D = itemById('LIT_D').adjectives.slice(0, 3).map((a) => a.id);
  const scr = Object.fromEntries(SCREENING_ITEMS.map((i) => [i.id, i]));
  answers.SCR_12 = Object.fromEntries(scr.SCR_12.statements.map((s) => [s.id, lowScores ? 0 : 1]));
  answers.SCR_13 = Object.fromEntries(
    scr.SCR_13.statements.map((s, idx) => [s.id, lowScores ? 0 : Math.min(4, 2 + (idx % 3))]),
  );
  answers.SCR_14 = Object.fromEntries(scr.SCR_14.statements.map((s, idx) => [s.id, lowScores ? 1 : 4 - idx]));
  answers.TRG_15 = ['vocacion', 'relaciones'];
  answers.TRG_16 = ['insomnio', 'tension'];
  answers.TRG_17 = 'rumbo';
  answers.TRG_18 = 'min15';
  return answers;
}

/* ---------------------------------- servidor ---------------------------------- */
const child = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d.toString(); });
child.stderr.on('data', (d) => { serverLog += d.toString(); });

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return await res.json();
    } catch { /* aún no escucha */ }
    await sleep(500);
  }
  throw new Error(`El servidor no arrancó. Log:\n${serverLog}`);
}

const api = async (path, { method = 'GET', body, token, admin } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-nexo-token': token } : {}),
      ...(admin ? { 'x-admin-token': admin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text };
};

try {
  const health = await waitForServer();
  console.log(`\n== Salud ==\n  driver: ${health.db} · uptime: ${health.uptime}s`);
  check('El servidor responde y usa PostgreSQL', health.db === 'postgres', health.db);

  console.log('\n== Puerta de invitación ==');
  const bad = await api('/api/access', { method: 'POST', body: { inviteCode: 'no-existe-123' } });
  check('Un código inventado se rechaza (403)', bad.status === 403, `HTTP ${bad.status}`);

  const admin = process.env.ADMIN_TOKEN;
  const made = await api('/api/admin/invites', {
    method: 'POST', admin, body: { label: 'smoke-test', maxUses: 1 },
  });
  check('El backoffice genera un enlace de un solo uso', made.status === 200 && made.json?.invite?.code, made.json?.link);
  const code = made.json.invite.code;
  const code2 = (await api('/api/admin/invites', { method: 'POST', admin, body: { label: 'smoke-2', maxUses: 2 } })).json.invite.code;

  console.log('\n== Acceso y test maestro ==');
  const acc = await api('/api/access', { method: 'POST', body: { inviteCode: code, displayName: 'Prueba' } });
  check('El código válido abre sesión', acc.status === 200 && acc.json?.token, `HTTP ${acc.status}`);
  const token = acc.json.token;

  const retry = await api('/api/access', { method: 'POST', body: { inviteCode: code } });
  check('El enlace de un solo uso no se puede reutilizar', retry.status === 403, `HTTP ${retry.status}`);

  const cat = await api('/api/test');
  check('El catálogo trae los 18 ítems (+2 sub-ítems de adjetivos)',
    cat.json?.items?.length === 20, `${cat.json?.items?.length} pantallas`);
  check('El catálogo no filtra los vectores de pesos',
    !JSON.stringify(cat.json).includes('"vector"'));
  const order = cat.json.items.map((i) => `${i.block}:${i.position}`);
  const blocks = cat.json.items.map((i) => i.block);
  const sortedBlocks = blocks.every((b, i) => i === 0 || b >= blocks[i - 1]);
  check('Los sub-ítems 12a y 12b caen entre el 12 y el 13',
    sortedBlocks &&
      order.indexOf('2:12a') === order.indexOf('2:12b') - 1 &&
      order.indexOf('2:12b') === order.indexOf('2:13') - 1,
    order.join(' '));

  const answers = buildAnswers();
  const submitted = await api('/api/test/submit', { method: 'POST', token, body: { answers } });
  check('El servidor acepta las respuestas (200)', submitted.status === 200, `HTTP ${submitted.status}`);
  const report = submitted.json?.report;
  check('El informe trae los 4 módulos (A-D)', report?.modules?.length === 4,
    report?.modules?.map((m) => m.id).join(','));
  check('Calcula arquetipo y código', Boolean(report?.profileMeta?.archetype && report?.profileMeta?.code),
    `${report?.profileMeta?.archetype} · ${report?.profileMeta?.code}`);

  const reopened = await api('/api/report', { token });
  check('El informe se puede reabrir desde la base', reopened.status === 200 && reopened.json?.report?.modules?.length === 4);

  console.log('\n== Bloque clínico cifrado ==');
  const { getDb } = await import('../server/db/index.js');
  const { driver, repos } = await getDb();
  const users = await driver.select('users', { display_name: 'Prueba' });
  const userId = users[0]?.id;
  const clinicalRow = await driver.selectOne('user_clinical_screenings', { user_id: userId });
  const raw = JSON.stringify(clinicalRow);
  // Los marcadores son contenido literal de las respuestas, no nombres de columna
  // (aq10_score es un agregado permitido por diseño).
  const leakMarkers = ['insomnio', 'tension', '"cat1"', '"aq1"', 'vocacion'];
  const leaked = leakMarkers.filter((m) => raw.includes(m));
  check('La fila clínica existe para el usuario', Boolean(clinicalRow));
  check('No hay detalle clínico en claro en la fila (solo el blob cifrado)',
    leaked.length === 0, leaked.length ? `se filtró: ${leaked.join(', ')}` : 'solo el blob');

  // La tabla NO clínica tampoco debe llevar las respuestas de cribado ni el
  // detalle de los ítems de trabajo personal (TRG_*) que van cifrados.
  const profileRow = await driver.selectOne('user_psychometric_profiles', { user_id: userId });
  const storedKeys = Object.keys(profileRow?.raw_answers || {});
  const forbidden = ['SCR_12', 'SCR_13', 'SCR_14', 'TRG_15', 'TRG_16', 'TRG_17', 'TRG_18'];
  const present = forbidden.filter((k) => storedKeys.includes(k));
  check('El perfil no clínico guarda solo respuestas no sensibles',
    present.length === 0, present.length ? `sobran: ${present.join(', ')}` : `${storedKeys.length} claves, todas no clínicas`);
  check('El informe sí queda guardado para reabrirlo', Boolean(profileRow?.report_snapshot?.modules?.length === 4));
  check('El blob es binario AES-GCM (BYTEA)', Buffer.isBuffer(clinicalRow?.payload_enc));
  const decrypted = await repos.screenings.readForUser(userId);
  check('El servidor sí puede descifrarlo con su clave', Boolean(decrypted?.payload?.aq10 && decrypted?.payload?.goals));
  check('El usuario pasó a estado quiz_done', users[0]?.status === 'quiz_done', users[0]?.status);

  console.log('\n== Registro diario y racha ==');
  const log1 = await api('/api/progress', { method: 'POST', token, body: { mood: 3, energy: 2, sleepHours: 6.5, habitsDone: 2, habitsPlanned: 4 } });
  check('Guarda el registro del día', log1.status === 200, `HTTP ${log1.status}`);
  check('La baja energía activa el modo mínimo (racha intacta)',
    log1.json?.lowEnergyApplied === true && Number(log1.json?.streak) === 1, `racha=${log1.json?.streak}`);
  const log2 = await api('/api/progress', { method: 'POST', token, body: { mood: 4, energy: 4, habitsDone: 3, habitsPlanned: 4 } });
  check('La racha se devuelve como número (no undefined)', Number(log2.json?.streak) === 1, `racha=${log2.json?.streak}`);
  const today = await api('/api/progress/today', { token });
  check('El plan del día devuelve hábitos del módulo D', (today.json?.habits?.length || 0) > 0,
    `${today.json?.habits?.length} hábitos`);

  console.log('\n== Aislamiento entre personas ==');
  const tokenB = (await api('/api/access', { method: 'POST', body: { inviteCode: code2 } })).json.token;
  const reportB = await api('/api/report', { token: tokenB });
  check('Otra persona no ve el informe de la primera', reportB.status === 404, `HTTP ${reportB.status}`);
  const noSession = await api('/api/test/submit', { method: 'POST', body: { answers } });
  check('Sin sesión no se puede enviar el test', noSession.status === 401, `HTTP ${noSession.status}`);

  console.log('\n== Enlaces de invitación ==');
  const madeLink = await api('/api/admin/invites', {
    method: 'POST', admin, body: { label: 'link-check', maxUses: 1 },
  });
  const link = madeLink.json?.link || '';
  // Vale el PUBLIC_BASE_URL configurado o el host de la petición, pero nunca
  // un enlace relativo ni uno que apunte a localhost cuando hay URL pública.
  let parsed = null;
  try { parsed = new URL(link); } catch { /* enlace inválido */ }
  const isAbsolute = Boolean(parsed && /^https?:$/.test(parsed.protocol));
  check('El enlace de invitación es absoluto y trae el código',
    isAbsolute && link.includes('/?invite='), link);

  console.log('\n== Archivos de la app ==');
  for (const [label, path, type] of [
    ['Portada', '/', 'text/html'],
    ['Estilos', '/css/styles.css', 'text/css'],
    ['App', '/js/app.js', 'javascript'],
    ['Backoffice', '/admin.html', 'text/html'],
  ]) {
    const res = await fetch(`${BASE}${path}`);
    const ct = res.headers.get('content-type') || '';
    check(`${label} se sirve`, res.ok && ct.includes(type), `${res.status} ${ct.split(';')[0]}`);
  }
  check('La cabecera de seguridad está puesta',
    (await fetch(`${BASE}/`)).headers.get('content-security-policy') !== null);
} catch (err) {
  failures += 1;
  console.error('\n[smoke] Error inesperado:', err.message);
  console.error(serverLog.split('\n').slice(-15).join('\n'));
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(3000)]);
  console.log(`\n${failures === 0 ? '✅ Todo correcto' : `❌ ${failures} comprobación(es) fallida(s)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
