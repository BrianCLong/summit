"use strict";
/**
 * Metrics Ingestion Pipeline
 *
 * High-throughput ingestion of time-series metrics with
 * batching, validation, and multi-tenant support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionPipeline = exports.IngestionErrorCode = void 0;
const events_1 = require("events");
const metric_types_js_1 = require("../models/metric-types.js");
const tenant_js_1 = require("../models/tenant.js");
var IngestionErrorCode;
(function (IngestionErrorCode) {
    IngestionErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    IngestionErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    IngestionErrorCode["METRIC_NOT_ALLOWED"] = "METRIC_NOT_ALLOWED";
    IngestionErrorCode["CARDINALITY_EXCEEDED"] = "CARDINALITY_EXCEEDED";
    IngestionErrorCode["TENANT_INACTIVE"] = "TENANT_INACTIVE";
    IngestionErrorCode["TIMESTAMP_OUT_OF_RANGE"] = "TIMESTAMP_OUT_OF_RANGE";
    IngestionErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(IngestionErrorCode || (exports.IngestionErrorCode = IngestionErrorCode = {}));
// ============================================================================
// INGESTION PIPELINE
// ============================================================================
class IngestionPipeline extends events_1.EventEmitter {
    storageManager;
    logger;
    config;
    tenantConfigs;
    tenantUsage;
    labelCardinality;
    pendingBatches;
    flushTimers;
    kafkaProducer;
    kafkaConsumer;
    metrics = {
        samplesReceived: 0,
        samplesAccepted: 0,
        samplesRejected: 0,
        batchesProcessed: 0,
        flushCount: 0,
    };
    constructor(storageManager, logger, config = {}) {
        super();
        this.storageManager = storageManager;
        this.logger = logger;
        this.config = {
            batchSize: config.batchSize || 1000,
            batchTimeoutMs: config.batchTimeoutMs || 5000,
            enableKafka: config.enableKafka || false,
            kafkaTopic: config.kafkaTopic || 'metrics-ingest',
            maxClockSkewMs: config.maxClockSkewMs || 300000, // 5 minutes
            futureTolerance: config.futureTolerance || 60000, // 1 minute into future
            pastTolerance: config.pastTolerance || 86400000 * 7, // 7 days into past
        };
        this.tenantConfigs = new Map();
        this.tenantUsage = new Map();
        this.labelCardinality = new Map();
        this.pendingBatches = new Map();
        this.flushTimers = new Map();
    }
    /**
     * Initialize the pipeline
     */
    async initialize(kafka) {
        if (this.config.enableKafka && kafka) {
            this.kafkaProducer = kafka.producer();
            this.kafkaConsumer = kafka.consumer({ groupId: 'metrics-ingestion' });
            await this.kafkaProducer.connect();
            await this.kafkaConsumer.connect();
            await this.kafkaConsumer.subscribe({
                topic: this.config.kafkaTopic,
                fromBeginning: false,
            });
            await this.kafkaConsumer.run({
                eachMessage: async (payload) => {
                    await this.handleKafkaMessage(payload);
                },
            });
            this.logger.info('Kafka ingestion pipeline initialized');
        }
        this.logger.info('Ingestion pipeline initialized', { config: this.config });
    }
    /**
     * Register tenant configuration
     */
    registerTenant(config) {
        this.tenantConfigs.set(config.tenantId, config);
        // Initialize usage tracking
        if (!this.tenantUsage.has(config.tenantId)) {
            this.tenantUsage.set(config.tenantId, {
                tenantId: config.tenantId,
                activeSeries: 0,
                ingestionRate: 0,
                storageUsed: 0,
                queriesExecuted: 0,
                queryErrors: 0,
                samplesIngested: 0,
                samplesRejected: 0,
                concurrentQueries: 0,
                lastUpdated: Date.now(),
            });
        }
        // Initialize cardinality tracking
        if (!this.labelCardinality.has(config.tenantId)) {
            this.labelCardinality.set(config.tenantId, new Map());
        }
    }
    /**
     * Ingest a batch of metrics
     */
    async ingest(batch) {
        const { tenantId, metrics, receivedAt } = batch;
        const result = {
            accepted: 0,
            rejected: 0,
            errors: [],
        };
        // Get tenant config
        const tenantConfig = this.tenantConfigs.get(tenantId);
        if (!tenantConfig) {
            return {
                accepted: 0,
                rejected: metrics.length,
                errors: [
                    {
                        reason: `Unknown tenant: ${tenantId}`,
                        code: IngestionErrorCode.VALIDATION_ERROR,
                    },
                ],
            };
        }
        // Check if tenant is active
        if (!tenantConfig.active) {
            return {
                accepted: 0,
                rejected: metrics.length,
                errors: [
                    {
                        reason: 'Tenant is inactive',
                        code: IngestionErrorCode.TENANT_INACTIVE,
                    },
                ],
            };
        }
        const tenantUsage = this.tenantUsage.get(tenantId);
        const now = Date.now();
        // Process each metric
        const validRequests = [];
        for (const metric of metrics) {
            this.metrics.samplesReceived++;
            try {
                // Validate metric schema
                const validationResult = metric_types_js_1.MetricSchema.safeParse(metric);
                if (!validationResult.success) {
                    result.rejected++;
                    result.errors.push({
                        metric: metric.name,
                        reason: validationResult.error.message,
                        code: IngestionErrorCode.VALIDATION_ERROR,
                    });
                    continue;
                }
                // Check if metric is allowed for tenant
                if (!(0, tenant_js_1.isMetricAllowed)(metric.name, tenantConfig)) {
                    result.rejected++;
                    result.errors.push({
                        metric: metric.name,
                        reason: 'Metric not allowed for tenant',
                        code: IngestionErrorCode.METRIC_NOT_ALLOWED,
                    });
                    continue;
                }
                // Validate timestamp
                const timestampError = this.validateTimestamp(metric.timestamp, now);
                if (timestampError) {
                    result.rejected++;
                    result.errors.push({
                        metric: metric.name,
                        reason: timestampError,
                        code: IngestionErrorCode.TIMESTAMP_OUT_OF_RANGE,
                    });
                    continue;
                }
                // Check label cardinality
                const cardinalityError = this.checkLabelCardinality(tenantId, metric);
                if (cardinalityError) {
                    result.rejected++;
                    result.errors.push({
                        metric: metric.name,
                        reason: cardinalityError,
                        code: IngestionErrorCode.CARDINALITY_EXCEEDED,
                    });
                    continue;
                }
                // Check quota
                const quotaCheck = (0, tenant_js_1.checkQuota)('ingest', 1, tenantConfig, tenantUsage);
                if (!quotaCheck.allowed) {
                    result.rejected++;
                    result.errors.push({
                        metric: metric.name,
                        reason: quotaCheck.reason,
                        code: IngestionErrorCode.QUOTA_EXCEEDED,
                    });
                    continue;
                }
                // Extract value based on metric type
                const value = this.extractValue(metric);
                // Create write request
                validRequests.push({
                    metricName: metric.name,
                    labels: metric.labels,
                    timestamp: metric.timestamp,
                    value,
                    tenantId,
                });
                result.accepted++;
                this.metrics.samplesAccepted++;
            }
            catch (error) {
                result.rejected++;
                this.metrics.samplesRejected++;
                result.errors.push({
                    metric: metric.name,
                    reason: error instanceof Error ? error.message : 'Unknown error',
                    code: IngestionErrorCode.INTERNAL_ERROR,
                });
            }
        }
        // Add to pending batch
        if (validRequests.length > 0) {
            await this.addToBatch(tenantId, validRequests);
        }
        // Update usage
        tenantUsage.samplesIngested += result.accepted;
        tenantUsage.samplesRejected += result.rejected;
        tenantUsage.lastUpdated = now;
        // Emit metrics
        this.emit('ingestion', {
            tenantId,
            accepted: result.accepted,
            rejected: result.rejected,
        });
        return result;
    }
    /**
     * Validate timestamp is within acceptable range
     */
    validateTimestamp(timestamp, now) {
        if (timestamp > now + this.config.futureTolerance) {
            return `Timestamp too far in future: ${new Date(timestamp).toISOString()}`;
        }
        if (timestamp < now - this.config.pastTolerance) {
            return `Timestamp too far in past: ${new Date(timestamp).toISOString()}`;
        }
        return null;
    }
    /**
     * Check and track label cardinality
     */
    checkLabelCardinality(tenantId, metric) {
        const tenantCardinality = this.labelCardinality.get(tenantId);
        for (const [labelName, labelValue] of Object.entries(metric.labels)) {
            // Get or create label set
            if (!tenantCardinality.has(labelName)) {
                tenantCardinality.set(labelName, new Set());
            }
            const labelValues = tenantCardinality.get(labelName);
            // Check if adding this value would exceed limit
            const limit = metric_types_js_1.LabelCardinalityLimits[labelName] || 1000;
            if (!labelValues.has(labelValue) && labelValues.size >= limit) {
                return `Label cardinality limit exceeded for '${labelName}': ${labelValues.size}/${limit}`;
            }
            // Track value
            labelValues.add(labelValue);
        }
        return null;
    }
    /**
     * Extract numeric value from metric based on type
     */
    extractValue(metric) {
        switch (metric.type) {
            case metric_types_js_1.MetricType.COUNTER:
            case metric_types_js_1.MetricType.GAUGE:
                return metric.value;
            case metric_types_js_1.MetricType.HISTOGRAM:
                return metric.sum / (metric.count || 1); // Average
            case metric_types_js_1.MetricType.SUMMARY:
                return metric.sum / (metric.count || 1); // Average
        }
    }
    /**
     * Add metrics to pending batch
     */
    async addToBatch(tenantId, requests) {
        // Get or create pending batch
        if (!this.pendingBatches.has(tenantId)) {
            this.pendingBatches.set(tenantId, []);
        }
        const batch = this.pendingBatches.get(tenantId);
        batch.push(...requests);
        // Check if we should flush
        if (batch.length >= this.config.batchSize) {
            await this.flushBatch(tenantId);
        }
        else {
            // Set flush timer if not already set
            if (!this.flushTimers.has(tenantId)) {
                const timer = setTimeout(async () => {
                    await this.flushBatch(tenantId);
                }, this.config.batchTimeoutMs);
                this.flushTimers.set(tenantId, timer);
            }
        }
    }
    /**
     * Flush pending batch to storage
     */
    async flushBatch(tenantId) {
        // Clear timer
        const timer = this.flushTimers.get(tenantId);
        if (timer) {
            clearTimeout(timer);
            this.flushTimers.delete(tenantId);
        }
        // Get and clear batch
        const batch = this.pendingBatches.get(tenantId) || [];
        this.pendingBatches.set(tenantId, []);
        if (batch.length === 0)
            return;
        try {
            await this.storageManager.write(batch);
            this.metrics.batchesProcessed++;
            this.metrics.flushCount++;
            this.logger.debug('Batch flushed', {
                tenantId,
                size: batch.length,
            });
        }
        catch (error) {
            this.logger.error('Failed to flush batch', {
                tenantId,
                size: batch.length,
                error,
            });
            // Re-add to batch for retry
            const currentBatch = this.pendingBatches.get(tenantId) || [];
            this.pendingBatches.set(tenantId, [...batch, ...currentBatch]);
            throw error;
        }
    }
    /**
     * Handle Kafka message
     */
    async handleKafkaMessage(payload) {
        const { message } = payload;
        if (!message.value)
            return;
        try {
            const data = JSON.parse(message.value.toString());
            // Extract tenant ID from message key or payload
            const tenantId = message.key?.toString() || data.tenantId;
            if (!tenantId) {
                this.logger.warn('Kafka message missing tenant ID');
                return;
            }
            // Parse metrics from message
            const metrics = Array.isArray(data.metrics) ? data.metrics : [data];
            await this.ingest({
                tenantId,
                metrics,
                receivedAt: Date.now(),
            });
        }
        catch (error) {
            this.logger.error('Failed to process Kafka message', { error });
        }
    }
    /**
     * Flush all pending batches
     */
    async flushAll() {
        const tenantIds = Array.from(this.pendingBatches.keys());
        await Promise.all(tenantIds.map(async (tenantId) => {
            try {
                await this.flushBatch(tenantId);
            }
            catch (error) {
                this.logger.error('Failed to flush batch for tenant', {
                    tenantId,
                    error,
                });
            }
        }));
    }
    /**
     * Shutdown the pipeline
     */
    async shutdown() {
        // Flush all pending data
        await this.flushAll();
        // Disconnect Kafka
        if (this.kafkaProducer) {
            await this.kafkaProducer.disconnect();
        }
        if (this.kafkaConsumer) {
            await this.kafkaConsumer.disconnect();
        }
        // Clear timers
        for (const timer of this.flushTimers.values()) {
            clearTimeout(timer);
        }
        this.flushTimers.clear();
        this.logger.info('Ingestion pipeline shutdown complete');
    }
    /**
     * Get pipeline metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get tenant usage
     */
    getTenantUsage(tenantId) {
        return this.tenantUsage.get(tenantId);
    }
    /**
     * Reset cardinality tracking (useful for testing)
     */
    resetCardinalityTracking(tenantId) {
        if (tenantId) {
            this.labelCardinality.delete(tenantId);
        }
        else {
            this.labelCardinality.clear();
        }
    }
}
exports.IngestionPipeline = IngestionPipeline;
