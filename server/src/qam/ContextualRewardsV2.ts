import { EventEmitter } from 'events';
import baseLogger from '../config/logger';

const logger = baseLogger.child({ module: 'ContextualRewardsV2' });

export interface ExecutionContext {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  requestType: string;
  complexity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget: number;
  deadline?: Date;
  metadata: Record<string, any>;
}

export interface MultiObjectiveReward {
  executionId: string;
  timestamp: Date;
  route: RouteType;
  provider: string;
  context: ExecutionContext;
  objectives: {
    latency: ObjectiveScore;
    cost: ObjectiveScore;
    quality: ObjectiveScore;
    reliability: ObjectiveScore;
    security: ObjectiveScore;
  };
  compositeScore: number;
  paretoRank: number;
  dominatedBy: string[];
  dominates: string[];
  tradeoffs: TradeoffAnalysis;
}

export interface ObjectiveScore {
  value: number;
  weight: number;
  normalized: number;
  target: number;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TradeoffAnalysis {
  latencyVsCost: number;
  qualityVsCost: number;
  securityVsLatency: number;
  reliabilityVsLatency: number;
  overallEfficiency: number;
}

export interface ParetoFront {
  solutions: MultiObjectiveReward[];
  hypervolume: number;
  spread: number;
  convergence: number;
  timestamp: Date;
}

export interface RouteMetrics {
  route: RouteType;
  provider: string;
  recentRewards: MultiObjectiveReward[];
  averageScores: {
    latency: number;
    cost: number;
    quality: number;
    reliability: number;
    security: number;
    composite: number;
  };
  paretoRanking: number;
  consistencyScore: number;
  improvementTrend: number;
}

export type RouteType = 'fast' | 'balanced' | 'quality' | 'economy' | 'secure';

export interface ContextualRewardsConfig {
  objectiveWeights: {
    latency: number;
    cost: number;
    quality: number;
    reliability: number;
    security: number;
  };
  paretoUpdateFrequency: number;
  maxHistorySize: number;
  adaptationRate: number;
  convergenceThreshold: number;
}

/**
 * ContextualRewardsV2 - Multi-objective Pareto-aware optimization with route-specific learning
 *
 * Key Features:
 * - Multi-objective optimization with 5 core objectives (latency, cost, quality, reliability, security)
 * - Pareto efficiency analysis with front generation and ranking
 * - Route-specific performance learning and adaptation
 * - Context-aware reward calculation based on execution environment
 * - Trade-off analysis between competing objectives
 * - Hypervolume and spread metrics for solution quality assessment
 * - Real-time Pareto front maintenance and updates
 * - Adaptive weight adjustment based on performance trends
 */
export class ContextualRewardsV2 extends EventEmitter {
  private config: ContextualRewardsConfig;
  private rewardHistory: MultiObjectiveReward[] = [];
  private currentParetoFront: ParetoFront;
  private routeMetrics: Map<string, RouteMetrics> = new Map();
  private contextualWeights: Map<string, any> = new Map(); // Context-specific weight adaptations

  // Performance tracking
  private objectiveTargets = {
    latency: 200, // ms
    cost: 0.01, // dollars
    quality: 0.95, // 0-1 score
    reliability: 0.99, // 0-1 score
    security: 0.98, // 0-1 score
  };

  constructor(config: Partial<ContextualRewardsConfig> = {}) {
    super();
    this.config = {
      objectiveWeights: {
        latency: 0.25,
        cost: 0.2,
        quality: 0.25,
        reliability: 0.15,
        security: 0.15,
      },
      paretoUpdateFrequency: 10, // Update Pareto front every 10 rewards
      maxHistorySize: 1000,
      adaptationRate: 0.1,
      convergenceThreshold: 0.01,
      ...config,
    };

    // Initialize empty Pareto front
    this.currentParetoFront = {
      solutions: [],
      hypervolume: 0,
      spread: 0,
      convergence: 0,
      timestamp: new Date(),
    };

    logger.info('ContextualRewardsV2 initialized', {
      objectiveWeights: this.config.objectiveWeights,
      paretoUpdateFrequency: this.config.paretoUpdateFrequency,
    });
  }

