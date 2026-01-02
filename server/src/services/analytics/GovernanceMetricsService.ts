// @ts-nocheck
/**
 * Governance Metrics Service
 *
 * Provides analytics and metrics for governance verdicts, policy effectiveness,
 * and compliance monitoring.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module services/analytics/GovernanceMetricsService
 */

import { Pool } from 'pg';
import { createDataEnvelope, DataEnvelope, GovernanceResult } from '../../types/data-envelope.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface VerdictDistribution {
  allow: number;
  deny: number;
  escalate: number;
  warn: number;
  total: number;
  period: string;
}

export interface VerdictTrend {
  date: string;
  allow: number;
  deny: number;
  escalate: number;
  warn: number;
}

export interface PolicyEffectiveness {
  policyId: string;
  policyName: string;
  triggerCount: number;
  denyRate: number;
  escalateRate: number;
  averageLatencyMs: number;
  lastTriggered: string | null;
}

export interface AnomalyEvent {
  id: string;
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  description: string;
  detectedAt: string;
  value: number;
  baseline: number;
  deviation: number;
}

export interface MetricsSummary {
  verdictDistribution: VerdictDistribution;
  topPolicies: PolicyEffectiveness[];
  recentAnomalies: AnomalyEvent[];
  healthScore: number;
  lastUpdated: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

// ============================================================================
// Service Implementation
// ============================================================================

export class GovernanceMetricsService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  }

  /**
   * Get verdict distribution for a time period
   */
  async getVerdictDistribution(
    tenantId: string,
    timeRange: TimeRange,
    actorId: string
  ): Promise<DataEnvelope<VerdictDistribution>> {
    try {
      const result = await this.pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE verdict = 'ALLOW') as allow,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as deny,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalate,
          COUNT(*) FILTER (WHERE verdict = 'WARN') as warn,
          COUNT(*) as total
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`,
        [tenantId, timeRange.start, timeRange.end]
      );

      const row = result.rows[0] || { allow: 0, deny: 0, escalate: 0, warn: 0, total: 0 };

      return createDataEnvelope(
        {
          allow: parseInt(row.allow, 10) || 0,
          deny: parseInt(row.deny, 10) || 0,
          escalate: parseInt(row.escalate, 10) || 0,
          warn: parseInt(row.warn, 10) || 0,
          total: parseInt(row.total, 10) || 0,
          period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
        },
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Verdict distribution retrieved',
          evaluator: 'GovernanceMetricsService',
        }
      );
    } catch (error: any) {
      logger.error('Error getting verdict distribution:', error);
      // Return empty data on error
      return createDataEnvelope(
        {
          allow: 0,
          deny: 0,
          escalate: 0,
          warn: 0,
          total: 0,
          period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
        },
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Verdict distribution (empty - no data)',
          evaluator: 'GovernanceMetricsService',
        }
      );
    }
  }

  /**
   * Get verdict trends over time
   */
  async getVerdictTrends(
    tenantId: string,
    timeRange: TimeRange,
    actorId: string
  ): Promise<DataEnvelope<VerdictTrend[]>> {
    try {
      const dateFormat = this.getDateFormat(timeRange.granularity);

      const result = await this.pool.query(
        `SELECT
          to_char(created_at, $4) as date,
          COUNT(*) FILTER (WHERE verdict = 'ALLOW') as allow,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as deny,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalate,
          COUNT(*) FILTER (WHERE verdict = 'WARN') as warn
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY to_char(created_at, $4)
        ORDER BY date`,
        [tenantId, timeRange.start, timeRange.end, dateFormat]
      );

      const trends: VerdictTrend[] = result.rows.map((row: any) => ({
        date: row.date,
        allow: parseInt(row.allow, 10) || 0,
        deny: parseInt(row.deny, 10) || 0,
        escalate: parseInt(row.escalate, 10) || 0,
        warn: parseInt(row.warn, 10) || 0,
      }));

      return createDataEnvelope(
        trends,
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Verdict trends retrieved',
          evaluator: 'GovernanceMetricsService',
        }
      );
    } catch (error: any) {
      logger.error('Error getting verdict trends:', error);
      return createDataEnvelope(
        [],
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Verdict trends (empty - no data)',
          evaluator: 'GovernanceMetricsService',
        }
      );
    }
  }

  /**
   * Get policy effectiveness metrics
   */
  async getPolicyEffectiveness(
    tenantId: string,
    timeRange: TimeRange,
    limit: number = 10,
    actorId: string
  ): Promise<DataEnvelope<PolicyEffectiveness[]>> {
    try {
      const result = await this.pool.query(
        `SELECT
          policy_id,
          policy_name,
          COUNT(*) as trigger_count,
          ROUND(
            COUNT(*) FILTER (WHERE verdict = 'DENY')::numeric / NULLIF(COUNT(*), 0) * 100, 2
          ) as deny_rate,
          ROUND(
            COUNT(*) FILTER (WHERE verdict = 'ESCALATE')::numeric / NULLIF(COUNT(*), 0) * 100, 2
          ) as escalate_rate,
          ROUND(AVG(latency_ms), 2) as avg_latency,
          MAX(created_at) as last_triggered
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY policy_id, policy_name
        ORDER BY trigger_count DESC
        LIMIT $4`,
        [tenantId, timeRange.start, timeRange.end, limit]
      );

      const policies: PolicyEffectiveness[] = result.rows.map((row: any) => ({
        policyId: row.policy_id,
        policyName: row.policy_name || row.policy_id,
        triggerCount: parseInt(row.trigger_count, 10),
        denyRate: parseFloat(row.deny_rate) || 0,
        escalateRate: parseFloat(row.escalate_rate) || 0,
        averageLatencyMs: parseFloat(row.avg_latency) || 0,
        lastTriggered: row.last_triggered?.toISOString() || null,
      }));

      return createDataEnvelope(
        policies,
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Policy effectiveness metrics retrieved',
          evaluator: 'GovernanceMetricsService',
        }
      );
    } catch (error: any) {
      logger.error('Error getting policy effectiveness:', error);
      return createDataEnvelope(
        [],
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Policy effectiveness (empty - no data)',
          evaluator: 'GovernanceMetricsService',
        }
      );
    }
  }

  /**
   * Detect anomalies in governance metrics
   */
  async detectAnomalies(
    tenantId: string,
    timeRange: TimeRange,
    actorId: string
  ): Promise<DataEnvelope<AnomalyEvent[]>> {
    try {
      const anomalies: AnomalyEvent[] = [];

      // Get current period stats
      const currentStats = await this.pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as denies,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalates
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`,
        [tenantId, timeRange.start, timeRange.end]
      );

      // Get previous period stats for comparison
      const periodMs = timeRange.end.getTime() - timeRange.start.getTime();
      const prevStart = new Date(timeRange.start.getTime() - periodMs);
      const prevEnd = timeRange.start;

      const prevStats = await this.pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as denies,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalates
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`,
        [tenantId, prevStart, prevEnd]
      );

      const current = currentStats.rows[0] || { total: 0, denies: 0, escalates: 0 };
      const prev = prevStats.rows[0] || { total: 0, denies: 0, escalates: 0 };

      // Check for significant changes (>50% deviation)
      const totalChange = prev.total > 0
        ? ((current.total - prev.total) / prev.total) * 100
        : 0;

      if (Math.abs(totalChange) > 50) {
        anomalies.push({
          id: `anomaly-${Date.now()}-total`,
          type: totalChange > 0 ? 'spike' : 'drop',
          severity: Math.abs(totalChange) > 100 ? 'high' : 'medium',
          metric: 'total_verdicts',
          description: `${totalChange > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(totalChange).toFixed(1)}% in total verdicts`,
          detectedAt: new Date().toISOString(),
          value: parseInt(current.total, 10),
          baseline: parseInt(prev.total, 10),
          deviation: totalChange,
        });
      }

      // Check deny rate changes
      const denyRate = current.total > 0 ? (current.denies / current.total) * 100 : 0;
      const prevDenyRate = prev.total > 0 ? (prev.denies / prev.total) * 100 : 0;
      const denyRateChange = denyRate - prevDenyRate;

      if (Math.abs(denyRateChange) > 10) {
        anomalies.push({
          id: `anomaly-${Date.now()}-deny`,
          type: 'pattern',
          severity: denyRateChange > 20 ? 'high' : 'medium',
          metric: 'deny_rate',
          description: `Deny rate ${denyRateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(denyRateChange).toFixed(1)} percentage points`,
          detectedAt: new Date().toISOString(),
          value: denyRate,
          baseline: prevDenyRate,
          deviation: denyRateChange,
        });
      }

      return createDataEnvelope(
        anomalies,
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Anomaly detection completed',
          evaluator: 'GovernanceMetricsService',
        }
      );
    } catch (error: any) {
      logger.error('Error detecting anomalies:', error);
      return createDataEnvelope(
        [],
        { source: 'GovernanceMetricsService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'analytics-read',
          reason: 'Anomaly detection (empty - no data)',
          evaluator: 'GovernanceMetricsService',
        }
      );
    }
  }

  /**
   * Get summary metrics for dashboard
   */
  async getMetricsSummary(
    tenantId: string,
    timeRange: TimeRange,
    actorId: string
  ): Promise<DataEnvelope<MetricsSummary>> {
    const [distribution, policies, anomalies] = await Promise.all([
      this.getVerdictDistribution(tenantId, timeRange, actorId),
      this.getPolicyEffectiveness(tenantId, timeRange, 5, actorId),
      this.detectAnomalies(tenantId, timeRange, actorId),
    ]);

    // Calculate health score based on metrics
    const denyRate = distribution.data.total > 0
      ? (distribution.data.deny / distribution.data.total) * 100
      : 0;
    const escalateRate = distribution.data.total > 0
      ? (distribution.data.escalate / distribution.data.total) * 100
      : 0;
    const criticalAnomalies = anomalies.data.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

    let healthScore = 100;
    healthScore -= Math.min(denyRate * 2, 30); // Up to -30 for high deny rate
    healthScore -= Math.min(escalateRate * 3, 20); // Up to -20 for high escalate rate
    healthScore -= criticalAnomalies * 10; // -10 per critical anomaly
    healthScore = Math.max(0, Math.min(100, healthScore));

    return createDataEnvelope(
      {
        verdictDistribution: distribution.data,
        topPolicies: policies.data,
        recentAnomalies: anomalies.data,
        healthScore: Math.round(healthScore),
        lastUpdated: new Date().toISOString(),
      },
      { source: 'GovernanceMetricsService', actor: actorId },
      {
        result: GovernanceResult.ALLOW,
        policyId: 'analytics-read',
        reason: 'Metrics summary retrieved',
        evaluator: 'GovernanceMetricsService',
      }
    );
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private getDateFormat(granularity: TimeRange['granularity']): string {
    switch (granularity) {
      case 'hour': return 'YYYY-MM-DD HH24:00';
      case 'day': return 'YYYY-MM-DD';
      case 'week': return 'IYYY-IW';
      case 'month': return 'YYYY-MM';
      default: return 'YYYY-MM-DD';
    }
  }
}

// Export singleton instance
export const governanceMetricsService = new GovernanceMetricsService();
export default GovernanceMetricsService;
