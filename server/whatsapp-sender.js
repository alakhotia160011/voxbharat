// SMS reminder sender — uses Twilio to send SMS before campaign calls
import {
  createWhatsAppReminders, getNextPendingReminders,
  updateReminderStatus, getReminderProgress,
} from './db.js';

const DEFAULT_RATE_MS = 1000; // 1 message/second

// Opt-out keywords (case-insensitive). Covers English + Hindi common responses.
const OPT_OUT_KEYWORDS = [
  'stop', 'no', 'cancel', 'unsubscribe', 'opt out', 'optout',
  'nahi', 'nahin', 'nhin', 'mat karo', 'band karo', 'rukh',
  'don\'t call', 'do not call',
];

export function isOptOutMessage(text) {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw));
}

export class WhatsAppSender {
  constructor(twilioClient, fromNumber, options = {}) {
    this.twilio = twilioClient;
    this.from = fromNumber;
    this.rateMs = DEFAULT_RATE_MS;
    this.statusCallbackUrl = options.statusCallbackUrl || null;
  }

  /**
   * Interpolate {placeholders} in the message template.
   * Supported: {company}, {topic}, {duration}, {name}, {calling_number}
   */
  interpolateMessage(template, vars = {}) {
    return template
      .replace(/\{company\}/gi, vars.company || 'VoxBharat')
      .replace(/\{topic\}/gi, vars.topic || 'a brief survey')
      .replace(/\{duration\}/gi, vars.duration || '2-3')
      .replace(/\{name\}/gi, vars.name || '')
      .replace(/\{calling_number\}/gi, vars.callingNumber || '');
  }

  /**
   * Send a single SMS message.
   * Returns { sid, status } on success, throws on failure.
   */
  async sendMessage(toPhone, body) {
    const params = {
      from: this.from,
      to: toPhone,
      body,
    };
    if (this.statusCallbackUrl) {
      params.statusCallback = this.statusCallbackUrl;
    }
    const msg = await this.twilio.messages.create(params);
    return { sid: msg.sid, status: msg.status };
  }

  /**
   * Send all pending reminders for a campaign (batch mode).
   * Creates reminder rows if they don't exist, then sends them with rate limiting.
   * Returns { sent, failed, total }.
   */
  async sendBatch(campaignId, messageTemplate, templateVars = {}) {
    await createWhatsAppReminders(campaignId);
    const progress = await getReminderProgress(campaignId);
    const total = Object.values(progress).reduce((a, b) => a + b, 0);

    let sent = 0;
    let failed = 0;
    let batch;

    while ((batch = await getNextPendingReminders(campaignId, 10)) && batch.length > 0) {
      for (const reminder of batch) {
        const body = this.interpolateMessage(messageTemplate, templateVars);
        try {
          const result = await this.sendMessage(reminder.phone_number, body);
          await updateReminderStatus(reminder.id, 'sent', result.sid, null);
          sent++;
        } catch (err) {
          console.error(`[SMS] Failed to send to ${reminder.phone_number}:`, err.message);
          await updateReminderStatus(reminder.id, 'failed', null, err.message);
          failed++;
        }

        await new Promise(r => setTimeout(r, this.rateMs));
      }
    }

    console.log(`[SMS] Campaign ${campaignId}: ${sent} sent, ${failed} failed out of ${total}`);
    return { sent, failed, total };
  }

  /**
   * Send a single reminder for a specific campaign number (staggered mode).
   * Creates the reminder row and sends immediately.
   * Returns true if sent, false if failed.
   */
  async sendSingleReminder(campaignId, campaignNumberId, phoneNumber, messageTemplate, templateVars = {}) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    if (!pool) return false;

    const { rows } = await pool.query(`
      INSERT INTO whatsapp_reminders (campaign_id, campaign_number_id, phone_number)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [campaignId, campaignNumberId, phoneNumber]);

    if (rows.length === 0) return false;

    const reminderId = rows[0].id;
    const body = this.interpolateMessage(messageTemplate, templateVars);

    try {
      const result = await this.sendMessage(phoneNumber, body);
      await updateReminderStatus(reminderId, 'sent', result.sid, null);
      console.log(`[SMS] Sent reminder to ${phoneNumber} (campaign ${campaignId})`);
      return true;
    } catch (err) {
      console.error(`[SMS] Failed to send to ${phoneNumber}:`, err.message);
      await updateReminderStatus(reminderId, 'failed', null, err.message);
      return false;
    }
  }
}