  /**
   * Process multi-objective reward with Pareto analysis
   */
  async processMultiObjectiveReward(
    executionId: string,
    route: RouteType,
    provider: string,
    rawMetrics: any,
    context: ExecutionContext,
  ): Promise<MultiObjectiveReward> {
    try {
      const timestamp = new Date();

      // Calculate objective scores
      const objectives = this.calculateObjectiveScores(rawMetrics, context);

      // Calculate composite score with context-aware weights
      const contextualWeights = this.getContextualWeights(context);
      const compositeScore = this.calculateCompositeScore(
        objectives,
        contextualWeights,
      );

      // Create reward object
      const reward: MultiObjectiveReward = {
        executionId,
        timestamp,
        route,
        provider,
        context,
        objectives,
        compositeScore,
        paretoRank: 0, // Will be calculated during Pareto analysis
        dominatedBy: [],
        dominates: [],
        tradeoffs: this.analyzeTradeoffs(objectives),
      };

      // Add to history
      this.rewardHistory.push(reward);
      if (this.rewardHistory.length > this.config.maxHistorySize) {
        this.rewardHistory = this.rewardHistory.slice(
          -this.config.maxHistorySize,
        );
      }

      // Update route metrics
      await this.updateRouteMetrics(route, provider, reward);

      // Update Pareto front if needed
      if (this.rewardHistory.length % this.config.paretoUpdateFrequency === 0) {
        await this.updateParetoFront();
      }

      // Adaptive weight learning
      await this.adaptWeights(reward);

      // Emit reward event
      this.emit('reward_processed', {
        executionId,
        route,
        provider,
        compositeScore,
        paretoRank: reward.paretoRank,
      });

      logger.debug('Multi-objective reward processed', {
        executionId,
        route,
        provider,
        compositeScore: compositeScore.toFixed(4),
        objectives: {
          latency: objectives.latency.normalized.toFixed(3),
          cost: objectives.cost.normalized.toFixed(3),
          quality: objectives.quality.normalized.toFixed(3),
          reliability: objectives.reliability.normalized.toFixed(3),
          security: objectives.security.normalized.toFixed(3),
        },
      });

      return reward;
    } catch (error) {
      logger.error('Failed to process multi-objective reward', {
        error,
        executionId,
        route,
        provider,
      });
      this.emit('reward_error', { error, executionId, route, provider });
      throw error;
    }
  }

  /**
   * Calculate Pareto-aware delta for optimization feedback
   */
  async calculateParetoAwareDelta(
    recentRewards: MultiObjectiveReward[],
    timeWindowHours: number = 1,
  ): Promise<any> {
    try {
      const cutoffTime = new Date(
        Date.now() - timeWindowHours * 60 * 60 * 1000,
      );
      const windowRewards = recentRewards.filter(
        (r) => r.timestamp >= cutoffTime,
      );

      if (windowRewards.length === 0) {
        return {
          paretoImprovement: 0,
          dominanceShift: 0,
          hypervolumeIncrease: 0,
          recommendedWeightAdjustments: {},
        };
      }

      // Calculate Pareto improvements
      const paretoImprovement = this.calculateParetoImprovement(windowRewards);

      // Calculate dominance shifts
      const dominanceShift = this.calculateDominanceShift(windowRewards);

      // Calculate hypervolume increase
      const hypervolumeIncrease =
        this.calculateHypervolumeIncrease(windowRewards);

      // Generate weight adjustment recommendations
      const recommendedWeightAdjustments =
        this.generateWeightRecommendations(windowRewards);

      const delta = {
        paretoImprovement,
        dominanceShift,
        hypervolumeIncrease,
        recommendedWeightAdjustments,
        analysisTimestamp: new Date(),
        timeWindowHours,
        rewardsAnalyzed: windowRewards.length,
      };

      this.emit('pareto_delta_calculated', delta);

      logger.debug('Pareto-aware delta calculated', {
        paretoImprovement: paretoImprovement.toFixed(4),
        dominanceShift: dominanceShift.toFixed(4),
        hypervolumeIncrease: hypervolumeIncrease.toFixed(4),
        timeWindowHours,
        rewardsAnalyzed: windowRewards.length,
      });

      return delta;
    } catch (error) {
      logger.error('Failed to calculate Pareto-aware delta', {
        error,
        timeWindowHours,
      });
      throw error;
    }
  }

