import { describe, it, expect } from 'vitest';
import {
  getVoiceName,
  LANGUAGE_MAP,
  generateCustomGreeting,
  getVoicemailMessage,
} from '../survey-scripts.js';

describe('LANGUAGE_MAP', () => {
  it('has all 10 supported languages', () => {
    const expected = ['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'en'];
    for (const lang of expected) {
      expect(LANGUAGE_MAP[lang]).toBeDefined();
    }
  });

  it('maps codes to full names', () => {
    expect(LANGUAGE_MAP.hi).toBe('Hindi');
    expect(LANGUAGE_MAP.en).toBe('English');
    expect(LANGUAGE_MAP.bn).toBe('Bengali');
  });
});

describe('getVoiceName', () => {
  it('returns correct voice for language + gender', () => {
    expect(getVoiceName('en', 'female')).toBe('Ananya');
    expect(getVoiceName('en', 'male')).toBe('Devansh');
  });

  it('falls back to English voice for unknown language', () => {
    const name = getVoiceName('xx', 'female');
    expect(name).toBe('Ananya'); // en_female fallback
  });

  it('falls back to Kiara for completely unknown combo', () => {
    // When even en_<gender> doesn't match
    const name = getVoiceName('xx', 'unknown');
    expect(name).toBe('Kiara');
  });

  it('returns Hindi voices', () => {
    // Hindi voices are in Devanagari
    const female = getVoiceName('hi', 'female');
    const male = getVoiceName('hi', 'male');
    expect(female).toBeDefined();
    expect(male).toBeDefined();
    expect(female).not.toBe(male);
  });
});

describe('generateCustomGreeting', () => {
  it('returns a non-empty string', () => {
    const greeting = generateCustomGreeting('en', 'female', 'Customer Feedback', 'Acme Corp', 'product satisfaction');
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('includes company name in greeting', () => {
    const greeting = generateCustomGreeting('en', 'female', 'Test Survey', 'TestCo', 'feedback');
    expect(greeting).toContain('TestCo');
  });

  it('works for Hindi', () => {
    const greeting = generateCustomGreeting('hi', 'female', 'Survey', 'TestCo', 'feedback');
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(0);
  });
});

describe('getVoicemailMessage', () => {
  it('returns a non-empty string for English', () => {
    const msg = getVoicemailMessage('en', 'female', 'Customer Survey', 'Acme Corp', 'product feedback');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('includes company name', () => {
    const msg = getVoicemailMessage('en', 'female', 'Survey', 'TestCo', 'feedback');
    expect(msg).toContain('TestCo');
  });

  it('includes Ananya for English', () => {
    const msg = getVoicemailMessage('en', 'female', 'Survey', 'TestCo', 'feedback');
    expect(msg).toContain('Ananya');
  });

  it('works for all supported languages', () => {
    const languages = Object.keys(LANGUAGE_MAP);
    for (const lang of languages) {
      const msg = getVoicemailMessage(lang, 'female', 'Survey', 'TestCo', 'feedback');
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(10);
    }
  });
});
