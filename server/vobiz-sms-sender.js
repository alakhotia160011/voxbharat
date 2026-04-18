// SMS sender for India — uses Vobiz API instead of Twilio
// Same interface as WhatsAppSender for interchangeability

import {
  createWhatsAppReminders, getNextPendingReminders,
  updateReminderStatus, getReminderProgress,
} from './db.js';

const DEFAULT_RATE_MS = 1000; // 1 message/second

export class VobizSmsSender {
  constructor(vobizClient, fromNumber) {
    this.vobiz = vobizClient;
    this.from = fromNumber;
    this.rateMs = DEFAULT_RATE_MS;
  }

  /**
   * Interpolate {placeholders} in the message template.
   * Same logic as WhatsAppSender.interpolateMessage.
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
   * Send a single SMS message via Vobiz.
   */
  async sendMessage(toPhone, body) {
    const result = await this.vobiz.sendSms({
      from: this.from,
      to: toPhone,
      text: body,
    });
    return { sid: result.message_uuid?.[0] || result.api_id, status: 'sent' };
  }

  /**
   * Send all pending reminders for a campaign (batch mode).
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
          console.error(`[VobizSMS] Failed to send to ${reminder.phone_number}:`, err.message);
          await updateReminderStatus(reminder.id, 'failed', null, err.message);
          failed++;
        }

        await new Promise(r => setTimeout(r, this.rateMs));
      }
    }

    console.log(`[VobizSMS] Campaign ${campaignId}: ${sent} sent, ${failed} failed out of ${total}`);
    return { sent, failed, total };
  }

  /**
   * Send a single reminder for a specific campaign number (staggered mode).
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
      console.log(`[VobizSMS] Sent reminder to ${phoneNumber} (campaign ${campaignId})`);
      return true;
    } catch (err) {
      console.error(`[VobizSMS] Failed to send to ${phoneNumber}:`, err.message);
      await updateReminderStatus(reminderId, 'failed', null, err.message);
      return false;
    }
  }
}
