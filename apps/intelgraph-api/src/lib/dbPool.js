"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDbPool = exports.metricsRegistry = exports.createDbClient = void 0;
const crypto_1 = require("crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
const prom_client_1 = require("prom-client");
const pg_1 = require("pg");
const tuningEnabled = process.env.DB_POOL_TUNING === '1' ||
    process.env.DB_POOL_TUNING?.toLowerCase() === 'true';
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const buildPoolConfig = () => {
    const connectionString = process.env.PG_CONNECTION || process.env.DATABASE_URL || undefined;
    const statementTimeoutMs = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || (tuningEnabled ? '15000' : '0'), 10);
    const idleInTxTimeoutMs = parseInt(process.env.DB_IDLE_IN_TX_TIMEOUT_MS || (tuningEnabled ? '5000' : '0'), 10);
    const config = {
        connectionString,
        max: clamp(parseInt(process.env.DB_POOL_MAX || '20', 10), 2, 100),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '2000', 10),
        application_name: 'intelgraph-api',
    };
    if (tuningEnabled) {
        config.statement_timeout = statementTimeoutMs || undefined;
        config.idle_in_transaction_session_timeout =
            idleInTxTimeoutMs || undefined;
        config.maxLifetimeSeconds = parseInt(process.env.DB_POOL_MAX_LIFETIME_SECONDS || '900', 10);
        config.maxUses = parseInt(process.env.DB_POOL_MAX_USES || '5000', 10);
        config.allowExitOnIdle = true;
    }
    return config;
};
const registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({
    register: registry,
    prefix: 'intelgraph_api_',
});
const poolActive = new prom_client_1.Gauge({
    name: 'intelgraph_api_db_pool_active',
    help: 'Active database connections',
    labelNames: ['pool'],
    registers: [registry],
});
const poolWaiting = new prom_client_1.Gauge({
    name: 'intelgraph_api_db_pool_waiting',
    help: 'Clients waiting for a connection',
    labelNames: ['pool'],
    registers: [registry],
});
const poolWaitSeconds = new prom_client_1.Histogram({
    name: 'intelgraph_api_db_pool_wait_seconds',
    help: 'Time spent waiting for a pooled connection',
    labelNames: ['pool'],
    registers: [registry],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
const transactionDurationSeconds = new prom_client_1.Histogram({
    name: 'intelgraph_api_db_transaction_seconds',
    help: 'Duration of database transactions',
    labelNames: ['mode', 'outcome'],
    registers: [registry],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});
const lockWaits = new prom_client_1.Counter({
    name: 'intelgraph_api_db_lock_wait_total',
    help: 'Lock wait or deadlock errors',
    labelNames: ['code'],
    registers: [registry],
});
let pool = null;
const getPool = () => {
    if (!pool) {
        pool = new pg_1.Pool(buildPoolConfig());
        pool.on('connect', () => updatePoolGauges());
        pool.on('error', () => updatePoolGauges());
    }
    return pool;
};
const updatePoolGauges = () => {
    if (!pool)
        return;
    const active = (pool.totalCount ?? 0) - (pool.idleCount ?? 0);
    poolActive.set({ pool: 'primary' }, active);
    poolWaiting.set({ pool: 'primary' }, pool.waitingCount ?? 0);
};
const acquireClient = async () => {
    const start = node_perf_hooks_1.performance.now();
    const client = await getPool().connect();
    const waitSeconds = (node_perf_hooks_1.performance.now() - start) / 1000;
    poolWaitSeconds.observe({ pool: 'primary' }, waitSeconds);
    updatePoolGauges();
    return client;
};
const getStatementName = (sql) => {
    if (!tuningEnabled)
        return undefined;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return `stmt_${(0, crypto_1.createHash)('sha1').update(normalized).digest('hex').slice(0, 16)}`;
};
const inferMode = (sql) => {
    const first = sql.trim().toLowerCase().split(/\s+/)[0] || '';
    return ['select', 'show', 'describe', 'explain', 'values'].includes(first)
        ? 'read'
        : 'write';
};
const isLockError = (error) => {
    const code = error?.code;
    if (!code)
        return null;
    return ['55P03', '40P01'].includes(code) ? code : null;
};
async function runInTransaction(mode, callback) {
    const client = await acquireClient();
    const start = node_perf_hooks_1.performance.now();
    let outcome = 'committed';
    try {
        await client.query('BEGIN');
        if (mode === 'read') {
            await client.query('SET TRANSACTION READ ONLY');
        }
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        outcome = 'rolled_back';
        await client.query('ROLLBACK').catch(() => { });
        const lockCode = isLockError(error);
        if (lockCode) {
            lockWaits.inc({ code: lockCode });
        }
        throw error;
    }
    finally {
        const duration = (node_perf_hooks_1.performance.now() - start) / 1000;
        transactionDurationSeconds.observe({ mode, outcome }, duration);
        client.release();
        updatePoolGauges();
    }
}
const execute = async (sql, params = [], modeOverride) => {
    const mode = modeOverride ?? inferMode(sql);
    const name = getStatementName(sql);
    if (mode === 'read' && tuningEnabled) {
        return runInTransaction(mode, (client) => client.query({ text: sql, values: params, name }));
    }
    const client = await acquireClient();
    try {
        return await client.query({ text: sql, values: params, name });
    }
    finally {
        client.release();
        updatePoolGauges();
    }
};
const createDbClient = () => {
    const any = async (sql, params = []) => (await execute(sql, params)).rows;
    const one = async (sql, params = []) => {
        const rows = await any(sql, params);
        if (!rows[0]) {
            throw new Error('Expected row but none returned');
        }
        return rows[0];
    };
    const oneOrNone = async (sql, params = []) => {
        const rows = await any(sql, params);
        return rows[0] ?? null;
    };
    const withTransaction = async (fn, options = {}) => {
        const mode = options.readOnly ? 'read' : 'write';
        return runInTransaction(mode, fn);
    };
    return { any, one, oneOrNone, withTransaction };
};
exports.createDbClient = createDbClient;
exports.metricsRegistry = registry;
const closeDbPool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
    }
    registry.resetMetrics();
};
exports.closeDbPool = closeDbPool;
