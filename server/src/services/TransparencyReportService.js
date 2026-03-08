"use strict";
/**
 * Transparency Report Service
 *
 * Generates customer-facing transparency reports for explainability data.
 * These reports are safe to share externally and provide high-level insights
 * without exposing sensitive implementation details.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransparencyReportService = void 0;
const uuid_1 = require("uuid");
const timescale_js_1 = require("../db/timescale.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Service for generating transparency reports.
 */
class TransparencyReportService {
    static instance;
    constructor() {
        // Private constructor for singleton
    }
    static getInstance() {
        if (!TransparencyReportService.instance) {
            TransparencyReportService.instance = new TransparencyReportService();
        }
        return TransparencyReportService.instance;
    }
    /**
     * Generate transparency report for a given period.
     */
    async generateReport(filter) {
        const reportId = (0, uuid_1.v4)();
        const generatedAt = new Date().toISOString();
        logger_js_1.default.info({
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
            const report = {
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
            logger_js_1.default.info({
                message: 'Transparency report generated',
                report_id: reportId,
                transparency_score: transparencyScore,
            });
            return report;
        }
        catch (error) {
            logger_js_1.default.error({
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
    async generateSummary(filter) {
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
        if (filter.run_type)
            params.push(filter.run_type);
        const result = await (0, timescale_js_1.query)(sql, params);
        const runTypesBreakdown = {};
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
    async generateRunStatistics(filter) {
        // By type
        const byTypeSql = `
      SELECT run_type, COUNT(*) as count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
      GROUP BY run_type
    `;
        const byTypeResult = await (0, timescale_js_1.query)(byTypeSql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        const byType = {};
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
        const byActorResult = await (0, timescale_js_1.query)(byActorSql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        const byActorType = {};
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
        const byDayResult = await (0, timescale_js_1.query)(byDaySql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        const byDay = byDayResult.rows.map((row) => ({
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
        const peakHourResult = await (0, timescale_js_1.query)(peakHourSql, [
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
    async generateConfidenceMetrics(filter) {
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
        const result = await (0, timescale_js_1.query)(sql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        let avgConfidence = 0;
        let highConf = 0;
        let medConf = 0;
        let lowConf = 0;
        let avgEvidence = 0;
        const sourceReliabilityDist = {};
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
    async generatePolicyCompliance(filter) {
        // This requires querying JSONB policy_decisions field
        const sql = `
      SELECT
        policy_decisions,
        COUNT(*) as run_count
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
    `;
        const result = await (0, timescale_js_1.query)(sql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        let totalEvaluations = 0;
        let allows = 0;
        let denies = 0;
        let requireApprovals = 0;
        const policyStats = {};
        for (const row of result.rows) {
            const decisions = row.policy_decisions || [];
            for (const pd of decisions) {
                totalEvaluations++;
                if (pd.decision === 'allow')
                    allows++;
                if (pd.decision === 'deny')
                    denies++;
                if (pd.decision === 'require_approval')
                    requireApprovals++;
                if (!policyStats[pd.policy_name]) {
                    policyStats[pd.policy_name] = { evals: 0, allows: 0 };
                }
                policyStats[pd.policy_name].evals++;
                if (pd.decision === 'allow')
                    policyStats[pd.policy_name].allows++;
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
    async generateCapabilitiesOverview(filter) {
        const sql = `
      SELECT capabilities_used
      FROM explainable_runs
      WHERE tenant_id = $1 AND started_at >= $2 AND started_at <= $3
    `;
        const result = await (0, timescale_js_1.query)(sql, [
            filter.tenant_id,
            filter.start_date,
            filter.end_date,
        ]);
        const capabilityCounts = {};
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
    calculateTransparencyScore(data) {
        const { summary, confidenceMetrics, policyCompliance } = data;
        let score = 0;
        // Factor 1: Run completion rate (0-30 points)
        const completionRate = summary.total_runs > 0 ? summary.successful_runs / summary.total_runs : 0;
        score += completionRate * 30;
        // Factor 2: Average confidence (0-40 points)
        score += confidenceMetrics.average_confidence * 40;
        // Factor 3: Policy compliance rate (0-30 points)
        score += policyCompliance.compliance_rate * 30;
        return Math.round(score);
    }
}
exports.TransparencyReportService = TransparencyReportService;
