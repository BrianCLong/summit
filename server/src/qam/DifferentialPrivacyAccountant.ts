import { EventEmitter } from 'events';
import { createLogger } from '../config/logger';

const logger = createLogger('DifferentialPrivacyAccountant');

export interface PrivacyQuery {
  queryType: string;
  epsilon: number;
  delta: number;
  sensitivityBound: number;
  dataPoints: number;
  mechanism?: 'laplace' | 'gaussian' | 'exponential';
  compositionMethod?: 'basic' | 'advanced' | 'RDP' | 'moments';
}

export interface PrivacyLoss {
  epsilon: number;
  delta: number;
  noiseScale: number;
  budgetExceeded: boolean;
  remainingBudget: { epsilon: number; delta: number };
  queryId: string;
  timestamp: Date;
}

export interface PrivacyBudget {
  totalEpsilon: number;
  totalDelta: number;
  usedEpsilon: number;
  usedDelta: number;
  remainingEpsilon: number;
  remainingDelta: number;
  queries: PrivacyQuery[];
}

export interface DPAccountantConfig {
  defaultEpsilon: number;
  defaultDelta: number;
  maxEpsilon: number;
  maxDelta: number;
  compositionMethod: 'basic' | 'advanced' | 'RDP' | 'moments';
  budgetRefreshInterval?: number;
  warningThreshold?: number;
}

export interface CompositionResult {
  totalEpsilon: number;
  totalDelta: number;
  method: string;
  queryCount: number;
  effectiveness: number;
}

export interface RDPResult {
  alpha: number;
  epsilon: number;
  delta: number;
  orders: number[];
  rdpValues: number[];
}

/**
 * DifferentialPrivacyAccountant - Privacy budget management with multiple composition methods
 *
 * Key Features:
 * - Multiple composition methods: Basic, Advanced, RDP, Moments Accountant
 * - Automatic noise scale calculation for privacy mechanisms
 * - Real-time budget tracking and violation detection
 * - Support for Laplace, Gaussian, and Exponential mechanisms
 * - Rényi Differential Privacy (RDP) composition
 * - Moments Accountant for deep learning applications
 * - Privacy budget renewal and management
 * - Comprehensive privacy analytics and reporting
 */
export class DifferentialPrivacyAccountant extends EventEmitter {
  private config: DPAccountantConfig;
  private privacyBudget: PrivacyBudget;
  private queryHistory: PrivacyQuery[] = [];
  private refreshTimer?: NodeJS.Timeout;

  // RDP tracking
  private rdpOrders: number[] = [1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 64, 256];
  private rdpEpsilons: Map<number, number> = new Map();

  // Moments Accountant tracking
  private momentsBounds: number[] = [];
  private sigmaValues: number[] = [];

  constructor(config: DPAccountantConfig) {
    super();
    this.config = {
      maxEpsilon: 10.0,
      maxDelta: 1e-3,
      budgetRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      warningThreshold: 0.8, // 80% budget usage warning
      ...config
    };

    // Initialize privacy budget
    this.privacyBudget = {
      totalEpsilon: config.defaultEpsilon,
      totalDelta: config.defaultDelta,
      usedEpsilon: 0,
      usedDelta: 0,
      remainingEpsilon: config.defaultEpsilon,
      remainingDelta: config.defaultDelta,
      queries: []
    };

    // Initialize RDP tracking
    for (const order of this.rdpOrders) {
      this.rdpEpsilons.set(order, 0);
    }

    // Start budget refresh timer
    if (this.config.budgetRefreshInterval! > 0) {
      this.refreshTimer = setInterval(
        () => this.refreshBudget(),
        this.config.budgetRefreshInterval!
      );
    }

    logger.info('DifferentialPrivacyAccountant initialized', {
      defaultEpsilon: config.defaultEpsilon,
      defaultDelta: config.defaultDelta,
      compositionMethod: config.compositionMethod
    });
  }

