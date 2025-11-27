/**
 * Differential Privacy Module
 *
 * Implements differential privacy mechanisms:
 * - Laplace mechanism for numeric queries
 * - Gaussian mechanism for approximate DP
 * - Exponential mechanism for categorical queries
 * - Privacy budget tracking and enforcement
 */

import type {
  DifferentialPrivacyConfig,
  PrivacyBudgetState,
  AggregateResultRow,
  AggregateQuery,
  AggregationType,
  PrivacyWarning,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Result of applying differential privacy to a result set
 */
export interface DPResult {
  rows: AggregateResultRow[];
  epsilonConsumed: number;
  deltaConsumed?: number;
  warnings: PrivacyWarning[];
  budgetExceeded: boolean;
}

/**
 * Sensitivity configuration for different aggregation types
 */
export interface SensitivityConfig {
  /** Default sensitivity for count queries */
  countSensitivity: number;
  /** Default sensitivity for sum queries (requires domain knowledge) */
  sumSensitivity: number;
  /** Default sensitivity for average queries */
  avgSensitivity: number;
  /** Custom sensitivities per field */
  fieldSensitivities: Record<string, number>;
}

/**
 * Budget tracking entry
 */
interface BudgetEntry {
  tenantId: string;
  userId?: string;
  totalBudget: number;
  spentBudget: number;
  queryCount: number;
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

export class DifferentialPrivacy {
  private budgetStore: Map<string, BudgetEntry> = new Map();
  private defaultSensitivity: SensitivityConfig;

  constructor(defaultSensitivity?: Partial<SensitivityConfig>) {
    this.defaultSensitivity = {
      countSensitivity: 1,
      sumSensitivity: 1,
      avgSensitivity: 1,
      fieldSensitivities: {},
      ...defaultSensitivity,
    };
  }

  /**
   * Apply differential privacy to query results
   */
  applyDP(
    rows: AggregateResultRow[],
    config: DifferentialPrivacyConfig,
    query: AggregateQuery,
    budgetState?: PrivacyBudgetState
  ): DPResult {
    const warnings: PrivacyWarning[] = [];

    // Calculate required epsilon for this query
    const requiredEpsilon = this.calculateQueryEpsilon(config, query);

    // Check budget if tracking is enabled
    if (config.budgetTracking && budgetState) {
      const remaining = budgetState.totalBudget - budgetState.spentBudget;
      if (requiredEpsilon > remaining) {
        warnings.push({
          code: 'BUDGET_EXCEEDED',
          message: `Privacy budget exceeded. Required: ${requiredEpsilon.toFixed(4)}, Remaining: ${remaining.toFixed(4)}`,
          severity: 'error',
        });
        return {
          rows: [],
          epsilonConsumed: 0,
          warnings,
          budgetExceeded: true,
        };
      }
    }

    // Apply noise to each row
    const noisyRows = rows.map(row => this.addNoiseToRow(row, config, query));

    // Warn about noise impact
    if (rows.length > 0) {
      const avgNoise = this.estimateAverageNoise(config, query);
      warnings.push({
        code: 'DP_NOISE_APPLIED',
        message: `Differential privacy noise applied (ε=${config.epsilon}). Expected noise magnitude: ±${avgNoise.toFixed(2)}`,
        severity: 'info',
      });
    }

    return {
      rows: noisyRows,
      epsilonConsumed: requiredEpsilon,
      deltaConsumed: config.delta,
      warnings,
      budgetExceeded: false,
    };
  }

  /**
   * Add noise to a single result row
   */
  private addNoiseToRow(
    row: AggregateResultRow,
    config: DifferentialPrivacyConfig,
    query: AggregateQuery
  ): AggregateResultRow {
    const noisyMeasures: Record<string, number | null> = {};

    for (const measure of query.measures) {
      const key = measure.alias || measure.field;
      const originalValue = row.measures[key];

      if (originalValue === null) {
        noisyMeasures[key] = null;
        continue;
      }

      const sensitivity = this.getSensitivity(measure.field, measure.aggregation);
      const noise = this.generateNoise(config, sensitivity);
      const noisyValue = originalValue + noise;

      // For counts and sums, round to integer and ensure non-negative
      if (
        measure.aggregation === 'count' ||
        measure.aggregation === 'count_distinct' ||
        measure.aggregation === 'sum'
      ) {
        noisyMeasures[key] = Math.max(0, Math.round(noisyValue));
      } else {
        // For other aggregations, keep decimal precision
        noisyMeasures[key] = Math.max(0, Number(noisyValue.toFixed(4)));
      }
    }

    return {
      ...row,
      measures: noisyMeasures,
      privacyAffected: true,
    };
  }

  /**
   * Generate noise based on the configured mechanism
   */
  generateNoise(config: DifferentialPrivacyConfig, sensitivity: number): number {
    const scale = sensitivity / config.epsilon;

    switch (config.mechanism) {
      case 'laplace':
        return this.laplaceMechanism(scale);
      case 'gaussian':
        return this.gaussianMechanism(scale, config.delta || 1e-5);
      case 'exponential':
        // Exponential mechanism is primarily for categorical selection
        // For numeric queries, fall back to Laplace
        return this.laplaceMechanism(scale);
      default:
        return this.laplaceMechanism(scale);
    }
  }

  /**
   * Laplace mechanism: draws from Laplace distribution
   * Provides (epsilon, 0)-differential privacy
   */
  laplaceMechanism(scale: number): number {
    // Generate uniform random in (0, 1)
    const u = Math.random() - 0.5;
    // Transform to Laplace distribution
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Gaussian mechanism: draws from Gaussian distribution
   * Provides (epsilon, delta)-differential privacy
   */
  gaussianMechanism(scale: number, delta: number): number {
    // Calculate sigma for (epsilon, delta)-DP using the Gaussian mechanism
    // sigma = sqrt(2 * ln(1.25/delta)) * sensitivity / epsilon
    const sigma = scale * Math.sqrt(2 * Math.log(1.25 / delta));

    // Box-Muller transform for Gaussian random variable
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return z * sigma;
  }

  /**
   * Exponential mechanism for selecting from a discrete set
   * Used for categorical queries or when exact values matter
   */
  exponentialMechanism<T>(
    candidates: T[],
    scoreFn: (candidate: T) => number,
    epsilon: number,
    sensitivity: number
  ): T {
    if (candidates.length === 0) {
      throw new Error('Cannot select from empty candidate set');
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Calculate selection probabilities
    const scores = candidates.map(c => scoreFn(c));
    const maxScore = Math.max(...scores);

    // Calculate unnormalized probabilities
    const unnormalizedProbs = scores.map(
      score => Math.exp((epsilon * (score - maxScore)) / (2 * sensitivity))
    );

    // Normalize
    const sumProbs = unnormalizedProbs.reduce((a, b) => a + b, 0);
    const probs = unnormalizedProbs.map(p => p / sumProbs);

    // Sample from the distribution
    const r = Math.random();
    let cumSum = 0;
    for (let i = 0; i < candidates.length; i++) {
      cumSum += probs[i];
      if (r <= cumSum) {
        return candidates[i];
      }
    }

    // Fallback (shouldn't reach here due to floating point)
    return candidates[candidates.length - 1];
  }

  /**
   * Get sensitivity for a specific field and aggregation type
   */
  getSensitivity(field: string, aggregationType: AggregationType): number {
    // Check for field-specific sensitivity
    if (this.defaultSensitivity.fieldSensitivities[field]) {
      return this.defaultSensitivity.fieldSensitivities[field];
    }

    // Use aggregation-type default
    switch (aggregationType) {
      case 'count':
      case 'count_distinct':
        return this.defaultSensitivity.countSensitivity;
      case 'sum':
        return this.defaultSensitivity.sumSensitivity;
      case 'avg':
      case 'median':
      case 'percentile':
        return this.defaultSensitivity.avgSensitivity;
      case 'min':
      case 'max':
        // Min/max have unbounded sensitivity in general
        // Use a default but warn about this
        logger.warn({ field, aggregationType }, 'Min/max operations have unbounded sensitivity');
        return this.defaultSensitivity.sumSensitivity;
      case 'stddev':
      case 'variance':
        // Variance and stddev are more complex
        return this.defaultSensitivity.sumSensitivity * 2;
      default:
        return 1;
    }
  }

  /**
   * Calculate the epsilon required for a query
   * Uses composition theorems for multiple measures
   */
  calculateQueryEpsilon(
    config: DifferentialPrivacyConfig,
    query: AggregateQuery
  ): number {
    // Simple composition: sum of individual epsilons
    // For k measures, total epsilon = k * epsilon_per_measure
    // Using basic composition for simplicity
    // Advanced composition could reduce this to O(sqrt(k))

    const numMeasures = query.measures.length;

    // Basic composition
    return config.epsilon * numMeasures;
  }

  /**
   * Estimate average noise magnitude for reporting
   */
  private estimateAverageNoise(
    config: DifferentialPrivacyConfig,
    query: AggregateQuery
  ): number {
    // For Laplace, mean absolute deviation = scale = sensitivity/epsilon
    // For Gaussian, mean absolute deviation ≈ sigma * sqrt(2/pi)

    const avgSensitivity =
      query.measures.reduce(
        (sum, m) => sum + this.getSensitivity(m.field, m.aggregation),
        0
      ) / query.measures.length;

    const scale = avgSensitivity / config.epsilon;

    if (config.mechanism === 'gaussian' && config.delta) {
      const sigma = scale * Math.sqrt(2 * Math.log(1.25 / config.delta));
      return sigma * Math.sqrt(2 / Math.PI);
    }

    return scale; // Laplace mean absolute deviation
  }

  // =========================================================================
  // Budget Management
  // =========================================================================

  /**
   * Initialize or get budget state for a tenant/user
   */
  getBudgetState(
    tenantId: string,
    userId?: string,
    config?: DifferentialPrivacyConfig
  ): PrivacyBudgetState {
    const key = this.budgetKey(tenantId, userId);
    let entry = this.budgetStore.get(key);

    const now = new Date();

    // Check if we need to create or reset the budget
    if (!entry || (entry.periodEnd && entry.periodEnd < now)) {
      const period = config?.budgetRenewalPeriod || 'day';
      const { start, end } = this.calculatePeriod(period, now);

      entry = {
        tenantId,
        userId,
        totalBudget: config?.epsilon || 1.0,
        spentBudget: 0,
        queryCount: 0,
        periodStart: start,
        periodEnd: end,
        lastUpdated: now,
      };

      this.budgetStore.set(key, entry);
    }

    return {
      tenantId,
      userId,
      totalBudget: entry.totalBudget,
      spentBudget: entry.spentBudget,
      queryCount: entry.queryCount,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
    };
  }

  /**
   * Consume budget for a query
   */
  consumeBudget(
    tenantId: string,
    epsilonConsumed: number,
    userId?: string
  ): PrivacyBudgetState {
    const key = this.budgetKey(tenantId, userId);
    const entry = this.budgetStore.get(key);

    if (!entry) {
      throw new Error(`No budget state found for tenant ${tenantId}`);
    }

    entry.spentBudget += epsilonConsumed;
    entry.queryCount += 1;
    entry.lastUpdated = new Date();

    this.budgetStore.set(key, entry);

    logger.info({
      tenantId,
      userId,
      epsilonConsumed,
      totalSpent: entry.spentBudget,
      remaining: entry.totalBudget - entry.spentBudget,
    }, 'Privacy budget consumed');

    return {
      tenantId,
      userId,
      totalBudget: entry.totalBudget,
      spentBudget: entry.spentBudget,
      queryCount: entry.queryCount,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
    };
  }

  /**
   * Reset budget for a tenant/user (e.g., for testing)
   */
  resetBudget(tenantId: string, userId?: string): void {
    const key = this.budgetKey(tenantId, userId);
    this.budgetStore.delete(key);
  }

  /**
   * Get all budget states (for admin)
   */
  getAllBudgetStates(): PrivacyBudgetState[] {
    return Array.from(this.budgetStore.values()).map(entry => ({
      tenantId: entry.tenantId,
      userId: entry.userId,
      totalBudget: entry.totalBudget,
      spentBudget: entry.spentBudget,
      queryCount: entry.queryCount,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
    }));
  }

  /**
   * Create a budget key for storage
   */
  private budgetKey(tenantId: string, userId?: string): string {
    return userId ? `${tenantId}:${userId}` : tenantId;
  }

  /**
   * Calculate period start and end based on renewal period
   */
  private calculatePeriod(
    period: 'hour' | 'day' | 'week' | 'month',
    now: Date
  ): { start: Date; end: Date } {
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case 'hour':
        start.setMinutes(0, 0, 0);
        end.setMinutes(0, 0, 0);
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 7);
        end.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(1);
        end.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  // =========================================================================
  // Composition Analysis
  // =========================================================================

  /**
   * Calculate advanced composition bound
   * Uses strong composition theorem for better bounds on many queries
   */
  advancedCompositionBound(
    epsilon: number,
    delta: number,
    numQueries: number
  ): { totalEpsilon: number; totalDelta: number } {
    // Strong composition: for k queries with (ε, δ)-DP
    // Total is approximately (√(2k ln(1/δ')) ε + k ε (e^ε - 1), k δ + δ')
    // where δ' is chosen appropriately

    const deltaPrime = delta / 2;
    const kEps = numQueries * epsilon * (Math.exp(epsilon) - 1);
    const sqrtTerm = Math.sqrt(2 * numQueries * Math.log(1 / deltaPrime)) * epsilon;

    return {
      totalEpsilon: sqrtTerm + kEps,
      totalDelta: numQueries * delta + deltaPrime,
    };
  }

  /**
   * Calculate remaining queries under a budget using advanced composition
   */
  estimateRemainingQueries(
    targetEpsilon: number,
    targetDelta: number,
    perQueryEpsilon: number,
    perQueryDelta: number
  ): number {
    // Binary search for the maximum k such that composition stays within budget
    let low = 1;
    let high = 10000;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const bound = this.advancedCompositionBound(perQueryEpsilon, perQueryDelta, mid);

      if (bound.totalEpsilon <= targetEpsilon && bound.totalDelta <= targetDelta) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }
}

// Default instance
export const differentialPrivacy = new DifferentialPrivacy();
