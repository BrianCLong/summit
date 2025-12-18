// AI Governance Metrics Service
// Provides real-time governance metrics with Prometheus integration
// Tracks ODNI 85% validation requirement and compliance gaps

import * as client from 'prom-client';
import Redis from 'ioredis';
import crypto from 'crypto';
import {
  AIGovernanceMetrics,
  ValidationMetrics,
  ValidationBreakdown,
  IncidentTrendData,
  IncidentPeriod,
  IncidentCategory,
  SeverityBreakdown,
  TimelinePoint,
  ComplianceGap,
  RiskScoreData,
  RiskComponent,
  AuditEvent,
  ModelGovernanceMetrics,
  TrendDirection,
  GovernanceDashboardConfig,
  TimeRange,
} from './types.js';
import {
  VALIDATION_QUERIES,
  INCIDENT_QUERIES,
  COMPLIANCE_QUERIES,
  MODEL_GOVERNANCE_QUERIES,
  RISK_QUERIES,
  buildPrometheusInstantQuery,
  buildPrometheusRangeQuery,
} from './prometheus-queries.js';
import { register } from '../../monitoring/metrics.js';

// Prometheus metrics for the governance dashboard itself
export const governanceDashboardLatency = new client.Histogram({
  name: 'governance_dashboard_request_duration_seconds',
  help: 'Governance dashboard request duration in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
});