  /**
   * Consume privacy budget for a query
   */
  async consumeBudget(query: PrivacyQuery): Promise<PrivacyLoss> {
    try {
      const queryId = this.generateQueryId();
      const timestamp = new Date();

      // Set defaults
      const mechanism = query.mechanism || 'laplace';
      const compositionMethod = query.compositionMethod || this.config.compositionMethod;

      // Calculate noise scale for the mechanism
      const noiseScale = this.calculateNoiseScale(query, mechanism);

      // Calculate privacy loss after composition
      const composition = await this.calculateComposition([...this.queryHistory, query], compositionMethod);

      // Check budget constraints
      const budgetExceeded = (
        composition.totalEpsilon > this.privacyBudget.totalEpsilon ||
        composition.totalDelta > this.privacyBudget.totalDelta
      );

      if (budgetExceeded) {
        logger.warn('Privacy budget exceeded', {
          queryId,
          requestedEpsilon: query.epsilon,
          requestedDelta: query.delta,
          totalEpsilon: composition.totalEpsilon,
          totalDelta: composition.totalDelta,
          budgetEpsilon: this.privacyBudget.totalEpsilon,
          budgetDelta: this.privacyBudget.totalDelta
        });

        this.emit('budget_exceeded', {
          queryId,
          query,
          composition,
          budget: this.privacyBudget
        });
      } else {
        // Update budget if not exceeded
        this.updateBudgetUsage(query, composition);
        this.queryHistory.push(query);

        // Update RDP tracking if using RDP
        if (compositionMethod === 'RDP') {
          this.updateRDPTracking(query);
        }

        // Update Moments Accountant if using moments
        if (compositionMethod === 'moments') {
          this.updateMomentsTracking(query, noiseScale);
        }
      }

      // Check warning threshold
      const epsilonUsageRatio = this.privacyBudget.usedEpsilon / this.privacyBudget.totalEpsilon;
      if (epsilonUsageRatio >= this.config.warningThreshold! && !budgetExceeded) {
        this.emit('budget_warning', {
          usageRatio: epsilonUsageRatio,
          remainingEpsilon: this.privacyBudget.remainingEpsilon,
          remainingDelta: this.privacyBudget.remainingDelta
        });
      }

      const privacyLoss: PrivacyLoss = {
        epsilon: query.epsilon,
        delta: query.delta,
        noiseScale,
        budgetExceeded,
        remainingBudget: {
          epsilon: this.privacyBudget.remainingEpsilon,
          delta: this.privacyBudget.remainingDelta
        },
        queryId,
        timestamp
      };

      this.emit('budget_consumed', {
        queryId,
        query,
        privacyLoss,
        composition
      });

      logger.debug('Privacy budget consumed', {
        queryId,
        queryType: query.queryType,
        epsilon: query.epsilon,
        delta: query.delta,
        noiseScale,
        budgetExceeded,
        remainingEpsilon: this.privacyBudget.remainingEpsilon,
        remainingDelta: this.privacyBudget.remainingDelta
      });

      return privacyLoss;
    } catch (error) {
      logger.error('Failed to consume privacy budget', { error, query });
      this.emit('consumption_error', { error, query });
      throw error;
    }
  }

  /**
   * Calculate composition of privacy parameters
   */
  async calculateComposition(queries: PrivacyQuery[], method: string): Promise<CompositionResult> {
    try {
      switch (method) {
        case 'basic':
          return this.basicComposition(queries);
        case 'advanced':
          return this.advancedComposition(queries);
        case 'RDP':
          return this.rdpComposition(queries);
        case 'moments':
          return this.momentsComposition(queries);
        default:
          throw new Error(`Unknown composition method: ${method}`);
      }
    } catch (error) {
      logger.error('Composition calculation failed', { error, method, queryCount: queries.length });
      throw error;
    }
  }

  /**
   * Basic composition (simple summation)
   */
  private basicComposition(queries: PrivacyQuery[]): CompositionResult {
    const totalEpsilon = queries.reduce((sum, q) => sum + q.epsilon, 0);
    const totalDelta = queries.reduce((sum, q) => sum + q.delta, 0);

    return {
      totalEpsilon,
      totalDelta,
      method: 'basic',
      queryCount: queries.length,
      effectiveness: 1.0 // Basic composition has no privacy amplification
    };
  }

