"use strict";
/**
 * IntelGraph TimescaleDB Connection
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timescalePool = void 0;
exports.query = query;
const pg_1 = require("pg");
const logger_js_1 = require("../utils/logger.js");
// Create a connection pool for TimescaleDB
const config = {
    host: process.env.TIMESCALEDB_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALEDB_PORT || '5433', 10),
    database: process.env.TIMESCALEDB_DB || 'intelgraph_timeseries',
    user: process.env.TIMESCALEDB_USER || 'timescale',
    password: process.env.TIMESCALEDB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};
exports.timescalePool = new pg_1.Pool(config);
exports.timescalePool.on('error', (err) => {
    logger_js_1.logger.error({
        message: 'TimescaleDB pool error',
        error: err instanceof Error ? err.message : String(err),
    });
});
async function query(text, params) {
    const start = Date.now();
    const result = await exports.timescalePool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        logger_js_1.logger.warn({
            message: 'Slow TimescaleDB query',
            duration,
            query: text.substring(0, 100),
            params: params?.slice(0, 5),
        });
    }
    return result;
}
exports.default = {
    query,
};
