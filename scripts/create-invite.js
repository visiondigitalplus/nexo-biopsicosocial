#!/usr/bin/env node
/**
 * Genera un enlace de acceso privado.
 * Uso: npm run invite -- "Nombre de la persona" [usos] [dias]
 */
import { getDb } from '../server/db/index.js';
import { config } from '../server/config.js';

const [, , label = 'Invitado', uses = '1', days = ''] = process.argv;

const { repos } = await getDb();
const expiresAt = days ? new Date(Date.now() + Number(days) * 86400_000).toISOString() : null;
const invite = await repos.invites.create({ label, maxUses: Number(uses), expiresAt });

console.log('\nEnlace privado generado:\n');
const base = (process.env.PUBLIC_BASE_URL || config.publicBaseUrl || 'http://localhost:3000').replace(/\/$/, '');
console.log(`  ${base}/?invite=${invite.code}\n`);
console.log(`  Para: ${label} · usos: ${uses}${days ? ` · expira en ${days} días` : ''}`);
console.log('  Comparte solo con la persona indicada. Revócalo en /admin si se filtra.\n');
process.exit(0);
