// Campaign runner — in-memory queue that orchestrates batch calls
// Uses existing initiateCall logic, respects Cartesia TTS concurrency limit

import {
  getCampaignById, updateCampaignStatus, updateCampaignProgress,
  getNextPendingNumbers, updateCampaignNumberStatus, getProgressCounts,
  resetCallingNumbers, getRunningCampaigns,
} from './db.js';

export class CampaignRunner {
  constructor({ initiateCallFn, getActiveCallsFn }) {
    this.initiateCall = initiateCallFn;
    this.getActiveCalls = getActiveCallsFn;
    this.activeCampaigns = new Map(); // campaignId -> { config, activeCallIds: Set, isPaused }
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

    console.log(`[Campaign] ${campaignId} started (concurrency: ${campaign.concurrency})`);
    this._processQueue(campaignId);
  }

  /**
   * Pause a campaign — stops initiating new calls, lets active ones finish.
   */
  async pauseCampaign(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) state.isPaused = true;

    await updateCampaignStatus(campaignId, 'paused');
    console.log(`[Campaign] ${campaignId} paused`);
  }

  /**
   * Cancel a campaign — stops everything.
   */
  async cancelCampaign(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) state.isPaused = true;

    await updateCampaignStatus(campaignId, 'cancelled');
    this.activeCampaigns.delete(campaignId);
    console.log(`[Campaign] ${campaignId} cancelled`);
  }

  /**
   * Called when a campaign call completes — updates state and processes next in queue.
   */
  async onCallCompleted(callId, campaignId, status) {
    const state = this.activeCampaigns.get(campaignId);
    if (state) {
      state.activeCallIds.delete(callId);
    }

    // Find and update the campaign_numbers row for this call
    try {
      // Update by call_id since we know which number this was
      const { getPool } = await import('./db.js');
      const pool = getPool();
      if (pool) {
        await pool.query(`
          UPDATE campaign_numbers SET
            status = $1,
            completed_at = NOW()
          WHERE call_id = $2
        `, [status, callId]);
      }

      // Update progress counts
      await this._updateProgress(campaignId);

      // Check if campaign is done
      const done = await this._checkCompletion(campaignId);
      if (!done) {
        // Process next call in queue
        this._processQueue(campaignId);
      }
    } catch (err) {
      console.error(`[Campaign] Error handling call completion for ${callId}:`, err.message);
    }
  }

  /**
   * Main queue processor — initiates calls up to concurrency limit.
   */
  async _processQueue(campaignId) {
    const state = this.activeCampaigns.get(campaignId);
    if (!state || state.isPaused) return;

    // Enforce global Cartesia TTS limit of 2 concurrent calls
    const globalActive = this.getActiveCalls().length;
    const globalSlots = Math.max(0, 2 - globalActive);
    if (globalSlots === 0) {
      // No global slots — retry after a delay
      setTimeout(() => this._processQueue(campaignId), 3000);
      return;
    }

    // Calculate how many calls we can start
    const campaignSlots = state.config.concurrency - state.activeCallIds.size;
    const slotsToFill = Math.min(globalSlots, campaignSlots);

    if (slotsToFill <= 0) return;

    // Get pending numbers
    const pendingNumbers = await getNextPendingNumbers(campaignId, slotsToFill);
    if (pendingNumbers.length === 0) {
      // No more numbers to process — check completion
      await this._checkCompletion(campaignId);
      return;
    }

    // Initiate calls with 1-second delay between each (Twilio CPS limit)
    for (let i = 0; i < pendingNumbers.length; i++) {
      const num = pendingNumbers[i];

      // Re-check pause state before each call
      if (state.isPaused) break;

      try {
        // Mark number as calling
        await updateCampaignNumberStatus(num.id, 'calling', null, null);

        // Initiate the call
        const result = await this.initiateCall({
          phoneNumber: num.phone_number,
          language: state.config.language,
          gender: state.config.gender,
          customSurvey: state.config.survey_config,
          autoDetectLanguage: state.config.auto_detect_language,
          campaignId: campaignId,
        });

        // Track the call and link it to the campaign number
        state.activeCallIds.add(result.callId);
        await updateCampaignNumberStatus(num.id, 'calling', result.callId, null);

        console.log(`[Campaign] ${campaignId} — called ${num.phone_number} (call: ${result.callId})`);

        // Update progress
        await this._updateProgress(campaignId);

        // Wait 1 second between calls (Twilio rate limit)
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

    // Campaign is done when no pending or calling numbers remain
    if (counts.pending === 0 && counts.calling === 0) {
      await updateCampaignStatus(campaignId, 'completed');
      this.activeCampaigns.delete(campaignId);
      console.log(`[Campaign] ${campaignId} completed — ${counts.completed} completed, ${counts.failed} failed, ${counts.no_answer} no answer`);
      return true;
    }

    // If there are active calls but no pending, just wait for them to finish
    if (counts.pending === 0 && state && state.activeCallIds.size > 0) {
      return false;
    }

    return false;
  }
}
