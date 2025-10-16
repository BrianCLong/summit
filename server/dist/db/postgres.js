import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import baseLogger from '../config/logger';
dotenv.config();
const logger = baseLogger.child({ name: 'postgres-pool' });
const DEFAULT_WRITE_POOL_SIZE = parseInt(process.env.PG_WRITE_POOL_SIZE ?? '24', 10);
const DEFAULT_READ_POOL_SIZE = parseInt(process.env.PG_READ_POOL_SIZE ?? '60', 10);
const MAX_RETRIES = parseInt(process.env.PG_QUERY_MAX_RETRIES ?? '3', 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.PG_RETRY_BASE_DELAY_MS ?? '40', 10);
const RETRY_MAX_DELAY_MS = parseInt(process.env.PG_RETRY_MAX_DELAY_MS ?? '500', 10);
const READ_TIMEOUT_MS = parseInt(process.env.PG_READ_TIMEOUT_MS ?? '5000', 10);
const WRITE_TIMEOUT_MS = parseInt(process.env.PG_WRITE_TIMEOUT_MS ?? '30000', 10);
const CONNECTION_LEAK_THRESHOLD_MS = parseInt(process.env.PG_CONNECTION_LEAK_THRESHOLD_MS ?? '15000', 10);
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.PG_SLOW_QUERY_THRESHOLD_MS ?? '2000', 10);
const MAX_PREPARED_STATEMENTS = parseInt(process.env.PG_PREPARED_STATEMENT_CACHE_SIZE ?? '500', 10);
const MAX_SLOW_QUERY_ENTRIES = parseInt(process.env.PG_SLOW_QUERY_ANALYSIS_ENTRIES ?? '200', 10);
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = parseInt(process.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD ?? '5', 10);
const CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(process.env.PG_CIRCUIT_BREAKER_COOLDOWN_MS ?? '30000', 10);
class CircuitBreaker {
    constructor(name, failureThreshold, cooldownMs) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
        this.failureCount = 0;
        this.state = 'closed';
        this.openUntil = 0;
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
const preparedStatementCache = new Map();
const slowQueryStats = new Map();
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
const transientNodeErrors = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'EPIPE']);
function parseConnectionConfig() {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }
    return {
        host: process.env.POSTGRES_HOST || 'postgres',
        user: process.env.POSTGRES_USER || 'intelgraph',
        password: process.env.POSTGRES_PASSWORD || 'devpassword',
        database: process.env.POSTGRES_DB || 'intelgraph_dev',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    };
}
function parseReadReplicaUrls() {
    const explicit = (process.env.DATABASE_READ_REPLICAS || '')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
    const legacy = process.env.DATABASE_READ_URL ? [process.env.DATABASE_READ_URL] : [];
    return [...new Set([...explicit, ...legacy])];
}
function createPool(config, name, type, max) {
    const pool = new Pool({
        ...config,
        max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        application_name: `summit-${type}-${process.env.CURRENT_REGION || 'global'}`,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    });
    pool.on('error', (err) => {
        logger.error({ pool: name, err }, 'Unexpected PostgreSQL client error');
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
    const baseConfig = parseConnectionConfig();
    writePoolWrapper = createPool(baseConfig, 'write-primary', 'write', DEFAULT_WRITE_POOL_SIZE);
    const replicaUrls = parseReadReplicaUrls();
    if (replicaUrls.length === 0) {
        readPoolWrappers = [createPool(baseConfig, 'read-default', 'read', DEFAULT_READ_POOL_SIZE)];
    }
    else {
        readPoolWrappers = replicaUrls.map((url, idx) => createPool({ connectionString: url }, `read-replica-${idx + 1}`, 'read', DEFAULT_READ_POOL_SIZE));
    }
    managedPool = createManagedPool(writePoolWrapper, readPoolWrappers);
}
function createManagedPool(writePool, readPools) {
    const query = (queryInput, params, options = {}) => executeManagedQuery({ queryInput, params, options, desiredType: 'auto', writePool, readPools });
    const read = (queryInput, params, options = {}) => executeManagedQuery({ queryInput, params, options: { ...options, forceWrite: false }, desiredType: 'read', writePool, readPools });
    const write = (queryInput, params, options = {}) => executeManagedQuery({ queryInput, params, options: { ...options, forceWrite: true }, desiredType: 'write', writePool, readPools });
    const connect = async () => {
        return writePool.pool.connect();
    };
    const end = async () => {
        await Promise.all([writePool.pool.end(), ...readPools.map((wrapper) => wrapper.pool.end())]);
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
            };
            try {
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
    return { query, read, write, connect, end, on, healthCheck, slowQueryInsights };
}
async function executeManagedQuery({ queryInput, params, options, desiredType, writePool, readPools, }) {
    const normalized = normalizeQuery(queryInput, params);
    const queryType = desiredType === 'auto' ? inferQueryType(normalized.text) : desiredType;
    const poolCandidates = queryType === 'write' ? [writePool] : [...pickReadPoolSequence(readPools), writePool];
    const timeoutMs = options.timeoutMs ?? (queryType === 'write' ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS);
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
    let delay = RETRY_BASE_DELAY_MS;
    while (attempt <= MAX_RETRIES) {
        try {
            const result = await withManagedClient(wrapper, timeoutMs, (client) => executeQueryOnClient(client, normalizedQuery, wrapper, label));
            wrapper.circuitBreaker.recordSuccess();
            return result;
        }
        catch (error) {
            const err = error;
            wrapper.circuitBreaker.recordFailure(err);
            if (!isRetryableError(err) || attempt === MAX_RETRIES) {
                throw err;
            }
            const jitter = Math.random() * 10;
            await delayAsync(Math.min(delay, RETRY_MAX_DELAY_MS) + jitter);
            delay = Math.min(delay * 2, RETRY_MAX_DELAY_MS);
            attempt += 1;
        }
    }
    throw new Error('PostgreSQL query exhausted retries');
}
async function executeQueryOnClient(client, normalizedQuery, wrapper, label) {
    const start = performance.now();
    const result = await client.query({
        text: normalizedQuery.text,
        values: normalizedQuery.values,
        name: normalizedQuery.name,
    });
    const duration = performance.now() - start;
    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        recordSlowQuery(normalizedQuery.name, duration, wrapper.name, normalizedQuery.text);
    }
    logger.debug({
        pool: wrapper.name,
        label,
        durationMs: duration,
        rows: result.rowCount ?? 0,
    }, 'PostgreSQL query executed');
    return result;
}
async function withManagedClient(poolWrapper, timeoutMs, fn) {
    const client = await poolWrapper.pool.connect();
    const leakTimer = setTimeout(() => {
        logger.error({ pool: poolWrapper.name }, 'Possible PostgreSQL connection leak detected');
    }, CONNECTION_LEAK_THRESHOLD_MS);
    try {
        await client.query('SET statement_timeout = $1', [timeoutMs]);
    }
    catch (error) {
        clearTimeout(leakTimer);
        client.release();
        throw error;
    }
    try {
        return await fn(client);
    }
    finally {
        try {
            await client.query('RESET statement_timeout');
        }
        catch (error) {
            logger.warn({ pool: poolWrapper.name, err: error }, 'Failed to reset statement timeout');
        }
        clearTimeout(leakTimer);
        client.release();
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
    const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
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
    const entry = slowQueryStats.get(key) ?? { count: 0, totalDuration: 0, maxDuration: 0, pool: poolName };
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
    logger.warn({ pool: poolName, durationMs: duration, statement: statementName, sql }, 'Slow PostgreSQL query detected');
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
            return ['insert', 'update', 'delete', 'merge', 'create', 'alter', 'drop'].includes(match[1]) ? 'write' : 'read';
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
export function getPostgresPool() {
    initializePools();
    if (!managedPool) {
        throw new Error('Failed to initialize PostgreSQL pool');
    }
    return managedPool;
}
export async function closePostgresPool() {
    if (managedPool) {
        await managedPool.end();
        managedPool = null;
    }
}
export const __private = {
    initializePools,
    getPoolsSnapshot: () => ({ writePoolWrapper, readPoolWrappers }),
    getPreparedStatementName,
    inferQueryType,
    isRetryableError,
    CircuitBreaker,
};
//# sourceMappingURL=postgres.js.map