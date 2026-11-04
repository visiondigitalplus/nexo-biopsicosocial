-- ===========================================================================
-- NEXO BIOPSICOSOCIAL - Esquema PostgreSQL 15+
-- 8 tablas nucleares + 1 extension de control de acceso (access_invites)
-- Diseno: JSONB para vectores de pesos y perfiles, tabla clinica segregada
-- con cifrado a nivel de aplicacion (AES-256-GCM) + RLS opcional.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. users: identidad, suscripcion y atribucion (UTMs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE,
  display_name      TEXT,
  locale            TEXT NOT NULL DEFAULT 'es',
  -- Ciclo de vida comercial: lead -> quiz_done -> paid -> active -> churned
  status            TEXT NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead','quiz_done','paid','active','churned')),
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                    CHECK (subscription_tier IN ('free','core','pro')),
  stripe_customer_id TEXT,
  -- Atribucion: { utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing }
  utm              JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_gdpr     BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
CREATE INDEX IF NOT EXISTS users_utm_idx ON users USING GIN (utm);

-- ---------------------------------------------------------------------------
-- 2. assessment_items: banco de items editable desde el backoffice
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_items (
  id            TEXT PRIMARY KEY,              -- 'SIT_01', 'TIPI_03', 'LIT_S_01'
  block         SMALLINT NOT NULL CHECK (block BETWEEN 1 AND 3),
  position      INTEGER NOT NULL,
  kind          TEXT NOT NULL
                CHECK (kind IN ('situational','likert','binary','multi','choice','text','adjective')),
  dimension     TEXT,                          -- 'VAK','GARDNER','RIASEC','TKI','TIPI','AQ10','ASRS','CATQ'
  prompt        TEXT NOT NULL,
  helper        TEXT,
  -- Opciones para items de seleccion: [{ id, label, vectorRef }]
  options       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Reglas de render/validacion: { minSelect, maxSelect, min, max, step, reverse, required }
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_key   TEXT,                          -- clave de recodificacion en el motor
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_items_block_idx ON assessment_items (block, position) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 3. option_weight_vectors: vector multirrasgo por opcion (JSONB)
--    w_k = [dVak, dGardner, dRiasec, dTki, dEjecutivo, dEysenck, dCloninger]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS option_weight_vectors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     TEXT NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,
  vak         JSONB NOT NULL DEFAULT '{"V":0,"A":0,"K":0}'::jsonb,
  gardner     JSONB NOT NULL DEFAULT '{}'::jsonb,
  riasec      JSONB NOT NULL DEFAULT '{}'::jsonb,
  tki         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ejecutivo   JSONB NOT NULL DEFAULT '{}'::jsonb,
  eysenck     JSONB NOT NULL DEFAULT '{"E":0,"N":0,"P":0}'::jsonb,
  cloninger   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, option_id)
);
CREATE INDEX IF NOT EXISTS owv_item_idx ON option_weight_vectors (item_id);

-- ---------------------------------------------------------------------------
-- 4. user_psychometric_profiles: puntuaciones acumuladas (no sensibles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_psychometric_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id  UUID NOT NULL,
  -- Perfiles completos y vectores derivados
  vak            JSONB NOT NULL DEFAULT '{}'::jsonb,
  gardner        JSONB NOT NULL DEFAULT '{}'::jsonb,
  riasec         JSONB NOT NULL DEFAULT '{}'::jsonb,
  tki            JSONB NOT NULL DEFAULT '{}'::jsonb,
  tipi           JSONB NOT NULL DEFAULT '{}'::jsonb,
  littauer       JSONB NOT NULL DEFAULT '{}'::jsonb,
  eysenck        JSONB NOT NULL DEFAULT '{}'::jsonb,
  cloninger      JSONB NOT NULL DEFAULT '{}'::jsonb,
  fisher         JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Salidas normalizadas para consultas rapidas
  vak_dominant   TEXT,
  riasec_code    TEXT,
  tki_style      TEXT,
  temperament_primary   TEXT,
  temperament_secondary TEXT,
  character_ratio       NUMERIC(5,3),
  -- Respuestas crudas del bloque no clinico: { "SIT_01": "A", ... }
  raw_answers    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Informe integrado ya calculado (Modulos A-D) para reabrirlo o exportarlo
  report_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, assessment_id)
);
CREATE INDEX IF NOT EXISTS upp_user_idx ON user_psychometric_profiles (user_id);

