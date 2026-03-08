"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private = void 0;
exports.getPostgresPool = getPostgresPool;
exports.closePostgresPool = closePostgresPool;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_perf_hooks_1 = require("node:perf_hooks");
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const config_js_1 = require("./config.js");
const logger_js_1 = require("../config/logger.js");
const residency_guard_js_1 = require("../data-residency/residency-guard.js");
const tenantRouter_js_1 = require("./tenantRouter.js");
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
// Constants for pool monitoring and connection management
const POOL_MONITOR_INTERVAL_MS = 30000; // 30 seconds
const WAIT_QUEUE_THRESHOLD = 10; // Number of waiting requests before warning
const MAX_LIFETIME_MS = 3600000; // 1 hour connection lifetime
const CONNECTION_LEAK_THRESHOLD_MS = 60000; // 60 seconds before leak warning
const logger = logger_js_1.logger.child({ name: 'postgres-pool' });
const QUERY_CAPTURE_ENABLED = process.env.DB_QUERY_CAPTURE === '1';
const QUERY_CAPTURE_INTERVAL_MS = parseInt(process.env.DB_QUERY_CAPTURE_INTERVAL_MS ?? '30000', 10);
const QUERY_CAPTURE_MAX_SAMPLES = 200;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;
const MAX_PREPARED_STATEMENTS = 500;
const MAX_SLOW_QUERY_ENTRIES = 200;
class CircuitBreaker {
    name;
    failureThreshold;
    cooldownMs;
    failureCount = 0;
    state = 'closed';
    openUntil = 0;
    lastError;
    constructor(name, failureThreshold, cooldownMs) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
    }
    canExecute() {
        if (this.state === 'open') {
            if (Date.now() >= this.openUntil) {
                this.state = 'half-open';
                logger.warn({ pool: this.name }, 'PostgreSQL circuit breaker half-open');
                return true;
            }
            return false;
        }
        return true;
    }
    recordSuccess() {
        if (this.state !== 'closed' || this.failureCount !== 0) {
            logger.info({ pool: this.name }, 'PostgreSQL circuit breaker reset');
        }
        this.failureCount = 0;
        this.state = 'closed';
        this.openUntil = 0;
        this.lastError = undefined;
    }
    recordFailure(error) {
        this.failureCount += 1;
        this.lastError = error;
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
            this.openUntil = Date.now() + this.cooldownMs;
            logger.error({ pool: this.name, failureCount: this.failureCount, err: error }, 'PostgreSQL circuit breaker opened');
        }
        else if (this.state === 'half-open') {
            this.state = 'open';
            this.openUntil = Date.now() + this.cooldownMs;
            logger.error({ pool: this.name, err: error }, 'PostgreSQL circuit breaker re-opened while half-open');
        }
    }
    getState() {
        if (this.state === 'open' && Date.now() >= this.openUntil) {
            return 'half-open';
        }
        return this.state;
    }
    getFailureCount() {
        return this.failureCount;
    }
    getLastError() {
        return this.lastError;
    }
}
class PoolMonitor {
    intervalId;
    pools = [];
    constructor() { }
    register(pool) {
        this.pools.push(pool);
    }
    start() {
        if (this.intervalId)
            return;
        this.intervalId = setInterval(() => this.check(), POOL_MONITOR_INTERVAL_MS);
        // Unref so it doesn't prevent shutdown if only monitor is running
        this.intervalId.unref();
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.pools = [];
    }
    check() {
        for (const wrapper of this.pools) {
            const total = wrapper.pool.totalCount ?? 0;
            const idle = wrapper.pool.idleCount ?? 0;
            const waiting = wrapper.pool.waitingCount ?? 0;
            const active = total - idle;
            // Log pool stats
            logger.debug({
                pool: wrapper.name,
                total,
                idle,
                active,
                waiting,
            }, 'Pool Monitor Stats');
            // Alert on exhaustion
            if (waiting > WAIT_QUEUE_THRESHOLD) {
                logger.warn({
                    pool: wrapper.name,
                    waiting,
                    threshold: WAIT_QUEUE_THRESHOLD,
                }, 'PostgreSQL Pool Exhaustion Risk');
            }
            // Proactive health check on idle connections could be implemented here
            // But we rely on validateConnection on borrow for now to avoid storming
        }
    }
}
const preparedStatementCache = new Map();
const slowQueryStats = new Map();
const queryCapture = new Map();
let queryCaptureTimer = null;
let writePoolWrapper = null;
let readPoolWrappers = [];
let managedPool = null;
let readReplicaCursor = 0;
const transientErrorCodes = new Set([
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
    '53300', // too_many_connections
    '08000',
    '08003',
    '08006',
    '08001',
    '08004',
    '08007',
    '08P01',
    '40001',
]);
const transientNodeErrors = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'EPIPE',
]);
function parseConnectionConfig() {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const password = process.env.POSTGRES_PASSWORD;
    if (isProduction) {
        if (!password) {
            throw new Error('POSTGRES_PASSWORD environment variable is required in production');
        }
        if (password === 'devpassword') {
            throw new Error('Security Error: POSTGRES_PASSWORD cannot be the default "devpassword" in production');
        }
    }
    return {
        host: process.env.POSTGRES_HOST || 'postgres',
        user: process.env.POSTGRES_USER || 'intelgraph',
        password: password || 'devpassword',
        database: process.env.POSTGRES_DB || 'intelgraph_dev',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    };
}
function parseReadReplicaUrls() {
    const explicit = (process.env.DATABASE_READ_REPLICAS || '')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
    const legacy = process.env.DATABASE_READ_URL
        ? [process.env.DATABASE_READ_URL]
        : [];
    return Array.from(new Set([...explicit, ...legacy]));
}
function createPool(name, type, max) {
    const pool = new pg_1.Pool({
        ...config_js_1.dbConfig.connectionConfig,
        max,
        idleTimeoutMillis: config_js_1.dbConfig.idleTimeoutMs,
        connectionTimeoutMillis: config_js_1.dbConfig.connectionTimeoutMs,
        application_name: `summit-${type}-${process.env.CURRENT_REGION || 'global'}`,
    });
    pool.on('error', (err) => {
        logger.error({ pool: name, err }, 'Unexpected PostgreSQL client error');
    });
    // Track connection lifetime
    pool.on('connect', (client) => {
        client.connectedAt = Date.now();
        logger.debug({ pool: name }, 'New PostgreSQL connection established');
    });
    return {
        name,
        type,
        pool,
        circuitBreaker: new CircuitBreaker(name, CIRCUIT_BREAKER_FAILURE_THRESHOLD, CIRCUIT_BREAKER_COOLDOWN_MS),
    };
}
function initializePools() {
    if (managedPool) {
        return;
    }
    if (QUERY_CAPTURE_ENABLED && !queryCaptureTimer) {
        queryCaptureTimer = setInterval(() => {
            logQueryCaptureSnapshot('interval');
        }, QUERY_CAPTURE_INTERVAL_MS);
        // Keep the process from hanging on shutdown in capture mode
        queryCaptureTimer.unref?.();
        logger.info({ intervalMs: QUERY_CAPTURE_INTERVAL_MS }, 'DB query capture enabled');
    }
    writePoolWrapper = createPool('write-primary', 'write', config_js_1.dbConfig.maxPoolSize);
    // TODO: Add read replica support from config if needed
    // For now, read pool is same as write pool if no replicas,
    // or distinct pool with same config if we want separation.
    // Using a separate read pool connected to same DB for now to respect pool sizing.
    const readPool = createPool('read-default', 'read', config_js_1.dbConfig.readPoolSize);
    readPoolWrappers = [readPool];
    managedPool = createManagedPool(writePoolWrapper, readPoolWrappers);
}
function createManagedPool(writePool, readPools) {
    // Prompt 41: Zero-Footprint Mode (Simulated)
    if (process.env.ZERO_FOOTPRINT === 'true') {
        logger.warn('ZERO_FOOTPRINT mode active: PostgreSQL queries will not be persisted.');
        const mockExecutor = async (queryInput) => {
            logger.debug('Zero-Footprint: Skipping query execution');
            return { rowCount: 0, rows: [], command: 'MOCK', oid: 0, fields: [] };
        };
        return {
            query: mockExecutor,
            read: mockExecutor,
            write: mockExecutor,
            transaction: async () => ({}),
            withTransaction: async () => ({}),
            connect: async () => writePool.pool.connect(),
            end: async () => { },
            on: () => ({}),
            healthCheck: async () => [],
            slowQueryInsights: () => [],
            pool: writePool.pool,
        };
    }
    const query = (queryInput, params, options = {}) => executeManagedQuery({
        queryInput,
        params,
        options,
        desiredType: 'auto',
        writePool,
        readPools,
    });
    const read = (queryInput, params, options = {}) => executeManagedQuery({
        queryInput,
        params,
        options: { ...options, forceWrite: false },
        desiredType: 'read',
        writePool,
        readPools,
    });
    const write = (queryInput, params, options = {}) => executeManagedQuery({
        queryInput,
        params,
        options: { ...options, forceWrite: true },
        desiredType: 'write',
        writePool,
        readPools,
    });
    const connect = async () => {
        return writePool.pool.connect();
    };
    const withTransaction = async (callback) => {
        const client = await connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    };
    const end = async () => {
        logQueryCaptureSnapshot('shutdown');
        if (queryCaptureTimer) {
            clearInterval(queryCaptureTimer);
            queryCaptureTimer = null;
        }
        await Promise.all([
            writePool.pool.end(),
            ...readPools.map((wrapper) => wrapper.pool.end()),
        ]);
        managedPool = null;
        writePoolWrapper = null;
        readPoolWrappers = [];
    };
    const on = (event, listener) => {
        writePool.pool.on(event, listener);
        readPools.forEach((wrapper) => wrapper.pool.on(event, listener));
        return managedPool;
    };
    const healthCheck = async () => {
        const pools = [writePool, ...readPools];
        const checks = await Promise.all(pools.map(async (wrapper) => {
            const snapshot = {
                name: wrapper.name,
                type: wrapper.type,
                circuitState: wrapper.circuitBreaker.getState(),
                healthy: true,
                activeConnections: (wrapper.pool.totalCount ?? 0) - (wrapper.pool.idleCount ?? 0),
                idleConnections: wrapper.pool.idleCount ?? 0,
                queuedRequests: wrapper.pool.waitingCount ?? 0,
                totalConnections: wrapper.pool.totalCount ?? 0,
            };
            try {
                // Use withManagedClient to leverage validation logic
                await withManagedClient(wrapper, 1000, async (client) => {
                    await client.query('SELECT 1');
                });
                const client = await wrapper.pool.connect();
                try {
                    await client.query('SELECT 1');
                }
                finally {
                    client.release();
                }
            }
            catch (error) {
                snapshot.healthy = false;
                snapshot.lastError = error.message;
            }
            const breakerError = wrapper.circuitBreaker.getLastError();
            if (breakerError && !snapshot.lastError) {
                snapshot.lastError = breakerError.message;
            }
            return snapshot;
        }));
        return checks;
    };
    const slowQueryInsights = () => {
        const entries = Array.from(slowQueryStats.entries()).map(([key, value]) => ({
            key,
            pool: value.pool,
            executions: value.count,
            avgDurationMs: value.totalDuration / Math.max(value.count, 1),
            maxDurationMs: value.maxDuration,
        }));
        return entries.sort((a, b) => b.maxDurationMs - a.maxDurationMs);
    };
    return {
        query,
        read,
        write,
        transaction: withTransaction,
        withTransaction,
        connect,
        end,
        on: (event, listener) => {
            writePool.pool.on(event, listener);
            readPools.forEach((wrapper) => wrapper.pool.on(event, listener));
            return managedPool;
        },
        healthCheck,
        slowQueryInsights,
        queryCaptureSnapshot: snapshotQueryCapture,
        pool: writePool.pool,
    };
}
async function executeManagedQuery({ queryInput, params, options, desiredType, writePool, readPools, }) {
    // Data Residency Check
    if (options.tenantId) {
        const guard = residency_guard_js_1.ResidencyGuard.getInstance();
        await guard.enforce(options.tenantId, {
            operation: 'storage',
            targetRegion: process.env.SUMMIT_REGION || 'us-east-1',
            dataClassification: options.classification || 'internal'
        });
    }
    let activeWritePool = writePool;
    let activeReadPools = readPools;
    // Regional Sharding: If tenantId is provided, resolve the localized pool
    if (options.tenantId) {
        const region = process.env.SUMMIT_REGION || 'us-east-1';
        const route = await tenantRouter_js_1.tenantRouter.resolveRegionalRoute(options.tenantId, region);
        if (route) {
            // Wrap regional pools in PoolWrapper for execution loop
            // Circuit breakers for regional pools are ad-hoc for this request
            activeWritePool = {
                name: route.partitionKey,
                type: 'write',
                pool: route.writePool,
                circuitBreaker: new CircuitBreaker(route.partitionKey, CIRCUIT_BREAKER_FAILURE_THRESHOLD, CIRCUIT_BREAKER_COOLDOWN_MS)
            };
            activeReadPools = [{
                    name: route.partitionKey,
                    type: 'read',
                    pool: route.readPool,
                    circuitBreaker: new CircuitBreaker(route.partitionKey, CIRCUIT_BREAKER_FAILURE_THRESHOLD, CIRCUIT_BREAKER_COOLDOWN_MS)
                }];
        }
    }
    const normalized = normalizeQuery(queryInput, params);
    const queryType = desiredType === 'auto' ? inferQueryType(normalized.text) : desiredType;
    const poolCandidates = queryType === 'write'
        ? [activeWritePool]
        : [...pickReadPoolSequence(activeReadPools), activeWritePool];
    const timeoutMs = options.timeoutMs ?? config_js_1.dbConfig.statementTimeoutMs;
    const label = options.label ?? inferOperation(normalized.text);
    let lastError;
    for (const candidate of poolCandidates) {
        if (candidate.type === 'read' && !candidate.circuitBreaker.canExecute()) {
            lastError = candidate.circuitBreaker.getLastError();
            continue;
        }
        try {
            return await executeWithRetry(candidate, normalized, timeoutMs, label);
        }
        catch (error) {
            lastError = error;
            if (!isRetryableError(error)) {
                break;
            }
        }
    }
    throw lastError ?? new Error('Failed to execute PostgreSQL query');
}
async function executeWithRetry(wrapper, normalizedQuery, timeoutMs, label) {
    let attempt = 0;
    let delay = 40; // Base delay
    while (attempt <= 3) {
        try {
            const client = await wrapper.pool.connect();
            try {
                return await executeQueryOnClient(client, normalizedQuery, wrapper, label, timeoutMs);
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            const err = error;
            wrapper.circuitBreaker.recordFailure(err);
            if (!isRetryableError(err) || attempt === 3) {
                throw err;
            }
            const jitter = Math.random() * 10;
            await delayAsync(Math.min(delay, 500) + jitter);
            delay = Math.min(delay * 2, 500);
            attempt += 1;
        }
    }
    throw new Error('PostgreSQL query exhausted retries');
}
async function executeQueryOnClient(client, normalizedQuery, wrapper, label, timeoutMs) {
    const start = node_perf_hooks_1.performance.now();
    // Set statement timeout
    // Note: It's better to set this per session or query if possible,
    // but pg driver doesn't support query-level timeout natively without separate command or cancel.
    // Using simplified approach here.
    const result = await client.query({
        text: normalizedQuery.text,
        values: normalizedQuery.values,
        name: normalizedQuery.name,
    });
    const duration = node_perf_hooks_1.performance.now() - start;
    // Record telemetry
    comprehensive_telemetry_js_1.telemetry.subsystems.database.queries.add(1);
    comprehensive_telemetry_js_1.telemetry.subsystems.database.latency.record(duration / 1000);
    if (duration >= config_js_1.dbConfig.slowQueryThresholdMs) {
        recordSlowQuery(normalizedQuery.name, duration, wrapper.name, normalizedQuery.text);
    }
    recordQueryCapture(normalizedQuery, duration, wrapper.name, label);
    logger.debug({
        pool: wrapper.name,
        label,
        durationMs: duration,
        rows: result.rowCount ?? 0,
    }, 'PostgreSQL query executed');
    return result;
}
// Validation and Lifetime check
async function withManagedClient(poolWrapper, timeoutMs, fn, options = {}) {
    const startWait = node_perf_hooks_1.performance.now();
    let client = (await poolWrapper.pool.connect());
    const waitTime = node_perf_hooks_1.performance.now() - startWait;
    // Track wait times? (Could add to metrics if needed)
    // Max Lifetime Check
    if (client.connectedAt && (Date.now() - client.connectedAt > MAX_LIFETIME_MS)) {
        logger.debug({ pool: poolWrapper.name }, 'Closing expired PostgreSQL connection');
        client.release(true); // Destroy
        // Retry get new connection
        return withManagedClient(poolWrapper, timeoutMs, fn, options);
    }
    // Connection Validation (Health Check)
    // We can do a quick check if it's been idle for a while?
    // For now, rely on standard pg behavior + max lifetime + circuit breaker.
    // Explicit "validate before use" would be:
    // await client.query('SELECT 1'); // But this adds overhead.
    const leakTimer = setTimeout(() => {
        logger.error({ pool: poolWrapper.name }, 'Possible PostgreSQL connection leak detected');
    }, CONNECTION_LEAK_THRESHOLD_MS);
    try {
        await client.query('SET statement_timeout = $1', [timeoutMs]);
    }
    catch (error) {
        clearTimeout(leakTimer);
        client.release(true); // Force release on setup error
        throw error;
    }
    try {
        const result = await fn(client);
        if (!options.skipRelease) {
            // release logic is handled in finally
        }
        return result;
    }
    finally {
        if (!options.skipRelease) {
            try {
                await client.query('RESET statement_timeout');
                client.release();
            }
            catch (error) {
                logger.warn({ pool: poolWrapper.name, err: error }, 'Failed to reset statement timeout or release');
                client.release(true);
            }
        }
        clearTimeout(leakTimer);
    }
}
function normalizeQuery(query, params) {
    if (typeof query === 'string') {
        const trimmed = query.trim();
        return {
            text: trimmed,
            values: params ?? [],
            name: getPreparedStatementName(trimmed),
        };
    }
    const text = query.text.trim();
    const values = query.values ?? params ?? [];
    return {
        text,
        values,
        name: query.name ?? getPreparedStatementName(text),
    };
}
function getPreparedStatementName(queryText) {
    const normalized = queryText.replace(/\s+/g, ' ').trim();
    const existing = preparedStatementCache.get(normalized);
    if (existing) {
        return existing;
    }
    const hash = node_crypto_1.default
        .createHash('sha1')
        .update(normalized)
        .digest('hex')
        .slice(0, 16);
    const name = `stmt_${hash}`;
    preparedStatementCache.set(normalized, name);
    if (preparedStatementCache.size > MAX_PREPARED_STATEMENTS) {
        const firstKey = preparedStatementCache.keys().next().value;
        if (firstKey) {
            preparedStatementCache.delete(firstKey);
        }
    }
    return name;
}
function recordSlowQuery(statementName, duration, poolName, sql) {
    const key = `${poolName}:${statementName}`;
    const entry = slowQueryStats.get(key) ?? {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        pool: poolName,
    };
    entry.count += 1;
    entry.totalDuration += duration;
    entry.maxDuration = Math.max(entry.maxDuration, duration);
    slowQueryStats.set(key, entry);
    if (slowQueryStats.size > MAX_SLOW_QUERY_ENTRIES) {
        const iterator = slowQueryStats.keys().next();
        if (!iterator.done) {
            slowQueryStats.delete(iterator.value);
        }
    }
    const store = logger_js_1.correlationStorage.getStore();
    const traceId = store?.get('traceId');
    const tenantId = store?.get('tenantId');
    logger.warn({
        pool: poolName,
        durationMs: duration,
        queryName: statementName,
        traceId,
        tenantId,
        sql,
    }, 'Slow PostgreSQL query detected');
}
function pickReadPoolSequence(readPools) {
    if (readPools.length === 0) {
        return [];
    }
    const sequence = [];
    for (let i = 0; i < readPools.length; i += 1) {
        const index = (readReplicaCursor + i) % readPools.length;
        sequence.push(readPools[index]);
    }
    readReplicaCursor = (readReplicaCursor + 1) % readPools.length;
    return sequence;
}
function inferQueryType(queryText) {
    const normalized = queryText.trim().toLowerCase();
    if (normalized.startsWith('with')) {
        const match = normalized.match(/with\s+[\s\S]*?\b(select|insert|update|delete|merge|create|alter|drop)\b/);
        if (match && match[1]) {
            return [
                'insert',
                'update',
                'delete',
                'merge',
                'create',
                'alter',
                'drop',
            ].includes(match[1])
                ? 'write'
                : 'read';
        }
    }
    const firstToken = normalized.split(/\s+/)[0];
    if (['select', 'show', 'describe', 'explain'].includes(firstToken) ||
        normalized.startsWith('values')) {
        return 'read';
    }
    return 'write';
}
function inferOperation(queryText) {
    const normalized = queryText.trim().toLowerCase();
    const token = normalized.split(/\s+/)[0];
    if (token === 'with') {
        return 'cte';
    }
    return token;
}
function isRetryableError(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const pgError = error;
    const nodeError = error;
    if (pgError.code && transientErrorCodes.has(pgError.code)) {
        return true;
    }
    if (nodeError.code && transientNodeErrors.has(nodeError.code)) {
        return true;
    }
    return false;
}
function delayAsync(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}
function percentile(values, p) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx];
}
function recordQueryCapture(normalizedQuery, duration, poolName, label) {
    if (!QUERY_CAPTURE_ENABLED)
        return;
    const key = normalizedQuery.name || getPreparedStatementName(normalizedQuery.text);
    const existing = queryCapture.get(key) ?? {
        sql: normalizedQuery.text.slice(0, 1000),
        label,
        pool: poolName,
        count: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        samples: [],
    };
    existing.count += 1;
    existing.totalDurationMs += duration;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, duration);
    if (existing.samples.length < QUERY_CAPTURE_MAX_SAMPLES) {
        existing.samples.push(duration);
    }
    else {
        const idx = Math.floor(Math.random() * existing.count);
        if (idx < QUERY_CAPTURE_MAX_SAMPLES) {
            existing.samples[idx] = duration;
        }
    }
    queryCapture.set(key, existing);
}
function snapshotQueryCapture() {
    const entries = Array.from(queryCapture.entries()).map(([key, entry]) => ({
        key,
        sql: entry.sql,
        pool: entry.pool,
        label: entry.label,
        count: entry.count,
        totalDurationMs: entry.totalDurationMs,
        maxDurationMs: entry.maxDurationMs,
        avgDurationMs: entry.totalDurationMs / Math.max(entry.count, 1),
        p95DurationMs: percentile(entry.samples, 0.95),
    }));
    const topByTotalTime = [...entries]
        .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
        .slice(0, 20);
    const topByP95 = [...entries]
        .sort((a, b) => b.p95DurationMs - a.p95DurationMs)
        .slice(0, 20);
    return { topByTotalTime, topByP95 };
}
function logQueryCaptureSnapshot(reason) {
    if (!QUERY_CAPTURE_ENABLED || queryCapture.size === 0)
        return;
    const snapshot = snapshotQueryCapture();
    logger.info({ reason, queryCapture: snapshot }, 'DB query capture snapshot (top queries by total time and p95)');
}
function getPostgresPool() {
    initializePools();
    if (!managedPool) {
        throw new Error('Failed to initialize PostgreSQL pool');
    }
    return managedPool;
}
async function closePostgresPool() {
    if (managedPool) {
        await managedPool.end();
        managedPool = null;
    }
}
exports.__private = {
    initializePools,
    getPoolsSnapshot: () => ({ writePoolWrapper, readPoolWrappers }),
    getPreparedStatementName,
    inferQueryType,
    isRetryableError,
    CircuitBreaker,
    recordSlowQuery,
};
