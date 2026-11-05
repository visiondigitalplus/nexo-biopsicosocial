#!/usr/bin/env node
/**
 * Espera a que PostgreSQL acepte conexiones antes de migrar/sembrar.
 *
 * Se usa en el arranque de Docker Compose y de cualquier host que levante la
 * app al mismo tiempo que la base de datos. Sin esto, el primer arranque de un
 * despliegue nuevo falla con "ECONNREFUSED" solo porque la base aun no estaba
 * lista (el contenedor puede estar "healthy" un segundo antes de aceptar TCP).
 *
 * Distingue dos casos:
 *   - sin conexion todavia  -> reintenta hasta agotar WAIT_DB_RETRIES
 *   - credenciales invalidas -> falla de inmediato (esperar no lo arregla)
 */
import { config } from '../server/config.js';

const attempts = Number(process.env.WAIT_DB_RETRIES || 30);
const delayMs = Number(process.env.WAIT_DB_DELAY_MS || 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!config.databaseUrl) {
  console.log('[wait-db] DATABASE_URL vacio: se usa el driver de archivo, no hay nada que esperar.');
  process.exit(0);
}

const { default: pg } = await import('pg');
const ssl = config.pgSsl ? { rejectUnauthorized: false } : undefined;

for (let i = 1; i <= attempts; i += 1) {
  const client = new pg.Client({ connectionString: config.databaseUrl, ssl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query('select version() as v');
    await client.end();
    console.log(`[wait-db] Lista en el intento ${i}/${attempts}: ${String(rows[0].v).split(',')[0]}`);
    process.exit(0);
  } catch (err) {
    try { await client.end(); } catch { /* ya cerrada */ }
    const fatal = /password|authentication|role .* does not exist|database .* does not exist|SSL/i.test(err.message);
    if (fatal) {
      console.error('[wait-db] Error de configuracion (no es cuestion de esperar):', err.message);
      process.exit(1);
    }
    if (i === attempts) {
      console.error(`[wait-db] La base no respondio tras ${attempts} intentos:`, err.message);
      process.exit(1);
    }
    if (i === 1 || i % 5 === 0) console.log(`[wait-db] Intento ${i}/${attempts}: ${err.message} (reintentando)`);
    await sleep(delayMs);
  }
}
