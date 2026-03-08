"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sloTracker = exports.SloTracker = void 0;
exports.resetSloTracker = resetSloTracker;
exports.resolveTenantId = resolveTenantId;
exports.sloMiddleware = sloMiddleware;
exports.buildSloEvidence = buildSloEvidence;
const prom_client_1 = require("prom-client");
const node_crypto_1 = __importDefault(require("node:crypto"));
const observability_1 = require("./observability");
function ensureSummary(name, factory) {
    const existing = observability_1.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    observability_1.registry.registerMetric(metric);
    return metric;
}
function ensureCounter(name, factory) {
    const existing = observability_1.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    observability_1.registry.registerMetric(metric);
    return metric;
}
function ensureGauge(name, factory) {
    const existing = observability_1.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    observability_1.registry.registerMetric(metric);
    return metric;
}
const latencySummary = ensureSummary('authz_gateway_slo_latency_seconds', () => new prom_client_1.Summary({
    name: 'authz_gateway_slo_latency_seconds',
    help: 'Latency distribution for SLO tracking per tenant and route.',
    percentiles: [0.5, 0.95, 0.99],
    labelNames: ['tenant', 'route'],
    maxAgeSeconds: 300,
    ageBuckets: 5,
}));
const requestsTotal = ensureCounter('authz_gateway_slo_requests_total', () => new prom_client_1.Counter({
    name: 'authz_gateway_slo_requests_total',
    help: 'Total SLO-scoped requests per tenant and route.',
    labelNames: ['tenant', 'route', 'outcome'],
}));
const errorBudgetGauge = ensureGauge('authz_gateway_error_budget_consumed', () => new prom_client_1.Gauge({
    name: 'authz_gateway_error_budget_consumed',
    help: 'Estimated error budget consumed (0-1) per tenant for the active window.',
    labelNames: ['tenant', 'route'],
}));
class SloTracker {
    maxSamples;
    samples = new Map();
    constructor(maxSamples = 1000) {
        this.maxSamples = maxSamples;
    }
    clear() {
        this.samples.clear();
    }
    record(tenantId, route, durationSeconds, statusCode) {
        const key = this.buildKey(tenantId, route);
        const fleetKey = this.buildKey('fleet', route);
        this.appendSample(key, { durationSeconds, statusCode, route, recordedAt: Date.now() });
        this.appendSample(fleetKey, { durationSeconds, statusCode, route, recordedAt: Date.now() });
        const labels = { tenant: tenantId, route };
        const outcome = statusCode >= 500 ? 'error' : 'success';
        latencySummary.observe(labels, durationSeconds);
        requestsTotal.inc({ ...labels, outcome });
        errorBudgetGauge.set(labels, this.estimateErrorBudget(labels));
    }
    snapshot(tenantId, route = 'fleet') {
        const key = this.buildKey(tenantId, route);
        const entries = [...(this.samples.get(key) || [])];
        if (entries.length === 0) {
            return {
                tenantId,
                route,
                window: this.maxSamples,
                requestCount: 0,
                errorRate: 0,
                availability: 1,
                latency: { p50: 0, p95: 0, p99: 0 },
                lastUpdated: 0,
            };
        }
        const durations = entries.map((entry) => entry.durationSeconds).sort((a, b) => a - b);
        const errors = entries.filter((entry) => entry.statusCode >= 500).length;
        const requestCount = entries.length;
        const errorRate = requestCount === 0 ? 0 : errors / requestCount;
        const availability = 1 - errorRate;
        return {
            tenantId,
            route,
            window: this.maxSamples,
            requestCount,
            errorRate,
            availability,
            latency: {
                p50: this.percentile(durations, 0.5),
                p95: this.percentile(durations, 0.95),
                p99: this.percentile(durations, 0.99),
            },
            lastUpdated: entries[entries.length - 1]?.recordedAt ?? 0,
        };
    }
    appendSample(key, sample) {
        const list = this.samples.get(key) ?? [];
        list.push(sample);
        if (list.length > this.maxSamples) {
            list.splice(0, list.length - this.maxSamples);
        }
        this.samples.set(key, list);
    }
    percentile(sorted, q) {
        if (sorted.length === 0)
            return 0;
        const pos = q * (sorted.length - 1);
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        return sorted[base];
    }
    buildKey(tenantId, route) {
        return `${tenantId}:${route}`;
    }
    estimateErrorBudget(labels) {
        const snapshot = this.snapshot(labels.tenant, labels.route);
        return Math.min(1, Math.max(0, snapshot.errorRate));
    }
}
exports.SloTracker = SloTracker;
exports.sloTracker = new SloTracker();
function resetSloTracker() {
    exports.sloTracker.clear();
}
function resolveTenantId(req, res) {
    const headerTenant = req.headers['x-tenant-id'];
    const localsTenant = res.locals?.tenantId || req.subjectAttributes?.tenantId;
    if (typeof headerTenant === 'string' && headerTenant.trim().length > 0) {
        return headerTenant.trim();
    }
    if (Array.isArray(headerTenant) && headerTenant.length > 0) {
        return headerTenant[0];
    }
    if (localsTenant) {
        return localsTenant;
    }
    return 'unknown';
}
function sloMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    const route = req.route?.path || req.path || req.originalUrl || 'unknown';
    res.once('finish', () => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const tenantId = resolveTenantId(req, res);
        exports.sloTracker.record(tenantId, route, durationSeconds, res.statusCode);
    });
    res.once('close', () => {
        // treat aborted requests as server error to burn error budget
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const tenantId = resolveTenantId(req, res);
        exports.sloTracker.record(tenantId, route, durationSeconds, 499);
    });
    next();
}
function buildSloEvidence(tenantId, route = 'fleet') {
    const snapshot = exports.sloTracker.snapshot(tenantId, route);
    return {
        id: node_crypto_1.default.randomUUID(),
        tenantId,
        route,
        generatedAt: new Date().toISOString(),
        metrics: snapshot,
    };
}
