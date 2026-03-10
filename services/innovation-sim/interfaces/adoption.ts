/**
 * Adoption Curve Types and Interfaces
 *
 * Models technology adoption patterns using S-curve dynamics,
 * maturity phase classification, and momentum scoring.
 */

export type MaturityPhase =
  | "nascent"       // 0-5% adoption, experimental
  | "emerging"      // 5-15% adoption, early adopters
  | "growth"        // 15-50% adoption, rapid expansion
  | "mature"        // 50-85% adoption, mainstream
  | "declining"     // 85-100% adoption, being replaced
  | "unknown";      // insufficient data

export interface AdoptionSignal {
  timestamp: string;
  metric: "commit_count" | "contributor_count" | "dependency_count" | "mention_count" | "download_count";
  value: number;
  source: string;
  confidence: number;
}

export interface AdoptionCurveParams {
  L: number;  // Maximum adoption (carrying capacity)
  k: number;  // Growth rate
  t0: number; // Inflection point (time when adoption = L/2)
}

export interface AdoptionEstimate {
  nodeId: string;
  phase: MaturityPhase;
  adoptionRate: number;        // Current % adoption (0.0 - 1.0)
  curveParams?: AdoptionCurveParams;
  momentum: number;            // Rate of change (-1.0 to +1.0)
  velocity: number;            // First derivative of adoption
  acceleration: number;        // Second derivative of adoption
  signals: AdoptionSignal[];
  estimatedAt: string;
  confidence: number;
}

export interface MomentumScore {
  overall: number;             // Composite momentum (-1.0 to +1.0)
  components: {
    velocity: number;          // Speed of adoption change
    acceleration: number;      // Acceleration of adoption
    recency: number;          // Recency-weighted activity
    diversity: number;        // Diversity of adoption signals
  };
  confidence: number;
}

/**
 * S-Curve (Logistic Function)
 *
 * f(t) = L / (1 + e^(-k(t - t0)))
 *
 * Where:
 * - L: Maximum adoption (carrying capacity)
 * - k: Growth rate (steepness)
 * - t0: Inflection point (midpoint)
 * - t: Time
 */
export function evaluateAdoptionCurve(t: number, params: AdoptionCurveParams): number {
  const { L, k, t0 } = params;
  return L / (1 + Math.exp(-k * (t - t0)));
}

/**
 * First derivative of S-curve (velocity)
 *
 * f'(t) = (L * k * e^(-k(t - t0))) / (1 + e^(-k(t - t0)))^2
 */
export function evaluateAdoptionVelocity(t: number, params: AdoptionCurveParams): number {
  const { L, k, t0 } = params;
  const exp_term = Math.exp(-k * (t - t0));
  return (L * k * exp_term) / Math.pow(1 + exp_term, 2);
}

/**
 * Second derivative of S-curve (acceleration)
 *
 * f''(t) = (L * k^2 * e^(-k(t - t0)) * (e^(-k(t - t0)) - 1)) / (1 + e^(-k(t - t0)))^3
 */
export function evaluateAdoptionAcceleration(t: number, params: AdoptionCurveParams): number {
  const { L, k, t0 } = params;
  const exp_term = Math.exp(-k * (t - t0));
  return (L * Math.pow(k, 2) * exp_term * (exp_term - 1)) / Math.pow(1 + exp_term, 3);
}

/**
 * Classify maturity phase based on adoption rate
 */
export function classifyMaturityPhase(adoptionRate: number): MaturityPhase {
  if (adoptionRate < 0 || adoptionRate > 1) return "unknown";

  if (adoptionRate < 0.05) return "nascent";
  if (adoptionRate < 0.15) return "emerging";
  if (adoptionRate < 0.50) return "growth";
  if (adoptionRate < 0.85) return "mature";
  return "declining";
}

/**
 * Calculate momentum score from adoption signals
 */
export function calculateMomentum(signals: AdoptionSignal[], currentTime: number): MomentumScore {
  if (signals.length === 0) {
    return {
      overall: 0,
      components: { velocity: 0, acceleration: 0, recency: 0, diversity: 0 },
      confidence: 0
    };
  }

  // Sort signals by timestamp
  const sorted = [...signals].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate velocity (linear regression slope)
  const times = sorted.map(s => new Date(s.timestamp).getTime());
  const values = sorted.map(s => s.value);
  const velocity = linearRegressionSlope(times, values);

  // Calculate acceleration (second derivative approximation)
  const acceleration = sorted.length >= 3
    ? secondDerivativeApprox(times, values)
    : 0;

  // Calculate recency score (exponential decay)
  const recency = sorted.reduce((sum, signal) => {
    const age = (currentTime - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60 * 24); // days
    const weight = Math.exp(-age / 30); // 30-day half-life
    return sum + (signal.value * weight);
  }, 0) / sorted.length;

  // Calculate diversity (unique metric types)
  const uniqueMetrics = new Set(sorted.map(s => s.metric)).size;
  const diversity = uniqueMetrics / 5; // 5 possible metric types

  // Composite momentum (weighted average)
  const overall = (
    0.4 * normalizeScore(velocity) +
    0.3 * normalizeScore(acceleration) +
    0.2 * normalizeScore(recency) +
    0.1 * diversity
  );

  // Confidence based on signal count and diversity
  const confidence = Math.min(1.0, (sorted.length / 10) * diversity);

  return {
    overall: clamp(overall, -1, 1),
    components: {
      velocity: normalizeScore(velocity),
      acceleration: normalizeScore(acceleration),
      recency: normalizeScore(recency),
      diversity
    },
    confidence
  };
}

/**
 * Linear regression slope (for velocity estimation)
 */
function linearRegressionSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return isNaN(slope) ? 0 : slope;
}

/**
 * Second derivative approximation (for acceleration)
 */
function secondDerivativeApprox(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  // Use central difference for middle points
  const mid = Math.floor(n / 2);
  const h = x[mid] - x[mid - 1];

  if (h === 0) return 0;

  const secondDeriv = (y[mid + 1] - 2 * y[mid] + y[mid - 1]) / (h * h);
  return isNaN(secondDeriv) ? 0 : secondDeriv;
}

/**
 * Normalize score to [-1, 1] range using tanh
 */
function normalizeScore(value: number): number {
  return Math.tanh(value);
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
