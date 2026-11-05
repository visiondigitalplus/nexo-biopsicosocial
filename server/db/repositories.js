import crypto from 'node:crypto';
import { decryptJson, encryptJson, inviteCode } from '../lib/crypto.js';

/**
 * Repositorios: unica capa que conoce nombres de tablas.
 * Todos los metodos son agnosticos del driver (PostgreSQL o archivo).
 */
/**
 * Orden natural de los items: bloque, luego posicion. La posicion es texto
 * ('1', '12a', '12b', '13'), asi que se compara por el numero inicial y, si
 * coincide, por el sufijo. Evita que '12a' caiga despues de '13'.
 */
export function compareItems(a, b) {
  const byBlock = Number(a.block) - Number(b.block);
  if (byBlock !== 0) return byBlock;
  const na = parseInt(String(a.position), 10);
  const nb = parseInt(String(b.position), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a.position).localeCompare(String(b.position), 'es', { numeric: true });
}

export function createRepositories(driver) {
  const nowIso = () => new Date().toISOString();

  const users = {
    async create({ email = null, displayName = null, utm = {}, locale = 'es', status = 'lead', tier = 'free' }) {
      return driver.insert('users', {
        email,
        display_name: displayName,
        locale,
        status,
        subscription_tier: tier,
        utm,
        consent_gdpr: true,
        consented_at: nowIso(),
        created_at: nowIso(),
      });
    },
    async findById(id) {
      if (!id) return null;
      return driver.selectOne('users', { id });
    },
    async findByEmail(email) {
      if (!email) return null;
      return driver.selectOne('users', { email });
    },
    async patch(id, fields) {
      const [row] = await driver.update('users', { id }, fields);
      return row;
    },
    async markQuizCompleted(id) {
      return users.patch(id, { status: 'quiz_done' });
    },
  };

  const invites = {
    async create({ label = null, maxUses = 1, expiresAt = null, code = null }) {
      return driver.insert('access_invites', {
        code: code || inviteCode(),
        label,
        max_uses: maxUses,
        uses: 0,
        expires_at: expiresAt,
        revoked: false,
      });
    },
    async find(code) {
      if (!code) return null;
      return driver.selectOne('access_invites', { code });
    },
    async redeem(code) {
      const invite = await invites.find(code);
      if (!invite) return { ok: false, reason: 'not_found' };
      if (invite.revoked) return { ok: false, reason: 'revoked' };
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { ok: false, reason: 'expired' };
      if (Number(invite.uses) >= Number(invite.max_uses)) return { ok: false, reason: 'exhausted' };
      const [row] = await driver.update('access_invites', { id: invite.id }, { uses: Number(invite.uses) + 1 });
      return { ok: true, invite: row };
    },
    async list() {
      return driver.select('access_invites', {}, { orderBy: ['created_at', 'desc'] });
    },
    async revoke(id) {
      const [row] = await driver.update('access_invites', { id }, { revoked: true });
      return row;
    },
  };

  const items = {
    async listActive() {
      const rows = await driver.select('assessment_items', { is_active: true }, { orderBy: 'position' });
      return rows.sort(compareItems);
    },
    async listAll() {
      const rows = await driver.select('assessment_items', {}, { orderBy: 'position' });
      return rows.sort(compareItems);
    },
    async vectors() {
      return driver.select('option_weight_vectors', {});
    },
    async upsertItem(item) {
      return driver.upsert('assessment_items', ['id'], item);
    },
    async upsertVector(itemId, optionId, vector) {
      return driver.upsert('option_weight_vectors', ['item_id', 'option_id'], {
        item_id: itemId,
        option_id: optionId,
        vak: vector.vak || {},
        gardner: vector.gardner || {},
        riasec: vector.riasec || {},
        tki: vector.tki || {},
        ejecutivo: vector.ejecutivo || {},
        eysenck: vector.eysenck || {},
        cloninger: vector.cloninger || {},
      });
    },
  };

  const profiles = {
    async save({ userId, assessmentId, profile, rawAnswers }) {
      return driver.upsert('user_psychometric_profiles', ['user_id', 'assessment_id'], {
        user_id: userId,
        assessment_id: assessmentId,
        vak: profile.vak,
        gardner: profile.gardner,
        riasec: profile.riasec,
        tki: profile.tki,
        tipi: profile.tipi,
        littauer: profile.littauer,
        eysenck: profile.eysenck,
        cloninger: profile.cloninger,
        fisher: profile.fisher,
        vak_dominant: profile.vak.dominant,
        riasec_code: profile.riasec.code,
        tki_style: profile.tki.style,
        temperament_primary: profile.littauer.dominant,
        temperament_secondary: profile.littauer.secondary,
        character_ratio: Number(profile.littauer.ratio.toFixed(3)),
        raw_answers: rawAnswers,
        report_snapshot: rawAnswers?.report || {},
        completed_at: nowIso(),
      });
    },
    async latestForUser(userId) {
      const rows = await driver.select('user_psychometric_profiles', { user_id: userId }, {
        orderBy: ['completed_at', 'desc'],
        limit: 1,
      });
      return rows[0] || null;
    },
    async countAll() {
      const rows = await driver.select('user_psychometric_profiles', {}, {});
      return rows.length;
    },
  };

  const screenings = {
    /** Guarda (cifrado) el bloque clinico. Nunca se exponen los items crudos. */
    async save({ userId, clinical, aq10Score, aq10Flag, asrsScore, asrsFlag, triageFlags = [] }) {
      const payloadEnc = encryptJson(clinical, userId);
      return driver.upsert('user_clinical_screenings', ['user_id'], {
        user_id: userId,
        payload_enc: payloadEnc,
        key_version: 1,
        aq10_score: aq10Score,
        aq10_flag: aq10Flag,
        asrs_score: asrsScore,
        asrs_flag: asrsFlag,
        triage_flags: triageFlags,
      });
    },
    async readForUser(userId) {
      const row = await driver.selectOne('user_clinical_screenings', { user_id: userId });
      if (!row) return null;
      let payload = null;
      try {
        payload = decryptJson(row.payload_enc, userId);
      } catch {
        payload = null; // clave rotada o blob corrupto
      }
      return { ...row, payload_enc: undefined, payload };
    },
    async countAll() {
      const rows = await driver.select('user_clinical_screenings', {}, {});
      return rows.length;
    },
  };

  const habits = {
    async listActive() {
      return driver.select('habit_prescriptions', { is_active: true });
    },
    async upsert(habit) {
      return driver.upsert('habit_prescriptions', ['id'], habit);
    },
  };

  const media = {
    async listActive() {
      return driver.select('media_assets', { is_active: true });
    },
    async upsert(asset) {
      if (!asset.id) asset.id = crypto.randomUUID();
      return driver.upsert('media_assets', ['id'], asset);
    },
  };

  const progress = {
    async upsertLog({ userId, logDate, mood, energy, sleepHours, habitsDone, habitsPlanned, lowEnergy, notes }) {
      const previous = await driver.select('daily_progress_logs', { user_id: userId }, {
        orderBy: ['log_date', 'desc'],
        limit: 2,
      });
      const prior = previous.find((l) => String(l.log_date).slice(0, 10) !== logDate);
      const yesterday = new Date(`${logDate}T12:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const continuesStreak = prior && String(prior.log_date).slice(0, 10) === yStr;
      const streak = continuesStreak ? Number(prior.streak) + 1 : 1;
      return driver.upsert('daily_progress_logs', ['user_id', 'log_date'], {
        user_id: userId,
        log_date: logDate,
        mood,
        energy,
        sleep_hours: sleepHours ?? null,
        habits_done: habitsDone ?? 0,
        habits_planned: habitsPlanned ?? 0,
        low_energy_mode: Boolean(lowEnergy),
        streak,
        notes: notes || null,
      });
    },
    async history(userId, limit = 30) {
      return driver.select('daily_progress_logs', { user_id: userId }, {
        orderBy: ['log_date', 'desc'],
        limit,
      });
    },
  };

  return { driver, users, invites, items, profiles, screenings, habits, media, progress };
}
