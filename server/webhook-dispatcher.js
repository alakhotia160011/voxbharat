// Webhook dispatcher — signs payloads with HMAC-SHA256, delivers with retries

import crypto from 'crypto';
import { getWebhooksForEvent, recordDelivery } from './db-webhooks.js';

const RETRY_DELAYS = [60_000, 300_000, 1_800_000]; // 1min, 5min, 30min

/**
 * Sign a payload body with HMAC-SHA256.
 */
function signPayload(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return 'sha256=' + hmac.digest('hex');
}

/**
 * Deliver a webhook event to all subscribers for a user.
 */
export async function dispatchWebhook(userId, event, payload) {
  let webhooks;
  try {
    webhooks = await getWebhooksForEvent(userId, event);
  } catch (err) {
    console.error(`[Webhook] Failed to fetch webhooks for user ${userId}:`, err.message);
    return;
  }

  if (webhooks.length === 0) return;

  const fullPayload = { event, ...payload, timestamp: new Date().toISOString() };
  const body = JSON.stringify(fullPayload);

  for (const wh of webhooks) {
    deliverWithRetry(wh, event, body, fullPayload, 0);
  }
}

/**
 * Deliver to a single webhook with retry logic.
 */
async function deliverWithRetry(webhook, event, body, payload, attempt) {
  const signature = signPayload(body, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VoxBharat-Signature': signature,
        'X-VoxBharat-Event': event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    await recordDelivery(webhook.id, event, payload, response.status, response.ok);

    if (!response.ok && attempt < RETRY_DELAYS.length) {
      setTimeout(() => deliverWithRetry(webhook, event, body, payload, attempt + 1), RETRY_DELAYS[attempt]);
    }
  } catch (err) {
    console.error(`[Webhook] Delivery failed for ${webhook.url} (attempt ${attempt + 1}):`, err.message);
    await recordDelivery(webhook.id, event, payload, null, false).catch(() => {});

    if (attempt < RETRY_DELAYS.length) {
      setTimeout(() => deliverWithRetry(webhook, event, body, payload, attempt + 1), RETRY_DELAYS[attempt]);
    }
  }
}
