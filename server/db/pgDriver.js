import pg from 'pg';
import { TABLES, TABLE_NAMES } from './schemaMeta.js';

const ident = (s) => `"${String(s).replace(/"/g, '')}"`;
const ALLOWED = Object.fromEntries(
  Object.entries(TABLES).map(([t, meta]) => [t, null]), // se llena en runtime desde information_schema
);

/**
 * Driver PostgreSQL. El SQL se construye a partir de una allowlist de columnas
 * obtenida de information_schema, de modo que ningun nombre viene del cliente.
 */
export async function createPgDriver({ connectionString, ssl }) {
  const pool = new pg.Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  async function loadColumns() {
    const { rows } = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = ANY($1)`,
      [TABLE_NAMES],
    );
    for (const name of TABLE_NAMES) ALLOWED[name] = new Set();
    for (const r of rows) ALLOWED[r.table_name]?.add(r.column_name);
    const missing = TABLE_NAMES.filter((t) => !ALLOWED[t] || ALLOWED[t].size === 0);
    if (missing.length) {
      throw new Error(
        `Faltan tablas en la base: ${missing.join(', ')}. Ejecuta "npm run migrate".`,
      );
    }
  }
  await loadColumns();

  function serialize(table, column, value) {
    const meta = TABLES[table] || {};
    if (value === undefined) return null;
    if (value === null) return null;
    if ((meta.jsonb || []).includes(column)) return JSON.stringify(value);
    if ((meta.bytea || []).includes(column)) return value;
    if ((meta.arrays || []).includes(column)) return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  }

  function columnsFor(table, keys) {
    const allow = ALLOWED[table];
    const cols = keys.filter((k) => allow.has(k));
    if (!cols.length) throw new Error(`Sin columnas validas para ${table}`);
    return cols;
  }

  function whereClause(table, where, params) {
    const entries = Object.entries(where || {});
    if (!entries.length) return '';
    const parts = entries.map(([k, v]) => {
      if (!ALLOWED[table].has(k)) throw new Error(`Columna desconocida ${table}.${k}`);
      if (v && typeof v === 'object' && v.op === 'in') {
        params.push(v.value);
        return `${ident(k)} = ANY($${params.length})`;
      }
      params.push(serialize(table, k, v));
      return `${ident(k)} = $${params.length}`;
    });
    return ` WHERE ${parts.join(' AND ')}`;
  }

  return {
    kind: 'postgres',
    pool,
    TABLES,
    async init() {
      await pool.query('SELECT 1');
    },
    async query(sql, params) {
      return pool.query(sql, params);
    },
    async select(table, where = {}, opts = {}) {
      const params = [];
      const w = whereClause(table, where, params);
      let sql = `SELECT * FROM ${ident(table)}${w}`;
      if (opts.orderBy) {
        const [col, dir] = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy, 'asc'];
        if (!ALLOWED[table].has(col)) throw new Error(`Columna desconocida ${table}.${col}`);
        sql += ` ORDER BY ${ident(col)} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      }
      if (opts.limit) sql += ` LIMIT ${Number(opts.limit)}`;
      const { rows } = await pool.query(sql, params);
      return rows;
    },
    async selectOne(table, where) {
      const rows = await this.select(table, where, { limit: 1 });
      return rows[0] || null;
    },
    async insert(table, row) {
      const cols = columnsFor(table, Object.keys(row));
      const params = cols.map((c) => serialize(table, c, row[c]));
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(', ')})
                   VALUES (${placeholders}) RETURNING *`;
      const { rows } = await pool.query(sql, params);
      return rows[0];
    },
    async update(table, where, patch) {
      const cols = columnsFor(table, Object.keys(patch));
      const params = cols.map((c) => serialize(table, c, patch[c]));
      const sets = cols.map((c, i) => `${ident(c)} = $${i + 1}`);
      const w = whereClause(table, where, params);
      const { rows } = await pool.query(
        `UPDATE ${ident(table)} SET ${sets.join(', ')}${w} RETURNING *`,
        params,
      );
      return rows;
    },
    async upsert(table, keys, row) {
      const cols = columnsFor(table, [...new Set([...keys, ...Object.keys(row)])]);
      const params = cols.map((c) => serialize(table, c, row[c]));
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const updates = cols.filter((c) => !keys.includes(c)).map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`);
      const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(', ')})
                   VALUES (${placeholders})
                   ON CONFLICT (${keys.map(ident).join(', ')})
                   ${updates.length ? `DO UPDATE SET ${updates.join(', ')}` : 'DO NOTHING'}
                   RETURNING *`;
      const { rows } = await pool.query(sql, params);
      if (rows[0]) return rows[0];
      return this.selectOne(table, Object.fromEntries(keys.map((k) => [k, row[k]])));
    },
    async delete(table, where) {
      const params = [];
      const w = whereClause(table, where, params);
      const { rowCount } = await pool.query(`DELETE FROM ${ident(table)}${w}`, params);
      return rowCount;
    },
    async truncate(table) {
      await pool.query(`TRUNCATE ${ident(table)} CASCADE`);
    },
  };
}
