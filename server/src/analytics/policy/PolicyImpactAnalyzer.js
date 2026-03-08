"use strict";
/**
 * Policy Impact Analyzer
 *
 * Analyzes the impact of policies on system operations, security posture,
 * and compliance status. Provides metrics and visualizations.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC4.1 (Monitoring)
 *
 * @module analytics/policy/PolicyImpactAnalyzer
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyImpactAnalyzer = void 0;
exports.getPolicyImpactAnalyzer = getPolicyImpactAnalyzer;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'policy-impact-analyzer-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'PolicyImpactAnalyzer',
    };
}
function calculatePercentile(values, percentile) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}
function calculateHealthScore(metrics) {
    let score = 100;
    // Penalize high denial rates (some denial is normal)
    const denialRate = metrics.decisions.denied / metrics.decisions.total;
    if (denialRate > 0.3)
        score -= 20;
    else if (denialRate > 0.2)
        score -= 10;
    // Penalize slow performance
    if (metrics.performance.p95EvaluationMs > 100)
        score -= 15;
    else if (metrics.performance.p95EvaluationMs > 50)
        score -= 5;
    // Reward good coverage
    if (metrics.coverage.uniqueSubjects > 100)
        score += 5;
    // Check rule hit distribution (some rules should be matching)
    const totalHits = Array.from(metrics.coverage.ruleHitDistribution.values())
        .reduce((sum, hits) => sum + hits, 0);
    if (totalHits === 0)
        score -= 10;
    return Math.max(0, Math.min(100, score));
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    aggregationPeriodHours: 24,
    trendDataPoints: 30,
    p95ThresholdMs: 100,
    denialRateThreshold: 0.25,
    assessSecurityPosture: true,
    trackCompliance: true,
};
// ============================================================================
// Metrics Aggregator
// ============================================================================
class MetricsAggregator {
    decisions = new Map();
    maxDecisions = 100000;
    /**
     * Record a policy decision
     */
    recordDecision(tenantId, decision) {
        const key = `${tenantId}:${decision.policyId}`;
        const existing = this.decisions.get(key) || [];
        existing.push(decision);
        // Trim old decisions
        if (existing.length > this.maxDecisions) {
            existing.splice(0, existing.length - this.maxDecisions);
        }
        this.decisions.set(key, existing);
    }
    /**
     * Get aggregated metrics for a policy
     */
    getMetrics(tenantId, policyId, startTime, endTime) {
        const key = `${tenantId}:${policyId}`;
        const allDecisions = this.decisions.get(key) || [];
        // Filter by time range
        const decisions = allDecisions.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
        // Calculate decision counts
        const decisionCounts = {
            total: decisions.length,
            allowed: decisions.filter(d => d.decision === 'allow').length,
            denied: decisions.filter(d => d.decision === 'deny').length,
            flagged: decisions.filter(d => d.decision === 'flag').length,
            reviewRequired: decisions.filter(d => d.decision === 'review').length,
        };
        // Calculate performance metrics
        const evalTimes = decisions.map(d => d.evaluationTimeMs);
        const performance = {
            averageEvaluationMs: evalTimes.length > 0
                ? evalTimes.reduce((a, b) => a + b, 0) / evalTimes.length
                : 0,
            p95EvaluationMs: calculatePercentile(evalTimes, 95),
            p99EvaluationMs: calculatePercentile(evalTimes, 99),
            maxEvaluationMs: evalTimes.length > 0 ? Math.max(...evalTimes) : 0,
        };
        // Calculate coverage
        const uniqueSubjects = new Set(decisions.map(d => d.subject));
        const uniqueResources = new Set(decisions.map(d => d.resource));
        const ruleHitDistribution = new Map();
        for (const decision of decisions) {
            const current = ruleHitDistribution.get(decision.ruleId) || 0;
            ruleHitDistribution.set(decision.ruleId, current + 1);
        }
        // Calculate trends (hourly buckets)
        const trends = this.calculateTrends(decisions);
        return {
            policyId,
            tenantId,
            period: { start: startTime, end: endTime },
            decisions: decisionCounts,
            performance,
            coverage: {
                uniqueSubjects: uniqueSubjects.size,
                uniqueResources: uniqueResources.size,
                ruleHitDistribution,
            },
            trends,
        };
    }
    /**
     * Get all policy IDs for a tenant
     */
    getPolicyIds(tenantId) {
        const policyIds = new Set();
        for (const key of this.decisions.keys()) {
            if (key.startsWith(`${tenantId}:`)) {
                policyIds.add(key.split(':')[1]);
            }
        }
        return Array.from(policyIds);
    }
    /**
     * Clear old data
     */
    clearOldData(olderThan) {
        for (const [key, decisions] of this.decisions) {
            const filtered = decisions.filter(d => d.timestamp >= olderThan);
            if (filtered.length === 0) {
                this.decisions.delete(key);
            }
            else {
                this.decisions.set(key, filtered);
            }
        }
    }
    calculateTrends(decisions) {
        if (decisions.length === 0) {
            return { decisionTrend: [], performanceTrend: [] };
        }
        // Group by hour
        const hourlyBuckets = new Map();
        for (const decision of decisions) {
            const hourKey = Math.floor(decision.timestamp.getTime() / (1000 * 60 * 60));
            const bucket = hourlyBuckets.get(hourKey) || [];
            bucket.push(decision);
            hourlyBuckets.set(hourKey, bucket);
        }
        const decisionTrend = [];
        const performanceTrend = [];
        for (const [hourKey, bucket] of hourlyBuckets) {
            const timestamp = new Date(hourKey * 1000 * 60 * 60);
            decisionTrend.push({
                timestamp,
                value: bucket.length,
                label: 'Total Decisions',
            });
            const avgTime = bucket.reduce((sum, d) => sum + d.evaluationTimeMs, 0) / bucket.length;
            performanceTrend.push({
                timestamp,
                value: avgTime,
                label: 'Avg Evaluation Time (ms)',
            });
        }
        return { decisionTrend, performanceTrend };
    }
}
// ============================================================================
// Security Posture Assessor
// ============================================================================
class SecurityPostureAssessor {
    previousScore = 80; // Baseline
    /**
     * Assess security posture based on policy metrics
     */
    assess(metrics) {
        let score = 100;
        const strengths = [];
        const weaknesses = [];
        const riskFactors = [];
        // Analyze each policy
        for (const policy of metrics) {
            // Good: High coverage
            if (policy.coverage.uniqueSubjects > 50) {
                strengths.push(`Policy ${policy.policyId} has broad subject coverage`);
            }
            // Bad: Too many denials might indicate misconfiguration
            const denialRate = policy.decisions.denied / policy.decisions.total;
            if (denialRate > 0.5) {
                weaknesses.push(`Policy ${policy.policyId} has high denial rate (${(denialRate * 100).toFixed(1)}%)`);
                score -= 10;
                riskFactors.push({
                    category: 'Configuration',
                    description: 'High denial rate may indicate overly restrictive policies',
                    severity: 'medium',
                    mitigationStatus: 'unmitigated',
                });
            }
            // Good: Using review/flag for sensitive operations
            if (policy.decisions.flagged > 0 || policy.decisions.reviewRequired > 0) {
                strengths.push('Multi-step approval workflow in use');
            }
            // Bad: No denials might indicate too permissive
            if (policy.decisions.denied === 0 && policy.decisions.total > 100) {
                weaknesses.push(`Policy ${policy.policyId} has zero denials - may be too permissive`);
                score -= 5;
                riskFactors.push({
                    category: 'Access Control',
                    description: 'No access denials may indicate overly permissive policies',
                    severity: 'low',
                    mitigationStatus: 'unmitigated',
                });
            }
        }
        // Determine trend
        const trend = score > this.previousScore + 5 ? 'improving' :
            score < this.previousScore - 5 ? 'declining' : 'stable';
        const result = {
            overallScore: Math.max(0, Math.min(100, score)),
            previousScore: this.previousScore,
            trend,
            strengths,
            weaknesses,
            riskFactors,
        };
        this.previousScore = result.overallScore;
        return result;
    }
}
// ============================================================================
// Compliance Status Tracker
// ============================================================================
class ComplianceStatusTracker {
    /**
     * Calculate compliance status based on policy metrics
     */
    calculateStatus(tenantId, metrics) {
        // Simplified compliance calculation
        // In production, this would integrate with the compliance engine
        const frameworkScores = new Map();
        // SOC 2 - looks for proper access controls
        let soc2Score = 80;
        for (const policy of metrics) {
            if (policy.decisions.denied > 0)
                soc2Score += 5;
            if (policy.decisions.reviewRequired > 0)
                soc2Score += 5;
        }
        frameworkScores.set('SOC2', Math.min(100, soc2Score));
        // ISO 27001 - similar evaluation
        let isoScore = 75;
        const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
        const totalDenied = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
        if (totalDecisions > 0 && totalDenied / totalDecisions > 0.05) {
            isoScore += 10; // Access controls are working
        }
        frameworkScores.set('ISO27001', Math.min(100, isoScore));
        // Calculate gaps
        const gaps = [];
        // Check for audit logging (CC7.2)
        const hasAuditCoverage = metrics.some(m => Array.from(m.coverage.ruleHitDistribution.keys()).some(r => r.toLowerCase().includes('audit')));
        if (!hasAuditCoverage) {
            gaps.push({
                controlId: 'CC7.2',
                framework: 'SOC2',
                gap: 'Audit trail coverage may be incomplete',
                severity: 'medium',
            });
        }
        // Calculate overall score
        const scores = Array.from(frameworkScores.values());
        const overallScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
        // Estimate controls
        const controlsEvaluated = metrics.length * 5; // Rough estimate
        const controlsPassing = Math.floor(controlsEvaluated * (overallScore / 100));
        return {
            overallScore,
            frameworkScores,
            controlsEvaluated,
            controlsPassing,
            controlsFailing: controlsEvaluated - controlsPassing,
            gaps,
        };
    }
}
// ============================================================================
// Operational Impact Calculator
// ============================================================================
class OperationalImpactCalculator {
    /**
     * Calculate operational impact of policies
     */
    calculate(metrics) {
        const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
        const requestsBlocked = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
        const requestsFlagged = metrics.reduce((sum, m) => sum + m.decisions.flagged, 0);
        // Estimate false positives (simplified - in production use ML)
        const falsePositiveEstimate = Math.max(0, (requestsBlocked * 0.05)); // 5% estimate
        // Calculate user friction score (0-100, lower is better)
        const blockRate = totalDecisions > 0 ? requestsBlocked / totalDecisions : 0;
        const flagRate = totalDecisions > 0 ? requestsFlagged / totalDecisions : 0;
        const userFrictionScore = Math.min(100, (blockRate * 50) + (flagRate * 25));
        // Calculate performance overhead
        const totalEvalTime = metrics.reduce((sum, m) => sum + (m.performance.averageEvaluationMs * m.decisions.total), 0);
        const avgRequestTime = 100; // Assume 100ms average request time
        const percentageOverhead = totalDecisions > 0
            ? (totalEvalTime / (totalDecisions * avgRequestTime)) * 100
            : 0;
        // Calculate top blocked resources
        const resourceBlocks = new Map();
        // Note: In a real implementation, we'd track this in MetricsAggregator
        // For now, using placeholder data
        const topBlockedResources = Array.from(resourceBlocks.entries())
            .map(([resource, count]) => ({
            resource,
            count,
            percentage: totalDecisions > 0 ? (count / totalDecisions) * 100 : 0,
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Calculate top blocked subjects
        const subjectBlocks = new Map();
        const topBlockedSubjects = Array.from(subjectBlocks.entries())
            .map(([subject, count]) => ({
            subject,
            count,
            percentage: totalDecisions > 0 ? (count / totalDecisions) * 100 : 0,
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            requestsBlocked,
            requestsFlagged,
            falsePositiveEstimate,
            userFrictionScore,
            performanceOverhead: {
                totalMs: totalEvalTime,
                percentageOfRequestTime: percentageOverhead,
            },
            topBlockedResources,
            topBlockedSubjects,
        };
    }
}
// ============================================================================
// Policy Impact Analyzer
// ============================================================================
class PolicyImpactAnalyzer extends events_1.EventEmitter {
    config;
    metricsAggregator;
    securityAssessor;
    complianceTracker;
    operationalCalculator;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.metricsAggregator = new MetricsAggregator();
        this.securityAssessor = new SecurityPostureAssessor();
        this.complianceTracker = new ComplianceStatusTracker();
        this.operationalCalculator = new OperationalImpactCalculator();
        logger_js_1.default.info({ config: this.config }, 'PolicyImpactAnalyzer initialized');
    }
    /**
     * Record a policy decision for analysis
     */
    recordDecision(tenantId, decision) {
        this.metricsAggregator.recordDecision(tenantId, decision);
        // Check for alerts
        if (decision.evaluationTimeMs > this.config.p95ThresholdMs) {
            this.emit('alert:slow-evaluation', {
                tenantId,
                policyId: decision.policyId,
                evaluationTimeMs: decision.evaluationTimeMs,
            });
        }
    }
    /**
     * Generate an impact report for a tenant
     */
    async generateReport(tenantId, startTime, endTime) {
        const periodEnd = endTime || new Date();
        const periodStart = startTime || new Date(periodEnd.getTime() - (this.config.aggregationPeriodHours * 60 * 60 * 1000));
        // Get all policy IDs for tenant
        const policyIds = this.metricsAggregator.getPolicyIds(tenantId);
        // Collect metrics for each policy
        const policyMetrics = policyIds.map(policyId => this.metricsAggregator.getMetrics(tenantId, policyId, periodStart, periodEnd));
        // Calculate summary
        const summary = this.calculateSummary(policyMetrics);
        // Assess security posture
        let securityPosture;
        if (this.config.assessSecurityPosture) {
            securityPosture = this.securityAssessor.assess(policyMetrics);
        }
        else {
            securityPosture = {
                overallScore: 0,
                previousScore: 0,
                trend: 'stable',
                strengths: [],
                weaknesses: [],
                riskFactors: [],
            };
        }
        // Calculate compliance status
        let complianceStatus;
        if (this.config.trackCompliance) {
            complianceStatus = this.complianceTracker.calculateStatus(tenantId, policyMetrics);
        }
        else {
            complianceStatus = {
                overallScore: 0,
                frameworkScores: new Map(),
                controlsEvaluated: 0,
                controlsPassing: 0,
                controlsFailing: 0,
                gaps: [],
            };
        }
        // Calculate operational impact
        const operationalImpact = this.operationalCalculator.calculate(policyMetrics);
        // Generate recommendations
        const recommendations = this.generateRecommendations(summary, securityPosture, operationalImpact);
        const report = {
            id: (0, uuid_1.v4)(),
            tenantId,
            generatedAt: new Date().toISOString(),
            period: {
                start: periodStart.toISOString(),
                end: periodEnd.toISOString(),
            },
            summary,
            policyMetrics,
            securityPosture,
            complianceStatus,
            operationalImpact,
            recommendations,
            governanceVerdict: createVerdict(summary.overallHealthScore < 50 ? data_envelope_js_1.GovernanceResult.FLAG :
                summary.overallHealthScore < 70 ? data_envelope_js_1.GovernanceResult.REVIEW_REQUIRED :
                    data_envelope_js_1.GovernanceResult.ALLOW, `Impact report generated: health score ${summary.overallHealthScore}`),
        };
        logger_js_1.default.info({
            reportId: report.id,
            tenantId,
            policiesAnalyzed: policyMetrics.length,
            healthScore: summary.overallHealthScore,
        }, 'Impact report generated');
        return (0, data_envelope_js_1.createDataEnvelope)(report, {
            source: 'PolicyImpactAnalyzer',
            governanceVerdict: report.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get real-time metrics for a policy
     */
    getRealtimeMetrics(tenantId, policyId, lookbackMinutes = 60) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (lookbackMinutes * 60 * 1000));
        const metrics = this.metricsAggregator.getMetrics(tenantId, policyId, startTime, endTime);
        return (0, data_envelope_js_1.createDataEnvelope)(metrics, {
            source: 'PolicyImpactAnalyzer',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Real-time metrics retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clean up old data
     */
    cleanupOldData(retentionDays) {
        const cutoff = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
        this.metricsAggregator.clearOldData(cutoff);
        logger_js_1.default.info({ retentionDays, cutoff }, 'Old impact data cleaned up');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    calculateSummary(metrics) {
        const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
        const totalDenied = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
        const totalFlagged = metrics.reduce((sum, m) => sum + m.decisions.flagged, 0);
        const avgEvalTime = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.performance.averageEvaluationMs, 0) / metrics.length
            : 0;
        const healthScores = metrics.map(m => calculateHealthScore(m));
        const overallHealthScore = healthScores.length > 0
            ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
            : 100;
        // Count unique rules
        const allRules = new Set();
        for (const m of metrics) {
            for (const ruleId of m.coverage.ruleHitDistribution.keys()) {
                allRules.add(ruleId);
            }
        }
        return {
            totalDecisions,
            denialRate: totalDecisions > 0 ? totalDenied / totalDecisions : 0,
            flagRate: totalDecisions > 0 ? totalFlagged / totalDecisions : 0,
            averageEvaluationTimeMs: avgEvalTime,
            policiesActive: metrics.length,
            rulesActive: allRules.size,
            overallHealthScore,
        };
    }
    generateRecommendations(summary, security, operational) {
        const recommendations = [];
        // Performance recommendations
        if (summary.averageEvaluationTimeMs > 50) {
            recommendations.push('Consider optimizing policy rules to reduce evaluation time');
        }
        // Security recommendations
        if (security.overallScore < 70) {
            recommendations.push('Review security posture - score below recommended threshold');
        }
        if (security.trend === 'declining') {
            recommendations.push('Security posture is declining - investigate recent policy changes');
        }
        // Operational recommendations
        if (operational.userFrictionScore > 30) {
            recommendations.push('High user friction detected - review denial patterns for false positives');
        }
        if (operational.falsePositiveEstimate > 10) {
            recommendations.push('Consider reviewing policies for potential false positive reduction');
        }
        // General recommendations
        if (summary.denialRate > this.config.denialRateThreshold) {
            recommendations.push(`Denial rate (${(summary.denialRate * 100).toFixed(1)}%) exceeds threshold - review policy configuration`);
        }
        if (summary.overallHealthScore < 80) {
            recommendations.push('Overall policy health score below optimal - run full policy audit');
        }
        return recommendations;
    }
}
exports.PolicyImpactAnalyzer = PolicyImpactAnalyzer;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getPolicyImpactAnalyzer(config) {
    if (!instance) {
        instance = new PolicyImpactAnalyzer(config);
    }
    return instance;
}
exports.default = PolicyImpactAnalyzer;
