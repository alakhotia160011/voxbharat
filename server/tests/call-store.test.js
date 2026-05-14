import { describe, it, expect, beforeEach } from 'vitest';
import { createCall, getCall, updateCall, getActiveCalls, removeCall, getCallByTwilioSid, getCallByStreamSid } from '../call-store.js';

// Note: call-store uses an in-memory Map, so tests are naturally isolated
// as long as we clean up. Each createCall generates a new UUID.

describe('createCall', () => {
  it('creates a call with default values', () => {
    const call = createCall();
    expect(call.id).toBeDefined();
    expect(call.language).toBe('hi');
    expect(call.gender).toBe('female');
    expect(call.status).toBe('initiating');
    expect(call.direction).toBe('outbound');
    expect(call.transcript).toEqual([]);
    expect(call.responses).toEqual([]);
    expect(call.extractedData).toBeNull();
    expect(call.startedAt).toBeDefined();

    // cleanup
    removeCall(call.id);
  });

  it('respects provided options', () => {
    const call = createCall({
      phoneNumber: '+919876543210',
      language: 'en',
      gender: 'male',
      direction: 'inbound',
      campaignId: 'camp-123',
      userId: 'user-456',
    });
    expect(call.phoneNumber).toBe('+919876543210');
    expect(call.language).toBe('en');
    expect(call.gender).toBe('male');
    expect(call.direction).toBe('inbound');
    expect(call.campaignId).toBe('camp-123');
    expect(call.userId).toBe('user-456');

    removeCall(call.id);
  });

  it('stores call in memory so getCall finds it', () => {
    const call = createCall({ phoneNumber: '+1234' });
    const found = getCall(call.id);
    expect(found).toBe(call);

    removeCall(call.id);
  });
});

describe('getCall', () => {
  it('returns null for unknown id', () => {
    expect(getCall('nonexistent-id')).toBeNull();
  });
});

describe('updateCall', () => {
  it('merges updates into existing call', () => {
    const call = createCall();
    updateCall(call.id, { status: 'connected', twilioCallSid: 'CA123' });
    const updated = getCall(call.id);
    expect(updated.status).toBe('connected');
    expect(updated.twilioCallSid).toBe('CA123');
    // original fields preserved
    expect(updated.language).toBe('hi');

    removeCall(call.id);
  });

  it('returns null for unknown id', () => {
    expect(updateCall('nonexistent', { status: 'x' })).toBeNull();
  });
});

describe('getCallByTwilioSid', () => {
  it('finds call by Twilio SID', () => {
    const call = createCall();
    updateCall(call.id, { twilioCallSid: 'CA_TEST_123' });

    const found = getCallByTwilioSid('CA_TEST_123');
    expect(found.id).toBe(call.id);

    removeCall(call.id);
  });

  it('returns null for unknown SID', () => {
    expect(getCallByTwilioSid('CA_UNKNOWN')).toBeNull();
  });
});

describe('getCallByStreamSid', () => {
  it('finds call by stream SID', () => {
    const call = createCall();
    updateCall(call.id, { streamSid: 'MZ_TEST_456' });

    const found = getCallByStreamSid('MZ_TEST_456');
    expect(found.id).toBe(call.id);

    removeCall(call.id);
  });
});

describe('getActiveCalls', () => {
  it('excludes saved/failed/voicemail calls', () => {
    const active = createCall();
    const saved = createCall();
    const failed = createCall();
    const voicemail = createCall();

    updateCall(saved.id, { status: 'saved' });
    updateCall(failed.id, { status: 'failed' });
    updateCall(voicemail.id, { status: 'voicemail' });

    const activeCalls = getActiveCalls();
    const activeIds = activeCalls.map(c => c.id);

    expect(activeIds).toContain(active.id);
    expect(activeIds).not.toContain(saved.id);
    expect(activeIds).not.toContain(failed.id);
    expect(activeIds).not.toContain(voicemail.id);

    // cleanup
    removeCall(active.id);
    removeCall(saved.id);
    removeCall(failed.id);
    removeCall(voicemail.id);
  });
});

describe('removeCall', () => {
  it('removes call from memory', () => {
    const call = createCall();
    expect(getCall(call.id)).toBeDefined();
    removeCall(call.id);
    expect(getCall(call.id)).toBeNull();
  });
});