  /**
   * Get current Pareto front
   */
  getCurrentParetoFront(): ParetoFront {
    return { ...this.currentParetoFront };
  }

  /**
   * Get route performance metrics
   */
  getRouteMetrics(route?: RouteType, provider?: string): RouteMetrics[] {
    const metrics: RouteMetrics[] = [];

    for (const [key, routeMetric] of this.routeMetrics) {
      if (route && routeMetric.route !== route) continue;
      if (provider && routeMetric.provider !== provider) continue;
      metrics.push({ ...routeMetric });
    }

    return metrics.sort(
      (a, b) => b.averageScores.composite - a.averageScores.composite,
    );
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): any {
    const recommendations = {
      bestRoutes: this.getBestRoutes(),
      underperformingRoutes: this.getUnderperformingRoutes(),
      weightAdjustments: this.getWeightAdjustmentSuggestions(),
      paretoInsights: this.getParetoInsights(),
      convergenceStatus: this.getConvergenceStatus(),
    };

    return recommendations;
  }

  // Private helper methods

  private calculateObjectiveScores(
    rawMetrics: any,
    context: ExecutionContext,
  ): MultiObjectiveReward['objectives'] {
    // Normalize raw metrics to 0-1 scale (higher is better)
    const latencyScore = Math.max(0, 1 - (rawMetrics.latency || 1000) / 5000); // 5s max
    const costScore = Math.max(0, 1 - (rawMetrics.cost || 1) / 10); // $10 max
    const qualityScore = Math.min(1, rawMetrics.quality || 0.5); // Direct quality score
    const reliabilityScore = Math.min(1, rawMetrics.reliability || 0.8); // Direct reliability
    const securityScore = Math.min(1, rawMetrics.security || 0.9); // Direct security

    return {
      latency: {
        value: rawMetrics.latency || 1000,
        weight: this.config.objectiveWeights.latency,
        normalized: latencyScore,
        target: this.objectiveTargets.latency,
        performance: this.getPerformanceLevel(latencyScore),
      },
      cost: {
        value: rawMetrics.cost || 1,
        weight: this.config.objectiveWeights.cost,
        normalized: costScore,
        target: this.objectiveTargets.cost,
        performance: this.getPerformanceLevel(costScore),
      },
      quality: {
        value: rawMetrics.quality || 0.5,
        weight: this.config.objectiveWeights.quality,
        normalized: qualityScore,
        target: this.objectiveTargets.quality,
        performance: this.getPerformanceLevel(qualityScore),
      },
      reliability: {
        value: rawMetrics.reliability || 0.8,
        weight: this.config.objectiveWeights.reliability,
        normalized: reliabilityScore,
        target: this.objectiveTargets.reliability,
        performance: this.getPerformanceLevel(reliabilityScore),
      },
      security: {
        value: rawMetrics.security || 0.9,
        weight: this.config.objectiveWeights.security,
        normalized: securityScore,
        target: this.objectiveTargets.security,
        performance: this.getPerformanceLevel(securityScore),
      },
    };
  }

  private getPerformanceLevel(
    score: number,
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.75) return 'good';
    if (score >= 0.5) return 'fair';
    return 'poor';
  }

  private getContextualWeights(context: ExecutionContext): any {
    const baseWeights = { ...this.config.objectiveWeights };

    // Adjust weights based on context
    switch (context.priority) {
      case 'critical':
        baseWeights.reliability *= 1.5;
        baseWeights.security *= 1.3;
        break;
      case 'high':
        baseWeights.quality *= 1.2;
        baseWeights.latency *= 1.1;
        break;
      case 'low':
        baseWeights.cost *= 1.4;
        break;
    }

    // Normalize weights to sum to 1
    const sum = Object.values(baseWeights).reduce((a, b) => a + b, 0);
    for (const key in baseWeights) {
      baseWeights[key] /= sum;
    }

    return baseWeights;
  }

