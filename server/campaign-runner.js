// Campaign runner — in-memory queue that orchestrates batch calls
// Uses existing initiateCall logic, respects Cartesia TTS concurrency limit

import {
  getCampaignById, updateCampaignStatus, updateCampaignProgress,
  getNextPendingNumbers, updateCampaignNumberStatus, getProgressCounts,
  resetCallingNumbers, getRunningCampaigns, requeueNumberForRetry,
} from './db.js';

// Call timing windows in IST (UTC+5:30)
const TIME_WINDOWS = {
  morning:   { start: 8, end: 12 },   // 8am – 12pm
  afternoon: { start: 12, end: 17 },  // 12pm – 5pm
  evening:   { start: 17, end: 21 },  // 5pm – 9pm
};

function getISTHour() {
  const now = new Date();
  // IST = UTC + 5:30
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMs);
  return ist.getUTCHours() + ist.getUTCMinutes() / 60;
}

function isWithinCallWindow(callTiming) {
  const windows = Array.isArray(callTiming) ? callTiming : ['morning', 'afternoon', 'evening'];
  const hour = getISTHour();
  return windows.some(w => {
    const win = TIME_WINDOWS[w];
    return win && hour >= win.start && hour < win.end;
  });
}

function msUntilNextWindow(callTiming) {
  const windows = Array.isArray(callTiming) ? callTiming : ['morning', 'afternoon', 'evening'];
  const hour = getISTHour();

  // Find the next window start that's after current time
  const starts = windows
    .map(w => TIME_WINDOWS[w]?.start)
    .filter(s => s !== undefined)
    .sort((a, b) => a - b);

  for (const start of starts) {
    if (hour < start) {
      return (start - hour) * 60 * 60 * 1000;
    }
  }

  // All windows are past today — next window is tomorrow's first window
  const firstStart = starts[0] || 8;
  return (24 - hour + firstStart) * 60 * 60 * 1000;
}

// Statuses that are eligible for retry
const RETRYABLE_STATUSES = ['no_answer', 'failed', 'voicemail'];

export class CampaignRunner {
  constructor({ initiateCallFn, getActiveCallsFn }) {
    this.initiateCall = initiateCallFn;
    this.getActiveCalls = getActiveCallsFn;
    this.activeCampaigns = new Map(); // campaignId -> { config, activeCallIds: Set, isPaused }
    this._timers = new Map(); // campaignId -> timeout ID (for scheduling)
  }

  /**
   * Called on server startup — pauses any campaigns that were running when server stopped.
   */
  async init() {
    const running = await getRunningCampaigns();
    for (const row of running) {
      await updateCampaignStatus(row.id, 'paused');
      await resetCallingNumbers(row.id);
      console.log(`[Campaign] ${row.id} was running at shutdown — paused for manual resume`);
    }
  }

  /**
   * Start or resume a campaign.
   */
  async startCampaign(campaignId) {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (!['pending', 'paused'].includes(campaign.status)) {
      throw new Error(`Cannot start campaign with status: ${campaign.status}`);
    }

    await updateCampaignStatus(campaignId, 'running');

    this.activeCampaigns.set(campaignId, {
      config: campaign,
      activeCallIds: new Set(),
      isPaused: false,
    });

    console.log(`[Campaign] ${campaignId} started (concurrency: ${campaign.concurrency}, retries: ${campaign.max_retries}, timing: ${JSON.stringify(campaign.call_timing)})`);
    this._processQueue(campaignId);
  }

  /**
   * Pause a campaign — stops initiating new calls, lets active ones finish.
   */
  async pauseCampaign(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) state.isPaused = true;
    this._clearTimer(campaignId);

