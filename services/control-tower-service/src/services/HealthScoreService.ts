/**
 * Health Score Service - Calculates and manages operational health scores
 * @module @intelgraph/control-tower-service/services/HealthScoreService
 */

import type {
  HealthScore,
  HealthScoreComponent,
  HealthScoreDataPoint,
  HealthFactor,
  TrendDirection,
  ComponentStatus,
  ServiceContext,
} from '../types/index.js';

export interface MetricsProvider {
  getSupportMetrics(): Promise<{ openTickets: number; avgResponseTime: number; csat: number }>;
  getRevenueMetrics(): Promise<{ mrrAtRisk: number; churnRate: number; nps: number }>;
  getProductMetrics(): Promise<{ errorRate: number; latency: number; uptime: number }>;
  getTeamMetrics(): Promise<{ utilization: number; burnout: number; sentiment: number }>;
}

export interface HealthScoreRepository {
  saveScore(score: HealthScore): Promise<void>;
  getHistory(period: string, resolution: string): Promise<HealthScoreDataPoint[]>;
  getLastScore(): Promise<HealthScore | null>;
}

export class HealthScoreService {
  private readonly componentWeights: Record<string, number> = {
    support: 0.25,
    revenue: 0.30,
    product: 0.25,
    team: 0.20,
  };

  constructor(
    private readonly metricsProvider: MetricsProvider,
    private readonly repository: HealthScoreRepository,
  ) {}

  /**
   * Calculate current health score
   */
  async calculateHealthScore(context?: ServiceContext): Promise<HealthScore> {
    // Get all component scores in parallel
    const [supportComponent, revenueComponent, productComponent, teamComponent] = await Promise.all([
      this.calculateSupportHealth(),
      this.calculateRevenueHealth(),
      this.calculateProductHealth(),
      this.calculateTeamHealth(),
    ]);

    const components = [supportComponent, revenueComponent, productComponent, teamComponent];

    // Calculate weighted overall score
    const overallScore = Math.round(
      components.reduce((sum, comp) => sum + comp.score * comp.weight, 0)
    );

    // Get previous score for comparison
    const previousScore = await this.repository.getLastScore();
    const change = previousScore ? overallScore - previousScore.score : 0;
    const trend = this.determineTrend(change);

    const healthScore: HealthScore = {
      score: overallScore,
      trend,
      change,
      comparisonPeriod: 'yesterday',
      components,
      calculatedAt: new Date(),
    };

    // Save for history
    await this.repository.saveScore(healthScore);

    return healthScore;
  }

  /**
   * Get historical health scores
   */
  async getHealthScoreHistory(
    period: string = '7d',
    resolution: string = '1h',
    context?: ServiceContext,
  ): Promise<HealthScoreDataPoint[]> {
    return this.repository.getHistory(period, resolution);
  }

  // ============================================================================
  // Component Calculators
  // ============================================================================

  private async calculateSupportHealth(): Promise<HealthScoreComponent> {
    const metrics = await this.metricsProvider.getSupportMetrics();

    const factors: HealthFactor[] = [
      {
        name: 'Open Tickets',
        value: metrics.openTickets,
        warningThreshold: 50,
        criticalThreshold: 100,
        impact: this.calculateFactorImpact(metrics.openTickets, 50, 100, true),
      },
      {
        name: 'Avg Response Time',
        value: metrics.avgResponseTime,
        warningThreshold: 2, // hours
        criticalThreshold: 4,
        impact: this.calculateFactorImpact(metrics.avgResponseTime, 2, 4, true),
      },
      {
        name: 'CSAT Score',
        value: metrics.csat,
        warningThreshold: 85,
        criticalThreshold: 70,
        impact: this.calculateFactorImpact(metrics.csat, 85, 70, false),
      },
    ];

    const score = this.calculateComponentScore(factors);
    const status = this.determineStatus(score);

    return {
      name: 'Support',
      score,
      status,
      factors,
      weight: this.componentWeights.support,
    };
  }

