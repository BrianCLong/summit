/**
 * Transparency Report Service
 *
 * Generates customer-facing transparency reports for explainability data.
 * These reports are safe to share externally and provide high-level insights
 * without exposing sensitive implementation details.
 */

import { v4 as uuidv4 } from 'uuid';
import { query as timescaleQuery } from '../db/timescale.js';
import logger from '../utils/logger.js';

export interface TransparencyReportFilter {
  tenant_id: string;
  start_date: string;
  end_date: string;
  run_type?: string;
}

export interface TransparencyReport {
  report_id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  summary: ReportSummary;
  run_statistics: RunStatistics;
  confidence_metrics: ConfidenceMetrics;
  policy_compliance: PolicyCompliance;
  capabilities_overview: CapabilitiesOverview;
  transparency_score: number;
}

export interface ReportSummary {
  total_runs: number;
  successful_runs: number;
  average_duration_ms: number;
  unique_actors: number;
  run_types_breakdown: Record<string, number>;
}

export interface RunStatistics {
  by_type: Record<string, number>;
  by_actor_type: Record<string, number>;
  by_day: Array<{ date: string; count: number }>;
  peak_hour: string;
}

export interface ConfidenceMetrics {
  average_confidence: number;
  high_confidence_runs: number; // >= 0.8
  medium_confidence_runs: number; // 0.5-0.8
  low_confidence_runs: number; // < 0.5
  average_evidence_count: number;
  source_reliability_distribution: Record<string, number>;
}

export interface PolicyCompliance {
  total_policy_evaluations: number;
  allow_decisions: number;
  deny_decisions: number;
  require_approval_decisions: number;
  compliance_rate: number;
  top_policies: Array<{ policy_name: string; evaluations: number; approval_rate: number }>;
}

export interface CapabilitiesOverview {
  total_capabilities_used: number;
  top_capabilities: Array<{ capability: string; usage_count: number }>;
  capability_distribution: Record<string, number>;
}

/**
 * Service for generating transparency reports.
 */
