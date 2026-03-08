"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLRateLimiter = exports.GraphQLCostAnalyzer = void 0;
const graphql_1 = require("graphql");
const cost_guard_1 = require("@ga-graphai/cost-guard");
const DEFAULT_COST_WEIGHTS = {
    fieldCost: 3,
    depthCost: 9,
    listCost: 14,
    cartesianPenalty: 55,
    cartesianListDepth: 3,
    latencyPerFieldMs: 6,
    depthLatencyAmplifier: 0.22,
    listLatencyAmplifier: 0.35,
    minLatencyMs: 45,
};
class GraphQLCostAnalyzer {
    schema;
    weights;
    constructor(schema, weights) {
        this.schema = schema;
        this.weights = { ...DEFAULT_COST_WEIGHTS, ...weights };
    }
    analyze(source) {
        const document = (0, graphql_1.parse)(source);
        const typeInfo = new graphql_1.TypeInfo(this.schema);
        let maxDepth = 0;
        let operations = 0;
        let maxListDepth = 0;
        const depthStack = [];
        const listDepthStack = [];
        (0, graphql_1.visit)(document, (0, graphql_1.visitWithTypeInfo)(typeInfo, {
            Field: {
                enter: () => {
                    const parentDepth = depthStack[depthStack.length - 1] ?? 0;
                    const depth = parentDepth + 1;
                    depthStack.push(depth);
                    maxDepth = Math.max(maxDepth, depth);
                    const currentType = typeInfo.getType();
                    const nullableType = currentType ? (0, graphql_1.getNullableType)(currentType) : undefined;
                    const isList = nullableType ? (0, graphql_1.isListType)(nullableType) : false;
                    const parentListDepth = listDepthStack[listDepthStack.length - 1] ?? 0;
                    const listDepth = parentListDepth + (isList ? 1 : 0);
                    listDepthStack.push(listDepth);
                    maxListDepth = Math.max(maxListDepth, listDepth);
                    operations += 1;
                },
                leave: () => {
                    depthStack.pop();
                    listDepthStack.pop();
                },
            },
        }));
        const containsCartesianProduct = maxListDepth >= this.weights.cartesianListDepth;
        return {
            estimatedRru: this.estimateRru(operations, maxDepth, containsCartesianProduct),
            estimatedLatencyMs: this.estimateLatencyMs(operations, maxDepth, maxListDepth),
            depth: maxDepth,
            operations,
            containsCartesianProduct,
        };
    }
    estimateRru(operations, depth, containsCartesianProduct) {
        const base = Math.max(operations, 1) * this.weights.fieldCost;
        const depthCost = depth * this.weights.depthCost;
        const listCost = Math.max(0, depth - 1) * this.weights.listCost;
        const penalty = containsCartesianProduct ? this.weights.cartesianPenalty : 0;
        return Math.round(base + depthCost + listCost + penalty);
    }
    estimateLatencyMs(operations, depth, listDepth) {
        const base = Math.max(operations, 1) * this.weights.latencyPerFieldMs;
        const depthFactor = 1 + Math.max(0, depth - 1) * this.weights.depthLatencyAmplifier;
        const listFactor = 1 + Math.max(0, listDepth - 1) * this.weights.listLatencyAmplifier;
        return Math.max(this.weights.minLatencyMs, Math.round(base * depthFactor * listFactor));
    }
}
exports.GraphQLCostAnalyzer = GraphQLCostAnalyzer;
class GraphQLRateLimiter {
    schema;
    analyzer;
    costGuard = new cost_guard_1.CostGuard();
    defaultProfile;
    tenantProfiles;
    stats = new Map();
    requestWindows = new Map();
    windowMs;
    maxRequestsPerWindow;
    constructor(schema, options = {}) {
        this.schema = schema;
        this.analyzer = new GraphQLCostAnalyzer(schema, options.costWeights);
        this.defaultProfile = options.defaultProfile ?? cost_guard_1.DEFAULT_PROFILE;
        this.tenantProfiles = new Map(Object.entries(options.tenantProfiles ?? {}));
        this.windowMs = options.windowMs ?? 60_000;
        this.maxRequestsPerWindow = options.maxRequestsPerWindow ?? 120;
    }
    beginExecution(source, tenantId) {
        const plan = this.analyzer.analyze(source);
        const ddosDecision = this.evaluateBurst(tenantId);
        if (ddosDecision) {
            return { plan, decision: ddosDecision };
        }
        const stats = this.ensureStats(tenantId);
        const profile = this.tenantProfiles.get(tenantId) ?? this.defaultProfile;
        const decision = this.costGuard.planBudget({
            tenantId,
            plan,
            profile,
            activeQueries: stats.active,
            recentLatencyP95: this.computeP95(stats.latencies),
        });
        if (decision.action === 'allow') {
            stats.active += 1;
            return {
                plan,
                decision,
                release: (latencyMs) => {
                    stats.active = Math.max(0, stats.active - 1);
                    this.recordLatency(stats, latencyMs);
                },
            };
        }
        return { plan, decision };
    }
    ensureStats(tenantId) {
        const existing = this.stats.get(tenantId);
        if (existing) {
            return existing;
        }
        const created = { active: 0, latencies: [] };
        this.stats.set(tenantId, created);
        return created;
    }
    recordLatency(stats, latencyMs) {
        const normalizedLatency = Number.isFinite(latencyMs)
            ? Math.max(0, Math.round(latencyMs))
            : 0;
        stats.latencies.push(normalizedLatency);
        if (stats.latencies.length > 50) {
            stats.latencies.shift();
        }
    }
    computeP95(latencies) {
        if (!latencies.length) {
            return 0;
        }
        const sorted = [...latencies].sort((a, b) => a - b);
        const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        return sorted[index];
    }
    evaluateBurst(tenantId) {
        if (!this.maxRequestsPerWindow || this.maxRequestsPerWindow <= 0) {
            return null;
        }
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const entries = this.requestWindows.get(tenantId) ?? [];
        const recent = entries.filter((timestamp) => timestamp >= windowStart);
        recent.push(now);
        this.requestWindows.set(tenantId, recent);
        if (recent.length > this.maxRequestsPerWindow) {
            const retryAfterMs = Math.max(0, recent[0] + this.windowMs - now);
            return {
                action: 'kill',
                reason: 'Rate limit exceeded for tenant window',
                reasonCode: 'RATE_LIMIT_WINDOW',
                nextCheckMs: retryAfterMs || 1000,
                metrics: {
                    projectedRru: 0,
                    projectedLatencyMs: 0,
                    saturation: Number((recent.length / this.maxRequestsPerWindow).toFixed(2)),
                },
            };
        }
        return null;
    }
}
exports.GraphQLRateLimiter = GraphQLRateLimiter;
