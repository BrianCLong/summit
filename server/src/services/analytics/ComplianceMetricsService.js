"use strict";
// @ts-nocheck
/**
 * Compliance Metrics Service
 *
 * Provides analytics for compliance monitoring, control effectiveness,
 * and audit readiness tracking.
 *
 * SOC 2 Controls: CC2.1, CC3.1, CC4.1, PI1.1
 *
 * @module services/analytics/ComplianceMetricsService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceMetricsService = exports.ComplianceMetricsService = void 0;
const pg_1 = require("pg");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Service Implementation
// ============================================================================
class ComplianceMetricsService {
    pool;
    constructor(pool) {
        this.pool = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    /**
     * Get control status overview
     */
    async getControlStatus(tenantId, framework, actorId) {
        try {
            let query = `
        SELECT
          control_id,
          control_name,
          framework,
          status,
          last_assessed,
          evidence_count,
          gap_count
        FROM compliance_controls
        WHERE tenant_id = $1`;
            const params = [tenantId];
            if (framework) {
                query += ' AND framework = $2';
                params.push(framework);
            }
            query += ' ORDER BY framework, control_id';
            const result = await this.pool.query(query, params);
            const controls = result.rows.map((row) => ({
                controlId: row.control_id,
                controlName: row.control_name,
                framework: row.framework,
                status: row.status,
                lastAssessed: row.last_assessed?.toISOString() || null,
                evidenceCount: parseInt(row.evidence_count, 10) || 0,
                gapCount: parseInt(row.gap_count, 10) || 0,
            }));
            return (0, data_envelope_js_1.createDataEnvelope)(controls, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Control status retrieved',
                evaluator: 'ComplianceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting control status:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Control status (empty - no data)',
                evaluator: 'ComplianceMetricsService',
            });
        }
    }
    /**
     * Get control effectiveness metrics
     */
    async getControlEffectiveness(tenantId, actorId) {
        try {
            const result = await this.pool.query(`SELECT
          cc.control_id,
          cc.control_name,
          COALESCE(ct.tests_passed, 0) as tests_passed,
          COALESCE(ct.tests_failed, 0) as tests_failed,
          ct.last_tested,
          ct.trend
        FROM compliance_controls cc
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE passed = true) as tests_passed,
            COUNT(*) FILTER (WHERE passed = false) as tests_failed,
            MAX(tested_at) as last_tested,
            'stable' as trend
          FROM control_tests
          WHERE control_id = cc.control_id
            AND tested_at >= NOW() - INTERVAL '90 days'
        ) ct ON true
        WHERE cc.tenant_id = $1
        ORDER BY cc.control_id`, [tenantId]);
            const effectiveness = result.rows.map((row) => {
                const passed = parseInt(row.tests_passed, 10) || 0;
                const failed = parseInt(row.tests_failed, 10) || 0;
                const total = passed + failed;
                const score = total > 0 ? Math.round((passed / total) * 100) : 0;
                return {
                    controlId: row.control_id,
                    controlName: row.control_name,
                    effectiveness: score,
                    testsPassed: passed,
                    testsFailed: failed,
                    lastTested: row.last_tested?.toISOString() || null,
                    trend: row.trend || 'stable',
                };
            });
            return (0, data_envelope_js_1.createDataEnvelope)(effectiveness, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Control effectiveness retrieved',
                evaluator: 'ComplianceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting control effectiveness:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Control effectiveness (empty - no data)',
                evaluator: 'ComplianceMetricsService',
            });
        }
    }
    /**
     * Get evidence status overview
     */
    async getEvidenceStatus(tenantId, actorId) {
        try {
            const result = await this.pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW() + INTERVAL '30 days') as current,
          COUNT(*) FILTER (WHERE expires_at > NOW() AND expires_at <= NOW() + INTERVAL '30 days') as expiring,
          COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
          evidence_type,
          COUNT(*) as type_count
        FROM compliance_evidence
        WHERE tenant_id = $1
        GROUP BY GROUPING SETS ((), (evidence_type))`, [tenantId]);
            const totals = result.rows.find((r) => !r.evidence_type) || {
                total: 0,
                current: 0,
                expiring: 0,
                expired: 0,
            };
            const byType = {};
            result.rows
                .filter((r) => r.evidence_type)
                .forEach((r) => {
                byType[r.evidence_type] = parseInt(r.type_count, 10);
            });
            return (0, data_envelope_js_1.createDataEnvelope)({
                total: parseInt(totals.total, 10) || 0,
                current: parseInt(totals.current, 10) || 0,
                expiring: parseInt(totals.expiring, 10) || 0,
                expired: parseInt(totals.expired, 10) || 0,
                byType,
            }, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Evidence status retrieved',
                evaluator: 'ComplianceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting evidence status:', error);
            return (0, data_envelope_js_1.createDataEnvelope)({
                total: 0,
                current: 0,
                expiring: 0,
                expired: 0,
                byType: {},
            }, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Evidence status (empty - no data)',
                evaluator: 'ComplianceMetricsService',
            });
        }
    }
    /**
     * Calculate audit readiness score
     */
    async getAuditReadiness(tenantId, actorId) {
        try {
            // Get control coverage
            const controlResult = await this.pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
          COUNT(*) FILTER (WHERE status = 'partially_compliant') as partial,
          COUNT(*) FILTER (WHERE gap_count > 0) as with_gaps,
          SUM(gap_count) as total_gaps,
          COUNT(*) FILTER (WHERE gap_count > 0 AND status = 'non_compliant') as critical_gaps,
          framework
        FROM compliance_controls
        WHERE tenant_id = $1
        GROUP BY GROUPING SETS ((), (framework))`, [tenantId]);
            const overall = controlResult.rows.find((r) => !r.framework) || {
                total: 0,
                compliant: 0,
                partial: 0,
                with_gaps: 0,
                total_gaps: 0,
                critical_gaps: 0,
            };
            const frameworkScores = {};
            controlResult.rows
                .filter((r) => r.framework)
                .forEach((r) => {
                const total = parseInt(r.total, 10) || 1;
                const compliant = parseInt(r.compliant, 10) || 0;
                const partial = parseInt(r.partial, 10) || 0;
                frameworkScores[r.framework] = Math.round(((compliant + partial * 0.5) / total) * 100);
            });
            // Get evidence coverage
            const evidenceResult = await this.pool.query(`SELECT
          COUNT(DISTINCT ce.control_id) as controls_with_evidence,
          (SELECT COUNT(*) FROM compliance_controls WHERE tenant_id = $1) as total_controls
        FROM compliance_evidence ce
        JOIN compliance_controls cc ON ce.control_id = cc.control_id
        WHERE cc.tenant_id = $1`, [tenantId]);
            const evidenceRow = evidenceResult.rows[0] || { controls_with_evidence: 0, total_controls: 0 };
            const totalControls = parseInt(overall.total, 10) || 0;
            const compliantControls = parseInt(overall.compliant, 10) || 0;
            const partialControls = parseInt(overall.partial, 10) || 0;
            const totalGaps = parseInt(overall.total_gaps, 10) || 0;
            const criticalGaps = parseInt(overall.critical_gaps, 10) || 0;
            const controlCoverage = totalControls > 0
                ? Math.round(((compliantControls + partialControls * 0.5) / totalControls) * 100)
                : 0;
            const controlsWithEvidence = parseInt(evidenceRow.controls_with_evidence, 10) || 0;
            const evidenceCoverage = totalControls > 0
                ? Math.round((controlsWithEvidence / totalControls) * 100)
                : 0;
            // Calculate overall score
            const overallScore = Math.round(controlCoverage * 0.4 + evidenceCoverage * 0.3 + Math.max(0, 100 - totalGaps * 2) * 0.3);
            // Generate recommendations
            const recommendations = [];
            if (controlCoverage < 80) {
                recommendations.push('Increase control coverage by addressing non-compliant controls');
            }
            if (evidenceCoverage < 70) {
                recommendations.push('Upload evidence for controls missing documentation');
            }
            if (totalGaps > 5) {
                recommendations.push('Prioritize remediation of identified gaps');
            }
            if (criticalGaps > 0) {
                recommendations.push('Address critical gaps before next audit');
            }
            return (0, data_envelope_js_1.createDataEnvelope)({
                overallScore,
                frameworkScores,
                controlCoverage,
                evidenceCoverage,
                gapCount: totalGaps,
                criticalGaps,
                recommendations,
            }, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Audit readiness calculated',
                evaluator: 'ComplianceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error calculating audit readiness:', error);
            return (0, data_envelope_js_1.createDataEnvelope)({
                overallScore: 0,
                frameworkScores: {},
                controlCoverage: 0,
                evidenceCoverage: 0,
                gapCount: 0,
                criticalGaps: 0,
                recommendations: ['Unable to calculate - ensure compliance data is available'],
            }, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Audit readiness (default - no data)',
                evaluator: 'ComplianceMetricsService',
            });
        }
    }
    /**
     * Get framework status overview
     */
    async getFrameworkStatus(tenantId, actorId) {
        try {
            const result = await this.pool.query(`SELECT
          framework,
          COUNT(*) as total_controls,
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant_controls,
          MAX(last_assessed) as last_audit
        FROM compliance_controls
        WHERE tenant_id = $1
        GROUP BY framework
        ORDER BY framework`, [tenantId]);
            const frameworkDisplayNames = {
                soc2: 'SOC 2 Type II',
                iso27001: 'ISO 27001',
                gdpr: 'GDPR',
                hipaa: 'HIPAA',
                pci_dss: 'PCI DSS',
            };
            const frameworks = result.rows.map((row) => {
                const total = parseInt(row.total_controls, 10) || 0;
                const compliant = parseInt(row.compliant_controls, 10) || 0;
                return {
                    framework: row.framework,
                    displayName: frameworkDisplayNames[row.framework] || row.framework.toUpperCase(),
                    totalControls: total,
                    compliantControls: compliant,
                    compliancePercentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
                    lastAudit: row.last_audit?.toISOString() || null,
                    nextAudit: null, // Would be set based on audit schedule
                };
            });
            return (0, data_envelope_js_1.createDataEnvelope)(frameworks, { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Framework status retrieved',
                evaluator: 'ComplianceMetricsService',
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting framework status:', error);
            return (0, data_envelope_js_1.createDataEnvelope)([], { source: 'ComplianceMetricsService', actor: actorId }, {
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                policyId: 'compliance-read',
                reason: 'Framework status (empty - no data)',
                evaluator: 'ComplianceMetricsService',
            });
        }
    }
    /**
     * Get compliance summary for dashboard
     */
    async getComplianceSummary(tenantId, actorId) {
        const [readiness, controls, evidence, frameworks] = await Promise.all([
            this.getAuditReadiness(tenantId, actorId),
            this.getControlStatus(tenantId, undefined, actorId),
            this.getEvidenceStatus(tenantId, actorId),
            this.getFrameworkStatus(tenantId, actorId),
        ]);
        // Aggregate control status
        const controlsByStatus = {
            compliant: 0,
            partially_compliant: 0,
            non_compliant: 0,
            not_assessed: 0,
        };
        controls.data.forEach((c) => {
            controlsByStatus[c.status] = (controlsByStatus[c.status] || 0) + 1;
        });
        return (0, data_envelope_js_1.createDataEnvelope)({
            auditReadiness: readiness.data,
            controlsByStatus,
            evidenceStatus: evidence.data,
            recentActivity: [], // Would be populated from activity log
            frameworks: frameworks.data,
        }, { source: 'ComplianceMetricsService', actor: actorId }, {
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            policyId: 'compliance-read',
            reason: 'Compliance summary retrieved',
            evaluator: 'ComplianceMetricsService',
        });
    }
}
exports.ComplianceMetricsService = ComplianceMetricsService;
// Export singleton instance
exports.complianceMetricsService = new ComplianceMetricsService();
exports.default = ComplianceMetricsService;
