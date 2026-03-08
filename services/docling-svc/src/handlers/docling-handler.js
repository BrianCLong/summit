"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoclingHandler = void 0;
const zod_1 = require("zod");
const granite_client_js_1 = require("../granite-client.js");
const config_js_1 = require("../config.js");
const metrics_js_1 = require("../metrics/metrics.js");
const policy_js_1 = require("../security/policy.js");
const ledger_js_1 = require("../provenance/ledger.js");
const redaction_js_1 = require("../utils/redaction.js");
const config = (0, config_js_1.loadConfig)();
const parseSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    tenantId: zod_1.z.string().min(1),
    purpose: zod_1.z.enum([
        'investigation',
        't&s',
        'benchmarking',
        'release_notes',
        'compliance',
    ]),
    retention: zod_1.z.enum(['short', 'standard']),
    contentType: zod_1.z.string().min(1),
    hints: zod_1.z.array(zod_1.z.string()).optional(),
    uri: zod_1.z.string().url().optional(),
    bytes: zod_1.z.string().optional(),
    policyTags: zod_1.z.array(zod_1.z.string()).optional(),
});
const summarizeSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    tenantId: zod_1.z.string().min(1),
    purpose: zod_1.z.enum([
        'investigation',
        't&s',
        'benchmarking',
        'release_notes',
        'compliance',
    ]),
    retention: zod_1.z.enum(['short', 'standard']),
    text: zod_1.z.string().min(1),
    focus: zod_1.z.enum(['failures', 'changelog', 'compliance']),
    maxTokens: zod_1.z.number().int().positive().optional(),
    relatedFragmentIds: zod_1.z.array(zod_1.z.string()).optional(),
    policyTags: zod_1.z.array(zod_1.z.string()).optional(),
});
const extractSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    tenantId: zod_1.z.string().min(1),
    purpose: zod_1.z.enum([
        'investigation',
        't&s',
        'benchmarking',
        'release_notes',
        'compliance',
    ]),
    retention: zod_1.z.enum(['short', 'standard']),
    text: zod_1.z.string().optional(),
    bytes: zod_1.z.string().optional(),
    targets: zod_1.z
        .array(zod_1.z.enum(['license', 'version', 'cve', 'owner', 'policy']))
        .min(1),
    fragmentIds: zod_1.z.array(zod_1.z.string()).optional(),
    policyTags: zod_1.z.array(zod_1.z.string()).optional(),
});
class DoclingHandler {
    client;
    cache = new Map();
    constructor(client = new granite_client_js_1.GraniteDoclingClient()) {
        this.client = client;
    }
    parse = async (req, res) => {
        await this.dispatch(req, res, 'parse', parseSchema, async (payload) => this.client.parse(payload));
    };
    summarize = async (req, res) => {
        await this.dispatch(req, res, 'summarize', summarizeSchema, async (payload) => this.client.summarize(payload));
    };
    extract = async (req, res) => {
        await this.dispatch(req, res, 'extract', extractSchema, async (payload) => this.client.extract(payload));
    };
    metrics = async (_req, res) => {
        res.setHeader('content-type', metrics_js_1.register.contentType);
        res.send(await metrics_js_1.register.metrics());
    };
    cacheSize() {
        return this.cache.size;
    }
    async dispatch(req, res, operation, schema, executor) {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            metrics_js_1.doclingSuccess.labels(operation, 'validation_error').inc();
            return res
                .status(400)
                .json({ error: 'invalid_request', details: parsed.error.issues });
        }
        const payload = parsed.data;
        const policyDecision = (0, policy_js_1.evaluatePurposePolicy)(payload);
        if (!policyDecision.allow) {
            metrics_js_1.doclingSuccess.labels(operation, 'policy_denied').inc();
            return res
                .status(403)
                .json({ error: 'policy_denied', reason: policyDecision.reason });
        }
        const cached = this.getFromCache(payload.requestId);
        if (cached) {
            metrics_js_1.doclingSuccess.labels(operation, 'cache_hit').inc();
            return res.json(cached);
        }
        const timer = metrics_js_1.doclingLatency.startTimer({
            operation,
            tenant_id: payload.tenantId,
            purpose: payload.purpose,
        });
        try {
            const response = await executor(payload);
            timer();
            metrics_js_1.doclingSuccess.labels(operation, 'success').inc();
            metrics_js_1.doclingChars
                .labels(operation, payload.tenantId)
                .inc(response.usage.characters);
            metrics_js_1.doclingCost
                .labels(payload.tenantId, payload.purpose)
                .inc(response.usage.costUsd);
            response.policySignals.forEach((signal) => {
                const decision = (0, policy_js_1.evaluateLicensePolicy)(signal);
                if (!decision.allow) {
                    metrics_js_1.doclingSuccess.labels(operation, 'policy_signal_blocked').inc();
                }
                if (signal.qualitySignals) {
                    Object.entries(signal.qualitySignals).forEach(([key, value]) => metrics_js_1.doclingQuality.labels(key).observe(Number(value)));
                }
            });
            this.putInCache(payload.requestId, response);
            ledger_js_1.provenanceEmitter.record({
                tenantId: response.tenantId,
                purpose: response.purpose,
                retention: response.retention,
                policyTags: payload.policyTags ?? [],
                modelId: response.provenance.modelId,
                modelCheckpoint: response.provenance.modelCheckpoint,
                parameters: response.provenance.parameters,
                input: payload,
                output: response.result,
                requestId: response.requestId,
            });
            const sanitized = (0, redaction_js_1.safeLogPayload)({
                requestId: response.requestId,
                tenantId: response.tenantId,
                purpose: response.purpose,
                retention: response.retention,
            });
            if (sanitized.wasRedacted) {
                metrics_js_1.doclingSuccess.labels(operation, 'redacted').inc();
            }
            return res.json(response);
        }
        catch (error) {
            timer();
            metrics_js_1.doclingSuccess.labels(operation, 'error').inc();
            const fallback = await this.fallback(operation, payload);
            return res.status(502).json({
                error: 'upstream_error',
                message: error?.message || 'Docling upstream failure',
                fallback,
            });
        }
    }
    getFromCache(requestId) {
        const entry = this.cache.get(requestId);
        if (!entry)
            return undefined;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(requestId);
            metrics_js_1.doclingCacheGauge.set(this.cache.size);
            return undefined;
        }
        return entry.response;
    }
    putInCache(requestId, response) {
        if (this.cache.size >= config.maxCacheEntries) {
            const [firstKey] = this.cache.keys();
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(requestId, {
            expiresAt: Date.now() + config.cacheTtlSeconds * 1000,
            response,
        });
        metrics_js_1.doclingCacheGauge.set(this.cache.size);
    }
    async fallback(operation, payload) {
        try {
            if (operation === 'parse') {
                return this.client.parse(payload);
            }
            if (operation === 'summarize') {
                return this.client.summarize(payload);
            }
            if (operation === 'extract') {
                return this.client.extract(payload);
            }
        }
        catch (error) {
            return { error: error.message };
        }
    }
}
exports.DoclingHandler = DoclingHandler;
