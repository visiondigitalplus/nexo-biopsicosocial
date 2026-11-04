import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { TABLES, TABLE_NAMES } from './schemaMeta.js';

const nowIso = () => new Date().toISOString();

function matches(row, where) {
  return Object.entries(where || {}).every(([k, v]) => {
    const value = row[k];
    if (Array.isArray(v)) return v.map(String).includes(String(value));
    if (v && typeof v === 'object' && v.op === 'in') return v.value.map(String).includes(String(value));
    return String(value) === String(v);
  });
}

/**
 * Driver de archivo (desarrollo/demo). Mantiene la misma interfaz que el
 * driver PostgreSQL para que los repositorios sean agnosticos.
 */
export function createFileDriver(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const read = () => {
    if (!fs.existsSync(filePath)) return Object.fromEntries(TABLE_NAMES.map((t) => [t, []]));
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const t of TABLE_NAMES) parsed[t] = parsed[t] || [];
      return parsed;
    } catch {
      return Object.fromEntries(TABLE_NAMES.map((t) => [t, []]));
    }
  };
  let cache = read();
  const flush = () => fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));

  const table = (name) => {
    if (!TABLE_NAMES.includes(name)) throw new Error(`Tabla desconocida: ${name}`);
    cache[name] = cache[name] || [];
    return cache[name];
  };

  return {
    kind: 'file',
    path: filePath,
    async init() {
      flush();
    },
    async select(name, where = {}, opts = {}) {
      let rows = table(name).filter((r) => matches(r, where));
      if (opts.orderBy) {
        const [col, dir = 'asc'] = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy, 'asc'];
        rows = rows.sort((a, b) => {
          const av = a[col] ?? '';
          const bv = b[col] ?? '';
          return (av > bv ? 1 : av < bv ? -1 : 0) * (dir === 'desc' ? -1 : 1);
        });
      }
      if (opts.limit) rows = rows.slice(0, opts.limit);
      return rows.map((r) => ({ ...r }));
    },
    async selectOne(name, where) {
      const row = table(name).find((r) => matches(r, where));
      return row ? { ...row } : null;
    },
    async insert(name, row) {
      const record = { id: crypto.randomUUID(), created_at: nowIso(), ...row };
      table(name).push(record);
      flush();
      return { ...record };
    },
    async update(name, where, patch) {
      const rows = table(name).filter((r) => matches(r, where));
      for (const r of rows) Object.assign(r, patch, { updated_at: nowIso() });
      flush();
      return rows.map((r) => ({ ...r }));
    },
    async upsert(name, keys, row) {
      const existing = table(name).find((r) => keys.every((k) => String(r[k]) === String(row[k])));
      if (existing) {
        Object.assign(existing, row, { updated_at: nowIso() });
        flush();
        return { ...existing };
      }
      return this.insert(name, row);
    },
    async delete(name, where) {
      const before = table(name).length;
      cache[name] = table(name).filter((r) => !matches(r, where));
      flush();
      return before - cache[name].length;
    },
    async truncate(name) {
      cache[name] = [];
      flush();
    },
    TABLES,
  };
}
