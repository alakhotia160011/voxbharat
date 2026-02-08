// In-memory call state + JSON file persistence (no native deps)
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, 'call-results.json');

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
    status: 'initiating',
    twilioCallSid: null,
    streamSid: null,
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
    c => !['saved', 'failed'].includes(c.status)
  );
}

/**
 * Remove a call from active memory (after saving)
 */
export function removeCall(id) {
  activeCalls.delete(id);
}

/**
 * Save completed call data to JSON file
 */
export function saveCallToFile(call) {
  if (!call.extractedData) return;

  const duration = call.connectedAt && call.endedAt
    ? Math.round((new Date(call.endedAt) - new Date(call.connectedAt)) / 1000)
    : null;

  const record = {
    id: call.id,
    timestamp: call.startedAt,
    duration,
    language: call.detectedLanguage || call.language,
    autoDetectLanguage: call.autoDetectLanguage || false,
    status: 'completed',
    summary: call.extractedData.summary || '',
    transcript: call.transcript,
    demographics: call.extractedData.demographics || null,
    structured: call.extractedData.structured || null,
    sentiment: call.extractedData.sentiment || null,
  };

  // Read existing data
  let existing = [];
  if (existsSync(DATA_FILE)) {
    try {
      existing = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  existing.push(record);
  writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
  return call.id;
}
