// API key authentication middleware for /api/v1/ routes
// Keys use format: vxb_live_<32 hex chars>
// Stored as bcrypt hash in DB, prefix used for fast lookups

import bcrypt from 'bcryptjs';
import { getPool } from '../db.js';

const PREFIX = 'vxb_live_';

/**
 * Express middleware: extracts API key from Authorization header,
 * validates against DB, attaches user to req.
 */
export function requireApiKey(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing API key. Use Authorization: Bearer vxb_live_...' } });
  }

  const key = header.slice(7).trim();
  if (!key.startsWith(PREFIX) || key.length < PREFIX.length + 8) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key format' } });
  }

  const keyPrefix = key.slice(PREFIX.length, PREFIX.length + 8);

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' } });
  }

  pool.query(
    'SELECT id, user_id, key_hash FROM api_keys WHERE key_prefix = $1 AND revoked_at IS NULL',
    [keyPrefix]
  )
    .then(async ({ rows }) => {
      for (const row of rows) {
        const valid = await bcrypt.compare(key, row.key_hash);
        if (valid) {
          // Update last_used_at (fire-and-forget)
          pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]).catch(() => {});
          req.user = { id: row.user_id, apiKeyId: row.id };
          return next();
        }
      }
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } });
    })
    .catch((err) => {
      console.error('[API Key Auth] DB error:', err.message);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } });
    });
}