  private calculateCompositeScore(
    objectives: MultiObjectiveReward['objectives'],
    weights: any,
  ): number {
    return (
      objectives.latency.normalized * weights.latency +
      objectives.cost.normalized * weights.cost +
      objectives.quality.normalized * weights.quality +
      objectives.reliability.normalized * weights.reliability +
      objectives.security.normalized * weights.security
    );
  }

  private analyzeTradeoffs(
    objectives: MultiObjectiveReward['objectives'],
  ): TradeoffAnalysis {
    const scores = {
      latency: objectives.latency.normalized,
      cost: objectives.cost.normalized,
      quality: objectives.quality.normalized,
      reliability: objectives.reliability.normalized,
      security: objectives.security.normalized,
    };

    return {
      latencyVsCost: scores.latency - scores.cost, // Positive = better latency relative to cost
      qualityVsCost: scores.quality - scores.cost, // Positive = better quality relative to cost
      securityVsLatency: scores.security - scores.latency, // Positive = better security relative to latency
      reliabilityVsLatency: scores.reliability - scores.latency, // Positive = better reliability relative to latency
      overallEfficiency:
        (scores.latency +
          scores.cost +
          scores.quality +
          scores.reliability +
          scores.security) /
        5,
    };
  }

  private async updateRouteMetrics(
    route: RouteType,
    provider: string,
    reward: MultiObjectiveReward,
  ): Promise<void> {
    const key = `${route}:${provider}`;
    let metrics = this.routeMetrics.get(key);

    if (!metrics) {
      metrics = {
        route,
        provider,
        recentRewards: [],
        averageScores: {
          latency: 0,
          cost: 0,
          quality: 0,
          reliability: 0,
          security: 0,
          composite: 0,
        },
        paretoRanking: 0,
        consistencyScore: 0,
        improvementTrend: 0,
      };
    }

    // Add reward to recent history
    metrics.recentRewards.push(reward);
    if (metrics.recentRewards.length > 50) {
      metrics.recentRewards = metrics.recentRewards.slice(-50);
    }

    // Update average scores
    const recent = metrics.recentRewards;
    metrics.averageScores = {
      latency:
        recent.reduce((sum, r) => sum + r.objectives.latency.normalized, 0) /
        recent.length,
      cost:
        recent.reduce((sum, r) => sum + r.objectives.cost.normalized, 0) /
        recent.length,
      quality:
        recent.reduce((sum, r) => sum + r.objectives.quality.normalized, 0) /
        recent.length,
      reliability:
        recent.reduce(
          (sum, r) => sum + r.objectives.reliability.normalized,
          0,
        ) / recent.length,
      security:
        recent.reduce((sum, r) => sum + r.objectives.security.normalized, 0) /
        recent.length,
      composite:
        recent.reduce((sum, r) => sum + r.compositeScore, 0) / recent.length,
    };

    // Calculate consistency score (lower variance = higher consistency)
    const compositeScores = recent.map((r) => r.compositeScore);
    const mean = metrics.averageScores.composite;
    const variance =
      compositeScores.reduce(
        (sum, score) => sum + Math.pow(score - mean, 2),
        0,
      ) / compositeScores.length;
    metrics.consistencyScore = Math.max(0, 1 - Math.sqrt(variance));

    // Calculate improvement trend
    if (recent.length >= 10) {
      const first5 =
        recent.slice(0, 5).reduce((sum, r) => sum + r.compositeScore, 0) / 5;
      const last5 =
        recent.slice(-5).reduce((sum, r) => sum + r.compositeScore, 0) / 5;
      metrics.improvementTrend = last5 - first5;
    }

    this.routeMetrics.set(key, metrics);
  }

