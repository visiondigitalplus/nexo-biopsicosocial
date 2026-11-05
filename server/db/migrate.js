#!/usr/bin/env node
/**
 * Aplica el esquema SQL. Es idempotente (IF NOT EXISTS + bloques DO con
 * comprobaciones), asi que se puede ejecutar en cada arranque sin miedo.
 *
 * Se puede usar como comando (npm run migrate) o importar desde el arranque
 * del servidor (server/index.js) para que un despliegue nuevo se configure solo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const schemaPath = path.join(import.meta.dirname, 'schema.sql');

/** Aplica el esquema si hay DATABASE_URL. Devuelve true si migro. */
export async function migrate({ quiet = false } = {}) {
  if (!config.databaseUrl) {
    if (!quiet) {
      console.log('[migrate] DATABASE_URL vacio: se usa el driver de archivo, no hay migracion que correr.');
      console.log('[migrate] Configura DATABASE_URL y vuelve a ejecutar.');
    }
    return false;
  }
  const pg = (await import('pg')).default;
  const client = new pg.Client({
    connectionString: config.databaseUrl,
    ssl: config.pgSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    if (!quiet) console.log('[migrate] Esquema aplicado correctamente (8 tablas + access_invites).');
    return true;
  } finally {
    await client.end();
  }
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('migrate.js');
if (isDirectRun) {
  migrate().catch((err) => {
    console.error('[migrate] Error:', err.message);
    process.exit(1);
  });
}