export class TransparencyReportService {
  private static instance: TransparencyReportService;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): TransparencyReportService {
    if (!TransparencyReportService.instance) {
      TransparencyReportService.instance = new TransparencyReportService();
    }
    return TransparencyReportService.instance;
  }

  /**
   * Generate transparency report for a given period.
   */
  async generateReport(filter: TransparencyReportFilter): Promise<TransparencyReport> {
    const reportId = uuidv4();
    const generatedAt = new Date().toISOString();

    logger.info({
      message: 'Generating transparency report',
      report_id: reportId,
      tenant_id: filter.tenant_id,
      period: `${filter.start_date} to ${filter.end_date}`,
    });

    try {
      const summary = await this.generateSummary(filter);
      const runStatistics = await this.generateRunStatistics(filter);
      const confidenceMetrics = await this.generateConfidenceMetrics(filter);
      const policyCompliance = await this.generatePolicyCompliance(filter);
      const capabilitiesOverview = await this.generateCapabilitiesOverview(filter);

      // Calculate transparency score (0-100)
      const transparencyScore = this.calculateTransparencyScore({
        summary,
        confidenceMetrics,
        policyCompliance,
      });

      const report: TransparencyReport = {
        report_id: reportId,
        tenant_id: filter.tenant_id,
        period_start: filter.start_date,
        period_end: filter.end_date,
        generated_at: generatedAt,
        summary,
        run_statistics: runStatistics,
        confidence_metrics: confidenceMetrics,
        policy_compliance: policyCompliance,
        capabilities_overview: capabilitiesOverview,
        transparency_score: transparencyScore,
      };

      logger.info({
        message: 'Transparency report generated',
        report_id: reportId,
        transparency_score: transparencyScore,
      });

      return report;
    } catch (error: any) {
      logger.error({
        message: 'Failed to generate transparency report',
        report_id: reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate summary statistics.
   */
  private async generateSummary(filter: TransparencyReportFilter): Promise<ReportSummary> {
    const sql = `
      SELECT
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as successful_runs,
        AVG(duration_ms) as average_duration_ms,
        COUNT(DISTINCT actor_id) as unique_actors,
        run_type,
        COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1
        AND started_at >= $2
        AND started_at <= $3
        ${filter.run_type ? 'AND run_type = $4' : ''}
      GROUP BY run_type
    `;

    const params = [filter.tenant_id, filter.start_date, filter.end_date];
    if (filter.run_type) params.push(filter.run_type);

    const result = await timescaleQuery(sql, params);

    const runTypesBreakdown: Record<string, number> = {};
    let totalRuns = 0;
    let successfulRuns = 0;
    let avgDuration = 0;
    let uniqueActors = 0;

    for (const row of result.rows) {
      runTypesBreakdown[row.run_type] = parseInt(row.count, 10);
      totalRuns += parseInt(row.count, 10);
      successfulRuns += parseInt(row.successful_runs, 10);
      avgDuration = parseFloat(row.average_duration_ms) || 0;
      uniqueActors = parseInt(row.unique_actors, 10);
    }

    return {
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      average_duration_ms: Math.round(avgDuration),
      unique_actors: uniqueActors,
      run_types_breakdown: runTypesBreakdown,
    };
  }

  /**
   * Generate run statistics.
   */
  private async generateRunStatistics(filter: TransparencyReportFilter): Promise<RunStatistics> {
    // By type
    const byTypeSql = `
      SELECT run_type, COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY run_type
    `;
    const byTypeResult = await timescaleQuery(byTypeSql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);
    const byType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      byType[row.run_type] = parseInt(row.count, 10);
    }

    // By actor type
    const byActorSql = `
      SELECT actor_type, COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY actor_type
    `;
    const byActorResult = await timescaleQuery(byActorSql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);
    const byActorType: Record<string, number> = {};
    for (const row of byActorResult.rows) {
      byActorType[row.actor_type] = parseInt(row.count, 10);
    }

    // By day
    const byDaySql = `
      SELECT DATE(started_at) as date, COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY DATE(started_at)
      ORDER BY date
    `;
    const byDayResult = await timescaleQuery(byDaySql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);
    const byDay = byDayResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));

    // Peak hour
    const peakHourSql = `
      SELECT EXTRACT(HOUR FROM started_at) as hour, COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `;
    const peakHourResult = await timescaleQuery(peakHourSql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);
    const peakHour = peakHourResult.rows[0]?.hour
      ? `${peakHourResult.rows[0].hour}:00`
      : 'N/A';

    return {
      by_type: byType,
      by_actor_type: byActorType,
      by_day: byDay,
      peak_hour: peakHour,
    };
  }

  /**
   * Generate confidence metrics.
   */
  private async generateConfidenceMetrics(
    filter: TransparencyReportFilter
  ): Promise<ConfidenceMetrics> {
    const sql = `
      SELECT
        AVG(confidence_overall) as avg_confidence,
        COUNT(*) FILTER (WHERE confidence_overall >= 0.8) as high_conf,
        COUNT(*) FILTER (WHERE confidence_overall >= 0.5 AND confidence_overall < 0.8) as med_conf,
        COUNT(*) FILTER (WHERE confidence_overall < 0.5) as low_conf,
        AVG(confidence_evidence_count) as avg_evidence,
        confidence_source_reliability,
        COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY confidence_source_reliability
    `;

    const result = await timescaleQuery(sql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);

    let avgConfidence = 0;
    let highConf = 0;
    let medConf = 0;
    let lowConf = 0;
    let avgEvidence = 0;
    const sourceReliabilityDist: Record<string, number> = {};

    for (const row of result.rows) {
      avgConfidence = parseFloat(row.avg_confidence) || 0;
      highConf += parseInt(row.high_conf, 10);
      medConf += parseInt(row.med_conf, 10);
      lowConf += parseInt(row.low_conf, 10);
      avgEvidence = parseFloat(row.avg_evidence) || 0;
      if (row.confidence_source_reliability) {
        sourceReliabilityDist[row.confidence_source_reliability] = parseInt(row.count, 10);
      }
    }

    return {
      average_confidence: parseFloat(avgConfidence.toFixed(2)),
      high_confidence_runs: highConf,
      medium_confidence_runs: medConf,
      low_confidence_runs: lowConf,
      average_evidence_count: Math.round(avgEvidence),
      source_reliability_distribution: sourceReliabilityDist,
    };
  }

  /**
   * Generate policy compliance metrics.
   */
  private async generatePolicyCompliance(
    filter: TransparencyReportFilter
  ): Promise<PolicyCompliance> {
    // This requires querying JSONB policy_decisions field
    const sql = `
      SELECT
        policy_decisions,
        COUNT(*) as run_count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
    `;

    const result = await timescaleQuery(sql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);

    let totalEvaluations = 0;
    let allows = 0;
    let denies = 0;
    let requireApprovals = 0;
    const policyStats: Record<string, { evals: number; allows: number }> = {};

    for (const row of result.rows) {
      const decisions = row.policy_decisions || [];
      for (const pd of decisions) {
        totalEvaluations++;
        if (pd.decision === 'allow') allows++;
        if (pd.decision === 'deny') denies++;
        if (pd.decision === 'require_approval') requireApprovals++;

        if (!policyStats[pd.policy_name]) {
          policyStats[pd.policy_name] = { evals: 0, allows: 0 };
        }
        policyStats[pd.policy_name].evals++;
        if (pd.decision === 'allow') policyStats[pd.policy_name].allows++;
      }
    }

    const topPolicies = Object.entries(policyStats)
      .map(([name, stats]) => ({
        policy_name: name,
        evaluations: stats.evals,
        approval_rate: stats.evals > 0 ? stats.allows / stats.evals : 0,
      }))
      .sort((a, b) => b.evaluations - a.evaluations)
      .slice(0, 10);

    return {
      total_policy_evaluations: totalEvaluations,
      allow_decisions: allows,
      deny_decisions: denies,
      require_approval_decisions: requireApprovals,
      compliance_rate: totalEvaluations > 0 ? allows / totalEvaluations : 1,
      top_policies: topPolicies,
    };
  }

  /**
   * Generate capabilities overview.
   */
  private async generateCapabilitiesOverview(
    filter: TransparencyReportFilter
  ): Promise<CapabilitiesOverview> {
    const sql = `
      SELECT capabilities_used
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
    `;

    const result = await timescaleQuery(sql, [
      filter.tenant_id,
      filter.start_date,
      filter.end_date,
    ]);

    const capabilityCounts: Record<string, number> = {};

    for (const row of result.rows) {
      const capabilities = row.capabilities_used || [];
      for (const cap of capabilities) {
        capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
      }
    }

    const topCapabilities = Object.entries(capabilityCounts)
      .map(([capability, usage_count]) => ({ capability, usage_count }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);

    return {
      total_capabilities_used: Object.keys(capabilityCounts).length,
      top_capabilities: topCapabilities,
      capability_distribution: capabilityCounts,
    };
  }

  /**
   * Calculate overall transparency score (0-100).
   */
  private calculateTransparencyScore(data: {
    summary: ReportSummary;
    confidenceMetrics: ConfidenceMetrics;
    policyCompliance: PolicyCompliance;
  }): number {
    const { summary, confidenceMetrics, policyCompliance } = data;

    let score = 0;

    // Factor 1: Run completion rate (0-30 points)
    const completionRate =
      summary.total_runs > 0 ? summary.successful_runs / summary.total_runs : 0;
    score += completionRate * 30;

    // Factor 2: Average confidence (0-40 points)
    score += confidenceMetrics.average_confidence * 40;

    // Factor 3: Policy compliance rate (0-30 points)
    score += policyCompliance.compliance_rate * 30;

    return Math.round(score);
  }
}