  private async updateParetoFront(): Promise<void> {
    const recentRewards = this.rewardHistory.slice(-200); // Analyze recent 200 rewards

    // Calculate Pareto dominance relationships
    for (let i = 0; i < recentRewards.length; i++) {
      const reward1 = recentRewards[i];
      reward1.dominatedBy = [];
      reward1.dominates = [];

      for (let j = 0; j < recentRewards.length; j++) {
        if (i === j) continue;

        const reward2 = recentRewards[j];

        if (this.dominates(reward1, reward2)) {
          reward1.dominates.push(reward2.executionId);
        } else if (this.dominates(reward2, reward1)) {
          reward1.dominatedBy.push(reward2.executionId);
        }
      }

      // Calculate Pareto rank (0 = non-dominated, higher = more dominated)
      reward1.paretoRank = reward1.dominatedBy.length;
    }

    // Extract Pareto front (rank 0 solutions)
    const paretoSolutions = recentRewards.filter((r) => r.paretoRank === 0);

    // Calculate hypervolume
    const hypervolume = this.calculateHypervolume(paretoSolutions);

    // Calculate spread
    const spread = this.calculateSpread(paretoSolutions);

    // Calculate convergence
    const convergence = this.calculateConvergence(paretoSolutions);

    this.currentParetoFront = {
      solutions: paretoSolutions,
      hypervolume,
      spread,
      convergence,
      timestamp: new Date(),
    };

    this.emit('pareto_front_updated', {
      solutionCount: paretoSolutions.length,
      hypervolume,
      spread,
      convergence,
    });

    logger.debug('Pareto front updated', {
      solutionCount: paretoSolutions.length,
      hypervolume: hypervolume.toFixed(4),
      spread: spread.toFixed(4),
      convergence: convergence.toFixed(4),
    });
  }

  private dominates(
    reward1: MultiObjectiveReward,
    reward2: MultiObjectiveReward,
  ): boolean {
    // Check if reward1 dominates reward2 (better in all objectives, strictly better in at least one)
    const objectives = [
      'latency',
      'cost',
      'quality',
      'reliability',
      'security',
    ];
    let betterInAll = true;
    let strictlyBetterInOne = false;

    for (const obj of objectives) {
      const score1 = reward1.objectives[obj].normalized;
      const score2 = reward2.objectives[obj].normalized;

      if (score1 < score2) {
        betterInAll = false;
        break;
      }

      if (score1 > score2) {
        strictlyBetterInOne = true;
      }
    }

    return betterInAll && strictlyBetterInOne;
  }

  private calculateHypervolume(solutions: MultiObjectiveReward[]): number {
    if (solutions.length === 0) return 0;

    // Simplified hypervolume calculation
    // In practice, would use more sophisticated algorithms for higher dimensions
    const referencePoint = [0, 0, 0, 0, 0]; // Worst case in all objectives

    let hypervolume = 0;
    for (const solution of solutions) {
      const volume =
        solution.objectives.latency.normalized *
        solution.objectives.cost.normalized *
        solution.objectives.quality.normalized *
        solution.objectives.reliability.normalized *
        solution.objectives.security.normalized;
      hypervolume += volume;
    }

    return hypervolume / solutions.length;
  }

  private calculateSpread(solutions: MultiObjectiveReward[]): number {
    if (solutions.length < 2) return 0;

    // Calculate diversity of solutions in objective space
    const objectives = [
      'latency',
      'cost',
      'quality',
      'reliability',
      'security',
    ];
    let totalSpread = 0;

    for (const obj of objectives) {
      const values = solutions.map((s) => s.objectives[obj].normalized);
      const min = Math.min(...values);
      const max = Math.max(...values);
      totalSpread += max - min;
    }

    return totalSpread / objectives.length;
  }

  private calculateConvergence(solutions: MultiObjectiveReward[]): number {
    if (solutions.length === 0) return 0;

    // Measure how close solutions are to theoretical optimum
    const averageComposite =
      solutions.reduce((sum, s) => sum + s.compositeScore, 0) /
      solutions.length;
    const theoreticalOptimum = 1.0; // Perfect score in all objectives

    return Math.max(0, 1 - Math.abs(theoreticalOptimum - averageComposite));
  }

