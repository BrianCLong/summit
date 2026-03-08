"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaDlqPublisher = exports.AdapterExecutor = void 0;
const api_1 = require("@opentelemetry/api");
const kafkajs_1 = require("kafkajs");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'adapter-executor' });
const defaultRetryPolicy = {
    maxAttempts: 3,
    initialDelayMs: 250,
    maxDelayMs: 10_000,
    backoffMultiplier: 2,
    jitterMs: 50,
    retryableErrorCodes: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH'],
};
const defaultCircuitBreaker = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenMaxSuccesses: 2,
};
const defaultEgressProfile = {
    name: 'default-deny',
    allow: [],
    defaultAction: 'deny',
};
class AdapterExecutor {
    config;
    retryPolicy;
    circuitConfig;
    egressProfile;
    defaultTimeoutMs;
    idempotencyTtlMs;
    idempotencyCache = new Map();
    circuitState = {
        state: 'closed',
        failures: 0,
        halfOpenSuccesses: 0,
    };
    meter;
    tracer;
    latency;
    successCounter;
    errorCounter;
    retryCounter;
    dlqCounter;
    circuitOpenCounter;
    dlqPublisher;
    constructor(config = {}) {
        this.config = config;
        this.retryPolicy = { ...defaultRetryPolicy, ...(config.retryPolicy ?? {}) };
        this.circuitConfig = { ...defaultCircuitBreaker, ...(config.circuitBreaker ?? {}) };
        this.egressProfile = config.egressProfile ?? defaultEgressProfile;
        this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30_000;
        this.idempotencyTtlMs = config.idempotencyTtlMs ?? 10 * 60 * 1000;
        const meterName = config.meterName ?? '@intelgraph/adapter-sdk';
        this.meter = api_1.metrics.getMeter(meterName, '1.0.0');
        this.tracer = api_1.trace.getTracer(meterName, '1.0.0');
        this.latency = this.meter.createHistogram('adapter_execution_latency_ms', {
            description: 'Execution latency per adapter operation',
        });
        this.successCounter = this.meter.createCounter('adapter_execution_success_total', {
            description: 'Successful adapter executions',
        });
        this.errorCounter = this.meter.createCounter('adapter_execution_error_total', {
            description: 'Failed adapter executions',
        });
        this.retryCounter = this.meter.createCounter('adapter_execution_retry_total', {
            description: 'Retries attempted for adapter executions',
        });
        this.dlqCounter = this.meter.createCounter('adapter_execution_dlq_total', {
            description: 'Messages published to the DLQ',
        });
        this.circuitOpenCounter = this.meter.createCounter('adapter_execution_circuit_open_total', {
            description: 'Times the circuit breaker opened for an adapter',
        });
        this.dlqPublisher = config.dlqPublisher ?? (config.dlq ? new KafkaDlqPublisher(config.dlq) : null);
    }
    async execute(request) {
        const idempotencyKey = request.idempotencyKey ?? `${request.adapterId}:${request.operation}:${JSON.stringify(request.payload ?? '')}`;
        const cached = this.getCachedResult(idempotencyKey);
        if (cached) {
            logger.debug({ adapterId: request.adapterId, operation: request.operation }, 'Serving from idempotency cache');
            return { ...cached, fromCache: true };
        }
        if (this.isCircuitOpen()) {
            const error = new Error('Circuit breaker open for adapter');
            await this.publishToDlq(request, error, 0, 'open', idempotencyKey);
            this.errorCounter.add(1, this.metricAttributes(request, error));
            this.circuitOpenCounter.add(1, this.metricAttributes(request, error));
            return {
                success: false,
                error,
                attempts: 0,
                durationMs: 0,
                fromCache: false,
            };
        }
        try {
            this.validateEgress(request.target);
        }
        catch (error) {
            const egressError = error;
            await this.publishToDlq(request, egressError, 0, this.circuitState.state, idempotencyKey);
            this.errorCounter.add(1, this.metricAttributes(request, egressError));
            return {
                success: false,
                attempts: 0,
                durationMs: 0,
                error: egressError,
                fromCache: false,
            };
        }
        const start = Date.now();
        let lastError;
        for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt++) {
            const span = this.tracer.startSpan('adapter.execute', {
                attributes: {
                    'adapter.id': request.adapterId,
                    'adapter.operation': request.operation,
                    'adapter.attempt': attempt,
                },
            });
            try {
                const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
                const result = await this.runWithTimeout(request, attempt, timeoutMs, idempotencyKey);
                const durationMs = Date.now() - start;
                const executionResult = {
                    success: true,
                    result,
                    attempts: attempt,
                    durationMs,
                    fromCache: false,
                };
                this.recordSuccess(request, durationMs);
                this.resetCircuit();
                this.cacheResult(idempotencyKey, executionResult);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                span.end();
                return executionResult;
            }
            catch (error) {
                lastError = error;
                this.recordFailure();
                this.errorCounter.add(1, this.metricAttributes(request, lastError));
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: String(lastError) });
                span.recordException(lastError);
                span.end();
                const shouldRetry = attempt < this.retryPolicy.maxAttempts && this.isRetryable(lastError, request.operation);
                if (!shouldRetry) {
                    const durationMs = Date.now() - start;
                    await this.publishToDlq(request, lastError, attempt, this.circuitState.state, idempotencyKey);
                    return {
                        success: false,
                        attempts: attempt,
                        durationMs,
                        error: lastError,
                        fromCache: false,
                    };
                }
                this.retryCounter.add(1, this.metricAttributes(request, lastError));
                await this.delay(this.backoffDelay(attempt));
            }
        }
        throw lastError ?? new Error('Adapter execution failed');
    }
    async shutdown() {
        if (this.dlqPublisher?.shutdown) {
            await this.dlqPublisher.shutdown();
        }
    }
    async runWithTimeout(request, attempt, timeoutMs, idempotencyKey) {
        const controller = new AbortController();
        const timeoutError = new Error(`Adapter execution timed out after ${timeoutMs}ms`);
        timeoutError.name = 'TimeoutError';
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(timeoutError);
            }, timeoutMs);
        });
        try {
            const context = {
                attempt,
                signal: controller.signal,
                idempotencyKey,
                metadata: request.metadata,
            };
            return await Promise.race([request.execute(context), timeoutPromise]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    isRetryable(error, operation) {
        if (error.name === 'TimeoutError') {
            return true;
        }
        const code = error.code;
        if (code && this.retryPolicy.retryableErrorCodes?.includes(code)) {
            return true;
        }
        logger.warn({ operation, code: code ?? 'unknown', error: error.message }, 'Not retrying adapter operation');
        return false;
    }
    backoffDelay(attempt) {
        const exponential = this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1);
        const capped = Math.min(exponential, this.retryPolicy.maxDelayMs);
        const jitter = this.retryPolicy.jitterMs
            ? Math.floor(Math.random() * this.retryPolicy.jitterMs)
            : 0;
        return capped + jitter;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    isCircuitOpen() {
        if (this.circuitState.state === 'open' && this.circuitState.openedAt) {
            const now = Date.now();
            if (now - this.circuitState.openedAt >= this.circuitConfig.resetTimeoutMs) {
                this.circuitState.state = 'half-open';
                this.circuitState.failures = 0;
                this.circuitState.halfOpenSuccesses = 0;
                return false;
            }
            return true;
        }
        return false;
    }
    recordFailure() {
        this.circuitState.failures += 1;
        const threshold = this.circuitConfig.failureThreshold;
        if (this.circuitState.state === 'half-open') {
            this.tripCircuit();
            return;
        }
        if (this.circuitState.failures >= threshold && this.circuitState.state === 'closed') {
            this.tripCircuit();
        }
    }
    resetCircuit() {
        if (this.circuitState.state === 'closed') {
            this.circuitState.failures = 0;
            return;
        }
        if (this.circuitState.state === 'half-open') {
            this.circuitState.halfOpenSuccesses += 1;
            const successesNeeded = this.circuitConfig.halfOpenMaxSuccesses ?? 1;
            if (this.circuitState.halfOpenSuccesses >= successesNeeded) {
                this.circuitState = {
                    state: 'closed',
                    failures: 0,
                    halfOpenSuccesses: 0,
                };
            }
        }
        else {
            this.circuitState = {
                state: 'closed',
                failures: 0,
                halfOpenSuccesses: 0,
            };
        }
    }
    tripCircuit() {
        this.circuitState = {
            state: 'open',
            failures: 0,
            openedAt: Date.now(),
            halfOpenSuccesses: 0,
        };
        this.circuitOpenCounter.add(1);
        logger.warn('Circuit breaker opened for adapter executor');
    }
    validateEgress(target) {
        if (!target) {
            return;
        }
        const profile = this.egressProfile ?? defaultEgressProfile;
        const url = new URL(target);
        const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
        const allowed = profile.allow.some((rule) => {
            const hostMatch = rule.host === url.hostname ||
                (rule.host.startsWith('*.') && url.hostname.endsWith(rule.host.replace('*.', '')));
            if (!hostMatch) {
                return false;
            }
            const protocolAllowed = !rule.protocols || rule.protocols.includes(url.protocol.replace(':', ''));
            const portAllowed = !rule.ports || rule.ports.includes(port);
            return protocolAllowed && portAllowed;
        });
        if (!allowed && profile.defaultAction === 'deny') {
            throw new Error(`Network egress denied for ${url.hostname}:${port} under profile ${profile.name}`);
        }
    }
    metricAttributes(request, error) {
        return {
            adapter: request.adapterId,
            operation: request.operation,
            ...(error ? { error: error.name } : {}),
        };
    }
    recordSuccess(request, durationMs) {
        this.successCounter.add(1, this.metricAttributes(request));
        this.latency.record(durationMs, this.metricAttributes(request));
    }
    cacheResult(key, result) {
        const expiresAt = Date.now() + this.idempotencyTtlMs;
        this.idempotencyCache.set(key, { expiresAt, result });
    }
    getCachedResult(key) {
        const cached = this.idempotencyCache.get(key);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.expiresAt) {
            this.idempotencyCache.delete(key);
            return null;
        }
        return cached.result;
    }
    async publishToDlq(request, error, attempts, circuitState, idempotencyKey) {
        if (!this.dlqPublisher) {
            return;
        }
        const event = {
            adapterId: request.adapterId,
            operation: request.operation,
            idempotencyKey,
            error: error.message,
            payload: request.payload,
            attempts,
            metadata: request.metadata,
            circuitState,
            timestamp: Date.now(),
        };
        await this.dlqPublisher.publish(event);
        this.dlqCounter.add(1, this.metricAttributes(request, error));
    }
}
exports.AdapterExecutor = AdapterExecutor;
class KafkaDlqPublisher {
    kafka;
    producer = null;
    topic;
    constructor(config) {
        this.kafka = new kafkajs_1.Kafka({
            clientId: config.clientId ?? 'adapter-sdk',
            brokers: config.brokers,
            ssl: config.ssl,
            sasl: config.sasl,
            logLevel: config.logLevel,
        });
        this.topic = config.topic;
    }
    async publish(event) {
        if (!this.producer) {
            this.producer = this.kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
            await this.producer.connect();
        }
        const payload = JSON.stringify(event);
        await this.producer.send({
            topic: this.topic,
            messages: [
                {
                    key: event.idempotencyKey ?? `${event.adapterId}:${event.operation}`,
                    value: payload,
                    headers: {
                        'dlq.original-adapter': event.adapterId,
                        'dlq.original-operation': event.operation,
                        'dlq.attempts': String(event.attempts),
                        'dlq.timestamp': String(event.timestamp),
                    },
                },
            ],
        });
    }
    async shutdown() {
        if (this.producer) {
            await this.producer.disconnect();
            this.producer = null;
        }
    }
}
exports.KafkaDlqPublisher = KafkaDlqPublisher;
