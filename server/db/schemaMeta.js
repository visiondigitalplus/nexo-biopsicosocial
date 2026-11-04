/**
 * Metadatos de las tablas: permiten que el driver PostgreSQL genere SQL
 * parametrizado de forma segura (allowlist de columnas) y que el driver de
 * archivo mantenga la misma forma de fila que el esquema real.
 *
 * jsonb / array / bytea / date -> se serializan de forma especial.
 */
export const TABLES = {
  users: {
    pk: 'id',
    jsonb: ['utm'],
    dates: ['consented_at', 'created_at', 'updated_at'],
  },
  assessment_items: {
    pk: 'id',
    jsonb: ['options', 'config'],
    dates: ['created_at', 'updated_at'],
  },
  option_weight_vectors: {
    pk: 'id',
    jsonb: ['vak', 'gardner', 'riasec', 'tki', 'ejecutivo', 'eysenck', 'cloninger'],
    dates: ['created_at'],
  },
  user_psychometric_profiles: {
    pk: 'id',
    jsonb: ['vak', 'gardner', 'riasec', 'tki', 'tipi', 'littauer', 'eysenck', 'cloninger', 'fisher', 'raw_answers', 'report_snapshot'],
    dates: ['completed_at', 'created_at', 'updated_at'],
  },
  user_clinical_screenings: {
    pk: 'id',
    jsonb: ['triage_flags'],
    bytea: ['payload_enc'],
    dates: ['created_at', 'updated_at'],
  },
  habit_prescriptions: {
    pk: 'id',
    jsonb: ['fogg_recipe', 'low_energy_recipe', 'payload'],
    dates: ['created_at'],
  },
  media_assets: {
    pk: 'id',
    jsonb: [],
    arrays: ['tags'],
    dates: ['created_at'],
  },
  daily_progress_logs: {
    pk: 'id',
    jsonb: [],
    dates: ['log_date', 'created_at'],
  },
  access_invites: {
    pk: 'id',
    jsonb: [],
    dates: ['expires_at', 'created_at'],
  },
};

export const TABLE_NAMES = Object.keys(TABLES);