-- ---------------------------------------------------------------------------
-- 5. user_clinical_screenings: SEGREGADA / ALTA SEGURIDAD
--    Ningun payload se guarda en claro: `payload_enc` es el blob AES-256-GCM
--    (aad = user_id) y solo se descifra bajo demanda en el servidor.
--    Sin IP, sin user-agent, sin UTMs: no es atribuible a trafico comercial.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_clinical_screenings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_enc    BYTEA NOT NULL,          -- { aq10, asrs, catq, anxiety, depression, goals, notes }
  key_version    SMALLINT NOT NULL DEFAULT 1,
  aq10_score     SMALLINT,                -- indicador agregado (sin detalle)
  aq10_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  asrs_score     SMALLINT,
  asrs_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Etiquetas de triaje no diagnosticas, solo para enrutar el informe
  triage_flags   JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinician_note TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
-- RLS opcional (activar en produccion con un rol de aplicacion restringido):
-- ALTER TABLE user_clinical_screenings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY clinical_owner ON user_clinical_screenings
--   USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- 6. habit_prescriptions: catalogo de microhabitos, dietas Unani y directrices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habit_prescriptions (
  id            TEXT PRIMARY KEY,
  temperament   TEXT NOT NULL CHECK (temperament IN ('sanguineo','colerico','melancolico','flematico','any')),
  category      TEXT NOT NULL
                CHECK (category IN ('microhabit','diet_include','diet_exclude','movement','sleep','healing','communication','media')),
  vak_channel   TEXT CHECK (vak_channel IN ('V','A','K','any')),
  title         TEXT NOT NULL,
  -- Receta Tiny Habits: { anchor, microAction, celebration }
  fogg_recipe   JSONB NOT NULL DEFAULT '{}'::jsonb,
  low_energy_recipe JSONB NOT NULL DEFAULT '{}'::jsonb,
  rationale     TEXT,
  minutes       SMALLINT NOT NULL DEFAULT 5,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- prescripcion dietetica, guion, etc.
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habit_prescriptions_lookup_idx
  ON habit_prescriptions (temperament, category) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 7. media_assets: audios binaurales, videos y retos filtrados por canal VAK
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL CHECK (kind IN ('audio','video','challenge','guide')),
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT NOT NULL,
  vak_channel  TEXT CHECK (vak_channel IN ('V','A','K','any')),
  temperament  TEXT CHECK (temperament IN ('sanguineo','colerico','melancolico','flematico','any')),
  duration_sec INTEGER,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_assets_filter_idx ON media_assets (vak_channel, temperament) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 8. daily_progress_logs: animo, energia, racha y conmutador de baja energia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_progress_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date          DATE NOT NULL,
  mood              SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy            SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  sleep_hours       NUMERIC(3,1),
  habits_done       INTEGER NOT NULL DEFAULT 0,
  habits_planned    INTEGER NOT NULL DEFAULT 0,
  low_energy_mode   BOOLEAN NOT NULL DEFAULT FALSE,
  streak            INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
CREATE INDEX IF NOT EXISTS daily_progress_user_idx ON daily_progress_logs (user_id, log_date DESC);

-- ---------------------------------------------------------------------------
-- 9. EXTENSION: access_invites - acceso solo por enlace (repositorio privado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,     -- token del enlace: /?invite=CODE
  label       TEXT,                     -- a quien se le paso
  max_uses    INTEGER NOT NULL DEFAULT 1,
  uses        INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Trigger generico de updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS upp_touch ON user_psychometric_profiles;
CREATE TRIGGER upp_touch BEFORE UPDATE ON user_psychometric_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS ucs_touch ON user_clinical_screenings;
CREATE TRIGGER ucs_touch BEFORE UPDATE ON user_clinical_screenings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
