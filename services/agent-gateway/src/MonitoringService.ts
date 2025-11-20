/**
 * Monitoring Service
 * AGENT-16: Continuous Safety Monitoring
 * Provides dashboards and alerts for agent activity
 */

import type { AgentMetrics, AgentHealthStatus, AgentAlert, QuotaCheck } from './types.js';
import { QuotaManager } from './QuotaManager.js';

export interface MonitoringThresholds {
  errorRateWarning: number; // e.g., 0.1 = 10%
  errorRateCritical: number; // e.g., 0.25 = 25%
  quotaUtilizationWarning: number; // e.g., 0.8 = 80%
  quotaUtilizationCritical: number; // e.g., 0.95 = 95%
  policyViolationsPerDayWarning: number;
  policyViolationsPerDayCritical: number;
  highRiskActionsPerDayWarning: number;
}

export class MonitoringService {
  private thresholds: MonitoringThresholds = {
    errorRateWarning: 0.1,
    errorRateCritical: 0.25,
    quotaUtilizationWarning: 0.8,
    quotaUtilizationCritical: 0.95,
    policyViolationsPerDayWarning: 10,
    policyViolationsPerDayCritical: 50,
    highRiskActionsPerDayWarning: 20,
  };

  constructor(
    private db: any,
    private quotaManager: QuotaManager,
    thresholds?: Partial<MonitoringThresholds>
  ) {
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * Get health status for all agents
   * AGENT-16b: Dashboards
   */
  async getAllAgentsHealth(): Promise<AgentHealthStatus[]> {
    const agents = await this.db.query(
      `SELECT id, name, status FROM agents WHERE deleted_at IS NULL AND status = 'active'`
    );

    const healthStatuses = await Promise.all(
      agents.rows.map((agent: any) => this.getAgentHealth(agent.id))
    );

    return healthStatuses;
  }

  /**
   * Get health status for a specific agent
   */
  async getAgentHealth(agentId: string): Promise<AgentHealthStatus> {
    // Get agent info
    const agentResult = await this.db.query(
      'SELECT id, name, status FROM agents WHERE id = $1',
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const agent = agentResult.rows[0];

    // Get last 24 hours metrics
    const metricsResult = await this.db.query(
      `SELECT * FROM agent_metrics
       WHERE agent_id = $1
       AND metric_date >= CURRENT_DATE - INTERVAL '1 day'
       AND metric_hour IS NULL
       ORDER BY metric_date DESC
       LIMIT 1`,
      [agentId]
    );

    const metrics = metricsResult.rows[0];

    // Calculate last 24 hours summary
    const last24Hours = metrics
      ? {
          runs: metrics.runs_total,
          successRate:
            metrics.runs_total > 0
              ? (metrics.runs_successful / metrics.runs_total) * 100
              : 100,
          errorRate:
            metrics.runs_total > 0 ? (metrics.runs_failed / metrics.runs_total) * 100 : 0,
          avgDurationMs: parseFloat(metrics.avg_duration_ms || '0'),
        }
      : {
          runs: 0,
          successRate: 100,
          errorRate: 0,
          avgDurationMs: 0,
        };

    // Get quotas
    const quotas = await this.quotaManager.getQuotaStatus(agentId);

    // Get last run time
    const lastRunResult = await this.db.query(
      `SELECT started_at FROM agent_runs
       WHERE agent_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [agentId]
    );

    const lastRunAt = lastRunResult.rows[0]?.started_at;

    // Generate alerts
    const alerts = this.generateAlerts(agent, metrics, quotas, last24Hours);

    // Determine overall health
    const health = this.determineHealth(alerts, last24Hours);

    return {
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      health,
      lastRunAt,
      last24Hours,
      quotas,
      alerts,
    };
  }

  /**
   * Generate alerts based on thresholds
   * AGENT-16c: Alert configuration
   */
  private generateAlerts(
    agent: any,
    metrics: any,
    quotas: QuotaCheck[],
    last24Hours: any
  ): AgentAlert[] {
    const alerts: AgentAlert[] = [];

    // Check error rate
    const errorRate = last24Hours.errorRate / 100;
    if (errorRate >= this.thresholds.errorRateCritical) {
      alerts.push({
        severity: 'critical',
        message: `Critical error rate: ${last24Hours.errorRate.toFixed(1)}%`,
        details: { errorRate, threshold: this.thresholds.errorRateCritical },
        timestamp: new Date(),
      });
    } else if (errorRate >= this.thresholds.errorRateWarning) {
      alerts.push({
        severity: 'warning',
        message: `High error rate: ${last24Hours.errorRate.toFixed(1)}%`,
        details: { errorRate, threshold: this.thresholds.errorRateWarning },
        timestamp: new Date(),
      });
    }

    // Check quota utilization
    quotas.forEach(quota => {
      const utilization = quota.used / quota.limit;
      if (utilization >= this.thresholds.quotaUtilizationCritical) {
        alerts.push({
          severity: 'critical',
          message: `${quota.quotaType} quota almost exhausted: ${(utilization * 100).toFixed(1)}%`,
          details: { quota, utilization },
          timestamp: new Date(),
        });
      } else if (utilization >= this.thresholds.quotaUtilizationWarning) {
        alerts.push({
          severity: 'warning',
          message: `${quota.quotaType} quota high: ${(utilization * 100).toFixed(1)}%`,
          details: { quota, utilization },
          timestamp: new Date(),
        });
      }
    });

    // Check policy violations
    if (metrics) {
      if (metrics.policy_violations >= this.thresholds.policyViolationsPerDayCritical) {
        alerts.push({
          severity: 'critical',
          message: `Excessive policy violations: ${metrics.policy_violations}`,
          details: { violations: metrics.policy_violations },
          timestamp: new Date(),
        });
      } else if (metrics.policy_violations >= this.thresholds.policyViolationsPerDayWarning) {
        alerts.push({
          severity: 'warning',
          message: `High policy violations: ${metrics.policy_violations}`,
          details: { violations: metrics.policy_violations },
          timestamp: new Date(),
        });
      }

      // Check high-risk actions
      if (metrics.high_risk_actions >= this.thresholds.highRiskActionsPerDayWarning) {
        alerts.push({
          severity: 'warning',
          message: `High number of high-risk actions: ${metrics.high_risk_actions}`,
          details: { highRiskActions: metrics.high_risk_actions },
          timestamp: new Date(),
        });
      }
    }

    // Check agent status
    if (agent.status === 'suspended') {
      alerts.push({
        severity: 'error',
        message: 'Agent is suspended',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Determine overall health status
   */
  private determineHealth(
    alerts: AgentAlert[],
    last24Hours: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasError = alerts.some(a => a.severity === 'error');
    const hasWarning = alerts.some(a => a.severity === 'warning');

    if (hasCritical || hasError) {
      return 'unhealthy';
    }

    if (hasWarning || last24Hours.errorRate > 5) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get metrics for a date range
   */
  async getMetrics(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AgentMetrics[]> {
    const result = await this.db.query(
      `SELECT * FROM agent_metrics
       WHERE agent_id = $1
       AND metric_date >= $2
       AND metric_date <= $3
       AND metric_hour IS NULL
       ORDER BY metric_date DESC`,
      [agentId, startDate, endDate]
    );

    return result.rows.map(this.mapRowToMetrics);
  }

  /**
   * Get hourly metrics for a specific date
   */
  async getHourlyMetrics(agentId: string, date: Date): Promise<AgentMetrics[]> {
    const result = await this.db.query(
      `SELECT * FROM agent_metrics
       WHERE agent_id = $1
       AND metric_date = $2
       AND metric_hour IS NOT NULL
       ORDER BY metric_hour ASC`,
      [agentId, date]
    );

    return result.rows.map(this.mapRowToMetrics);
  }

  /**
   * Get aggregate metrics across all agents
   */
  async getAggregateMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalPolicyViolations: number;
    totalHighRiskActions: number;
    avgSuccessRate: number;
  }> {
    const result = await this.db.query(
      `SELECT
         SUM(runs_total) as total_runs,
         SUM(runs_successful) as successful_runs,
         SUM(runs_failed) as failed_runs,
         SUM(policy_violations) as total_policy_violations,
         SUM(high_risk_actions) as total_high_risk_actions,
         AVG(CASE WHEN runs_total > 0 THEN runs_successful::float / runs_total ELSE 0 END) as avg_success_rate
       FROM agent_metrics
       WHERE metric_date >= $1
       AND metric_date <= $2
       AND metric_hour IS NULL`,
      [startDate, endDate]
    );

    const row = result.rows[0];
    return {
      totalRuns: parseInt(row.total_runs || '0'),
      successfulRuns: parseInt(row.successful_runs || '0'),
      failedRuns: parseInt(row.failed_runs || '0'),
      totalPolicyViolations: parseInt(row.total_policy_violations || '0'),
      totalHighRiskActions: parseInt(row.total_high_risk_actions || '0'),
      avgSuccessRate: parseFloat(row.avg_success_rate || '0') * 100,
    };
  }

  /**
   * Get top agents by activity
   */
  async getTopAgents(
    metric: 'runs' | 'errors' | 'policy_violations',
    limit: number = 10
  ): Promise<Array<{ agentId: string; agentName: string; value: number }>> {
    const metricColumn =
      metric === 'runs'
        ? 'runs_total'
        : metric === 'errors'
        ? 'runs_failed'
        : 'policy_violations';

    const result = await this.db.query(
      `SELECT
         a.id as agent_id,
         a.name as agent_name,
         SUM(m.${metricColumn}) as value
       FROM agents a
       JOIN agent_metrics m ON a.id = m.agent_id
       WHERE m.metric_date >= CURRENT_DATE - INTERVAL '7 days'
       AND m.metric_hour IS NULL
       GROUP BY a.id, a.name
       ORDER BY value DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row: any) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      value: parseInt(row.value || '0'),
    }));
  }

  /**
   * Get recent high-risk actions across all agents
   */
  async getRecentHighRiskActions(limit: number = 50): Promise<any[]> {
    const result = await this.db.query(
      `SELECT
         a.id as agent_id,
         a.name as agent_name,
         aa.action_type,
         aa.action_target,
         aa.risk_level,
         aa.authorization_status,
         aa.created_at
       FROM agent_actions aa
       JOIN agents a ON aa.agent_id = a.id
       WHERE aa.risk_level IN ('high', 'critical')
       ORDER BY aa.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const aggregate = await this.getAggregateMetrics(startDate, endDate);
    const topByRuns = await this.getTopAgents('runs', 5);
    const topByErrors = await this.getTopAgents('errors', 5);
    const topByViolations = await this.getTopAgents('policy_violations', 5);
    const highRiskActions = await this.getRecentHighRiskActions(20);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: aggregate,
      topAgents: {
        byRuns: topByRuns,
        byErrors: topByErrors,
        byPolicyViolations: topByViolations,
      },
      recentHighRiskActions: highRiskActions,
      generatedAt: new Date(),
    };
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToMetrics(row: any): AgentMetrics {
    return {
      id: row.id,
      agentId: row.agent_id,
      metricDate: row.metric_date,
      metricHour: row.metric_hour,
      runsTotal: row.runs_total,
      runsSuccessful: row.runs_successful,
      runsFailed: row.runs_failed,
      runsCancelled: row.runs_cancelled,
      actionsProposed: row.actions_proposed,
      actionsExecuted: row.actions_executed,
      actionsDenied: row.actions_denied,
      highRiskActions: row.high_risk_actions,
      criticalRiskActions: row.critical_risk_actions,
      policyViolations: row.policy_violations,
      avgDurationMs: parseFloat(row.avg_duration_ms || '0'),
      minDurationMs: row.min_duration_ms,
      maxDurationMs: row.max_duration_ms,
      totalTokensConsumed: parseInt(row.total_tokens_consumed || '0'),
      totalApiCalls: parseInt(row.total_api_calls || '0'),
      errorRate: parseFloat(row.error_rate || '0'),
      errorsByType: JSON.parse(row.errors_by_type || '{}'),
      createdAt: row.created_at,
    };
  }
}
