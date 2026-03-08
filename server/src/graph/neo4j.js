"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriver = getDriver;
exports.runCypher = runCypher;
exports.closeDriver = closeDriver;
exports.__resetGraphConnectionsForTests = __resetGraphConnectionsForTests;
// @ts-nocheck
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const QuotaEnforcer_js_1 = require("../lib/resources/QuotaEnforcer.js");
const metrics_js_1 = require("../utils/metrics.js");
const queryCache_js_1 = require("./queryCache.js");
let primaryDriver = null;
let replicaDriver = null;
const metrics = new metrics_js_1.PrometheusMetrics('neo4j_driver');
metrics.createGauge('active_sessions', 'Number of active Neo4j sessions');
metrics.createHistogram('query_duration_seconds', 'Neo4j query duration', { buckets: [0.01, 0.05, 0.1, 0.5, 1, 5] });
metrics.createCounter('replica_fallbacks', 'Replica fallbacks when read path fails');
metrics.createCounter('route_choice_total', 'Route selection for graph queries');
metrics.createCounter('sticky_reads', 'Sticky reads routed to primary after write');
let activeSessions = 0;
const recentWrites = new Map();
const stickyWindowMs = parseInt(process.env.GRAPH_STICKY_MS || '3000', 10);
function readReplicaConfigured() {
    return process.env.READ_REPLICA === '1' && (process.env.NEO4J_READ_URI || process.env.NEO4J_REPLICA_URI);
}
function stickyKey(tenantId, caseId) {
    return `${tenantId || 'global'}::${caseId || 'global'}`;
}
function markRecentWrite(options) {
    recentWrites.set(stickyKey(options.tenantId, options.caseId), Date.now());
}
function shouldStickToPrimary(options) {
    const key = stickyKey(options.tenantId, options.caseId);
    const ts = recentWrites.get(key);
    if (!ts)
        return false;
    const fresh = Date.now() - ts < stickyWindowMs;
    if (!fresh)
        recentWrites.delete(key);
    return fresh;
}
function buildDriver(uri) {
    return neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'), { disableLosslessIntegers: true });
}
function getDriver(target = 'primary') {
    const wantsReplica = target === 'replica' && readReplicaConfigured();
    if (wantsReplica) {
        if (!replicaDriver) {
            replicaDriver = buildDriver(process.env.NEO4J_READ_URI || process.env.NEO4J_REPLICA_URI || process.env.NEO4J_URI || 'bolt://localhost:7687');
        }
        return replicaDriver;
    }
    if (!primaryDriver) {
        if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
            if (process.env.NODE_ENV === 'test') {
                throw new Error('Neo4j env vars missing in test');
            }
            console.warn('Neo4j environment variables missing');
        }
        primaryDriver = buildDriver(process.env.NEO4J_URI || 'bolt://localhost:7687');
    }
    return primaryDriver;
}
async function executeWithDriver(driver, cypher, params, mode, route) {
    const session = driver.session({
        defaultAccessMode: mode === 'write' ? neo4j_driver_1.default.session.WRITE : neo4j_driver_1.default.session.READ,
    });
    activeSessions++;
    metrics.setGauge('active_sessions', activeSessions, { route });
    const start = Date.now();
    try {
        const res = await session.run(cypher, params);
        const duration = (Date.now() - start) / 1000;
        metrics.observeHistogram('query_duration_seconds', duration, { route, mode });
        return res.records.map((r) => r.toObject());
    }
    finally {
        await session.close();
        activeSessions--;
        metrics.setGauge('active_sessions', activeSessions, { route });
    }
}
async function runCypher(cypher, params = {}, options = {}) {
    // Write-Aware Sharding Gate (Limited GA)
    if (options.write && options.tenantId) {
        const featureAllowed = QuotaEnforcer_js_1.quotaEnforcer.isFeatureAllowed(options.tenantId, 'write_aware_sharding');
        const MAX_CONCURRENT_WRITES = 50;
        if (activeSessions > MAX_CONCURRENT_WRITES) {
            throw new Error('Database write queue full (Queue Depth Guard)');
        }
        if (featureAllowed) {
            // Future hook for sharded writes
        }
    }
    const isWrite = !!options.write;
    const stickyPrimary = shouldStickToPrimary(options);
    if (stickyPrimary && !isWrite) {
        metrics.incrementCounter('sticky_reads', { scope: options.caseId ? 'case' : 'tenant' });
    }
    const preferReplica = readReplicaConfigured() && !isWrite && !stickyPrimary;
    const routes = preferReplica ? ['replica', 'primary'] : ['primary'];
    const fetchFromDb = async () => {
        let lastError;
        for (const route of routes) {
            try {
                const driver = getDriver(route);
                metrics.incrementCounter('route_choice_total', { target: route });
                return await executeWithDriver(driver, cypher, params, isWrite ? 'write' : 'read', route);
            }
            catch (err) {
                lastError = err;
                if (route === 'replica') {
                    const errorMessage = err instanceof Error ? err.message : 'replica_error';
                    metrics.incrementCounter('replica_fallbacks', { reason: errorMessage });
                    continue;
                }
                throw err;
            }
        }
        throw lastError;
    };
    const cacheEnabled = process.env.QUERY_CACHE === '1' && !isWrite && options.bypassCache !== true;
    const tenantLabel = options.tenantId || 'unknown';
    let result;
    if (cacheEnabled) {
        result = await (0, queryCache_js_1.runWithGraphQueryCache)({
            query: cypher,
            params,
            tenantId: options.tenantId,
            caseId: options.caseId,
            permissionsHash: options.permissionsHash,
            ttlSeconds: options.cacheTtlSeconds,
            op: 'graph-query',
        }, fetchFromDb);
    }
    else {
        const reason = isWrite
            ? 'write'
            : options.bypassCache
                ? 'explicit_bypass'
                : process.env.QUERY_CACHE === '1'
                    ? 'sticky_or_other'
                    : 'disabled';
        (0, queryCache_js_1.recordCacheBypass)(reason, 'graph-query', tenantLabel);
        result = await fetchFromDb();
    }
    if (isWrite) {
        markRecentWrite(options);
        await (0, queryCache_js_1.invalidateGraphQueryCache)({
            tenantId: options.tenantId,
            caseId: options.caseId,
            permissionsHash: options.permissionsHash,
        });
    }
    return result;
}
async function closeDriver() {
    if (primaryDriver) {
        await primaryDriver.close();
        primaryDriver = null;
    }
    if (replicaDriver) {
        await replicaDriver.close();
        replicaDriver = null;
    }
}
function __resetGraphConnectionsForTests() {
    primaryDriver = null;
    replicaDriver = null;
    activeSessions = 0;
    recentWrites.clear();
}
