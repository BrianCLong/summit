/**
 * Tripwire Metrics and Trending Service
 *
 * Tracks and analyzes tripwire violations over time to demonstrate
 * continuous improvement in data minimization practices.
 *
 * Features:
 * - Daily/weekly/monthly aggregation of metrics
 * - Trend analysis showing reduction in violations
 * - Reason-for-access compliance tracking
 * - Automated metrics calculation and storage
 */

import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { getRedisClient } from '../db/redis.js';
import { getPostgresPool } from '../db/postgres.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TripwireTrendMetric {
  id?: string;
  tenantId: string;

  // Time period
  metricDate: Date;
  periodType: 'daily' | 'weekly' | 'monthly';

  // Metrics
  totalQueries: number;
  tripwireViolations: number;
  violationRate: number; // violations / total
  avgExpansionRatio: number;
  p95ExpansionRatio: number;

  // Trends (vs previous period)
  violationRateChange: number;
  avgExpansionChange: number;

  // Reason compliance
  queriesRequiringReason: number;
  reasonsProvided: number;
  reasonComplianceRate: number;
}

export interface TrendAnalysis {
  tenantId: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;

  // Improvement metrics
  initialViolationRate: number;
  currentViolationRate: number;
  totalReduction: number; // percentage points
  percentageImprovement: number; // percentage of initial

  // Consistency
  consecutivePeriodsBelowThreshold: number;
  isImproving: boolean; // based on trend line

  // Forecasting
  projectedViolationRate: number; // for next period
  timeToZeroViolations?: number; // periods until <1% violation rate
}

// ============================================================================
// Service Implementation
// ============================================================================

export class TripwireMetricsService {
  private circuitBreaker: CircuitBreaker;
  private redis: any;
  private postgres: any;

  // Thresholds
  private readonly TARGET_VIOLATION_RATE = 0.01; // 1% or less is acceptable

  constructor() {
    this.circuitBreaker = new CircuitBreaker('TripwireMetricsService', {
      failureThreshold: 5,
      resetTimeout: 60000,
    });

    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    try {
      this.redis = await getRedisClient();
      this.postgres = getPostgresPool();
    } catch (error) {
      logger.error('Failed to initialize TripwireMetricsService connections', { error });
      throw error;
    }
  }

  // ==========================================================================
  // Metrics Calculation
  // ==========================================================================

