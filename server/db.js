// Postgres connection pool + query helpers for call data persistence
// Uses DATABASE_URL env var (auto-injected by Railway Postgres add-on)

import pg from 'pg';
import bcrypt from 'bcryptjs';
import { SURVEY_SCRIPTS } from './survey-scripts.js';
const { Pool } = pg;

let pool = null;

/**
 * Initialize Postgres pool and create the calls table if it doesn't exist.
 * Call this once at server startup.
 */
export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('⚠ DATABASE_URL not set — call data will NOT be persisted to Postgres');
    return false;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      auth_provider TEXT DEFAULT 'email',
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migration for existing deployments: allow Google-only users (no password)
  await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email'`);

  // Password reset tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY,
      phone_number TEXT,
      language TEXT,
      gender TEXT,
      auto_detect_language BOOLEAN DEFAULT FALSE,
      detected_language TEXT,
      custom_survey JSONB,
      answered_by TEXT,
      voicemail_left BOOLEAN DEFAULT FALSE,
      status TEXT NOT NULL,
      duration INTEGER,
      summary TEXT,
      transcript JSONB,
      demographics JSONB,
      structured JSONB,
      responses JSONB,
      sentiment JSONB,
      recording_url TEXT,
      recording_duration INTEGER,
      started_at TIMESTAMPTZ,
      connected_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Campaign tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) NOT NULL,
      name TEXT NOT NULL,
      survey_config JSONB NOT NULL,
      language TEXT DEFAULT 'hi',
      gender TEXT DEFAULT 'female',
      auto_detect_language BOOLEAN DEFAULT FALSE,
      concurrency INTEGER DEFAULT 2 CHECK (concurrency BETWEEN 1 AND 2),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','cancelled')),
      progress JSONB DEFAULT '{"pending":0,"calling":0,"completed":0,"failed":0,"no_answer":0}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_numbers (
      id SERIAL PRIMARY KEY,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
      phone_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','calling','completed','failed','no_answer')),
      call_id UUID,
      attempts INTEGER DEFAULT 0,
      error TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_numbers_campaign ON campaign_numbers(campaign_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_numbers_status ON campaign_numbers(campaign_id, status)`);

  // Add campaign_id to calls table if not present
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS campaign_id UUID`);

  // Add direction column to calls table
  await pool.query(`ALTER TABLE calls ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound'`);

  // Inbound configs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inbound_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) NOT NULL,
      twilio_number TEXT NOT NULL,
      name TEXT NOT NULL,
      survey_config JSONB NOT NULL,
      greeting_text TEXT,
      language TEXT DEFAULT 'hi',
      gender TEXT DEFAULT 'female',
      auto_detect_language BOOLEAN DEFAULT FALSE,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_inbound_configs_number ON inbound_configs(twilio_number, enabled)`);

  // Bucket mappings for post-hoc answer categorization
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bucket_mappings (
      id SERIAL PRIMARY KEY,
      project_name TEXT NOT NULL,
      field TEXT NOT NULL,
      raw_value TEXT NOT NULL,
      bucket TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_name, field, raw_value)
    );
  `);

  console.log('✓ Postgres connected, all tables ready');
  return true;
}

// ─── User Auth ───────────────────────────────────────────

export async function createUser(email, password, name) {
  if (!pool) throw new Error('Database unavailable');
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [email.toLowerCase(), hash, name || null]
  );
  return rows[0];
}

