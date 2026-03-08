"use strict";
/**
 * Ingest Worker
 *
 * Main worker implementation combining all components:
 * - Backpressure control
 * - Rate limiting
 * - Circuit breaking
 * - Retry with exponential backoff
 * - Idempotency checking
 * - DLQ routing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestWorker = void 0;
exports.createWorker = createWorker;
const events_1 = require("events");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const backpressure_js_1 = require("./backpressure.js");
const rate_limiter_js_1 = require("./rate-limiter.js");
const circuit_breaker_js_1 = require("./circuit-breaker.js");
const retry_js_1 = require("./retry.js");
const tracer = api_1.trace.getTracer('@intelgraph/ingest-worker');
class IngestWorker extends events_1.EventEmitter {
    config;
    state = 'idle';
    backpressure;
    rateLimiter;
    circuitBreaker;
    semaphore;
    logger;
    idempotencyStore;
    taskHandler;
    dlqHandler;
    events;
    // Processing state
    activeTasks = new Map();
    taskQueue = [];
    processLoopRunning = false;
    constructor(config, deps = {}, events = {}) {
        super();
        this.config = config;
        this.logger = deps.logger ?? (0, pino_1.default)({ name: config.name, level: 'info' });
        this.idempotencyStore = deps.idempotencyStore;
        this.events = events;
        // Initialize backpressure controller
        this.backpressure = new backpressure_js_1.BackpressureController(config.backpressure, config.maxConcurrency);
        // Initialize rate limiter
        const tenantConfigs = {};
        if (config.tenantRateLimits) {
            for (const [tenantId, rps] of Object.entries(config.tenantRateLimits)) {
                tenantConfigs[tenantId] = { capacity: rps * 2, refillRate: rps };
            }
        }
        this.rateLimiter = new rate_limiter_js_1.MultiTenantRateLimiter({
            capacity: (config.globalRateLimit ?? 1000) * 2,
            refillRate: config.globalRateLimit ?? 1000,
        }, {
            capacity: 200,
            refillRate: 100,
        }, tenantConfigs);
        // Initialize circuit breaker
        this.circuitBreaker = new circuit_breaker_js_1.CircuitBreaker(config.circuitBreaker);
        // Initialize semaphore
        this.semaphore = new backpressure_js_1.Semaphore(config.maxConcurrency);
        // Wire up events
        this.backpressure.on('stateChange', (state, metrics) => {
            this.state = state;
            this.events.onStateChange?.(state, this.getMetrics());
            this.events.onBackpressure?.(this.getMetrics());
        });
        this.circuitBreaker.on('stateChange', (state) => {
            this.events.onCircuitStateChange?.(state);
        });
    }
    /**
     * Set the task handler function.
     */
    setTaskHandler(handler) {
        this.taskHandler = handler;
    }
    /**
     * Set the DLQ handler function.
     */
    setDLQHandler(handler) {
        this.dlqHandler = handler;
    }
    /**
     * Start the worker.
     */
    async start() {
        this.backpressure.start();
        this.startProcessLoop();
        this.logger.info({ name: this.config.name }, 'Worker started');
    }
    /**
     * Stop the worker gracefully.
     */
    async stop() {
        this.backpressure.stop();
        this.processLoopRunning = false;
        // Wait for active tasks to complete
        while (this.activeTasks.size > 0) {
            await this.sleep(100);
        }
        if (this.idempotencyStore) {
            await this.idempotencyStore.close();
        }
        this.logger.info({ name: this.config.name }, 'Worker stopped');
    }
    /**
     * Drain the worker - finish in-flight work but stop accepting new tasks.
     */
    async drain() {
        this.backpressure.enableDrain();
        this.logger.info({ name: this.config.name }, 'Drain mode enabled');
        // Wait for drain to complete
        while (!this.backpressure.isDrained()) {
            await this.sleep(100);
        }
        this.logger.info({ name: this.config.name }, 'Drain complete');
    }
    /**
     * Submit a task for processing.
     */
    async submit(task) {
        return new Promise((resolve) => {
            this.taskQueue.push({ task, resolve });
        });
    }
    /**
     * Process a task immediately (bypass queue).
     */
    async process(task) {
        return this.processTask(task);
    }
    /**
     * Get current worker metrics.
     */
    getMetrics() {
        const backpressureMetrics = this.backpressure.getMetrics();
        return {
            ...backpressureMetrics,
            circuitState: this.circuitBreaker.getState(),
        };
    }
    /**
     * Get worker state.
     */
    getState() {
        return this.state;
    }
    /**
     * Check if worker is accepting tasks.
     */
    isAccepting() {
        return this.backpressure.isAccepting();
    }
    /**
     * Enable brownout mode.
     */
    enableBrownout(sampleRate) {
        this.backpressure.enableBrownout(sampleRate);
    }
    /**
     * Disable brownout mode.
     */
    disableBrownout() {
        this.backpressure.disableBrownout();
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    startProcessLoop() {
        if (this.processLoopRunning)
            return;
        this.processLoopRunning = true;
        const loop = async () => {
            while (this.processLoopRunning) {
                if (this.taskQueue.length === 0 || !this.backpressure.isAccepting()) {
                    await this.sleep(10);
                    continue;
                }
                const item = this.taskQueue.shift();
                if (!item)
                    continue;
                // Process in background
                this.processTask(item.task).then(item.resolve);
            }
        };
        loop().catch((error) => {
            this.logger.error({ error }, 'Process loop error');
        });
    }
    async processTask(task) {
        return tracer.startActiveSpan('ingest.worker.process', async (span) => {
            span.setAttribute('task.id', task.id);
            span.setAttribute('task.tenant_id', task.tenantId);
            span.setAttribute('task.priority', task.priority);
            try {
                // Check idempotency
                if (task.dedupeKey && this.idempotencyStore) {
                    const alreadyProcessed = await this.idempotencyStore.has(task.dedupeKey);
                    if (alreadyProcessed) {
                        span.addEvent('task_skipped_duplicate');
                        return {
                            success: true,
                            attempts: 0,
                            totalDelayMs: 0,
                        };
                    }
                }
                // Acquire backpressure slot
                const { acquired, waitMs, reason } = await this.backpressure.acquire(task.priority);
                if (!acquired) {
                    if (reason === 'brownout' || reason === 'drain_mode') {
                        span.addEvent('task_dropped', { reason });
                        this.events.onTaskDrop?.(task, reason);
                        return {
                            success: false,
                            attempts: 0,
                            totalDelayMs: 0,
                            reasonCode: 'RATE_LIMITED',
                        };
                    }
                    // Wait and retry
                    if (waitMs && waitMs > 0) {
                        await this.sleep(waitMs);
                    }
                }
                // Acquire rate limit
                const rateLimitWait = await this.rateLimiter.acquire(task.tenantId);
                if (rateLimitWait > 0) {
                    span.addEvent('rate_limited', { waitMs: rateLimitWait });
                }
                // Acquire semaphore
                const release = await this.semaphore.acquire();
                try {
                    // Track active task
                    this.activeTasks.set(task.id, task);
                    this.events.onTaskStart?.(task);
                    // Execute with circuit breaker and retry
                    const result = await this.executeWithRetry(task, span);
                    if (result.success) {
                        // Mark as processed in idempotency store
                        if (task.dedupeKey && this.idempotencyStore) {
                            await this.idempotencyStore.set(task.dedupeKey, {
                                taskId: task.id,
                                tenantId: task.tenantId,
                            });
                        }
                        this.events.onTaskSuccess?.(task, result.value);
                        this.backpressure.release(true, result.attempts > 1);
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                    }
                    else {
                        // Send to DLQ
                        await this.sendToDLQ(task, result.reasonCode, result.error);
                        this.backpressure.release(false, result.attempts > 1);
                        span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: result.error?.message });
                    }
                    return result;
                }
                finally {
                    release();
                    this.activeTasks.delete(task.id);
                }
            }
            catch (error) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(error) });
                span.recordException(error);
                const reasonCode = (0, retry_js_1.classifyError)(error);
                await this.sendToDLQ(task, reasonCode, error);
                this.backpressure.release(false);
                return {
                    success: false,
                    error: error,
                    attempts: 1,
                    totalDelayMs: 0,
                    reasonCode,
                };
            }
            finally {
                span.end();
            }
        });
    }
    async executeWithRetry(task, parentSpan) {
        if (!this.taskHandler) {
            throw new Error('Task handler not set');
        }
        return (0, retry_js_1.retry)(async () => {
            // Execute with circuit breaker
            return this.circuitBreaker.execute(async () => {
                return this.taskHandler(task);
            });
        }, this.config.retry, {
            onRetry: (ctx) => {
                this.events.onTaskRetry?.(task, ctx.lastError, ctx.attempt);
                this.logger.debug({ taskId: task.id, attempt: ctx.attempt, delay: ctx.totalDelayMs }, 'Retrying task');
            },
            onError: (error, ctx) => {
                this.logger.warn({ taskId: task.id, attempt: ctx.attempt, error: error.message }, 'Task attempt failed');
            },
            shouldRetry: (error, ctx) => {
                // Don't retry circuit breaker errors
                if (error instanceof circuit_breaker_js_1.CircuitBreakerError) {
                    return false;
                }
                return (0, retry_js_1.isRetryable)(error, this.config.retry);
            },
        });
    }
    async sendToDLQ(task, reason, error) {
        this.events.onTaskDLQ?.(task, reason, error);
        if (this.dlqHandler) {
            try {
                await this.dlqHandler(task, reason, error);
            }
            catch (dlqError) {
                this.logger.error({ taskId: task.id, reason, dlqError }, 'Failed to send task to DLQ');
            }
        }
        this.logger.warn({ taskId: task.id, reason, error: error.message }, 'Task sent to DLQ');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.IngestWorker = IngestWorker;
/**
 * Create a worker with default configuration.
 */
function createWorker(name, options = {}, deps = {}, events = {}) {
    const config = {
        name,
        maxConcurrency: options.maxConcurrency ?? 10,
        globalRateLimit: options.globalRateLimit ?? 1000,
        tenantRateLimits: options.tenantRateLimits,
        retry: options.retry ?? {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2.0,
            jitterFactor: 0.1,
        },
        circuitBreaker: options.circuitBreaker ?? {
            failureThreshold: 5,
            recoveryTimeMs: 30000,
            successThreshold: 3,
            windowSizeMs: 60000,
        },
        backpressure: options.backpressure ?? {
            tokenBucketCapacity: 2000,
            tokenRefillRate: 1000,
            highWaterMark: 10000,
            lowWaterMark: 1000,
            brownoutSampleRate: 0.1,
        },
        idempotency: options.idempotency,
    };
    return new IngestWorker(config, deps, events);
}
