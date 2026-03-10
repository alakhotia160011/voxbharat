// Idempotency middleware for POST requests
// Prevents duplicate operations when clients retry requests

import { getPool } from '../db.js';

/**
 * Express middleware: checks Idempotency-Key header on POST requests.
 * If key was seen before, returns cached response. Otherwise, captures response and stores it.
 */
export function idempotency(req, res, next) {
  if (req.method !== 'POST') return next();

  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string' || key.length > 255) return next();

  const pool = getPool();
  if (!pool) return next();

  const userId = req.user?.id;
  if (!userId) return next();

  pool.query('SELECT response_status, response_body FROM idempotency_keys WHERE key = $1 AND user_id = $2', [key, userId])
    .then(({ rows }) => {
      if (rows.length > 0) {
        // Return cached response
        return res.status(rows[0].response_status).json(rows[0].response_body);
      }

      // Capture the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Store the response (fire-and-forget)
        pool.query(
          `INSERT INTO idempotency_keys (key, user_id, response_status, response_body)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (key) DO NOTHING`,
          [key, userId, res.statusCode, JSON.stringify(body)]
        ).catch(() => {});

        return originalJson(body);
      };

      next();
    })
    .catch(() => next());
}