export async function verifyUser(email, password) {
  if (!pool) return null;
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, name FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (rows.length === 0) return null;
  const user = rows[0];
  if (!user.password_hash) return null; // Google-only user, no password to verify
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function getUserByEmail(email) {
  if (!pool) return null;
  const { rows } = await pool.query(
    'SELECT id, email, name, auth_provider, password_hash IS NOT NULL as has_password, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

export async function findOrCreateGoogleUser(email, name) {
  if (!pool) throw new Error('Database unavailable');
  const normalizedEmail = email.toLowerCase();
  const { rows: existing } = await pool.query(
    'SELECT id, email, name, auth_provider FROM users WHERE email = $1',
    [normalizedEmail]
  );
  if (existing.length > 0) {
    return { user: existing[0], isNew: false };
  }
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, auth_provider)
     VALUES ($1, NULL, $2, 'google')
     RETURNING id, email, name, auth_provider, created_at`,
    [normalizedEmail, name || null]
  );
  return { user: rows[0], isNew: true };
}

export async function createPasswordResetToken(userId) {
  if (!pool) throw new Error('Database unavailable');
  const { randomBytes } = await import('crypto');
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await pool.query(
    'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
    [userId]
  );
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return token;
}

export async function verifyPasswordResetToken(token) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token = $1`,
    [token]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.used) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row;
}

export async function resetPassword(tokenId, userId, newPassword) {
  if (!pool) throw new Error('Database unavailable');
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);
}

/**
 * Check if DB is available
 */
export function isDbReady() {
  return pool !== null;
}

/**
 * Save a completed call record to Postgres (replaces saveCallToFile)
 */
export async function saveCall(call) {
  if (!pool) return null;
  if (!call.extractedData) return null;

  const duration = call.connectedAt && call.endedAt
    ? Math.round((new Date(call.endedAt) - new Date(call.connectedAt)) / 1000)
    : null;

  await pool.query(`
    INSERT INTO calls (
      id, phone_number, language, gender, auto_detect_language, detected_language,
      custom_survey, answered_by, voicemail_left, status, duration, summary,
      transcript, demographics, structured, responses, sentiment,
      recording_url, recording_duration, started_at, connected_at, ended_at,
      campaign_id, direction
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22,
      $23, $24
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      duration = EXCLUDED.duration,
      summary = EXCLUDED.summary,
      transcript = EXCLUDED.transcript,
      demographics = EXCLUDED.demographics,
      structured = EXCLUDED.structured,
      responses = EXCLUDED.responses,
      sentiment = EXCLUDED.sentiment,
      recording_url = EXCLUDED.recording_url,
      recording_duration = EXCLUDED.recording_duration,
      ended_at = EXCLUDED.ended_at,
      campaign_id = EXCLUDED.campaign_id,
      direction = EXCLUDED.direction
  `, [
    call.id,
    call.phoneNumber,
    call.detectedLanguage || call.language,
    call.gender,
    call.autoDetectLanguage || false,
    call.detectedLanguage,
    call.customSurvey ? JSON.stringify(call.customSurvey) : null,
    call.answeredBy,
    call.voicemailLeft || false,
    'completed',
    duration,
    call.extractedData.summary || '',
    JSON.stringify(call.transcript),
    call.extractedData.demographics ? JSON.stringify(call.extractedData.demographics) : null,
    call.extractedData.structured ? JSON.stringify(call.extractedData.structured) : null,
    call.extractedData.responses ? JSON.stringify(call.extractedData.responses) : null,
    call.extractedData.sentiment ? JSON.stringify(call.extractedData.sentiment) : null,
    call.recordingUrl || null,
    call.recordingDuration || null,
    call.startedAt,
    call.connectedAt,
    call.endedAt,
    call.campaignId || null,
    call.direction || 'outbound',
  ]);

  return call.id;
}

/**
 * Update recording fields for a call (recording callback may arrive after call cleanup)
 */
export async function updateCallRecording(callId, recordingSid, recordingUrl, recordingDuration) {
  if (!pool) return;

  await pool.query(`
    UPDATE calls SET recording_url = $1, recording_duration = $2
    WHERE id = $3
  `, [recordingUrl, recordingDuration, callId]);
}

/**
 * Get all completed calls (summary view for survey list)
 */
export async function getAllCalls() {
  if (!pool) return [];

  const { rows } = await pool.query(`
    SELECT id, started_at as timestamp, duration, language, status, summary,
           demographics->>'age' as age,
           demographics->>'ageGroup' as age_group,
           demographics->>'religion' as religion,
           custom_survey->>'name' as survey_name,
           recording_url, recording_duration
    FROM calls
    WHERE status = 'completed'
    ORDER BY started_at DESC
  `);

  return rows;
}

