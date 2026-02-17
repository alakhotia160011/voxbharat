// In-memory call state + Postgres persistence
import { v4 as uuidv4 } from 'uuid';
import { saveCall } from './db.js';

// Active calls stored in memory
const activeCalls = new Map();

/**
 * Create a new call record
 */
export function createCall(options = {}) {
  const id = uuidv4();
  const call = {
    id,
    phoneNumber: options.phoneNumber,
    language: options.language || 'hi',
    gender: options.gender || 'female',
    customSurvey: options.customSurvey || null,
    autoDetectLanguage: options.autoDetectLanguage || false,
    detectedLanguage: null,
    answeredBy: null,       // 'human' | 'machine_end_beep' | etc. (from Twilio AMD)
    voicemailLeft: false,   // true if voicemail message was played
    status: 'initiating',
    twilioCallSid: null,
    streamSid: null,
    recordingSid: null,
    recordingUrl: null,
    recordingDuration: null,
    startedAt: new Date().toISOString(),
    connectedAt: null,
    endedAt: null,
    transcript: [],
    responses: [],
    extractedData: null,
    error: null,
  };

  activeCalls.set(id, call);
  return call;
}

/**
 * Get a call by ID
 */
export function getCall(id) {
  return activeCalls.get(id) || null;
}

/**
 * Find a call by Twilio Call SID
 */
export function getCallByTwilioSid(twilioCallSid) {
  for (const call of activeCalls.values()) {
    if (call.twilioCallSid === twilioCallSid) return call;
  }
  return null;
}

/**
 * Find a call by Stream SID
 */
export function getCallByStreamSid(streamSid) {
  for (const call of activeCalls.values()) {
    if (call.streamSid === streamSid) return call;
  }
  return null;
}

/**
 * Update call state
 */
export function updateCall(id, updates) {
  const call = activeCalls.get(id);
  if (!call) return null;
  Object.assign(call, updates);
  return call;
}

/**
 * Get all active calls
 */
export function getActiveCalls() {
  return Array.from(activeCalls.values()).filter(
    c => !['saved', 'failed', 'voicemail', 'voicemail-failed'].includes(c.status)
  );
}

/**
 * Remove a call from active memory (after saving)
 */
export function removeCall(id) {
  activeCalls.delete(id);
}

/**
 * Save completed call data to Postgres
 */
export async function saveCallToFile(call) {
  return saveCall(call);
}
