"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceMetricsService = exports.GovernanceMetricsService = void 0;
const pg_1 = require("pg");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Service Implementation
// ============================================================================
class GovernanceMetricsService {
    pool;
    constructor(pool) {
        this.pool = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    /**
     * Get verdict distribution for a time period
     */
    async getVerdictDistribution(tenantId, timeRange, actorId) {
        try {
            const result = await this.pool.query(`SELECT
          COUNT(*) FILTER (WHERE verdict = 'ALLOW') as allow,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as deny,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalate,
          COUNT(*) FILTER (WHERE verdict = 'WARN') as warn,
          COUNT(*) as total
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`, [tenantId, timeRange.start, timeRange.end]);
            const row = result.rows[0] || { allow: 0, deny: 0, escalate: 0, warn: 0, total: 0 };
            return (0, data_envelope_js_1.createDataEnvelope)({
                allow: parseInt(row.allow, 10) || 0,
                deny: parseInt(row.deny, 10) || 0,
                escalate: parseInt(row.escalate, 10) || 0,
                warn: parseInt(row.warn, 10) || 0,
                total: parseInt(row.total, 10) || 0,
                period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
            }, { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Verdict distribution retrieved',
                evaluator: 'GovernanceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting verdict distribution:', error);
            // Return empty data on error
            return (0, data_envelope_js_1.createDataEnvelope)({
                allow: 0,
                deny: 0,
                escalate: 0,
                warn: 0,
                total: 0,
                period: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
            }, { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Verdict distribution (empty - no data)',
                evaluator: 'GovernanceMetricsService',
            });
        }
    }
    /**
     * Get verdict trends over time
     */
    async getVerdictTrends(tenantId, timeRange, actorId) {
        try {
            const dateFormat = this.getDateFormat(timeRange.granularity);
            const result = await this.pool.query(`SELECT
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
        ORDER BY date`, [tenantId, timeRange.start, timeRange.end, dateFormat]);
            const trends = result.rows.map((row) => ({
                date: row.date,
                allow: parseInt(row.allow, 10) || 0,
                deny: parseInt(row.deny, 10) || 0,
                escalate: parseInt(row.escalate, 10) || 0,
                warn: parseInt(row.warn, 10) || 0,
            }));
            return (0, data_envelope_js_1.createDataEnvelope)(trends, { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Verdict trends retrieved',
                evaluator: 'GovernanceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting verdict trends:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Verdict trends (empty - no data)',
                evaluator: 'GovernanceMetricsService',
            });
        }
    }
    /**
     * Get policy effectiveness metrics
     */
    async getPolicyEffectiveness(tenantId, timeRange, limit = 10, actorId) {
        try {
            const result = await this.pool.query(`SELECT
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
        LIMIT $4`, [tenantId, timeRange.start, timeRange.end, limit]);
            const policies = result.rows.map((row) => ({
                policyId: row.policy_id,
                policyName: row.policy_name || row.policy_id,
                triggerCount: parseInt(row.trigger_count, 10),
                denyRate: parseFloat(row.deny_rate) || 0,
                escalateRate: parseFloat(row.escalate_rate) || 0,
                averageLatencyMs: parseFloat(row.avg_latency) || 0,
                lastTriggered: row.last_triggered?.toISOString() || null,
            }));
            return (0, data_envelope_js_1.createDataEnvelope)(policies, { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Policy effectiveness metrics retrieved',
                evaluator: 'GovernanceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting policy effectiveness:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Policy effectiveness (empty - no data)',
                evaluator: 'GovernanceMetricsService',
            });
        }
    }
    /**
     * Detect anomalies in governance metrics
     */
    async detectAnomalies(tenantId, timeRange, actorId) {
        try {
            const anomalies = [];
            // Get current period stats
            const currentStats = await this.pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as denies,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalates
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`, [tenantId, timeRange.start, timeRange.end]);
            // Get previous period stats for comparison
            const periodMs = timeRange.end.getTime() - timeRange.start.getTime();
            const prevStart = new Date(timeRange.start.getTime() - periodMs);
            const prevEnd = timeRange.start;
            const prevStats = await this.pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE verdict = 'DENY') as denies,
          COUNT(*) FILTER (WHERE verdict = 'ESCALATE') as escalates
        FROM governance_verdicts
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3`, [tenantId, prevStart, prevEnd]);
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
            return (0, data_envelope_js_1.createDataEnvelope)(anomalies, { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Anomaly detection completed',
                evaluator: 'GovernanceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error detecting anomalies:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'GovernanceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'analytics-read',
                reason: 'Anomaly detection (empty - no data)',
                evaluator: 'GovernanceMetricsService',
            });
        }
    }
    /**
     * Get summary metrics for dashboard
     */
    async getMetricsSummary(tenantId, timeRange, actorId) {
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
        return (0, data_envelope_js_1.createDataEnvelope)({
            verdictDistribution: distribution.data,
            topPolicies: policies.data,
            recentAnomalies: anomalies.data,
            healthScore: Math.round(healthScore),
            lastUpdated: new Date().toISOString(),
        }, { source: 'GovernanceMetricsService', actor: actorId }, {
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            policyId: 'analytics-read',
            reason: 'Metrics summary retrieved',
            evaluator: 'GovernanceMetricsService',
        });
    }
    // --------------------------------------------------------------------------
    // Helper Methods
    // --------------------------------------------------------------------------
    getDateFormat(granularity) {
        switch (granularity) {
            case 'hour': return 'YYYY-MM-DD HH24:00';
            case 'day': return 'YYYY-MM-DD';
            case 'week': return 'IYYY-IW';
            case 'month': return 'YYYY-MM';
            default: return 'YYYY-MM-DD';
        }
    }
}
exports.GovernanceMetricsService = GovernanceMetricsService;
// Export singleton instance
exports.governanceMetricsService = new GovernanceMetricsService();
exports.default = GovernanceMetricsService;
