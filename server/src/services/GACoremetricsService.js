"use strict";
/**
 * GA Core Metrics Service - Go/No-Go Dashboard Data Provider
 * Collects and exposes metrics from all GA Core systems for release decisions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaCoreMetrics = exports.GACoreMetricsService = void 0;
const prom_client_1 = require("prom-client");
const database_js_1 = require("../config/database.js");
const database_js_2 = require("../config/database.js");
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
// @ts-ignore - HybridEntityResolutionService class doesn't exist (exports resolveEntities function instead)
// import { HybridEntityResolutionService } from './HybridEntityResolutionService.js';
const log = logger_js_1.default.child({ name: 'GACoreMetrics' });
// Initialize default Node.js metrics
(0, prom_client_1.collectDefaultMetrics)();
class GACoreMetricsService {
    // GA Core Release Status (0=NO GO, 0.5=CONDITIONAL GO, 1=GO)
    gaCoreOverallStatus = new prom_client_1.Gauge({
        name: 'ga_core_overall_status',
        help: 'Overall GA Core release status (0=NO GO, 0.5=CONDITIONAL GO, 1=GO)',
    });
    // Entity Resolution Precision Metrics
    erPrecisionPersonCurrent = new prom_client_1.Gauge({
        name: 'er_precision_person_current',
        help: 'Current Entity Resolution precision for PERSON entities',
    });
    erPrecisionOrgCurrent = new prom_client_1.Gauge({
        name: 'er_precision_org_current',
        help: 'Current Entity Resolution precision for ORG entities',
    });
    erPrecisionPersonDaily = new prom_client_1.Gauge({
        name: 'er_precision_person_daily',
        help: 'Daily Entity Resolution precision for PERSON entities',
        labelNames: ['date'],
    });
    erPrecisionOrgDaily = new prom_client_1.Gauge({
        name: 'er_precision_org_daily',
        help: 'Daily Entity Resolution precision for ORG entities',
        labelNames: ['date'],
    });
    // Merge Decision Performance
    mergeDecisionDuration = new prom_client_1.Histogram({
        name: 'merge_decision_duration_seconds',
        help: 'Time taken to make merge decisions',
        labelNames: ['entity_type', 'method'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });
    // Policy & Appeals Metrics
    policyDenialsWithAppealsRate = new prom_client_1.Gauge({
        name: 'policy_denials_with_appeals_rate',
        help: 'Percentage of policy denials that have appeal paths available',
    });
    policyAppealSlaComplianceRate = new prom_client_1.Gauge({
        name: 'policy_appeal_sla_compliance_rate',
        help: 'Percentage of policy appeals responded to within SLA',
    });
    // Export Integrity Metrics
    exportManifestIntegrityRate = new prom_client_1.Gauge({
        name: 'export_manifest_integrity_rate',
        help: 'Percentage of exports with valid manifest integrity',
    });
    exportBundleVerificationRate = new prom_client_1.Gauge({
        name: 'export_bundle_verification_rate',
        help: 'Percentage of export bundles that pass verification',
    });
    // Copilot NL→Cypher Metrics
    copilotNlSuccessRate = new prom_client_1.Gauge({
        name: 'copilot_nl_success_rate',
        help: 'Success rate of NL to Cypher translations',
    });
    // Hypothesis Rigor Score
    hypothesisRigorScoreAvg = new prom_client_1.Gauge({
        name: 'hypothesis_rigor_score_avg',
        help: 'Average hypothesis rigor score (0-10)',
    });
    // Data Quality Score
    dataQualityScoreOverall = new prom_client_1.Gauge({
        name: 'data_quality_score_overall',
        help: 'Overall data quality score (0-1)',
    });
    // GA Core Gate Status (detailed)
    gaCoreGateStatus = new prom_client_1.Gauge({
        name: 'ga_core_gate_status',
        help: 'Individual GA Core gate status',
        labelNames: ['gate', 'status', 'requirement', 'current_value', 'threshold'],
    });
    // @ts-ignore - HybridEntityResolutionService class doesn't exist
    // private erService = new HybridEntityResolutionService();
    constructor() {
        // Eager initialization removed
    }
    start() {
        if (this.isStarted)
            return;
        this.isStarted = true;
        this.startMetricsCollection();
    }
    isStarted = false;
    startMetricsCollection() {
        // Collect metrics every 30 seconds
        setInterval(async () => {
            try {
                await this.collectAllMetrics();
            }
            catch (error) {
                log.error({ error: error.message }, 'Failed to collect GA Core metrics');
            }
        }, 30000);
        // Initial collection
        this.collectAllMetrics().catch((error) => {
            log.error({ error: error.message }, 'Initial metrics collection failed');
        });
    }
    async collectAllMetrics() {
        log.debug('Collecting GA Core metrics');
        await Promise.allSettled([
            this.collectERPrecisionMetrics(),
            this.collectPolicyAppealMetrics(),
            this.collectExportIntegrityMetrics(),
            this.collectCopilotMetrics(),
            this.collectHypothesisRigorMetrics(),
            this.collectDataQualityMetrics(),
        ]);
        // Calculate overall GA Core status
        await this.calculateOverallStatus();
    }
    async collectERPrecisionMetrics() {
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            // Get current precision metrics
            const currentMetrics = await pool.query(`
        SELECT
          entity_type,
          precision,
          total_decisions,
          avg_merge_confidence
        FROM er_precision_metrics
        WHERE last_updated >= NOW() - INTERVAL '1 day'
        ORDER BY last_updated DESC
      `);
            for (const row of currentMetrics.rows) {
                const precision = parseFloat(row.precision);
                if (row.entity_type === 'PERSON') {
                    this.erPrecisionPersonCurrent.set(precision);
                }
                else if (row.entity_type === 'ORG') {
                    this.erPrecisionOrgCurrent.set(precision);
                }
            }
            // Get daily precision metrics for trend
            const dailyMetrics = await pool.query(`
        SELECT
          DATE(created_at) as metric_date,
          entity_type,
          precision
        FROM er_ci_metrics
        WHERE created_at >= NOW() - INTERVAL '7 days'
        ORDER BY metric_date DESC
      `);
            for (const row of dailyMetrics.rows) {
                const precision = parseFloat(row.precision);
                const date = row.metric_date;
                if (row.entity_type === 'PERSON') {
                    this.erPrecisionPersonDaily.set({ date }, precision);
                }
                else if (row.entity_type === 'ORG') {
                    this.erPrecisionOrgDaily.set({ date }, precision);
                }
            }
            log.debug('Collected ER precision metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect ER precision metrics');
        }
    }
    async collectPolicyAppealMetrics() {
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            // Get policy appeal metrics
            const appealMetrics = await pool.query(`
        SELECT get_ga_appeal_metrics(7) as metrics
      `);
            const metrics = appealMetrics.rows[0]?.metrics;
            if (metrics) {
                this.policyAppealSlaComplianceRate.set(parseFloat(metrics.sla_compliance_rate));
            }
            // Calculate denials with appeals rate
            const denialMetrics = await pool.query(`
        SELECT
          COUNT(CASE WHEN appeal_available = true THEN 1 END)::DECIMAL /
          NULLIF(COUNT(*), 0) as appeals_rate
        FROM policy_decisions_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND decision = 'DENY'
      `);
            const appealsRate = parseFloat(denialMetrics.rows[0]?.appeals_rate || '0');
            this.policyDenialsWithAppealsRate.set(appealsRate);
            log.debug('Collected policy appeal metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect policy appeal metrics');
        }
    }
    async collectExportIntegrityMetrics() {
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            // Get export integrity metrics
            const exportMetrics = await pool.query(`
        SELECT get_ga_export_metrics(7) as metrics
      `);
            const metrics = exportMetrics.rows[0]?.metrics;
            if (metrics) {
                this.exportManifestIntegrityRate.set(parseFloat(metrics.integrity_rate));
                // Bundle verification rate (assume same as integrity for now)
                this.exportBundleVerificationRate.set(parseFloat(metrics.integrity_rate));
            }
            log.debug('Collected export integrity metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect export integrity metrics');
        }
    }
    async collectCopilotMetrics() {
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            // Get Copilot NL→Cypher success rate
            const copilotMetrics = await pool.query(`
        SELECT
          COUNT(CASE WHEN e.status = 'EXECUTED' THEN 1 END)::DECIMAL /
          NULLIF(COUNT(*), 0) as success_rate
        FROM nl_cypher_translations t
        LEFT JOIN nl_cypher_executions e ON t.id = e.translation_id
        WHERE t.created_at >= NOW() - INTERVAL '7 days'
      `);
            const successRate = parseFloat(copilotMetrics.rows[0]?.success_rate || '0');
            this.copilotNlSuccessRate.set(successRate);
            log.debug('Collected Copilot metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect Copilot metrics');
        }
    }
    async collectHypothesisRigorMetrics() {
        try {
            // This would integrate with hypothesis tracking system
            // For now, use a placeholder based on merge decision quality
            const pool = (0, database_js_1.getPostgresPool)();
            const rigorMetrics = await pool.query(`
        SELECT
          AVG(confidence * 10) as avg_rigor_score
        FROM merge_decisions
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND confidence IS NOT NULL
      `);
            const rigorScore = parseFloat(rigorMetrics.rows[0]?.avg_rigor_score || '7');
            this.hypothesisRigorScoreAvg.set(rigorScore);
            log.debug('Collected hypothesis rigor metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect hypothesis rigor metrics');
        }
    }
    async collectDataQualityMetrics() {
        try {
            if ((0, neo4j_js_1.isNeo4jMockMode)()) {
                this.dataQualityScoreOverall.set(0.8);
                return;
            }
            const session = (0, database_js_2.getNeo4jDriver)().session();
            // Simple data quality assessment
            const result = await session.run(`
        MATCH (e:Entity)
        WITH COUNT(e) as total,
             COUNT(CASE WHEN e.name IS NOT NULL AND e.name <> '' THEN 1 END) as with_names,
             COUNT(CASE WHEN e.created_at IS NOT NULL THEN 1 END) as with_dates
        RETURN CASE WHEN total = 0 THEN 0.8 ELSE toFloat(with_names + with_dates) / (total * 2) END as quality_score
      `);
            const scoreVal = result.records[0]?.get('quality_score');
            const qualityScore = typeof scoreVal === 'number' ? scoreVal : (scoreVal?.toNumber?.() || 0.8);
            this.dataQualityScoreOverall.set(qualityScore);
            await session.close();
            log.debug('Collected data quality metrics');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to collect data quality metrics');
        }
    }
    async calculateOverallStatus() {
        try {
            // Get current values
            const personPrecision = await this.erPrecisionPersonCurrent.get();
            const orgPrecision = await this.erPrecisionOrgCurrent.get();
            const appealsSla = await this.policyAppealSlaComplianceRate.get();
            const exportIntegrity = await this.exportManifestIntegrityRate.get();
            const copilotSuccess = await this.copilotNlSuccessRate.get();
            // GA Core gate requirements
            const gates = [
                {
                    name: 'ER_PRECISION_PERSON',
                    current: personPrecision?.values?.[0]?.value || 0,
                    threshold: 0.9,
                    requirement: 'Entity Resolution PERSON precision >= 90%',
                },
                {
                    name: 'ER_PRECISION_ORG',
                    current: orgPrecision?.values?.[0]?.value || 0,
                    threshold: 0.88,
                    requirement: 'Entity Resolution ORG precision >= 88%',
                },
                {
                    name: 'APPEALS_SLA',
                    current: appealsSla?.values?.[0]?.value || 0,
                    threshold: 0.9,
                    requirement: 'Policy appeals SLA compliance >= 90%',
                },
                {
                    name: 'EXPORT_INTEGRITY',
                    current: exportIntegrity?.values?.[0]?.value || 0,
                    threshold: 0.95,
                    requirement: 'Export manifest integrity >= 95%',
                },
                {
                    name: 'COPILOT_SUCCESS',
                    current: copilotSuccess?.values?.[0]?.value || 0,
                    threshold: 0.8,
                    requirement: 'Copilot NL→Cypher success rate >= 80%',
                },
            ];
            // Set individual gate metrics
            for (const gate of gates) {
                const status = gate.current >= gate.threshold ? 'PASS' : 'FAIL';
                this.gaCoreGateStatus.set({
                    gate: gate.name,
                    status,
                    requirement: gate.requirement,
                    current_value: gate.current.toFixed(4),
                    threshold: gate.threshold.toString(),
                }, gate.current >= gate.threshold ? 1 : 0);
            }
            // Calculate overall status
            const passingGates = gates.filter((g) => g.current >= g.threshold).length;
            const totalGates = gates.length;
            let overallStatus;
            if (passingGates === totalGates) {
                overallStatus = 1.0; // GO
            }
            else if (passingGates >= totalGates * 0.8) {
                overallStatus = 0.5; // CONDITIONAL GO
            }
            else {
                overallStatus = 0.0; // NO GO
            }
            this.gaCoreOverallStatus.set(overallStatus);
            // Log status
            const statusText = overallStatus === 1
                ? 'GO'
                : overallStatus === 0.5
                    ? 'CONDITIONAL GO'
                    : 'NO GO';
            log.info({
                status: statusText,
                passingGates,
                totalGates,
                gates: gates.map((g) => ({
                    name: g.name,
                    pass: g.current >= g.threshold,
                    current: g.current,
                    threshold: g.threshold,
                })),
            }, 'GA Core overall status calculated');
        }
        catch (error) {
            log.error({ error: error.message }, 'Failed to calculate overall GA status');
        }
    }
    /**
     * Record merge decision timing for performance metrics
     */
    recordMergeDecisionTime(entityType, method, durationSeconds) {
        this.mergeDecisionDuration
            .labels(entityType, method)
            .observe(durationSeconds);
    }
    /**
     * Get current GA Core status for API endpoints
     */
    async getCurrentStatus() {
        const overallMetric = await this.gaCoreOverallStatus.get();
        const overallValue = overallMetric?.values?.[0]?.value || 0;
        const overall = overallValue === 1
            ? 'GO'
            : overallValue === 0.5
                ? 'CONDITIONAL_GO'
                : 'NO_GO';
        return {
            overall,
            score: overallValue,
            gates: [], // Would populate from gate metrics
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Get Prometheus metrics registry for scraping
     */
    getMetricsRegistry() {
        return prom_client_1.register;
    }
}
exports.GACoreMetricsService = GACoreMetricsService;
// Export singleton instance
exports.gaCoreMetrics = new GACoreMetricsService();