  private async calculateRevenueHealth(): Promise<HealthScoreComponent> {
    const metrics = await this.metricsProvider.getRevenueMetrics();

    const factors: HealthFactor[] = [
      {
        name: 'MRR at Risk',
        value: metrics.mrrAtRisk,
        warningThreshold: 50000,
        criticalThreshold: 100000,
        impact: this.calculateFactorImpact(metrics.mrrAtRisk, 50000, 100000, true),
      },
      {
        name: 'Churn Rate',
        value: metrics.churnRate,
        warningThreshold: 2,
        criticalThreshold: 5,
        impact: this.calculateFactorImpact(metrics.churnRate, 2, 5, true),
      },
      {
        name: 'NPS',
        value: metrics.nps,
        warningThreshold: 50,
        criticalThreshold: 30,
        impact: this.calculateFactorImpact(metrics.nps, 50, 30, false),
      },
    ];

    const score = this.calculateComponentScore(factors);
    const status = this.determineStatus(score);

    return {
      name: 'Revenue',
      score,
      status,
      factors,
      weight: this.componentWeights.revenue,
    };
  }

  private async calculateProductHealth(): Promise<HealthScoreComponent> {
    const metrics = await this.metricsProvider.getProductMetrics();

    const factors: HealthFactor[] = [
      {
        name: 'Error Rate',
        value: metrics.errorRate,
        warningThreshold: 0.5,
        criticalThreshold: 1,
        impact: this.calculateFactorImpact(metrics.errorRate, 0.5, 1, true),
      },
      {
        name: 'P95 Latency',
        value: metrics.latency,
        warningThreshold: 500,
        criticalThreshold: 1000,
        impact: this.calculateFactorImpact(metrics.latency, 500, 1000, true),
      },
      {
        name: 'Uptime',
        value: metrics.uptime,
        warningThreshold: 99.9,
        criticalThreshold: 99,
        impact: this.calculateFactorImpact(metrics.uptime, 99.9, 99, false),
      },
    ];

    const score = this.calculateComponentScore(factors);
    const status = this.determineStatus(score);

    return {
      name: 'Product',
      score,
      status,
      factors,
      weight: this.componentWeights.product,
    };
  }

  private async calculateTeamHealth(): Promise<HealthScoreComponent> {
    const metrics = await this.metricsProvider.getTeamMetrics();

    const factors: HealthFactor[] = [
      {
        name: 'Utilization',
        value: metrics.utilization,
        warningThreshold: 85,
        criticalThreshold: 95,
        impact: this.calculateFactorImpact(metrics.utilization, 85, 95, true),
      },
      {
        name: 'Burnout Risk',
        value: metrics.burnout,
        warningThreshold: 30,
        criticalThreshold: 50,
        impact: this.calculateFactorImpact(metrics.burnout, 30, 50, true),
      },
      {
        name: 'Team Sentiment',
        value: metrics.sentiment,
        warningThreshold: 70,
        criticalThreshold: 50,
        impact: this.calculateFactorImpact(metrics.sentiment, 70, 50, false),
      },
    ];

    const score = this.calculateComponentScore(factors);
    const status = this.determineStatus(score);

    return {
      name: 'Team',
      score,
      status,
      factors,
      weight: this.componentWeights.team,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateFactorImpact(
    value: number,
    warningThreshold: number,
    criticalThreshold: number,
    higherIsBad: boolean,
  ): number {
    // Returns impact on score (0-100, where 100 is fully healthy)
    if (higherIsBad) {
      if (value >= criticalThreshold) return 0;
      if (value >= warningThreshold) {
        return 50 * (1 - (value - warningThreshold) / (criticalThreshold - warningThreshold));
      }
      return 100 * (1 - value / warningThreshold) + 50;
    } else {
      if (value <= criticalThreshold) return 0;
      if (value <= warningThreshold) {
        return 50 * ((value - criticalThreshold) / (warningThreshold - criticalThreshold));
      }
      return 100;
    }
  }

  private calculateComponentScore(factors: HealthFactor[]): number {
    if (factors.length === 0) return 100;

    const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
    return Math.round(totalImpact / factors.length);
  }

  private determineStatus(score: number): ComponentStatus {
    if (score >= 80) return ComponentStatus.HEALTHY;
    if (score >= 60) return ComponentStatus.WARNING;
    if (score >= 0) return ComponentStatus.CRITICAL;
    return ComponentStatus.UNKNOWN;
  }

  private determineTrend(change: number): TrendDirection {
    if (change > 2) return TrendDirection.UP;
    if (change < -2) return TrendDirection.DOWN;
    return TrendDirection.STABLE;
  }
}
