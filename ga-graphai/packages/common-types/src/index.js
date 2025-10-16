/**
 * Shared value-density and governance helpers for the Maestro Conductor stack.
 * The module intentionally exposes runtime helpers instead of compile-time types
 * so that downstream packages can enforce policy and budget guardrails without
 * relying on a build step. JSDoc typedefs are provided for editor support.
 */

/**
 * @typedef {Object} CostEstimate
 * @property {string} unit - billing unit (e.g. `usd/1kTok`).
 * @property {number} estimate - expected unit cost.
 */

/**
 * @typedef {Object} LatencyDistribution
 * @property {number} p50
 * @property {number} p95
 */

/**
 * @typedef {Object} CandidateResource
 * @property {string} id
 * @property {"model"|"runtime"|"hardware"} kind
 * @property {string[]} skills
 * @property {string} ckpt
 * @property {number} contextTokens
 * @property {CostEstimate} cost
 * @property {LatencyDistribution} latencyMs
 * @property {"A"|"B"|"C"} safetyTier
 * @property {string} licenseClass
 * @property {string} residency
 * @property {{ pii?: boolean }} constraints
 */

/**
 * @typedef {Object} DecisionRecord
 * @property {string} taskId
 * @property {{ id: string, V: number }[]} arms
 * @property {string} chosen
 * @property {{ quality: number, lat: number, cost: number }} pred
 * @property {{ quality: number, lat: number, cost: number }} actual
 * @property {string} provenanceUri
 * @property {number} budgetDeltaUSD
 */

export const RESOURCE_KINDS = Object.freeze({
  MODEL: 'model',
  RUNTIME: 'runtime',
  HARDWARE: 'hardware',
});

export const SAFETY_TIERS = Object.freeze({ A: 'A', B: 'B', C: 'C' });

export const LICENSE_CLASSES = Object.freeze({
  MIT_OK: 'MIT-OK',
  OPEN_DATA_OK: 'Open-Data-OK',
  RESTRICTED_TOS: 'Restricted-TOS',
});

export const ZERO_SPEND_OPTIMIZATIONS = Object.freeze({
  KV_CACHE: 'kvCache',
  MEMOIZATION: 'memo',
  QUANTIZATION: 'quant',
  SPECULATIVE_DECODE: 'specDecode',
  BATCHING: 'batching',
  VLLM: 'vLLM',
  LORA: 'LoRA',
});

/**
 * Clamp a value between min and max.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * Compute value-density given expected quality, coverage, cost and latency.
 * When either cost or latency is zero/negative the density collapses to 0 to
 * preserve safety.
 *
 * @param {{ quality: number, coverage: number, cost: number, latency: number }} metrics
 * @returns {number}
 */
export function computeValueDensity(metrics) {
  const quality = clamp(metrics.quality ?? 0, 0, 1);
  const coverage = clamp(metrics.coverage ?? 1, 0, 1);
  const cost = metrics.cost ?? 0;
  const latency = metrics.latency ?? 0;
  if (cost <= 0 || latency <= 0) {
    return 0;
  }
  return (quality * coverage) / (cost * latency);
}

/**
 * Compute a percentile from a numeric sample using linear interpolation.
 *
 * @param {number[]} values
 * @param {number} percentileValue - e.g. 0.95 for p95
 * @returns {number}
 */
export function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(percentileValue, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Update an exponential moving average.
 *
 * @param {number} current
 * @param {number} observation
 * @param {number} alpha - smoothing factor between 0 and 1
 * @returns {number}
 */
export function updateEma(current, observation, alpha = 0.3) {
  if (!Number.isFinite(observation)) {
    return current;
  }
  if (!Number.isFinite(current)) {
    return observation;
  }
  return alpha * observation + (1 - alpha) * current;
}

/**
 * Create a normalized decision record.
 *
 * @param {DecisionRecord} payload
 * @returns {DecisionRecord}
 */
export function createDecisionRecord(payload) {
  const arms = Array.isArray(payload.arms)
    ? payload.arms.map((arm) => ({ id: String(arm.id), V: Number(arm.V) }))
    : [];
  return Object.freeze({
    taskId: String(payload.taskId),
    arms,
    chosen: String(payload.chosen),
    pred: {
      quality: Number(payload.pred?.quality ?? 0),
      lat: Number(payload.pred?.lat ?? 0),
      cost: Number(payload.pred?.cost ?? 0),
    },
    actual: {
      quality: Number(payload.actual?.quality ?? 0),
      lat: Number(payload.actual?.lat ?? 0),
      cost: Number(payload.actual?.cost ?? 0),
    },
    provenanceUri: String(payload.provenanceUri ?? ''),
    budgetDeltaUSD: Number(payload.budgetDeltaUSD ?? 0),
  });
}

/**
 * Compute a monthly budget snapshot for observability dashboards.
 *
 * @param {{ baselineMonthlyUSD: number, consumedUSD: number, timestamp?: Date }} input
 * @returns {{ baselineMonthlyUSD: number, consumedUSD: number, headroomPct: number, burnRateUSDPerDay: number, forecastUSD: number }}
 */
export function createBudgetSnapshot(input) {
  const baseline = Math.max(0, Number(input.baselineMonthlyUSD ?? 0));
  const consumed = Math.max(0, Number(input.consumedUSD ?? 0));
  const now = input.timestamp instanceof Date ? input.timestamp : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(1, (now - startOfMonth) / (1000 * 60 * 60 * 24));
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const burnRate = consumed / daysElapsed;
  const forecast = burnRate * daysInMonth;
  const headroomPct = baseline > 0 ? clamp(1 - forecast / baseline, 0, 1) : 1;
  return {
    baselineMonthlyUSD: baseline,
    consumedUSD: consumed,
    headroomPct,
    burnRateUSDPerDay: burnRate,
    forecastUSD: forecast,
  };
}

/**
 * Build a deterministic cache key for prompts/tasks.
 *
 * @param {string} promptHash
 * @param {string} policyVersion
 * @returns {string}
 */
export function buildMemoCacheKey(promptHash, policyVersion) {
  return `${promptHash}::${policyVersion}`;
}

/**
 * Compute aggregate coverage from per-arm contributions. Values are clamped
 * between 0 and 1 to simplify comparisons across heterogeneous tasks.
 *
 * @param {number[]} contributions
 * @returns {number}
 */
export function aggregateCoverage(contributions) {
  if (!Array.isArray(contributions) || contributions.length === 0) {
    return 0;
  }
  const total = contributions.reduce(
    (acc, value) => acc + clamp(value, 0, 1),
    0,
  );
  return clamp(total / contributions.length, 0, 1);
}

/**
 * Normalize latency metrics to guard against pathological readings.
 *
 * @param {LatencyDistribution} latency
 * @returns {LatencyDistribution}
 */
export function normalizeLatency(latency) {
  const p50 = Number(latency?.p50 ?? 0);
  const p95 = Number(latency?.p95 ?? 0);
  if (p95 < p50) {
    return { p50, p95: p50 };
  }
  return { p50, p95 };
}
