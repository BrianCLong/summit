"use strict";
/**
 * Base Adapter Implementation
 *
 * Provides common functionality for all ingest adapters including
 * backpressure control, retry logic, checkpointing, and telemetry.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const backpressure_js_1 = require("../lib/backpressure.js");
const retry_js_1 = require("../lib/retry.js");
const dedupe_js_1 = require("../lib/dedupe.js");
const tracer = api_1.trace.getTracer('@intelgraph/ingest-adapters');
class BaseAdapter extends events_1.EventEmitter {
    name;
    sourceType;
    config;
    logger;
    backpressure;
    checkpointStore;
    dlqStore;
    retryConfig;
    running = false;
    initialized = false;
    recordHandler;
    batchHandler;
    errorHandler;
    recordsProcessed = 0;
    recordsFailed = 0;
    lastCheckpointTime = 0;
    checkpointIntervalMs = 10000; // 10 seconds
    constructor(options) {
        super();
        this.config = options.config;
        this.name = options.config.name;
        this.sourceType = options.config.source_type;
        this.checkpointStore = options.checkpointStore;
        this.dlqStore = options.dlqStore;
        this.logger = options.logger ?? (0, pino_1.default)({
            name: `ingest-adapter:${this.name}`,
            level: process.env.LOG_LEVEL ?? 'info',
        });
        this.backpressure = new backpressure_js_1.BackpressureController(options.config.backpressure ?? {
            max_concurrency: 10,
            rate_limit_rps: 1000,
            high_water_mark: 10000,
            low_water_mark: 1000,
        });
        this.retryConfig = options.config.retry ?? retry_js_1.DEFAULT_RETRY_CONFIG;
        // Wire up events
        if (options.events) {
            this.recordHandler = options.events.onRecord;
            this.batchHandler = options.events.onBatch;
            this.errorHandler = options.events.onError;
            if (options.events.onBackpressure) {
                this.backpressure.on('stateChange', (state, metrics) => {
                    options.events.onBackpressure(metrics);
                });
            }
            if (options.events.onCheckpoint) {
                this.on('checkpoint', options.events.onCheckpoint);
            }
        }
        // Forward backpressure events
        this.backpressure.on('stateChange', (state, metrics) => {
            this.emit('backpressure', state, metrics);
            this.logger.info({ state, metrics }, 'Backpressure state changed');
        });
        this.backpressure.on('throttle', (waitMs) => {
            this.logger.debug({ waitMs }, 'Throttling');
        });
        this.backpressure.on('drop', (reason) => {
            this.logger.warn({ reason }, 'Record dropped due to backpressure');
        });
    }
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    async initialize() {
        if (this.initialized) {
            return;
        }
        return tracer.startActiveSpan('adapter.initialize', async (span) => {
            try {
                span.setAttribute('adapter.name', this.name);
                span.setAttribute('adapter.source_type', this.sourceType);
                await this.doInitialize();
                this.initialized = true;
                this.logger.info('Adapter initialized');
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            catch (error) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }
        if (this.running) {
            this.logger.warn('Adapter already running');
            return;
        }
        return tracer.startActiveSpan('adapter.start', async (span) => {
            try {
                span.setAttribute('adapter.name', this.name);
                this.running = true;
                await this.doStart();
                this.logger.info('Adapter started');
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            catch (error) {
                this.running = false;
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async stop() {
        if (!this.running) {
            return;
        }
        return tracer.startActiveSpan('adapter.stop', async (span) => {
            try {
                span.setAttribute('adapter.name', this.name);
                this.running = false;
                await this.doStop();
                // Final checkpoint
                await this.maybeCheckpoint(true);
                this.logger.info({
                    recordsProcessed: this.recordsProcessed,
                    recordsFailed: this.recordsFailed,
                }, 'Adapter stopped');
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            catch (error) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async drain() {
        this.backpressure.enableDrain();
        this.logger.info('Drain mode enabled');
        // Wait for in-flight work to complete
        while (this.backpressure.getMetrics().concurrency_used > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await this.stop();
    }
    getBackpressureState() {
        return this.backpressure.getMetrics();
    }
    async getCheckpoint() {
        if (!this.checkpointStore) {
            return null;
        }
        return this.checkpointStore.get(this.config.tenant_id, this.getSourceIdentifier());
    }
    async setCheckpoint(checkpoint) {
        if (!this.checkpointStore) {
            throw new Error('No checkpoint store configured');
        }
        await this.checkpointStore.set(checkpoint);
        this.emit('checkpoint', checkpoint);
    }
    async healthCheck() {
        const baseHealth = {
            initialized: this.initialized,
            running: this.running,
            backpressure: this.backpressure.getMetrics(),
            recordsProcessed: this.recordsProcessed,
            recordsFailed: this.recordsFailed,
        };
        try {
            const adapterHealth = await this.doHealthCheck();
            return {
                healthy: adapterHealth.healthy && this.initialized,
                details: {
                    ...baseHealth,
                    ...adapterHealth.details,
                },
            };
        }
        catch (error) {
            return {
                healthy: false,
                details: {
                    ...baseHealth,
                    error: String(error),
                },
            };
        }
    }
    // -------------------------------------------------------------------------
    // Protected Methods (for use by concrete adapters)
    // -------------------------------------------------------------------------
    /**
     * Process a single record with backpressure, retry, and telemetry.
     */
    async processRecord(envelope, parentSpan) {
        const spanContext = parentSpan ? api_1.trace.setSpan(api_1.context.active(), parentSpan) : api_1.context.active();
        return tracer.startActiveSpan('ingest.process_record', { attributes: { 'tenant.id': envelope.tenant_id, 'entity.type': envelope.entity.type } }, spanContext, async (span) => {
            try {
                span.setAttribute('entity.id', envelope.entity.id);
                span.setAttribute('revision', envelope.revision.number);
                span.setAttribute('dedupe_key', envelope.dedupe_key);
                // Validate dedupe key
                if (!(0, dedupe_js_1.validateDedupeKey)(envelope)) {
                    throw new Error('Invalid dedupe_key');
                }
                // Acquire backpressure slot
                const priority = envelope.metadata?.priority ?? 50;
                const { acquired, waitMs } = await this.backpressure.acquire(priority);
                if (!acquired) {
                    if (waitMs && waitMs > 0) {
                        span.addEvent('backpressure_wait', { waitMs });
                        await new Promise((resolve) => setTimeout(resolve, waitMs));
                        // Try again after wait
                        const retryAcquire = await this.backpressure.acquire(priority);
                        if (!retryAcquire.acquired) {
                            throw new Error('Failed to acquire backpressure slot after wait');
                        }
                    }
                    else {
                        // Dropped due to brownout or drain
                        span.addEvent('record_dropped');
                        return;
                    }
                }
                try {
                    // Process with retry
                    const result = await (0, retry_js_1.retry)(async () => {
                        if (this.recordHandler) {
                            await this.recordHandler(envelope);
                        }
                    }, this.retryConfig, (error) => (0, retry_js_1.isRetryableError)(error));
                    if (!result.success) {
                        throw result.error;
                    }
                    this.recordsProcessed++;
                    span.addEvent('record_processed');
                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                }
                finally {
                    this.backpressure.release();
                }
                // Maybe checkpoint
                await this.maybeCheckpoint();
            }
            catch (error) {
                this.recordsFailed++;
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                // Send to DLQ
                await this.sendToDLQ(envelope, error);
                // Call error handler
                if (this.errorHandler) {
                    await this.errorHandler(error, envelope);
                }
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Process a batch of records.
     */
    async processBatch(envelopes) {
        return tracer.startActiveSpan('ingest.process_batch', async (span) => {
            try {
                span.setAttribute('batch.size', envelopes.length);
                if (this.batchHandler) {
                    await this.batchHandler(envelopes);
                    this.recordsProcessed += envelopes.length;
                }
                else {
                    // Process individually
                    for (const envelope of envelopes) {
                        await this.processRecord(envelope, span);
                    }
                }
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            catch (error) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Create an envelope from raw data.
     */
    createEnvelope(data, entityType, entityId, revision, source) {
        const now = new Date().toISOString();
        const envelope = {
            event_id: (0, crypto_1.randomUUID)(),
            event_type: `ingest.${entityType.toLowerCase()}.v1`,
            event_version: 'v1',
            occurred_at: now,
            recorded_at: now,
            tenant_id: this.config.tenant_id,
            subject_id: null,
            source_service: `ingest-adapter-${this.sourceType}`,
            trace_id: null,
            span_id: null,
            correlation_id: null,
            region: null,
            ingest: {
                source,
                source_type: this.sourceType,
                format: 'json',
            },
            entity: {
                type: entityType,
                id: entityId,
            },
            revision: {
                number: revision,
                timestamp: now,
            },
            schema_version: '1.0.0',
            data,
        };
        return {
            ...envelope,
            dedupe_key: (0, dedupe_js_1.computeDedupeKeyFromEnvelope)(envelope),
        };
    }
    /**
     * Send a failed record to the DLQ.
     */
    async sendToDLQ(envelope, error) {
        if (!this.dlqStore) {
            this.logger.warn({ error: error.message }, 'No DLQ store configured, record lost');
            return;
        }
        const dlqRecord = {
            id: (0, crypto_1.randomUUID)(),
            envelope,
            reason_code: (0, retry_js_1.classifyError)(error),
            error_message: error.message,
            error_stack: error.stack,
            retry_count: 0,
            first_failed_at: new Date().toISOString(),
            last_failed_at: new Date().toISOString(),
            can_redrive: (0, retry_js_1.isRetryableError)(error),
        };
        await this.dlqStore.add(dlqRecord);
        this.logger.warn({ dlqId: dlqRecord.id, reason: dlqRecord.reason_code, entityId: envelope.entity.id }, 'Record sent to DLQ');
    }
    /**
     * Maybe save checkpoint if interval has elapsed.
     */
    async maybeCheckpoint(force = false) {
        if (!this.checkpointStore) {
            return;
        }
        const now = Date.now();
        if (!force && now - this.lastCheckpointTime < this.checkpointIntervalMs) {
            return;
        }
        this.lastCheckpointTime = now;
        // Concrete adapters should call setCheckpoint with their position
    }
}
exports.BaseAdapter = BaseAdapter;