  private async adaptWeights(reward: MultiObjectiveReward): Promise<void> {
    // Simple adaptive weight learning based on performance feedback
    const contextKey = `${reward.context.priority}_${reward.context.requestType}`;
    const currentWeights = this.contextualWeights.get(contextKey) || {
      ...this.config.objectiveWeights,
    };

    // Adjust weights based on performance
    const adaptationRate = this.config.adaptationRate;
    const objectives = reward.objectives;

    // Increase weight for well-performing objectives, decrease for poor ones
    for (const [objName, objScore] of Object.entries(objectives)) {
      const performance = objScore.normalized;
      const currentWeight = currentWeights[objName] || 0;

      if (performance > 0.8) {
        // Good performance - slightly increase weight
        currentWeights[objName] = currentWeight + adaptationRate * 0.1;
      } else if (performance < 0.4) {
        // Poor performance - slightly decrease weight
        currentWeights[objName] = Math.max(
          0.05,
          currentWeight - adaptationRate * 0.1,
        );
      }
    }

    // Normalize weights
    const sum = Object.values(currentWeights).reduce((a, b) => a + b, 0);
    for (const key in currentWeights) {
      currentWeights[key] /= sum;
    }

    this.contextualWeights.set(contextKey, currentWeights);
  }

  private calculateParetoImprovement(
    windowRewards: MultiObjectiveReward[],
  ): number {
    // Calculate improvement in Pareto front quality
    const paretoSolutions = windowRewards.filter((r) => r.paretoRank === 0);
    const avgComposite =
      paretoSolutions.reduce((sum, r) => sum + r.compositeScore, 0) /
      Math.max(1, paretoSolutions.length);

    return Math.max(0, avgComposite - 0.7); // Baseline improvement from 0.7
  }

  private calculateDominanceShift(
    windowRewards: MultiObjectiveReward[],
  ): number {
    // Calculate shifts in dominance relationships
    let dominanceShifts = 0;

    for (let i = 0; i < windowRewards.length - 1; i++) {
      const current = windowRewards[i];
      const next = windowRewards[i + 1];

      if (current.paretoRank !== next.paretoRank) {
        dominanceShifts += Math.abs(current.paretoRank - next.paretoRank);
      }
    }

    return dominanceShifts / Math.max(1, windowRewards.length);
  }

  private calculateHypervolumeIncrease(
    windowRewards: MultiObjectiveReward[],
  ): number {
    if (windowRewards.length < 2) return 0;

    const firstHalf = windowRewards.slice(
      0,
      Math.floor(windowRewards.length / 2),
    );
    const secondHalf = windowRewards.slice(
      Math.floor(windowRewards.length / 2),
    );

    const hv1 = this.calculateHypervolume(
      firstHalf.filter((r) => r.paretoRank === 0),
    );
    const hv2 = this.calculateHypervolume(
      secondHalf.filter((r) => r.paretoRank === 0),
    );

    return hv2 - hv1;
  }

  private generateWeightRecommendations(
    windowRewards: MultiObjectiveReward[],
  ): Record<string, number> {
    const recommendations: Record<string, number> = {};
    const objectives = [
      'latency',
      'cost',
      'quality',
      'reliability',
      'security',
    ];

    for (const obj of objectives) {
      const avgPerformance =
        windowRewards.reduce(
          (sum, r) => sum + r.objectives[obj].normalized,
          0,
        ) / windowRewards.length;
      const currentWeight = this.config.objectiveWeights[obj];

      if (avgPerformance > 0.8) {
        // Good performance - could increase weight
        recommendations[obj] = currentWeight * 1.1;
      } else if (avgPerformance < 0.4) {
        // Poor performance - might decrease weight
        recommendations[obj] = currentWeight * 0.9;
      } else {
        recommendations[obj] = currentWeight;
      }
    }

    // Normalize recommendations
    const sum = Object.values(recommendations).reduce((a, b) => a + b, 0);
    for (const key in recommendations) {
      recommendations[key] /= sum;
    }

    return recommendations;
  }

  private getBestRoutes(): any[] {
    const routeMetrics = this.getRouteMetrics();
    return routeMetrics.slice(0, 3).map((r) => ({
      route: r.route,
      provider: r.provider,
      score: r.averageScores.composite,
      strengths: this.getRouteStrengths(r),
    }));
  }

