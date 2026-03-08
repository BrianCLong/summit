"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySink = exports.IntelGraphPipeline = exports.SourceRegistry = exports.DeadLetterQueue = exports.DedupeWindow = exports.TokenBucketRateShaper = void 0;
const api_1 = require("@opentelemetry/api");
const crypto_1 = require("crypto");
class TokenBucketRateShaper {
    capacityPerSecond;
    burstCapacity;
    tokens;
    lastRefill;
    constructor(config) {
        this.capacityPerSecond = config.capacityPerSecond;
        this.burstCapacity = config.burstCapacity ?? config.capacityPerSecond;
        this.tokens = this.burstCapacity;
        this.lastRefill = Date.now();
    }
    refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        if (elapsedSeconds <= 0)
            return;
        const tokensToAdd = elapsedSeconds * this.capacityPerSecond;
        this.tokens = Math.min(this.tokens + tokensToAdd, this.burstCapacity);
        this.lastRefill = now;
    }
    async consume(tokens = 1) {
        if (tokens <= 0)
            return;
        while (true) {
            this.refill();
            if (this.tokens >= tokens) {
                this.tokens -= tokens;
                return;
            }
            const shortage = tokens - this.tokens;
            const waitMs = (shortage / this.capacityPerSecond) * 1000;
            await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
        }
    }
}
exports.TokenBucketRateShaper = TokenBucketRateShaper;
class DedupeWindow {
    windowMs;
    seen = new Map();
    constructor(config) {
        this.windowMs = config.windowMs;
    }
    isDuplicate(key, timestamp = Date.now()) {
        this.evictExpired(timestamp);
        if (this.seen.has(key)) {
            return true;
        }
        this.seen.set(key, timestamp);
        return false;
    }
    evictExpired(now) {
        for (const [key, ts] of this.seen.entries()) {
            if (now - ts > this.windowMs) {
                this.seen.delete(key);
            }
        }
    }
}
exports.DedupeWindow = DedupeWindow;
class DeadLetterQueue {
    config;
    items = [];
    constructor(config) {
        this.config = config;
    }
    enqueue(event, reason) {
        const now = Date.now();
        this.items.push({
            event,
            reason,
            attempts: 0,
            nextAttemptAt: now + this.config.baseBackoffMs,
        });
    }
    async drain(handler) {
        const now = Date.now();
        const ready = this.items.filter((item) => item.nextAttemptAt <= now);
        const remaining = this.items.filter((item) => item.nextAttemptAt > now);
        this.items.length = 0;
        this.items.push(...remaining);
        for (const item of ready) {
            try {
                await handler(item.event);
            }
            catch (error) {
                const nextBackoff = Math.min(this.config.baseBackoffMs * 2 ** item.attempts, this.config.maxBackoffMs);
                const jitter = Math.floor(Math.random() * this.config.jitterMs);
                const nextAttemptAt = Date.now() + nextBackoff + jitter;
                this.items.push({
                    event: item.event,
                    reason: item.reason,
                    attempts: item.attempts + 1,
                    nextAttemptAt,
                });
                throw error;
            }
        }
    }
    size() {
        return this.items.length;
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
class SourceRegistry {
    sources = new Map();
    register(source) {
        this.sources.set(source.id, { ...source, killSwitch: source.killSwitch ?? false });
    }
    enableKillSwitch(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source)
            throw new Error(`Source ${sourceId} not found`);
        source.killSwitch = true;
    }
    disableKillSwitch(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source)
            throw new Error(`Source ${sourceId} not found`);
        source.killSwitch = false;
    }
    get(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error(`Source ${sourceId} not registered`);
        }
        return source;
    }
}
exports.SourceRegistry = SourceRegistry;
class IntelGraphPipeline {
    config;
    histogram = api_1.metrics.getMeter('intelgraph').createHistogram('intelgraph.pipeline.duration', {
        description: 'End-to-end processing duration in ms',
    });
    processedCounter = api_1.metrics
        .getMeter('intelgraph')
        .createCounter('intelgraph.pipeline.processed', { description: 'Processed events' });
    droppedCounter = api_1.metrics
        .getMeter('intelgraph')
        .createCounter('intelgraph.pipeline.dropped', { description: 'Dropped events' });
    latencies = [];
    constructor(config) {
        this.config = config;
    }
    async process(event) {
        const source = this.config.registry.get(this.config.sourceId);
        if (source.killSwitch) {
            this.config.dlq.enqueue(event, 'kill_switch');
            this.droppedCounter.add(1);
            return null;
        }
        await this.config.rateShaper.consume();
        const start = performance.now();
        let working = { ...event };
        try {
            working = this.config.schema.parse(working);
        }
        catch (error) {
            this.config.dlq.enqueue(event, 'validation_failed');
            this.droppedCounter.add(1);
            return null;
        }
        if (this.config.residencyAllowList &&
            !this.config.residencyAllowList.includes(working.residency)) {
            this.config.dlq.enqueue(event, 'residency_blocked');
            this.droppedCounter.add(1);
            return null;
        }
        for (const cleaner of this.config.cleaners ?? []) {
            working = cleaner(working);
        }
        if (this.config.enricher) {
            working = await this.config.enricher(working);
        }
        const dedupeKey = this.config.dedupeKey(working);
        if (this.config.dedupeWindow.isDuplicate(dedupeKey, Date.now())) {
            this.droppedCounter.add(1);
            return null;
        }
        const piiFields = this.config.piiFields ?? source.piiFields ?? [];
        if (piiFields.length > 0) {
            working = this.redactFields(working, piiFields);
        }
        const route = this.config.route(working);
        const sink = this.config.sinks[route];
        await sink.write(working);
        const duration = performance.now() - start;
        this.histogram.record(duration);
        this.processedCounter.add(1);
        this.trackLatency(duration);
        return { id: working.id ?? (0, crypto_1.randomUUID)(), route, durationMs: duration };
    }
    async processBatch(events) {
        const results = [];
        for (const event of events) {
            const result = await this.process(event);
            if (result) {
                results.push(result);
            }
        }
        return results;
    }
    async replayDeadLetter(handler) {
        await this.config.dlq.drain(handler);
    }
    getP95Latency() {
        if (this.latencies.length === 0)
            return 0;
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const idx = Math.floor(sorted.length * 0.95) - 1;
        return sorted[Math.max(0, idx)];
    }
    trackLatency(duration) {
        this.latencies.push(duration);
        if (this.latencies.length > 500) {
            this.latencies.shift();
        }
        if (this.config.sloThresholdMs && this.getP95Latency() > this.config.sloThresholdMs) {
            this.config.dlq.enqueue({ slo: 'p95_exceeded' }, 'slo_breach');
        }
    }
    redactFields(event, fields) {
        const clone = { ...event };
        for (const field of fields) {
            if (field in clone) {
                clone[field] = '[REDACTED]';
            }
        }
        return clone;
    }
}
exports.IntelGraphPipeline = IntelGraphPipeline;
class InMemorySink {
    name;
    events = [];
    failOn;
    constructor(name, failOn) {
        this.name = name;
        this.failOn = failOn;
    }
    async write(event) {
        if (this.failOn?.(event)) {
            throw new Error('sink_error');
        }
        this.events.push(event);
    }
}
exports.InMemorySink = InMemorySink;