/**
 * Get a single call with all details
 */
export async function getCallById(id) {
  if (!pool) return null;

  const { rows } = await pool.query('SELECT * FROM calls WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    ...row,
    responses: row.responses || null,
    demographics: row.demographics || null,
    structured: row.structured || null,
    sentiment: row.sentiment || null,
    transcript: row.transcript || [],
  };
}

/**
 * Get aggregate analytics
 */
export async function getAnalytics() {
  if (!pool) return null;

  const [
    totalResult,
    byLanguageResult,
    byAgeGroupResult,
    byReligionResult,
    avgAgeResult,
    sentimentResult,
    religionImportanceResult,
    interfaithMarriageResult,
    diversityOpinionResult,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) as count FROM calls WHERE status = 'completed'`),
    pool.query(`SELECT language, COUNT(*) as count FROM calls WHERE status = 'completed' GROUP BY language`),
    pool.query(`SELECT demographics->>'ageGroup' as age_group, COUNT(*) as count FROM calls WHERE demographics IS NOT NULL GROUP BY demographics->>'ageGroup' ORDER BY age_group`),
    pool.query(`SELECT demographics->>'religion' as religion, COUNT(*) as count FROM calls WHERE demographics IS NOT NULL GROUP BY demographics->>'religion'`),
    pool.query(`SELECT AVG((demographics->>'age')::int) as avg_age FROM calls WHERE demographics->>'age' IS NOT NULL`),
    pool.query(`SELECT sentiment->>'overall' as overall, COUNT(*) as count FROM calls WHERE sentiment IS NOT NULL GROUP BY sentiment->>'overall'`),
    pool.query(`SELECT structured->>'religionImportance' as religion_importance, COUNT(*) as count FROM calls WHERE structured IS NOT NULL GROUP BY structured->>'religionImportance'`),
    pool.query(`SELECT structured->>'interfaithMarriage' as interfaith_marriage, COUNT(*) as count FROM calls WHERE structured IS NOT NULL GROUP BY structured->>'interfaithMarriage'`),
    pool.query(`SELECT structured->>'diversityOpinion' as diversity_opinion, COUNT(*) as count FROM calls WHERE structured IS NOT NULL GROUP BY structured->>'diversityOpinion'`),
  ]);

  return {
    totalSurveys: parseInt(totalResult.rows[0].count, 10),
    avgAge: avgAgeResult.rows[0].avg_age ? Math.round(parseFloat(avgAgeResult.rows[0].avg_age)) : null,
    byLanguage: byLanguageResult.rows,
    byAgeGroup: byAgeGroupResult.rows,
    byReligion: byReligionResult.rows,
    sentimentBreakdown: sentimentResult.rows,
    religionImportance: religionImportanceResult.rows,
    interfaithMarriage: interfaithMarriageResult.rows,
    diversityOpinion: diversityOpinionResult.rows,
  };
}

/**
 * Export all calls as JSON (full data)
 */
export async function exportCallsJson() {
  if (!pool) return [];

  const { rows } = await pool.query(`
    SELECT * FROM calls WHERE status = 'completed' ORDER BY started_at DESC
  `);

  return rows;
}

/**
 * Export all calls as CSV (flattened)
 */
export async function exportCallsCsv() {
  if (!pool) return '';

  const { rows } = await pool.query(`
    SELECT
      id, started_at as timestamp, duration, language, status,
      (demographics->>'age') as age,
      demographics->>'ageGroup' as age_group,
      demographics->>'religion' as religion,
      structured->>'religionImportance' as religion_importance,
      structured->>'prayerFrequency' as prayer_frequency,
      structured->>'religiousFreedom' as religious_freedom,
      structured->>'interfaithNeighbor' as interfaith_neighbor,
      structured->>'interfaithMarriage' as interfaith_marriage,
      structured->>'diversityOpinion' as diversity_opinion,
      sentiment->>'overall' as sentiment_overall,
      sentiment->>'openness' as openness,
      sentiment->>'religiosity' as religiosity,
      recording_url, recording_duration
    FROM calls
    WHERE status = 'completed'
    ORDER BY started_at DESC
  `);

  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"`).join(','))
  ].join('\n');

  return csv;
}

