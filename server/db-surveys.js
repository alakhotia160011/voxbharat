// Survey CRUD — first-class survey entities stored in DB

import { getPool } from './db.js';

/**
 * Create a new survey.
 */
export async function createSurvey(userId, name, config) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const { rows } = await pool.query(
    `INSERT INTO surveys (user_id, name, config)
     VALUES ($1, $2, $3)
     RETURNING id, name, created_at, updated_at`,
    [userId, name, JSON.stringify(config)]
  );
  return rows[0];
}

/**
 * List surveys for a user with call stats.
 */
export async function listSurveys(userId, { cursor, limit = 20 } = {}) {
  const pool = getPool();
  if (!pool) return { data: [], hasMore: false };

  limit = Math.min(Math.max(1, limit), 100);

  let query = `
    SELECT s.id, s.name, s.config->>'type' as type, s.created_at, s.updated_at,
           COUNT(c.id)::int as call_count,
           SUM(c.duration)::int as total_duration
    FROM surveys s
    LEFT JOIN calls c ON c.custom_survey->>'name' = s.name AND c.user_id = s.user_id AND c.status = 'completed'
    WHERE s.user_id = $1
  `;
  const params = [userId];

  if (cursor) {
    query += ` AND s.created_at < $${params.length + 1}`;
    params.push(cursor);
  }

  query += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);

  const { rows } = await pool.query(query, params);
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  return { data: rows, hasMore, cursor: hasMore ? rows[rows.length - 1].created_at : null };
}

/**
 * Get a survey by name for a user.
 */
export async function getSurveyByName(userId, name) {
  const pool = getPool();
  if (!pool) return null;

  const { rows } = await pool.query(
    'SELECT * FROM surveys WHERE user_id = $1 AND name = $2',
    [userId, name]
  );
  return rows[0] || null;
}

/**
 * Update a survey's config.
 */
export async function updateSurvey(userId, name, config) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const { rows } = await pool.query(
    `UPDATE surveys SET config = $3, updated_at = NOW()
     WHERE user_id = $1 AND name = $2
     RETURNING id, name, config, created_at, updated_at`,
    [userId, name, JSON.stringify(config)]
  );
  return rows[0] || null;
}

/**
 * Delete a survey by name.
 */
export async function deleteSurvey(userId, name) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const { rowCount } = await pool.query(
    'DELETE FROM surveys WHERE user_id = $1 AND name = $2',
    [userId, name]
  );
  return rowCount > 0;
}
