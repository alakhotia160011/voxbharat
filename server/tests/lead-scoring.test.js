import { describe, it, expect } from 'vitest';
import { computeLeadScore, normalizeMetricKey } from '../lead-scoring.js';

describe('normalizeMetricKey', () => {
  it('converts to lowercase snake_case', () => {
    expect(normalizeMetricKey('Budget Confirmed')).toBe('budget_confirmed');
  });

  it('strips special characters', () => {
    expect(normalizeMetricKey('Decision-Maker?')).toBe('decision_maker');
  });

  it('trims leading/trailing underscores', () => {
    expect(normalizeMetricKey('  Ready to Buy!  ')).toBe('ready_to_buy');
  });

  it('collapses multiple non-alphanumeric chars', () => {
    expect(normalizeMetricKey('Has---Budget???')).toBe('has_budget');
  });

  it('handles single word', () => {
    expect(normalizeMetricKey('Interested')).toBe('interested');
  });

  it('handles numbers', () => {
    expect(normalizeMetricKey('Score Above 80')).toBe('score_above_80');
  });
});

describe('computeLeadScore', () => {
  it('returns null when no success metrics defined', () => {
    expect(computeLeadScore({ foo: { pass: true } }, [])).toBeNull();
  });

  it('returns null when no custom metrics extracted', () => {
    const metrics = [{ name: 'Budget', prompt: 'Has budget?', weight: 3 }];
    expect(computeLeadScore({}, metrics)).toBeNull();
  });

  it('returns 100 when all metrics pass', () => {
    const customMetrics = {
      budget_confirmed: { pass: true, reason: 'yes' },
      decision_maker: { pass: true, reason: 'yes' },
    };
    const successMetrics = [
      { name: 'Budget Confirmed', prompt: 'Has budget?', weight: 3 },
      { name: 'Decision Maker', prompt: 'Is decision maker?', weight: 3 },
    ];
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(100);
  });

  it('returns 0 when no metrics pass', () => {
    const customMetrics = {
      budget_confirmed: { pass: false, reason: 'no' },
      decision_maker: { pass: false, reason: 'no' },
    };
    const successMetrics = [
      { name: 'Budget Confirmed', prompt: 'Has budget?', weight: 3 },
      { name: 'Decision Maker', prompt: 'Is decision maker?', weight: 3 },
    ];
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(0);
  });

  it('computes weighted score correctly', () => {
    const customMetrics = {
      budget_confirmed: { pass: true, reason: 'yes' },
      decision_maker: { pass: false, reason: 'no' },
    };
    const successMetrics = [
      { name: 'Budget Confirmed', prompt: 'Has budget?', weight: 5 },
      { name: 'Decision Maker', prompt: 'Is decision maker?', weight: 1 },
    ];
    // 5 / (5+1) * 100 = 83.33 → 83
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(83);
  });

  it('uses default weight of 3 when not specified', () => {
    const customMetrics = {
      interested: { pass: true, reason: 'yes' },
      timeline: { pass: false, reason: 'no' },
    };
    const successMetrics = [
      { name: 'Interested', prompt: 'Is interested?' },
      { name: 'Timeline', prompt: 'Has timeline?' },
    ];
    // 3 / (3+3) * 100 = 50
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(50);
  });

  it('skips metrics without name or prompt', () => {
    const customMetrics = {
      budget: { pass: true, reason: 'yes' },
    };
    const successMetrics = [
      { name: 'Budget', prompt: 'Has budget?', weight: 4 },
      { name: '', prompt: 'empty name', weight: 2 },
      { name: 'No Prompt', prompt: '', weight: 2 },
    ];
    // Only "Budget" counts: 4/4 * 100 = 100
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(100);
  });

  it('handles metric key not found in custom metrics', () => {
    const customMetrics = {
      something_else: { pass: true, reason: 'yes' },
    };
    const successMetrics = [
      { name: 'Budget', prompt: 'Has budget?', weight: 3 },
    ];
    // Key "budget" not in customMetrics → doesn't pass → 0/3 = 0
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(0);
  });

  it('handles mixed weights with partial pass', () => {
    const customMetrics = {
      high_value: { pass: true, reason: 'yes' },
      medium_value: { pass: false, reason: 'no' },
      low_value: { pass: true, reason: 'yes' },
    };
    const successMetrics = [
      { name: 'High Value', prompt: '...', weight: 5 },
      { name: 'Medium Value', prompt: '...', weight: 3 },
      { name: 'Low Value', prompt: '...', weight: 1 },
    ];
    // (5 + 1) / (5 + 3 + 1) * 100 = 66.67 → 67
    expect(computeLeadScore(customMetrics, successMetrics)).toBe(67);
  });
});