  /**
   * Calculate and store metrics for a specific period
   */
  async calculateMetrics(
    tenantId: string,
    metricDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Promise<TripwireTrendMetric> {
    try {
      return await this.circuitBreaker.execute(async () => {
        logger.info('Calculating tripwire metrics', { tenantId, metricDate, periodType });

        const { periodStart, periodEnd } = this.getPeriodBounds(metricDate, periodType);

        // Calculate current period metrics
        const currentMetrics = await this.calculatePeriodMetrics(
          tenantId,
          periodStart,
          periodEnd
        );

        // Get previous period for trend calculation
        const previousPeriod = this.getPreviousPeriod(metricDate, periodType);
        const previousMetrics = await this.loadMetric(tenantId, previousPeriod, periodType);

        // Calculate trends
        const violationRateChange = previousMetrics
          ? currentMetrics.violationRate - previousMetrics.violationRate
          : 0;

        const avgExpansionChange = previousMetrics
          ? currentMetrics.avgExpansionRatio - previousMetrics.avgExpansionRatio
          : 0;

        const metric: TripwireTrendMetric = {
          tenantId,
          metricDate,
          periodType,
          ...currentMetrics,
          violationRateChange,
          avgExpansionChange,
        };

        // Store metric
        await this.storeMetric(metric);

        logger.info('Tripwire metrics calculated', {
          tenantId,
          violationRate: metric.violationRate,
          trend: violationRateChange < 0 ? 'improving' : 'worsening',
        });

        return metric;
      });
    } catch (error) {
      logger.error('Failed to calculate tripwire metrics', { error, tenantId });
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific period
   */
  private async calculatePeriodMetrics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Omit<TripwireTrendMetric, 'id' | 'tenantId' | 'metricDate' | 'periodType' | 'violationRateChange' | 'avgExpansionChange'>> {
    const query = `
      SELECT
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE tripwire_triggered = TRUE) as tripwire_violations,
        AVG(expansion_ratio) as avg_expansion_ratio,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY expansion_ratio) as p95_expansion_ratio,
        COUNT(*) FILTER (WHERE reason_required = TRUE) as queries_requiring_reason,
        COUNT(*) FILTER (WHERE reason_required = TRUE AND reason_provided = TRUE) as reasons_provided
      FROM query_scope_metrics
      WHERE tenant_id = $1
        AND executed_at BETWEEN $2 AND $3
    `;

    const result = await this.postgres.query(query, [tenantId, periodStart, periodEnd]);
    const row = result.rows[0];

    const totalQueries = parseInt(row.total_queries) || 0;
    const tripwireViolations = parseInt(row.tripwire_violations) || 0;
    const queriesRequiringReason = parseInt(row.queries_requiring_reason) || 0;
    const reasonsProvided = parseInt(row.reasons_provided) || 0;

    return {
      totalQueries,
      tripwireViolations,
      violationRate: totalQueries > 0 ? tripwireViolations / totalQueries : 0,
      avgExpansionRatio: parseFloat(row.avg_expansion_ratio) || 0,
      p95ExpansionRatio: parseFloat(row.p95_expansion_ratio) || 0,
      queriesRequiringReason,
      reasonsProvided,
      reasonComplianceRate:
        queriesRequiringReason > 0 ? reasonsProvided / queriesRequiringReason : 1.0,
    };
  }

  /**
   * Calculate daily metrics for all tenants (scheduled job)
   */
  async calculateDailyMetricsForAllTenants(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Get all active tenants
    const tenants = await this.getActiveTenants();

    for (const tenantId of tenants) {
      try {
        await this.calculateMetrics(tenantId, yesterday, 'daily');
      } catch (error) {
        logger.error('Failed to calculate daily metrics for tenant', { error, tenantId });
        // Continue with other tenants
      }
    }

    logger.info('Daily metrics calculated for all tenants', { count: tenants.length });
  }

  /**
   * Calculate weekly metrics (scheduled job)
   */
  async calculateWeeklyMetrics(tenantId: string): Promise<void> {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    await this.calculateMetrics(tenantId, lastWeek, 'weekly');
  }

  /**
   * Calculate monthly metrics (scheduled job)
   */
  async calculateMonthlyMetrics(tenantId: string): Promise<void> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);

    await this.calculateMetrics(tenantId, lastMonth, 'monthly');
  }

  // ==========================================================================
  // Trend Analysis
  // ==========================================================================

  /**
   * Analyze trends over time
   */
  async analyzeTrends(
    tenantId: string,
    periodType: 'daily' | 'weekly' | 'monthly',
    lookbackPeriods: number = 30
  ): Promise<TrendAnalysis> {
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, periodType, lookbackPeriods);

    // Get metrics for the period
    const metrics = await this.getMetrics(tenantId, periodType, startDate, endDate);

    if (metrics.length < 2) {
      throw new Error('Insufficient data for trend analysis');
    }

    // Calculate initial and current rates
    const initialMetric = metrics[0];
    const currentMetric = metrics[metrics.length - 1];

    const initialViolationRate = initialMetric.violationRate;
    const currentViolationRate = currentMetric.violationRate;

    const totalReduction = initialViolationRate - currentViolationRate;
    const percentageImprovement =
      initialViolationRate > 0 ? (totalReduction / initialViolationRate) * 100 : 0;

    // Calculate consecutive periods below threshold
    let consecutivePeriodsBelowThreshold = 0;
    for (let i = metrics.length - 1; i >= 0; i--) {
      if (metrics[i].violationRate <= this.TARGET_VIOLATION_RATE) {
        consecutivePeriodsBelowThreshold++;
      } else {
        break;
      }
    }

    // Simple linear regression for trend
    const trendAnalysis = this.calculateLinearTrend(
      metrics.map((m, i) => ({ x: i, y: m.violationRate }))
    );

    const isImproving = trendAnalysis.slope < 0; // Negative slope = improving

    // Forecast next period
    const projectedViolationRate = Math.max(
      0,
      trendAnalysis.slope * metrics.length + trendAnalysis.intercept
    );

    // Calculate time to zero violations
    let timeToZeroViolations: number | undefined;
    if (isImproving && trendAnalysis.slope < 0) {
      const periodsToTarget =
        (this.TARGET_VIOLATION_RATE - currentViolationRate) / trendAnalysis.slope;
      timeToZeroViolations = Math.ceil(periodsToTarget);
    }

    return {
      tenantId,
      periodType,
      startDate,
      endDate,
      initialViolationRate,
      currentViolationRate,
      totalReduction,
      percentageImprovement,
      consecutivePeriodsBelowThreshold,
      isImproving,
      projectedViolationRate,
      timeToZeroViolations,
    };
  }

