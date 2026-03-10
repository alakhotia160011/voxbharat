// API key DB functions — create, list, revoke

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from './db.js';

const PREFIX = 'vxb_live_';

/**
 * Create a new API key for a user.
 * Returns the full key (shown once) and the DB row.
 */
export async function createApiKey(userId, name) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const raw = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  const fullKey = PREFIX + raw;
  const keyPrefix = raw.slice(0, 8);
  const keyHash = await bcrypt.hash(fullKey, 10);

  const { rows } = await pool.query(
    `INSERT INTO api_keys (user_id, key_prefix, key_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, key_prefix, name, created_at`,
    [userId, keyPrefix, keyHash, name]
  );

  return { key: fullKey, ...rows[0] };
}

/**
 * List all API keys for a user (without hashes).
 */
export async function listApiKeys(userId) {
  const pool = getPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `SELECT id, key_prefix, name, last_used_at, created_at, revoked_at
     FROM api_keys WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Revoke an API key (soft-delete).
 */
export async function revokeApiKey(userId, keyId) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const { rowCount } = await pool.query(
    'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL',
    [keyId, userId]
  );
  return rowCount > 0;
}
