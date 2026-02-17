// Postgres connection pool + query helpers for call data persistence
// Uses DATABASE_URL env var (auto-injected by Railway Postgres add-on)

import pg from 'pg';
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

  console.log('✓ Postgres connected, calls table ready');
  return true;
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
      recording_url, recording_duration, started_at, connected_at, ended_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22
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
      ended_at = EXCLUDED.ended_at
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
    ...rows.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csv;
}

/**
 * Delete a call by ID
 */
export async function deleteCall(id) {
  if (!pool) return false;

  const result = await pool.query('DELETE FROM calls WHERE id = $1', [id]);
  return result.rowCount > 0;
}