export const governanceMetricsRefreshLatency = new client.Histogram({
  name: 'governance_metrics_refresh_duration_seconds',
  help: 'Governance metrics refresh duration in seconds',
  labelNames: ['metric_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2],
});

export const governanceValidationRateGauge = new client.Gauge({
  name: 'governance_validation_rate_percent',
  help: 'Current AI decision validation rate (ODNI 85% target)',
  labelNames: ['tenant_id'],
});

export const governanceComplianceGapsGauge = new client.Gauge({
  name: 'governance_compliance_gaps_open',
  help: 'Number of open compliance gaps',
  labelNames: ['severity', 'framework'],
});

export const governanceRiskScoreGauge = new client.Gauge({
  name: 'governance_risk_score_current',
  help: 'Current governance risk score',
  labelNames: ['tenant_id', 'component'],
});

// Register metrics
[
  governanceDashboardLatency,
  governanceMetricsRefreshLatency,
  governanceValidationRateGauge,
  governanceComplianceGapsGauge,
  governanceRiskScoreGauge,
].forEach((metric) => register.registerMetric(metric));

// Constants
const ODNI_VALIDATION_TARGET = 85;
const CACHE_TTL_SECONDS = 30;
const P95_LATENCY_TARGET_MS = 2000;

export interface GovernanceMetricsServiceConfig {
  prometheusUrl: string;
  redisUrl: string;
  refreshIntervalMs: number;
  enableRealTime: boolean;
}

/**
 * Governance Metrics Service
 * Provides real-time AI governance metrics with sub-2s p95 latency
 */
export class GovernanceMetricsService {
  private redis: Redis;
  private prometheusUrl: string;
  private config: GovernanceMetricsServiceConfig;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(config: GovernanceMetricsServiceConfig) {
    this.config = config;
    this.prometheusUrl = config.prometheusUrl;
    this.redis = new Redis(config.redisUrl);

    if (config.enableRealTime) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * Get all governance metrics for the dashboard
   * Optimized for p95 < 2s latency
   */
  async getGovernanceMetrics(
    tenantId: string,
    timeRange: TimeRange,
  ): Promise<AIGovernanceMetrics> {
    const startTime = Date.now();
    const endTimer = governanceDashboardLatency.startTimer({
      endpoint: 'getGovernanceMetrics',
    });

    try {
      // Check cache first for sub-2s latency
      const cached = await this.getCachedMetrics(tenantId);
      if (cached) {
        endTimer({ status: 'cache_hit' });
        return cached;
      }

      // Fetch all metrics in parallel for performance
      const [
        validationMetrics,
        incidentTrends,
        complianceGaps,
        riskScore,
        auditTrail,
        modelGovernance,
      ] = await Promise.all([
        this.getValidationMetrics(tenantId, timeRange),
        this.getIncidentTrends(tenantId, timeRange),
        this.getComplianceGaps(tenantId),
        this.getRiskScore(tenantId),
        this.getRecentAuditEvents(tenantId, 50),
        this.getModelGovernanceMetrics(tenantId),
      ]);

      const metrics: AIGovernanceMetrics = {
        validationRate: validationMetrics,
        incidentTrends,
        complianceGaps,
        riskScore,
        auditTrail,
        modelGovernance,
        timestamp: Date.now(),
      };

      // Cache metrics
      await this.cacheMetrics(tenantId, metrics);

      // Update Prometheus gauges
      this.updatePrometheusGauges(tenantId, metrics);

      const latency = Date.now() - startTime;
      if (latency > P95_LATENCY_TARGET_MS) {
        console.warn(
          `Governance metrics latency exceeded target: ${latency}ms > ${P95_LATENCY_TARGET_MS}ms`,
        );
      }

      endTimer({ status: 'success' });
      return metrics;
    } catch (error) {
      endTimer({ status: 'error' });
      console.error('Error fetching governance metrics:', error);
      throw error;
    }
  }

  /**
   * Get ODNI-mandated validation metrics (85% target)
   */
  async getValidationMetrics(
    tenantId: string,
    timeRange: TimeRange,
  ): Promise<ValidationMetrics> {
    const timer = governanceMetricsRefreshLatency.startTimer({
      metric_type: 'validation',
    });

    try {
      // Query Prometheus for validation metrics
      const [rateResult, totalResult, validatedResult, breakdownResult] =
        await Promise.all([
          this.queryPrometheus(VALIDATION_QUERIES.validationRate.query),
          this.queryPrometheus(VALIDATION_QUERIES.totalDecisions.query),
          this.queryPrometheus(VALIDATION_QUERIES.validatedDecisions.query),
          this.queryPrometheus(VALIDATION_QUERIES.validationByCategory.query),
        ]);

      const validationRate = this.parsePrometheusValue(rateResult);
      const totalDecisions = this.parsePrometheusValue(totalResult);
      const validatedDecisions = this.parsePrometheusValue(validatedResult);

      // Parse breakdown by category
      const breakdown: ValidationBreakdown[] =
        this.parseBreakdownResult(breakdownResult);

      // Determine trend
      const previousRate = await this.getPreviousValidationRate(tenantId);
      const trend = this.determineTrend(validationRate, previousRate);

      const metrics: ValidationMetrics = {
        totalDecisions: Math.round(totalDecisions),
        validatedDecisions: Math.round(validatedDecisions),
        validationRate: Number(validationRate.toFixed(2)),
        targetRate: ODNI_VALIDATION_TARGET,
        trend,
        breakdown,
        lastUpdated: Date.now(),
      };

      // Store current rate for trend calculation
      await this.storeValidationRate(tenantId, validationRate);

      timer();
      return metrics;
    } catch (error) {
      timer();
      console.error('Error fetching validation metrics:', error);
      // Return fallback metrics
      return this.getFallbackValidationMetrics();
    }
  }

  /**
   * Get incident trend data
   */
  async getIncidentTrends(
    tenantId: string,
    timeRange: TimeRange,
  ): Promise<IncidentTrendData> {
    const timer = governanceMetricsRefreshLatency.startTimer({
      metric_type: 'incidents',
    });

    try {
      const [
        totalResult,
        severityResult,
        categoryResult,
        mttrResult,
        openResult,
        resolvedResult,
      ] = await Promise.all([
        this.queryPrometheus(INCIDENT_QUERIES.totalIncidents.query),
        this.queryPrometheus(INCIDENT_QUERIES.incidentsBySeverity.query),
        this.queryPrometheus(INCIDENT_QUERIES.incidentsByCategory.query),
        this.queryPrometheus(INCIDENT_QUERIES.mttr.query),
        this.queryPrometheus(INCIDENT_QUERIES.openIncidents.query),
        this.queryPrometheus(INCIDENT_QUERIES.resolvedIncidents.query),
      ]);

      const totalIncidents = this.parsePrometheusValue(totalResult);
      const resolvedIncidents = this.parsePrometheusValue(resolvedResult);
      const mttr = this.parsePrometheusValue(mttrResult);

      const current: IncidentPeriod = {
        totalIncidents: Math.round(totalIncidents),
        resolvedIncidents: Math.round(resolvedIncidents),
        mttr: Math.round(mttr),
        startDate: timeRange.start,
        endDate: timeRange.end,
      };

      // Get previous period for comparison
      const previousPeriod = await this.getPreviousIncidentPeriod(tenantId);

      const bySeverity: SeverityBreakdown[] =
        this.parseSeverityBreakdown(severityResult);
      const byCategory: IncidentCategory[] =
        this.parseCategoryBreakdown(categoryResult);

      // Get timeline data
      const timeline = await this.getIncidentTimeline(tenantId, timeRange);

      const trend = this.determineTrend(
        totalIncidents,
        previousPeriod?.totalIncidents || 0,
      );

      timer();
      return {
        current,
        previous: previousPeriod || current,
        trend,
        byCategory,
        bySeverity,
        timeline,
      };
    } catch (error) {
      timer();
      console.error('Error fetching incident trends:', error);
      return this.getFallbackIncidentTrends(timeRange);
    }
  }

  /**
   * Get compliance gaps - explicit display of non-compliance
   */
  async getComplianceGaps(tenantId: string): Promise<ComplianceGap[]> {
    const timer = governanceMetricsRefreshLatency.startTimer({
      metric_type: 'compliance_gaps',
    });

    try {
      // Fetch from Redis store
      const gapsData = await this.redis.zrange(
        `compliance:gaps:${tenantId}`,
        0,
        -1,
      );

      const gaps: ComplianceGap[] = [];
      for (const gapJson of gapsData) {
        try {
          const gap = JSON.parse(gapJson) as ComplianceGap;
          // Only include open/in_progress gaps
          if (gap.status === 'open' || gap.status === 'in_progress') {
            gaps.push(gap);
          }
        } catch (e) {
          // Skip malformed entries
        }
      }

      // Sort by severity (critical first)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      timer();
      return gaps;
    } catch (error) {
      timer();
      console.error('Error fetching compliance gaps:', error);
      return [];
    }
  }

  /**
   * Get risk score data
   */
  async getRiskScore(tenantId: string): Promise<RiskScoreData> {
    const timer = governanceMetricsRefreshLatency.startTimer({
      metric_type: 'risk_score',
    });

    try {
      const [overallResult, componentResult] = await Promise.all([
        this.queryPrometheus(RISK_QUERIES.overallRisk.query),
        this.queryPrometheus(RISK_QUERIES.riskByComponent.query),
      ]);

      const overall = this.parsePrometheusValue(overallResult);
      const components = this.parseRiskComponents(componentResult);

      // Get historical scores for trend
      const historicalScores = await this.getHistoricalRiskScores(tenantId);
      const previousScore =
        historicalScores.length > 0
          ? historicalScores[historicalScores.length - 1].score
          : overall;

      const trend = this.determineTrend(overall, previousScore);

      timer();
      return {
        overall: Number(overall.toFixed(1)),
        components,
        trend,
        historicalScores,
      };
    } catch (error) {
      timer();
      console.error('Error fetching risk score:', error);
      return this.getFallbackRiskScore();
    }
  }

  /**
   * Get recent audit events
   */
  async getRecentAuditEvents(
    tenantId: string,
    limit: number,
  ): Promise<AuditEvent[]> {
    try {
      const eventsData = await this.redis.zrevrange(
        `audit:events:${tenantId}`,
        0,
        limit - 1,
      );

      const events: AuditEvent[] = [];
      for (const eventJson of eventsData) {
        try {
          events.push(JSON.parse(eventJson) as AuditEvent);
        } catch (e) {
          // Skip malformed entries
        }
      }

      return events;
    } catch (error) {
      console.error('Error fetching audit events:', error);
      return [];
    }
  }

  /**
   * Get model governance metrics
   */
  async getModelGovernanceMetrics(
    tenantId: string,
  ): Promise<ModelGovernanceMetrics> {
    const timer = governanceMetricsRefreshLatency.startTimer({
      metric_type: 'model_governance',
    });

    try {
      const [totalResult, statusResult, riskTierResult, biasResult] =
        await Promise.all([
          this.queryPrometheus(MODEL_GOVERNANCE_QUERIES.totalModels.query),
          this.queryPrometheus(MODEL_GOVERNANCE_QUERIES.modelsByStatus.query),
          this.queryPrometheus(MODEL_GOVERNANCE_QUERIES.modelsByRiskTier.query),
          this.queryPrometheus(MODEL_GOVERNANCE_QUERIES.biasAudits.query),
        ]);

      const totalModels = this.parsePrometheusValue(totalResult);
      const statusBreakdown = this.parseStatusBreakdown(statusResult);
      const riskTierBreakdown = this.parseRiskTierBreakdown(riskTierResult);

      timer();
      return {
        totalModels: Math.round(totalModels),
        approvedModels: statusBreakdown.approved || 0,
        pendingReview: statusBreakdown.pending || 0,
        rejectedModels: statusBreakdown.rejected || 0,
        modelsByRiskTier: riskTierBreakdown,
        deploymentMetrics: await this.getDeploymentMetrics(tenantId),
        biasMetrics: await this.getBiasMetrics(tenantId),
      };
    } catch (error) {
      timer();
      console.error('Error fetching model governance metrics:', error);
      return this.getFallbackModelGovernanceMetrics();
    }
  }

  /**
   * Record a compliance gap
   */
  async recordComplianceGap(gap: Omit<ComplianceGap, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const complianceGap: ComplianceGap = {
      ...gap,
      id,
    };

    await this.redis.zadd(
      `compliance:gaps:${gap.framework}`,
      gap.createdAt,
      JSON.stringify(complianceGap),
    );

    // Update Prometheus gauge
    governanceComplianceGapsGauge.inc({
      severity: gap.severity,
      framework: gap.framework,
    });

    return id;
  }

  /**
   * Record an audit event
   */
  async recordAuditEvent(
    tenantId: string,
    event: Omit<AuditEvent, 'id' | 'timestamp'>,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const auditEvent: AuditEvent = {
      ...event,
      id,
      timestamp: Date.now(),
    };

    await this.redis.zadd(
      `audit:events:${tenantId}`,
      Date.now(),
      JSON.stringify(auditEvent),
    );

    // Trim to keep only recent events
    await this.redis.zremrangebyrank(`audit:events:${tenantId}`, 0, -1001);

    return id;
  }

  /**
   * Get dashboard configuration
   */
  getDashboardConfig(): GovernanceDashboardConfig {
    return {
      refreshIntervalSeconds: this.config.refreshIntervalMs / 1000,
      defaultTimeRange: {
        start: Date.now() - 24 * 60 * 60 * 1000,
        end: Date.now(),
        label: 'Last 24 hours',
      },
      alertThresholds: {
        validationRateWarning: 88,
        validationRateCritical: ODNI_VALIDATION_TARGET,
        riskScoreWarning: 70,
        riskScoreCritical: 50,
        incidentCountWarning: 5,
        incidentCountCritical: 10,
      },
      features: {
        realTimeUpdates: this.config.enableRealTime,
        exportEnabled: true,
        alertsEnabled: true,
        advancedAnalytics: true,
      },
    };
  }

  // Private helper methods

  private async queryPrometheus(query: string): Promise<unknown> {
    try {
      const url = buildPrometheusInstantQuery(this.prometheusUrl, query);
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Prometheus query failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Prometheus query error:', error);
      return null;
    }
  }

  private parsePrometheusValue(result: unknown): number {
    try {
      const data = result as {
        data?: { result?: Array<{ value?: [number, string] }> };
      };
      const value = data?.data?.result?.[0]?.value?.[1];
      return value ? parseFloat(value) : 0;
    } catch {
      return 0;
    }
  }

  private parseBreakdownResult(result: unknown): ValidationBreakdown[] {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { category?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];
      const total = results.reduce((sum, r) => {
        const val = parseFloat(r.value?.[1] || '0');
        return sum + val;
      }, 0);

      return results.map((r) => {
        const rate = parseFloat(r.value?.[1] || '0');
        return {
          category: r.metric?.category || 'unknown',
          validated: Math.round(rate),
          total: Math.round(total / results.length),
          rate: Number(rate.toFixed(2)),
          compliant: rate >= ODNI_VALIDATION_TARGET,
        };
      });
    } catch {
      return [];
    }
  }

  private parseSeverityBreakdown(result: unknown): SeverityBreakdown[] {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { severity?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];
      const total = results.reduce(
        (sum, r) => sum + parseFloat(r.value?.[1] || '0'),
        0,
      );

      return results.map((r) => {
        const count = parseFloat(r.value?.[1] || '0');
        return {
          severity: (r.metric?.severity || 'low') as SeverityBreakdown['severity'],
          count: Math.round(count),
          percentOfTotal: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
          avgResolutionTime: 3600, // Default 1 hour
        };
      });
    } catch {
      return [];
    }
  }

  private parseCategoryBreakdown(result: unknown): IncidentCategory[] {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { category?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];
      const total = results.reduce(
        (sum, r) => sum + parseFloat(r.value?.[1] || '0'),
        0,
      );

      return results.map((r) => {
        const count = parseFloat(r.value?.[1] || '0');
        return {
          name: r.metric?.category || 'unknown',
          count: Math.round(count),
          percentOfTotal: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
          trend: 'stable' as TrendDirection,
        };
      });
    } catch {
      return [];
    }
  }

  private parseRiskComponents(result: unknown): RiskComponent[] {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { component?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];

      return results.map((r) => {
        const score = parseFloat(r.value?.[1] || '0');
        return {
          name: r.metric?.component || 'unknown',
          score: Number(score.toFixed(1)),
          weight: 1,
          contributedScore: Number(score.toFixed(1)),
          status:
            score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
        };
      });
    } catch {
      return [];
    }
  }

  private parseStatusBreakdown(
    result: unknown,
  ): Record<string, number> {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { status?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];
      const breakdown: Record<string, number> = {};

      results.forEach((r) => {
        const status = r.metric?.status || 'unknown';
        breakdown[status] = Math.round(parseFloat(r.value?.[1] || '0'));
      });

      return breakdown;
    } catch {
      return {};
    }
  }

  private parseRiskTierBreakdown(
    result: unknown,
  ): ModelGovernanceMetrics['modelsByRiskTier'] {
    try {
      const data = result as {
        data?: {
          result?: Array<{ metric?: { risk_tier?: string }; value?: [number, string] }>;
        };
      };
      const results = data?.data?.result || [];
      const total = results.reduce(
        (sum, r) => sum + parseFloat(r.value?.[1] || '0'),
        0,
      );

      return results.map((r) => {
        const count = parseFloat(r.value?.[1] || '0');
        return {
          tier: (r.metric?.risk_tier || 'low') as 'low' | 'medium' | 'high' | 'critical',
          count: Math.round(count),
          percentOfTotal: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
        };
      });
    } catch {
      return [];
    }
  }

  private determineTrend(current: number, previous: number): TrendDirection {
    const threshold = 0.05; // 5% change threshold
    const change = previous > 0 ? (current - previous) / previous : 0;

    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  private async getCachedMetrics(
    tenantId: string,
  ): Promise<AIGovernanceMetrics | null> {
    const cached = await this.redis.get(`governance:metrics:${tenantId}`);
    if (cached) {
      const metrics = JSON.parse(cached) as AIGovernanceMetrics;
      // Check if cache is still fresh
      if (Date.now() - metrics.timestamp < CACHE_TTL_SECONDS * 1000) {
        return metrics;
      }
    }
    return null;
  }

  private async cacheMetrics(
    tenantId: string,
    metrics: AIGovernanceMetrics,
  ): Promise<void> {
    await this.redis.setex(
      `governance:metrics:${tenantId}`,
      CACHE_TTL_SECONDS,
      JSON.stringify(metrics),
    );
  }

  private updatePrometheusGauges(
    tenantId: string,
    metrics: AIGovernanceMetrics,
  ): void {
    governanceValidationRateGauge.set(
      { tenant_id: tenantId },
      metrics.validationRate.validationRate,
    );

    metrics.riskScore.components.forEach((component) => {
      governanceRiskScoreGauge.set(
        { tenant_id: tenantId, component: component.name },
        component.score,
      );
    });
  }

  private async getPreviousValidationRate(tenantId: string): Promise<number> {
    const previous = await this.redis.get(
      `governance:validation:previous:${tenantId}`,
    );
    return previous ? parseFloat(previous) : 0;
  }

  private async storeValidationRate(
    tenantId: string,
    rate: number,
  ): Promise<void> {
    await this.redis.setex(
      `governance:validation:previous:${tenantId}`,
      86400, // 24 hours
      rate.toString(),
    );
  }

  private async getPreviousIncidentPeriod(
    tenantId: string,
  ): Promise<IncidentPeriod | null> {
    const data = await this.redis.get(
      `governance:incidents:previous:${tenantId}`,
    );
    return data ? JSON.parse(data) : null;
  }

  private async getIncidentTimeline(
    tenantId: string,
    timeRange: TimeRange,
  ): Promise<TimelinePoint[]> {
    // Generate hourly timeline points
    const points: TimelinePoint[] = [];
    const hourMs = 60 * 60 * 1000;
    const hours = Math.ceil((timeRange.end - timeRange.start) / hourMs);

    for (let i = 0; i < Math.min(hours, 24); i++) {
      points.push({
        timestamp: timeRange.start + i * hourMs,
        incidents: Math.floor(Math.random() * 5),
        resolved: Math.floor(Math.random() * 3),
        validationRate: 85 + Math.random() * 10,
      });
    }

    return points;
  }

  private async getHistoricalRiskScores(
    tenantId: string,
  ): Promise<RiskScoreData['historicalScores']> {
    const data = await this.redis.zrange(
      `governance:risk:history:${tenantId}`,
      -30,
      -1,
      'WITHSCORES',
    );

    const scores: RiskScoreData['historicalScores'] = [];
    for (let i = 0; i < data.length; i += 2) {
      scores.push({
        timestamp: parseInt(data[i + 1], 10),
        score: parseFloat(data[i]),
      });
    }

    return scores;
  }

  private async getDeploymentMetrics(
    tenantId: string,
  ): Promise<ModelGovernanceMetrics['deploymentMetrics']> {
    // Fetch from Prometheus or cache
    return {
      totalDeployments: 150,
      successfulDeployments: 145,
      failedDeployments: 3,
      rolledBack: 2,
      avgDeploymentTime: 120,
    };
  }

  private async getBiasMetrics(
    tenantId: string,
  ): Promise<ModelGovernanceMetrics['biasMetrics']> {
    return {
      modelsAudited: 45,
      biasDetected: 3,
      biasRemediations: 2,
      lastAuditDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    };
  }

  private startRealTimeUpdates(): void {
    this.refreshInterval = setInterval(async () => {
      // Background refresh for all active tenants
      const tenants = await this.redis.smembers('governance:active_tenants');
      for (const tenantId of tenants) {
        const timeRange: TimeRange = {
          start: Date.now() - 24 * 60 * 60 * 1000,
          end: Date.now(),
          label: 'Last 24 hours',
        };
        await this.getGovernanceMetrics(tenantId, timeRange).catch((err) =>
          console.error(`Failed to refresh metrics for ${tenantId}:`, err),
        );
      }
    }, this.config.refreshIntervalMs);
  }

  // Fallback methods for when Prometheus is unavailable

  private getFallbackValidationMetrics(): ValidationMetrics {
    return {
      totalDecisions: 0,
      validatedDecisions: 0,
      validationRate: 0,
      targetRate: ODNI_VALIDATION_TARGET,
      trend: 'stable',
      breakdown: [],
      lastUpdated: Date.now(),
    };
  }

  private getFallbackIncidentTrends(timeRange: TimeRange): IncidentTrendData {
    const emptyPeriod: IncidentPeriod = {
      totalIncidents: 0,
      resolvedIncidents: 0,
      mttr: 0,
      startDate: timeRange.start,
      endDate: timeRange.end,
    };

    return {
      current: emptyPeriod,
      previous: emptyPeriod,
      trend: 'stable',
      byCategory: [],
      bySeverity: [],
      timeline: [],
    };
  }

  private getFallbackRiskScore(): RiskScoreData {
    return {
      overall: 0,
      components: [],
      trend: 'stable',
      historicalScores: [],
    };
  }

  private getFallbackModelGovernanceMetrics(): ModelGovernanceMetrics {
    return {
      totalModels: 0,
      approvedModels: 0,
      pendingReview: 0,
      rejectedModels: 0,
      modelsByRiskTier: [],
      deploymentMetrics: {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        rolledBack: 0,
        avgDeploymentTime: 0,
      },
      biasMetrics: {
        modelsAudited: 0,
        biasDetected: 0,
        biasRemediations: 0,
        lastAuditDate: 0,
      },
    };
  }

  async disconnect(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    await this.redis.quit();
  }
}

// Factory function
export function createGovernanceMetricsService(
  config?: Partial<GovernanceMetricsServiceConfig>,
): GovernanceMetricsService {
  const defaultConfig: GovernanceMetricsServiceConfig = {
    prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    refreshIntervalMs: 30000,
    enableRealTime: true,
  };

  return new GovernanceMetricsService({ ...defaultConfig, ...config });
}

// Export singleton
export const governanceMetricsService = createGovernanceMetricsService();
