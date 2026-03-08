"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BUDGETS = exports.DEFAULT_JOURNEY_TARGETS = exports.DEFAULT_CACHE_CONFIG = exports.PerformanceCostOperatingSystem = exports.ReleaseMarkerEmitter = exports.TelemetryCostController = exports.AsyncJobManager = exports.ResponseShaper = exports.CacheManager = exports.TopOffenderBoard = exports.PerformanceBudgetGate = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_zlib_1 = __importDefault(require("node:zlib"));
const index_js_1 = require("./index.js");
const DEFAULT_JOURNEY_TARGETS = [
    {
        journey: 'case_search_load',
        steps: {
            search_api: 600,
            graph_fetch: 450,
            page_ttfb: 300,
            fcp: 1500,
            inp: 200,
        },
    },
    {
        journey: 'entity_create_link',
        steps: {
            form_submit: 500,
            relationship_write: 350,
            ui_ack: 250,
        },
    },
    {
        journey: 'investigation_timeline',
        steps: {
            timeline_query: 700,
            media_fetch: 800,
            visible_paint: 1800,
        },
    },
    {
        journey: 'export_report',
        steps: {
            request_ack: 200,
            job_enqueue: 100,
            job_completion: 90000,
            download_start: 400,
        },
    },
    {
        journey: 'copilot_suggestion',
        steps: {
            prompt_pipeline: 1200,
            model_call: 800,
            render: 400,
        },
    },
];
exports.DEFAULT_JOURNEY_TARGETS = DEFAULT_JOURNEY_TARGETS;
const DEFAULT_CACHE_CONFIG = {
    defaultTtlMs: 30_000,
    jitterPct: 0.1,
    negativeTtlMs: 5_000,
};
exports.DEFAULT_CACHE_CONFIG = DEFAULT_CACHE_CONFIG;
const DEFAULT_BUDGETS = {
    logsPerMinute: 10_000,
    metricsPerMinute: 4_000,
    tracesPerMinute: 1_200,
    cardinalityLimit: 1_000,
};
exports.DEFAULT_BUDGETS = DEFAULT_BUDGETS;
class PerformanceBudgetGate {
    targets;
    constructor(targets = DEFAULT_JOURNEY_TARGETS) {
        this.targets = new Map();
        targets.forEach((target) => {
            const stepTargets = new Map();
            Object.entries(target.steps).forEach(([step, value]) => {
                stepTargets.set(step, value);
            });
            this.targets.set(target.journey, stepTargets);
        });
    }
    evaluate(sample) {
        if (!sample.journey || !sample.step) {
            throw new Error('Journey telemetry must include journey and step.');
        }
        const stepTargets = this.targets.get(sample.journey);
        const targetMs = stepTargets?.get(sample.step);
        if (!targetMs) {
            return {
                status: 'warn',
                reason: 'No target registered; record for follow-up.',
                targetMs: 0,
                observedMs: sample.p95,
                annotations: {
                    journey: sample.journey,
                    step: sample.step,
                    cacheHit: sample.cacheHit,
                    tenant: sample.tenant ?? 'unknown',
                    sampleRate: sample.sampleRate,
                },
            };
        }
        const errorRateThreshold = 0.02;
        const payloadBudget = sample.cacheHit ? 180_000 : 128_000;
        const violatesLatency = sample.p95 > targetMs;
        const violatesErrors = sample.errorRate > errorRateThreshold;
        const violatesPayload = sample.payloadBytes > payloadBudget;
        if (violatesLatency || violatesErrors || violatesPayload) {
            return {
                status: 'breach',
                reason: this.buildReason(sample, targetMs, {
                    violatesLatency,
                    violatesErrors,
                    violatesPayload,
                }),
                targetMs,
                observedMs: sample.p95,
                annotations: {
                    journey: sample.journey,
                    step: sample.step,
                    errorRate: sample.errorRate,
                    payloadBytes: sample.payloadBytes,
                    cacheHit: sample.cacheHit,
                    tenant: sample.tenant ?? 'unknown',
                    sampleRate: sample.sampleRate,
                },
            };
        }
        return {
            status: 'pass',
            reason: 'Within p95, payload, and error budgets.',
            targetMs,
            observedMs: sample.p95,
            annotations: {
                journey: sample.journey,
                step: sample.step,
                cacheHit: sample.cacheHit,
                tenant: sample.tenant ?? 'unknown',
            },
        };
    }
    buildReason(sample, targetMs, violations) {
        const reasons = [];
        if (violations.violatesLatency) {
            reasons.push(`p95 ${sample.p95}ms exceeds target ${targetMs}ms for ${sample.journey}/${sample.step}`);
        }
        if (violations.violatesErrors) {
            reasons.push(`error rate ${Math.round(sample.errorRate * 100)}% above threshold`);
        }
        if (violations.violatesPayload) {
            reasons.push(`payload ${sample.payloadBytes} bytes exceeds budget (cacheHit=${sample.cacheHit})`);
        }
        return reasons.join('; ');
    }
}
exports.PerformanceBudgetGate = PerformanceBudgetGate;
class TopOffenderBoard {
    offenders = new Map();
    record(offender) {
        const list = this.offenders.get(offender.kind) ?? [];
        const enriched = { ...offender, score: this.score(offender) };
        const existingIndex = list.findIndex((item) => item.id === offender.id);
        if (existingIndex >= 0) {
            list[existingIndex] = enriched;
        }
        else {
            list.push(enriched);
        }
        list.sort((a, b) => b.score - a.score);
        this.offenders.set(offender.kind, list.slice(0, 20));
        return this.snapshot();
    }
    snapshot() {
        return {
            slowestEndpoints: this.offenders.get('endpoint') ?? [],
            slowestQueries: this.offenders.get('query') ?? [],
            slowestPages: this.offenders.get('page') ?? [],
        };
    }
    score(offender) {
        return Number((offender.p95Ms * (1 + offender.errorRate) * offender.volume).toFixed(2));
    }
}
exports.TopOffenderBoard = TopOffenderBoard;
class CacheManager {
    cache = new Map();
    inflight = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }
    async getOrLoad(key, tenantId, loader) {
        const cacheKey = this.buildKey(key, tenantId);
        const now = Date.now();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached;
        }
        const inflight = this.inflight.get(cacheKey);
        if (inflight)
            return inflight;
        const promise = loader().then((result) => {
            const ttlMs = result.negative
                ? this.config.negativeTtlMs
                : this.applyJitter(this.config.defaultTtlMs);
            const entry = {
                key,
                tenantId,
                value: result.value,
                negative: result.negative ?? false,
                checksum: this.checksum(result.value),
                expiresAt: now + ttlMs,
            };
            this.cache.set(cacheKey, entry);
            this.inflight.delete(cacheKey);
            return entry;
        });
        this.inflight.set(cacheKey, promise);
        return promise;
    }
    invalidate(key, tenantId) {
        if (tenantId) {
            this.cache.delete(this.buildKey(key, tenantId));
            return;
        }
        Array.from(this.cache.keys()).forEach((cacheKey) => {
            if (cacheKey.includes(`:${key}:`)) {
                this.cache.delete(cacheKey);
            }
        });
    }
    applyJitter(ttl) {
        const jitter = this.config.jitterPct;
        const delta = ttl * jitter * (Math.random() * 2 - 1);
        return Math.max(1_000, Math.round(ttl + delta));
    }
    buildKey(key, tenantId) {
        return `${tenantId}:${key}`;
    }
    checksum(value) {
        return node_crypto_1.default.createHash('sha256').update(JSON.stringify(value)).digest('hex');
    }
}
exports.CacheManager = CacheManager;
class ResponseShaper {
    shape(payload, options) {
        const allowedFields = new Set(options.allowedFields);
        const filteredEntries = Object.entries(payload).filter(([field]) => allowedFields.has(field));
        const filtered = Object.fromEntries(filteredEntries);
        const limit = this.enforcePagination(options);
        const offset = options.offset ?? 0;
        const paginated = this.applyPagination(filtered, offset, limit);
        const envelope = {
            version: options.version,
            partial: options.partial ?? false,
            data: paginated,
            pagination: { offset, limit, total: Array.isArray(payload.data) ? payload.data.length : undefined },
        };
        const serialized = JSON.stringify(envelope);
        envelope.checksum = node_crypto_1.default.createHash('sha256').update(serialized).digest('hex');
        if (Buffer.byteLength(serialized) > options.compressionThresholdBytes) {
            const compressed = node_zlib_1.default.brotliCompressSync(Buffer.from(serialized));
            envelope.compressed = compressed;
            envelope.encoding = 'brotli';
        }
        return envelope;
    }
    enforcePagination(options) {
        const tierLimit = this.tierLimit(options.tenantTier);
        return Math.min(options.pageSizeLimit, tierLimit, options.limit ?? options.pageSizeLimit);
    }
    tierLimit(tier) {
        switch (tier) {
            case 'strategic':
                return 500;
            case 'premium':
                return 200;
            default:
                return 100;
        }
    }
    applyPagination(payload, offset, limit) {
        if (!Array.isArray(payload.data))
            return payload;
        return {
            ...payload,
            data: payload.data.slice(offset, offset + limit),
        };
    }
}
exports.ResponseShaper = ResponseShaper;
class AsyncJobManager {
    config;
    inFlightByTenant = new Map();
    processed = new Map();
    pausedTenants = new Set();
    globalPaused = false;
    constructor(config = {}) {
        this.config = {
            defaultConcurrency: 4,
            perTenantConcurrency: 3,
            dedupeWindowMs: 15 * 60 * 1000,
            ...config,
        };
    }
    pauseGlobal() {
        this.globalPaused = true;
    }
    resumeGlobal() {
        this.globalPaused = false;
    }
    pauseTenant(tenantId) {
        this.pausedTenants.add(tenantId);
    }
    resumeTenant(tenantId) {
        this.pausedTenants.delete(tenantId);
    }
    async enqueue(job) {
        if (this.globalPaused || this.pausedTenants.has(job.tenantId)) {
            throw new Error(`Job scheduling paused for tenant ${job.tenantId}`);
        }
        const cached = this.lookupProcessed(job.idempotencyKey);
        if (cached)
            return cached;
        await this.enforceConcurrency(job.tenantId);
        try {
            const startedAt = Date.now();
            const result = await job.handler();
            const execution = {
                id: job.idempotencyKey,
                tenantId: job.tenantId,
                status: 'success',
                durationMs: Date.now() - startedAt,
                classification: job.classification,
                result,
            };
            this.processed.set(job.idempotencyKey, execution);
            this.decrementTenant(job.tenantId);
            return execution;
        }
        catch (error) {
            this.decrementTenant(job.tenantId);
            throw error;
        }
    }
    async enforceConcurrency(tenantId) {
        const active = this.inFlightByTenant.get(tenantId) ?? 0;
        if (active >= this.config.perTenantConcurrency) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            return this.enforceConcurrency(tenantId);
        }
        this.inFlightByTenant.set(tenantId, active + 1);
    }
    decrementTenant(tenantId) {
        const active = this.inFlightByTenant.get(tenantId) ?? 0;
        this.inFlightByTenant.set(tenantId, Math.max(0, active - 1));
    }
    lookupProcessed(idempotencyKey) {
        const processed = this.processed.get(idempotencyKey);
        if (!processed)
            return undefined;
        const expired = Date.now() - processed.durationMs > this.config.dedupeWindowMs;
        return expired ? undefined : processed;
    }
}
exports.AsyncJobManager = AsyncJobManager;
class TelemetryCostController {
    config;
    counters = {
        logs: 0,
        metrics: 0,
        traces: 0,
    };
    labelCardinality = new Set();
    constructor(config = {}) {
        this.config = { ...DEFAULT_BUDGETS, ...config };
    }
    ingest(signal) {
        if (signal.labels) {
            Object.entries(signal.labels).forEach(([key, value]) => {
                this.labelCardinality.add(`${key}:${value}`);
            });
            if (this.labelCardinality.size > this.config.cardinalityLimit) {
                return {
                    accepted: false,
                    action: 'reject',
                    reason: 'High-cardinality labels blocked.',
                };
            }
        }
        const kind = signal.kind;
        this.counters[kind] += 1;
        const budget = this.budgetFor(kind);
        if (this.counters[kind] > budget) {
            return {
                accepted: false,
                action: 'throttle',
                reason: `${kind} budget exceeded (${this.counters[kind]} > ${budget}).`,
            };
        }
        return { accepted: true, action: 'allow', reason: 'Within telemetry budget.' };
    }
    reset() {
        this.counters.logs = 0;
        this.counters.metrics = 0;
        this.counters.traces = 0;
        this.labelCardinality.clear();
    }
    budgetFor(kind) {
        if (kind === 'logs')
            return this.config.logsPerMinute;
        if (kind === 'metrics')
            return this.config.metricsPerMinute;
        return this.config.tracesPerMinute;
    }
}
exports.TelemetryCostController = TelemetryCostController;
class ReleaseMarkerEmitter {
    emit(owner, version, commitSha) {
        return {
            owner,
            version,
            commitSha,
            emittedAt: new Date().toISOString(),
            annotations: {
                release: version,
                owner,
                commit: commitSha,
            },
        };
    }
}
exports.ReleaseMarkerEmitter = ReleaseMarkerEmitter;
class PerformanceCostOperatingSystem {
    budgets;
    offenders;
    cache;
    shaper;
    jobs;
    telemetry;
    releaseMarkers;
    resourceEngine;
    constructor() {
        this.budgets = new PerformanceBudgetGate();
        this.offenders = new TopOffenderBoard();
        this.cache = new CacheManager();
        this.shaper = new ResponseShaper();
        this.jobs = new AsyncJobManager();
        this.telemetry = new TelemetryCostController();
        this.releaseMarkers = new ReleaseMarkerEmitter();
        this.resourceEngine = new index_js_1.ResourceOptimizationEngine();
    }
    evaluateJourney(sample) {
        return this.budgets.evaluate(sample);
    }
    trackOffender(offender) {
        return this.offenders.record(offender);
    }
}
exports.PerformanceCostOperatingSystem = PerformanceCostOperatingSystem;