    await updateCampaignStatus(campaignId, 'paused');
    console.log(`[Campaign] ${campaignId} paused`);
  }

  /**
   * Cancel a campaign — stops everything.
   */
  async cancelCampaign(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) state.isPaused = true;
    this._clearTimer(campaignId);

    await updateCampaignStatus(campaignId, 'cancelled');
    this.activeCampaigns.delete(campaignId);
    console.log(`[Campaign] ${campaignId} cancelled`);
  }

  /**
   * Called when a campaign call completes — updates state, retries if needed, processes next.
   */
  async onCallCompleted(callId, campaignId, status) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) {
      state.activeCallIds.delete(callId);
    }

    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      if (!pool) return;

      // Get the campaign_numbers row for this call
      const { rows } = await pool.query(
        'SELECT id, attempts FROM campaign_numbers WHERE call_id = $1', [callId]
      );
      const numRow = rows[0];

      // Update status
      await pool.query(`
        UPDATE campaign_numbers SET status = $1, completed_at = NOW()
        WHERE call_id = $2
      `, [status, callId]);

      // Retry logic: if retryable and under max retries, requeue
      if (numRow && RETRYABLE_STATUSES.includes(status)) {
        const maxRetries = state?.config?.max_retries ?? 3;
        if (numRow.attempts < maxRetries) {
          await requeueNumberForRetry(numRow.id, 30);
          console.log(`[Campaign] ${campaignId} — ${status} for call ${callId}, requeued for retry (attempt ${numRow.attempts}/${maxRetries}, next in 30min)`);
        }
      }

      await this._updateProgress(campaignId);

      const done = await this._checkCompletion(campaignId);
      if (!done) {
        this._processQueue(campaignId);
      }
    } catch (err) {
      console.error(`[Campaign] Error handling call completion for ${callId}:`, err.message);
    }
  }

  /**
   * Main queue processor — initiates calls up to concurrency limit.
   * Respects call timing windows (IST).
   */
  async _processQueue(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (!state || state.isPaused) return;

    // Check call timing window
    const callTiming = state.config.call_timing;
    if (!isWithinCallWindow(callTiming)) {
      const waitMs = msUntilNextWindow(callTiming);
      const waitMin = Math.round(waitMs / 60000);
      console.log(`[Campaign] ${campaignId} — outside call window, waiting ${waitMin}min`);
      this._clearTimer(campaignId);
      this._timers.set(campaignId, setTimeout(() => this._processQueue(campaignId), Math.min(waitMs, 60 * 60 * 1000)));
      return;
    }

    // Enforce global Cartesia TTS limit of 2 concurrent calls
    const globalActive = this.getActiveCalls().length;
    const globalSlots = Math.max(0, 2 - globalActive);
    if (globalSlots === 0) {
      setTimeout(() => this._processQueue(campaignId), 3000);
      return;
    }

    const campaignSlots = state.config.concurrency - state.activeCallIds.size;
    const slotsToFill = Math.min(globalSlots, campaignSlots);
    if (slotsToFill <= 0) return;

    const pendingNumbers = await getNextPendingNumbers(campaignId, slotsToFill);
    if (pendingNumbers.length === 0) {
      // No ready numbers — might have pending retries not yet due
      const counts = await getProgressCounts(campaignId);
      if (counts.pending > 0) {
        // There are pending numbers but they're waiting on retry_after — check again in 60s
        this._clearTimer(campaignId);
        this._timers.set(campaignId, setTimeout(() => this._processQueue(campaignId), 60000));
        return;
      }
      await this._checkCompletion(campaignId);
      return;
    }

    for (let i = 0; i < pendingNumbers.length; i++) {
      const num = pendingNumbers[i];
      if (state.isPaused) break;

      try {
        await updateCampaignNumberStatus(num.id, 'calling', null, null);

        const result = await this.initiateCall({
          phoneNumber: num.phone_number,
          language: state.config.language,
          gender: state.config.gender,
          customSurvey: state.config.survey_config,
          autoDetectLanguage: state.config.auto_detect_language,
          campaignId: campaignId,
        });

        state.activeCallIds.add(result.callId);
        await updateCampaignNumberStatus(num.id, 'calling', result.callId, null);

        const retryNote = num.attempts > 0 ? ` (retry #${num.attempts})` : '';
        console.log(`[Campaign] ${campaignId} — called ${num.phone_number}${retryNote} (call: ${result.callId})`);

        await this._updateProgress(campaignId);

        if (i < pendingNumbers.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`[Campaign] ${campaignId} — failed to call ${num.phone_number}:`, err.message);
        await updateCampaignNumberStatus(num.id, 'failed', null, err.message);
        await this._updateProgress(campaignId);
      }
    }
  }

  /**
   * Update progress counts in the campaigns table.
   */
  async _updateProgress(campaignId) {
    try {
      const counts = await getProgressCounts(campaignId);
      await updateCampaignProgress(campaignId, counts);
    } catch (err) {
      console.error(`[Campaign] Error updating progress for ${campaignId}:`, err.message);
    }
  }

  /**
   * Check if all numbers have been processed — if so, mark campaign as completed.
   */
  async _checkCompletion(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    const counts = await getProgressCounts(campaignId);

    if (counts.pending === 0 && counts.calling === 0) {
      this._clearTimer(campaignId);
      await updateCampaignStatus(campaignId, 'completed');
      this.activeCampaigns.delete(campaignId);
      console.log(`[Campaign] ${campaignId} completed — ${counts.completed} completed, ${counts.failed} failed, ${counts.no_answer} no answer, ${counts.voicemail || 0} voicemail`);
      return true;
    }

    if (counts.pending === 0 && state && state.activeCallIds.size > 0) {
      return false;
    }

    return false;
  }

  _clearTimer(campaignId) {
    const timer = this._timers.get(campaignId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(campaignId);
    }
  }
}
