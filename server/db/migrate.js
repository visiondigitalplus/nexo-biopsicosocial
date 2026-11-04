import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const schemaPath = path.join(import.meta.dirname, 'schema.sql');

async function main() {
  if (!config.databaseUrl) {
    console.log('[migrate] DATABASE_URL vacio: se usa el driver de archivo, no hay migracion que correr.');
    console.log('[migrate] Configura DATABASE_URL y vuelve a ejecutar.');
    return;
  }
  const { createPgDriver } = await import('./pgDriver.js');
  const pg = (await import('pg')).default;
  const client = new pg.Client({
    connectionString: config.databaseUrl,
    ssl: config.pgSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await client.query(sql);
  await client.end();
  console.log('[migrate] Esquema aplicado correctamente (8 tablas + access_invites).');
  void createPgDriver;
}

main().catch((err) => {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
});