/**
 * Export all calls for a specific project as JSON (full data)
 */
export async function exportProjectCallsJson(projectName) {
  if (!pool) return [];

  const { rows } = await pool.query(`
    SELECT * FROM calls
    WHERE status = 'completed'
      AND COALESCE(custom_survey->>'name', 'Voice Survey') = $1
    ORDER BY started_at DESC
  `, [projectName]);

  return rows;
}

/**
 * Export all calls for a specific project as CSV (flattened).
 * Dynamically builds columns based on survey type (built-in or custom).
 */
export async function exportProjectCallsCsv(projectName) {
  if (!pool) return '';

  const { rows } = await pool.query(`
    SELECT * FROM calls
    WHERE status = 'completed'
      AND COALESCE(custom_survey->>'name', 'Voice Survey') = $1
    ORDER BY started_at DESC
  `, [projectName]);

  if (rows.length === 0) return '';

  const isCustom = rows[0].custom_survey != null;

  // Build question columns dynamically
  let questionColumns = [];
  if (isCustom) {
    const surveyDef = rows[0].custom_survey;
    if (surveyDef?.questions) {
      questionColumns = surveyDef.questions.map(q => {
        const fieldName = q.textEn
          ? q.textEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40)
          : `question_${q.id}`;
        return { header: q.textEn || q.text, field: fieldName, source: 'responses' };
      });
    }
  } else {
    const lang = rows[0].language || 'hi';
    const script = SURVEY_SCRIPTS[lang] || SURVEY_SCRIPTS.hi;
    if (script?.questions) {
      questionColumns = script.questions.map(q => {
        const camelField = q.field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        return { header: q.text, field: camelField, source: 'structured' };
      });
    }
  }

  // Build flat rows
  const headers = [
    'id', 'timestamp', 'duration', 'language', 'phone_number',
    'age', 'age_group', 'religion',
    ...questionColumns.map(q => q.header),
    'sentiment_overall', 'summary', 'recording_url',
  ];

  const csvRows = rows.map(row => {
    const base = [
      row.id,
      row.started_at,
      row.duration,
      row.language,
      row.phone_number,
      row.demographics?.age ?? '',
      row.demographics?.ageGroup ?? '',
      row.demographics?.religion ?? '',
    ];

    const answers = questionColumns.map(q => {
      const data = q.source === 'responses' ? row.responses : row.structured;
      return data?.[q.field] ?? '';
    });

    const tail = [
      row.sentiment?.overall ?? '',
      row.summary ?? '',
      row.recording_url ?? '',
    ];

    return [...base, ...answers, ...tail];
  });

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...csvRows.map(row => row.map(escape).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Get all survey projects (grouped by survey name) with summary stats
 */
export async function getProjects() {
  if (!pool) return [];

  const { rows } = await pool.query(`
    SELECT
      COALESCE(custom_survey->>'name', 'Voice Survey') as project_name,
      COUNT(*) as call_count,
      SUM(duration) as total_duration,
      ROUND(AVG(duration)) as avg_duration,
      MIN(started_at) as first_call,
      MAX(started_at) as last_call,
      array_agg(DISTINCT language) FILTER (WHERE language IS NOT NULL) as languages
    FROM calls
    WHERE status = 'completed'
    GROUP BY COALESCE(custom_survey->>'name', 'Voice Survey')
    ORDER BY MAX(started_at) DESC
  `);

  return rows;
}

/**
 * Get all calls for a specific project (by survey name)
 */
export async function getProjectCalls(projectName) {
  if (!pool) return [];

  const { rows } = await pool.query(`
    SELECT id, started_at as timestamp, duration, language, status, summary,
           demographics->>'age' as age,
           demographics->>'ageGroup' as age_group,
           demographics->>'religion' as religion,
           recording_url, recording_duration
    FROM calls
    WHERE status = 'completed'
      AND COALESCE(custom_survey->>'name', 'Voice Survey') = $1
    ORDER BY started_at DESC
  `, [projectName]);

  return rows;
}

/**
 * Get aggregate analytics for a specific project
 */
export async function getProjectAnalytics(projectName) {
  if (!pool) return null;

  const filter = `status = 'completed' AND COALESCE(custom_survey->>'name', 'Voice Survey') = $1`;

  const [
    totalResult,
    byLanguageResult,
    byAgeGroupResult,
    byReligionResult,
    avgDurationResult,
    sentimentResult,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) as count FROM calls WHERE ${filter}`, [projectName]),
    pool.query(`SELECT language, COUNT(*) as count FROM calls WHERE ${filter} GROUP BY language`, [projectName]),
    pool.query(`SELECT demographics->>'ageGroup' as age_group, COUNT(*) as count FROM calls WHERE ${filter} AND demographics IS NOT NULL GROUP BY demographics->>'ageGroup' ORDER BY age_group`, [projectName]),
    pool.query(`SELECT demographics->>'religion' as religion, COUNT(*) as count FROM calls WHERE ${filter} AND demographics IS NOT NULL GROUP BY demographics->>'religion'`, [projectName]),
    pool.query(`SELECT ROUND(AVG(duration)) as avg_duration, SUM(duration) as total_duration FROM calls WHERE ${filter}`, [projectName]),
    pool.query(`SELECT sentiment->>'overall' as overall, COUNT(*) as count FROM calls WHERE ${filter} AND sentiment IS NOT NULL GROUP BY sentiment->>'overall'`, [projectName]),
  ]);

  return {
    totalCalls: parseInt(totalResult.rows[0].count, 10),
    avgDuration: parseInt(avgDurationResult.rows[0].avg_duration, 10) || 0,
    totalDuration: parseInt(avgDurationResult.rows[0].total_duration, 10) || 0,
    byLanguage: byLanguageResult.rows,
    byAgeGroup: byAgeGroupResult.rows,
    byReligion: byReligionResult.rows,
    sentimentBreakdown: sentimentResult.rows,
  };
}

/**
 * Convert snake_case to camelCase (e.g. religion_importance → religionImportance)
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Derive a field name from English question text (same algorithm as getCustomExtractionPrompt)
 */
function deriveFieldName(textEn) {
  return textEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40);
}

/**
 * Get the survey config (questions, tone, etc.) for a project from its most recent call.
 */
export async function getProjectSurveyConfig(projectName) {
  if (!pool) return null;
  const { rows } = await pool.query(`
    SELECT custom_survey FROM calls
    WHERE COALESCE(custom_survey->>'name', 'Voice Survey') = $1
      AND custom_survey IS NOT NULL
    ORDER BY started_at DESC LIMIT 1
  `, [projectName]);
  return rows[0]?.custom_survey || null;
}

/**
 * Get per-question response breakdowns for a project.
 * Works for both built-in surveys (SURVEY_SCRIPTS) and custom surveys.
 */
export async function getProjectResponseBreakdowns(projectName) {
  if (!pool) return null;

  const { rows } = await pool.query(`
    SELECT structured, responses, custom_survey, language
    FROM calls
    WHERE status = 'completed'
      AND COALESCE(custom_survey->>'name', 'Voice Survey') = $1
    ORDER BY started_at DESC
  `, [projectName]);

  if (rows.length === 0) return { totalResponses: 0, questions: [] };

  const isCustom = rows[0].custom_survey != null;
  const totalResponses = rows.length;
  const questions = [];

  // Load bucket mappings for this project (field → rawValue → bucket)
  const mappingsRows = await getBucketMappings(projectName);
  const mappingIndex = {};
  for (const m of mappingsRows) {
    if (!mappingIndex[m.field]) mappingIndex[m.field] = {};
    mappingIndex[m.field][m.raw_value] = m.bucket;
  }

  // Helper: count answers with case normalization + bucket mapping
  function countAnswers(fieldName, valueExtractor) {
    const rawCounts = {};       // raw value → count (for merge UI)
    const bucketedCounts = {};  // bucketed display label → count
    const displayLabels = {};   // lowercased key → most-frequent original casing
    const labelFreq = {};       // lowercased key → max count seen for a casing
    let answered = 0;
    const fieldMappings = mappingIndex[fieldName] || {};

    for (const row of rows) {
      const val = valueExtractor(row);
      if (val == null || val === '') continue;
      const strVal = String(val).trim();
      if (!strVal) continue;

      answered++;
      // Raw counts (for merge UI)
      rawCounts[strVal] = (rawCounts[strVal] || 0) + 1;

      // Apply bucket mapping if exists, otherwise case-normalize
      const mapped = fieldMappings[strVal];
      if (mapped !== undefined) {
        bucketedCounts[mapped] = (bucketedCounts[mapped] || 0) + 1;
      } else {
        const normalKey = strVal.toLowerCase();
        bucketedCounts[normalKey] = (bucketedCounts[normalKey] || 0) + 1;
        // Track best display label (most frequent casing)
        if (!labelFreq[normalKey] || rawCounts[strVal] > labelFreq[normalKey]) {
          labelFreq[normalKey] = rawCounts[strVal];
          displayLabels[normalKey] = strVal;
        }
      }
    }

    // Build bucketed breakdown with proper display labels
    const breakdown = Object.entries(bucketedCounts)
      .map(([key, count]) => ({
        value: displayLabels[key] || key,
        count,
        pct: answered > 0 ? Math.round((count / answered) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Build raw breakdown for merge UI
    const rawBreakdown = Object.entries(rawCounts)
      .map(([value, count]) => ({ value, count, pct: answered > 0 ? Math.round((count / answered) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return { breakdown, rawBreakdown, answered, hasMappings: Object.keys(fieldMappings).length > 0 };
  }

  if (isCustom) {
    const surveyDef = rows[0].custom_survey;
    if (!surveyDef?.questions) return { totalResponses, questions: [] };

    for (const q of surveyDef.questions) {
      const fieldName = q.textEn
        ? deriveFieldName(q.textEn)
        : `question_${q.id}`;

      const { breakdown, rawBreakdown, answered, hasMappings } = countAnswers(
        fieldName,
        (row) => row.responses?.[fieldName]
      );

      questions.push({
        field: fieldName,
        text: q.textEn || q.text,
        textOriginal: q.text !== q.textEn ? q.text : undefined,
        type: q.options?.length > 0 ? 'categorical' : 'free_text',
        options: q.options || null,
        breakdown,
        rawBreakdown,
        hasMappings,
        answered,
        unanswered: totalResponses - answered,
      });
    }
  } else {
    const lang = rows[0].language || 'hi';
    const script = SURVEY_SCRIPTS[lang] || SURVEY_SCRIPTS.hi;
    if (!script?.questions) return { totalResponses, questions: [] };

    for (const q of script.questions) {
      const camelField = snakeToCamel(q.field);

      const { breakdown, rawBreakdown, answered, hasMappings } = countAnswers(
        camelField,
        (row) => row.structured?.[camelField] ?? row.demographics?.[q.field]
      );

      questions.push({
        field: camelField,
        text: q.text,
        type: q.options?.length > 0 ? 'categorical' : 'free_text',
        options: q.options || null,
        breakdown,
        rawBreakdown,
        hasMappings,
        answered,
        unanswered: totalResponses - answered,
      });
    }
  }

  return { totalResponses, questions };
}

// ─── Bucket Mappings ────────────────────────────────────

export async function getBucketMappings(projectName) {
  if (!pool) return [];
  const { rows } = await pool.query(
    'SELECT field, raw_value, bucket FROM bucket_mappings WHERE project_name = $1 ORDER BY field, bucket',
    [projectName]
  );
  return rows;
}

export async function saveBucketMapping(projectName, field, rawValue, bucket) {
  if (!pool) return null;
  const { rows } = await pool.query(`
    INSERT INTO bucket_mappings (project_name, field, raw_value, bucket)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (project_name, field, raw_value)
    DO UPDATE SET bucket = EXCLUDED.bucket
    RETURNING *
  `, [projectName, field, rawValue, bucket]);
  return rows[0];
}

export async function saveBucketMappingsBatch(projectName, mappings) {
  if (!pool) return;
  for (const m of mappings) {
    await saveBucketMapping(projectName, m.field, m.rawValue, m.bucket);
  }
}

export async function deleteBucketMapping(projectName, field, rawValue) {
  if (!pool) return false;
  const result = await pool.query(
    'DELETE FROM bucket_mappings WHERE project_name = $1 AND field = $2 AND raw_value = $3',
    [projectName, field, rawValue]
  );
  return result.rowCount > 0;
}

/**
 * Delete a call by ID
 */
export async function deleteCall(id) {
  if (!pool) return false;

  const result = await pool.query('DELETE FROM calls WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// ─── Campaigns ───────────────────────────────────────────

export async function createCampaign(userId, data) {
  if (!pool) throw new Error('Database unavailable');
  const { rows } = await pool.query(`
    INSERT INTO campaigns (user_id, name, survey_config, language, gender, auto_detect_language, concurrency)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [userId, data.name, JSON.stringify(data.surveyConfig), data.language || 'hi', data.gender || 'female', data.autoDetectLanguage || false, data.concurrency || 2]);
  return rows[0];
}

