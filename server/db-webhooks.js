// Webhook DB functions — CRUD + delivery tracking

import crypto from 'crypto';
import { getPool } from './db.js';

/**
 * Create a webhook. Returns the secret once.
 */
export async function createWebhook(userId, url, events) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

  const { rows } = await pool.query(
    `INSERT INTO webhooks (user_id, url, events, secret)
     VALUES ($1, $2, $3, $4)
     RETURNING id, url, events, enabled, created_at`,
    [userId, url, events, secret]
  );

  return { secret, ...rows[0] };
}

/**
 * List webhooks for a user (without secrets).
 */
export async function listWebhooks(userId) {
  const pool = getPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `SELECT id, url, events, enabled, created_at
     FROM webhooks WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Delete a webhook.
 */
export async function deleteWebhook(userId, webhookId) {
  const pool = getPool();
  if (!pool) throw new Error('Database unavailable');

  const { rowCount } = await pool.query(
    'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
    [webhookId, userId]
  );
  return rowCount > 0;
}

/**
 * Get a single webhook by ID (for test endpoint).
 */
export async function getWebhookById(userId, webhookId) {
  const pool = getPool();
  if (!pool) return null;

  const { rows } = await pool.query(
    'SELECT id, url, secret, events, enabled FROM webhooks WHERE id = $1 AND user_id = $2',
    [webhookId, userId]
  );
  return rows[0] || null;
}

/**
 * Get all enabled webhooks for a user subscribed to a specific event.
 */
export async function getWebhooksForEvent(userId, event) {
  const pool = getPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `SELECT id, url, secret, events FROM webhooks
     WHERE user_id = $1 AND enabled = TRUE AND $2 = ANY(events)`,
    [userId, event]
  );
  return rows;
}

/**
 * Record a delivery attempt.
 */
export async function recordDelivery(webhookId, event, payload, statusCode, delivered) {
  const pool = getPool();
  if (!pool) return;

  await pool.query(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, delivered_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [webhookId, event, JSON.stringify(payload), statusCode, delivered ? new Date() : null]
  );
}

/**
 * Get recent deliveries for a webhook.
 */
export async function getDeliveries(webhookId, { limit = 20 } = {}) {
  const pool = getPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `SELECT id, event, payload, status_code, attempt, delivered_at, created_at
     FROM webhook_deliveries WHERE webhook_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [webhookId, Math.min(limit, 100)]
  );
  return rows;
}