  /**
   * Advanced composition (tighter bounds)
   */
  private advancedComposition(queries: PrivacyQuery[]): CompositionResult {
    if (queries.length === 0) {
      return { totalEpsilon: 0, totalDelta: 0, method: 'advanced', queryCount: 0, effectiveness: 1.0 };
    }

    // Group queries by (epsilon, delta) pairs
    const groupedQueries = new Map<string, { epsilon: number; delta: number; count: number }>();

    for (const query of queries) {
      const key = `${query.epsilon}_${query.delta}`;
      const existing = groupedQueries.get(key);
      if (existing) {
        existing.count++;
      } else {
        groupedQueries.set(key, { epsilon: query.epsilon, delta: query.delta, count: 1 });
      }
    }

    let totalEpsilon = 0;
    let totalDelta = 0;

    // Apply advanced composition for each group
    for (const group of groupedQueries.values()) {
      const { epsilon, delta, count } = group;

      if (count === 1) {
        // Single query - no composition needed
        totalEpsilon += epsilon;
        totalDelta += delta;
      } else {
        // Advanced composition formula
        const k = count;
        const deltaPlus = delta * k;

        // Advanced composition bound
        const epsilonAdvanced = epsilon * Math.sqrt(2 * k * Math.log(1 / deltaPlus)) + k * epsilon * (Math.exp(epsilon) - 1);

        totalEpsilon += epsilonAdvanced;
        totalDelta += deltaPlus;
      }
    }

    const basicTotalEpsilon = queries.reduce((sum, q) => sum + q.epsilon, 0);
    const effectiveness = basicTotalEpsilon > 0 ? totalEpsilon / basicTotalEpsilon : 1.0;

    return {
      totalEpsilon,
      totalDelta,
      method: 'advanced',
      queryCount: queries.length,
      effectiveness
    };
  }

  /**
   * Rényi Differential Privacy (RDP) composition
   */
  private rdpComposition(queries: PrivacyQuery[]): CompositionResult {
    if (queries.length === 0) {
      return { totalEpsilon: 0, totalDelta: 0, method: 'RDP', queryCount: 0, effectiveness: 1.0 };
    }

    // Calculate RDP for each order
    const rdpValues = new Map<number, number>();

    for (const order of this.rdpOrders) {
      let totalRDP = 0;

      for (const query of queries) {
        // Convert (ε, δ)-DP to RDP
        const rdpEpsilon = this.convertToRDP(query.epsilon, query.delta, order);
        totalRDP += rdpEpsilon;
      }

      rdpValues.set(order, totalRDP);
    }

    // Convert back to (ε, δ)-DP
    const targetDelta = Math.min(...queries.map(q => q.delta));
    const { epsilon: totalEpsilon } = this.convertFromRDP(rdpValues, targetDelta);

    const basicTotalEpsilon = queries.reduce((sum, q) => sum + q.epsilon, 0);
    const effectiveness = basicTotalEpsilon > 0 ? totalEpsilon / basicTotalEpsilon : 1.0;

    return {
      totalEpsilon,
      totalDelta: targetDelta,
      method: 'RDP',
      queryCount: queries.length,
      effectiveness
    };
  }

  /**
   * Moments Accountant composition
   */
  private momentsComposition(queries: PrivacyQuery[]): CompositionResult {
    if (queries.length === 0) {
      return { totalEpsilon: 0, totalDelta: 0, method: 'moments', queryCount: 0, effectiveness: 1.0 };
    }

    // Simplified moments accountant (would use more sophisticated implementation in practice)
    const targetDelta = Math.min(...queries.map(q => q.delta));

    let totalEpsilon = 0;
    let cumulativeNoise = 0;

    for (const query of queries) {
      // Estimate noise level
      const sigma = this.calculateNoiseScale(query, 'gaussian');
      cumulativeNoise += 1 / (sigma * sigma);

      // Apply moments accountant bound (simplified)
      const q = Math.min(query.dataPoints / 1000, 0.1); // Sampling ratio
      const lambda = 8 * Math.log(1 / targetDelta); // Moment order

      const momentsBound = Math.sqrt(lambda * q * Math.log(1 / targetDelta)) / sigma;
      totalEpsilon += momentsBound;
    }

    const basicTotalEpsilon = queries.reduce((sum, q) => sum + q.epsilon, 0);
    const effectiveness = basicTotalEpsilon > 0 ? totalEpsilon / basicTotalEpsilon : 1.0;

    return {
      totalEpsilon,
      totalDelta: targetDelta,
      method: 'moments',
      queryCount: queries.length,
      effectiveness
    };
  }

  /**
   * Calculate noise scale for different mechanisms
   */
  private calculateNoiseScale(query: PrivacyQuery, mechanism: string): number {
    const { epsilon, delta, sensitivityBound } = query;

    switch (mechanism) {
      case 'laplace':
        // Laplace mechanism: λ = Δf / ε
        return sensitivityBound / epsilon;

      case 'gaussian':
        // Gaussian mechanism: σ = Δf * √(2 * ln(1.25/δ)) / ε
        return sensitivityBound * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;

      case 'exponential':
        // Exponential mechanism noise scale
        return 2 * sensitivityBound / epsilon;

      default:
        throw new Error(`Unknown mechanism: ${mechanism}`);
    }
  }

