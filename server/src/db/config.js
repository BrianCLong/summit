"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
exports.buildDbConfig = buildDbConfig;
const config_js_1 = require("../config.js");
const MAX_POOL_SIZE = 200;
function parseIntValue(value, fallback) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function clampPoolSize(size) {
    return Math.min(Math.max(size, 1), MAX_POOL_SIZE);
}
function buildDbConfig(env = process.env) {
    const tuningEnabled = ['1', 'true', 'yes', 'on'].includes((env.DB_POOL_TUNING ?? '').toLowerCase());
    const maxPoolSize = clampPoolSize(parseIntValue(env.PG_WRITE_POOL_SIZE, 20));
    const readPoolSize = clampPoolSize(parseIntValue(env.PG_READ_POOL_SIZE, 5));
    return {
        tuningEnabled,
        maxPoolSize,
        readPoolSize,
        maxLifetimeSeconds: tuningEnabled
            ? parseIntValue(env.DB_POOL_MAX_LIFETIME_SECONDS, 300)
            : undefined,
        maxUses: tuningEnabled ? parseIntValue(env.DB_POOL_MAX_USES, 5000) : undefined,
        idleTimeoutMs: tuningEnabled
            ? parseIntValue(env.DB_POOL_IDLE_TIMEOUT_MS, 30000)
            : undefined,
        connectionTimeoutMs: tuningEnabled
            ? parseIntValue(env.DB_POOL_CONNECTION_TIMEOUT_MS, 5000)
            : undefined,
        statementTimeoutMs: tuningEnabled
            ? parseIntValue(env.DB_STATEMENT_TIMEOUT_MS, 30000)
            : 0,
        idleInTransactionTimeoutMs: tuningEnabled
            ? parseIntValue(env.DB_IDLE_IN_TX_TIMEOUT_MS, 5000)
            : undefined,
        lockTimeoutMs: tuningEnabled
            ? parseIntValue(env.DB_LOCK_TIMEOUT_MS, 5000)
            : undefined,
    };
}
exports.dbConfig = {
    connectionConfig: {
        connectionString: config_js_1.cfg.DATABASE_URL,
        ssl: config_js_1.cfg.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    idleTimeoutMs: 10000,
    connectionTimeoutMs: 5000,
    maxPoolSize: parseInt(process.env.PG_WRITE_POOL_SIZE || '20', 10),
    readPoolSize: parseInt(process.env.PG_READ_POOL_SIZE || '5', 10),
    statementTimeoutMs: 30000,
    slowQueryThresholdMs: Number.parseInt(process.env.SLOW_QUERY_MS ?? '250', 10),
};
