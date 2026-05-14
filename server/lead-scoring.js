/**
 * Lead scoring — computes a weighted score from success metric results.
 *
 * @param {Object} customMetrics - Extraction results keyed by normalized metric name
 *   e.g. { "budget_confirmed": { pass: true, reason: "..." }, "decision_maker": { pass: false, reason: "..." } }
 * @param {Array} successMetrics - Survey config metrics
 *   e.g. [{ name: "Budget Confirmed", prompt: "...", weight: 5 }, ...]
 * @returns {number|null} Score 0-100, or null if no metrics to evaluate
 */
export function computeLeadScore(customMetrics = {}, successMetrics = []) {
  if (successMetrics.length === 0 || Object.keys(customMetrics).length === 0) {
    return null;
  }

  let weightedScore = 0;
  let totalWeight = 0;

  for (const metric of successMetrics) {
    if (!metric.name || !metric.prompt) continue;
    const key = normalizeMetricKey(metric.name);
    const weight = metric.weight || 3;
    totalWeight += weight;
    if (customMetrics[key]?.pass) {
      weightedScore += weight;
    }
  }

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null;
}

/**
 * Normalizes a metric name to a snake_case key for matching extraction results.
 * e.g. "Budget Confirmed!" → "budget_confirmed"
 */
export function normalizeMetricKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