  /**
   * Convert (ε, δ)-DP to RDP
   */
  private convertToRDP(epsilon: number, delta: number, order: number): number {
    if (order === 1) {
      return epsilon;
    }

    // Conversion formula for Gaussian mechanism
    if (delta === 0) {
      // Pure DP case
      return (order - 1) * epsilon * epsilon / 2;
    } else {
      // Approximate conversion (would use exact formula in practice)
      return epsilon + Math.log(1 + (order - 1) * epsilon * epsilon / 2) + Math.log(1 / delta) / (order - 1);
    }
  }

  /**
   * Convert RDP back to (ε, δ)-DP
   */
  private convertFromRDP(rdpValues: Map<number, number>, targetDelta: number): { epsilon: number; order: number } {
    let bestEpsilon = Infinity;
    let bestOrder = 0;

    for (const [order, rdpEpsilon] of rdpValues) {
      if (order === 1) {
        continue; // Skip α=1 (pure DP)
      }

      // Convert RDP to (ε, δ)-DP
      const epsilon = rdpEpsilon + Math.log(1 / targetDelta) / (order - 1);

      if (epsilon < bestEpsilon) {
        bestEpsilon = epsilon;
        bestOrder = order;
      }
    }

    return { epsilon: bestEpsilon, order: bestOrder };
  }

  /**
   * Update budget usage after successful query
   */
  private updateBudgetUsage(query: PrivacyQuery, composition: CompositionResult): void {
    this.privacyBudget.usedEpsilon = composition.totalEpsilon;
    this.privacyBudget.usedDelta = composition.totalDelta;
    this.privacyBudget.remainingEpsilon = this.privacyBudget.totalEpsilon - composition.totalEpsilon;
    this.privacyBudget.remainingDelta = this.privacyBudget.totalDelta - composition.totalDelta;
    this.privacyBudget.queries.push(query);
  }

  /**
   * Update RDP tracking
   */
  private updateRDPTracking(query: PrivacyQuery): void {
    for (const order of this.rdpOrders) {
      const rdpEpsilon = this.convertToRDP(query.epsilon, query.delta, order);
      const current = this.rdpEpsilons.get(order) || 0;
      this.rdpEpsilons.set(order, current + rdpEpsilon);
    }
  }

  /**
   * Update Moments Accountant tracking
   */
  private updateMomentsTracking(query: PrivacyQuery, noiseScale: number): void {
    this.momentsBounds.push(query.epsilon);
    this.sigmaValues.push(noiseScale);

    // Keep only recent values
    const maxHistory = 1000;
    if (this.momentsBounds.length > maxHistory) {
      this.momentsBounds = this.momentsBounds.slice(-maxHistory);
      this.sigmaValues = this.sigmaValues.slice(-maxHistory);
    }
  }

  /**
   * Refresh privacy budget (e.g., daily renewal)
   */
  private refreshBudget(): void {
    const previousBudget = { ...this.privacyBudget };

    this.privacyBudget = {
      totalEpsilon: this.config.defaultEpsilon,
      totalDelta: this.config.defaultDelta,
      usedEpsilon: 0,
      usedDelta: 0,
      remainingEpsilon: this.config.defaultEpsilon,
      remainingDelta: this.config.defaultDelta,
      queries: []
    };

    this.queryHistory = [];

    // Reset RDP tracking
    for (const order of this.rdpOrders) {
      this.rdpEpsilons.set(order, 0);
    }

    // Reset Moments tracking
    this.momentsBounds = [];
    this.sigmaValues = [];

    this.emit('budget_refreshed', {
      previousBudget,
      newBudget: this.privacyBudget,
      timestamp: new Date()
    });

    logger.info('Privacy budget refreshed', {
      newEpsilon: this.config.defaultEpsilon,
      newDelta: this.config.defaultDelta,
      previousUsage: {
        epsilon: previousBudget.usedEpsilon,
        delta: previousBudget.usedDelta
      }
    });
  }

  /**
   * Get current privacy budget status
   */
  getBudgetStatus(): PrivacyBudget {
    return { ...this.privacyBudget };
  }

  /**
   * Get privacy analytics
   */
  getPrivacyAnalytics(): any {
    const recentQueries = this.queryHistory.slice(-100);

    const analytics = {
      totalQueries: this.queryHistory.length,
      recentQueries: recentQueries.length,
      budgetUsage: {
        epsilonUsageRatio: this.privacyBudget.usedEpsilon / this.privacyBudget.totalEpsilon,
        deltaUsageRatio: this.privacyBudget.usedDelta / this.privacyBudget.totalDelta
      },
      queryTypes: this.getQueryTypeStatistics(),
      mechanisms: this.getMechanismStatistics(),
      compositionEffectiveness: this.getCompositionEffectiveness(),
      rdpStatus: this.getRDPStatus(),
      momentsStatus: this.getMomentsStatus()
    };

    return analytics;
  }

