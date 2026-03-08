"use strict";
// @ts-nocheck
/**
 * Proof-of-Non-Collection (PNC) Report Service
 *
 * Generates monthly reports that cryptographically prove certain data categories
 * were NOT collected during a reporting period. This is critical for compliance
 * with data minimization requirements (GDPR Art. 5(1)(c), CCPA Section 1798.100).
 *
 * Features:
 * - Statistical sampling of query logs
 * - Cryptographic proof generation
 * - Audit trail integration
 * - Automated monthly report generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proofOfNonCollectionService = exports.ProofOfNonCollectionService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const CircuitBreaker_js_1 = require("../utils/CircuitBreaker.js");
const redis_js_1 = require("../db/redis.js");
const postgres_js_1 = require("../db/postgres.js");
const index_js_1 = require("../audit/index.js");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Predefined data categories for PNC monitoring
const DATA_CATEGORIES = [
    {
        name: 'biometric_data',
        description: 'Biometric identifiers (facial recognition, fingerprints, etc.)',
        patterns: ['biometric', 'fingerprint', 'facial', 'iris', 'voice_print'],
        criticalFields: ['biometric_hash', 'fingerprint_data', 'facial_features'],
    },
    {
        name: 'geolocation_precise',
        description: 'Precise geolocation data (GPS coordinates)',
        patterns: ['gps', 'latitude', 'longitude', 'geo_coordinates', 'location_precise'],
        criticalFields: ['gps_lat', 'gps_lon', 'precise_location'],
    },
    {
        name: 'financial_account_data',
        description: 'Bank account numbers, credit card details',
        patterns: ['bank_account', 'credit_card', 'account_number', 'routing_number'],
        criticalFields: ['account_number', 'card_number', 'cvv', 'routing_number'],
    },
    {
        name: 'health_records',
        description: 'Protected health information (PHI)',
        patterns: ['medical_record', 'diagnosis', 'prescription', 'health_condition'],
        criticalFields: ['medical_record_number', 'diagnosis_code', 'prescription_data'],
    },
    {
        name: 'genetic_data',
        description: 'DNA sequences, genetic test results',
        patterns: ['dna', 'genetic', 'genome', 'gene_sequence'],
        criticalFields: ['dna_sequence', 'genetic_markers', 'genome_data'],
    },
    {
        name: 'religious_beliefs',
        description: 'Religious or philosophical beliefs',
        patterns: ['religion', 'religious_affiliation', 'faith', 'belief_system'],
        criticalFields: ['religion', 'religious_affiliation'],
    },
    {
        name: 'sexual_orientation',
        description: 'Sexual orientation or gender identity',
        patterns: ['sexual_orientation', 'gender_identity', 'lgbtq'],
        criticalFields: ['sexual_orientation', 'gender_identity'],
    },
    {
        name: 'union_membership',
        description: 'Trade union membership information',
        patterns: ['union', 'trade_union', 'labor_organization'],
        criticalFields: ['union_membership', 'union_id'],
    },
];
// ============================================================================
// Service Implementation
// ============================================================================
class ProofOfNonCollectionService {
    circuitBreaker;
    redis = null;
    postgres = null;
    // Configuration
    REPORTS_DIR = process.env.PNC_REPORTS_DIR || '/var/lib/summit/pnc-reports';
    DEFAULT_SAMPLE_RATE = 0.05; // 5% sample
    MIN_SAMPLE_SIZE = 1000;
    signingSecret;
    constructor() {
        this.circuitBreaker = new CircuitBreaker_js_1.CircuitBreaker('ProofOfNonCollectionService', {
            failureThreshold: 5,
            resetTimeout: 60000,
        });
        const secret = process.env.PNC_SIGNING_SECRET;
        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('PNC_SIGNING_SECRET environment variable is required in production');
            }
            logger_js_1.default.warn('PNC_SIGNING_SECRET not set - using insecure default for development only');
            this.signingSecret = 'default-signing-secret';
        }
        else {
            this.signingSecret = secret;
        }
        this.initializeConnections();
        this.ensureReportsDirectory();
    }
    async initializeConnections() {
        try {
            this.redis = await (0, redis_js_1.getRedisClient)();
            this.postgres = (0, postgres_js_1.getPostgresPool)();
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize ProofOfNonCollectionService connections', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async ensureReportsDirectory() {
        try {
            await promises_1.default.mkdir(this.REPORTS_DIR, { recursive: true });
        }
        catch (error) {
            logger_js_1.default.error('Failed to create PNC reports directory', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    // ==========================================================================
    // Report Generation
    // ==========================================================================
    /**
     * Generate monthly Proof-of-Non-Collection report
     */
    async generateMonthlyReport(tenantId, year, month, options) {
        try {
            return await this.circuitBreaker.execute(async () => {
                logger_js_1.default.info('Generating PNC report', { tenantId, year, month });
                // Calculate period
                const periodStart = new Date(year, month - 1, 1);
                const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
                // Determine data categories to check
                const dataCategories = options?.dataCategories ||
                    DATA_CATEGORIES.map((cat) => cat.name);
                // Count total queries in period
                const totalQueries = await this.countQueriesInPeriod(tenantId, periodStart, periodEnd);
                // Calculate sample size
                const sampleRate = options?.sampleRate || this.DEFAULT_SAMPLE_RATE;
                const sampledQueries = Math.max(Math.floor(totalQueries * sampleRate), Math.min(this.MIN_SAMPLE_SIZE, totalQueries));
                // Create report record
                const report = {
                    tenantId,
                    reportMonth: month,
                    reportYear: year,
                    periodStart,
                    periodEnd,
                    dataCategories,
                    userCohorts: ['all'], // Can be customized
                    totalQueriesPeriod: totalQueries,
                    sampledQueries,
                    sampleRate: sampledQueries / Math.max(totalQueries, 1),
                    samplingMethod: options?.samplingMethod || 'random',
                    nonCollectionAssertions: {},
                    violationsDetected: 0,
                    violationDetails: [],
                    status: 'draft',
                    generatedBy: 'system',
                    generatedAt: new Date(),
                };
                // Store draft report
                const reportId = await this.storeReport(report);
                report.id = reportId;
                // Perform sampling and analysis
                const samples = await this.performSampling(report, periodStart, periodEnd, sampledQueries, options?.samplingMethod || 'random');
                // Analyze samples for each data category
                const assertions = {};
                for (const categoryName of dataCategories) {
                    const category = DATA_CATEGORIES.find((cat) => cat.name === categoryName);
                    if (!category)
                        continue;
                    const categoryAnalysis = await this.analyzeCategoryCollection(category, samples, reportId);
                    assertions[categoryName] = categoryAnalysis;
                    if (categoryAnalysis.violationsCount > 0) {
                        report.violationsDetected += categoryAnalysis.violationsCount;
                        report.violationDetails.push(...categoryAnalysis.violations);
                    }
                }
                report.nonCollectionAssertions = assertions;
                // Generate detailed report document
                const reportPath = await this.generateReportDocument(report);
                report.reportPath = reportPath;
                // Calculate cryptographic hash
                report.reportHash = await this.calculateReportHash(report);
                // Generate signature (simplified - in production would use private key)
                report.signature = this.signReport(report.reportHash);
                // Update report in database
                await this.updateReport(report);
                // Audit log
                await index_js_1.advancedAuditSystem.logEvent({
                    eventType: 'pnc.report.generated',
                    actorId: 'system',
                    resourceType: 'pnc_report',
                    resourceId: reportId,
                    action: 'generate',
                    outcome: 'success',
                    severity: 'info',
                    metadata: {
                        reportMonth: month,
                        reportYear: year,
                        totalQueries,
                        sampledQueries,
                        violationsDetected: report.violationsDetected,
                    },
                    tenantId,
                });
                logger_js_1.default.info('PNC report generated successfully', {
                    reportId,
                    violationsDetected: report.violationsDetected,
                });
                return report;
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to generate PNC report', { error, tenantId, year, month });
            throw error;
        }
    }
    /**
     * Finalize report (locks it and marks as immutable)
     */
    async finalizeReport(reportId) {
        const query = `
      UPDATE proof_of_non_collection_reports
      SET status = 'finalized', finalized_at = NOW()
      WHERE id = $1 AND status = 'draft'
      RETURNING id
    `;
        const result = await this.postgres.query(query, [reportId]);
        if (result.rowCount === 0) {
            throw new Error('Report not found or already finalized');
        }
        await index_js_1.advancedAuditSystem.logEvent({
            eventType: 'pnc.report.finalized',
            actorId: 'system',
            resourceType: 'pnc_report',
            resourceId: reportId,
            action: 'finalize',
            outcome: 'success',
            severity: 'info',
            metadata: {},
        });
        logger_js_1.default.info('PNC report finalized', { reportId });
    }
    /**
     * Archive old reports
     */
    async archiveReport(reportId) {
        const query = `
      UPDATE proof_of_non_collection_reports
      SET status = 'archived', archived_at = NOW()
      WHERE id = $1 AND status = 'finalized'
      RETURNING id
    `;
        const result = await this.postgres.query(query, [reportId]);
        if (result.rowCount === 0) {
            throw new Error('Report not found or not finalized');
        }
        logger_js_1.default.info('PNC report archived', { reportId });
    }
    // ==========================================================================
    // Sampling Methods
    // ==========================================================================
    /**
     * Perform sampling of queries from the period
     */
    async performSampling(report, periodStart, periodEnd, sampleSize, method) {
        switch (method) {
            case 'random':
                return this.randomSampling(report.tenantId, periodStart, periodEnd, sampleSize);
            case 'stratified':
                return this.stratifiedSampling(report.tenantId, periodStart, periodEnd, sampleSize);
            case 'systematic':
                return this.systematicSampling(report.tenantId, periodStart, periodEnd, sampleSize);
            default:
                return this.randomSampling(report.tenantId, periodStart, periodEnd, sampleSize);
        }
    }
    /**
     * Random sampling
     */
    async randomSampling(tenantId, periodStart, periodEnd, sampleSize) {
        const query = `
      SELECT *
      FROM query_scope_metrics
      WHERE tenant_id = $1
        AND executed_at BETWEEN $2 AND $3
      ORDER BY RANDOM()
      LIMIT $4
    `;
        const result = await this.postgres.query(query, [tenantId, periodStart, periodEnd, sampleSize]);
        return result.rows;
    }
    /**
     * Stratified sampling (by query type)
     */
    async stratifiedSampling(tenantId, periodStart, periodEnd, sampleSize) {
        // Get query type distribution
        const distributionQuery = `
      SELECT query_type, COUNT(*) as count
      FROM query_scope_metrics
      WHERE tenant_id = $1
        AND executed_at BETWEEN $2 AND $3
      GROUP BY query_type
    `;
        const distResult = await this.postgres.query(distributionQuery, [
            tenantId,
            periodStart,
            periodEnd,
        ]);
        const totalCount = distResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
        const samples = [];
        // Sample proportionally from each stratum
        for (const row of distResult.rows) {
            const stratumSize = Math.ceil((parseInt(row.count) / totalCount) * sampleSize);
            const stratumQuery = `
        SELECT *
        FROM query_scope_metrics
        WHERE tenant_id = $1
          AND executed_at BETWEEN $2 AND $3
          AND query_type = $4
        ORDER BY RANDOM()
        LIMIT $5
      `;
            const stratumResult = await this.postgres.query(stratumQuery, [
                tenantId,
                periodStart,
                periodEnd,
                row.query_type,
                stratumSize,
            ]);
            samples.push(...stratumResult.rows);
        }
        return samples;
    }
    /**
     * Systematic sampling
     */
    async systematicSampling(tenantId, periodStart, periodEnd, sampleSize) {
        const totalCount = await this.countQueriesInPeriod(tenantId, periodStart, periodEnd);
        const interval = Math.floor(totalCount / sampleSize);
        const query = `
      WITH numbered AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY executed_at) as rn
        FROM query_scope_metrics
        WHERE tenant_id = $1
          AND executed_at BETWEEN $2 AND $3
      )
      SELECT *
      FROM numbered
      WHERE rn % $4 = 0
      LIMIT $5
    `;
        const result = await this.postgres.query(query, [
            tenantId,
            periodStart,
            periodEnd,
            interval,
            sampleSize,
        ]);
        return result.rows;
    }
    // ==========================================================================
    // Analysis Methods
    // ==========================================================================
    /**
     * Analyze samples for a specific data category
     */
    async analyzeCategoryCollection(category, samples, reportId) {
        const violations = [];
        let accessedCount = 0;
        let collectedCount = 0;
        for (const sample of samples) {
            // Check if query accessed this category
            const wasAccessed = this.checkCategoryAccess(category, sample);
            const wasCollected = wasAccessed; // Simplified - in production would check actual data collection
            if (wasAccessed)
                accessedCount++;
            if (wasCollected) {
                collectedCount++;
                violations.push({
                    queryId: sample.query_id,
                    timestamp: sample.executed_at,
                    category: category.name,
                    evidence: {
                        queryType: sample.query_type,
                        queryName: sample.query_name,
                    },
                });
            }
            // Store audit sample
            await this.storeAuditSample({
                pncReportId: reportId,
                tenantId: sample.tenant_id,
                sampleTimestamp: new Date(sample.executed_at),
                queryScopeMetricId: sample.id,
                dataCategory: category.name,
                wasAccessed,
                wasCollected,
                verificationMethod: 'query_pattern_matching',
                evidence: {
                    queryType: sample.query_type,
                    patterns: category.patterns,
                },
            });
        }
        return {
            category: category.name,
            description: category.description,
            sampleSize: samples.length,
            accessedCount,
            collectedCount,
            violationsCount: collectedCount,
            violations,
            assertion: collectedCount === 0 ? 'NOT_COLLECTED' : 'COLLECTED',
            confidence: this.calculateConfidence(samples.length, collectedCount),
        };
    }
    /**
     * Check if a query accessed a specific data category
     */
    checkCategoryAccess(category, sample) {
        const queryName = (sample.query_name || '').toLowerCase();
        const queryType = (sample.query_type || '').toLowerCase();
        // Check if query name/type matches category patterns
        for (const pattern of category.patterns) {
            if (queryName.includes(pattern.toLowerCase()) || queryType.includes(pattern.toLowerCase())) {
                return true;
            }
        }
        // In production, would also check:
        // - Actual fields accessed in the query
        // - Table/collection names
        // - GraphQL field selections
        // - Cypher query patterns
        return false;
    }
    /**
     * Calculate statistical confidence in the assertion
     */
    calculateConfidence(sampleSize, violationsFound) {
        // Simplified confidence calculation
        // In production would use proper statistical methods (Wilson score, etc.)
        if (sampleSize < 100)
            return 0.7;
        if (sampleSize < 1000)
            return 0.9;
        if (sampleSize >= 1000 && violationsFound === 0)
            return 0.99;
        return 0.95;
    }
    // ==========================================================================
    // Database Operations
    // ==========================================================================
    /**
     * Count queries in period
     */
    async countQueriesInPeriod(tenantId, periodStart, periodEnd) {
        const query = `
      SELECT COUNT(*) as total
      FROM query_scope_metrics
      WHERE tenant_id = $1
        AND executed_at BETWEEN $2 AND $3
    `;
        const result = await this.postgres.query(query, [tenantId, periodStart, periodEnd]);
        return parseInt(result.rows[0].total);
    }
    /**
     * Store PNC report
     */
    async storeReport(report) {
        const query = `
      INSERT INTO proof_of_non_collection_reports (
        tenant_id, report_month, report_year, period_start, period_end,
        data_categories, user_cohorts, total_queries_period, sampled_queries,
        sample_rate, sampling_method, non_collection_assertions,
        violations_detected, violation_details, status, generated_by, generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `;
        const values = [
            report.tenantId,
            report.reportMonth,
            report.reportYear,
            report.periodStart,
            report.periodEnd,
            report.dataCategories,
            report.userCohorts,
            report.totalQueriesPeriod,
            report.sampledQueries,
            report.sampleRate,
            report.samplingMethod,
            JSON.stringify(report.nonCollectionAssertions),
            report.violationsDetected,
            JSON.stringify(report.violationDetails),
            report.status,
            report.generatedBy,
            report.generatedAt,
        ];
        const result = await this.postgres.query(query, values);
        return result.rows[0].id;
    }
    /**
     * Update report
     */
    async updateReport(report) {
        const query = `
      UPDATE proof_of_non_collection_reports
      SET
        non_collection_assertions = $1,
        violations_detected = $2,
        violation_details = $3,
        report_hash = $4,
        signature = $5,
        report_path = $6
      WHERE id = $7
    `;
        await this.postgres.query(query, [
            JSON.stringify(report.nonCollectionAssertions),
            report.violationsDetected,
            JSON.stringify(report.violationDetails),
            report.reportHash,
            report.signature,
            report.reportPath,
            report.id,
        ]);
    }
    /**
     * Store audit sample
     */
    async storeAuditSample(sample) {
        const query = `
      INSERT INTO pnc_audit_samples (
        pnc_report_id, tenant_id, sample_timestamp, query_scope_metric_id,
        data_category, was_accessed, was_collected, verification_method, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
        await this.postgres.query(query, [
            sample.pncReportId,
            sample.tenantId,
            sample.sampleTimestamp,
            sample.queryScopeMetricId,
            sample.dataCategory,
            sample.wasAccessed,
            sample.wasCollected,
            sample.verificationMethod,
            JSON.stringify(sample.evidence),
        ]);
    }
    // ==========================================================================
    // Report Document Generation
    // ==========================================================================
    /**
     * Generate detailed report document
     */
    async generateReportDocument(report) {
        const fileName = `pnc-report-${report.tenantId}-${report.reportYear}-${String(report.reportMonth).padStart(2, '0')}.json`;
        const filePath = path_1.default.join(this.REPORTS_DIR, fileName);
        const document = {
            reportId: report.id,
            tenant: report.tenantId,
            period: {
                month: report.reportMonth,
                year: report.reportYear,
                start: report.periodStart,
                end: report.periodEnd,
            },
            methodology: {
                totalQueries: report.totalQueriesPeriod,
                sampledQueries: report.sampledQueries,
                sampleRate: report.sampleRate,
                samplingMethod: report.samplingMethod,
            },
            assertions: report.nonCollectionAssertions,
            violations: {
                count: report.violationsDetected,
                details: report.violationDetails,
            },
            generatedAt: report.generatedAt,
            version: '1.0',
        };
        await promises_1.default.writeFile(filePath, JSON.stringify(document, null, 2), 'utf-8');
        return filePath;
    }
    /**
     * Calculate cryptographic hash of report
     */
    async calculateReportHash(report) {
        const content = JSON.stringify({
            tenantId: report.tenantId,
            period: `${report.reportYear}-${report.reportMonth}`,
            assertions: report.nonCollectionAssertions,
            violations: report.violationsDetected,
            samplingMethod: report.samplingMethod,
            sampleSize: report.sampledQueries,
        });
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Sign report (simplified - in production would use private key)
     */
    signReport(hash) {
        // In production, would use proper digital signature with private key
        return crypto_1.default.createHmac('sha256', this.signingSecret).update(hash).digest('hex');
    }
    // ==========================================================================
    // Public Query Methods
    // ==========================================================================
    /**
     * Get recent reports for tenant
     */
    async getReports(tenantId, limit = 12) {
        const query = `
      SELECT * FROM proof_of_non_collection_reports
      WHERE tenant_id = $1
      ORDER BY report_year DESC, report_month DESC
      LIMIT $2
    `;
        const result = await this.postgres.query(query, [tenantId, limit]);
        return result.rows.map(this.mapRowToReport);
    }
    /**
     * Get specific report
     */
    async getReport(reportId) {
        const query = `
      SELECT * FROM proof_of_non_collection_reports
      WHERE id = $1
    `;
        const result = await this.postgres.query(query, [reportId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToReport(result.rows[0]);
    }
    /**
     * Map database row to report object
     */
    mapRowToReport(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            reportMonth: parseInt(row.report_month),
            reportYear: parseInt(row.report_year),
            periodStart: new Date(row.period_start),
            periodEnd: new Date(row.period_end),
            dataCategories: row.data_categories,
            userCohorts: row.user_cohorts,
            totalQueriesPeriod: parseInt(row.total_queries_period),
            sampledQueries: parseInt(row.sampled_queries),
            sampleRate: parseFloat(row.sample_rate),
            samplingMethod: row.sampling_method,
            nonCollectionAssertions: row.non_collection_assertions,
            violationsDetected: parseInt(row.violations_detected),
            violationDetails: row.violation_details,
            reportHash: row.report_hash,
            signature: row.signature,
            status: row.status,
            reportPath: row.report_path,
            archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
            generatedBy: row.generated_by,
            generatedAt: new Date(row.generated_at),
            finalizedAt: row.finalized_at ? new Date(row.finalized_at) : undefined,
        };
    }
}
exports.ProofOfNonCollectionService = ProofOfNonCollectionService;
// Singleton instance
exports.proofOfNonCollectionService = new ProofOfNonCollectionService();
