"use strict";
/**
 * Selector Minimization Service
 *
 * Implements selector minimization tracking, reason-for-access validation,
 * anomaly detection for over-broad queries, and tripwire monitoring.
 *
 * This service tracks query scope expansion and ensures compliance with
 * data minimization principles (GDPR Art. 5(1)(c), CCPA, etc.).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorMinimizationService = exports.SelectorMinimizationService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const CircuitBreaker_js_1 = require("../utils/CircuitBreaker.js");
const redis_js_1 = require("../db/redis.js");
const postgres_js_1 = require("../db/postgres.js");
const index_js_1 = require("../audit/index.js");
const crypto = __importStar(require("crypto"));
// ============================================================================
// Service Implementation
// ============================================================================
class SelectorMinimizationService {
    circuitBreaker;
    redis;
    postgres;
    // Cache keys
    BASELINE_CACHE_PREFIX = 'selector:baseline:';
    TRIPWIRE_CACHE_PREFIX = 'selector:tripwire:';
    METRICS_CACHE_TTL = 3600; // 1 hour
    // Default thresholds
    DEFAULT_MAX_EXPANSION_RATIO = 10.0;
    DEFAULT_ANOMALY_Z_SCORE = 4.0;
    constructor() {
        this.circuitBreaker = new CircuitBreaker_js_1.CircuitBreaker({});
        // Initialize with placeholder values - will be set in initializeConnections
        this.redis = null;
        this.postgres = null;
        this.initializeConnections();
    }
    async initializeConnections() {
        try {
            this.redis = await (0, redis_js_1.getRedisClient)();
            this.postgres = (0, postgres_js_1.getPostgresPool)();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_js_1.default.error('Failed to initialize SelectorMinimizationService connections', { error: errorMessage });
            throw error;
        }
    }
    // ==========================================================================
    // Core Tracking Methods
    // ==========================================================================
    /**
     * Track query scope metrics for a query execution
     */
    async trackQueryScope(metrics) {
        try {
            await this.circuitBreaker.execute(async () => {
                // Calculate derived metrics
                metrics.expansionRatio = metrics.expandedSelectors / Math.max(metrics.initialSelectors, 1);
                metrics.selectivityRatio = metrics.recordsReturned / Math.max(metrics.recordsAccessed, 1);
                metrics.queryHash = this.hashQuery(metrics.queryText || metrics.queryName || '');
                // Get tripwire configuration
                const tripwireConfig = await this.getTripwireConfig(metrics.tenantId, metrics.queryType, metrics.queryName);
                // Check reason-for-access requirements
                const reasonValidation = await this.validateReasonForAccess(metrics, tripwireConfig);
                metrics.reasonRequired = reasonValidation.required;
                metrics.reasonProvided = reasonValidation.provided;
                // Check tripwire violations
                const tripwireViolation = await this.checkTripwireViolation(metrics, tripwireConfig);
                metrics.tripwireThreshold = tripwireConfig.maxExpansionRatio;
                metrics.tripwireTriggered = tripwireViolation.violated;
                // Detect anomalies
                const anomalyResult = await this.detectAnomaly(metrics);
                metrics.isAnomaly = anomalyResult.isAnomaly;
                metrics.anomalyScore = anomalyResult.score;
                metrics.anomalyReasons = anomalyResult.reasons;
                // Store metrics in database
                const metricId = await this.storeMetrics(metrics);
                // Update baselines asynchronously
                this.updateBaseline(metrics).catch((err) => logger_js_1.default.error('Failed to update baseline', { err }));
                // Handle violations and anomalies
                if (tripwireViolation.violated || metrics.isAnomaly || !reasonValidation.valid) {
                    await this.handleViolation(metricId, metrics, tripwireViolation, reasonValidation);
                }
                // Audit log
                await index_js_1.advancedAuditSystem.logEvent({
                    eventType: 'query.scope.tracked',
                    actorId: metrics.userId,
                    resourceType: 'query',
                    resourceId: metrics.queryId,
                    action: 'track',
                    outcome: 'success',
                    severity: metrics.isAnomaly ? 'medium' : 'info',
                    metadata: {
                        queryType: metrics.queryType,
                        expansionRatio: metrics.expansionRatio,
                        tripwireTriggered: metrics.tripwireTriggered,
                        isAnomaly: metrics.isAnomaly,
                    },
                    tenantId: metrics.tenantId,
                    correlationId: metrics.correlationId,
                });
                logger_js_1.default.info('Query scope tracked', {
                    queryId: metrics.queryId,
                    expansionRatio: metrics.expansionRatio,
                    tripwireTriggered: metrics.tripwireTriggered,
                    isAnomaly: metrics.isAnomaly,
                });
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to track query scope', { error, queryId: metrics.queryId });
            throw error;
        }
    }
    /**
     * Validate reason-for-access requirements
     */
    async validateReasonForAccess(metrics, tripwireConfig) {
        const required = tripwireConfig.requireReason;
        const provided = !!metrics.reasonForAccess && metrics.reasonForAccess.length > 0;
        const validationErrors = [];
        let valid = true;
        if (required && !provided) {
            valid = false;
            validationErrors.push('Reason for access is required but not provided');
        }
        if (provided) {
            // Validate reason quality (minimum length, non-generic)
            if (metrics.reasonForAccess.length < 10) {
                valid = false;
                validationErrors.push('Reason for access is too short (minimum 10 characters)');
            }
            const genericReasons = ['test', 'debug', 'checking', 'n/a', 'none'];
            if (genericReasons.some((r) => metrics.reasonForAccess.toLowerCase().includes(r))) {
                valid = false;
                validationErrors.push('Reason for access appears to be generic or placeholder');
            }
        }
        return {
            required,
            provided,
            reason: metrics.reasonForAccess,
            valid,
            validationErrors,
        };
    }
    /**
     * Check for tripwire violations
     */
    async checkTripwireViolation(metrics, config) {
        const violations = [];
        // Check expansion ratio
        if (metrics.expansionRatio > config.maxExpansionRatio) {
            violations.push(`Expansion ratio ${metrics.expansionRatio.toFixed(2)} exceeds threshold ${config.maxExpansionRatio}`);
        }
        // Check records accessed
        if (config.maxRecordsAccessed && metrics.recordsAccessed > config.maxRecordsAccessed) {
            violations.push(`Records accessed ${metrics.recordsAccessed} exceeds threshold ${config.maxRecordsAccessed}`);
        }
        // Check selectivity ratio (low selectivity = over-broad query)
        if (config.maxSelectivityRatio && metrics.selectivityRatio < config.maxSelectivityRatio) {
            violations.push(`Selectivity ratio ${metrics.selectivityRatio.toFixed(4)} is below threshold ${config.maxSelectivityRatio}`);
        }
        return {
            violated: violations.length > 0,
            violations,
            shouldBlock: config.blockOnViolation && violations.length > 0,
            shouldAlert: config.alertOnViolation && violations.length > 0,
        };
    }
    /**
     * Detect anomalies using statistical analysis
     */
    async detectAnomaly(metrics) {
        const baseline = await this.getBaseline(metrics.tenantId, metrics.queryHash);
        if (!baseline || baseline.sampleSize < 10) {
            // Not enough data for anomaly detection
            return { isAnomaly: false, score: 0, reasons: [] };
        }
        const reasons = [];
        let maxZScore = 0;
        // Z-score for expansion ratio
        const expansionZScore = Math.abs(metrics.expansionRatio - baseline.avgExpansionRatio) / Math.max(baseline.stdDevExpansion, 0.01);
        if (expansionZScore > this.DEFAULT_ANOMALY_Z_SCORE) {
            reasons.push(`Expansion ratio anomaly (z-score: ${expansionZScore.toFixed(2)})`);
            maxZScore = Math.max(maxZScore, expansionZScore);
        }
        // Check if significantly above P95
        if (metrics.expansionRatio > baseline.p95ExpansionRatio * 1.5) {
            reasons.push(`Expansion ratio ${metrics.expansionRatio.toFixed(2)} significantly exceeds P95 baseline ${baseline.p95ExpansionRatio.toFixed(2)}`);
        }
        // Check records accessed
        if (metrics.recordsAccessed > baseline.p95RecordsAccessed * 2) {
            reasons.push(`Records accessed ${metrics.recordsAccessed} significantly exceeds P95 baseline ${baseline.p95RecordsAccessed}`);
        }
        return {
            isAnomaly: reasons.length > 0,
            score: maxZScore,
            reasons,
        };
    }
    /**
     * Handle violations and create alerts
     */
    async handleViolation(metricId, metrics, tripwireViolation, reasonValidation) {
        const alerts = [];
        // Tripwire violation alert
        if (tripwireViolation.violated) {
            alerts.push({
                tenantId: metrics.tenantId,
                queryScopeMetricId: metricId,
                alertType: 'expansion_threshold',
                severity: this.calculateSeverity(metrics.expansionRatio, metrics.tripwireThreshold),
                title: 'Query Expansion Threshold Exceeded',
                description: tripwireViolation.violations.join('; '),
                userId: metrics.userId,
                queryHash: metrics.queryHash,
                expansionRatio: metrics.expansionRatio,
                thresholdExceeded: metrics.expansionRatio - metrics.tripwireThreshold,
                status: 'open',
                triggeredAt: new Date(),
            });
        }
        // Anomaly alert
        if (metrics.isAnomaly) {
            alerts.push({
                tenantId: metrics.tenantId,
                queryScopeMetricId: metricId,
                alertType: 'anomaly_detected',
                severity: 'medium',
                title: 'Anomalous Query Pattern Detected',
                description: metrics.anomalyReasons?.join('; ') || 'Query pattern differs from baseline',
                userId: metrics.userId,
                queryHash: metrics.queryHash,
                expansionRatio: metrics.expansionRatio,
                status: 'open',
                triggeredAt: new Date(),
            });
        }
        // Missing reason alert
        if (!reasonValidation.valid) {
            alerts.push({
                tenantId: metrics.tenantId,
                queryScopeMetricId: metricId,
                alertType: 'missing_reason',
                severity: 'high',
                title: 'Missing or Invalid Reason for Access',
                description: reasonValidation.validationErrors?.join('; ') || 'Reason for access required',
                userId: metrics.userId,
                queryHash: metrics.queryHash,
                status: 'open',
                triggeredAt: new Date(),
            });
        }
        // Create alerts
        for (const alert of alerts) {
            await this.createAlert(alert);
        }
        // Send real-time notifications
        if (tripwireViolation.shouldAlert) {
            await this.sendAlertNotification(alerts);
        }
    }
    /**
     * Calculate alert severity based on expansion ratio
     */
    calculateSeverity(expansionRatio, threshold) {
        const exceedance = expansionRatio / threshold;
        if (exceedance >= 5)
            return 'critical';
        if (exceedance >= 3)
            return 'high';
        if (exceedance >= 2)
            return 'medium';
        return 'low';
    }
    // ==========================================================================
    // Database Operations
    // ==========================================================================
    /**
     * Store metrics in database
     */
    async storeMetrics(metrics) {
        const query = `
      INSERT INTO query_scope_metrics (
        tenant_id, user_id, query_id, correlation_id,
        query_type, query_name, query_hash,
        initial_selectors, expanded_selectors, expansion_ratio,
        records_accessed, records_returned, selectivity_ratio,
        purpose, reason_for_access, reason_required, reason_provided,
        is_anomaly, anomaly_score, anomaly_reasons,
        tripwire_threshold, tripwire_triggered, alert_sent,
        execution_time_ms, executed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING id
    `;
        const values = [
            metrics.tenantId,
            metrics.userId,
            metrics.queryId,
            metrics.correlationId,
            metrics.queryType,
            metrics.queryName,
            metrics.queryHash,
            metrics.initialSelectors,
            metrics.expandedSelectors,
            metrics.expansionRatio,
            metrics.recordsAccessed,
            metrics.recordsReturned,
            metrics.selectivityRatio,
            metrics.purpose,
            metrics.reasonForAccess,
            metrics.reasonRequired,
            metrics.reasonProvided,
            metrics.isAnomaly,
            metrics.anomalyScore,
            metrics.anomalyReasons,
            metrics.tripwireThreshold,
            metrics.tripwireTriggered,
            metrics.alertSent,
            metrics.executionTimeMs,
            metrics.executedAt,
        ];
        const result = await this.postgres.query(query, values);
        return result.rows[0].id;
    }
    /**
     * Get tripwire configuration for tenant/query
     */
    async getTripwireConfig(tenantId, queryType, queryPattern) {
        // Try cache first
        const cacheKey = `${this.TRIPWIRE_CACHE_PREFIX}${tenantId}:${queryType}:${queryPattern}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Query database
        const query = `
      SELECT * FROM tripwire_config
      WHERE tenant_id = $1
        AND (query_type = $2 OR query_type IS NULL)
        AND (query_pattern = $3 OR query_pattern IS NULL)
      ORDER BY
        CASE WHEN query_pattern IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN query_type IS NOT NULL THEN 1 ELSE 2 END
      LIMIT 1
    `;
        const result = await this.postgres.query(query, [tenantId, queryType, queryPattern]);
        let config;
        if (result.rows.length > 0) {
            const row = result.rows[0];
            config = {
                tenantId: row.tenant_id,
                queryType: row.query_type,
                queryPattern: row.query_pattern,
                maxExpansionRatio: parseFloat(row.max_expansion_ratio),
                maxRecordsAccessed: row.max_records_accessed,
                maxSelectivityRatio: row.max_selectivity_ratio ? parseFloat(row.max_selectivity_ratio) : undefined,
                requireReason: row.require_reason,
                blockOnViolation: row.block_on_violation,
                alertOnViolation: row.alert_on_violation,
            };
        }
        else {
            // Default configuration
            config = {
                tenantId,
                maxExpansionRatio: this.DEFAULT_MAX_EXPANSION_RATIO,
                requireReason: false,
                blockOnViolation: false,
                alertOnViolation: true,
            };
        }
        // Cache for 1 hour
        await this.redis.setex(cacheKey, this.METRICS_CACHE_TTL, JSON.stringify(config));
        return config;
    }
    /**
     * Get statistical baseline for query pattern
     */
    async getBaseline(tenantId, queryHash) {
        // Try cache first
        const cacheKey = `${this.BASELINE_CACHE_PREFIX}${tenantId}:${queryHash}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Query database
        const query = `
      SELECT * FROM selector_minimization_baselines
      WHERE tenant_id = $1 AND query_hash = $2
    `;
        const result = await this.postgres.query(query, [tenantId, queryHash]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const baseline = {
            tenantId: row.tenant_id,
            queryHash: row.query_hash,
            queryType: row.query_type,
            queryName: row.query_name,
            avgExpansionRatio: parseFloat(row.avg_expansion_ratio),
            stdDevExpansion: parseFloat(row.std_dev_expansion),
            p95ExpansionRatio: parseFloat(row.p95_expansion_ratio),
            p99ExpansionRatio: parseFloat(row.p99_expansion_ratio),
            avgRecordsAccessed: parseInt(row.avg_records_accessed),
            p95RecordsAccessed: parseInt(row.p95_records_accessed),
            sampleSize: parseInt(row.sample_size),
            lastCalculatedAt: new Date(row.last_calculated_at),
        };
        // Cache for 1 hour
        await this.redis.setex(cacheKey, this.METRICS_CACHE_TTL, JSON.stringify(baseline));
        return baseline;
    }
    /**
     * Update baseline statistics (async, best-effort)
     */
    async updateBaseline(metrics) {
        try {
            // Recalculate baseline using recent data (last 1000 queries)
            const query = `
        WITH recent_metrics AS (
          SELECT
            expansion_ratio,
            records_accessed
          FROM query_scope_metrics
          WHERE tenant_id = $1
            AND query_hash = $2
            AND executed_at > NOW() - INTERVAL '30 days'
          ORDER BY executed_at DESC
          LIMIT 1000
        ),
        stats AS (
          SELECT
            AVG(expansion_ratio) as avg_expansion,
            STDDEV(expansion_ratio) as std_expansion,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY expansion_ratio) as p95_expansion,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY expansion_ratio) as p99_expansion,
            AVG(records_accessed)::INTEGER as avg_records,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY records_accessed)::INTEGER as p95_records,
            COUNT(*) as sample_size
          FROM recent_metrics
        )
        INSERT INTO selector_minimization_baselines (
          tenant_id, query_hash, query_type, query_name,
          avg_expansion_ratio, std_dev_expansion,
          p95_expansion_ratio, p99_expansion_ratio,
          avg_records_accessed, p95_records_accessed,
          sample_size, last_calculated_at
        )
        SELECT
          $1, $2, $3, $4,
          avg_expansion, std_expansion,
          p95_expansion, p99_expansion,
          avg_records, p95_records,
          sample_size, NOW()
        FROM stats
        WHERE sample_size >= 10
        ON CONFLICT (tenant_id, query_hash)
        DO UPDATE SET
          avg_expansion_ratio = EXCLUDED.avg_expansion_ratio,
          std_dev_expansion = EXCLUDED.std_dev_expansion,
          p95_expansion_ratio = EXCLUDED.p95_expansion_ratio,
          p99_expansion_ratio = EXCLUDED.p99_expansion_ratio,
          avg_records_accessed = EXCLUDED.avg_records_accessed,
          p95_records_accessed = EXCLUDED.p95_records_accessed,
          sample_size = EXCLUDED.sample_size,
          last_calculated_at = EXCLUDED.last_calculated_at
      `;
            await this.postgres.query(query, [
                metrics.tenantId,
                metrics.queryHash,
                metrics.queryType,
                metrics.queryName,
            ]);
            // Invalidate cache
            const cacheKey = `${this.BASELINE_CACHE_PREFIX}${metrics.tenantId}:${metrics.queryHash}`;
            await this.redis.del(cacheKey);
        }
        catch (error) {
            logger_js_1.default.error('Failed to update baseline', { error, queryHash: metrics.queryHash });
            // Non-critical, don't throw
        }
    }
    /**
     * Create an alert
     */
    async createAlert(alert) {
        const query = `
      INSERT INTO selector_minimization_alerts (
        tenant_id, query_scope_metric_id, alert_type, severity,
        title, description, user_id, query_hash,
        expansion_ratio, threshold_exceeded, status, triggered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
        const values = [
            alert.tenantId,
            alert.queryScopeMetricId,
            alert.alertType,
            alert.severity,
            alert.title,
            alert.description,
            alert.userId,
            alert.queryHash,
            alert.expansionRatio,
            alert.thresholdExceeded,
            alert.status,
            alert.triggeredAt,
        ];
        const result = await this.postgres.query(query, values);
        return result.rows[0].id;
    }
    /**
     * Send alert notification via Redis pub/sub
     */
    async sendAlertNotification(alerts) {
        try {
            for (const alert of alerts) {
                await this.redis.publish(`alerts:selector-minimization:${alert.tenantId}`, JSON.stringify(alert));
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to send alert notification', { error });
            // Non-critical, don't throw
        }
    }
    // ==========================================================================
    // Utility Methods
    // ==========================================================================
    /**
     * Hash query for pattern matching
     */
    hashQuery(query) {
        // Normalize query by removing whitespace variations and parameter values
        const normalized = query
            .replace(/\s+/g, ' ')
            .replace(/"[^"]*"/g, '""') // Replace string literals
            .replace(/\d+/g, '0') // Replace numbers
            .trim()
            .toLowerCase();
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }
    /**
     * Get recent tripwire violations for trend analysis
     */
    async getTripwireViolations(tenantId, startDate, endDate) {
        const query = `
      SELECT * FROM query_scope_metrics
      WHERE tenant_id = $1
        AND tripwire_triggered = TRUE
        AND executed_at BETWEEN $2 AND $3
      ORDER BY executed_at DESC
    `;
        const result = await this.postgres.query(query, [tenantId, startDate, endDate]);
        return result.rows.map(this.mapRowToMetrics);
    }
    /**
     * Get open alerts for a tenant
     */
    async getOpenAlerts(tenantId) {
        const query = `
      SELECT * FROM selector_minimization_alerts
      WHERE tenant_id = $1 AND status = 'open'
      ORDER BY severity DESC, triggered_at DESC
    `;
        const result = await this.postgres.query(query, [tenantId]);
        return result.rows.map(this.mapRowToAlert);
    }
    /**
     * Map database row to metrics object
     */
    mapRowToMetrics(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            queryId: row.query_id,
            correlationId: row.correlation_id,
            queryType: row.query_type,
            queryName: row.query_name,
            queryHash: row.query_hash,
            initialSelectors: parseInt(row.initial_selectors),
            expandedSelectors: parseInt(row.expanded_selectors),
            expansionRatio: parseFloat(row.expansion_ratio),
            recordsAccessed: parseInt(row.records_accessed),
            recordsReturned: parseInt(row.records_returned),
            selectivityRatio: parseFloat(row.selectivity_ratio),
            purpose: row.purpose,
            reasonForAccess: row.reason_for_access,
            reasonRequired: row.reason_required,
            reasonProvided: row.reason_provided,
            isAnomaly: row.is_anomaly,
            anomalyScore: row.anomaly_score ? parseFloat(row.anomaly_score) : undefined,
            anomalyReasons: row.anomaly_reasons,
            tripwireThreshold: parseFloat(row.tripwire_threshold),
            tripwireTriggered: row.tripwire_triggered,
            alertSent: row.alert_sent,
            executionTimeMs: parseInt(row.execution_time_ms),
            executedAt: new Date(row.executed_at),
        };
    }
    /**
     * Map database row to alert object
     */
    mapRowToAlert(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            queryScopeMetricId: row.query_scope_metric_id,
            alertType: row.alert_type,
            severity: row.severity,
            title: row.title,
            description: row.description,
            userId: row.user_id,
            queryHash: row.query_hash,
            expansionRatio: row.expansion_ratio ? parseFloat(row.expansion_ratio) : undefined,
            thresholdExceeded: row.threshold_exceeded ? parseFloat(row.threshold_exceeded) : undefined,
            status: row.status,
            assignedTo: row.assigned_to,
            resolutionNotes: row.resolution_notes,
            triggeredAt: new Date(row.triggered_at),
            acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        };
    }
}
exports.SelectorMinimizationService = SelectorMinimizationService;
// Singleton instance
exports.selectorMinimizationService = new SelectorMinimizationService();