  /**
   * Get RDP status
   */
  private getRDPStatus(): RDPResult {
    const orders = Array.from(this.rdpEpsilons.keys()).sort((a, b) => a - b);
    const rdpValues = orders.map(order => this.rdpEpsilons.get(order) || 0);

    // Find best conversion to (ε, δ)-DP
    const targetDelta = this.config.defaultDelta;
    const { epsilon, order: bestOrder } = this.convertFromRDP(this.rdpEpsilons, targetDelta);

    return {
      alpha: bestOrder,
      epsilon,
      delta: targetDelta,
      orders,
      rdpValues
    };
  }

  /**
   * Get Moments Accountant status
   */
  private getMomentsStatus(): any {
    if (this.momentsBounds.length === 0) {
      return { bounds: [], sigmas: [], averageBound: 0, averageSigma: 0 };
    }

    const averageBound = this.momentsBounds.reduce((sum, b) => sum + b, 0) / this.momentsBounds.length;
    const averageSigma = this.sigmaValues.reduce((sum, s) => sum + s, 0) / this.sigmaValues.length;

    return {
      bounds: this.momentsBounds,
      sigmas: this.sigmaValues,
      averageBound,
      averageSigma
    };
  }

  private getQueryTypeStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const query of this.queryHistory) {
      stats[query.queryType] = (stats[query.queryType] || 0) + 1;
    }
    return stats;
  }

  private getMechanismStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const query of this.queryHistory) {
      const mechanism = query.mechanism || 'laplace';
      stats[mechanism] = (stats[mechanism] || 0) + 1;
    }
    return stats;
  }

  private getCompositionEffectiveness(): Record<string, number> {
    const methods = ['basic', 'advanced', 'RDP', 'moments'];
    const effectiveness: Record<string, number> = {};

    for (const method of methods) {
      try {
        const composition = this.calculateComposition(this.queryHistory, method);
        effectiveness[method] = composition.effectiveness;
      } catch (error) {
        effectiveness[method] = 1.0;
      }
    }

    return effectiveness;
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DPAccountantConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update budget if total limits changed
    if (newConfig.defaultEpsilon !== undefined) {
      this.privacyBudget.totalEpsilon = newConfig.defaultEpsilon;
      this.privacyBudget.remainingEpsilon = newConfig.defaultEpsilon - this.privacyBudget.usedEpsilon;
    }

    if (newConfig.defaultDelta !== undefined) {
      this.privacyBudget.totalDelta = newConfig.defaultDelta;
      this.privacyBudget.remainingDelta = newConfig.defaultDelta - this.privacyBudget.usedDelta;
    }

    logger.info('Configuration updated', { config: this.config });
    this.emit('config_updated', this.config);
  }

  /**
   * Manual budget reset
   */
  resetBudget(): void {
    this.refreshBudget();
    this.emit('budget_reset', { timestamp: new Date() });
  }

  /**
   * Export privacy state for persistence
   */
  exportState(): any {
    return {
      config: this.config,
      budget: this.privacyBudget,
      queryHistory: this.queryHistory,
      rdpEpsilons: Object.fromEntries(this.rdpEpsilons),
      momentsBounds: this.momentsBounds,
      sigmaValues: this.sigmaValues
    };
  }

  /**
   * Import privacy state from persistence
   */
  importState(state: any): void {
    this.config = state.config;
    this.privacyBudget = state.budget;
    this.queryHistory = state.queryHistory;
    this.rdpEpsilons = new Map(Object.entries(state.rdpEpsilons).map(([k, v]) => [parseFloat(k), v as number]));
    this.momentsBounds = state.momentsBounds;
    this.sigmaValues = state.sigmaValues;

    logger.info('Privacy state imported', {
      totalQueries: this.queryHistory.length,
      budgetUsage: {
        epsilon: this.privacyBudget.usedEpsilon,
        delta: this.privacyBudget.usedDelta
      }
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down DifferentialPrivacyAccountant');

    // Clear refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.removeAllListeners();
    logger.info('DifferentialPrivacyAccountant shutdown complete');
  }
}

export default DifferentialPrivacyAccountant;