  private getUnderperformingRoutes(): any[] {
    const routeMetrics = this.getRouteMetrics();
    return routeMetrics
      .filter((r) => r.averageScores.composite < 0.6)
      .map((r) => ({
        route: r.route,
        provider: r.provider,
        score: r.averageScores.composite,
        weaknesses: this.getRouteWeaknesses(r),
      }));
  }

  private getRouteStrengths(metrics: RouteMetrics): string[] {
    const strengths: string[] = [];
    const scores = metrics.averageScores;

    if (scores.latency > 0.8) strengths.push('Low Latency');
    if (scores.cost > 0.8) strengths.push('Cost Effective');
    if (scores.quality > 0.8) strengths.push('High Quality');
    if (scores.reliability > 0.8) strengths.push('Reliable');
    if (scores.security > 0.8) strengths.push('Secure');
    if (metrics.consistencyScore > 0.8) strengths.push('Consistent');

    return strengths;
  }

  private getRouteWeaknesses(metrics: RouteMetrics): string[] {
    const weaknesses: string[] = [];
    const scores = metrics.averageScores;

    if (scores.latency < 0.5) weaknesses.push('High Latency');
    if (scores.cost < 0.5) weaknesses.push('Expensive');
    if (scores.quality < 0.5) weaknesses.push('Low Quality');
    if (scores.reliability < 0.5) weaknesses.push('Unreliable');
    if (scores.security < 0.5) weaknesses.push('Security Issues');
    if (metrics.consistencyScore < 0.5) weaknesses.push('Inconsistent');

    return weaknesses;
  }

  private getWeightAdjustmentSuggestions(): Record<string, number> {
    // Generate weight adjustment suggestions based on recent performance
    const recentRewards = this.rewardHistory.slice(-50);
    return this.generateWeightRecommendations(recentRewards);
  }

  private getParetoInsights(): any {
    return {
      frontSize: this.currentParetoFront.solutions.length,
      hypervolume: this.currentParetoFront.hypervolume,
      spread: this.currentParetoFront.spread,
      convergence: this.currentParetoFront.convergence,
      dominatingRoutes: this.getDominatingRoutes(),
    };
  }

  private getDominatingRoutes(): any[] {
    const paretoSolutions = this.currentParetoFront.solutions;
    const routeCounts = new Map<string, number>();

    for (const solution of paretoSolutions) {
      const key = `${solution.route}:${solution.provider}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
    }

    return Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getConvergenceStatus(): any {
    const convergence = this.currentParetoFront.convergence;
    let status = 'poor';

    if (convergence > 0.9) status = 'excellent';
    else if (convergence > 0.7) status = 'good';
    else if (convergence > 0.5) status = 'fair';

    return {
      convergence,
      status,
      improving: convergence > 0.6,
      recommendedAction:
        convergence < 0.5
          ? 'increase_exploration'
          : 'maintain_current_strategy',
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ContextualRewardsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', { config: this.config });
    this.emit('config_updated', this.config);
  }

  /**
   * Export state for persistence
   */
  exportState(): any {
    return {
      config: this.config,
      rewardHistory: this.rewardHistory.slice(-100), // Keep recent history
      currentParetoFront: this.currentParetoFront,
      routeMetrics: Object.fromEntries(this.routeMetrics),
      contextualWeights: Object.fromEntries(this.contextualWeights),
      objectiveTargets: this.objectiveTargets,
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    this.config = state.config;
    this.rewardHistory = state.rewardHistory;
    this.currentParetoFront = state.currentParetoFront;
    this.routeMetrics = new Map(Object.entries(state.routeMetrics));
    this.contextualWeights = new Map(Object.entries(state.contextualWeights));
    this.objectiveTargets = state.objectiveTargets;

    logger.info('State imported', {
      rewardHistory: this.rewardHistory.length,
      paretoSolutions: this.currentParetoFront.solutions.length,
      routeMetrics: this.routeMetrics.size,
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ContextualRewardsV2');
    this.removeAllListeners();
    logger.info('ContextualRewardsV2 shutdown complete');
  }
}

export default ContextualRewardsV2;