  /**
   * Simple linear regression
   */
  private calculateLinearTrend(points: { x: number; y: number }[]): {
    slope: number;
    intercept: number;
  } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Get improvement dashboard data
   */
  async getImprovementDashboard(
    tenantId: string
  ): Promise<{
    daily: TrendAnalysis;
    weekly: TrendAnalysis;
    monthly: TrendAnalysis;
    summary: {
      currentDailyViolationRate: number;
      targetViolationRate: number;
      onTrack: boolean;
      daysConsecutiveCompliance: number;
    };
  }> {
    const [daily, weekly, monthly] = await Promise.all([
      this.analyzeTrends(tenantId, 'daily', 30),
      this.analyzeTrends(tenantId, 'weekly', 12),
      this.analyzeTrends(tenantId, 'monthly', 12),
    ]);

    const summary = {
      currentDailyViolationRate: daily.currentViolationRate,
      targetViolationRate: this.TARGET_VIOLATION_RATE,
      onTrack: daily.isImproving && daily.currentViolationRate <= this.TARGET_VIOLATION_RATE * 2,
      daysConsecutiveCompliance: daily.consecutivePeriodsBelowThreshold,
    };

    return { daily, weekly, monthly, summary };
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  /**
   * Store metric
   */
  private async storeMetric(metric: TripwireTrendMetric): Promise<void> {
    const query = `
      INSERT INTO tripwire_trend_metrics (
        tenant_id, metric_date, period_type,
        total_queries, tripwire_violations, violation_rate,
        avg_expansion_ratio, p95_expansion_ratio,
        violation_rate_change, avg_expansion_change,
        queries_requiring_reason, reasons_provided, reason_compliance_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (tenant_id, metric_date, period_type)
      DO UPDATE SET
        total_queries = EXCLUDED.total_queries,
        tripwire_violations = EXCLUDED.tripwire_violations,
        violation_rate = EXCLUDED.violation_rate,
        avg_expansion_ratio = EXCLUDED.avg_expansion_ratio,
        p95_expansion_ratio = EXCLUDED.p95_expansion_ratio,
        violation_rate_change = EXCLUDED.violation_rate_change,
        avg_expansion_change = EXCLUDED.avg_expansion_change,
        queries_requiring_reason = EXCLUDED.queries_requiring_reason,
        reasons_provided = EXCLUDED.reasons_provided,
        reason_compliance_rate = EXCLUDED.reason_compliance_rate
    `;

    await this.postgres.query(query, [
      metric.tenantId,
      metric.metricDate,
      metric.periodType,
      metric.totalQueries,
      metric.tripwireViolations,
      metric.violationRate,
      metric.avgExpansionRatio,
      metric.p95ExpansionRatio,
      metric.violationRateChange,
      metric.avgExpansionChange,
      metric.queriesRequiringReason,
      metric.reasonsProvided,
      metric.reasonComplianceRate,
    ]);
  }

  /**
   * Load specific metric
   */
  private async loadMetric(
    tenantId: string,
    metricDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Promise<TripwireTrendMetric | null> {
    const query = `
      SELECT * FROM tripwire_trend_metrics
      WHERE tenant_id = $1
        AND metric_date = $2
        AND period_type = $3
    `;

    const result = await this.postgres.query(query, [tenantId, metricDate, periodType]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMetric(result.rows[0]);
  }

  /**
   * Get metrics for a date range
   */
  async getMetrics(
    tenantId: string,
    periodType: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<TripwireTrendMetric[]> {
    const query = `
      SELECT * FROM tripwire_trend_metrics
      WHERE tenant_id = $1
        AND period_type = $2
        AND metric_date BETWEEN $3 AND $4
      ORDER BY metric_date ASC
    `;

    const result = await this.postgres.query(query, [tenantId, periodType, startDate, endDate]);
    return result.rows.map(this.mapRowToMetric);
  }

  /**
   * Get active tenants
   */
  private async getActiveTenants(): Promise<string[]> {
    const query = `
      SELECT DISTINCT tenant_id
      FROM query_scope_metrics
      WHERE executed_at > NOW() - INTERVAL '7 days'
    `;

    const result = await this.postgres.query(query);
    return result.rows.map((row) => row.tenant_id);
  }

  /**
   * Map database row to metric
   */
  private mapRowToMetric(row: any): TripwireTrendMetric {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      metricDate: new Date(row.metric_date),
      periodType: row.period_type,
      totalQueries: parseInt(row.total_queries),
      tripwireViolations: parseInt(row.tripwire_violations),
      violationRate: parseFloat(row.violation_rate),
      avgExpansionRatio: parseFloat(row.avg_expansion_ratio),
      p95ExpansionRatio: parseFloat(row.p95_expansion_ratio),
      violationRateChange: parseFloat(row.violation_rate_change),
      avgExpansionChange: parseFloat(row.avg_expansion_change),
      queriesRequiringReason: parseInt(row.queries_requiring_reason),
      reasonsProvided: parseInt(row.reasons_provided),
      reasonComplianceRate: parseFloat(row.reason_compliance_rate),
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get period bounds for a given date and period type
   */
  private getPeriodBounds(
    date: Date,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(date);
    const periodEnd = new Date(date);

    switch (periodType) {
      case 'daily':
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        // Start of week (Sunday)
        const dayOfWeek = periodStart.getDay();
        periodStart.setDate(periodStart.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month
        periodEnd.setHours(23, 59, 59, 999);
        break;
    }

    return { periodStart, periodEnd };
  }

  /**
   * Get previous period date
   */
  private getPreviousPeriod(date: Date, periodType: 'daily' | 'weekly' | 'monthly'): Date {
    const previous = new Date(date);

    switch (periodType) {
      case 'daily':
        previous.setDate(previous.getDate() - 1);
        break;
      case 'weekly':
        previous.setDate(previous.getDate() - 7);
        break;
      case 'monthly':
        previous.setMonth(previous.getMonth() - 1);
        break;
    }

    return previous;
  }

  /**
   * Get start date for lookback period
   */
  private getStartDate(
    endDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly',
    lookbackPeriods: number
  ): Date {
    const startDate = new Date(endDate);

    switch (periodType) {
      case 'daily':
        startDate.setDate(startDate.getDate() - lookbackPeriods);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - lookbackPeriods * 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - lookbackPeriods);
        break;
    }

    return startDate;
  }
}

// Singleton instance
export const tripwireMetricsService = new TripwireMetricsService();