export async function getCampaignById(id) {
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getCampaignsByUser(userId) {
  if (!pool) return [];
  const { rows } = await pool.query(`
    SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC
  `, [userId]);
  return rows;
}

export async function updateCampaignStatus(id, status) {
  if (!pool) return null;
  const { rows } = await pool.query(`
    UPDATE campaigns SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *
  `, [id, status]);
  return rows[0] || null;
}

export async function updateCampaignProgress(id, progress) {
  if (!pool) return null;
  await pool.query(`
    UPDATE campaigns SET progress = $2, updated_at = NOW() WHERE id = $1
  `, [id, JSON.stringify(progress)]);
}

export async function addCampaignNumbers(campaignId, phoneNumbers) {
  if (!pool) return;
  const values = phoneNumbers.map((num, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO campaign_numbers (campaign_id, phone_number) VALUES ${values}`,
    [campaignId, ...phoneNumbers]
  );
  // Update initial progress
  await pool.query(`
    UPDATE campaigns SET progress = jsonb_set(progress, '{pending}', to_jsonb($2::int)), updated_at = NOW()
    WHERE id = $1
  `, [campaignId, phoneNumbers.length]);
}

export async function getNextPendingNumbers(campaignId, limit) {
  if (!pool) return [];
  const { rows } = await pool.query(`
    SELECT id, phone_number FROM campaign_numbers
    WHERE campaign_id = $1 AND status = 'pending'
    ORDER BY id LIMIT $2
  `, [campaignId, limit]);
  return rows;
}

export async function updateCampaignNumberStatus(id, status, callId, error) {
  if (!pool) return;
  const now = new Date().toISOString();
  await pool.query(`
    UPDATE campaign_numbers SET
      status = $2,
      call_id = $3,
      error = $4,
      attempts = attempts + 1,
      started_at = CASE WHEN $2 = 'calling' THEN $5::timestamptz ELSE started_at END,
      completed_at = CASE WHEN $2 IN ('completed','failed','no_answer') THEN $5::timestamptz ELSE completed_at END
    WHERE id = $1
  `, [id, status, callId || null, error || null, now]);
}

export async function getCampaignNumbersByCampaign(campaignId) {
  if (!pool) return [];
  const { rows } = await pool.query(`
    SELECT * FROM campaign_numbers WHERE campaign_id = $1 ORDER BY id
  `, [campaignId]);
  return rows;
}

export async function getProgressCounts(campaignId) {
  if (!pool) return { pending: 0, calling: 0, completed: 0, failed: 0, no_answer: 0 };
  const { rows } = await pool.query(`
    SELECT status, COUNT(*)::int as count FROM campaign_numbers
    WHERE campaign_id = $1 GROUP BY status
  `, [campaignId]);
  const counts = { pending: 0, calling: 0, completed: 0, failed: 0, no_answer: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

export async function resetCallingNumbers(campaignId) {
  if (!pool) return;
  await pool.query(`
    UPDATE campaign_numbers SET status = 'pending', call_id = NULL
    WHERE campaign_id = $1 AND status = 'calling'
  `, [campaignId]);
}

export async function getRunningCampaigns() {
  if (!pool) return [];
  const { rows } = await pool.query(`SELECT id FROM campaigns WHERE status = 'running'`);
  return rows;
}

export function getPool() {
  return pool;
}

// ─── Inbound Configs ─────────────────────────────────────

export async function createInboundConfig(userId, data) {
  if (!pool) throw new Error('Database unavailable');
  const { rows } = await pool.query(`
    INSERT INTO inbound_configs (user_id, twilio_number, name, survey_config, greeting_text, language, gender, auto_detect_language)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [userId, data.twilioNumber, data.name, JSON.stringify(data.surveyConfig), data.greetingText || null, data.language || 'hi', data.gender || 'female', data.autoDetectLanguage || false]);
  return rows[0];
}

export async function getInboundConfigById(id) {
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM inbound_configs WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getInboundConfigsByUser(userId) {
  if (!pool) return [];
  const { rows } = await pool.query('SELECT * FROM inbound_configs WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return rows;
}

export async function getInboundConfigByNumber(twilioNumber) {
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM inbound_configs WHERE twilio_number = $1 AND enabled = TRUE LIMIT 1', [twilioNumber]);
  return rows[0] || null;
}

export async function updateInboundConfig(id, data) {
  if (!pool) return null;
  const fields = [];
  const vals = [id];
  let idx = 2;
  for (const key of ['name', 'survey_config', 'greeting_text', 'language', 'gender', 'auto_detect_language', 'enabled']) {
    if (data[key] !== undefined) {
      const col = key === 'survey_config' ? 'survey_config' : key;
      const val = key === 'survey_config' ? JSON.stringify(data[key]) : data[key];
      fields.push(`${col} = $${idx}`);
      vals.push(val);
      idx++;
    }
  }
  if (fields.length === 0) return getInboundConfigById(id);
  fields.push('updated_at = NOW()');
  const { rows } = await pool.query(`UPDATE inbound_configs SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, vals);
  return rows[0] || null;
}

export async function deleteInboundConfig(id) {
  if (!pool) return false;
  const result = await pool.query('DELETE FROM inbound_configs WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function toggleInboundConfig(id, enabled) {
  if (!pool) return null;
  const { rows } = await pool.query('UPDATE inbound_configs SET enabled = $2, updated_at = NOW() WHERE id = $1 RETURNING *', [id, enabled]);
  return rows[0] || null;
}

export async function findCallerInCampaigns(phoneNumber) {
  if (!pool) return null;
  const { rows } = await pool.query(`
    SELECT cn.*, c.survey_config, c.language, c.gender, c.auto_detect_language, c.name as campaign_name
    FROM campaign_numbers cn
    JOIN campaigns c ON cn.campaign_id = c.id
    WHERE cn.phone_number = $1
      AND c.status IN ('running', 'paused', 'completed')
      AND cn.status IN ('no_answer', 'failed', 'pending')
      AND c.created_at > NOW() - INTERVAL '7 days'
    ORDER BY cn.completed_at DESC NULLS LAST
    LIMIT 1
  `, [phoneNumber]);
  return rows[0] || null;
}

export async function completeCampaignCallback(campaignId, phoneNumber, callId) {
  if (!pool) return;
  await pool.query(
    `UPDATE campaign_numbers SET status = 'completed', completed_at = NOW(), call_id = $3
     WHERE campaign_id = $1 AND phone_number = $2 AND status IN ('no_answer','failed','pending')`,
    [campaignId, phoneNumber, callId]
  );
}
